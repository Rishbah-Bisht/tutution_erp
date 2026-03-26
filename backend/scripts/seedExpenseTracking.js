const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectPostgres, getPrismaClient } = require('../config/postgres');
const { normalizeCategoryName } = require('../services/prismaExpenseService');

const DEFAULT_CATEGORY_BUDGETS = [
    { name: 'Rent', amount: 45000, description: 'Building rent and lease payments' },
    { name: 'Utilities', amount: 12000, description: 'Electricity, internet, water, and other utilities' },
    { name: 'Stationery', amount: 6000, description: 'Printed material and stationery purchases' },
    { name: 'Salaries', amount: 180000, description: 'Faculty and staff payroll-related expenses' },
    { name: 'Maintenance', amount: 15000, description: 'Repairs and routine maintenance' },
    { name: 'Marketing', amount: 10000, description: 'Promotions, campaigns, and outreach' },
    { name: 'Supplies', amount: 8000, description: 'Classroom, lab, and operational supplies' },
    { name: 'Other', amount: 5000, description: 'Miscellaneous uncategorized expenses' }
];

function getCliMonth() {
    const monthArg = process.argv.find((argument) => argument.startsWith('--month='));
    if (!monthArg) {
        const now = new Date();
        return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    }

    const month = monthArg.split('=')[1];
    if (!/^\d{4}-\d{2}$/.test(month || '')) {
        throw new Error('Invalid --month value. Use YYYY-MM format.');
    }

    return month;
}

function slugifyCategoryName(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'other';
}

async function main() {
    if (!process.env.POSTGRES_DATABASE_URL) {
        throw new Error('POSTGRES_DATABASE_URL is required.');
    }

    const budgetMonth = getCliMonth();

    await connectPostgres();
    const prisma = getPrismaClient();

    try {
        for (const item of DEFAULT_CATEGORY_BUDGETS) {
            const name = normalizeCategoryName(item.name);
            const slug = slugifyCategoryName(name);

            const category = await prisma.expenseCategory.upsert({
                where: { slug },
                update: {
                    name,
                    description: item.description,
                    isActive: true
                },
                create: {
                    name,
                    slug,
                    description: item.description,
                    isActive: true
                }
            });

            const budget = await prisma.expenseBudget.upsert({
                where: {
                    categoryId_budgetMonth: {
                        categoryId: category.id,
                        budgetMonth
                    }
                },
                update: {
                    amount: item.amount.toFixed(2),
                    notes: `Seeded default budget for ${budgetMonth}`
                },
                create: {
                    categoryId: category.id,
                    budgetMonth,
                    amount: item.amount.toFixed(2),
                    notes: `Seeded default budget for ${budgetMonth}`
                }
            });

            console.log(
                `Seeded ${category.name} -> budget ${budget.amount} for ${budgetMonth}`
            );
        }

        console.log(`Expense categories and budgets seeded for ${budgetMonth}.`);
    } finally {
        await prisma.$disconnect().catch(() => {});
    }
}

main().catch((error) => {
    console.error(error && error.stack || error);
    process.exit(1);
});
