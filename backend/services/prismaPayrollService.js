const {
    Prisma,
    PayrollStatus,
    PayrollAuditAction,
    PayrollPaymentMethod
} = require('@prisma/client');
const { getPrismaClient, connectPostgres } = require('../config/postgres');
const Teacher = require('../models/Teacher');
const { TeacherSalaryProfile } = require('../models/TeacherPayroll');

const SERIALIZABLE_TX_OPTIONS = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5000,
    timeout: 10000
};

const PAYMENT_METHOD_ALIASES = {
    BANK: PayrollPaymentMethod.BANK_TRANSFER,
    BANK_TRANSFER: PayrollPaymentMethod.BANK_TRANSFER,
    CASH: PayrollPaymentMethod.CASH,
    CHEQUE: PayrollPaymentMethod.CHEQUE,
    CHECK: PayrollPaymentMethod.CHEQUE,
    ONLINE: PayrollPaymentMethod.ONLINE,
    OTHER: PayrollPaymentMethod.OTHER,
    TRANSFER: PayrollPaymentMethod.BANK_TRANSFER,
    UPI: PayrollPaymentMethod.UPI
};

function createHttpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function toMoney(value) {
    return Number(Number(value || 0).toFixed(2));
}

function toDecimal(value) {
    return new Prisma.Decimal(toMoney(value).toFixed(2));
}

function getTeacherIdValue(teacher) {
    return teacher?._id ? teacher._id.toString() : null;
}

