const { Prisma, ExpensePaymentMode, ExpenseStatus, PayrollPaymentMethod } = require('@prisma/client');

const PAYMENT_MODE_ALIASES = {
    BANK: ExpensePaymentMode.BANK_TRANSFER,
    BANK_TRANSFER: ExpensePaymentMode.BANK_TRANSFER,
    CARD: ExpensePaymentMode.CARD,
    CASH: ExpensePaymentMode.CASH,
    CHEQUE: ExpensePaymentMode.CHEQUE,
    CHECK: ExpensePaymentMode.CHEQUE,
    OTHER: ExpensePaymentMode.OTHER,
    UPI: ExpensePaymentMode.UPI
};

const STATUS_ALIASES = {
    CANCELLED: ExpenseStatus.CANCELLED,
    CANCELED: ExpenseStatus.CANCELLED,
    PAID: ExpenseStatus.PAID,
    PENDING: ExpenseStatus.PENDING
};

const CATEGORY_NAME_ALIASES = {
    ELECTRICITY: 'Utilities',
    ELECTRICITY_BILL: 'Utilities',
    RENT: 'Rent',
    SALARY: 'Salaries',
    SALARIES: 'Salaries',
    STATIONARY: 'Stationery',
    STATIONERY: 'Stationery',
    SUPPLY: 'Supplies',
    SUPPLIES: 'Supplies',
    UTILITY: 'Utilities',
    UTILITIES: 'Utilities'
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

function parsePositiveAmount(value, fieldName = 'amount') {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        throw createHttpError(400, `${fieldName} must be a number greater than 0.`);
    }

    return toMoney(numericValue);
}

function parseDateInput(value, fieldName = 'date') {
    if (!value) {
        return new Date();
    }

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

function formatMonthKey(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function parseMonthKey(input) {
    if (!input || typeof input !== 'string' || !/^\d{4}-\d{2}$/.test(input.trim())) {
        throw createHttpError(400, 'month must use YYYY-MM format.');
    }

    const [year, month] = input.trim().split('-').map(Number);
    if (month < 1 || month > 12) {
        throw createHttpError(400, 'month must use YYYY-MM format.');
    }

    const start = new Date(Date.UTC(year, month - 1, 1));
    return {
        key: formatMonthKey(start),
        start,
        end: getMonthEnd(start)
    };
}

function parseYearInput(input) {
    const year = Number(input || new Date().getUTCFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 3000) {
        throw createHttpError(400, 'year must be a four-digit number.');
    }

    return {
        year,
        start: new Date(Date.UTC(year, 0, 1)),
        end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999))
    };
}

function slugifyCategoryName(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'other';
}

function normalizeCategoryName(name) {
    const rawName = String(name || 'Other').trim();
    if (!rawName) {
        return 'Other';
    }

    const aliasKey = rawName.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    return CATEGORY_NAME_ALIASES[aliasKey] || rawName;
}

function normalizeExpensePaymentMode(value) {
    const normalized = String(value || ExpensePaymentMode.CASH)
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    const paymentMode = PAYMENT_MODE_ALIASES[normalized];
    if (!paymentMode) {
        throw createHttpError(400, `Unsupported paymentMode. Allowed values: ${Object.keys(PAYMENT_MODE_ALIASES).join(', ')}.`);
    }

    return paymentMode;
}

function normalizeExpenseStatus(value) {
    const normalized = String(value || ExpenseStatus.PAID)
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_');

    const status = STATUS_ALIASES[normalized];
    if (!status) {
        throw createHttpError(400, `Unsupported status. Allowed values: ${Object.keys(STATUS_ALIASES).join(', ')}.`);
    }

    return status;
}

function formatPaymentMode(paymentMode) {
    switch (paymentMode) {
        case ExpensePaymentMode.BANK_TRANSFER:
            return 'Bank Transfer';
        case ExpensePaymentMode.CARD:
            return 'Card';
        case ExpensePaymentMode.CASH:
            return 'Cash';
        case ExpensePaymentMode.CHEQUE:
            return 'Cheque';
        case ExpensePaymentMode.UPI:
            return 'UPI';
        default:
            return 'Other';
    }
}

function formatExpenseStatus(status) {
    switch (status) {
        case ExpenseStatus.CANCELLED:
            return 'Cancelled';
        case ExpenseStatus.PENDING:
            return 'Pending';
        default:
            return 'Paid';
    }
}

function mapPayrollPaymentMethodToExpensePaymentMode(paymentMethod) {
    switch (paymentMethod) {
        case PayrollPaymentMethod.CASH:
            return ExpensePaymentMode.CASH;
        case PayrollPaymentMethod.UPI:
            return ExpensePaymentMode.UPI;
        case PayrollPaymentMethod.BANK_TRANSFER:
            return ExpensePaymentMode.BANK_TRANSFER;
        case PayrollPaymentMethod.CHEQUE:
            return ExpensePaymentMode.CHEQUE;
        default:
            return ExpensePaymentMode.OTHER;
    }
}

