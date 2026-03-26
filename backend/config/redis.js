const { createClient } = require('redis');
const logger = require('./logger');

let redisClient = null;
let redisConnectPromise = null;

const memoryStore = new Map();

function cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
        if (entry.expiresAt <= now) {
            memoryStore.delete(key);
        }
    }
}

function setMemoryValue(key, value, ttlSeconds) {
    cleanupMemoryStore();
    memoryStore.set(key, {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000
    });
}

function getMemoryValue(key) {
    cleanupMemoryStore();
    const entry = memoryStore.get(key);
    return entry ? entry.value : null;
}

function deleteMemoryValue(key) {
    memoryStore.delete(key);
}

async function getRedisClient() {
    if (!process.env.REDIS_URL) {
        return null;
    }

    if (redisClient?.isOpen) {
        return redisClient;
    }

    if (!redisClient) {
        redisClient = createClient({
            url: process.env.REDIS_URL
        });

        redisClient.on('error', (error) => {
            logger.error('Redis client error', { error: error.message });
        });
    }

    if (!redisConnectPromise) {
        redisConnectPromise = redisClient.connect()
            .then(() => {
                logger.info('Redis connected');
                return redisClient;
            })
            .catch((error) => {
                logger.warn('Redis connection failed, using in-memory fallback', { error: error.message });
                redisConnectPromise = null;
                return null;
            });
    }

    return redisConnectPromise;
}

async function setCacheValue(key, value, ttlSeconds) {
    const client = await getRedisClient();
    if (client?.isOpen) {
        await client.set(key, value, { EX: ttlSeconds });
        return;
    }

    setMemoryValue(key, value, ttlSeconds);
}

async function getCacheValue(key) {
    const client = await getRedisClient();
    if (client?.isOpen) {
        return client.get(key);
    }

    return getMemoryValue(key);
}

async function deleteCacheValue(key) {
    const client = await getRedisClient();
    if (client?.isOpen) {
        await client.del(key);
        return;
    }

    deleteMemoryValue(key);
}

module.exports = {
    getRedisClient,
    setCacheValue,
    getCacheValue,
    deleteCacheValue
};
