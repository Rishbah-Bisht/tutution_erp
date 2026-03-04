const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const Notification = require('../models/Notification');
const Admin = require('../models/Admin');

// Transporter configuration (using Gmail App Password)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
    }
});

/**
 * Queues a notification in the database.
 */
const queueNotification = async ({ recipientEmail, recipientName, subject, type, data }) => {
    try {
        const admin = await Admin.findOne().select('emailNotificationsEnabled');
        if (admin && admin.emailNotificationsEnabled === false) {
            console.log(`[EmailService] Notifications disabled by Admin. Skipping email to: ${recipientEmail}`);
            return null;
        }

        const notification = new Notification({
            recipientEmail,
            recipientName,
            subject,
            type,
            template: type, // Using type as template name for now
            data
        });
        await notification.save();
        return notification;
    } catch (err) {
        console.error('[EmailService] Failed to queue notification:', err);
        throw err;
    }
};

/**
 * Compiles a template and sends a single email.
 */
const sendEmail = async (notification) => {
    try {
        // Simple default template logic
        const templateSource = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">{{subject}}</h2>
                <p>Hello <strong>{{recipientName}}</strong>,</p>
                <div style="color: #475569; line-height: 1.6;">
                    {{#if (eq type 'registration')}}
                        <p>Welcome to <strong>ABC Institute</strong>! Your registration is successful.</p>
                        <p><strong>Student ID:</strong> {{data.rollNo}}</p>
                        <p><strong>Login Password:</strong> {{data.password}}</p>
                    {{else if (eq type 'teacher_admission')}}
                        <p>Welcome to <strong>ABC Institute</strong>! Your profile has been registered as a faculty member.</p>
                        <p><strong>Registration No:</strong> {{data.regNo}}</p>
                        <p><strong>Designation:</strong> {{data.designation}}</p>
                        <p>You can log in to the Teacher Portal using your registered email and password.</p>
                    {{else if (eq type 'fee_generated')}}
                        <p>Your monthly fee has been generated for <strong>{{data.month}} {{data.year}}</strong>.</p>
                        <p><strong>Amount:</strong> ₹{{data.amount}}</p>
                        <p><strong>Due Date:</strong> {{data.dueDate}}</p>
                        <p>Please ensure payment before the due date.</p>
                    {{else if (eq type 'fee_paid')}}
                        <p>We have successfully received your payment. Here are the details:</p>
                        <p><strong>Amount Paid:</strong> ₹{{data.amountPaid}}</p>
                        <p><strong>Receipt No:</strong> {{data.receiptNo}}</p>
                        <p><strong>Payment Mode:</strong> {{data.paymentMode}}</p>
                        <p><strong>Remaining Balance:</strong> ₹{{data.remainingBalance}}</p>
                        <p>Thank you for the timely payment!</p>
                    {{else if (eq type 'salary_paid')}}
                        <p>Your salary for <strong>{{data.monthYear}}</strong> has been processed.</p>
                        <p><strong>Amount Paid:</strong> ₹{{data.amountPaid}}</p>
                        <p><strong>Payment Method:</strong> {{data.paymentMethod}}</p>
                        <p><strong>Transaction ID:</strong> {{data.transactionId}}</p>
                        <p>Regards, ABC Institute Finance Team.</p>
                    {{else if (eq type 'result_announced')}}
                        <p>Your exam results have been announced. Here are your details:</p>
                        <p><strong>Test:</strong> {{data.examName}}</p>
                        <p><strong>Subject:</strong> {{data.subject}}</p>
                        <p><strong>Marks Obtained:</strong> {{data.marksObtained}} / {{data.totalMarks}}</p>
                        <p><strong>Passing Marks:</strong> {{data.passingMarks}}</p>
                        <p><strong>Result:</strong> <span style="color: {{data.resultColor}}; font-weight: bold;">{{data.result}}</span></p>
                    {{else if (eq type 'batch_assignment')}}
                        <p>You have been assigned to a new batch.</p>
                        <p><strong>Batch:</strong> {{data.batchName}}</p>
                        <p><strong>Course:</strong> {{data.course}}</p>
                        <p><strong>Timing:</strong> {{data.timing}}</p>
                    {{else if (eq type 'fee_reminder')}}
                        <p>A friendly reminder regarding your unpaid fee.</p>
                        <p><strong>Amount Due:</strong> ₹{{data.amount}}</p>
                        <p><strong>Due Date:</strong> {{data.dueDate}}</p>
                    {{else}}
                        <p>{{data.message}}</p>
                    {{/if}}
                </div>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                <p style="font-size: 0.85rem; color: #64748b; text-align: center;">
                    Regards,<br><strong>ABC Institute Management</strong>
                </p>
            </div>
        `;

        handlebars.registerHelper('eq', (a, b) => a === b);
        const compiledTemplate = handlebars.compile(templateSource);

        // Convert Mongoose document to plain object to avoid Handlebars prototype access restrictions
        const plainNotification = notification.toObject ? notification.toObject() : notification;
        const html = compiledTemplate(plainNotification);

        const mailOptions = {
            from: `"ABC Institute" <${process.env.GMAIL_USER}>`,
            to: plainNotification.recipientEmail,
            subject: plainNotification.subject,
            html: html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Email sent to ${notification.recipientEmail}: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error(`[EmailService] Error sending to ${notification.recipientEmail}:`, err);
        throw err;
    }
};

module.exports = { queueNotification, sendEmail };
