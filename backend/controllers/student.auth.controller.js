const Student = require('../models/Student');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { JWT_SECRET } = require('../middleware/auth.middleware');

// ── POST /api/student/login ───────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password are required' });

        const student = await Student.findOne({ email: email.toLowerCase().trim() });
        if (!student || !student.password)
            return res.status(401).json({ message: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, student.password);
        if (!valid)
            return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: student._id, role: 'student' }, JWT_SECRET, { expiresIn: '2h' });

        // Send profile without password
        const profile = student.toObject();
        delete profile.password;

        res.json({
            message: 'Login successful',
            token,
            student: profile,
            // Prompt frontend if phone is missing
            phoneRequired: !student.contact,
        });
    } catch (err) {
        console.error('[student.login]', err);
        res.status(500).json({ message: err.message });
    }
};

// ── GET /api/student/profile ─────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.userId)
            .select('-password')
            .populate('batchId', 'name subject');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        res.json({
            student,
            phoneRequired: !student.contact,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── PATCH /api/student/phone ──────────────────────────────────────────────────
// Students may add their phone ONCE.
// If admin already set it (phoneLockedByAdmin === true), it is read-only.
exports.updatePhone = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !phone.trim())
            return res.status(400).json({ message: 'Phone number is required' });

        const student = await Student.findById(req.userId).select('contact phoneLockedByAdmin');
        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Blocked: admin locked it
        if (student.phoneLockedByAdmin)
            return res.status(403).json({
                message: 'Phone number is managed by the admin and cannot be changed',
            });

        // Blocked: student already set it once
        if (student.contact)
            return res.status(403).json({
                message: 'Phone number has already been set and cannot be changed',
            });

        student.contact = phone.trim();
        await student.save();

        res.json({ message: 'Phone number added successfully', phone: student.contact });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
