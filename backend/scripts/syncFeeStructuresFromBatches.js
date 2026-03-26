const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const Batch = require('../models/Batch');
const Student = require('../models/Student');

function getMonthStart(dateValue) {
    const date = new Date(dateValue || new Date());
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function toDecimalValue(value) {
    return Number(Number(value || 0).toFixed(2)).toFixed(2);
}

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is required.');
    }

    if (!process.env.POSTGRES_DATABASE_URL) {
        throw new Error('POSTGRES_DATABASE_URL is required.');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const adapter = new PrismaPg({
        connectionString: process.env.POSTGRES_DATABASE_URL
    });
    const prisma = new PrismaClient({ adapter, errorFormat: 'minimal' });

    try {
        await prisma.$connect();

        const batches = await Batch.find({ isActive: true }, '_id name fees startDate')
            .sort({ createdAt: 1 })
            .lean();

        if (!batches.length) {
            console.log('No active Mongo batches found.');
            return;
        }

        for (const batch of batches) {
            const monthlyFee = Number(batch.fees || 0);

            if (!Number.isFinite(monthlyFee) || monthlyFee <= 0) {
                console.log(`Skipped ${batch.name} (${batch._id}) because batch.fees is empty or zero.`);
                continue;
            }

            const earliestStudent = await Student.findOne({
                batchId: batch._id,
                status: 'active'
            }, 'admissionDate joinedAt')
                .sort({ admissionDate: 1, joinedAt: 1, createdAt: 1 })
                .lean();

            const effectiveFrom = getMonthStart(
                earliestStudent?.admissionDate
                || earliestStudent?.joinedAt
                || batch.startDate
                || new Date()
            );

            const upserted = await prisma.feeStructure.upsert({
                where: {
                    batchId_effectiveFrom: {
                        batchId: String(batch._id),
                        effectiveFrom
                    }
                },
                update: {
                    monthlyFee: toDecimalValue(monthlyFee),
                    isActive: true
                },
                create: {
                    batchId: String(batch._id),
                    monthlyFee: toDecimalValue(monthlyFee),
                    dueDay: 10,
                    currency: 'INR',
                    effectiveFrom,
                    isActive: true,
                    notes: `Synced from Mongo batch "${batch.name}" on ${new Date().toISOString()}`
                }
            });

            console.log(
                `Synced FeeStructure for ${batch.name} (${batch._id}) -> monthlyFee=${monthlyFee}, effectiveFrom=${effectiveFrom.toISOString().slice(0, 10)}, id=${upserted.id}`
            );
        }
    } finally {
        await prisma.$disconnect().catch(() => {});
        await mongoose.disconnect().catch(() => {});
    }
}

main().catch((error) => {
    console.error(error && error.stack || error);
    process.exit(1);
});
