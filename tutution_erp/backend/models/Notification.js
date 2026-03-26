const mongoose = require('mongoose');

const channelResultSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['sent', 'failed', 'logged', 'partial'],
        required: true
    },
    providerMessageId: {
        type: String,
        default: ''
    },
    error: {
        type: String,
        default: ''
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { _id: false });

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        default: 'ERP Notification',
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        enum: [
            'general', 'fee', 'attendance', 'homework', 'announcement', 'exam',
            'studentRegistration', 'feeGenerated', 'feePayment', 'batchAssignment',
            'feeOverdue', 'examResult', 'teacherRegistration', 'salaryPaid',
            'teacherBatchAssignment', 'testAnnouncement', 'surchargeAdded'
        ],
        default: 'general'
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: false,
        index: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: false,
        index: true
    },
    recipientType: {
        type: String,
        enum: ['student', 'teacher'],
        default: 'student',
        index: true
    },
    target: {
        type: String,
        enum: ['individual', 'batch', 'all'],
        default: 'individual'
    },
    targetId: {
        type: String, // Can be studentId, batchId, or 'all'
        default: null
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    deliveryType: {
        type: String,
        enum: ['push', 'email', 'both'],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'scheduled', 'sent', 'partial', 'failed', 'logged'],
        default: 'pending',
        index: true
    },
    scheduledFor: {
        type: Date,
        default: null,
        index: true
    },
    retryCount: {
        type: Number,
        default: 0
    },
    pushResult: {
        type: channelResultSchema,
        default: undefined
    },
    emailResult: {
        type: channelResultSchema,
        default: undefined
    }
}, { timestamps: true });

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