function getMonthStart(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getMonthEnd(date) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

function formatPayrollMonth(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parsePayrollMonth(input) {
    if (!input || typeof input !== 'string' || !/^\d{4}-\d{2}$/.test(input.trim())) {
        throw createHttpError(400, 'month must use YYYY-MM format.');
    }

    const [year, month] = input.trim().split('-').map(Number);
    if (month < 1 || month > 12) {
        throw createHttpError(400, 'month must use YYYY-MM format.');
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    return {
        key: formatPayrollMonth(start),
        start,
        end: getMonthEnd(start)
    };
}

function parseDateInput(value, fieldName) {
    if (!value) {
        return new Date();
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
        throw createHttpError(400, `${fieldName} must be a valid date.`);
    }

    return parsedDate;
}

function parsePositiveAmount(value, fieldName) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        throw createHttpError(400, `${fieldName} must be a number greater than 0.`);
    }

    return toMoney(numericValue);
}

function normalizePayrollPaymentMethod(value) {
    const normalized = String(value || PayrollPaymentMethod.BANK_TRANSFER)
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    const method = PAYMENT_METHOD_ALIASES[normalized];
    if (!method) {
        throw createHttpError(400, `Unsupported paymentMethod. Allowed values: ${Object.keys(PAYMENT_METHOD_ALIASES).join(', ')}.`);
    }

    return method;
}

function resolvePayrollStatus(netSalary, paidAmount) {
    const normalizedNet = toMoney(netSalary);
    const normalizedPaid = toMoney(paidAmount);

    if (normalizedNet <= 0 || normalizedPaid >= normalizedNet) {
        return PayrollStatus.PAID;
    }

    if (normalizedPaid > 0) {
        return PayrollStatus.PARTIALLY_PAID;
    }

    return PayrollStatus.PENDING;
}

function findApplicableSalaryConfig(configs, monthStart) {
    const monthEnd = getMonthEnd(monthStart);

    return configs.find((config) => {
        const effectiveFrom = new Date(config.effectiveFrom);
        const effectiveTo = config.effectiveTo ? new Date(config.effectiveTo) : null;
        return effectiveFrom <= monthEnd && (!effectiveTo || effectiveTo >= monthStart);
    }) || null;
}

function serializeTeacherSalary(config) {
    if (!config) {
        return null;
    }

    return {
        id: config.id,
        teacherId: config.teacherId,
        baseSalary: toMoney(config.baseSalary),
        currency: config.currency,
        effectiveFrom: config.effectiveFrom,
        effectiveTo: config.effectiveTo,
        isActive: config.isActive,
        notes: config.notes,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt
    };
}

function serializePayrollDeduction(deduction) {
    if (!deduction) {
        return null;
    }

    return {
        id: deduction.id,
        teacherId: deduction.teacherId,
        payrollRecordId: deduction.payrollRecordId,
        payrollMonth: deduction.payrollMonth,
        deductionType: deduction.deductionType,
        title: deduction.title,
        amount: toMoney(deduction.amount),
        notes: deduction.notes,
        effectiveDate: deduction.effectiveDate,
        createdAt: deduction.createdAt,
        updatedAt: deduction.updatedAt
    };
}

function serializePayrollAuditLog(log) {
    if (!log) {
        return null;
    }

    return {
        id: log.id,
        payrollRecordId: log.payrollRecordId,
        actorId: log.actorId,
        actorRole: log.actorRole,
        action: log.action,
        amount: log.amount == null ? null : toMoney(log.amount),
        message: log.message,
        metadata: log.metadata || null,
        createdAt: log.createdAt
    };
}

function serializePayrollRecord(record) {
    if (!record) {
        return null;
    }

    return {
        id: record.id,
        teacherId: record.teacherId,
        teacherSalaryId: record.teacherSalaryId,
        payrollMonth: record.payrollMonth,
        baseSalary: toMoney(record.baseSalary),
        extraClassesAmount: toMoney(record.extraClassesAmount),
        bonusAmount: toMoney(record.bonusAmount),
        totalDeductions: toMoney(record.totalDeductions),
        netSalary: toMoney(record.netSalary),
        paidAmount: toMoney(record.paidAmount),
        outstandingAmount: toMoney(record.outstandingAmount),
        status: record.status,
        paymentDate: record.paymentDate,
        paymentMethod: record.paymentMethod,
        paymentReference: record.paymentReference,
        remarks: record.remarks,
        teacherNameSnapshot: record.teacherNameSnapshot,
        regNoSnapshot: record.regNoSnapshot,
        designationSnapshot: record.designationSnapshot,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        teacherSalary: record.teacherSalary ? serializeTeacherSalary(record.teacherSalary) : null,
        deductions: Array.isArray(record.deductions) ? record.deductions.map(serializePayrollDeduction) : [],
        auditLogs: Array.isArray(record.auditLogs) ? record.auditLogs.map(serializePayrollAuditLog) : []
    };
}

async function runPayrollTransaction(work, maxRetries = 3) {
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

    throw createHttpError(409, 'Payroll transaction could not be completed safely.');
}

function handlePayrollError(res, error) {
    if (error?.code === 'P2002') {
        return res.status(409).json({ message: 'Duplicate payroll record detected in PostgreSQL.', error: error.message });
    }

    if (error?.code === 'P2025') {
        return res.status(404).json({ message: 'Requested payroll record was not found.', error: error.message });
    }

    if (error?.status) {
        return res.status(error.status).json({ message: error.message });
    }

    console.error('[PrismaPayroll] Error:', error);
    return res.status(500).json({
        message: 'Internal server error while processing payroll request.',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
}

async function generatePayrollForMonth({ payrollMonth, actorId = null, actorRole = 'system', teacherIds: scopedTeacherIds = null }) {
    await connectPostgres();
    const prisma = getPrismaClient();
    const cycle = parsePayrollMonth(payrollMonth);

    const teacherIdFilter = Array.isArray(scopedTeacherIds) && scopedTeacherIds.length > 0
        ? { _id: { $in: scopedTeacherIds } }
        : {};

    const teachers = await Teacher.find({
        status: 'active',
        ...teacherIdFilter
    })
        .select('name regNo designation joiningDate salary status')
        .lean();

    const teacherIds = teachers.map(getTeacherIdValue).filter(Boolean);

    if (teacherIds.length === 0) {
        return {
            payrollMonth: cycle.key,
            generatedCount: 0,
            existingCount: 0,
            skippedCount: 0,
            warnings: []
        };
    }

    const [salaryConfigs, deductions, extraClasses, bonuses, existingRecords, legacyProfiles] = await Promise.all([
        prisma.teacherSalary.findMany({
            where: {
                teacherId: { in: teacherIds },
                isActive: true
            },
            orderBy: [
                { teacherId: 'asc' },
                { effectiveFrom: 'desc' }
            ]
        }),
        prisma.payrollDeduction.findMany({
            where: {
                teacherId: { in: teacherIds },
                payrollMonth: cycle.key
            },
            orderBy: { createdAt: 'asc' }
        }),
        TeacherExtraClass.find({
            teacherId: { $in: teacherIds },
            monthRecord: cycle.key
        }).select('teacherId amount').lean(),
        TeacherBonus.find({
            teacherId: { $in: teacherIds },
            monthRecord: cycle.key
        }).select('teacherId amount').lean(),
        prisma.payrollRecord.findMany({
            where: {
                teacherId: { in: teacherIds },
                payrollMonth: cycle.key
            },
            select: {
                id: true,
                teacherId: true
            }
        }),
        TeacherSalaryProfile.find({
            teacherId: { $in: teacherIds },
            status: 'Active'
        })
            .select('teacherId baseSalary salaryType status')
            .lean()
            .catch(() => [])
    ]);

    const legacyProfilesByTeacher = new Map(
        legacyProfiles.map((profile) => [
            String(profile.teacherId),
            profile
        ])
    );

    const configsByTeacher = salaryConfigs.reduce((map, config) => {
        if (!map.has(config.teacherId)) {
            map.set(config.teacherId, []);
        }

        map.get(config.teacherId).push(config);
        return map;
    }, new Map());

    const deductionsByTeacher = deductions.reduce((map, deduction) => {
        if (!map.has(deduction.teacherId)) {
            map.set(deduction.teacherId, []);
        }

        map.get(deduction.teacherId).push(deduction);
        return map;
    }, new Map());

    const existingByTeacher = new Map(existingRecords.map((record) => [record.teacherId, record.id]));

    const extraClassesByTeacher = extraClasses.reduce((map, item) => {
        const tid = String(item.teacherId);
        map.set(tid, (map.get(tid) || 0) + toMoney(item.amount));
        return map;
    }, new Map());

    const bonusesByTeacher = bonuses.reduce((map, item) => {
        const tid = String(item.teacherId);
        map.set(tid, (map.get(tid) || 0) + toMoney(item.amount));
        return map;
    }, new Map());

    const warnings = [];
    let generatedCount = 0;
    let existingCount = 0;
    let skippedCount = 0;

    for (const teacher of teachers) {
        const teacherId = getTeacherIdValue(teacher);
        if (!teacherId) {
            skippedCount += 1;
            continue;
        }

        if (existingByTeacher.has(teacherId)) {
            existingCount += 1;
            continue;
        }

        const applicableConfig = findApplicableSalaryConfig(configsByTeacher.get(teacherId) || [], cycle.start);
        const legacyProfile = legacyProfilesByTeacher.get(teacherId) || null;
        let resolvedConfig = applicableConfig;

        if (!resolvedConfig) {
            const fallbackBaseSalary = toMoney(legacyProfile?.baseSalary || teacher.salary || 0);

            if (fallbackBaseSalary > 0) {
                resolvedConfig = await prisma.teacherSalary.upsert({
                    where: {
                        teacherId_effectiveFrom: {
                            teacherId,
                            effectiveFrom: cycle.start
                        }
                    },
                    update: {
                        baseSalary: toDecimal(fallbackBaseSalary),
                        isActive: true,
                        notes: legacyProfile
                            ? 'Auto-synced from legacy Mongo payroll profile.'
                            : 'Auto-synced from Mongo teacher salary.'
                    },
                    create: {
                        teacherId,
                        baseSalary: toDecimal(fallbackBaseSalary),
                        effectiveFrom: cycle.start,
                        isActive: true,
                        notes: legacyProfile
                            ? 'Auto-synced from legacy Mongo payroll profile.'
                            : 'Auto-synced from Mongo teacher salary.'
                    }
                });
            }
        }

        if (!resolvedConfig) {
            warnings.push({
                teacherId,
                teacherName: teacher.name,
                reason: 'No active salary configuration found for the requested month.'
            });
            skippedCount += 1;
            continue;
        }

        const teacherDeductions = deductionsByTeacher.get(teacherId) || [];
        const extraClassesAmount = extraClassesByTeacher.get(teacherId) || 0;
        const bonusAmount = bonusesByTeacher.get(teacherId) || 0;
        const totalDeductions = toMoney(teacherDeductions.reduce((sum, deduction) => sum + toMoney(deduction.amount), 0));
        const baseSalary = toMoney(resolvedConfig.baseSalary);
        const netSalary = toMoney(Math.max(baseSalary + extraClassesAmount + bonusAmount - totalDeductions, 0));
        const deductionIds = teacherDeductions.map((deduction) => deduction.id);

        await runPayrollTransaction(async (tx) => {
            const record = await tx.payrollRecord.create({
                data: {
                    teacherId,
                    teacherSalaryId: resolvedConfig.id,
                    payrollMonth: cycle.key,
                    baseSalary: toDecimal(baseSalary),
                    extraClassesAmount: toDecimal(extraClassesAmount),
                    bonusAmount: toDecimal(bonusAmount),
                    totalDeductions: toDecimal(totalDeductions),
                    netSalary: toDecimal(netSalary),
                    paidAmount: toDecimal(0),
                    outstandingAmount: toDecimal(netSalary),
                    status: resolvePayrollStatus(netSalary, 0),
                    teacherNameSnapshot: teacher.name || null,
                    regNoSnapshot: teacher.regNo || null,
                    designationSnapshot: teacher.designation || null
                }
            });

            if (deductionIds.length > 0) {
                await tx.payrollDeduction.updateMany({
                    where: {
                        id: { in: deductionIds },
                        payrollRecordId: null
                    },
                    data: {
                        payrollRecordId: record.id
                    }
                });
            }

            await tx.payrollAuditLog.create({
                data: {
                    payrollRecordId: record.id,
                    actorId,
                    actorRole,
                    action: PayrollAuditAction.GENERATED,
                    message: `Payroll generated for ${cycle.key}.`,
                    metadata: {
                        payrollMonth: cycle.key,
                        extraClassesAmount,
                        bonusAmount,
                        totalDeductions,
                        netSalary
                    }
                }
            });
        });

        generatedCount += 1;
    }

    return {
        payrollMonth: cycle.key,
        generatedCount,
        existingCount,
        skippedCount,
        warnings
    };
}

module.exports = {
    PayrollPaymentMethod,
    createHttpError,
    toMoney,
    toDecimal,
    parsePayrollMonth,
    parseDateInput,
    parsePositiveAmount,
    normalizePayrollPaymentMethod,
    resolvePayrollStatus,
    serializeTeacherSalary,
    serializePayrollDeduction,
    serializePayrollAuditLog,
    serializePayrollRecord,
    runPayrollTransaction,
    handlePayrollError,
    generatePayrollForMonth
};
