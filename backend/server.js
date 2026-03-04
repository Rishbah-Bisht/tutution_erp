const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const rateLimit = require('express-rate-limit');

const adminRoutes = require('./routes/adminRoutes');
const adminWorkRoutes = require('./routes/admin.work');
const studentRoutes = require('./routes/student.routes');
const feeRoutes = require('./routes/fee.routes');
const batchRoutes = require('./routes/batch.routes');
const schedulerRoutes = require('./routes/scheduler.routes');
const settingsRoutes = require('./routes/settings.routes');
const teacherRoutes = require('./routes/teacher.routes');
const teacherPayrollRoutes = require('./routes/teacher.payroll.routes');
const expenseRoutes = require('./routes/expense.routes');
const eventRoutes = require('./routes/event.routes');
const notificationRoutes = require('./routes/notification.routes');
const examRoutes = require('./routes/exam.routes');

const { initFeeScheduler, initSalaryScheduler, initReminderScheduler } = require('./utils/scheduler');
const { startWorker: startNotificationWorker } = require('./services/notificationQueue');
// Portal auth routes
const studentAuthRoutes = require('./routes/student.auth.routes');
const teacherAuthRoutes = require('./routes/teacher.auth.routes');

const app = express();

// Schedulers and Workers
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    startNotificationWorker();
    console.log('[NotificationQueue] Background worker initialized with Gmail credentials.');
} else {
    console.warn('[NotificationQueue] Warning: GMAIL_USER or GMAIL_APP_PASSWORD not set. Emails will be queued but not sent.');
}

if (process.env.NODE_ENV !== 'production') {
    initFeeScheduler();
    initSalaryScheduler();
    initReminderScheduler();
}

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://tutution-erp-demo.vercel.app',
    'https://tutution-erp-frontend.vercel.app',
    process.env.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Global security middleware
const cleanObj = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
            const safeKey = key.replace(/^\$|\./g, '_');
            obj[safeKey] = obj[key];
            delete obj[key];
        }
        if (typeof obj[key] === 'object') cleanObj(obj[key]);
    }
    return obj;
};
app.use((req, res, next) => {
    if (req.body) cleanObj(req.body);
    if (req.query) cleanObj(req.query);
    if (req.params) cleanObj(req.params);
    next();
});

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // limit each IP to 200 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api', globalLimiter); // Apply to all /api routes

// Serve uploaded teacher images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth Routes
app.use('/admin', adminRoutes);

// API Routes (admin ERP)
app.use('/api/admin', adminWorkRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/payroll', teacherPayrollRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/exams', examRoutes);

// Portal auth routes
app.use('/api/student', studentAuthRoutes);
app.use('/api/teacher', teacherAuthRoutes);

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Export for Vercel serverless
module.exports = app;

// Start server only in local development (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
}
