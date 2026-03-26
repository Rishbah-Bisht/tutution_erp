const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { ExpenseStatus } = require('@prisma/client');
const { adminAuth } = require('../middleware/auth.middleware');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const { getPrismaClient, connectPostgres } = require('../config/postgres');
const {
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
    serializeExpense,
    handleExpenseError,
    upsertExpenseCategory
} = require('../services/prismaExpenseService');

const router = express.Router();

router.use(adminAuth);

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

async function fetchExpenseWithCategory(prisma, id) {
    return prisma.expense.findUnique({
        where: { id },
        include: {
            category: true
        }
    });
}

async function buildExpenseMetrics(prisma) {
    const now = new Date();
    const month = parseMonthKey(`${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`);

    const [expenses] = await Promise.all([
        prisma.expense.findMany({
            where: {
                status: {
                    in: [ExpenseStatus.PAID, ExpenseStatus.PENDING]
                }
            },
            include: {
                category: true
            }
        })
    ]);

    const paidExpenses = expenses.filter((expense) => expense.status === ExpenseStatus.PAID);
    const paidThisMonth = paidExpenses.filter((expense) => {
        const expenseDate = new Date(expense.expenseDate);
        return expenseDate >= month.start && expenseDate <= month.end;
    });

    const pendingExpenses = expenses.filter((expense) => expense.status === ExpenseStatus.PENDING);
    const categoryTotals = new Map();
    for (const expense of paidThisMonth) {
        const categoryName = expense.category?.name || 'Other';
        categoryTotals.set(categoryName, toMoney((categoryTotals.get(categoryName) || 0) + toMoney(expense.amount)));
    }

    const categoryBreakdown = [...categoryTotals.entries()]
        .map(([category, amount]) => ({ category, amount }))
        .sort((left, right) => right.amount - left.amount);

    return {
        totalOverall: toMoney(paidExpenses.reduce((sum, expense) => sum + toMoney(expense.amount), 0)),
        thisMonthTotal: toMoney(paidThisMonth.reduce((sum, expense) => sum + toMoney(expense.amount), 0)),
        pendingTotal: toMoney(pendingExpenses.reduce((sum, expense) => sum + toMoney(expense.amount), 0)),
        categoryBreakdown
    };
}

router.get('/metrics', async (req, res) => {
    try {
        await connectPostgres();
        const prisma = getPrismaClient();
        const metrics = await buildExpenseMetrics(prisma);

        return res.json({
            success: true,
            metrics
        });
    } catch (error) {
        return handleExpenseError(res, error);
    }
});

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
            const cycle = parseMonthKey(req.params.month);

            const [categories, budgets, expenses] = await Promise.all([
                prisma.expenseCategory.findMany({
                    where: { isActive: true },
                    orderBy: { name: 'asc' }
                }),
                prisma.expenseBudget.findMany({
                    where: { budgetMonth: cycle.key }
                }),
                prisma.expense.findMany({
                    where: {
                        expenseDate: {
                            gte: cycle.start,
                            lte: cycle.end
                        },
                        status: ExpenseStatus.PAID
                    },
                    include: {
                        category: true
                    }
                })
            ]);

            const categoryMap = new Map(categories.map((category) => [category.id, category]));
            const budgetMap = new Map(budgets.map((budget) => [budget.categoryId, budget]));
            const spentMap = new Map();

            for (const expense of expenses) {
                spentMap.set(
                    expense.categoryId,
                    toMoney((spentMap.get(expense.categoryId) || 0) + toMoney(expense.amount))
                );
            }

            const categoryIds = new Set([
                ...categoryMap.keys(),
                ...budgetMap.keys(),
                ...spentMap.keys()
            ]);

            const categoriesSummary = [...categoryIds].map((categoryId) => {
                const category = categoryMap.get(categoryId);
                const budget = budgetMap.get(categoryId);
                const spent = toMoney(spentMap.get(categoryId) || 0);
                const budgetAmount = toMoney(budget?.amount || 0);
                const usagePercent = budgetAmount > 0 ? toMoney((spent / budgetAmount) * 100) : 0;
                const isWarning = budgetAmount > 0 && usagePercent >= 80;
                const isOverBudget = budgetAmount > 0 && spent > budgetAmount;

                return {
                    categoryId,
                    categoryName: category?.name || 'Uncategorized',
                    spent,
                    budget: budgetAmount,
                    remainingBudget: budgetAmount > 0 ? toMoney(budgetAmount - spent) : null,
                    usagePercent,
                    warning: isWarning,
                    overBudget: isOverBudget
                };
            }).sort((left, right) => right.spent - left.spent);

            return res.json({
                month: cycle.key,
                summary: {
                    totalSpent: toMoney(categoriesSummary.reduce((sum, item) => sum + item.spent, 0)),
                    totalBudget: toMoney(categoriesSummary.reduce((sum, item) => sum + (item.budget || 0), 0)),
                    warningCount: categoriesSummary.filter((item) => item.warning).length,
                    overBudgetCount: categoriesSummary.filter((item) => item.overBudget).length
                },
                categories: categoriesSummary
            });
        } catch (error) {
            return handleExpenseError(res, error);
        }
    }
);

