const { createClient } = require('redis');

let redisClient = null;
let connectPromise = null;
let warnedMissingUrl = false;

const getRedisClient = async () => {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
        if (!warnedMissingUrl) {
            warnedMissingUrl = true;
            console.warn('[Redis] REDIS_URL is not configured. Falling back to in-memory login throttling.');
        }
        return null;
    }

    if (redisClient?.isOpen) {
        return redisClient;
    }

    if (!redisClient) {
        redisClient = createClient({ url: redisUrl });
        redisClient.on('error', (error) => {
            console.error('[Redis] Client error:', error.message);
        });
    }

    if (!connectPromise) {
        connectPromise = redisClient.connect()
            .then(() => redisClient)
            .catch((error) => {
                console.error('[Redis] Connection failed:', error.message);
                connectPromise = null;
                redisClient = null;
                return null;
            });
    }

    return connectPromise;
};

module.exports = {
    getRedisClient
};
