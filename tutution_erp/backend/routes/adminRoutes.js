const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const upload = require('../middleware/upload');
const { verifyAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');
const { checkAdminLoginRateLimit } = require('../middleware/adminLoginRateLimit');

router.get('/check-admin', adminController.checkAdmin);
router.post('/signup', upload.single('instituteLogo'), adminController.signup);
router.post('/login', checkAdminLoginRateLimit, adminController.login);
router.post('/logout', adminController.logout);
router.get('/profile', verifyAdmin, adminController.getProfile);
router.put('/profile', verifyAdmin, upload.single('instituteLogo'), adminController.updateProfile);
router.put('/settings', verifyAdmin, adminController.updateSettings);

router.post('/wipe-database', verifyAdmin, requireSuperAdmin, adminController.wipeDatabase);

module.exports = router;
