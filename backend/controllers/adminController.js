const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Check if admin exists
exports.checkAdmin = async (req, res) => {
    try {
        const adminCount = await Admin.countDocuments();
        res.status(200).json({ exists: adminCount > 0 });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Signup Logic
exports.signup = async (req, res) => {
    try {
        const {
            adminName, coachingName, email, password, roomsAvailable,
            registrationNumber, classesOffered, phone, bio,
            instituteAddress, instituteEmail, institutePhone
        } = req.body;

        // 1. Check if admin already exists
        const adminExists = await Admin.countDocuments() > 0;
        if (adminExists) {
            return res.status(400).json({ message: 'Admin already exists. Please login.' });
        }

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let instituteLogo = '';
        if (req.file) {
            instituteLogo = req.file.path;
        }

        // Parse stringified arrays if sent from FormData
        let parsedClasses = [];
        try { if (classesOffered) parsedClasses = JSON.parse(classesOffered); } catch (e) { }

        // 3. Create Admin
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
        const { identifier, password } = req.body; // identifier can be adminName or email

        // 1. Find admin by name or email
        const admin = await Admin.findOne({
            $or: [{ adminName: identifier }, { email: identifier }]
        });

        if (!admin) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 2. Compare password
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 3. Generate JWT
        const token = jwt.sign(
            { id: admin._id },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '2h' }
        );

        res.status(200).json({
            token,
            admin: {
                adminName: admin.adminName,
                coachingName: admin.coachingName,
                email: admin.email,
                instituteLogo: admin.instituteLogo
            }
        });
    } catch (error) {
        console.error('[LoginError]', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
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
            roomsAvailable, registrationNumber, themeColors, classesOffered,
            instituteAddress, instituteEmail, institutePhone, emailNotificationsEnabled
        } = req.body;

        // Verify password for sensitive changes
        const valid = await bcrypt.compare(adminPassword, admin.password);
        if (!valid) return res.status(401).json({ message: 'Incorrect password' });

        // Parse colors and classes
        let parsedColors = admin.themeColors;
        let parsedClasses = admin.classesOffered;
        try { if (themeColors) parsedColors = JSON.parse(themeColors); } catch (e) { }
        try { if (classesOffered) parsedClasses = JSON.parse(classesOffered); } catch (e) { }

        // Update fields
        if (adminName) admin.adminName = adminName;
        if (coachingName) admin.coachingName = coachingName;
        if (email !== undefined) admin.email = email;
        if (phone !== undefined) admin.phone = phone;
        if (bio !== undefined) admin.bio = bio;
        if (roomsAvailable) admin.roomsAvailable = roomsAvailable;
        if (registrationNumber !== undefined) admin.registrationNumber = registrationNumber || undefined;
        admin.themeColors = parsedColors;
        admin.classesOffered = parsedClasses;

        // New Institute Fields
        if (instituteAddress !== undefined) admin.instituteAddress = instituteAddress;
        if (instituteEmail !== undefined) admin.instituteEmail = instituteEmail;
        if (institutePhone !== undefined) admin.institutePhone = institutePhone;

        // Settings Toggle
        if (emailNotificationsEnabled !== undefined) {
            admin.emailNotificationsEnabled = emailNotificationsEnabled === 'true' || emailNotificationsEnabled === true;
        }

        // Update Logo if provided
        if (req.file) {
            admin.instituteLogo = req.file.path;
        }

        await admin.save();

        // Return updated safe object
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
        const admin = await Admin.findById(req.admin.id);
        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const { emailNotificationsEnabled } = req.body;

        if (emailNotificationsEnabled !== undefined) {
            admin.emailNotificationsEnabled = emailNotificationsEnabled === 'true' || emailNotificationsEnabled === true;
        }

        await admin.save();

        const updatedAdmin = admin.toObject();
        delete updatedAdmin.password;

        res.json({ message: 'Settings updated successfully', admin: updatedAdmin });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
