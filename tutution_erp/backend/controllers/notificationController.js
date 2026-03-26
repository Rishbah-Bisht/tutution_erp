const notificationService = require('../services/notificationService');

exports.getRecipients = async (req, res, next) => {
    try {
        const { search, page, limit, status, batchId, hasPendingFees, hasPushToken, recipientType } = req.query;
        const result = await notificationService.getRecipients({
            search, page, limit, status, batchId, hasPendingFees, hasPushToken, recipientType
        });
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

exports.getHistory = async (req, res, next) => {
    try {
        const result = await notificationService.getNotificationHistory(req.query);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

exports.sendNotifications = async (req, res, next) => {
    try {
        console.log('[NotificationController] Incoming send request:', JSON.stringify(req.body, null, 2));
        const { message = '', studentIds = [], sendToAll = false, deliveryMethods = [], batchId = '', recipientType = 'student' } = req.body;

        if (!String(message).trim()) {
            return res.status(400).json({ success: false, message: 'Message is required.' });
        }

        if (!Array.isArray(deliveryMethods) || deliveryMethods.length === 0) {
            return res.status(400).json({ success: false, message: 'Select at least one delivery method.' });
        }

        const hasBatchTarget = Boolean(batchId);
        const hasStudentTargets = Array.isArray(studentIds) && studentIds.length > 0;

        if (!sendToAll && !hasStudentTargets && !hasBatchTarget) {
            return res.status(400).json({ success: false, message: 'Select at least one student, choose a batch, or select all students.' });
        }

        const result = await notificationService.sendNotificationBatch({
            title: req.body.title || 'ERP Notification',
            message: String(message).trim(),
            type: req.body.type || 'general',
            studentIds,
            sendToAll: sendToAll === true,
            deliveryMethods,
            batchId,
            recipientType,
            adminId: req.admin?.id || null,
            scheduledFor: req.body.scheduledFor ? new Date(req.body.scheduledFor) : null
        });

        res.status(201).json({
            success: true,
            message: result.status === 'scheduled' ? 'Notification scheduled successfully.' : `Notifications processed for ${result.summary?.total || 1} student(s).`,
            ...result
        });
    } catch (error) {
        next(error);
    }
};

exports.cleanupHistory = async (req, res, next) => {
    try {
        const result = await notificationService.cleanupOldNotifications();
        res.json({
            success: true,
            message: `Successfully deleted ${result.deletedCount} old notification records.`,
            ...result
        });
    } catch (error) {
        next(error);
    }
};
