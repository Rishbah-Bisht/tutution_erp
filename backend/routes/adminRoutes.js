const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const adminController = require('../controllers/adminController');
const upload = require('../middleware/upload');

const { adminAuth } = require('../middleware/auth.middleware');

router.get('/check-admin', adminController.checkAdmin);
router.post('/signup', upload.single('instituteLogo'), adminController.signup);
router.post('/login', adminController.login);
router.get('/profile', adminAuth, adminController.getProfile);
router.put('/profile', adminAuth, upload.single('instituteLogo'), adminController.updateProfile);
router.put('/settings', adminAuth, adminController.updateSettings);

module.exports = router;
