const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { connectPostgres, getPrismaClient } = require('../config/postgres');
const { syncPayrollExpenseRecord } = require('../services/prismaExpenseService');

async function main() {
    if (!process.env.POSTGRES_DATABASE_URL) {
        throw new Error('POSTGRES_DATABASE_URL is required.');
    }

    await connectPostgres();
    const prisma = getPrismaClient();

    try {
        const payrollRecords = await prisma.payrollRecord.findMany({
            where: {
                paidAmount: {
                    gt: '0'
                }
            },
            orderBy: [
                { payrollMonth: 'asc' },
                { createdAt: 'asc' }
            ]
        });

        for (const record of payrollRecords) {
            await prisma.$transaction(async (tx) => {
                await syncPayrollExpenseRecord(tx, record);
            });

            console.log(
                `Synced salary expense for payroll ${record.id} (${record.teacherNameSnapshot || record.teacherId} / ${record.payrollMonth})`
            );
        }

        console.log(`Payroll expense sync completed for ${payrollRecords.length} paid payroll record(s).`);
    } finally {
        await prisma.$disconnect().catch(() => {});
    }
}

main().catch((error) => {
    console.error(error && error.stack || error);
    process.exit(1);
});
