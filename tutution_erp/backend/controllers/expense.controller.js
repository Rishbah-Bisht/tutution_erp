const Expense = require('../models/Expense');

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Private (Admin/Accountant)
exports.createExpense = async (req, res) => {
    try {
        const { title, amount, category, paymentMode, date, description, status } = req.body;

        // Handle optional receipt upload logic here if integrating with Cloudinary/multer in the future.
        // For now, we'll accept a receiptUrl string from the frontend if pre-uploaded.
        const receiptUrl = req.body.receiptUrl || '';

        const expense = new Expense({
            title,
            amount: Number(amount),
            category,
            paymentMode,
            date: date ? new Date(date) : Date.now(),
            description,
            receiptUrl,
            status: status || 'Paid'
        });

        await expense.save();

        res.status(201).json({
            success: true,
            message: 'Expense created successfully',
            expense
        });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get all expenses with pagination and filtering
// @route   GET /api/expenses
// @access  Private
exports.getExpenses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { search, category, paymentMode, startDate, endDate, status } = req.query;
        let query = {};

        // Keyword Search (Title or Description)
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Filters
        if (category) query.category = category;
        if (paymentMode) query.paymentMode = paymentMode;
        if (status) query.status = status;

        // Date Range Filter
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.date.$lte = end;
            }
        }

        const total = await Expense.countDocuments(query);
        const expenses = await Expense.find(query)
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            success: true,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page,
            expenses
        });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update an expense
// @route   PUT /api/expenses/:id
// @access  Private
exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (updates.amount) updates.amount = Number(updates.amount);
        if (updates.date) updates.date = new Date(updates.date);

        const expense = await Expense.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        res.json({
            success: true,
            message: 'Expense updated successfully',
            expense
        });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private (Admin only)
exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        const expense = await Expense.findByIdAndDelete(id);

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        res.json({
            success: true,
            message: 'Expense deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Mark an expense as paid
// @route   PUT /api/expenses/:id/pay
// @access  Private
exports.markExpensePaid = async (req, res) => {
    try {
        const { id } = req.params;
        const expense = await Expense.findByIdAndUpdate(id, { status: 'Paid' }, { new: true });

        if (!expense) {
            return res.status(404).json({ success: false, message: 'Expense not found' });
        }

        res.json({
            success: true,
            message: 'Expense marked as Paid',
            expense
        });
    } catch (error) {
        console.error('Error marking expense as paid:', error);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Get expense dashboard metrics
// @route   GET /api/expenses/metrics
// @access  Private
exports.getExpenseMetrics = async (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Calculate Total Overall Expenses
        const totalOverallResult = await Expense.aggregate([
            { $match: { status: 'Paid' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalOverall = totalOverallResult.length > 0 ? totalOverallResult[0].total : 0;

        // Calculate This Month's Expenses
        const thisMonthResult = await Expense.aggregate([
            { $match: { status: 'Paid', date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const thisMonthTotal = thisMonthResult.length > 0 ? thisMonthResult[0].total : 0;

        // Calculate Category-wise Breakdown for the current month
        const categoryBreakdown = await Expense.aggregate([
            { $match: { status: 'Paid', date: { $gte: startOfMonth } } },
            { $group: { _id: '$category', total: { $sum: '$amount' } } },
            { $sort: { total: -1 } }
        ]);

        // Calculate To Be Paid (Pending Expenses)
        const pendingResult = await Expense.aggregate([
            { $match: { status: 'Pending' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const pendingTotal = pendingResult.length > 0 ? pendingResult[0].total : 0;

        res.json({
            success: true,
            metrics: {
                totalOverall,
                thisMonthTotal,
                pendingTotal,
                categoryBreakdown: categoryBreakdown.map(c => ({ category: c._id, amount: c.total }))
            }
        });
    } catch (error) {
        console.error('Error fetching expense metrics:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};