function serializeExpenseCategory(category) {
    if (!category) {
        return null;
    }

    return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        isActive: category.isActive,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt
    };
}

function serializeExpense(expense) {
    if (!expense) {
        return null;
    }

    return {
        id: expense.id,
        _id: expense.id,
        title: expense.title,
        amount: toMoney(expense.amount),
        category: expense.category?.name || null,
        categoryId: expense.categoryId,
        description: expense.description,
        receiptUrl: expense.receiptUrl,
        paymentMode: formatPaymentMode(expense.paymentMode),
        paymentModeCode: expense.paymentMode,
        status: formatExpenseStatus(expense.status),
        statusCode: expense.status,
        date: expense.expenseDate,
        expenseDate: expense.expenseDate,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt
    };
}

function handleExpenseError(res, error) {
    if (error?.code === 'P2002') {
        return res.status(409).json({ message: 'Duplicate expense or budget record detected.', error: error.message });
    }

    if (error?.code === 'P2025') {
        return res.status(404).json({ message: 'Requested expense record was not found.', error: error.message });
    }

    if (error?.status) {
        return res.status(error.status).json({ message: error.message });
    }

    console.error('[PrismaExpenses] Error:', error);
    return res.status(500).json({
        message: 'Internal server error while processing expenses.',
        error: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
}

async function upsertExpenseCategory(tx, categoryName) {
    const normalizedName = normalizeCategoryName(categoryName);
    const slug = slugifyCategoryName(normalizedName);

    return tx.expenseCategory.upsert({
        where: { slug },
        update: {
            name: normalizedName,
            isActive: true
        },
        create: {
            name: normalizedName,
            slug,
            isActive: true
        }
    });
}

async function syncPayrollExpenseRecord(tx, payrollRecord) {
    if (!payrollRecord) {
        return null;
    }

    const paidAmount = toMoney(payrollRecord.paidAmount);
    const token = `[PAYROLL_RECORD:${payrollRecord.id}]`;
    const category = await upsertExpenseCategory(tx, 'Salaries');
    const existingExpense = await tx.expense.findFirst({
        where: {
            categoryId: category.id,
            description: {
                contains: token
            }
        }
    });

    if (paidAmount <= 0) {
        if (existingExpense) {
            await tx.expense.delete({
                where: { id: existingExpense.id }
            });
        }
        return null;
    }

    const teacherName = payrollRecord.teacherNameSnapshot || 'Teacher';
    const outstandingAmount = toMoney(payrollRecord.outstandingAmount);
    const remarks = payrollRecord.remarks ? String(payrollRecord.remarks).trim() : null;
    const paymentReference = payrollRecord.paymentReference ? String(payrollRecord.paymentReference).trim() : null;
    const detailParts = [
        `Auto-generated from teacher payroll for ${payrollRecord.payrollMonth}.`,
        `Disbursed amount: Rs ${paidAmount.toFixed(2)}.`
    ];

    if (outstandingAmount > 0) {
        detailParts.push(`Outstanding salary: Rs ${outstandingAmount.toFixed(2)}.`);
    }

    if (paymentReference) {
        detailParts.push(`Reference: ${paymentReference}.`);
    }

    if (remarks) {
        detailParts.push(`Remarks: ${remarks}.`);
    }

    detailParts.push(token);

    const payload = {
        title: `Salary Disbursement - ${teacherName} (${payrollRecord.payrollMonth})`,
        categoryId: category.id,
        amount: toDecimal(paidAmount),
        expenseDate: payrollRecord.paymentDate ? new Date(payrollRecord.paymentDate) : new Date(),
        description: detailParts.join(' '),
        paymentMode: mapPayrollPaymentMethodToExpensePaymentMode(payrollRecord.paymentMethod),
        status: ExpenseStatus.PAID
    };

    if (existingExpense) {
        return tx.expense.update({
            where: { id: existingExpense.id },
            data: payload,
            include: { category: true }
        });
    }

    return tx.expense.create({
        data: payload,
        include: { category: true }
    });
}

module.exports = {
    ExpensePaymentMode,
    ExpenseStatus,
    createHttpError,
    toMoney,
    toDecimal,
    parsePositiveAmount,
    parseDateInput,
    parseMonthKey,
    parseYearInput,
    normalizeCategoryName,
    normalizeExpensePaymentMode,
    normalizeExpenseStatus,
    mapPayrollPaymentMethodToExpensePaymentMode,
    serializeExpenseCategory,
    serializeExpense,
    handleExpenseError,
    upsertExpenseCategory,
    syncPayrollExpenseRecord
};
