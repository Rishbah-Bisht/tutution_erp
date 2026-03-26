const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/teacher.payroll.controller');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const { verifyAdmin } = require('../middleware/auth.middleware');
// assuming standard admin portal check

// 1. Dash & Profiles
router.get('/dashboard', verifyAdmin, payrollController.getPayrollDashboardStats);
router.get('/profile/:teacherId', verifyAdmin, payrollController.getSalaryProfile);
router.post('/profile/:teacherId', verifyAdmin, payrollController.upsertSalaryProfile);

// 2. Extra classes/leaves removed
router.post('/log-bonus', verifyAdmin, payrollController.logBonus);

// 3. Salary Generator & Fetch
router.post('/generate', verifyAdmin, payrollController.generateMonthlySalaries);
router.get('/salaries', verifyAdmin, payrollController.getAllSalaries);

// 4. Payments
router.post('/pay/:salaryRecordId', verifyAdmin, verifyAdminPassword, payrollController.markSalaryPaid);

// 5. Bulk Operations
router.post('/bulk-generate', verifyAdmin, verifyAdminPassword, payrollController.bulkGenerateSalaries);

module.exports = router;
