const express = require('express');
const mongoose = require('mongoose');
const { Prisma, PaymentMethod } = require('@prisma/client');
const { getPrismaClient, connectPostgres } = require('../config/postgres');
const Student = require('../models/Student');
const { adminAuth } = require('../middleware/auth.middleware');

const router = express.Router();

const SERIALIZABLE_TX_OPTIONS = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5000,
    timeout: 10000
};

const PAYMENT_METHOD_ALIASES = {
    BANK: PaymentMethod.BANK_TRANSFER,
    BANK_TRANSFER: PaymentMethod.BANK_TRANSFER,
    CARD: PaymentMethod.CARD,
    CASH: PaymentMethod.CASH,
    CHEQUE: PaymentMethod.CHEQUE,
    CHECK: PaymentMethod.CHEQUE,
    ONLINE: PaymentMethod.ONLINE,
    NET_BANKING: PaymentMethod.ONLINE,
    TRANSFER: PaymentMethod.BANK_TRANSFER,
    UPI: PaymentMethod.UPI
};

router.use(adminAuth);

function createHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function toMoney(value) {
    const numericValue = Number(value || 0);
    return Number(numericValue.toFixed(2));
}

function toDecimal(value) {
    return new Prisma.Decimal(toMoney(value).toFixed(2));
}

function toApiStatus(value) {
    if (typeof value !== 'string') {
        return value;
    }

    const normalized = value.toLowerCase();
    return normalized === 'clear' ? 'completed' : normalized;
}

function getStudentIdValue(student) {
    return student?._id ? student._id.toString() : null;
}

function getBatchIdValue(student) {
    if (!student?.batchId) return null;
    if (typeof student.batchId === 'string') return student.batchId;
    if (student.batchId._id) return student.batchId._id.toString();
    return student.batchId.toString();
}

function getBatchName(student) {
    if (!student?.batchId || typeof student.batchId === 'string') return null;
    return student.batchId.name || null;
}

function parsePositiveAmount(value, fieldName) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
        throw createHttpError(400, `${fieldName} must be a number greater than 0.`);
    }
    return toMoney(amount);
}

function normalizePaymentMethod(value) {
    const normalized = String(value || PaymentMethod.CASH)
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    const method = PAYMENT_METHOD_ALIASES[normalized];
    if (!method) {
        throw createHttpError(400, `Unsupported paymentMethod. Allowed values: ${Object.keys(PAYMENT_METHOD_ALIASES).join(', ')}.`);
    }

    return method;
}

function parseDateInput(value, fieldName) {
    if (!value) return new Date();

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        throw createHttpError(400, `${fieldName} must be a valid date.`);
    }

    return parsedDate;
}

