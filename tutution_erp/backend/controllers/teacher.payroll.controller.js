const {
    TeacherSalaryProfile,
    TeacherBonus,
    TeacherSalary,
    TeacherPayment
} = require('../models/TeacherPayroll');
const Teacher = require('../models/Teacher');
const { triggerAutomaticNotification } = require('../services/notificationService');
const Admin = require('../models/Admin');
const Expense = require('../models/Expense');
const { logNotificationEvent } = require('../services/activityLogService');


// ==========================================
// 1. SALARY PROFILES
// ==========================================

// Get a single teacher's profile
exports.getSalaryProfile = async (req, res) => {
    try {
        const { teacherId } = req.params;
        if (req.role === 'teacher' && String(req.userId) !== String(teacherId)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const profile = await TeacherSalaryProfile.findOne({ teacherId }).populate('teacherId', 'name email phone status regNo department');
        if (!profile) return res.status(404).json({ message: 'Salary profile not found for this teacher.' });
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Create or update a salary profile
exports.upsertSalaryProfile = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { salaryType, baseSalary, bankDetails, status } = req.body;

        const teacher = await Teacher.findById(teacherId);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        let profile = await TeacherSalaryProfile.findOne({ teacherId });

        if (profile) {
            profile.salaryType = salaryType || profile.salaryType;
            profile.baseSalary = baseSalary || profile.baseSalary;
            if (bankDetails) profile.bankDetails = bankDetails;
            if (status) profile.status = status;
            profile.updatedAt = Date.now();
            await profile.save();
        } else {
            profile = new TeacherSalaryProfile({ teacherId, salaryType, baseSalary, bankDetails, status });
            await profile.save();
        }

        res.json({ message: 'Salary profile saved successfully', profile });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ==========================================
// 2. EXTRA CLASSES & LEAVES (REMOVED)
// ==========================================

exports.logExtraClass = async (req, res) => {
    return res.status(410).json({ message: 'Teacher extra classes model has been removed.' });
};

exports.logLeave = async (req, res) => {
    return res.status(410).json({ message: 'Teacher leaves model has been removed.' });
};

exports.logBonus = async (req, res) => {
    try {
        const { teacherId, date, reason, amount } = req.body;
        if (!teacherId || !date || !amount) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const monthRecord = new Date(date).toISOString().slice(0, 7); // YYYY-MM

        const bonus = new TeacherBonus({
            teacherId, date, reason, amount, monthRecord
        });

        await bonus.save();
        res.status(201).json({ message: 'Bonus logged successfully', bonus });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// ==========================================
// 3. MONTHLY SALARY CALCULATION ENGINE
// ==========================================

// Helper function to calculate one teacher's salary for a specific month
const calculateSalaryForTeacher = async (teacherId, monthYear) => {
    const profile = await TeacherSalaryProfile.findOne({ teacherId, status: 'Active' });
    if (!profile) return null; // Inactive or no profile = skip generation

    const baseSalary = profile.baseSalary || 0;

    // Extra classes and leaves models were removed, so only bonus affects variable pay.
    const extraClassesAmount = 0;

    // 1. Calculate Bonus
    const bonuses = await TeacherBonus.find({ teacherId, monthRecord: monthYear });
    const bonusAmount = bonuses.reduce((sum, record) => sum + record.amount, 0);

    // Net = Base + Extra + Bonus
    let netSalary = baseSalary + extraClassesAmount + bonusAmount;
    if (netSalary < 0) netSalary = 0;

    return {
        teacherId,
        monthYear,
        baseSalary,
        extraClassesAmount,
        leaveDeductions: 0,
        advanceDeductions: 0,
        bonusAmount,
        netSalary,
        status: 'Pending'
    };
};

// Manual trigger for a specific teacher & month (or bulk generate)
exports.generateMonthlySalaries = async (req, res) => {
    try {
        const { monthYear } = req.body; // YYYY-MM
        if (!monthYear) return res.status(400).json({ message: 'monthYear (YYYY-MM) is required' });

        // Find all active profiles
        const profiles = await TeacherSalaryProfile.find({ status: 'Active' });
        let generatedCount = 0;

        for (const p of profiles) {
            // Check if already generated for this month
            const existing = await TeacherSalary.findOne({ teacherId: p.teacherId, monthYear });
            if (existing) continue; // Skip if already there

            const salaryData = await calculateSalaryForTeacher(p.teacherId, monthYear);
            if (salaryData) {
                const newSalary = new TeacherSalary(salaryData);
                await newSalary.save();
                generatedCount++;
            }
        }

        res.json({ message: `Successfully generated ${generatedCount} salary records for ${monthYear}` });
    } catch (error) {
        res.status(500).json({ message: 'Server error during generation', error: error.message });
    }
};


// ==========================================
// 4. PAYMENTS & LEDGER
// ==========================================

exports.markSalaryPaid = async (req, res) => {
    try {
        const { salaryRecordId } = req.params;
        const { paidAmount, paymentMethod, transactionId, notes } = req.body;

        const salary = await TeacherSalary.findById(salaryRecordId);
        if (!salary) return res.status(404).json({ message: 'Salary record not found' });

        if (salary.status === 'Paid') return res.status(400).json({ message: 'Salary already fully paid' });

        // Calculate current total paid for this record
        const previousPayments = await TeacherPayment.find({ salaryRecordId });
        const totalPreviousPaid = previousPayments.reduce((sum, p) => sum + p.paidAmount, 0);

        const newTotalPaid = totalPreviousPaid + Number(paidAmount);

        const payment = new TeacherPayment({
            salaryRecordId,
            teacherId: salary.teacherId,
            paidAmount: Number(paidAmount),
            paymentMethod,
            transactionId: transactionId || `PAY-${salary.monthYear.replace('-', '')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            notes
        });
        await payment.save();

        // Update salary record status based on total paid
        if (newTotalPaid >= salary.netSalary) {
            salary.status = 'Paid';
        } else {
            salary.status = 'Processing';
        }

        salary.paymentMethod = paymentMethod;
        salary.transactionId = payment.transactionId;
        salary.paymentDate = new Date();
        salary.notes = notes;

        // Capture UPI ID used if applicable
        if (paymentMethod === 'UPI') {
            const profile = await TeacherSalaryProfile.findOne({ teacherId: salary.teacherId });
            salary.upiId = profile?.bankDetails?.upiId;
        }

        await salary.save();

        // ---------------------------------------------------------
        // AUTO-CREATE EXPENSE RECORD
        // ---------------------------------------------------------
        try {
            const teacher = await Teacher.findById(salary.teacherId).select('name');
            const modeMapping = {
                'Bank Transfer': 'Bank Transfer',
                'UPI': 'UPI',
                'Cash': 'Cash'
            };

            await Expense.create({
                title: `Salary Payout - ${teacher?.name || 'Faculty'} (${salary.monthYear})`,
                amount: paidAmount,
                category: 'Salary',
                paymentMode: modeMapping[paymentMethod] || 'Cash',
                date: new Date(),
                description: `Salary disbursement for ${salary.monthYear}. Ref: ${payment.transactionId}. ${notes || ''}`,
                status: 'Paid'
            });
        } catch (expErr) {
            console.error('[PayrollToExpense] Failed to create expense record:', expErr);
        }

        // Log salary payment activity instead of sending email.
        try {
            const teacherInfo = await Teacher.findById(salary.teacherId).select('name email');
            if (teacherInfo && teacherInfo.email) {
                // Extract month name from YYYY-MM
                const dateParts = salary.monthYear.split('-');
                const monthName = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1).toLocaleString('default', { month: 'long' });

                triggerAutomaticNotification({
                    eventType: 'salaryPaid',
                    teacherId: teacherInfo._id,
                    message: `Your salary for ${monthName} ${dateParts[0]} has been processed. Amount: ₹${paidAmount}`,
                    data: {
                        month: monthName,
                        year: dateParts[0],
                        amountPaid: paidAmount,
                        transactionRef: payment.transactionId
                    }
                });

                logNotificationEvent({
                    recipientEmail: teacherInfo.email,
                    recipientName: teacherInfo.name,
                    subject: `Salary Credited — ${salary.monthYear}`,
                    type: 'teacher_salary_paid',
                    data: {
                        monthYear: salary.monthYear,
                        amountPaid: paidAmount,
                        paymentMethod,
                        transactionId: payment.transactionId
                    }
                }).catch(e => console.error('[SalaryNotificationLog] Error:', e));
            }
        } catch (notificationErr) {
            console.error('[SalaryNotificationLog] Lookup error:', notificationErr);
        }

        res.json({ message: 'Payment recorded successfully', payment });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// ==========================================
// 5. DASHBOARD STATS
// ==========================================
exports.getPayrollDashboardStats = async (req, res) => {
    try {
        const { monthYear } = req.query;
        const targetMonth = monthYear || new Date().toISOString().slice(0, 7);

        const totalTeachers = await Teacher.countDocuments({ status: 'active' });
        const activeProfiles = await TeacherSalaryProfile.countDocuments({ status: 'Active' });

        // Salaries for target month
        const targetMonthSalaries = await TeacherSalary.find({ monthYear: targetMonth });

        let totalLiability = 0;
        targetMonthSalaries.forEach(s => {
            totalLiability += s.netSalary;
        });

        // Sum individual payments for these salaries
        const salaryIds = targetMonthSalaries.map(s => s._id);
        const allPayments = await TeacherPayment.find({ salaryRecordId: { $in: salaryIds } });

        let totalPaid = 0;
        allPayments.forEach(p => {
            totalPaid += p.paidAmount;
        });

        const totalPending = totalLiability - totalPaid;

        res.json({
            totalTeachers,
            teachersWithProfiles: activeProfiles,
            monthYear: targetMonth,
            totalLiability,
            totalPaid,
            totalPending
        });

    } catch (error) {
        res.status(500).json({ message: 'Dashboard stats error', error: error.message });
    }
};

// Get history of salaries for grid view
exports.getAllSalaries = async (req, res) => {
    try {
        const { monthYear, teacherId } = req.query; // optional filters
        const query = {};
        if (monthYear) query.monthYear = monthYear;
        if (req.role === 'teacher') {
            query.teacherId = req.userId;
        } else if (teacherId) {
            query.teacherId = teacherId;
        }

        const salaries = await TeacherSalary.find(query)
            .populate('teacherId', 'name email profileImage regNo department')
            .sort({ createdAt: -1 });

        const salaryIds = salaries.map(s => s._id);
        const allPayments = await TeacherPayment.find({ salaryRecordId: { $in: salaryIds } });

        const salariesWithPaid = salaries.map(s => {
            const payments = allPayments.filter(p => p.salaryRecordId.toString() === s._id.toString());
            const totalPaid = payments.reduce((sum, p) => sum + p.paidAmount, 0);
            return {
                ...s.toObject(),
                totalPaid
            };
        });

        res.json(salariesWithPaid);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
// 6. BULK OPERATIONS

exports.bulkGenerateSalaries = async (req, res) => {
    try {
        const { ids, monthYear } = req.body;
        if (!ids || !ids.length) return res.status(400).json({ message: 'No teacher IDs provided' });
        if (!monthYear) return res.status(400).json({ message: 'monthYear is required' });

        let generatedCount = 0;
        let skippedCount = 0;

        for (const teacherId of ids) {
            // Check if already generated for this month
            const existing = await TeacherSalary.findOne({ teacherId, monthYear });
            if (existing) {
                skippedCount++;
                continue;
            }

            const salaryData = await calculateSalaryForTeacher(teacherId, monthYear);
            if (salaryData) {
                const newSalary = new TeacherSalary(salaryData);
                await newSalary.save();
                generatedCount++;
            }
        }

        res.json({
            message: `Successfully generated ${generatedCount} salary records for ${monthYear}.`,
            details: { generated: generatedCount, skipped: skippedCount }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error during bulk generation', error: error.message });
    }
};

