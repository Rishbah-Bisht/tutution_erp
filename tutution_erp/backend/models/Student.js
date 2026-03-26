const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const portalAccessSchema = new mongoose.Schema({
    signupStatus: {
        type: String,
        enum: ['yes', 'no'],
        default: 'no',
        index: true
    },
    signedUpAt: {
        type: Date,
        default: null
    },
    lastLoginAt: {
        type: Date,
        default: null
    }
}, { _id: false });

const deviceInfoSchema = new mongoose.Schema({
    platform: { type: String, default: '' },
    model: { type: String, default: '' },
    manufacturer: { type: String, default: '' },
    appVersion: { type: String, default: '' },
    deviceId: { type: String, default: '' }
}, { _id: false });

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, index: true },
    rollNo: { type: String, unique: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', index: true },
    fees: { type: Number, default: 0 },
    registrationFee: { type: Number, default: 0 },
    feesPaid: { type: Number, default: 0 },
    contact: { type: String },
    email: { type: String, lowercase: true, trim: true, index: true },
    joinedAt: { type: Date, default: Date.now },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: { type: String },
    className: { type: String },
    admissionDate: { type: Date, default: Date.now },
    session: { type: String },
    status: { type: String, enum: ['active', 'inactive', 'completed', 'batch_pending'], default: 'active', index: true },
    notes: { type: String },
    profileImage: { type: String },
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    currentYear: { type: String, default: '1' },
    password: { type: String },
    phoneLockedByAdmin: { type: Boolean, default: false },
    deviceTokens: {
        type: [String],
        default: []
    },
    lastAppOpenAt: {
        type: Date,
        default: null,
        index: true
    },
    lastActiveAt: {
        type: Date,
        default: null,
        index: true
    },
    lastDevice: {
        type: deviceInfoSchema,
        default: () => ({})
    },
    portalAccess: {
        type: portalAccessSchema,
        default: () => ({})
    }
});

studentSchema.pre('save', async function () {
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});



module.exports = mongoose.model('Student', studentSchema);
