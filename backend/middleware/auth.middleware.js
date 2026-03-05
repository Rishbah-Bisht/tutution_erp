const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'supersecretkey_for_erp_app';

// Export the secret so controllers can use the SAME key for signing
exports.JWT_SECRET = SECRET;

exports.adminAuth = (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });
    try {
        const token = auth.split(' ')[1];
        req.admin = jwt.verify(token, SECRET);
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};

/**
 * Middleware factory — verifies JWT and checks the embedded role.
 * Attaches req.userId and req.role on success.
 */
function makeVerify(expectedRole) {
    return (req, res, next) => {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer '))
            return res.status(401).json({ message: 'No token provided' });

        const token = auth.slice(7);
        try {
            const payload = jwt.verify(token, SECRET);
            if (payload.role !== expectedRole)
                return res.status(403).json({ message: 'Access denied: wrong role' });
            req.userId = payload.id;
            req.role = payload.role;
            next();
        } catch (e) {
            return res.status(401).json({ message: 'Token invalid or expired' });
        }
    };
}

exports.verifyStudent = makeVerify('student');
exports.verifyTeacher = makeVerify('teacher');
