const Student = require('../models/Student');
const ExamResult = require('../models/ExamResult');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { triggerAutomaticNotification } = require('../services/notificationService');
const { JWT_SECRET } = require('../middleware/auth.middleware');

const createStudentToken = (studentId) => jwt.sign({ id: studentId, role: 'student' }, JWT_SECRET, { expiresIn: '2h' });

const getPortalAccessState = (student) => ({
    signupStatus: student.portalAccess?.signupStatus || 'no',
    signedUpAt: student.portalAccess?.signedUpAt || null,
    lastLoginAt: student.portalAccess?.lastLoginAt || null
});

const getNeedsSetup = (student) => {
    const signupStatus = student.portalAccess?.signupStatus || 'no';
    return signupStatus !== 'yes' || !student.profileImage;
};

const normalizeDeviceInfo = (payload = {}) => ({
    platform: String(payload.platform || '').trim(),
    model: String(payload.model || '').trim(),
    manufacturer: String(payload.manufacturer || '').trim(),
    appVersion: String(payload.appVersion || '').trim(),
    deviceId: String(payload.deviceId || '').trim()
});

const getActivityWindow = () => {
    const minutes = parseInt(process.env.ACTIVITY_UPDATE_MINUTES || '5', 10);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 5;
};

const toSafeProfile = (student) => {
    const profile = student.toObject();
    delete profile.password;
    return profile;
};

