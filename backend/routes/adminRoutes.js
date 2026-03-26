const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const adminController = require('../controllers/adminController');
const upload = require('../middleware/upload');

const { adminAuth } = require('../middleware/auth.middleware');

router.get('/check-admin', adminController.checkAdmin);
router.post('/signup', upload.single('instituteLogo'), adminController.signup);
router.get('/signup', (req, res) => {
	res.status(405).json({ message: 'Method not allowed. Use POST /api/admin/signup.' });
});
router.post('/login', adminController.login);
router.get('/profile', adminAuth, adminController.getProfile);
router.put('/profile', adminAuth, upload.single('instituteLogo'), adminController.updateProfile);
router.put('/settings', adminAuth, adminController.updateSettings);

router.post('/wipe-database', adminAuth, adminController.wipeDatabase);

module.exports = router;
