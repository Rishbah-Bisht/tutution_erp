const mongoose = require('mongoose');
const NotificationTemplate = require('./models/NotificationTemplate');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const getHtmlWrapper = (title, icon, content) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* Base Resets & Fonts */
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; 
            line-height: 1.6; 
            color: #3f3f46; /* zinc-700 */
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f5; /* zinc-100 */
            -webkit-font-smoothing: antialiased;
        }

        /* Main Wrapper */
        .wrapper {
            padding: 40px 20px;
            width: 100%;
            box-sizing: border-box;
        }

        /* Card Container */
        .container { 
            max-width: 560px; 
            margin: 0 auto; 
            background: #ffffff; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04), 0 0 1px rgba(0, 0, 0, 0.1); 
            border: 1px solid #e4e4e7; /* zinc-200 */
        }

        /* Header / Logo Area */
        .header { 
            padding: 32px 40px 0; 
            background-color: #ffffff; 
        }

        .logo {
            display: block;
            height: 32px;
            width: auto;
            margin-bottom: 24px;
            border: 0;
        }

        .institute-brand {
            display: inline-block;
            font-size: 13px;
            font-weight: 700;
            color: #000000;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 6px 12px;
            background-color: #f4f4f5;
            border-radius: 6px;
            margin-bottom: 24px;
        }

        /* Title */
        .title { 
            font-size: 22px; 
            font-weight: 700; 
            color: #18181b; /* zinc-900 */
            margin: 0 0 8px 0; 
            letter-spacing: -0.02em;
        }

        /* Content Area */
        .content { 
            padding: 8px 40px 40px; 
            background-color: #ffffff; 
        }

        .greeting { 
            font-size: 16px; 
            font-weight: 500; 
            color: #18181b; 
            margin-top: 16px;
            margin-bottom: 12px; 
        }

        .message { 
            font-size: 15px; 
            color: #52525b; /* zinc-600 */
            line-height: 1.6;
            margin-bottom: 32px; 
        }

        /* Call to Action Button */
        .btn-wrapper {
            margin-top: 16px;
        }

        .btn { 
            display: inline-block; 
            padding: 12px 28px; 
            background-color: #18181b; /* strict black */
            color: #ffffff !important; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 500; 
            font-size: 14px; 
            transition: background-color 0.2s;
        }

        .btn:hover {
            background-color: #27272a;
        }

        /* Divider */
        .divider {
            height: 1px;
            background-color: #f4f4f5;
            margin: 32px 0;
        }

        /* Footer (Outside the box) */
        .footer { 
            max-width: 560px; 
            margin: 24px auto 0;
            text-align: center; 
            font-size: 13px; 
            color: #a1a1aa; /* zinc-400 */
            line-height: 1.5;
            padding: 0 20px;
        }

        .footer p {
            margin: 4px 0;
        }

        .footer a {
            color: #a1a1aa;
            text-decoration: underline;
        }

        /* Responsive */
        @media only screen and (max-width: 600px) {
            .wrapper { padding: 20px 10px; }
            .header { padding: 24px 24px 0; }
            .content { padding: 8px 24px 32px; }
            .title { font-size: 20px; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <!-- Main Card -->
        <div class="container">
            <div class="header">
                <!-- Institute Logo -->
                <img src="{{instituteLogo}}" alt="Logo" class="logo">
                
                <!-- SaaS style subtle brand pill -->
                <div class="institute-brand">{{instituteName}}</div>
                <h1 class="title">${title}</h1>
            </div>
            
            <div class="content">
                <div class="greeting">Hi {{studentName}}{{teacherName}},</div>
                
                <div class="message">
                    ${content}
                </div>
                
                <div class="btn-wrapper">
                    <!-- Left aligned buttons perform better in transactional emails -->
                    <a href="#" class="btn">View Details in Our Student App </a>
                </div>

                <div class="divider"></div>

                <!-- Optional secondary text inside card -->
                <div style="font-size: 13px; color: #71717a;">
                    If you have any questions or need assistance, simply reply to this email or reach out to our support team.
                </div>
            </div>
        </div>

        <!-- Footer outside the card for clean separation -->
        <div class="footer">
            <p>&copy; 2026 {{instituteName}}. All rights reserved.</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
`;

const templates = [
    {
        name: 'Standard Fee Generated',
        eventType: 'feeGenerated',

        subject: 'New Fee Generated - {{instituteName}}',
        body: getHtmlWrapper('New Fee Issued', '💰', 'A new fee record has been generated for your account. Please ensure timely payment to avoid any late marks.'),

        subjectPush: 'New Fee Generated',
        bodyPush: 'Dear {{studentName}}, your fee of ₹{{amount}} for {{month}} {{year}} is generated. Due: {{dueDate}}.',
        placeholders: ['studentName', 'amount', 'month', 'year', 'dueDate', 'instituteName']
    },
    {
        name: 'Standard Fee Payment',
        eventType: 'feePayment',
        subject: 'Fee Payment Received - {{instituteName}}',
        body: getHtmlWrapper('Payment Receipt', '✅', 'We have successfully received your payment. Your digital receipt has been attached to this email for your records.'),
        subjectPush: 'Fee Payment Received',
        bodyPush: 'Payment of ₹{{amountPaid}} received for {{studentName}}. Receipt: {{receiptNo}}.',
        placeholders: ['studentName', 'amountPaid', 'receiptNo', 'instituteName']
    },
    {
        name: 'Standard Batch Assignment',
        eventType: 'batchAssignment',
        subject: 'Batch Assigned - {{instituteName}}',
        body: getHtmlWrapper('New Batch Assigned', '📅', 'You have been assigned to a new academic batch. Please check your schedule and timings in your portal.'),
        subjectPush: 'New Batch Assigned',
        bodyPush: '{{studentName}}, you have been assigned to batch: {{batchName}} ({{timing}}).',
        placeholders: ['studentName', 'batchName', 'timing', 'instituteName']
    },
    {
        name: 'Standard Fee Overdue',
        eventType: 'feeOverdue',
        subject: 'URGENT: Fee Overdue - {{instituteName}}',
        body: getHtmlWrapper('Fee Overdue Alert', '⚠️', 'Your current fee balance is overdue. Please clear the pending dues immediately to maintain active status.'),
        subjectPush: 'Fee Overdue Alert',
        bodyPush: 'URGENT: Fee of ₹{{pendingAmount}} for {{month}} is overdue. Please pay now.',
        placeholders: ['studentName', 'pendingAmount', 'month', 'instituteName']
    },
    {
        name: 'Standard Exam Result',
        eventType: 'examResult',
        subject: 'Exam Result Announced - {{instituteName}}',
        body: getHtmlWrapper('Exam Results Out', '🏆', 'The results for your recent examination have been announced. Congratulations on your performance!'),
        subjectPush: 'Exam Result Out',
        bodyPush: '{{studentName}}, results for {{examName}} are out. You scored {{score}}/{{totalMarks}}.',
        placeholders: ['studentName', 'examName', 'examDate', 'score', 'totalMarks', 'passStatus', 'instituteName']
    },
    {
        name: 'Standard Test Announcement',
        eventType: 'testAnnouncement',
        subject: 'New Test Scheduled - {{instituteName}}',
        body: getHtmlWrapper('New Test Scheduled', '📝', 'A new assessment has been scheduled. Please prepare well and review the syllabus in your portal.'),
        subjectPush: 'New Test Scheduled',
        bodyPush: '{{examName}} scheduled for {{subject}} on {{date}}. Best of luck!',
        placeholders: ['studentName', 'examName', 'subject', 'date', 'totalMarks', 'instituteName']
    },
    {
        name: 'Student Registration',
        eventType: 'studentRegistration',
        subject: 'Welcome to {{instituteName}}',
        body: getHtmlWrapper('Welcome Aboard!', '🚀', `
            Your registration is successful. We are excited to have you join our community! <br><br>
            <strong>Your Account Information:</strong><br>
            • <strong>Student Name:</strong> {{studentName}}<br>
            • <strong>Roll Number:</strong> {{rollNo}}<br><br>
            • <strong>Password :</strong> STU@123 <br><br>
            Please use your Roll Number to log in to the student portal and complete your profile.
        `),
        subjectPush: 'Welcome to ERP',
        bodyPush: 'Welcome {{studentName}}! Your registration is successful. Roll No: {{rollNo}}.',
        placeholders: ['studentName', 'rollNo', 'instituteName']
    },
    {
        name: 'Teacher Registration',
        eventType: 'teacherRegistration',
        subject: 'Welcome to Faculty Team - {{instituteName}}',
        body: getHtmlWrapper('Welcome to the Team', '👨‍🏫', `
            Your faculty account has been created successfully. Welcome to the team at {{instituteName}}! <br><br>
            <strong>Account Details:</strong><br>
            • <strong>Faculty Name:</strong> {{teacherName}}<br>
            • <strong>Link:</strong> Faculty Portal<br><br>
            We are excited to have you with us. Please log in to complete your profile and view your assigned batches.
        `),
        subjectPush: 'Teacher Account Created',
        bodyPush: 'Welcome {{teacherName}}! Your teacher account has been created.',
        placeholders: ['teacherName', 'instituteName']
    },
    {
        name: 'Salary Paid',
        eventType: 'salaryPaid',
        subject: 'Salary Processed - {{instituteName}}',
        body: getHtmlWrapper('Salary Processed', '💸', 'Your salary for the current month has been successfully processed and credited.'),
        subjectPush: 'Salary Credited',
        bodyPush: 'Salary for {{month}} processed for {{teacherName}}. Amount: ₹{{amount}}.',
        placeholders: ['teacherName', 'month', 'year', 'amount', 'status', 'instituteName']
    },
    {
        name: 'Teacher Batch Assignment',
        eventType: 'teacherBatchAssignment',
        subject: 'New Batch Assigned - {{instituteName}}',
        body: getHtmlWrapper('New Teaching Batch', '📚', 'A new batch has been assigned to your teaching schedule. Please review the student list and timings.'),
        subjectPush: 'New Batch Assigned',
        bodyPush: '{{teacherName}}, you have been assigned a new batch: {{batchName}}.',
        placeholders: ['teacherName', 'batchName', 'instituteName']
    },
    {
        name: 'Standard Surcharge Added',
        eventType: 'surchargeAdded',
        subject: 'Additional Expense/Surcharge Added - {{instituteName}}',
        body: getHtmlWrapper('Additional Expense Added', '⚖️', 'An additional expense or surcharge has been added to your current fee ledger. Please check your portal for details.'),
        subjectPush: 'Surcharge Added',
        bodyPush: 'Additional charge of ₹{{amount}} ({{title}}) added for {{month}} {{year}}.',
        placeholders: ['studentName', 'amount', 'title', 'month', 'year', 'instituteName']
    }
];

const seedTemplates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const templateData of templates) {
            await NotificationTemplate.findOneAndUpdate(
                { eventType: templateData.eventType },
                templateData,
                { upsert: true, new: true }
            );
            console.log(`Template for ${templateData.eventType} seeded.`);
        }

        console.log('All templates seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding templates:', error);
        process.exit(1);
    }
};

seedTemplates();
