const mongoose = require('mongoose');

const pageVisitSchema = new mongoose.Schema({
    date:    { type: String, required: true }, // "YYYY-MM-DD"
    pageUrl: { type: String, required: true }, // e.g. "/student-dashboard"
    role:    { type: String, required: true, enum: ['admin', 'teacher', 'student', 'guest'], default: 'guest' },
    visits:  { type: Number, default: 1 }
});

// Compound unique index — the upsert key that makes $inc efficient
pageVisitSchema.index({ date: 1, pageUrl: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('PageVisit', pageVisitSchema);
