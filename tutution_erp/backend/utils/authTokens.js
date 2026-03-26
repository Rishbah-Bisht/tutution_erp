const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_for_erp_app';
const COOKIE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const COOKIE_NAMES = {
    admin: 'erp_admin_token',
    teacher: 'erp_teacher_token',
    student: 'erp_student_token'
};

const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE_MS
    };
};

const parseCookies = (cookieHeader = '') => {
    return cookieHeader
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
        .reduce((cookies, part) => {
            const separatorIndex = part.indexOf('=');
            if (separatorIndex === -1) return cookies;

            const name = part.slice(0, separatorIndex).trim();
            const value = part.slice(separatorIndex + 1).trim();

            if (name) {
                cookies[name] = decodeURIComponent(value);
            }

            return cookies;
        }, {});
};

const getCookieNameForRole = (role) => COOKIE_NAMES[role] || 'erp_auth_token';

const extractAuthToken = (req, roleOrCookieName) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }

    const cookies = parseCookies(req.headers.cookie || '');
    const cookieName = roleOrCookieName && roleOrCookieName.includes('token')
        ? roleOrCookieName
        : getCookieNameForRole(roleOrCookieName);

    return cookies[cookieName] || null;
};

const signAuthToken = (payload, expiresIn = '2h') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

const setAuthCookie = (res, role, token) => {
    res.cookie(getCookieNameForRole(role), token, getCookieOptions());
};

const clearAuthCookie = (res, role) => {
    res.clearCookie(getCookieNameForRole(role), getCookieOptions());
};

module.exports = {
    JWT_SECRET,
    COOKIE_NAMES,
    extractAuthToken,
    signAuthToken,
    setAuthCookie,
    clearAuthCookie,
    parseCookies,
    getCookieNameForRole
};
