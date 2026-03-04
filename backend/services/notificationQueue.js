const Notification = require('../models/Notification');
const { sendEmail } = require('./emailService');

const DAILY_LIMIT = 500;
const DELAY_BETWEEN_EMAILS = 3000; // 3 seconds

let isProcessing = false;

/**
 * Worker to process the pending notification queue.
 */
const startWorker = () => {
    console.log('[NotificationQueue] Background worker started.');
    setInterval(async () => {
        if (isProcessing) return;
        await processQueue();
    }, 10000); // Check every 10 seconds for pending work
};

const processQueue = async () => {
    isProcessing = true;
    try {
        // 1. Check daily limit
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sentToday = await Notification.countDocuments({
            status: 'sent',
            sentAt: { $gte: twentyFourHoursAgo }
        });

        if (sentToday >= DAILY_LIMIT) {
            console.warn('[NotificationQueue] Daily limit reached. Pausing...');
            isProcessing = false;
            return;
        }

        // 2. Fetch pending notifications
        const pendingSpecs = await Notification.find({ status: 'pending' })
            .limit(10)
            .sort({ createdAt: 1 });

        if (pendingSpecs.length === 0) {
            isProcessing = false;
            return;
        }

        console.log(`[NotificationQueue] Processing ${pendingSpecs.length} pending notifications...`);

        for (const note of pendingSpecs) {
            try {
                // Wait for rate limit delay
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS));

                await sendEmail(note);

                note.status = 'sent';
                note.sentAt = new Date();
                await note.save();
            } catch (err) {
                note.retryCount += 1;
                note.lastError = err.message;

                if (note.retryCount >= note.maxRetries) {
                    note.status = 'failed';
                }
                await note.save();
            }
        }
    } catch (err) {
        console.error('[NotificationQueue] Queue processing error:', err);
    } finally {
        isProcessing = false;
    }
};

module.exports = { startWorker };
