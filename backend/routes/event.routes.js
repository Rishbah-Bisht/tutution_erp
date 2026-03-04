const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/event.controller');
const verifyPwd = require('../middleware/verifyAdminPassword');

router.post('/exams', verifyPwd, ctrl.createExam);
router.post('/holidays', verifyPwd, ctrl.announceHoliday);
router.post('/results-notify', verifyPwd, ctrl.notifyResults);

module.exports = router;
