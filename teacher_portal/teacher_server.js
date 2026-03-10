const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Reuse Models from the main backend
const Teacher = require('../backend/models/Teacher');
const { TeacherSalaryProfile } = require('../backend/models/TeacherPayroll');
const Exam = require('../backend/models/Exam');
const ExamResult = require('../backend/models/ExamResult');
const Batch = require('../backend/models/Batch');
const Student = require('../backend/models/Student');

const app = express();
const PORT = process.env.TEACHER_PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Teacher Server connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// --- Auth Middleware ---
const verifyTeacher = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ message: 'No token provided' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// --- Routes ---

// Login
app.post('/api/teacher/login', async (req, res) => {
    try {
        const { regNo, password } = req.body;
        if (!regNo || !password) {
            return res.status(400).json({ message: 'Unique ID (Reg No) and password are required' });
        }

        const teacher = await Teacher.findOne({ regNo: regNo.trim() });
        if (!teacher || !teacher.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, teacher.password);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: teacher._id, role: 'teacher' }, JWT_SECRET, { expiresIn: '2h' });

        const profile = teacher.toObject();
        delete profile.password;

        res.json({ message: 'Login successful', token, teacher: profile });
    } catch (err) {
        console.error('[teacher.login]', err);
        res.status(500).json({ message: err.message });
    }
});

// Profile
app.get('/api/teacher/profile', verifyTeacher, async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.userId)
            .select('-password')
            .populate('assignments.batchId', 'name');

        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        const salaryProfile = await TeacherSalaryProfile.findOne({ teacherId: req.userId });

        res.json({
            teacher,
            bankDetails: salaryProfile?.bankDetails || {}
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Exam Analytics ---
app.get('/api/exams/batch/:batchId/analytics', verifyTeacher, async (req, res) => {
    try {
        const { batchId } = req.params;
        const results = await ExamResult.find({ batchId });

        if (results.length === 0) {
            return res.json({ avgScore: 0, highestScore: 0, lowestScore: 0, appeared: 0 });
        }

        const scores = results.map(r => r.marksObtained);
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

        res.json({
            avgScore: avg,
            highestScore: Math.max(...scores),
            lowestScore: Math.min(...scores),
            appeared: results.length
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/exams/batch/:batchId/improvers', verifyTeacher, async (req, res) => {
    try {
        const { batchId } = req.params;
        // Mock improved students for demo (Ideally compare with previous tests)
        const students = await Student.find({ batchId }).limit(5);
        const improvers = students.map(s => ({
            name: s.name,
            improvement: Math.floor(Math.random() * 15) + 5,
            current: Math.floor(Math.random() * 20) + 70
        }));

        res.json({ improvers: improvers.sort((a, b) => b.improvement - a.improvement) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/exams/batch/:batchId/top-scorers', verifyTeacher, async (req, res) => {
    try {
        const { batchId } = req.params;
        const results = await ExamResult.find({ batchId })
            .populate('studentId', 'name')
            .sort({ marksObtained: -1 })
            .limit(10);

        const scorers = results.map(r => ({
            name: r.studentId?.name || 'Unknown',
            avgScore: r.marksObtained,
            testsTaken: 1 // Simple mock
        }));

        res.json({ scorers });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Teacher Server running on port ${PORT}`);
});
