const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Fee = require('../models/Fee');
const Batch = require('../models/Batch');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');
const emailService = require('../services/emailService');
const { DEFAULT_THEME_COLORS, normalizeThemeColors } = require('../utils/themePalette');
const { clearAuthCookie, setAuthCookie, signAuthToken } = require('../utils/authTokens');
const { clearAdminLoginFailures, recordAdminLoginFailure } = require('../middleware/adminLoginRateLimit');
const { ADMIN_ROLES, normalizeAdminRole } = require('../utils/adminRoles');

const parseThemeColors = (value) => {
    if (!value) return [...DEFAULT_THEME_COLORS];

    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return normalizeThemeColors(parsed);
    } catch (_error) {
        return [...DEFAULT_THEME_COLORS];
    }
};

const buildAdminPayload = (admin) => ({
    adminName: admin.adminName,
    coachingName: admin.coachingName,
    email: admin.email,
    instituteLogo: admin.instituteLogo,
    role: normalizeAdminRole(admin.role)
});

// Check if admin exists
exports.checkAdmin = async (req, res) => {
    try {
        const adminCount = await Admin.countDocuments();
        res.status(200).json({ exists: adminCount > 0 });
    } catch (error) {
        console.error('[CheckAdminError]', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Signup Logic
exports.signup = async (req, res) => {
    try {
        const {
            adminName, coachingName, email, password, roomsAvailable,
            registrationNumber, classesOffered, phone, bio, themeColors,
            instituteAddress, instituteEmail, institutePhone
        } = req.body;

        const adminExists = await Admin.countDocuments() > 0;
        if (adminExists) {
            return res.status(400).json({ message: 'Admin already exists. Please login.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let instituteLogo = '';
        if (req.file) {
            instituteLogo = req.file.path;
        }

        let parsedClasses = [];
        try { if (classesOffered) parsedClasses = JSON.parse(classesOffered); } catch (e) { }

        const admin = new Admin({
            adminName,
            coachingName,
            email,
            phone: phone || '',
            bio: bio || '',
            password: hashedPassword,
            roomsAvailable: Number(roomsAvailable) || 0,
            registrationNumber: registrationNumber || undefined,
            classesOffered: parsedClasses,
            instituteLogo,
            role: ADMIN_ROLES.SUPERADMIN,
            themeColors: parseThemeColors(themeColors),
            instituteAddress: instituteAddress || '',
            instituteEmail: instituteEmail || '',
            institutePhone: institutePhone || ''
        });

        await admin.save();
        res.status(201).json({ message: 'Admin account created successfully' });
    } catch (error) {
        console.error('[SignupError]', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Login Logic
exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({ message: 'Identifier and password are required' });
        }
        console.log('[Login] Attempt for identifier:', identifier);
        const admin = await Admin.findOne({
            $or: [{ adminName: identifier }, { email: identifier }]
        });

        if (!admin) {
            console.warn('[Login] Admin not found for:', identifier);
            await recordAdminLoginFailure(req.adminLoginRateLimitKey);
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            console.warn('[Login] Password mismatch for:', identifier);
            await recordAdminLoginFailure(req.adminLoginRateLimitKey);
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        console.log('[Login] Success for:', identifier);

        await clearAdminLoginFailures(req.adminLoginRateLimitKey);

        const token = signAuthToken({
            id: admin._id,
            role: 'admin',
            adminRole: normalizeAdminRole(admin.role)
        });
        setAuthCookie(res, 'admin', token);

        res.status(200).json({
            admin: buildAdminPayload(admin)
        });
    } catch (error) {
        console.error('[LoginError]', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.logout = async (_req, res) => {
    clearAuthCookie(res, 'admin');
    res.status(200).json({ message: 'Logged out successfully' });
};

// Get Admin Profile
exports.getProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password');
        if (!admin) return res.status(404).json({ message: 'Admin not found' });
        res.json(admin);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update Admin Profile
exports.updateProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const {
            adminName, coachingName, email, phone, bio, adminPassword,
            roomsAvailable, registrationNumber, classesOffered, themeColors,
            instituteAddress, instituteEmail, institutePhone
        } = req.body;

        const valid = await bcrypt.compare(adminPassword, admin.password);
        if (!valid) return res.status(401).json({ message: 'Incorrect password' });

        let parsedClasses = admin.classesOffered;
        try { if (classesOffered) parsedClasses = JSON.parse(classesOffered); } catch (e) { }

        if (adminName) admin.adminName = adminName;
        if (coachingName) admin.coachingName = coachingName;
        if (email !== undefined) admin.email = email;
        if (phone !== undefined) admin.phone = phone;
        if (bio !== undefined) admin.bio = bio;
        if (roomsAvailable) admin.roomsAvailable = roomsAvailable;
        if (registrationNumber !== undefined) admin.registrationNumber = registrationNumber || undefined;
        admin.classesOffered = parsedClasses;

        if (instituteAddress !== undefined) admin.instituteAddress = instituteAddress;
        if (instituteEmail !== undefined) admin.instituteEmail = instituteEmail;
        if (institutePhone !== undefined) admin.institutePhone = institutePhone;
        if (themeColors !== undefined) admin.themeColors = parseThemeColors(themeColors);

        if (req.file) {
            admin.instituteLogo = req.file.path;
        }

        await admin.save();

        const updatedAdmin = admin.toObject();
        delete updatedAdmin.password;

        res.json({ message: 'Profile updated successfully', admin: updatedAdmin });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Update Settings
exports.updateSettings = async (req, res) => {
    try {
        const admin = await Admin.findById(req.admin.id).select('-password');
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const { fcmServerKey, gmailEmail, gmailAppPassword, notificationsEnabled, emailEvents, pushEvents, receiptSettings } = req.body;

        if (fcmServerKey !== undefined) admin.fcmServerKey = fcmServerKey;
        if (gmailEmail !== undefined) admin.gmailEmail = gmailEmail;
        if (gmailAppPassword !== undefined) admin.gmailAppPassword = gmailAppPassword;
        if (notificationsEnabled !== undefined) admin.notificationsEnabled = notificationsEnabled;
        if (emailEvents !== undefined) {
            admin.emailEvents = { ...admin.emailEvents, ...emailEvents };
        }
        if (pushEvents !== undefined) {
            admin.pushEvents = { ...admin.pushEvents, ...pushEvents };
        }
        if (receiptSettings !== undefined) {
            admin.receiptSettings = { ...admin.receiptSettings, ...receiptSettings };
        }

        await admin.save();

        res.json({ message: 'Settings updated successfully', admin });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get Database Stats
exports.getDatabaseStats = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const stats = await mongoose.connection.db.stats();

        const atlasLimitMB = 512;
        const storageSizeMB = (stats.storageSize / (1024 * 1024)).toFixed(2);
        const dataSizeMB = (stats.dataSize / (1024 * 1024)).toFixed(2);
        const usagePercentage = ((storageSizeMB / atlasLimitMB) * 100).toFixed(2);

        res.json({
            dbName: stats.db,
            collections: stats.collections,
            objects: stats.objects,
            dataSizeMB,
            storageSizeMB,
            limitMB: atlasLimitMB,
            usagePercentage: Math.min(usagePercentage, Number(usagePercentage)) > 100 ? 100 : usagePercentage
        });
    } catch (error) {
        console.error('[DBStatsError]', error);
        res.status(500).json({ message: 'Failed to fetch database stats', error: error.message });
    }
};

// Execute Database Wipe
exports.wipeDatabase = async (req, res) => {
    try {
        const password = String(req.body.password || '').trim();

        const admin = await Admin.findById(req.admin.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found.' });

        // Verify Password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid admin password.' });

        // Delete all data EXCEPT Admin
        await Promise.all([
            Student.deleteMany({}),
            Teacher.deleteMany({}),
            Fee.deleteMany({}),
            Batch.deleteMany({}),
            AuditLog.deleteMany({})
        ]);

        // Clear OTP fields anyway for clean state
        admin.wipeOtp = null;
        admin.wipeOtpExpiry = null;
        await admin.save();

        res.json({ message: 'Database wiped successfully. All student, teacher, batch, and fee records have been deleted.' });
    } catch (err) {
        console.error('[WipeDatabase Error]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