function getMonthStart(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getMonthEnd(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function addMonths(date, months) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function formatBillingMonth(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseBillingMonth(input) {
    if (!input) {
        const now = new Date();
        const start = getMonthStart(now);
        return { key: formatBillingMonth(start), start };
    }

    if (input instanceof Date && !Number.isNaN(input.getTime())) {
        const start = getMonthStart(input);
        return { key: formatBillingMonth(start), start };
    }

    if (typeof input === 'string' && /^\d{4}-\d{2}$/.test(input.trim())) {
        const [year, month] = input.trim().split('-').map(Number);
        if (month < 1 || month > 12) {
            throw createHttpError(400, 'billingMonth must use YYYY-MM format.');
        }

        const start = new Date(Date.UTC(year, month - 1, 1));
        return { key: formatBillingMonth(start), start };
    }

    const parsedDate = new Date(input);
    if (!Number.isNaN(parsedDate.getTime())) {
        const start = getMonthStart(parsedDate);
        return { key: formatBillingMonth(start), start };
    }

    throw createHttpError(400, 'billingMonth must be a valid date or YYYY-MM.');
}

function buildDueDate(monthStart, dueDay) {
    const year = monthStart.getUTCFullYear();
    const month = monthStart.getUTCMonth();
    const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const safeDueDay = Math.max(1, Math.min(Number(dueDay) || 10, lastDayOfMonth));

    return new Date(Date.UTC(year, month, safeDueDay, 23, 59, 59, 999));
}

function findApplicableFeeStructure(structures, monthStart) {
    const monthEnd = getMonthEnd(monthStart);
    return structures.find((structure) => {
        const effectiveFrom = new Date(structure.effectiveFrom);
        const effectiveTo = structure.effectiveTo ? new Date(structure.effectiveTo) : null;
        return effectiveFrom <= monthEnd && (!effectiveTo || effectiveTo >= monthStart);
    }) || null;
}

function collectUnbilledCharges({ structures, student, balance, targetMonthStart }) {
    const anchorDate = balance?.lastChargedMonth
        ? addMonths(parseBillingMonth(balance.lastChargedMonth).start, 1)
        : getMonthStart(student.admissionDate || student.joinedAt || new Date());

    const charges = [];
    const missingMonths = [];

    if (anchorDate > targetMonthStart) {
        return { charges, missingMonths };
    }

    for (let cursor = new Date(anchorDate); cursor <= targetMonthStart; cursor = addMonths(cursor, 1)) {
        const structure = findApplicableFeeStructure(structures, cursor);

        if (!structure) {
            missingMonths.push(formatBillingMonth(cursor));
            continue;
        }

        charges.push({
            billingMonth: formatBillingMonth(cursor),
            amount: toMoney(structure.monthlyFee),
            dueDate: buildDueDate(cursor, structure.dueDay),
            feeStructureId: structure.id
        });
    }

    return { charges, missingMonths };
}

function determineOutstandingDueDate(existingBalance, newCharges, projectedBalance) {
    if (projectedBalance <= 0) return null;

    if (existingBalance?.currentBalance && toMoney(existingBalance.currentBalance) > 0 && existingBalance.dueDate) {
        return existingBalance.dueDate;
    }

    if (newCharges.length > 0) {
        return newCharges[0].dueDate;
    }

    return existingBalance?.dueDate || null;
}

function determineBalanceState(balanceAmount, dueDate, asOfDate = new Date()) {
    if (balanceAmount <= 0) {
        return {
            status: 'CLEAR',
            overdueAmount: 0
        };
    }

    if (dueDate && new Date(dueDate) < asOfDate) {
        return {
            status: 'OVERDUE',
            overdueAmount: balanceAmount
        };
    }

    return {
        status: 'PENDING',
        overdueAmount: 0
    };
}

function serializeBalance(balance) {
    if (!balance) return null;

    return {
        id: balance.id,
        studentId: balance.studentId,
        batchId: balance.batchId,
        feeStructureId: balance.feeStructureId,
        lastChargedMonth: balance.lastChargedMonth,
        totalCharged: toMoney(balance.totalCharged),
        totalPaid: toMoney(balance.totalPaid),
        currentBalance: toMoney(balance.currentBalance),
        overdueAmount: toMoney(balance.overdueAmount),
        status: toApiStatus(balance.status),
        dueDate: balance.dueDate,
        lastPaymentAt: balance.lastPaymentAt,
        lastCalculatedAt: balance.lastCalculatedAt,
        createdAt: balance.createdAt,
        updatedAt: balance.updatedAt
    };
}

function serializePayment(payment) {
    return {
        id: payment.id,
        studentId: payment.studentId,
        batchId: payment.batchId,
        feeBalanceId: payment.feeBalanceId,
        feeStructureId: payment.feeStructureId,
        billingMonth: payment.billingMonth,
        amount: toMoney(payment.amount),
        balanceBeforePayment: toMoney(payment.balanceBeforePayment),
        balanceAfterPayment: toMoney(payment.balanceAfterPayment),
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        referenceNo: payment.referenceNo,
        remarks: payment.remarks,
        receiptNumber: payment.receiptNumber,
        studentNameSnapshot: payment.studentNameSnapshot,
        rollNoSnapshot: payment.rollNoSnapshot,
        batchNameSnapshot: payment.batchNameSnapshot,
        createdAt: payment.createdAt
    };
}

async function runPaymentTransaction(work, maxRetries = 3) {
    const prisma = getPrismaClient();

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
        try {
            return await prisma.$transaction(work, SERIALIZABLE_TX_OPTIONS);
        } catch (error) {
            if (error?.code === 'P2034' && attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, attempt * 150));
                continue;
            }

            throw error;
        }
    }

    throw createHttpError(409, 'Payment transaction could not be completed safely.');
}

