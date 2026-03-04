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
    emailNotificationsEnabled: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Admin', adminSchema);
