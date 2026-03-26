const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { JWT_SECRET, extractAuthToken } = require('../utils/authTokens');
const { ADMIN_ROLES, normalizeAdminRole } = require('../utils/adminRoles');

exports.JWT_SECRET = JWT_SECRET;

const verifyRoleToken = (req, res, next, expectedRole) => {
    const token = extractAuthToken(req, expectedRole);
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (payload.role !== expectedRole) {
            return res.status(403).json({ message: 'Access denied: wrong role' });
        }

        req.userId = payload.id;
        req.role = payload.role;
        if (expectedRole === 'admin') {
            req.admin = payload;
            req.adminRole = normalizeAdminRole(payload.adminRole);
        }
        return next();
    } catch (_error) {
        return res.status(401).json({ message: 'Token invalid or expired' });
    }
};

const verifyAdmin = (req, res, next) => verifyRoleToken(req, res, next, 'admin');

exports.verifyAdmin = verifyAdmin;
exports.adminAuth = verifyAdmin;

function makeVerify(expectedRole) {
    return (req, res, next) => verifyRoleToken(req, res, next, expectedRole);
}

exports.verifyStudent = makeVerify('student');
exports.verifyTeacher = makeVerify('teacher');

exports.requireSuperAdmin = async (req, res, next) => {
    try {
        const adminId = req.userId || req.admin?.id;
        if (!adminId) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const admin = await Admin.findById(adminId).select('role');
        if (!admin) {
            return res.status(401).json({ message: 'Admin not found' });
        }

        const normalizedRole = normalizeAdminRole(admin.role);
        req.adminRole = normalizedRole;

        if (normalizedRole !== ADMIN_ROLES.SUPERADMIN) {
            return res.status(403).json({ message: 'Superadmin access required' });
        }

        return next();
    } catch (error) {
        return res.status(500).json({ message: 'Failed to verify admin role', error: error.message });
    }
};

exports.verifyAdminOrTeacher = (req, res, next) => {
    const teacherToken = extractAuthToken(req, 'teacher');
    if (teacherToken) {
        try {
            const payload = jwt.verify(teacherToken, JWT_SECRET);
            if (payload.role === 'teacher') {
                req.userId = payload.id;
                req.role = payload.role;
                return next();
            }
        } catch (_error) {
            // Fall through to admin token check.
        }
    }

    const adminToken = extractAuthToken(req, 'admin');
    if (!adminToken) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const payload = jwt.verify(adminToken, JWT_SECRET);
        if (payload.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied: wrong role' });
        }

        req.admin = payload;
        req.userId = payload.id;
        req.role = payload.role;
        req.adminRole = normalizeAdminRole(payload.adminRole);
        return next();
    } catch (_error) {
        return res.status(401).json({ message: 'Token invalid or expired' });
    }
};
