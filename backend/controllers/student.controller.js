const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Admin = require('../models/Admin');
const Fee = require('../models/Fee');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const feeController = require('./fee.controller');
const { queueNotification } = require('../services/emailService');

// GET /api/students/stats
exports.getStudentStats = async (req, res) => {
    try {
        const total = await Student.countDocuments();
        const active = await Student.countDocuments({ status: 'active' });
        const completed = await Student.countDocuments({ status: 'completed' });

        // Fee pending: unique students who are ACTIVE and have at least one non-deleted fee record that is not 'paid'
        const pendingFeeStudentIds = await Fee.distinct('studentId', {
            status: { $in: ['pending', 'partial', 'overdue'] },
            isDeleted: { $ne: true }
        });
        const feePending = await Student.countDocuments({
            _id: { $in: pendingFeeStudentIds },
            status: 'active'
        });

        // New admissions this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const newAdmissions = await Student.countDocuments({ admissionDate: { $gte: startOfMonth } });

        res.json({
            total,
            active,
            completed,
            feePending,
            newAdmissions,
            attendanceAvg: 85 // Mock value as attendance system is separate
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching stats', error: err.message });
    }
};

// GET /api/students
exports.getAllStudents = async (req, res) => {
    try {
        const { search = '', batch = '', status = '', className = '', page = 1, limit = 20 } = req.query;

        const query = {};
        if (search) query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { rollNo: { $regex: search, $options: 'i' } }
        ];
        if (batch && mongoose.Types.ObjectId.isValid(batch)) query.batchId = batch;
        if (status) query.status = status;
        if (className) query.className = className;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Student.countDocuments(query);
        const students = await Student.find(query)
            .populate('batchId', 'name subjects fees capacity')
            .sort({ joinedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.json({ students, total, page: parseInt(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/students
exports.createStudent = async (req, res) => {
    try {
        const data = req.body;
        if (!data.name) return res.status(400).json({ message: 'Name is required' });

        // Handle File Upload
        if (req.file) {
            data.profileImage = req.file.path;
        }

        if (!data.batchId) {
            delete data.batchId;
        }

        // Auto-generate roll number: STU + YEAR + 4-digit Sequential
        const currentYear = new Date().getFullYear() % 100;
        const yearPrefix = `STU${currentYear}`;

        // Find the last student admitted THIS year
        const lastStudent = await Student.findOne({ rollNo: new RegExp(`^${yearPrefix}`) }, 'rollNo').sort({ rollNo: -1 });

        let nextNum = 1;
        if (lastStudent && lastStudent.rollNo) {
            const numPart = lastStudent.rollNo.replace(yearPrefix, '');
            const num = parseInt(numPart, 10);
            if (!isNaN(num)) nextNum = num + 1;
        }
        const rollNo = `${yearPrefix}${String(nextNum).padStart(2, '0')}`;

        // Capacity check
        if (data.batchId) {
            const batch = await Batch.findById(data.batchId);
            if (batch && batch.capacity > 0) {
                const enrolled = await Student.countDocuments({ batchId: data.batchId });
                if (enrolled >= batch.capacity) {
                    return res.status(400).json({ message: 'Batch capacity reached' });
                }
            }
        }

        const studentData = {
            ...data,
            rollNo,
            password: data.password || 'student@123',
            phoneLockedByAdmin: !!(data.contact || data.phone),
            contact: data.contact || data.phone,
            fees: data.fees || 0,
            registrationFee: data.registrationFee || 0,
            fatherName: data.fatherName,
            motherName: data.motherName,
            currentYear: data.currentYear || '1',
            status: data.batchId ? 'active' : 'batch_pending'
        };

        const student = new Student(studentData);
        await student.save();

        // QUEUE WELCOME EMAIL
        if (student.email) {
            await queueNotification({
                recipientEmail: student.email,
                recipientName: student.name,
                subject: 'Welcome to ABC Institute',
                type: 'registration',
                data: {
                    rollNo: student.rollNo,
                    password: req.body.password || 'student@123'
                }
            });
        }

        // Automatically ensure fee for current month ONLY if batch assigned
        if (student.batchId) {
            await feeController.ensureMonthlyFeeForStudents([student._id]);
        }

        const result = student.toObject();
        delete result.password;
        res.status(201).json({
            message: student.batchId ? 'Student created and fee generated' : 'Student created (Batch Pending)',
            student: result
        });
    } catch (err) {
        console.error('[createStudent]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/students/:id
exports.updateStudent = async (req, res) => {
    try {
        const data = req.body;

        if (req.file) {
            data.profileImage = req.file.path;
        }

        if (!data.batchId) {
            delete data.batchId;
        }

        const oldStudent = await Student.findById(req.params.id);
        if (!oldStudent) return res.status(404).json({ message: 'Student not found' });

        const isActivatingBatch = !oldStudent.batchId && data.batchId;

        if (isActivatingBatch && oldStudent.status === 'batch_pending') {
            data.status = 'active';
        }

        const student = await Student.findByIdAndUpdate(req.params.id, data, { new: true });

        // If batch was just assigned, generate fees
        if (isActivatingBatch) {
            await feeController.ensureMonthlyFeeForStudents([student._id]);

            // QUEUE BATCH ASSIGNMENT NOTIFICATION
            if (student.email && data.batchId) {
                const batch = await require('../models/Batch').findById(data.batchId);
                await queueNotification({
                    recipientEmail: student.email,
                    recipientName: student.name,
                    subject: 'New Batch Assigned - ABC Institute',
                    type: 'batch_assignment',
                    data: {
                        batchName: batch?.name || 'Assigned Batch',
                        course: student.className || 'General',
                        timing: batch?.timeSlots?.[0] || 'TBA'
                    }
                });
            }
        }

        res.json({
            message: isActivatingBatch ? 'Batch assigned and fees generated' : 'Updated',
            student
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/students/:id
exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        if (!student) return res.status(404).json({ message: 'Student not found' });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/students/delete-all
exports.deleteAllStudents = async (req, res) => {
    try {
        await Student.deleteMany({});
        res.json({ message: 'All students deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/students/bulk
exports.bulkUpload = async (req, res) => {
    try {
        const { students } = req.body;
        if (!Array.isArray(students) || students.length === 0)
            return res.status(400).json({ message: 'No students data provided' });

        const currentYear = new Date().getFullYear() % 100;
        const yearPrefix = `STU${currentYear}`;

        const lastStudent = await Student.findOne({ rollNo: new RegExp(`^${yearPrefix}`) }, 'rollNo').sort({ rollNo: -1 });
        let nextNum = 1;
        if (lastStudent && lastStudent.rollNo) {
            const numPart = lastStudent.rollNo.replace(yearPrefix, '');
            const num = parseInt(numPart, 10);
            if (!isNaN(num)) nextNum = num + 1;
        }

        let successCount = 0;
        let failedCount = 0;
        const errors = [];
        const newStudentIds = [];

        // Pre-fetch all active batches to build a fast memory map for name resolution
        const allBatches = await Batch.find({ isActive: true }).select('_id name');
        const batchMap = {};
        allBatches.forEach(b => {
            batchMap[b.name.toLowerCase().trim()] = b._id;
        });

        // Helper to safely parse naive "DD-MM-YYYY" or standard dates into JS Date objects
        const parseExcelDate = (dateVal) => {
            if (!dateVal) return undefined;
            if (dateVal instanceof Date) return dateVal;
            if (typeof dateVal === 'number') return new Date((dateVal - (25567 + 2)) * 86400 * 1000);
            if (typeof dateVal === 'string') {
                const parts = dateVal.split('-');
                if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
            }
            return new Date(dateVal);
        };

        // Using individual save() to ensure pre-save hooks (password hashing) trigger
        await Promise.all(students.map(async (s, i) => {
            try {
                // Flexible Field Mapping (Normalization)
                const getValue = (keys) => {
                    const match = keys.find(k => s[k] !== undefined);
                    return match !== undefined ? s[match] : undefined;
                };

                // Resolve text batchName to Mongo ID
                let resolvedBatchId = getValue(['batchId', 'BATCHNAME', 'Batch Name', 'Batch', 'batchName']);
                if (resolvedBatchId && !mongoose.Types.ObjectId.isValid(resolvedBatchId)) {
                    const cleanName = String(resolvedBatchId).toLowerCase().trim();
                    resolvedBatchId = batchMap[cleanName] || null;
                }

                const student = new Student({
                    name: String(getValue(['name', 'NAME', 'Student Name', 'STUDENT NAME']) || '').trim(),
                    rollNo: getValue(['rollNo', 'ROLL NO', 'Roll Number']) || `${yearPrefix}${String(nextNum + i).padStart(2, '0')}`,
                    batchId: resolvedBatchId,
                    className: String(getValue(['className', 'CLASSNAME', 'STANDARD / COURSE', 'Standard', 'Course', 'CLASS']) || '').trim(),
                    contact: String(getValue(['phone', 'PHONE', 'contact', 'CONTACT', 'MOBILE NUMBER', 'Mobile']) || '').trim(),
                    email: String(getValue(['email', 'EMAIL', 'EMAIL ADDRESS', 'Email Address']) || '').toLowerCase().trim() || undefined,
                    gender: String(getValue(['gender', 'GENDER']) || '').trim().replace(/^\w/, c => c.toUpperCase()),
                    address: String(getValue(['address', 'ADDRESS', 'FULL ADDRESS', 'Full Address']) || '').trim(),
                    dob: parseExcelDate(getValue(['dob', 'DOB', 'DATE OF BIRTH', 'Date of Birth'])),
                    admissionDate: parseExcelDate(getValue(['admissionDate', 'ADMISSION DATE', 'Admission Date'])) || new Date(),
                    session: String(getValue(['session', 'SESSION']) || '').trim(),
                    fees: Number(getValue(['fees', 'FEES', 'FEE'])) || 0,
                    status: resolvedBatchId ? 'active' : 'batch_pending',
                    fatherName: String(getValue(['fatherName', 'FATHER NAME', "FATHER'S NAME", 'Father Name']) || '').trim(),
                    motherName: String(getValue(['motherName', 'MOTHER NAME', "MOTHER'S NAME", 'Mother Name']) || '').trim(),
                    currentYear: String(getValue(['currentYear', 'CURRENT YEAR']) || '1').trim(),
                    password: 'student@123'
                });
                await student.save();

                // QUEUE WELCOME EMAIL
                if (student.email) {
                    await queueNotification({
                        recipientEmail: student.email,
                        recipientName: student.name,
                        subject: 'Welcome to ABC Institute',
                        type: 'registration',
                        data: {
                            rollNo: student.rollNo,
                            password: 'student@123'
                        }
                    });
                }

                if (student.batchId) {
                    newStudentIds.push(student._id);
                }
                successCount++;
            } catch (err) {
                failedCount++;
                errors.push({ name: s.name || 'Unknown', error: err.message });
            }
        }));

        // Generate fees ONLY for students who were successfully assigned a batch
        if (newStudentIds.length > 0) {
            await feeController.ensureMonthlyFeeForStudents(newStudentIds);
        }

        res.status(201).json({
            message: `${successCount} students inserted, ${failedCount} failed. Fees generated for new admissions.`,
            total: students.length,
            success: successCount,
            failed: failedCount,
            errors
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/students/export
exports.exportStudents = async (req, res) => {
    try {
        const students = await Student.find()
            .populate('batchId', 'name subjects')
            .sort({ joinedAt: -1 })
            .lean();
        res.json({ students });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET all batches
exports.getBatches = async (req, res) => {
    try {
        const batches = await Batch.find({ isActive: true }).select('name subjects fees capacity course');
        // Count enrolled for each batch
        const batchDetails = await Promise.all(batches.map(async b => {
            const enrolled = await Student.countDocuments({ batchId: b._id });
            return {
                ...b.toObject(),
                enrolled
            };
        }));
        res.json({ batches: batchDetails });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/students/:id
exports.getStudentById = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id)
            .populate('batchId', 'name subjects fees capacity course')
            .lean();

        if (!student) return res.status(404).json({ message: 'Student not found' });

        // Get full fee history for this student
        const fees = await Fee.find({ studentId: student._id })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ student, fees });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