router.get(
    '/report',
    validateRequest([
        query('year')
            .optional()
            .isInt({ min: 2000, max: 3000 })
            .withMessage('year must be a four-digit number.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const { year, start, end } = parseYearInput(req.query.year);

            const expenses = await prisma.expense.findMany({
                where: {
                    expenseDate: {
                        gte: start,
                        lte: end
                    },
                    status: ExpenseStatus.PAID
                },
                include: {
                    category: true
                },
                orderBy: [
                    { expenseDate: 'asc' },
                    { createdAt: 'asc' }
                ]
            });

            const categoryReportMap = new Map();

            for (const expense of expenses) {
                const categoryName = expense.category?.name || 'Uncategorized';
                const monthKey = `${year}-${String(new Date(expense.expenseDate).getUTCMonth() + 1).padStart(2, '0')}`;

                if (!categoryReportMap.has(categoryName)) {
                    categoryReportMap.set(categoryName, {
                        categoryName,
                        totalSpent: 0,
                        monthlyBreakdown: new Map()
                    });
                }

                const group = categoryReportMap.get(categoryName);
                group.totalSpent = toMoney(group.totalSpent + toMoney(expense.amount));
                group.monthlyBreakdown.set(
                    monthKey,
                    toMoney((group.monthlyBreakdown.get(monthKey) || 0) + toMoney(expense.amount))
                );
            }

            const categories = [...categoryReportMap.values()].map((entry) => ({
                categoryName: entry.categoryName,
                totalSpent: entry.totalSpent,
                monthlyBreakdown: [...entry.monthlyBreakdown.entries()]
                    .map(([month, amount]) => ({ month, amount }))
                    .sort((left, right) => left.month.localeCompare(right.month))
            })).sort((left, right) => right.totalSpent - left.totalSpent);

            return res.json({
                year,
                totalSpent: toMoney(categories.reduce((sum, item) => sum + item.totalSpent, 0)),
                categories
            });
        } catch (error) {
            return handleExpenseError(res, error);
        }
    }
);

router.get(
    '/',
    validateRequest([
        query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
        query('month').optional().matches(/^\d{4}-\d{2}$/).withMessage('month must use YYYY-MM format.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();

            const page = Number(req.query.page || 1);
            const limit = Number(req.query.limit || 10);
            const skip = (page - 1) * limit;
            const {
                search,
                category,
                paymentMode,
                status,
                month,
                startDate,
                endDate
            } = req.query;

            const filters = [];

            if (search) {
                filters.push({
                    OR: [
                        { title: { contains: String(search), mode: 'insensitive' } },
                        { description: { contains: String(search), mode: 'insensitive' } }
                    ]
                });
            }

            if (category) {
                filters.push({
                    category: {
                        is: {
                            name: {
                                equals: normalizeCategoryName(category),
                                mode: 'insensitive'
                            }
                        }
                    }
                });
            }

            if (paymentMode) {
                filters.push({
                    paymentMode: normalizeExpensePaymentMode(paymentMode)
                });
            }

            if (status) {
                filters.push({
                    status: normalizeExpenseStatus(status)
                });
            }

            if (month) {
                const cycle = parseMonthKey(month);
                filters.push({
                    expenseDate: {
                        gte: cycle.start,
                        lte: cycle.end
                    }
                });
            } else if (startDate || endDate) {
                const dateFilter = {};
                if (startDate) {
                    dateFilter.gte = parseDateInput(startDate, 'startDate');
                }
                if (endDate) {
                    const end = parseDateInput(endDate, 'endDate');
                    end.setUTCHours(23, 59, 59, 999);
                    dateFilter.lte = end;
                }
                filters.push({ expenseDate: dateFilter });
            }

            const where = filters.length > 0 ? { AND: filters } : {};

            const [total, expenses] = await Promise.all([
                prisma.expense.count({ where }),
                prisma.expense.findMany({
                    where,
                    include: { category: true },
                    orderBy: [
                        { expenseDate: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    skip,
                    take: limit
                })
            ]);

            return res.json({
                success: true,
                total,
                pages: Math.ceil(total / limit) || 1,
                currentPage: page,
                expenses: expenses.map(serializeExpense)
            });
        } catch (error) {
            return handleExpenseError(res, error);
        }
    }
);

router.post(
    '/',
    validateRequest([
        body('title').trim().notEmpty().withMessage('title is required.'),
        body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0.'),
        body('category').trim().notEmpty().withMessage('category is required.'),
        body('date').optional().isISO8601().withMessage('date must be a valid ISO date.'),
        body('receiptUrl').optional().isString().withMessage('receiptUrl must be a string.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const {
                title,
                amount,
                category,
                paymentMode,
                date,
                description,
                receiptUrl,
                status
            } = req.body;

            const expense = await prisma.$transaction(async (tx) => {
                const categoryRecord = await upsertExpenseCategory(tx, category);
                const createdExpense = await tx.expense.create({
                    data: {
                        title: String(title).trim(),
                        categoryId: categoryRecord.id,
                        amount: toDecimal(parsePositiveAmount(amount)),
                        expenseDate: parseDateInput(date, 'date'),
                        description: description ? String(description).trim() : null,
                        receiptUrl: receiptUrl ? String(receiptUrl).trim() : null,
                        paymentMode: normalizeExpensePaymentMode(paymentMode),
                        status: normalizeExpenseStatus(status)
                    }
                });

                return fetchExpenseWithCategory(tx, createdExpense.id);
            });

            return res.status(201).json({
                success: true,
                message: 'Expense created successfully',
                expense: serializeExpense(expense)
            });
        } catch (error) {
            return handleExpenseError(res, error);
        }
    }
);

router.put(
    '/:id/pay',
    verifyAdminPassword,
    validateRequest([
        param('id').trim().notEmpty().withMessage('id is required.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const expense = await prisma.expense.update({
                where: { id: req.params.id },
                data: { status: ExpenseStatus.PAID },
                include: { category: true }
            });

            return res.json({
                success: true,
                message: 'Expense marked as Paid',
                expense: serializeExpense(expense)
            });
        } catch (error) {
            return handleExpenseError(res, error);
        }
    }
);

router.put(
    '/:id',
    validateRequest([
        param('id').trim().notEmpty().withMessage('id is required.'),
        body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be greater than 0.'),
        body('date').optional().isISO8601().withMessage('date must be a valid ISO date.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const { id } = req.params;
            const {
                title,
                amount,
                category,
                paymentMode,
                date,
                description,
                receiptUrl,
                status
            } = req.body;

            const expense = await prisma.$transaction(async (tx) => {
                const existingExpense = await tx.expense.findUnique({
                    where: { id }
                });

                if (!existingExpense) {
                    throw createHttpError(404, 'Expense not found.');
                }

                let categoryId = existingExpense.categoryId;
                if (category) {
                    const categoryRecord = await upsertExpenseCategory(tx, category);
                    categoryId = categoryRecord.id;
                }

                await tx.expense.update({
                    where: { id },
                    data: {
                        title: title ? String(title).trim() : existingExpense.title,
                        categoryId,
                        amount: amount !== undefined ? toDecimal(parsePositiveAmount(amount)) : existingExpense.amount,
                        expenseDate: date ? parseDateInput(date, 'date') : existingExpense.expenseDate,
                        description: description !== undefined ? (description ? String(description).trim() : null) : existingExpense.description,
                        receiptUrl: receiptUrl !== undefined ? (receiptUrl ? String(receiptUrl).trim() : null) : existingExpense.receiptUrl,
                        paymentMode: paymentMode ? normalizeExpensePaymentMode(paymentMode) : existingExpense.paymentMode,
                        status: status ? normalizeExpenseStatus(status) : existingExpense.status
                    }
                });

                return fetchExpenseWithCategory(tx, id);
            });

            return res.json({
                success: true,
                message: 'Expense updated successfully',
                expense: serializeExpense(expense)
            });
        } catch (error) {
            return handleExpenseError(res, error);
        }
    }
);

router.delete(
    '/:id',
    verifyAdminPassword,
    validateRequest([
        param('id').trim().notEmpty().withMessage('id is required.')
    ]),
    async (req, res) => {
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            await prisma.expense.delete({
                where: { id: req.params.id }
            });

            return res.json({
                success: true,
                message: 'Expense deleted successfully'
            });
        } catch (error) {
            return handleExpenseError(res, error);
        }
    }
);

module.exports = router;
