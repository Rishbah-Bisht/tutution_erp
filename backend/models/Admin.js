const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    adminName: {
        type: String,
        required: [true, 'Admin name is required'],
        trim: true
    },
    coachingName: {
        type: String,
        required: [true, 'Coaching/Institute name is required'],
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true,
        default: ''
    },
    bio: {
        type: String,
        trim: true,
        default: ''
    },
    instituteAddress: {
        type: String,
        trim: true,
        default: ''
    },
    instituteEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: ''
    },
    institutePhone: {
        type: String,
        trim: true,
        default: ''
    },
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    instituteLogo: {
        type: String,
        default: ''
    },
    classesOffered: {
        type: [String],
        default: []
    },
    registrationNumber: {
        type: String,
        unique: true,
        sparse: true // Allows it to be null/undefined for old docs but unique if present
    },
    roomsAvailable: {
        type: Number,
        required: [true, 'Number of rooms is required']
    },
    wipeOtp: {
        type: String,
        default: null
    },
    wipeOtpExpiry: {
        type: Date,
        default: null
    },
    fcmServerKey: {
        type: String,
        default: ''
    },
    gmailEmail: {
        type: String,
        default: ''
    },
    gmailAppPassword: {
        type: String,
        default: ''
    },
    notificationsEnabled: {
        type: Boolean,
        default: true
    },
    emailEvents: {
        studentRegistration: { type: Boolean, default: true },
        feeGenerated: { type: Boolean, default: true },
        feePayment: { type: Boolean, default: true },
        batchAssignment: { type: Boolean, default: true },
        feeOverdue: { type: Boolean, default: true },
        examResult: { type: Boolean, default: true },
        teacherRegistration: { type: Boolean, default: true },
        salaryPaid: { type: Boolean, default: true },
        teacherBatchAssignment: { type: Boolean, default: true },
        testAnnouncement: { type: Boolean, default: true }
    },
    pushEvents: {
        studentRegistration: { type: Boolean, default: true },
        feeGenerated: { type: Boolean, default: true },
        feePayment: { type: Boolean, default: true },
        batchAssignment: { type: Boolean, default: true },
        feeOverdue: { type: Boolean, default: true },
        examResult: { type: Boolean, default: true },
        teacherRegistration: { type: Boolean, default: true },
        salaryPaid: { type: Boolean, default: true },
        teacherBatchAssignment: { type: Boolean, default: true },
        testAnnouncement: { type: Boolean, default: true }
    },
    receiptSettings: {
        showCoachingName: { type: Boolean, default: true },
        showLogo: { type: Boolean, default: true },
        showWatermark: { type: Boolean, default: true },
        showAddress: { type: Boolean, default: true },
        showPhone: { type: Boolean, default: true },
        showEmail: { type: Boolean, default: true }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Admin', adminSchema);
