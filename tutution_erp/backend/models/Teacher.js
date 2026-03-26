const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const assignmentSchema = new mongoose.Schema({
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    batchName: { type: String },
    subjects: [{ type: String }]
}, { _id: false });

const teacherSchema = new mongoose.Schema({
    // 1. Personal Details
    name: { type: String, required: true, trim: true, index: true },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    email: { type: String, trim: true, lowercase: true, index: true },
    phone: { type: String, trim: true },
    altPhone: { type: String, trim: true },
    address: {
        current: { type: String, trim: true },
        permanent: { type: String, trim: true }
    },
    profileImage: { type: String }, // relative file path from /uploads/

    // 2. Professional & Academic Details
    regNo: { type: String, trim: true, sparse: true, index: true, unique: true }, // Employee ID
    department: { type: String, trim: true },
    designation: { type: String, trim: true }, // or role
    qualifications: { type: String, trim: true },
    experience: { type: String, trim: true },
    joiningDate: { type: Date },
    salary: { type: Number, default: 0 },

    // 3. Allocation Details
    assignments: [assignmentSchema],

    // 4. Authentication & System Details
    password: { type: String }, // hashed
    systemRole: { type: String, enum: ['Teacher', 'Admin'], default: 'Teacher' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },

    createdAt: { type: Date, default: Date.now }
});

// Hash password before save (Mongoose 9 async pre-hook — no next() needed)
teacherSchema.pre('save', async function () {
    if (this.isModified('password') && this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
});

module.exports = mongoose.model('Teacher', teacherSchema);
