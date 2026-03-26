const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');
const { verifyAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');

router.use(verifyAdmin);

// Metrics endpoint (must be defined before /:id to avoid mapping conflict)
router.get('/metrics', expenseController.getExpenseMetrics);

router.route('/')
    .get(expenseController.getExpenses)
    .post(expenseController.createExpense);

router.route('/:id')
    .put(verifyAdminPassword, expenseController.updateExpense) // Require admin password for updates
    .delete(requireSuperAdmin, verifyAdminPassword, expenseController.deleteExpense); // Require superadmin + password for deletes

router.put('/:id/pay', verifyAdminPassword, expenseController.markExpensePaid);

module.exports = router;