function handleRouteError(res, error) {
    if (error?.code === 'P2002') {
        return res.status(409).json({ message: 'Duplicate record detected in PostgreSQL.', error: error.message });
    }

    if (error?.code === 'P2025') {
        return res.status(404).json({ message: 'Requested record was not found.', error: error.message });
    }

    if (error?.status) {
        return res.status(error.status).json({ message: error.message });
    }

    console.error('[PrismaFeesRoute] Error:', error);
    return res.status(500).json({
        message: 'Internal server error while processing fee management request.',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
}

router.post('/pay', async (req, res) => {
    try {
        await connectPostgres();

        const {
            studentId,
            amount,
            paymentDate,
            paymentMethod,
            billingMonth,
            referenceNo,
            remarks,
            batchId: requestedBatchId
        } = req.body;

        if (!studentId || typeof studentId !== 'string') {
            throw createHttpError(400, 'studentId is required and must be the MongoDB ObjectId string.');
        }

        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            throw createHttpError(400, 'studentId must be a valid MongoDB ObjectId string.');
        }

        const paymentAmount = parsePositiveAmount(amount, 'amount');
        const paymentTimestamp = parseDateInput(paymentDate, 'paymentDate');
        const billingCycle = parseBillingMonth(billingMonth || paymentTimestamp);
        const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);

        const student = await Student.findById(studentId)
            .populate('batchId', 'name')
            .select('name rollNo batchId admissionDate joinedAt status')
            .lean();

        if (!student) {
            throw createHttpError(404, 'Student not found in MongoDB.');
        }

        const studentBatchId = getBatchIdValue(student);
        const effectiveBatchId = studentBatchId || requestedBatchId;

        if (!effectiveBatchId) {
            throw createHttpError(400, 'Student is not assigned to a batch and no batchId was provided.');
        }

        if (studentBatchId && requestedBatchId && requestedBatchId !== studentBatchId) {
            throw createHttpError(400, 'Provided batchId does not match the student batch in MongoDB.');
        }

        const batchName = getBatchName(student);

        const result = await runPaymentTransaction(async (tx) => {
            const [balance, structures] = await Promise.all([
                tx.feeBalance.findUnique({
                    where: { studentId }
                }),
                tx.feeStructure.findMany({
                    where: { batchId: effectiveBatchId },
                    orderBy: { effectiveFrom: 'desc' }
                })
            ]);

            if (!structures.length) {
                throw createHttpError(404, `No fee structure configured for batch ${effectiveBatchId}.`);
            }

            const unbilled = collectUnbilledCharges({
                structures,
                student,
                balance,
                targetMonthStart: billingCycle.start
            });

            if (unbilled.missingMonths.length > 0) {
                throw createHttpError(
                    409,
                    `Fee structure is missing for billing month(s): ${unbilled.missingMonths.join(', ')}.`
                );
            }

            const currentStoredBalance = toMoney(balance?.currentBalance);
            const currentStoredTotalCharged = toMoney(balance?.totalCharged);
            const currentStoredTotalPaid = toMoney(balance?.totalPaid);
            const accruedCharge = toMoney(unbilled.charges.reduce((sum, item) => sum + item.amount, 0));
            const balanceBeforePayment = toMoney(currentStoredBalance + accruedCharge);

            if (paymentAmount > balanceBeforePayment) {
                throw createHttpError(
                    400,
                    `Payment amount exceeds outstanding balance. Outstanding balance is ${balanceBeforePayment}.`
                );
            }

            const balanceAfterPayment = toMoney(balanceBeforePayment - paymentAmount);
            const totalCharged = toMoney(currentStoredTotalCharged + accruedCharge);
            const totalPaid = toMoney(currentStoredTotalPaid + paymentAmount);
            const dueDate = determineOutstandingDueDate(balance, unbilled.charges, balanceAfterPayment);
            const state = determineBalanceState(balanceAfterPayment, dueDate, paymentTimestamp);
            const latestAppliedStructureId = unbilled.charges.length > 0
                ? unbilled.charges[unbilled.charges.length - 1].feeStructureId
                : balance?.feeStructureId || null;
            const lastChargedMonth = unbilled.charges.length > 0
                ? unbilled.charges[unbilled.charges.length - 1].billingMonth
                : balance?.lastChargedMonth || null;

            const balanceRecord = balance
                ? await tx.feeBalance.update({
                    where: { id: balance.id },
                    data: {
                        batchId: effectiveBatchId,
                        feeStructureId: latestAppliedStructureId,
                        lastChargedMonth,
                        totalCharged: toDecimal(totalCharged),
                        totalPaid: toDecimal(totalPaid),
                        currentBalance: toDecimal(balanceAfterPayment),
                        overdueAmount: toDecimal(state.overdueAmount),
                        status: state.status,
                        dueDate,
                        lastPaymentAt: paymentTimestamp,
                        lastCalculatedAt: new Date()
                    }
                })
                : await tx.feeBalance.create({
                    data: {
                        studentId,
                        batchId: effectiveBatchId,
                        feeStructureId: latestAppliedStructureId,
                        lastChargedMonth,
                        totalCharged: toDecimal(totalCharged),
                        totalPaid: toDecimal(totalPaid),
                        currentBalance: toDecimal(balanceAfterPayment),
                        overdueAmount: toDecimal(state.overdueAmount),
                        status: state.status,
                        dueDate,
                        lastPaymentAt: paymentTimestamp,
                        lastCalculatedAt: new Date()
                    }
                });

            const payment = await tx.feePayment.create({
                data: {
                    studentId,
                    batchId: effectiveBatchId,
                    feeBalanceId: balanceRecord.id,
                    feeStructureId: latestAppliedStructureId,
                    billingMonth: billingCycle.key,
                    amount: toDecimal(paymentAmount),
                    balanceBeforePayment: toDecimal(balanceBeforePayment),
                    balanceAfterPayment: toDecimal(balanceAfterPayment),
                    paymentDate: paymentTimestamp,
                    paymentMethod: normalizedPaymentMethod,
                    referenceNo: referenceNo ? String(referenceNo).trim() : null,
                    remarks: remarks ? String(remarks).trim() : null,
                    receiptNumber: `RCP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                    studentNameSnapshot: student.name || null,
                    rollNoSnapshot: student.rollNo || null,
                    batchNameSnapshot: batchName
                }
            });

            return {
                payment,
                balance: balanceRecord,
                accruedCharge,
                chargedMonths: unbilled.charges.map((item) => ({
                    billingMonth: item.billingMonth,
                    amount: item.amount,
                    dueDate: item.dueDate
                }))
            };
        });

        return res.status(201).json({
            message: 'Fee payment recorded successfully.',
            payment: serializePayment(result.payment),
            balance: serializeBalance(result.balance),
            appliedCharges: {
                totalAccrued: result.accruedCharge,
                months: result.chargedMonths
            }
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.get('/student/:studentId', async (req, res) => {
    try {
        await connectPostgres();
        const prisma = getPrismaClient();

        const { studentId } = req.params;

        const [student, balance, payments] = await Promise.all([
            mongoose.Types.ObjectId.isValid(studentId)
                ? Student.findById(studentId)
                    .populate('batchId', 'name')
                    .select('name rollNo className batchId contact email status')
                    .lean()
                : null,
            prisma.feeBalance.findUnique({
                where: { studentId }
            }),
            prisma.feePayment.findMany({
                where: { studentId },
                orderBy: { paymentDate: 'desc' }
            })
        ]);

        return res.json({
            student: student ? {
                id: getStudentIdValue(student),
                name: student.name,
                rollNo: student.rollNo || null,
                className: student.className || null,
                batchId: getBatchIdValue(student),
                batchName: getBatchName(student),
                contact: student.contact || null,
                email: student.email || null,
                status: student.status
            } : null,
            balance: serializeBalance(balance),
            payments: payments.map(serializePayment),
            summary: {
                totalPayments: payments.length,
                totalPaid: toMoney(payments.reduce((sum, payment) => sum + toMoney(payment.amount), 0)),
                currentBalance: toMoney(balance?.currentBalance),
                status: toApiStatus(balance?.status || 'CLEAR')
            }
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.get('/pending', async (req, res) => {
    try {
        await connectPostgres();
        const prisma = getPrismaClient();

        const billingCycle = parseBillingMonth(req.query.billingMonth);
        const students = await Student.find({ status: 'active' })
            .populate('batchId', 'name')
            .select('name rollNo className batchId admissionDate joinedAt status')
            .lean();

        const studentIds = students.map((student) => getStudentIdValue(student)).filter(Boolean);
        const batchIds = [...new Set(students.map((student) => getBatchIdValue(student)).filter(Boolean))];

        const cycleEnd = getMonthEnd(billingCycle.start);

        const [balances, feeStructures, monthPayments] = await Promise.all([
            studentIds.length > 0
                ? prisma.feeBalance.findMany({
                    where: { studentId: { in: studentIds } }
                })
                : [],
            batchIds.length > 0
                ? prisma.feeStructure.findMany({
                    where: { batchId: { in: batchIds } },
                    orderBy: [
                        { batchId: 'asc' },
                        { effectiveFrom: 'desc' }
                    ]
                })
                : [],
            prisma.feePayment.aggregate({
                _sum: { amount: true },
                where: {
                    paymentDate: {
                        gte: billingCycle.start,
                        lte: cycleEnd
                    }
                }
            })
        ]);

        const totalCollectionThisMonth = toMoney(monthPayments._sum.amount || 0);

        const balancesByStudent = new Map(balances.map((balance) => [balance.studentId, balance]));
        const structuresByBatch = feeStructures.reduce((map, structure) => {
            if (!map.has(structure.batchId)) {
                map.set(structure.batchId, []);
            }

            map.get(structure.batchId).push(structure);
            return map;
        }, new Map());

        const warnings = [];
        const pendingStudents = [];

        for (const student of students) {
            const studentId = getStudentIdValue(student);
            const batchId = getBatchIdValue(student);
            const balance = balancesByStudent.get(studentId) || null;

            if (!batchId) {
                warnings.push({
                    studentId,
                    studentName: student.name,
                    reason: 'Student has no batch assigned in MongoDB.'
                });
                continue;
            }

            const structures = structuresByBatch.get(batchId) || [];
            if (!structures.length) {
                warnings.push({
                    studentId,
                    studentName: student.name,
                    batchId,
                    reason: 'No fee structure configured for the student batch.'
                });
                continue;
            }

            const unbilled = collectUnbilledCharges({
                structures,
                student,
                balance,
                targetMonthStart: billingCycle.start
            });

            if (unbilled.missingMonths.length > 0) {
                warnings.push({
                    studentId,
                    studentName: student.name,
                    batchId,
                    reason: `Missing fee structure for billing month(s): ${unbilled.missingMonths.join(', ')}.`
                });
            }

            const projectedBalance = toMoney(toMoney(balance?.currentBalance) + unbilled.charges.reduce((sum, item) => sum + item.amount, 0));
            const dueDate = determineOutstandingDueDate(balance, unbilled.charges, projectedBalance);
            const state = determineBalanceState(projectedBalance, dueDate);
            const projectedTotalCharged = toMoney(toMoney(balance?.totalCharged) + unbilled.charges.reduce((sum, item) => sum + item.amount, 0));
            const totalPaid = toMoney(balance?.totalPaid);
            const hasLedgerActivity = projectedTotalCharged > 0 || totalPaid > 0 || Boolean(balance);

            if (projectedBalance <= 0 && !hasLedgerActivity) {
                continue;
            }

            pendingStudents.push({
                studentId,
                studentName: student.name,
                rollNo: student.rollNo || null,
                className: student.className || null,
                batchId,
                batchName: getBatchName(student),
                lastChargedMonth: balance?.lastChargedMonth || null,
                billingMonthEvaluated: billingCycle.key,
                pendingAmount: projectedBalance,
                overdueAmount: toMoney(state.overdueAmount),
                totalCharged: projectedTotalCharged,
                totalPaid,
                status: toApiStatus(state.status),
                dueDate,
                lastPaymentAt: balance?.lastPaymentAt || null,
                projectedNewCharges: unbilled.charges
            });
        }

        const statusPriority = {
            overdue: 0,
            pending: 1,
            completed: 2
        };

        pendingStudents.sort((left, right) => {
            if (left.status === right.status) {
                return right.pendingAmount - left.pendingAmount;
            }

            return (statusPriority[left.status] ?? 99) - (statusPriority[right.status] ?? 99);
        });

        return res.json({
            students: pendingStudents,
            summary: {
                billingMonth: billingCycle.key,
                pendingCount: pendingStudents.filter((student) => student.status === 'pending').length,
                overdueCount: pendingStudents.filter((student) => student.status === 'overdue').length,
                completedCount: pendingStudents.filter((student) => student.status === 'completed').length,
                totalPending: toMoney(pendingStudents.reduce((sum, student) => sum + student.pendingAmount, 0)),
                totalOverdue: toMoney(pendingStudents.reduce((sum, student) => sum + student.overdueAmount, 0)),
                totalCollectionThisMonth
            },
            warnings
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

router.post('/receipt/:paymentId', async (req, res) => {
    try {
        await connectPostgres();
        const prisma = getPrismaClient();

        const { paymentId } = req.params;

        const payment = await prisma.feePayment.findUnique({
            where: { id: paymentId },
            include: {
                feeBalance: true,
                feeStructure: true
            }
        });

        if (!payment) {
            throw createHttpError(404, 'Payment record not found.');
        }

        const student = mongoose.Types.ObjectId.isValid(payment.studentId)
            ? await Student.findById(payment.studentId)
                .populate('batchId', 'name')
                .select('name rollNo className contact email')
                .lean()
            : null;

        return res.json({
            receipt: {
                paymentId: payment.id,
                receiptNumber: payment.receiptNumber,
                generatedAt: new Date().toISOString(),
                paymentDate: payment.paymentDate,
                billingMonth: payment.billingMonth,
                amount: toMoney(payment.amount),
                paymentMethod: payment.paymentMethod,
                referenceNo: payment.referenceNo,
                remarks: payment.remarks,
                balanceBeforePayment: toMoney(payment.balanceBeforePayment),
                balanceAfterPayment: toMoney(payment.balanceAfterPayment),
                student: {
                    id: payment.studentId,
                    name: student?.name || payment.studentNameSnapshot || null,
                    rollNo: student?.rollNo || payment.rollNoSnapshot || null,
                    className: student?.className || null,
                    contact: student?.contact || null,
                    email: student?.email || null
                },
                batch: {
                    id: payment.batchId,
                    name: getBatchName(student) || payment.batchNameSnapshot || null
                },
                feeStructure: payment.feeStructure ? {
                    id: payment.feeStructure.id,
                    monthlyFee: toMoney(payment.feeStructure.monthlyFee),
                    dueDay: payment.feeStructure.dueDay,
                    currency: payment.feeStructure.currency
                } : null,
                runningBalance: serializeBalance(payment.feeBalance)
            }
        });
    } catch (error) {
        return handleRouteError(res, error);
    }
});

module.exports = router;
