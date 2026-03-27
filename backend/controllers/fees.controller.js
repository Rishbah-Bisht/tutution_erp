const Fee = require('../models/Fee');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const { triggerAutomaticNotification } = require('../services/notificationService');

// Helper to recalc pending & status
const recalcStatus = (feeDoc) => {
    const totalFee = Number(feeDoc.totalFee || 0);
    const amountPaid = Number(feeDoc.amountPaid || 0);
    const pending = Math.max(totalFee - amountPaid, 0);
    feeDoc.pendingAmount = pending;

    if (pending <= 0 && totalFee > 0) feeDoc.status = 'paid';
    else if (amountPaid > 0 && pending > 0) feeDoc.status = 'partial';
    else feeDoc.status = 'pending';
};

// GET /api/fees
exports.getFees = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const { status, batchId, course } = req.query;

        const query = {};
        if (status) query.status = status;
        if (batchId) query.batchId = batchId;

        // If course filter is provided, resolve batches for that course
        if (course) {
            const batches = await Batch.find({ course }).select('_id');
            const batchIds = batches.map(b => b._id);
            query.batchId = { $in: batchIds };
        }

        const total = await Fee.countDocuments(query);
        const fees = await Fee.find(query)
            .populate('studentId', 'name rollNo profileImage className session fatherName motherName address')
            .populate('batchId', 'name course')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return res.json({
            success: true,
            total,
            pages: Math.ceil(total / limit) || 1,
            currentPage: page,
            fees
        });
    } catch (err) {
        console.error('Error fetching fees:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/fees/metrics
exports.getMetrics = async (req, res) => {
    try {
        const [aggOverall] = await Fee.aggregate([
            {
                $group: {
                    _id: null,
                    totalCollected: { $sum: '$amountPaid' },
                    totalPending: { $sum: '$pendingAmount' }
                }
            }
        ]);

        const [aggOverdue] = await Fee.aggregate([
            { $match: { status: 'overdue' } },
            { $group: { _id: null, overdueAmount: { $sum: '$pendingAmount' } } }
        ]);

        const pendingStudents = await Fee.distinct('studentId', {
            status: { $in: ['pending', 'partial', 'overdue'] }
        });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [aggMonthly] = await Fee.aggregate([
            { $unwind: '$paymentHistory' },
            { $match: { 'paymentHistory.date': { $gte: startOfMonth } } },
            { $group: { _id: null, monthlyCollection: { $sum: '$paymentHistory.paidAmount' } } }
        ]);

        return res.json({
            totalCollected: aggOverall ? aggOverall.totalCollected : 0,
            totalPending: aggOverall ? aggOverall.totalPending : 0,
            overdueAmount: aggOverdue ? aggOverdue.overdueAmount : 0,
            pendingStudents: pendingStudents.length,
            monthlyCollection: aggMonthly ? aggMonthly.monthlyCollection : 0
        });
    } catch (err) {
        console.error('Error fetching fee metrics:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees
exports.createFee = async (req, res) => {
    try {
        const { studentId, batchId, amount, month, year, dueDate } = req.body;

        if (!studentId || !amount || !month || !year || !dueDate) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const existing = await Fee.findOne({ studentId, month, year });
        if (existing) {
            return res.status(409).json({ message: 'Fee already exists for this month', feeId: existing._id });
        }

        const student = await Student.findById(studentId).populate('batchId');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const resolvedBatchId = batchId || (student.batchId && student.batchId._id);

        const monthlyTuitionFee = Number(amount || 0);
        const registrationFee = Number(student.registrationFee || 0);
        const fine = 0;
        const totalFee = monthlyTuitionFee + registrationFee + fine;

        const fee = new Fee({
            studentId,
            batchId: resolvedBatchId,
            month,
            year,
            monthlyTuitionFee,
            registrationFee,
            fine,
            totalFee,
            amountPaid: 0,
            pendingAmount: totalFee,
            status: 'pending',
            dueDate: new Date(dueDate)
        });

        await fee.save();

        triggerAutomaticNotification({
            eventType: 'feeGenerated',
            studentId: student._id,
            adminId: req.admin?.id || null,
            message: `New fee generated for ${month} ${year}. Due date: ${new Date(dueDate).toLocaleDateString('en-IN')}.`,
            data: {
                amount: totalFee,
                month,
                year,
                dueDate: new Date(dueDate).toLocaleDateString('en-IN')
            }
        }).catch((error) => console.error('[fees.createFee.notification]', error));

        return res.status(201).json({ success: true, fee });
    } catch (err) {
        console.error('Error creating fee:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees/:id/pay
exports.recordPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { amountPaid, mode, transactionId, remarks, fine, bankName } = req.body;

        const fee = await Fee.findById(id);
        if (!fee) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        const paid = Number(amountPaid || 0);
        const fineAmount = Number(fine || 0);
        if (paid <= 0 && fineAmount <= 0) {
            return res.status(400).json({ message: 'Payment amount must be greater than zero' });
        }

        if (fineAmount > 0) {
            fee.fine = Number(fee.fine || 0) + fineAmount;
            fee.totalFee = Number(fee.totalFee || 0) + fineAmount;
        }

        fee.amountPaid = Number(fee.amountPaid || 0) + paid;
        recalcStatus(fee);

        const receiptNo = `RCPT-${Date.now()}-${(fee.paymentHistory.length + 1).toString().padStart(3, '0')}`;

        fee.paymentHistory.push({
            paidAmount: paid,
            paymentMethod: mode || 'Cash',
            transactionId: transactionId || '',
            bankName: bankName || '',
            remarks: remarks || '',
            receiptNo,
            date: new Date()
        });

        await fee.save();

        const student = await Student.findById(fee.studentId).select('_id name').lean();
        if (student?._id) {
            triggerAutomaticNotification({
                eventType: 'feePayment',
                studentId: student._id,
                adminId: req.admin?.id || null,
                message: `Payment of Rs ${paid} received. Receipt: ${receiptNo}.`,
                data: {
                    amountPaid: paid,
                    receiptNo,
                    month: fee.month,
                    year: fee.year,
                    dueDate: fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : ''
                }
            }).catch((error) => console.error('[fees.recordPayment.notification]', error));
        }

        return res.json({ success: true, receiptNo, fee });
    } catch (err) {
        console.error('Error recording payment:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees/:id/expense
exports.addExpenseToFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, amount, date, description } = req.body;

        if (!title || !amount) {
            return res.status(400).json({ message: 'Title and amount are required' });
        }

        const fee = await Fee.findById(id);
        if (!fee) {
            return res.status(404).json({ message: 'Fee record not found' });
        }

        const amt = Number(amount);
        fee.otherExpenses.push({
            title,
            amount: amt,
            date: date ? new Date(date) : new Date(),
            description: description || ''
        });

        fee.totalFee = Number(fee.totalFee || 0) + amt;
        recalcStatus(fee);

        await fee.save();
        return res.json({ success: true, fee });
    } catch (err) {
        console.error('Error adding extra expense to fee:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees/generate
exports.generateFeesBulk = async (req, res) => {
    try {
        const { month, year, dueDate } = req.body;
        if (!month || !year || !dueDate) {
            return res.status(400).json({ message: 'Month, year and due date are required' });
        }

        const students = await Student.find({ status: 'active' }).populate('batchId');
        if (!students.length) {
            return res.json({ success: true, created: 0 });
        }

        const feesToCreate = [];
        const generatedFeeNotificationTargets = [];
        for (const student of students) {
            const exists = await Fee.findOne({ studentId: student._id, month, year });
            if (exists) continue;

            const baseFee = student.batchId?.fees || student.fees || 0;
            const registrationFee = Number(student.registrationFee || 0);
            const totalFee = Number(baseFee) + registrationFee;

            const fee = new Fee({
                studentId: student._id,
                batchId: student.batchId?._id,
                month,
                year,
                monthlyTuitionFee: Number(baseFee),
                registrationFee,
                fine: 0,
                totalFee,
                amountPaid: 0,
                pendingAmount: totalFee,
                status: 'pending',
                dueDate: new Date(dueDate)
            });
            feesToCreate.push(fee);
            generatedFeeNotificationTargets.push({
                studentId: student._id,
                amount: totalFee,
                month,
                year,
                dueDate: new Date(dueDate).toLocaleDateString('en-IN')
            });
        }

        if (feesToCreate.length) {
            await Fee.insertMany(feesToCreate);

            generatedFeeNotificationTargets.forEach((target) => {
                triggerAutomaticNotification({
                    eventType: 'feeGenerated',
                    studentId: target.studentId,
                    adminId: req.admin?.id || null,
                    message: `New fee generated for ${target.month} ${target.year}. Due date: ${target.dueDate}.`,
                    data: {
                        amount: target.amount,
                        month: target.month,
                        year: target.year,
                        dueDate: target.dueDate
                    }
                }).catch((error) => console.error('[fees.generateFeesBulk.notification]', error));
            });
        }

        return res.json({ success: true, created: feesToCreate.length });
    } catch (err) {
        console.error('Error generating bulk fees:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees/remind-overdue
exports.remindOverdue = async (req, res) => {
    try {
        const now = new Date();

        const overdueFees = await Fee.find({
            pendingAmount: { $gt: 0 },
            dueDate: { $lt: now },
            status: { $in: ['pending', 'partial', 'overdue'] }
        }).select('_id studentId month year pendingAmount dueDate status').lean();

        if (!overdueFees.length) {
            return res.json({ success: true, overdueCount: 0, notified: 0, message: 'No overdue fees found.' });
        }

        const overdueIds = overdueFees.map((fee) => fee._id);
        await Fee.updateMany(
            { _id: { $in: overdueIds }, status: { $in: ['pending', 'partial'] } },
            { $set: { status: 'overdue' } }
        );

        overdueFees.forEach((fee) => {
            triggerAutomaticNotification({
                eventType: 'feeOverdue',
                studentId: fee.studentId,
                adminId: req.admin?.id || null,
                message: `Fee overdue alert for ${fee.month} ${fee.year}. Pending amount: Rs ${fee.pendingAmount}.`,
                data: {
                    pendingAmount: fee.pendingAmount,
                    month: fee.month,
                    year: fee.year,
                    dueDate: fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '',
                    deadline: now.toLocaleDateString('en-IN')
                }
            }).catch((error) => console.error('[fees.remindOverdue.notification]', error));
        });

        return res.json({
            success: true,
            overdueCount: overdueFees.length,
            notified: overdueFees.length,
            message: `Overdue reminders triggered for ${overdueFees.length} fee records.`
        });
    } catch (err) {
        console.error('Error sending overdue reminders:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/fees/bulk-surcharge
exports.bulkSurcharge = async (req, res) => {
    try {
        const { title, amount, date, description, feeIds } = req.body;
        if (!title || !amount || !Array.isArray(feeIds) || feeIds.length === 0) {
            return res.status(400).json({ message: 'Title, amount and feeIds are required' });
        }

        const amt = Number(amount);

        const fees = await Fee.find({ _id: { $in: feeIds } });
        for (const fee of fees) {
            fee.otherExpenses.push({
                title,
                amount: amt,
                date: date ? new Date(date) : new Date(),
                description: description || ''
            });
            fee.totalFee = Number(fee.totalFee || 0) + amt;
            recalcStatus(fee);
            await fee.save();
        }

        return res.json({ success: true, updated: fees.length });
    } catch (err) {
        console.error('Error applying bulk surcharge:', err);
        return res.status(500).json({ message: 'Server error', error: err.message });
    }
};
