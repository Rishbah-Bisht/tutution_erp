const cron = require('node-cron');
const feeController = require('../controllers/fee.controller');
const payrollController = require('../controllers/teacher.payroll.controller');
const Fee = require('../models/Fee');
const Student = require('../models/Student');
const { logNotificationEvent } = require('../services/activityLogService');

/**
 * Automates monthly fee generation for all active students.
 * Scheduled to run at 00:00 on the 1st day of every month.
 */
const initFeeScheduler = () => {
    // 0 0 1 * * -> Midnight on the 1st of every month
    cron.schedule('0 0 1 * *', async () => {
        const now = new Date();
        const month = now.toLocaleString('default', { month: 'long' });
        const year = now.getFullYear();

        console.log(`[Scheduler] [${now.toISOString()}] Starting automated fee generation for ${month} ${year}...`);

        try {
            // Simulate a request object for the controller
            const mockReq = {
                body: {
                    month: month,
                    year: year,
                    // Due date is the 10th of the current month
                    dueDate: new Date(year, now.getMonth(), 10)
                }
            };

            const mockRes = {
                status: (code) => ({
                    json: (data) => console.log(`[Scheduler] Result (${code}):`, data.message)
                }),
                json: (data) => console.log('[Scheduler] Info:', data.message)
            };

            await feeController.generateFees(mockReq, mockRes);
        } catch (err) {
            console.error('[Scheduler] Critical error in fee generation:', err);
        }
    });

    console.log('[Scheduler] Fee generation service initialized (Runs on the 1st of every month at midnight).');
};

/**
 * Automates monthly salary generation for all active teachers.
 * Scheduled to run at 00:00 on the 1st day of every month.
 */
const initSalaryScheduler = () => {
    cron.schedule('0 0 1 * *', async () => {
        const now = new Date();
        const monthYear = now.toISOString().slice(0, 7); // current YYYY-MM

        console.log(`[Scheduler] [${now.toISOString()}] Starting automated salary generation for ${monthYear}...`);

        try {
            const mockReq = { body: { monthYear } };
            const mockRes = {
                status: (code) => ({
                    json: (data) => console.log(`[Scheduler] Salary Result (${code}):`, data.message)
                }),
                json: (data) => console.log('[Scheduler] Salary Info:', data.message)
            };

            await payrollController.generateMonthlySalaries(mockReq, mockRes);
        } catch (err) {
            console.error('[Scheduler] Critical error in salary generation:', err);
        }
    });

    console.log('[Scheduler] Salary generation service initialized.');
};

const { triggerAutomaticNotification } = require('../services/notificationService');

/**
 * Daily check for due fees. Logs reminder events 3 days before and on the due date.
 * Runs every day at 09:00 AM.
 */
const initReminderScheduler = () => {
    // 0 9 * * * -> 9:00 AM every day
    cron.schedule('0 9 * * *', async () => {
        console.log('[Scheduler] Running daily fee reminder check...');
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const threeDaysFromNow = new Date(today);
            threeDaysFromNow.setDate(today.getDate() + 3);

            // Find unpaid fees due today or in 3 days
            const targetFees = await Fee.find({
                status: { $in: ['pending', 'partial', 'overdue'] },
                isDeleted: { $ne: true },
                dueDate: {
                    $gte: today,
                    $lte: threeDaysFromNow
                }
            }).populate('studentId');

            console.log(`[Scheduler] Found ${targetFees.length} potential fee reminders.`);

            for (const fee of targetFees) {
                const s = fee.studentId;
                if (!s) continue;

                const feeDueDate = new Date(fee.dueDate);
                feeDueDate.setHours(0, 0, 0, 0);

                let shouldNotify = false;
                if (feeDueDate.getTime() === today.getTime()) shouldNotify = true;
                if (feeDueDate.getTime() === threeDaysFromNow.getTime()) shouldNotify = true;

                if (shouldNotify) {
                    await triggerAutomaticNotification({
                        studentId: s._id,
                        eventType: 'feeOverdue',
                        message: `Reminder: Your fee of ₹${fee.pendingAmount} for ${fee.month} is due. Due date: ${feeDueDate.toLocaleDateString()}.`,
                        data: {
                            pendingAmount: fee.pendingAmount,
                            month: fee.month,
                            dueDate: feeDueDate.toLocaleDateString()
                        }
                    });

                    await logNotificationEvent({
                        recipientEmail: s.email || '',
                        recipientName: s.name,
                        subject: 'Fee Due Reminder',
                        type: 'fee_reminder',
                        data: {
                            amount: fee.pendingAmount,
                            dueDate: feeDueDate.toLocaleDateString()
                        }
                    });
                }
            }
        } catch (err) {
            console.error('[Scheduler] Error in fee reminder check:', err);
        }
    });

    console.log('[Scheduler] Fee reminder service initialized (Daily at 9:00 AM).');
};

const Notification = require('../models/Notification');
const { sendNotificationBatch } = require('../services/notificationService');

/**
 * Initialize background cron jobs
 */
const initScheduler = () => {
    // Check for scheduled notifications every minute
    cron.schedule('* * * * *', async () => {
        const now = new Date();
        
        try {
            // Find notifications scheduled for now or in the past that are still in 'scheduled' status
            const pendingNotifications = await Notification.find({
                status: 'scheduled',
                scheduledFor: { $lte: now }
            });

            if (pendingNotifications.length > 0) {
                console.log(`[Scheduler] Processing ${pendingNotifications.length} scheduled notifications...`);
                
                for (const notif of pendingNotifications) {
                    try {
                        // Mark as pending to avoid double processing
                        notif.status = 'pending';
                        await notif.save();

                        // Dispatch the notification
                        await sendNotificationBatch({
                            title: notif.title,
                            message: notif.message,
                            type: notif.type,
                            studentIds: notif.target === 'individual' ? (notif.targetId ? notif.targetId.split(',') : []) : [],
                            batchId: notif.target === 'batch' ? notif.targetId : '',
                            sendToAll: notif.target === 'all',
                            deliveryMethods: notif.deliveryType === 'both' ? ['push', 'email'] : [notif.deliveryType],
                            adminId: notif.createdBy,
                            scheduledFor: null // Pass null to actually send it now
                        });

                        // Delete the 'scheduled' placeholder record as sendNotificationBatch creates new 'sent' records for individual recipients
                        await Notification.deleteOne({ _id: notif._id });

                    } catch (error) {
                        console.error(`[Scheduler] Failed to process notification ${notif._id}:`, error.message);
                        notif.status = 'failed';
                        await notif.save();
                    }
                }
            }
        } catch (error) {
            console.error('[Scheduler] Critical error in cron job:', error.message);
        }
    });

    console.log('[Scheduler] Notification scheduler initialized (1m interval).');
};

module.exports = { initFeeScheduler, initSalaryScheduler, initReminderScheduler, initScheduler };

