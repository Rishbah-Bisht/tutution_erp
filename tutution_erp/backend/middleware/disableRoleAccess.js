const { clearAuthCookie } = require('../utils/authTokens');

const createRoleAccessDisabled = (role, label) => {
    return (_req, res, _next) => {
        clearAuthCookie(res, role);
        return res.status(403).json({
            message: `${label} access is disabled. Only admin login is allowed.`
        });
    };
};

module.exports = {
    disableStudentAccess: createRoleAccessDisabled('student', 'Student portal'),
    disableTeacherAccess: createRoleAccessDisabled('teacher', 'Teacher portal')
};
