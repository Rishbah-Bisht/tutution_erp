const { messaging } = require('../config/firebase-config');
const Student = require('../models/Student');

const INVALID_TOKEN_ERRORS = [
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
];

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

        if (tokens.length === 1) {
            const singleTokenPayload = {
                token: tokens[0],
                notification: notificationPayload,
                data: commonData,
                android: androidConfig,
                apns: apnsConfig
            };
            console.log('[PushService] Sending to single token payload:', JSON.stringify(singleTokenPayload, null, 2));
            const response = await messaging.send(singleTokenPayload);
            console.log('[PushService] Single token send response:', JSON.stringify(response, null, 2));
            return {
                status: 'sent',
                providerMessageId: response,
                error: '',
                meta: { token: tokens[0] }
            };
        }

        // Multicast for multiple tokens
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

            if (failedTokens.length > 0 && student?._id) {
                const Model = recipientType === 'teacher' ? require('../models/Teacher') : Student;
                await Model.updateOne(
                    { _id: student._id },
                    { $pull: { deviceTokens: { $in: failedTokens } } }
                );
            }
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

        return {
            status: 'failed',
            error: response.responses[0]?.error?.message || 'All tokens failed.',
            meta: response
        };

    } catch (error) {
        console.error('[PushNotificationService] FCM Error:', error);
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
