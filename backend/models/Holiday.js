const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
    title: { type: String, required: true },
    date: { type: Date, required: true },
    reason: { type: String },
    appliesTo: { type: String, default: 'all' } // e.g., 'all' or a specific batchId
}, { timestamps: true });

module.exports = mongoose.model('Holiday', holidaySchema);
