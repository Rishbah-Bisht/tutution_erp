const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true, index: true },
    date: { type: Date, required: true, index: true },
    attendanceDate: { type: Date, required: true, index: true },
    status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    markedByRole: { type: String, enum: ['admin', 'teacher'], default: 'admin' },
    notes: { type: String, trim: true, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

attendanceSchema.pre('validate', function () {
    if (!this.date && this.attendanceDate) {
        this.date = this.attendanceDate;
    }

    if (this.date) {
        const normalized = new Date(this.date);
        normalized.setHours(0, 0, 0, 0);
        this.date = normalized;
        this.attendanceDate = normalized;
    }

    this.updatedAt = new Date();
});

attendanceSchema.index(
    { studentId: 1, batchId: 1, subjectId: 1, attendanceDate: 1 },
    { unique: true, name: 'uniq_attendance_per_student_subject_day' }
);
attendanceSchema.index({ batchId: 1, subjectId: 1, attendanceDate: 1 });
attendanceSchema.index({ studentId: 1, attendanceDate: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
