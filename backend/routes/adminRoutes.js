const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const adminController = require('../controllers/adminController');
const upload = require('../middleware/upload');

const auth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: 'No token provided' });
    try {
        const token = header.split(' ')[1];
        req.admin = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};

router.get('/check-admin', adminController.checkAdmin);
router.post('/signup', upload.single('instituteLogo'), adminController.signup);
router.post('/login', adminController.login);
router.get('/profile', auth, adminController.getProfile);
router.put('/profile', auth, upload.single('instituteLogo'), adminController.updateProfile);
router.put('/settings', auth, adminController.updateSettings);

module.exports = router;
