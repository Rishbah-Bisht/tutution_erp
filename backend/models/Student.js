const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, index: true },
    rollNo: { type: String, unique: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', index: true },
    fees: { type: Number, default: 0 },
    registrationFee: { type: Number, default: 0 },
    feesPaid: { type: Number, default: 0 },
    contact: { type: String },        // admin-facing field (original)
    email: { type: String, lowercase: true, trim: true, index: true },
    joinedAt: { type: Date, default: Date.now },
    // ── Admission Details ────────────────────────────────────────
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    address: { type: String },
    className: { type: String },        // Course/Class
    admissionDate: { type: Date, default: Date.now },
    session: { type: String },        // e.g. 2026-2027
    status: { type: String, enum: ['active', 'inactive', 'completed', 'batch_pending'], default: 'active', index: true },
    notes: { type: String },
    profileImage: { type: String },        // Relative path to upload
    // ── Template specific additions ────────────────────────────────
    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },

    // ── Auth-portal additions ────────────────────────────────────
    password: { type: String },        // hashed; set by admin on creation
    phoneLockedByAdmin: { type: Boolean, default: false },  // true → student cannot change contact
});

// Hash password before save (Mongoose 9 async pre-hook)
studentSchema.pre('save', async function () {
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

module.exports = mongoose.model('Student', studentSchema);
