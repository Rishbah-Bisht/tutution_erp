const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

module.exports = async (req, res, next) => {
    const { adminPassword } = req.body;
    if (!adminPassword)
        return res.status(400).json({ message: 'Admin password is required for this action' });
    try {
        const adminId = req.userId || req.admin?.id;
        if (!adminId) return res.status(401).json({ message: 'Admin authentication is required' });

        const admin = await Admin.findById(adminId).select('password');
        if (!admin) return res.status(404).json({ message: 'Admin account not found' });

        const valid = await bcrypt.compare(adminPassword, admin.password);
        if (!valid) return res.status(401).json({ message: 'Incorrect admin password' });

        next();
    } catch (err) {
        res.status(500).json({ message: 'Password verification failed', error: err.message });
    }
};
