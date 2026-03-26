const express = require('express');
const mongoose = require('mongoose');
const { body, param, query, validationResult } = require('express-validator');
const { PayrollStatus, PayrollAuditAction } = require('@prisma/client');
const Teacher = require('../models/Teacher');
const { TeacherSalaryProfile } = require('../models/TeacherPayroll');
const { adminAuth } = require('../middleware/auth.middleware');
const { getPrismaClient, connectPostgres } = require('../config/postgres');
const {
    createHttpError,
    toMoney,
    toDecimal,
    parsePayrollMonth,
    parseDateInput,
    parsePositiveAmount,
    normalizePayrollPaymentMethod,
    resolvePayrollStatus,
    serializeTeacherSalary,
    serializePayrollRecord,
    runPayrollTransaction,
    handlePayrollError,
    generatePayrollForMonth
} = require('../services/prismaPayrollService');
const { syncPayrollExpenseRecord } = require('../services/prismaExpenseService');

const router = express.Router();

router.use(adminAuth);

const COMPATIBILITY_STATUS_MAP = {
    [PayrollStatus.PAID]: 'Paid',
    [PayrollStatus.PARTIALLY_PAID]: 'Processing',
    [PayrollStatus.PENDING]: 'Pending'
};

function validateRequest(validations) {
    return [
        ...validations,
        (req, res, next) => {
            const errors = validationResult(req);
            if (errors.isEmpty()) {
                return next();
            }

            return res.status(400).json({
                message: 'Validation failed.',
                errors: errors.array().map((error) => ({
                    field: error.path,
                    message: error.msg
                }))
            });
        }
    ];
}

function getTeacherIdValue(teacher) {
    return teacher?._id ? teacher._id.toString() : null;
}

function toCompatibilityStatus(status) {
    return COMPATIBILITY_STATUS_MAP[status] || 'Pending';
}

function toCompatibilityPaymentMethod(paymentMethod) {
    if (!paymentMethod) {
        return null;
    }

    const normalized = String(paymentMethod).toUpperCase();
    if (normalized === 'BANK_TRANSFER') {
        return 'Bank Transfer';
    }

    return normalized.charAt(0) + normalized.slice(1).toLowerCase();
}

function toLegacySalaryRecord(record, teacherMap = new Map()) {
    const teacher = teacherMap.get(record.teacherId) || null;
    const leaveDeductions = record.deductions
        .filter((deduction) => deduction.deductionType === 'LEAVE')
        .reduce((sum, deduction) => sum + deduction.amount, 0);
    const advanceDeductions = record.deductions
        .filter((deduction) => deduction.deductionType === 'ADVANCE')
        .reduce((sum, deduction) => sum + deduction.amount, 0);

    return {
        _id: record.id,
        teacherId: {
            _id: record.teacherId,
            name: teacher?.name || record.teacherNameSnapshot || null,
            regNo: teacher?.regNo || record.regNoSnapshot || null,
            department: teacher?.department || null,
            profileImage: teacher?.profileImage || null
        },
        monthYear: record.payrollMonth,
        baseSalary: record.baseSalary,
        extraClassesAmount: record.extraClassesAmount || 0,
        bonusAmount: record.bonusAmount || 0,
        bonusReason: null,
        leaveDeductions,
        advanceDeductions,
        netSalary: record.netSalary,
        totalPaid: record.paidAmount,
        status: toCompatibilityStatus(record.status),
        paymentMethod: toCompatibilityPaymentMethod(record.paymentMethod),
        transactionId: record.paymentReference || null,
        paymentDate: record.paymentDate,
        notes: record.remarks,
        createdAt: record.createdAt
    };
}

