const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { loadBackendEnv } = require('./env');

const globalForPrisma = globalThis;

let prisma = globalForPrisma.__erpPrisma || null;
let connectPromise = null;

function getPrismaClient() {
    loadBackendEnv();

    if (prisma) {
        return prisma;
    }

    if (!process.env.POSTGRES_DATABASE_URL) {
        const error = new Error('POSTGRES_DATABASE_URL is not configured. Prisma PostgreSQL modules are unavailable.');
        error.status = 503;
        throw error;
    }

    const adapter = new PrismaPg({
        connectionString: process.env.POSTGRES_DATABASE_URL
    });

    prisma = new PrismaClient({
        adapter,
        errorFormat: 'minimal',
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });

    if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.__erpPrisma = prisma;
    }

    return prisma;
}

async function connectPostgres() {
    const client = getPrismaClient();

    if (!connectPromise) {
        connectPromise = client.$connect()
            .then(() => {
                console.log('[Postgres] Prisma connected successfully');
                return client;
            })
            .catch((error) => {
                connectPromise = null;
                throw error;
            });
    }

    return connectPromise;
}

module.exports = {
    getPrismaClient,
    connectPostgres
};
