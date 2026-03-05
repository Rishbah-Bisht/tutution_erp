const Teacher = require('../models/Teacher');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { TeacherSalaryProfile } = require('../models/TeacherPayroll');

const { JWT_SECRET } = require('../middleware/auth.middleware');

// ── POST /api/teacher/login ───────────────────────────────────────────────────
exports.login = async (req, res) => {
    try {
        const { regNo, password } = req.body;
        if (!regNo || !password)
            return res.status(400).json({ message: 'Employee ID and password are required' });

        const teacher = await Teacher.findOne({ regNo: regNo.trim() });
        if (!teacher || !teacher.password)
            return res.status(401).json({ message: 'Invalid credentials' });

        const valid = await bcrypt.compare(password, teacher.password);
        if (!valid)
            return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: teacher._id, role: 'teacher' }, JWT_SECRET, { expiresIn: '2h' });

        const profile = teacher.toObject();
        delete profile.password;

        res.json({ message: 'Login successful', token, teacher: profile });
    } catch (err) {
        console.error('[teacher.login]', err);
        res.status(500).json({ message: err.message });
    }
};

// ── GET /api/teacher/profile ─────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
    try {
        const teacher = await Teacher.findById(req.userId)
            .select('-password')
            .populate('assignments.batchId', 'name');

        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        // Fetch bank details from TeacherSalaryProfile
        const salaryProfile = await TeacherSalaryProfile.findOne({ teacherId: req.userId });

        res.json({
            teacher,
            bankDetails: salaryProfile?.bankDetails || {}
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── PATCH /api/teacher/bank-details ──────────────────────────────────────────
exports.updateBankDetails = async (req, res) => {
    try {
        const { bankName, upiId, ifscCode, accountName, accountNumber } = req.body;

        let profile = await TeacherSalaryProfile.findOne({ teacherId: req.userId });

        if (profile) {
            profile.bankDetails = {
                ...profile.bankDetails,
                bankName: bankName || profile.bankDetails?.bankName,
                upiId: upiId || profile.bankDetails?.upiId,
                ifscCode: ifscCode || profile.bankDetails?.ifscCode,
                accountName: accountName || profile.bankDetails?.accountName,
                accountNumber: accountNumber || profile.bankDetails?.accountNumber
            };
            profile.updatedAt = Date.now();
            await profile.save();
        } else {
            // If no profile exists, create one with default base salary 0
            profile = new TeacherSalaryProfile({
                teacherId: req.userId,
                baseSalary: 0,
                bankDetails: { bankName, upiId, ifscCode, accountName, accountNumber }
            });
            await profile.save();
        }

        res.json({ message: 'Bank details updated successfully', bankDetails: profile.bankDetails });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// ── PATCH /api/teacher/phone ──────────────────────────────────────────────────
// Teachers can add or update their phone freely.
exports.updatePhone = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !phone.trim())
            return res.status(400).json({ message: 'Phone number is required' });

        const teacher = await Teacher.findByIdAndUpdate(
            req.userId,
            { phone: phone.trim() },
            { new: true }
        ).select('-password');

        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        res.json({ message: 'Phone updated successfully', phone: teacher.phone, teacher });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
