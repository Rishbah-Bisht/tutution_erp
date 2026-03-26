const logNotificationEvent = async ({ recipientEmail, recipientName, subject, type, data = {} }) => {
    const entry = {
        channel: 'internal-log',
        recipientEmail: recipientEmail || '',
        recipientName: recipientName || '',
        subject,
        type,
        data,
        loggedAt: new Date().toISOString()
    };

    console.log('[NotificationEvent] Email delivery removed; logged event instead:', entry);
    return entry;
};

module.exports = { logNotificationEvent };
