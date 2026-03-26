const mongoose = require('mongoose');

// ── 1. Teacher Salary Profile ──
const salaryProfileSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, unique: true },
    salaryType: { type: String, enum: ['Monthly', 'Per Class', 'Per Hour'], default: 'Monthly' },
    baseSalary: { type: Number, required: true },
    bankDetails: {
        accountName: { type: String },
        accountNumber: { type: String },
        bankName: { type: String },
        ifscCode: { type: String },
        upiId: { type: String }
    },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// ── 2. Teacher Bonuses ──
const bonusSchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    date: { type: Date, required: true },
    reason: { type: String },
    amount: { type: Number, required: true },
    monthRecord: { type: String, required: true }, // "YYYY-MM"
    createdAt: { type: Date, default: Date.now }
});

// ── 3. Monthly Salary Generation Record ──
const teacherSalarySchema = new mongoose.Schema({
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    monthYear: { type: String, required: true }, // format: "YYYY-MM"

    // Breakdown
    baseSalary: { type: Number, required: true },
    extraClassesAmount: { type: Number, default: 0 },
    bonusAmount: { type: Number, default: 0 },
    bonusReason: { type: String },
    leaveDeductions: { type: Number, default: 0 },
    advanceDeductions: { type: Number, default: 0 },

    // Totals
    netSalary: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Processing', 'Paid'], default: 'Pending' },

    // Payment Info (populated when status becomes 'Paid')
    paymentMethod: { type: String, enum: ['Cash', 'Bank Transfer', 'UPI'] },
    transactionId: { type: String },
    paymentDate: { type: Date },
    upiId: { type: String },
    notes: { type: String },

    createdAt: { type: Date, default: Date.now }
});

// Unique index: a teacher only gets one salary record per month
teacherSalarySchema.index({ teacherId: 1, monthYear: 1 }, { unique: true });

// ── 4. Payment Ledger ──
const teacherPaymentSchema = new mongoose.Schema({
    salaryRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherSalary', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    paidAmount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'Bank Transfer', 'UPI'], required: true },
    transactionId: { type: String },
    paymentDate: { type: Date, default: Date.now },
    notes: { type: String }
});


module.exports = {
    TeacherSalaryProfile: mongoose.model('TeacherSalaryProfile', salaryProfileSchema),
    TeacherBonus: mongoose.model('TeacherBonus', bonusSchema),
    TeacherSalary: mongoose.model('TeacherSalary', teacherSalarySchema),
    TeacherPayment: mongoose.model('TeacherPayment', teacherPaymentSchema)
};
