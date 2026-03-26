const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fee.controller');
const { verifyAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');
const verifyPwd = require('../middleware/verifyAdminPassword');

// Basic RBAC checking applied to sensitive module
router.use(verifyAdmin);

router.get('/', ctrl.getAllFees);
router.get('/metrics', ctrl.getMetrics);
router.post('/', verifyPwd, ctrl.createFee);
router.post('/generate', verifyPwd, ctrl.generateFees);
router.post('/:id/pay', verifyPwd, ctrl.capturePayment);
router.post('/:id/expense', ctrl.addOtherExpense);
router.post('/bulk-surcharge', verifyPwd, ctrl.addBulkSurcharge);
router.post('/remind-overdue', verifyPwd, ctrl.sendOverdueReminders);
router.delete('/:id', requireSuperAdmin, verifyPwd, ctrl.deleteFee);

module.exports = router;
