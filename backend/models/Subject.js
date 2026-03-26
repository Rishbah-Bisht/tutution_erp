const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        trim: true,
        uppercase: true,
        default: null
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true,
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

subjectSchema.pre('save', function () {
    this.updatedAt = new Date();

    if (!this.code && this.name) {
        this.code = this.name
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 24)
            .toUpperCase();
    }
});

subjectSchema.index({ batchId: 1, name: 1 }, { unique: true });
subjectSchema.index({ batchId: 1, code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Subject', subjectSchema);
