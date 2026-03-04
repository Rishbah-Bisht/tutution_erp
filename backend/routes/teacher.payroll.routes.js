const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/teacher.payroll.controller');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
// assuming standard admin portal check

// 1. Dash & Profiles
router.get('/dashboard', payrollController.getPayrollDashboardStats);
router.get('/profile/:teacherId', payrollController.getSalaryProfile);
router.post('/profile/:teacherId', payrollController.upsertSalaryProfile);

// 2. Extra Classes & Leaves
router.post('/log-extra-class', payrollController.logExtraClass);
router.post('/log-leave', payrollController.logLeave);
router.post('/log-bonus', payrollController.logBonus);

// 3. Salary Generator & Fetch
router.post('/generate', payrollController.generateMonthlySalaries);
router.get('/salaries', payrollController.getAllSalaries);

// 4. Payments
router.post('/pay/:salaryRecordId', verifyAdminPassword, payrollController.markSalaryPaid);

// 5. Bulk Operations
router.post('/bulk-generate', verifyAdminPassword, payrollController.bulkGenerateSalaries);

module.exports = router;
