const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Expense title is required'],
        trim: true
    },
    amount: {
        type: Number,
        required: [true, 'Expense amount is required'],
        min: [0, 'Amount cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Rent', 'Salary', 'Electricity', 'Maintenance', 'Marketing', 'Supplies', 'Other'],
        default: 'Other'
    },
    paymentMode: {
        type: String,
        required: [true, 'Payment mode is required'],
        enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque'],
        default: 'Cash'
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    receiptUrl: {
        type: String
    },
    status: {
        type: String,
        enum: ['Paid', 'Pending', 'Cancelled'],
        default: 'Paid'
    }
}, {
    timestamps: true
});

// Indexes for fast querying and aggregation
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
