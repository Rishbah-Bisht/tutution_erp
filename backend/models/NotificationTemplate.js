const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    eventType: {
        type: String,
        required: true,
        enum: [
            'studentRegistration',
            'feeGenerated',
            'feePayment',
            'batchAssignment',
            'feeOverdue',
            'examResult',
            'teacherRegistration',
            'salaryPaid',
            'teacherBatchAssignment',
            'testAnnouncement',
            'surchargeAdded'
        ]
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    body: {
        type: String,
        required: true
    },
    subjectPush: {
        type: String,
        trim: true,
        default: ''
    },
    bodyPush: {
        type: String,
        default: ''
    },
    placeholders: {
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('NotificationTemplate', notificationTemplateSchema);
