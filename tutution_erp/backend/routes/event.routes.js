const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/event.controller');
const verifyPwd = require('../middleware/verifyAdminPassword');
const { verifyAdmin } = require('../middleware/auth.middleware');

router.post('/exams', verifyAdmin, verifyPwd, ctrl.createExam);
router.post('/holidays', verifyAdmin, verifyPwd, ctrl.announceHoliday);
router.post('/results-notify', verifyAdmin, verifyPwd, ctrl.notifyResults);

module.exports = router;
