const Notification = require('../models/Notification');
const { queueNotification } = require('../services/emailService');
const Student = require('../models/Student');

/**
 * GET /api/notifications — Fetch notification history
 */
exports.getHistory = async (req, res) => {
    try {
        const { status, type, page = 1, limit = 50 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (type) query.type = type;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Notification.countDocuments(query);
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.json({ notifications, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/**
 * POST /api/notifications/custom — Manually trigger bulk or single notification
 */
exports.sendCustomNotification = async (req, res) => {
    try {
        const { subject, message, batchId, studentId, allStudents } = req.body;

        let targetStudents = [];
        if (allStudents) {
            targetStudents = await Student.find({ status: 'active' });
        } else if (batchId) {
            targetStudents = await Student.find({ batchId, status: 'active' });
        } else if (studentId) {
            const s = await Student.findById(studentId);
            if (s) targetStudents = [s];
        }

        if (targetStudents.length === 0) {
            return res.status(400).json({ message: 'No recipients found.' });
        }

        let queuedCount = 0;
        for (const s of targetStudents) {
            if (s.email) {
                await queueNotification({
                    recipientEmail: s.email,
                    recipientName: s.name,
                    subject: subject || 'Notice from ABC Institute',
                    type: 'custom',
                    data: { message }
                });
                queuedCount++;
            }
        }

        res.json({ message: `${queuedCount} notifications queued in the background worker.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