router.post(
    '/generate/:month',
    validateRequest([
        param('month')
            .trim()
            .matches(/^\d{4}-\d{2}$/)
            .withMessage('month must use YYYY-MM format.')
    ]),
    async (req, res) => {
        try {
            const result = await generatePayrollForMonth({
                payrollMonth: req.params.month,
                actorId: req.userId || req.admin?.id || null,
                actorRole: req.role || 'admin'
            });

            return res.status(result.generatedCount > 0 ? 201 : 200).json({
                message: `Payroll generation completed for ${result.payrollMonth}.`,
                ...result
            });
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

router.post(
    '/generate',
    validateRequest([
        body('monthYear')
            .trim()
            .matches(/^\d{4}-\d{2}$/)
            .withMessage('monthYear must use YYYY-MM format.')
    ]),
    async (req, res) => {
        try {
            const result = await generatePayrollForMonth({
                payrollMonth: req.body.monthYear,
                actorId: req.userId || req.admin?.id || null,
                actorRole: req.role || 'admin'
            });

            return res.status(result.generatedCount > 0 ? 201 : 200).json({
                message: `Payroll generation completed for ${result.payrollMonth}.`,
                ...result
            });
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

router.post(
    '/bulk-generate',
    validateRequest([
        body('monthYear')
            .trim()
            .matches(/^\d{4}-\d{2}$/)
            .withMessage('monthYear must use YYYY-MM format.'),
        body('ids')
            .isArray({ min: 1 })
            .withMessage('ids must be a non-empty array of teacher ObjectIds.'),
        body('ids.*')
            .custom((value) => mongoose.Types.ObjectId.isValid(value))
            .withMessage('Each teacher id must be a valid MongoDB ObjectId.')
    ]),
    async (req, res) => {
        try {
            const result = await generatePayrollForMonth({
                payrollMonth: req.body.monthYear,
                actorId: req.userId || req.admin?.id || null,
                actorRole: req.role || 'admin',
                teacherIds: req.body.ids
            });

            return res.status(result.generatedCount > 0 ? 201 : 200).json({
                message: `Payroll generation completed for ${result.payrollMonth}.`,
                ...result
            });
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

router.get(
    '/dashboard',
    validateRequest([
        query('monthYear')
            .optional()
            .matches(/^\d{4}-\d{2}$/)
            .withMessage('monthYear must use YYYY-MM format.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const cycle = parsePayrollMonth(req.query.monthYear || new Date().toISOString().slice(0, 7));
            const teachers = await Teacher.find({ status: 'active' }).select('_id salary').lean();
            const teacherIds = teachers.map(getTeacherIdValue).filter(Boolean);

            const [records, salaryConfigs, legacyProfiles] = await Promise.all([
                prisma.payrollRecord.findMany({
                    where: {
                        payrollMonth: cycle.key
                    }
                }),
                teacherIds.length > 0
                    ? prisma.teacherSalary.findMany({
                        where: {
                            teacherId: { in: teacherIds },
                            isActive: true
                        },
                        orderBy: [
                            { teacherId: 'asc' },
                            { effectiveFrom: 'desc' }
                        ]
                    })
                    : []
                ,
                teacherIds.length > 0
                    ? TeacherSalaryProfile.find({
                        teacherId: { $in: teacherIds },
                        status: 'Active'
                    }).select('teacherId baseSalary').lean()
                    : []
            ]);

            const latestConfigByTeacher = new Map();
            for (const config of salaryConfigs) {
                if (!latestConfigByTeacher.has(config.teacherId)) {
                    latestConfigByTeacher.set(config.teacherId, config.id);
                }
            }

            const legacyProfileByTeacher = new Map(
                legacyProfiles.map((profile) => [String(profile.teacherId), profile])
            );

            const teachersWithProfiles = teachers.filter((teacher) => {
                const teacherId = getTeacherIdValue(teacher);
                return latestConfigByTeacher.has(teacherId)
                    || Number(legacyProfileByTeacher.get(teacherId)?.baseSalary || 0) > 0
                    || Number(teacher.salary || 0) > 0;
            }).length;

            return res.json({
                totalTeachers: teacherIds.length,
                teachersWithProfiles,
                monthYear: cycle.key,
                totalLiability: toMoney(records.reduce((sum, record) => sum + toMoney(record.netSalary), 0)),
                totalPaid: toMoney(records.reduce((sum, record) => sum + toMoney(record.paidAmount), 0)),
                totalPending: toMoney(records.reduce((sum, record) => sum + toMoney(record.outstandingAmount), 0))
            });
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

router.get(
    '/salaries',
    validateRequest([
        query('monthYear')
            .optional()
            .matches(/^\d{4}-\d{2}$/)
            .withMessage('monthYear must use YYYY-MM format.'),
        query('teacherId')
            .optional()
            .custom((value) => mongoose.Types.ObjectId.isValid(value))
            .withMessage('teacherId must be a valid MongoDB ObjectId.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const monthFilter = req.query.monthYear ? parsePayrollMonth(req.query.monthYear).key : null;
            const teacherId = req.query.teacherId || null;

            const records = await prisma.payrollRecord.findMany({
                where: {
                    ...(monthFilter ? { payrollMonth: monthFilter } : {}),
                    ...(teacherId ? { teacherId } : {})
                },
                include: {
                    deductions: {
                        orderBy: { createdAt: 'asc' }
                    }
                },
                orderBy: [
                    { payrollMonth: 'desc' },
                    { createdAt: 'desc' }
                ]
            });

            const teacherIds = [...new Set(records.map((record) => record.teacherId))];
            const teachers = teacherIds.length > 0
                ? await Teacher.find({ _id: { $in: teacherIds } })
                    .select('name regNo department profileImage')
                    .lean()
                : [];
            const teacherMap = new Map(teachers.map((teacher) => [getTeacherIdValue(teacher), teacher]));

            return res.json(records.map((record) => toLegacySalaryRecord(serializePayrollRecord(record), teacherMap)));
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

router.get(
    '/profile/:teacherId',
    validateRequest([
        param('teacherId')
            .custom((value) => mongoose.Types.ObjectId.isValid(value))
            .withMessage('teacherId must be a valid MongoDB ObjectId.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const { teacherId } = req.params;

            const [teacher, profile, latestSalaryConfig] = await Promise.all([
                Teacher.findById(teacherId).select('name').lean(),
                TeacherSalaryProfile.findOne({ teacherId }).lean(),
                prisma.teacherSalary.findFirst({
                    where: { teacherId },
                    orderBy: { effectiveFrom: 'desc' }
                })
            ]);

            if (!teacher && !profile && !latestSalaryConfig) {
                throw createHttpError(404, 'Salary profile not found for this teacher.');
            }

            const resolvedBaseSalary = latestSalaryConfig
                ? toMoney(latestSalaryConfig.baseSalary)
                : toMoney(profile?.baseSalary || teacher?.salary || 0);

            return res.json({
                teacherId,
                teacherName: teacher?.name || null,
                salaryType: profile?.salaryType || 'Monthly',
                baseSalary: resolvedBaseSalary,
                status: profile?.status || (latestSalaryConfig?.isActive ? 'Active' : 'Inactive'),
                bankDetails: profile?.bankDetails || {}
            });
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

router.post(
    '/profile/:teacherId',
    validateRequest([
        param('teacherId')
            .custom((value) => mongoose.Types.ObjectId.isValid(value))
            .withMessage('teacherId must be a valid MongoDB ObjectId.'),
        body('baseSalary')
            .isFloat({ min: 0 })
            .withMessage('baseSalary must be a number greater than or equal to 0.'),
        body('salaryType')
            .optional()
            .isString()
            .trim()
            .notEmpty()
            .withMessage('salaryType must be a non-empty string.'),
        body('status')
            .optional()
            .isIn(['Active', 'Inactive'])
            .withMessage('status must be either Active or Inactive.'),
        body('bankDetails')
            .optional()
            .isObject()
            .withMessage('bankDetails must be an object.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const { teacherId } = req.params;
            const {
                salaryType = 'Monthly',
                baseSalary,
                status = 'Active',
                bankDetails = {}
            } = req.body;

            const teacher = await Teacher.findById(teacherId).select('name').lean();
            if (!teacher) {
                throw createHttpError(404, 'Teacher not found.');
            }

            let profile = await TeacherSalaryProfile.findOne({ teacherId });
            if (profile) {
                profile.salaryType = salaryType;
                profile.status = status;
                profile.bankDetails = {
                    ...profile.bankDetails,
                    ...bankDetails
                };
                profile.updatedAt = Date.now();
                await profile.save();
            } else {
                profile = await TeacherSalaryProfile.create({
                    teacherId,
                    salaryType,
                    baseSalary,
                    status,
                    bankDetails
                });
            }

            const requestedActive = status === 'Active';
            const requestedSalary = toMoney(baseSalary);
            const now = new Date();
            const latestSalaryConfig = await prisma.teacherSalary.findFirst({
                where: { teacherId },
                orderBy: { effectiveFrom: 'desc' }
            });

            if (!latestSalaryConfig) {
                await prisma.teacherSalary.create({
                    data: {
                        teacherId,
                        baseSalary: toDecimal(requestedSalary),
                        effectiveFrom: now,
                        isActive: requestedActive,
                        notes: 'Synced from payroll profile.'
                    }
                });
            } else if (
                toMoney(latestSalaryConfig.baseSalary) !== requestedSalary ||
                latestSalaryConfig.isActive !== requestedActive
            ) {
                if (!latestSalaryConfig.effectiveTo) {
                    await prisma.teacherSalary.update({
                        where: { id: latestSalaryConfig.id },
                        data: {
                            effectiveTo: now
                        }
                    });
                }

                await prisma.teacherSalary.create({
                    data: {
                        teacherId,
                        baseSalary: toDecimal(requestedSalary),
                        effectiveFrom: now,
                        isActive: requestedActive,
                        notes: 'Synced from payroll profile.'
                    }
                });
            }

            return res.json({
                message: 'Salary profile saved successfully',
                profile: {
                    teacherId,
                    teacherName: teacher.name,
                    salaryType,
                    baseSalary: requestedSalary,
                    status,
                    bankDetails: profile.bankDetails || {}
                }
            });
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

router.post(
    '/pay/:recordId',
    validateRequest([
        param('recordId').trim().notEmpty().withMessage('recordId is required.'),
        body('amount')
            .optional()
            .isFloat({ gt: 0 })
            .withMessage('amount must be a number greater than 0.'),
        body('paidAmount')
            .optional()
            .isFloat({ gt: 0 })
            .withMessage('paidAmount must be a number greater than 0.'),
        body('paymentDate')
            .optional()
            .isISO8601()
            .withMessage('paymentDate must be a valid ISO date.'),
        body('paymentMethod')
            .optional()
            .isString()
            .trim()
            .notEmpty()
            .withMessage('paymentMethod must be a non-empty string.'),
        body('referenceNo')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 120 })
            .withMessage('referenceNo must be at most 120 characters long.'),
        body('transactionId')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 120 })
            .withMessage('transactionId must be at most 120 characters long.'),
        body('remarks')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 500 })
            .withMessage('remarks must be at most 500 characters long.'),
        body('notes')
            .optional()
            .isString()
            .trim()
            .isLength({ max: 500 })
            .withMessage('notes must be at most 500 characters long.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const { recordId } = req.params;
            const {
                amount,
                paidAmount,
                paymentDate,
                paymentMethod,
                referenceNo,
                transactionId,
                remarks,
                notes
            } = req.body;

            const result = await runPayrollTransaction(async (tx) => {
                const record = await tx.payrollRecord.findUnique({
                    where: { id: recordId }
                });

                if (!record) {
                    throw createHttpError(404, 'Payroll record not found.');
                }

                const currentOutstanding = toMoney(record.outstandingAmount);
                if (currentOutstanding <= 0 || record.status === PayrollStatus.PAID) {
                    throw createHttpError(400, 'Salary is already fully paid.');
                }

                const paymentAmountValue = amount === undefined ? paidAmount : amount;
                const paymentAmount = paymentAmountValue === undefined
                    ? currentOutstanding
                    : parsePositiveAmount(paymentAmountValue, amount === undefined ? 'paidAmount' : 'amount');

                if (paymentAmount > currentOutstanding) {
                    throw createHttpError(400, `Payment amount exceeds outstanding salary of ${currentOutstanding}.`);
                }

                const normalizedPaymentMethod = normalizePayrollPaymentMethod(paymentMethod || record.paymentMethod || 'BANK_TRANSFER');
                const paymentTimestamp = parseDateInput(paymentDate, 'paymentDate');
                const resolvedReference = referenceNo ? String(referenceNo).trim() : (transactionId ? String(transactionId).trim() : record.paymentReference);
                const resolvedRemarks = remarks ? String(remarks).trim() : (notes ? String(notes).trim() : record.remarks);
                const nextPaidAmount = toMoney(toMoney(record.paidAmount) + paymentAmount);
                const outstandingAmount = toMoney(Math.max(toMoney(record.netSalary) - nextPaidAmount, 0));
                const nextStatus = resolvePayrollStatus(record.netSalary, nextPaidAmount);

                const updatedRecord = await tx.payrollRecord.update({
                    where: { id: recordId },
                    data: {
                        paidAmount: toDecimal(nextPaidAmount),
                        outstandingAmount: toDecimal(outstandingAmount),
                        status: nextStatus,
                        paymentDate: paymentTimestamp,
                        paymentMethod: normalizedPaymentMethod,
                        paymentReference: resolvedReference,
                        remarks: resolvedRemarks
                    }
                });

                await syncPayrollExpenseRecord(tx, {
                    ...record,
                    ...updatedRecord,
                    paidAmount: nextPaidAmount,
                    outstandingAmount,
                    status: nextStatus,
                    paymentDate: paymentTimestamp,
                    paymentMethod: normalizedPaymentMethod,
                    paymentReference: resolvedReference,
                    remarks: resolvedRemarks
                });

                await tx.payrollAuditLog.create({
                    data: {
                        payrollRecordId: recordId,
                        actorId: req.userId || req.admin?.id || null,
                        actorRole: req.role || 'admin',
                        action: PayrollAuditAction.PAYMENT_RECORDED,
                        amount: toDecimal(paymentAmount),
                        message: nextStatus === PayrollStatus.PAID
                            ? 'Salary marked as fully paid.'
                            : 'Partial salary payment recorded.',
                        metadata: {
                            paymentDate: paymentTimestamp.toISOString(),
                            paymentMethod: normalizedPaymentMethod,
                            referenceNo: resolvedReference || null,
                            remarks: resolvedRemarks || null,
                            previousPaidAmount: toMoney(record.paidAmount),
                            updatedPaidAmount: nextPaidAmount,
                            outstandingAmount,
                            updatedStatus: nextStatus
                        }
                    }
                });

                return tx.payrollRecord.findUnique({
                    where: { id: recordId },
                    include: {
                        teacherSalary: true,
                        deductions: {
                            orderBy: { createdAt: 'asc' }
                        },
                        auditLogs: {
                            orderBy: { createdAt: 'desc' }
                        }
                    }
                });
            });

            return res.json({
                message: 'Salary payment recorded successfully.',
                payrollRecord: serializePayrollRecord(result)
            });
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

router.get(
    '/teacher/:teacherId',
    validateRequest([
        param('teacherId')
            .custom((value) => mongoose.Types.ObjectId.isValid(value))
            .withMessage('teacherId must be a valid MongoDB ObjectId.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const { teacherId } = req.params;

            const [teacher, salaryConfigs, payrollRecords] = await Promise.all([
                Teacher.findById(teacherId)
                    .select('name regNo designation department email phone status assignments')
                    .lean(),
                prisma.teacherSalary.findMany({
                    where: { teacherId },
                    orderBy: { effectiveFrom: 'desc' }
                }),
                prisma.payrollRecord.findMany({
                    where: { teacherId },
                    include: {
                        teacherSalary: true,
                        deductions: {
                            orderBy: { createdAt: 'asc' }
                        },
                        auditLogs: {
                            orderBy: { createdAt: 'desc' }
                        }
                    },
                    orderBy: [
                        { payrollMonth: 'desc' },
                        { createdAt: 'desc' }
                    ]
                })
            ]);

            if (!teacher && salaryConfigs.length === 0 && payrollRecords.length === 0) {
                throw createHttpError(404, 'Teacher payroll history not found.');
            }

            const serializedRecords = payrollRecords.map(serializePayrollRecord);

            return res.json({
                teacher: teacher ? {
                    id: getTeacherIdValue(teacher),
                    name: teacher.name,
                    regNo: teacher.regNo || null,
                    designation: teacher.designation || null,
                    department: teacher.department || null,
                    email: teacher.email || null,
                    phone: teacher.phone || null,
                    status: teacher.status,
                    assignments: Array.isArray(teacher.assignments) ? teacher.assignments : []
                } : {
                    id: teacherId,
                    name: serializedRecords[0]?.teacherNameSnapshot || null,
                    regNo: serializedRecords[0]?.regNoSnapshot || null,
                    designation: serializedRecords[0]?.designationSnapshot || null
                },
                salaryConfigs: salaryConfigs.map(serializeTeacherSalary),
                payrollRecords: serializedRecords,
                summary: {
                    totalRecords: serializedRecords.length,
                    totalBaseSalary: toMoney(serializedRecords.reduce((sum, record) => sum + record.baseSalary, 0)),
                    totalDeductions: toMoney(serializedRecords.reduce((sum, record) => sum + record.totalDeductions, 0)),
                    totalNetSalary: toMoney(serializedRecords.reduce((sum, record) => sum + record.netSalary, 0)),
                    totalPaid: toMoney(serializedRecords.reduce((sum, record) => sum + record.paidAmount, 0)),
                    totalOutstanding: toMoney(serializedRecords.reduce((sum, record) => sum + record.outstandingAmount, 0)),
                    pendingCount: serializedRecords.filter((record) => record.status === PayrollStatus.PENDING).length,
                    partialCount: serializedRecords.filter((record) => record.status === PayrollStatus.PARTIALLY_PAID).length,
                    paidCount: serializedRecords.filter((record) => record.status === PayrollStatus.PAID).length
                }
            });
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

router.get(
    '/summary/:month',
    validateRequest([
        param('month')
            .trim()
            .matches(/^\d{4}-\d{2}$/)
            .withMessage('month must use YYYY-MM format.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const cycle = parsePayrollMonth(req.params.month);

            const [records, activeTeacherCount] = await Promise.all([
                prisma.payrollRecord.findMany({
                    where: { payrollMonth: cycle.key },
                    include: {
                        deductions: {
                            orderBy: { createdAt: 'asc' }
                        }
                    },
                    orderBy: [
                        { status: 'asc' },
                        { teacherNameSnapshot: 'asc' }
                    ]
                }),
                Teacher.countDocuments({ status: 'active' })
            ]);

            const serializedRecords = records.map(serializePayrollRecord);

            return res.json({
                payrollMonth: cycle.key,
                summary: {
                    activeTeacherCount,
                    generatedCount: serializedRecords.length,
                    pendingCount: serializedRecords.filter((record) => record.status === PayrollStatus.PENDING).length,
                    partialCount: serializedRecords.filter((record) => record.status === PayrollStatus.PARTIALLY_PAID).length,
                    paidCount: serializedRecords.filter((record) => record.status === PayrollStatus.PAID).length,
                    totalBaseSalary: toMoney(serializedRecords.reduce((sum, record) => sum + record.baseSalary, 0)),
                    totalDeductions: toMoney(serializedRecords.reduce((sum, record) => sum + record.totalDeductions, 0)),
                    totalNetSalary: toMoney(serializedRecords.reduce((sum, record) => sum + record.netSalary, 0)),
                    totalPaid: toMoney(serializedRecords.reduce((sum, record) => sum + record.paidAmount, 0)),
                    totalOutstanding: toMoney(serializedRecords.reduce((sum, record) => sum + record.outstandingAmount, 0))
                },
                records: serializedRecords
            });
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

router.get(
    '/pending',
    validateRequest([
        query('month')
            .optional()
            .matches(/^\d{4}-\d{2}$/)
            .withMessage('month must use YYYY-MM format.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const monthFilter = req.query.month ? parsePayrollMonth(req.query.month).key : null;

            const pendingRecords = await prisma.payrollRecord.findMany({
                where: {
                    status: {
                        in: [PayrollStatus.PENDING, PayrollStatus.PARTIALLY_PAID]
                    },
                    ...(monthFilter ? { payrollMonth: monthFilter } : {})
                },
                include: {
                    teacherSalary: true,
                    deductions: {
                        orderBy: { createdAt: 'asc' }
                    },
                    auditLogs: {
                        orderBy: { createdAt: 'desc' }
                    }
                },
                orderBy: [
                    { payrollMonth: 'desc' },
                    { outstandingAmount: 'desc' }
                ]
            });

            const serializedRecords = pendingRecords.map(serializePayrollRecord);

            return res.json({
                records: serializedRecords,
                summary: {
                    payrollMonth: monthFilter,
                    totalPendingRecords: serializedRecords.length,
                    pendingCount: serializedRecords.filter((record) => record.status === PayrollStatus.PENDING).length,
                    partialCount: serializedRecords.filter((record) => record.status === PayrollStatus.PARTIALLY_PAID).length,
                    totalOutstanding: toMoney(serializedRecords.reduce((sum, record) => sum + record.outstandingAmount, 0)),
                    totalNetSalary: toMoney(serializedRecords.reduce((sum, record) => sum + record.netSalary, 0)),
                    totalPaid: toMoney(serializedRecords.reduce((sum, record) => sum + record.paidAmount, 0))
                }
            });
        } catch (error) {
            return handlePayrollError(res, error);
        }
    }
);

module.exports = router;
