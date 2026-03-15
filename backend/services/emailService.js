const nodemailer = require('nodemailer');

exports.sendEmail = async ({ student, teacher, message, admin, subjectOverride, attachments }) => {
    const recipient = student || teacher;
    const recipientName = recipient?.name || 'Unknown';

    try {
        if (!recipient || !recipient.email) {
            console.log(`[Email] Skipped for ${recipientName} - No email found`);
            return { success: false, reason: 'No email address' };
        }

        const email = admin?.gmailEmail || process.env.GMAIL_USER || process.env.GMAIL_EMAIL;
        const appPassword = admin?.gmailAppPassword || process.env.GMAIL_APP_PASSWORD;

        if (!email || !appPassword) {
            console.log('[Email] Warning: Gmail Email or App Password not configured.');
            return { success: false, reason: 'Credentials not configured' };
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: email,
                pass: appPassword
            }
        });

        const mailOptions = {
            from: email,
            to: recipient.email,
            subject: subjectOverride || 'New Notification from Institute',
            html: message,
            text: message.replace(/<[^>]*>/g, ''), // Fallback: strip HTML tags for plain text
            attachments: attachments || []
        };

        const result = await transporter.sendMail(mailOptions);
        console.log(`[Email] Notification sent to ${recipientName} (${recipient.email}): ${result.messageId}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error(`[Email] Failed to send to ${recipientName}:`, error.message);
        return { success: false, error: error.message };
    }
};
