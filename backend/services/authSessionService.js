const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { requireEnv } = require('../config/env');
const { setCacheValue, getCacheValue, deleteCacheValue } = require('../config/redis');

const ACCESS_TOKEN_SECRET = requireEnv('JWT_SECRET');
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || requireEnv('JWT_SECRET');
const ACCESS_COOKIE_NAME = process.env.ACCESS_COOKIE_NAME || 'erp_access';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'erp_refresh';
const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 15 * 60);
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 7 * 24 * 60 * 60);

function getCookieSameSite() {
    if (process.env.COOKIE_SAME_SITE) {
        return process.env.COOKIE_SAME_SITE;
    }

    return process.env.NODE_ENV === 'production' ? 'none' : 'lax';
}

function getCookieBaseOptions(maxAgeMs) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: getCookieSameSite(),
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/',
        maxAge: maxAgeMs
    };
}

function getBlacklistKey(jti) {
    return `auth:blacklist:${jti}`;
}

function getRefreshSessionKey(sessionId) {
    return `auth:refresh:${sessionId}`;
}

function randomTokenId() {
    return crypto.randomUUID();
}

function signAccessToken({ id, role, sessionId }) {
    return jwt.sign(
        {
            id,
            role,
            sessionId,
            tokenType: 'access',
            jti: randomTokenId()
        },
        ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
    );
}

function signRefreshToken({ id, role, sessionId }) {
    return jwt.sign(
        {
            id,
            role,
            sessionId,
            tokenType: 'refresh',
            jti: randomTokenId()
        },
        REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_TTL_SECONDS }
    );
}

function decodeToken(token, tokenType = 'access') {
    const secret = tokenType === 'refresh' ? REFRESH_TOKEN_SECRET : ACCESS_TOKEN_SECRET;
    return jwt.verify(token, secret);
}

async function persistRefreshSession(payload, ttlSeconds = REFRESH_TOKEN_TTL_SECONDS) {
    const value = JSON.stringify({
        id: payload.id,
        role: payload.role,
        sessionId: payload.sessionId,
        jti: payload.jti
    });

    await setCacheValue(getRefreshSessionKey(payload.sessionId), value, ttlSeconds);
}

async function getStoredRefreshSession(sessionId) {
    const raw = await getCacheValue(getRefreshSessionKey(sessionId));
    return raw ? JSON.parse(raw) : null;
}

async function deleteStoredRefreshSession(sessionId) {
    await deleteCacheValue(getRefreshSessionKey(sessionId));
}

async function blacklistTokenPayload(payload) {
    if (!payload?.jti || !payload?.exp) {
        return;
    }

    const ttlSeconds = Math.max(payload.exp - Math.floor(Date.now() / 1000), 1);
    await setCacheValue(getBlacklistKey(payload.jti), '1', ttlSeconds);
}

async function isBlacklisted(payload) {
    if (!payload?.jti) {
        return false;
    }

    const value = await getCacheValue(getBlacklistKey(payload.jti));
    return value === '1';
}

function createSessionBundle({ id, role }) {
    const sessionId = randomTokenId();
    const accessToken = signAccessToken({ id, role, sessionId });
    const refreshToken = signRefreshToken({ id, role, sessionId });
    const accessPayload = decodeToken(accessToken);
    const refreshPayload = decodeToken(refreshToken, 'refresh');

    return {
        sessionId,
        accessToken,
        refreshToken,
        accessPayload,
        refreshPayload
    };
}

async function issueSession(res, { id, role }) {
    const bundle = createSessionBundle({ id, role });
    await persistRefreshSession(bundle.refreshPayload);

    res.cookie(
        ACCESS_COOKIE_NAME,
        bundle.accessToken,
        getCookieBaseOptions(ACCESS_TOKEN_TTL_SECONDS * 1000)
    );
    res.cookie(
        REFRESH_COOKIE_NAME,
        bundle.refreshToken,
        getCookieBaseOptions(REFRESH_TOKEN_TTL_SECONDS * 1000)
    );

    return bundle;
}

function clearSessionCookies(res) {
    res.clearCookie(ACCESS_COOKIE_NAME, { ...getCookieBaseOptions(0), maxAge: undefined });
    res.clearCookie(REFRESH_COOKIE_NAME, { ...getCookieBaseOptions(0), maxAge: undefined });
}

function getAccessTokenFromRequest(req) {
    const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME];
    if (cookieToken) {
        return cookieToken;
    }

    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
        return auth.slice(7);
    }

    return null;
}

function getRefreshTokenFromRequest(req) {
    return req.cookies?.[REFRESH_COOKIE_NAME] || null;
}

async function rotateRefreshSession(res, refreshToken) {
    const payload = decodeToken(refreshToken, 'refresh');

    if (await isBlacklisted(payload)) {
        const error = new Error('Refresh token has been revoked.');
        error.status = 401;
        throw error;
    }

    const stored = await getStoredRefreshSession(payload.sessionId);
    if (!stored || stored.jti !== payload.jti || stored.id !== payload.id || stored.role !== payload.role) {
        const error = new Error('Refresh token is no longer active.');
        error.status = 401;
        throw error;
    }

    await blacklistTokenPayload(payload);
    await deleteStoredRefreshSession(payload.sessionId);

    return issueSession(res, {
        id: payload.id,
        role: payload.role
    });
}

async function revokeRequestSession(req, res) {
    const accessToken = getAccessTokenFromRequest(req);
    const refreshToken = getRefreshTokenFromRequest(req);

    try {
        if (accessToken) {
            const accessPayload = decodeToken(accessToken);
            await blacklistTokenPayload(accessPayload);
        }
    } catch {}

    try {
        if (refreshToken) {
            const refreshPayload = decodeToken(refreshToken, 'refresh');
            await blacklistTokenPayload(refreshPayload);
            await deleteStoredRefreshSession(refreshPayload.sessionId);
        }
    } catch {}

    clearSessionCookies(res);
}

module.exports = {
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    ACCESS_TOKEN_TTL_SECONDS,
    REFRESH_TOKEN_TTL_SECONDS,
    issueSession,
    clearSessionCookies,
    getAccessTokenFromRequest,
    getRefreshTokenFromRequest,
    decodeToken,
    isBlacklisted,
    rotateRefreshSession,
    revokeRequestSession
};
