const rateLimit = require('express-rate-limit');

function createRetryAfterHandler(message) {
    return (req, res) => {
        const retryAfterMs = req.rateLimit?.resetTime
            ? Math.max(req.rateLimit.resetTime.getTime() - Date.now(), 0)
            : 15 * 60 * 1000;

        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
        res.set('Retry-After', String(retryAfterSeconds));

        return res.status(429).json({
            message,
            retryAfter: retryAfterSeconds
        });
    };
}

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 500),
    standardHeaders: true,
    legacyHeaders: false,
    handler: createRetryAfterHandler('Too many requests from this IP, please try again later.')
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 10),
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: createRetryAfterHandler('Too many authentication attempts from this IP, please wait before retrying.')
});

module.exports = {
    globalLimiter,
    authLimiter
};