const getAttendanceSummary = async (studentId) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const rows = await Attendance.aggregate([
        {
            $match: {
                studentId,
                attendanceDate: { $gte: start, $lte: end }
            }
        },
        { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const present = rows.find((row) => row._id === 'Present')?.count || 0;
    const absent = rows.find((row) => row._id === 'Absent')?.count || 0;
    const late = rows.find((row) => row._id === 'Late')?.count || 0;
    const total = present + absent + late;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, absent, late, percentage };
};

exports.signup = async (req, res) => {
    try {
        const { rollNo, email, password, confirmPassword } = req.body;

        if (!rollNo || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: 'Roll number, email, password, and confirm password are required.' });
        }

        if (String(password).trim().length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match.' });
        }

        const normalizedRollNo = String(rollNo).trim().toUpperCase();
        const normalizedEmail = String(email).trim().toLowerCase();

        const student = await Student.findOne({ rollNo: normalizedRollNo });
        if (!student) {
            return res.status(404).json({ message: 'Student record not found for the provided roll number.' });
        }

        if (student.email && student.email !== normalizedEmail) {
            return res.status(400).json({ message: 'Email does not match the student record.' });
        }

        if (student.portalAccess?.signupStatus === 'yes') {
            return res.status(400).json({ message: 'Student account is already signed up. Please log in.' });
        }

        student.email = normalizedEmail;
        student.password = String(password).trim();
        student.portalAccess = {
            ...getPortalAccessState(student),
            signupStatus: 'yes',
            signedUpAt: new Date(),
            lastLoginAt: new Date()
        };

        await student.save();

        await triggerAutomaticNotification({
            studentId: student._id,
            eventType: 'studentRegistration',
            message: `Hello ${student.name}, your portal account has been activated successfully. Roll No: ${student.rollNo}`,
            data: {
                rollNo: student.rollNo
            }
        });

        res.status(201).json({
            message: 'Signup successful',
            token: createStudentToken(student._id),
            student: { ...toSafeProfile(student), needsSetup: getNeedsSetup(student) },
            phoneRequired: !student.contact
        });
    } catch (err) {
        console.error('[student.signup]', err);
        res.status(500).json({ message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const student = await Student.findOne({ email: String(email).toLowerCase().trim() });
        if (!student || !student.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, student.password);
        if (!valid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        student.portalAccess = {
            ...getPortalAccessState(student),
            lastLoginAt: new Date()
        };
        await student.save();

        const attendanceSummary = await getAttendanceSummary(student._id);

        logNotificationEvent({
            recipientEmail: student.email,
            recipientName: student.name,
            subject: 'New Login Alert',
            type: 'student_login',
            data: { time: new Date().toLocaleString(), ip: req.ip }
        }).catch((error) => console.error('[student.login.log]', error));

        res.json({
            message: 'Login successful',
            token: createStudentToken(student._id),
            student: { ...toSafeProfile(student), needsSetup: getNeedsSetup(student), attendanceSummary },
            phoneRequired: !student.contact
        });
    } catch (err) {
        console.error('[student.login]', err);
        res.status(500).json({ message: err.message });
    }
};

exports.completeSetup = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const student = await Student.findById(req.userId);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (!getNeedsSetup(student)) {
            return res.status(400).json({ message: 'Setup already completed' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Profile image is required' });
        }

        if (!newPassword || String(newPassword).trim().length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long' });
        }

        student.profileImage = req.file.path;
        student.password = String(newPassword).trim();
        student.portalAccess = {
            ...getPortalAccessState(student),
            signupStatus: 'yes',
            signedUpAt: student.portalAccess?.signedUpAt || new Date(),
            lastLoginAt: new Date()
        };

        await student.save();

        res.json({
            message: 'Setup completed successfully',
            student: {
                profileImage: student.profileImage,
                needsSetup: false
            }
        });
    } catch (err) {
        console.error('[student.completeSetup]', err);
        res.status(500).json({ message: err.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.userId)
            .select('-password')
            .populate('batchId', 'name subject');

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const attendanceSummary = await getAttendanceSummary(student._id);

        res.json({
            student,
            phoneRequired: !student.contact,
            attendanceSummary
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.updatePhone = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || !phone.trim()) {
            return res.status(400).json({ message: 'Phone number is required' });
        }

        const student = await Student.findById(req.userId).select('contact phoneLockedByAdmin');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (student.phoneLockedByAdmin) {
            return res.status(403).json({
                message: 'Phone number is managed by the admin and cannot be changed'
            });
        }

        if (student.contact) {
            return res.status(403).json({
                message: 'Phone number has already been set and cannot be changed'
            });
        }

        student.contact = phone.trim();
        await student.save();

        res.json({ message: 'Phone number added successfully', phone: student.contact });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.registerDevice = async (req, res) => {
    try {
        const { fcmToken } = req.body || {};
        if (!fcmToken || !String(fcmToken).trim()) {
            return res.status(400).json({ message: 'FCM token is required' });
        }

        const now = new Date();
        const token = String(fcmToken).trim();
        const deviceInfo = normalizeDeviceInfo(req.body);

        await Student.updateOne(
            { _id: req.userId },
            {
                $addToSet: { deviceTokens: token },
                $set: {
                    lastDevice: deviceInfo,
                    lastAppOpenAt: now,
                    lastActiveAt: now
                }
            }
        );

        console.info('[student.registerDevice]', {
            studentId: String(req.userId),
            platform: deviceInfo.platform || 'unknown',
            tokenTail: token.slice(-12),
            registeredAt: now.toISOString()
        });

        res.json({ message: 'Device registered', registeredAt: now.toISOString() });
    } catch (err) {
        console.error('[student.registerDevice]', err);
        res.status(500).json({ message: err.message });
    }
};

exports.trackActivity = async (req, res) => {
    try {
        const event = String(req.body?.event || 'heartbeat').toLowerCase();
        const now = new Date();
        const update = { $set: { lastActiveAt: now } };

        if (event === 'app_open') {
            update.$set.lastAppOpenAt = now;
        }

        const deviceInfo = normalizeDeviceInfo(req.body);
        const hasDevicePayload = Object.values(deviceInfo).some((val) => val);
        if (hasDevicePayload) {
            update.$set.lastDevice = deviceInfo;
        }

        if (event === 'app_open') {
            await Student.updateOne({ _id: req.userId }, update);
            console.info('[student.trackActivity]', {
                studentId: String(req.userId),
                event,
                platform: deviceInfo.platform || 'unknown',
                updated: true,
                recordedAt: now.toISOString()
            });
            return res.json({ message: 'Activity recorded', updated: true });
        }

        const minMinutes = getActivityWindow();
        const threshold = new Date(now.getTime() - minMinutes * 60 * 1000);

        const result = await Student.updateOne(
            {
                _id: req.userId,
                $or: [
                    { lastActiveAt: { $lt: threshold } },
                    { lastActiveAt: { $exists: false } },
                    { lastActiveAt: null }
                ]
            },
            update
        );

        const updated = result.modifiedCount > 0;
        if (updated) {
            console.info('[student.trackActivity]', {
                studentId: String(req.userId),
                event,
                platform: deviceInfo.platform || 'unknown',
                updated,
                recordedAt: now.toISOString()
            });
        }

        res.json({ message: 'Activity recorded', updated });
    } catch (err) {
        console.error('[student.trackActivity]', err);
        res.status(500).json({ message: err.message });
    }
};

exports.getPerformance = async (req, res) => {
    try {
        const studentId = req.userId;
        const student = await Student.findById(studentId).lean();
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const batchId = student.batchId;

        const myResults = await ExamResult.find({ studentId })
            .populate('examId')
            .sort({ 'examId.date': 1 })
            .lean();

        const history = myResults.map((result) => ({
            testName: result.examId?.name || 'Unknown',
            subject: result.examId?.subject || 'Unknown',
            chapter: result.examId?.chapter || '',
            date: result.examId?.date,
            marks: result.marksObtained,
            maxMarks: result.examId?.totalMarks || 100,
            percentage: result.examId?.totalMarks ? (result.marksObtained / result.examId.totalMarks) * 100 : 0,
            isPresent: result.isPresent
        }));

        const presentTests = history.filter((item) => item.isPresent);
        const percentages = presentTests.map((item) => item.percentage);
        const avg = percentages.length ? (percentages.reduce((sum, value) => sum + value, 0) / percentages.length) : 0;

        let improvement = 0;
        if (presentTests.length >= 2) {
            const current = presentTests[presentTests.length - 1].percentage;
            const previous = presentTests[presentTests.length - 2].percentage;
            improvement = parseFloat((current - previous).toFixed(2));
        }

        const batchResults = await ExamResult.find({ batchId, isPresent: true })
            .populate('examId')
            .lean();

        const studentAverages = {};
        const subjectAverages = {};

        batchResults.forEach((result) => {
            if (!result.examId) return;
            const sid = result.studentId.toString();
            const subject = result.examId.subject;
            const maxMarks = result.examId.totalMarks || 100;
            const percentage = (result.marksObtained / maxMarks) * 100;

            if (!studentAverages[sid]) studentAverages[sid] = { totalPerc: 0, count: 0 };
            studentAverages[sid].totalPerc += percentage;
            studentAverages[sid].count += 1;

            if (!subjectAverages[subject]) subjectAverages[subject] = {};
            if (!subjectAverages[subject][sid]) subjectAverages[subject][sid] = { totalPerc: 0, count: 0 };
            subjectAverages[subject][sid].totalPerc += percentage;
            subjectAverages[subject][sid].count += 1;
        });

        const overallAverages = Object.keys(studentAverages)
            .map((sid) => ({
                studentId: sid,
                avg: studentAverages[sid].totalPerc / studentAverages[sid].count
            }))
            .sort((a, b) => b.avg - a.avg);

        const overallRank = overallAverages.findIndex((entry) => entry.studentId === studentId.toString()) + 1;

        const subjectRanks = {};
        Object.keys(subjectAverages).forEach((subject) => {
            const subjectAverage = Object.keys(subjectAverages[subject])
                .map((sid) => ({
                    studentId: sid,
                    avg: subjectAverages[subject][sid].totalPerc / subjectAverages[subject][sid].count
                }))
                .sort((a, b) => b.avg - a.avg);

            const rank = subjectAverage.findIndex((entry) => entry.studentId === studentId.toString()) + 1;
            if (rank > 0) {
                subjectRanks[subject] = rank;
            }
        });

        const totalStudentsInBatch = await Student.countDocuments({ batchId, status: 'active' });

        res.json({
            history,
            stats: {
                avgScore: parseFloat(avg.toFixed(2)),
                totalTests: history.length,
                improvement
            },
            ranks: {
                overall: overallRank > 0 ? overallRank : null,
                subjects: subjectRanks
            },
            totalStudentsInBatch
        });
    } catch (err) {
        console.error('[student.getPerformance]', err);
        res.status(500).json({ message: err.message });
    }
};
