const Exam = require('../models/Exam');
const Student = require('../models/Student');
const { logNotificationEvent } = require('../services/activityLogService');

/**
 * Creates an exam and logs student notification events for the batch.
 */
exports.createExam = async (req, res) => {
    try {
        const { name, subject, batchId, date, time } = req.body;
        const exam = new Exam({ name, subject, batchId, date, time });
        await exam.save();

        // Log notification events for students in this batch.
        const students = await Student.find({ batchId, status: 'active' });
        for (const s of students) {
            if (s.email) {
                await logNotificationEvent({
                    recipientEmail: s.email,
                    recipientName: s.name,
                    subject: `Exam Scheduled: ${name}`,
                    type: 'exam',
                    data: {
                        examName: name,
                        subject,
                        date: new Date(date).toLocaleDateString(),
                        time
                    }
                });
            }
        }

        res.status(201).json({ message: 'Exam created successfully', exam });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/**
 * Announces a holiday and logs student notification events.
 */
exports.announceHoliday = async (req, res) => {
    try {
        const { title, date, reason } = req.body;
        const holiday = {
            title,
            date,
            reason
        };

        // Log notification events for all active students.
        const students = await Student.find({ status: 'active' });
        for (const s of students) {
            if (s.email) {
                await logNotificationEvent({
                    recipientEmail: s.email,
                    recipientName: s.name,
                    subject: `Holiday Announcement: ${title}`,
                    type: 'holiday',
                    data: {
                        message: `A holiday has been announced for ${new Date(date).toLocaleDateString()}. Reason: ${reason}`
                    }
                });
            }
        }

        res.status(201).json({ message: 'Holiday announced successfully', holiday });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

/**
 * Logs result availability events for students.
 */
exports.notifyResults = async (req, res) => {
    try {
        const { batchId, examName } = req.body;
        const students = await Student.find({ batchId, status: 'active' });

        for (const s of students) {
            if (s.email) {
                await logNotificationEvent({
                    recipientEmail: s.email,
                    recipientName: s.name,
                    subject: `Results Available: ${examName}`,
                    type: 'result',
                    data: {
                        message: `Exam results for "${examName}" are now available for viewing on the portal.`
                    }
                });
            }
        }

        res.json({ message: 'Result availability logged successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

