const { messaging } = require('../config/firebase-config');
const Student = require('../models/Student');

const INVALID_TOKEN_ERRORS = [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
];

const looksLikeInvalidTokenError = (error) => {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || '').toLowerCase();
    return (
        INVALID_TOKEN_ERRORS.includes(code) ||
        message.includes('requested entity was not found') ||
        message.includes('registration token is not a valid fcm registration token') ||
        message.includes('not registered')
    );
};

const cleanupFailedTokens = async ({ failedTokens = [], studentId, recipientType }) => {
    if (!failedTokens.length || !studentId) return;
    const Model = recipientType === 'teacher' ? require('../models/Teacher') : Student;
    await Model.updateOne(
        { _id: studentId },
        { $pull: { deviceTokens: { $in: failedTokens } } }
    );
};

/**
 * Send push notification using Firebase Admin SDK
 * Supports individual tokens, multicast, and topics.
 */
const sendPushNotification = async (payload) => {
    console.log('[PushService] Attempting to send notification:', JSON.stringify(payload, null, 2));

    const { student, message, title, type, data = {}, topic = null, recipientType = 'student' } = payload;

    const notificationPayload = {
        title: title || 'ERP Notification',
        body: message,
    };

    // FCM Data must only contain string values
    const stringifiedData = {};
    if (data) {
        Object.keys(data).forEach(key => {
            stringifiedData[key] = String(data[key]);
        });
    }

    const commonData = {
        type: String(type || 'general'),
        ...stringifiedData,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', 
    };

    const androidConfig = {
        priority: 'high',
        notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            channelId: 'erp_notifications_high'
        }
    };

    const apnsConfig = {
        headers: {
            'apns-priority': '10'
        },
        payload: {
            aps: {
                alert: notificationPayload,
                sound: 'default',
                badge: 1,
                contentAvailable: true
            }
        }
    };

    try {
        // Option 1: Send to a Topic
        if (topic) {
            const topicPayload = {
                topic: topic,
                notification: notificationPayload,
                data: commonData,
                android: androidConfig,
                apns: apnsConfig
            };
            console.log('[PushService] Sending to topic payload:', JSON.stringify(topicPayload, null, 2));
            const response = await messaging.send(topicPayload);
            console.log('[PushService] Topic send response:', JSON.stringify(response, null, 2));
            return {
                status: 'sent',
                providerMessageId: response,
                error: '',
                meta: { topic }
            };
        }

        // Option 2: Send to specific Student tokens
        const tokens = Array.from(new Set((student?.deviceTokens || []).filter(token => typeof token === 'string' && token.length > 10)));

        if (tokens.length === 0) {
            console.warn('[PushService] No valid device tokens found for student:', student?._id);
            return {
                status: 'failed',
                error: 'No valid device tokens.',
                meta: {}
            };
        }

        // Use multicast for both single and multiple tokens so token failures
        // are returned in response.responses instead of throwing directly.
        const multicastPayload = {
            tokens: tokens,
            notification: notificationPayload,
            data: commonData,
            android: androidConfig,
            apns: apnsConfig
        };

        const response = await messaging.sendEachForMulticast(multicastPayload);
        
        // Handle token cleanup if some failed
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((res, idx) => {
                if (!res.success && INVALID_TOKEN_ERRORS.includes(res.error?.code)) {
                    failedTokens.push(tokens[idx]);
                }
            });

            await cleanupFailedTokens({
                failedTokens,
                studentId: student?._id,
                recipientType
            });
        }

        if (response.successCount > 0) {
            return {
                status: response.failureCount === 0 ? 'sent' : 'partial',
                error: response.failureCount > 0 ? `${response.failureCount} tokens failed` : '',
                meta: { 
                    successCount: response.successCount, 
                    failureCount: response.failureCount,
                    responses: response.responses.map(r => ({ success: r.success, error: r.error?.code }))
                }
            };
        }

        const firstError = response.responses[0]?.error;
        const firstErrorMessage = firstError?.message || 'All tokens failed.';

        return {
            status: 'failed',
            error: looksLikeInvalidTokenError(firstError)
                ? 'Device token is invalid/expired. It has been removed; ask the user to reopen the app and re-register notifications.'
                : firstErrorMessage,
            meta: response
        };

    } catch (error) {
        console.error('[PushNotificationService] FCM Error:', error);

        if (looksLikeInvalidTokenError(error)) {
            const tokens = Array.from(new Set((student?.deviceTokens || []).filter(token => typeof token === 'string' && token.length > 10)));
            await cleanupFailedTokens({
                failedTokens: tokens,
                studentId: student?._id,
                recipientType
            });

            return {
                status: 'failed',
                error: 'Device token is invalid/expired. It has been removed; ask the user to reopen the app and re-register notifications.',
                meta: { code: error.code, reason: error.message }
            };
        }

        return {
            status: 'failed',
            error: error.message,
            meta: { code: error.code }
        };
    }
};

/**
 * Subscribe students to a topic (useful for batch/all notifications)
 */
const subscribeToTopic = async (tokens, topic) => {
    try {
        const response = await messaging.subscribeToTopic(tokens, topic);
        return response;
    } catch (error) {
        console.error(`[PushNotificationService] Topic Subscription Error (${topic}):`, error);
        throw error;
    }
};

module.exports = { sendPushNotification, subscribeToTopic };
