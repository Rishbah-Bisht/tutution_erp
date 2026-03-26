// Triggering restart for ERP wipe feature debug
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
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
const examRoutes = require('./routes/exam.routes');
const notificationRoutes = require('./routes/notificationRoutes');
const attendanceRoutes = require('./routes/attendance.routes');
const subjectRoutes = require('./routes/subject.routes');
const templateRoutes = require('./routes/templateRoutes');
const teacherPortalRoutes = require('./routes/teacher.portal.routes');

const { initFeeScheduler, initSalaryScheduler, initReminderScheduler, initScheduler } = require('./utils/scheduler');
// Portal auth routes
const studentAuthRoutes = require('./routes/student.auth.routes');
const teacherAuthRoutes = require('./routes/teacher.auth.routes');

const app = express();

// Trust proxy for rate limiting on Vercel/proxies
app.set('trust proxy', 1);

if (process.env.NODE_ENV !== 'production') {
    initFeeScheduler();
    initSalaryScheduler();
    initReminderScheduler();
    initScheduler();
}

// Middleware
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174', // Added for user's current frontend port
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
const cleanObj = (obj, seen = new WeakSet()) => {
    if (!obj || typeof obj !== 'object' || seen.has(obj)) return obj;
    seen.add(obj);

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (key.startsWith('$') || key.includes('.')) {
                const safeKey = key.replace(/^\$|\./g, '_');
                obj[safeKey] = obj[key];
                delete obj[key];
                if (typeof obj[safeKey] === 'object') cleanObj(obj[safeKey], seen);
            } else if (typeof obj[key] === 'object') {
                cleanObj(obj[key], seen);
            }
        }
    }
    return obj;
};

app.use((req, res, next) => {
    try {
        if (req.body) cleanObj(req.body);
        if (req.query) cleanObj(req.query);
        if (req.params) cleanObj(req.params);
    } catch (err) {
        console.error("CleanObj Error", err);
    }
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

// API Routes
app.use('/api/admin', adminRoutes); // Auth & basic profile
app.use('/api/admin', adminWorkRoutes); // Work/Dashboard data
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/payroll', teacherPayrollRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/teacher-portal', teacherPortalRoutes);

// Portal auth routes
app.use('/api/student', studentAuthRoutes);
app.use('/api/teacher', teacherAuthRoutes);

// Database Connection
connectDB().then(() => {
    // Seed templates if needed
    require('./controllers/template.controller').seedDefaults();
});

// 404 Handler for API
app.use('/api', (req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// Error handling middleware
app.use(errorHandler);

// Export for Vercel serverless
module.exports = app;

// Start server only in local development (not on Vercel)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
}
