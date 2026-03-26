const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    course: { type: String, trim: true },
    capacity: { type: Number, default: 30 },
    subjects: [{ type: String, trim: true }],
    subjectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    classroom: { type: String, trim: true },
    // Structured schedule for conflict detection
    schedule: [{ day: String, time: String, subject: String, teacher: String, room: { type: String, trim: true } }],
    // Legacy freeform display slots (kept for backward compat)
    timeSlots: [{ type: String, trim: true }],
    teacher: { type: String },
    fees: { type: Number, default: 0 },
    enrolledCount: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

batchSchema.index({ isActive: 1, name: 1 });
batchSchema.index({ subjectIds: 1 });

module.exports = mongoose.model('Batch', batchSchema);
