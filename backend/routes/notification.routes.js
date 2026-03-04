const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notification.controller');
const verifyPwd = require('../middleware/verifyAdminPassword');

router.get('/history', ctrl.getHistory);
router.post('/custom', verifyPwd, ctrl.sendCustomNotification);

module.exports = router;
