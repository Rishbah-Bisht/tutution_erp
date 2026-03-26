const ADMIN_ROLES = {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin'
};

const normalizeAdminRole = (role) => {
    return role === ADMIN_ROLES.ADMIN ? ADMIN_ROLES.ADMIN : ADMIN_ROLES.SUPERADMIN;
};

module.exports = {
    ADMIN_ROLES,
    normalizeAdminRole
};
