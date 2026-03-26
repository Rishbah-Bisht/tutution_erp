const { getRedisClient } = require('../config/redis');

const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const memoryStore = new Map();

const buildRateLimitKey = (req) => {
    const identifier = String(req.body?.identifier || 'unknown').trim().toLowerCase();
    const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ip = forwardedFor || req.ip || 'unknown';

    return `auth:admin:login:${ip}:${identifier || 'unknown'}`;
};

const getMemoryState = (key) => {
    const now = Date.now();
    const entry = memoryStore.get(key);

    if (!entry || entry.expiresAt <= now) {
        memoryStore.delete(key);
        return { count: 0, ttlMs: 0 };
    }

    return {
        count: entry.count,
        ttlMs: Math.max(entry.expiresAt - now, 0)
    };
};

const incrementMemoryFailure = (key) => {
    const now = Date.now();
    const current = getMemoryState(key);
    const nextCount = current.count + 1;

    memoryStore.set(key, {
        count: nextCount,
        expiresAt: now + LOGIN_WINDOW_MS
    });

    return nextCount;
};

const clearMemoryFailures = (key) => {
    memoryStore.delete(key);
};

const getAttemptState = async (key) => {
    const redis = await getRedisClient();
    if (redis) {
        try {
            const [rawCount, rawTtl] = await Promise.all([
                redis.get(key),
                redis.pTTL(key)
            ]);

            return {
                count: Number(rawCount || 0),
                ttlMs: rawTtl > 0 ? rawTtl : 0
            };
        } catch (error) {
            console.error('[AdminLoginRateLimit] Redis read failed:', error.message);
        }
    }

    return getMemoryState(key);
};

const recordAdminLoginFailure = async (key) => {
    const redis = await getRedisClient();
    if (redis) {
        try {
            const attempts = await redis.incr(key);
            if (attempts === 1) {
                await redis.pExpire(key, LOGIN_WINDOW_MS);
            }
            return attempts;
        } catch (error) {
            console.error('[AdminLoginRateLimit] Redis increment failed:', error.message);
        }
    }

    return incrementMemoryFailure(key);
};

const clearAdminLoginFailures = async (key) => {
    const redis = await getRedisClient();
    if (redis) {
        try {
            await redis.del(key);
            return;
        } catch (error) {
            console.error('[AdminLoginRateLimit] Redis clear failed:', error.message);
        }
    }

    clearMemoryFailures(key);
};

const checkAdminLoginRateLimit = async (req, res, next) => {
    const key = buildRateLimitKey(req);
    req.adminLoginRateLimitKey = key;

    const { count, ttlMs } = await getAttemptState(key);
    if (count >= MAX_LOGIN_ATTEMPTS) {
        const retryAfterSeconds = Math.ceil((ttlMs || LOGIN_WINDOW_MS) / 1000);
        res.set('Retry-After', String(retryAfterSeconds));
        return res.status(429).json({
            message: 'Too many login attempts. Please try again after 15 minutes.',
            retryAfterSeconds
        });
    }

    return next();
};

module.exports = {
    checkAdminLoginRateLimit,
    recordAdminLoginFailure,
    clearAdminLoginFailures,
    MAX_LOGIN_ATTEMPTS,
    LOGIN_WINDOW_MS
};
