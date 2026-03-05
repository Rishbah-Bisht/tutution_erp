const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true
    },
    course: {
        type: String,
        required: true
    }, // e.g., 'Class 11'
    subject: {
        type: String,
        required: true
    },
    teacher: {
        type: String
    }, // Keeping name for now to match current flow, but can be refId if preferred
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher'
    },
    day: {
        type: String,
        required: true
    }, // 'Monday', etc.
    timeSlot: {
        type: String,
        required: true
    }, // '09:00'
    roomAllotted: {
        type: String,
        required: true
    },
    isMerged: {
        type: Boolean,
        default: false
    }, // True if multiple batches are in this room
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index for quick conflict checking
scheduleSchema.index({ day: 1, timeSlot: 1, roomAllotted: 1 });
scheduleSchema.index({ day: 1, timeSlot: 1, teacher: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
