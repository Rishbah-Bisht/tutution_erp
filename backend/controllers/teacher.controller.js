const Teacher = require('../models/Teacher');
const Batch = require('../models/Batch');
const Student = require('../models/Student');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { queueNotification } = require('../services/emailService');

// GET /api/teachers
exports.getAllTeachers = async (req, res) => {
    try {
        const { status = '', batchId = '', search = '', page = 1, limit = 20 } = req.query;
        const query = {};
        if (status) query.status = status;
        if (search) query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { regNo: { $regex: search, $options: 'i' } },
        ];
        if (batchId) query['assignments.batchId'] = batchId;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Teacher.countDocuments(query);
        const rawTeachers = await Teacher.find(query)
            .populate('assignments.batchId', 'name')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Dynamically calculate enrollment for each batch assignment
        const teachers = await Promise.all(rawTeachers.map(async t => {
            const enrichedAssignments = await Promise.all((t.assignments || []).map(async a => {
                const count = a.batchId ? await Student.countDocuments({ batchId: a.batchId._id }) : 0;
                return {
                    ...a,
                    enrolled: count
                };
            }));
            return {
                ...t,
                assignments: enrichedAssignments
            };
        }));

        res.json({ teachers, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/teachers/summary
exports.getSummary = async (req, res) => {
    try {
        const teachers = await Teacher.find().lean();
        const activeTeachers = teachers.filter(t => t.status === 'active');
        const monthlyPayroll = teachers.reduce((s, t) => s + (t.salary || 0), 0);
        const monthExpenditure = activeTeachers.reduce((s, t) => s + (t.salary || 0), 0);
        const activeClasses = activeTeachers.reduce((s, t) => s + (t.assignments?.length || 0), 0);

        res.json({
            totalFaculty: teachers.length,
            monthlyPayroll,
            monthExpenditure,
            activeClasses,
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/teachers
exports.createTeacher = async (req, res) => {
    try {
        const {
            name, dob, gender, email, phone, altPhone, currentAddress, permanentAddress,
            joiningDate, status, salary, password, assignments, department,
            designation, qualifications, experience, systemRole
        } = req.body;

        if (!name) return res.status(400).json({ message: 'Teacher name is required' });

        const currentYear = new Date().getFullYear() % 100;
        const yearPrefix = `TCH${currentYear}`;

        const lastTeacher = await Teacher.findOne({ regNo: new RegExp(`^${yearPrefix}`) }, 'regNo').sort({ regNo: -1 });
        let nextNum = 1;
        if (lastTeacher && lastTeacher.regNo) {
            const numPart = lastTeacher.regNo.replace(yearPrefix, '');
            const num = parseInt(numPart, 10);
            if (!isNaN(num)) nextNum = num + 1;
        }
        const TCHregNo = `${yearPrefix}${String(nextNum).padStart(2, '0')}`;

        const parsed = typeof assignments === 'string' ? JSON.parse(assignments || '[]') : (assignments || []);
        const profileImage = req.file ? req.file.path : null;

        const teacher = new Teacher({
            name, dob, gender, email, phone, altPhone,
            address: { current: currentAddress, permanent: permanentAddress },
            profileImage,
            regNo: TCHregNo || undefined,
            department, designation, qualifications, experience,
            joiningDate: joiningDate || undefined,
            salary: Number(salary) || 0,
            assignments: parsed,
            password, systemRole, status
        });

        await teacher.save();

        // Email Notification: Teacher Admission
        if (teacher.email) {
            queueNotification({
                recipientEmail: teacher.email,
                recipientName: teacher.name,
                subject: `Welcome to ABC Institute — Your Faculty Account`,
                type: 'teacher_admission',
                data: {
                    regNo: teacher.regNo,
                    designation: teacher.designation || 'Faculty'
                }
            }).catch(e => console.error('[TeacherEmail] Admission notification error:', e));
        }

        res.status(201).json({ message: 'Teacher created', teacher });
    } catch (err) {
        console.error('[createTeacher]', err);
        if (err.code === 11000) {
            const field = Object.keys(err.keyValue || {})[0] || 'field';
            return res.status(400).json({ message: `Duplicate value: ${field} already exists` });
        }
        res.status(500).json({ message: err.message || 'Server error' });
    }
};

// PUT /api/teachers/:id  (protected by verifyAdminPassword)
exports.updateTeacher = async (req, res) => {
    try {
        const {
            adminPassword, password, assignments, salary, department, designation,
            dob, gender, altPhone, currentAddress, permanentAddress,
            qualifications, experience, systemRole, status, ...rest
        } = req.body;

        // Convert empty strings to undefined so they don't collide with sparse indexes
        if (rest.regNo === '') rest.regNo = undefined;
        if (rest.email === '') rest.email = undefined;
        if (rest.phone === '') rest.phone = undefined;

        const update = {
            ...rest,
            salary: Number(salary) || 0,
            department, designation, dob, gender, altPhone,
            address: { current: currentAddress, permanent: permanentAddress },
            qualifications, experience, systemRole, status
        };

        const parsed = typeof assignments === 'string' ? JSON.parse(assignments || '[]') : (assignments || []);
        if (parsed.length) update.assignments = parsed;

        if (req.file) {
            update.profileImage = req.file.path;
        }

        if (password) {
            update.password = password; // hashing is handled by pre-save hook
        }

        const teacher = await Teacher.findByIdAndUpdate(req.params.id, update, { new: true });
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
        res.json({ message: 'Teacher updated', teacher });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/teachers/:id  (protected by verifyAdminPassword)
exports.deleteTeacher = async (req, res) => {
    try {
        const teacher = await Teacher.findByIdAndDelete(req.params.id);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
        res.json({ message: 'Teacher deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/teachers/bulk-update
exports.bulkUpdate = async (req, res) => {
    try {
        const { ids, updates } = req.body;
        if (!ids || !ids.length) return res.status(400).json({ message: 'No IDs provided' });
        if (!updates || typeof updates !== 'object') return res.status(400).json({ message: 'No updates provided' });
        const allowedFields = ['status', 'department', 'designation'];
        const cleanUpdates = {};

        allowedFields.forEach(field => {
            if (updates[field] !== undefined && updates[field] !== '') {
                cleanUpdates[field] = String(updates[field]).trim();
            }
        });

        if (Object.keys(cleanUpdates).length === 0) {
            return res.status(400).json({ message: 'No valid fields provided for update' });
        }

        await Teacher.updateMany({ _id: { $in: ids } }, { $set: cleanUpdates });
        res.json({ message: `Successfully updated ${ids.length} faculty members.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/batches/:id/subjects — batch subjects + who is assigned
exports.getBatchSubjectsWithAssignments = async (req, res) => {
    try {
        const { excludeTeacherId } = req.query;
        const batch = await Batch.findById(req.params.id).select('subjects name');
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        const teacherQuery = { 'assignments.batchId': req.params.id };
        if (excludeTeacherId) teacherQuery._id = { $ne: excludeTeacherId };
        const teachers = await Teacher.find(teacherQuery).select('name assignments');

        const assignedMap = {};
        teachers.forEach(t => {
            t.assignments.forEach(a => {
                if (a.batchId?.toString() === req.params.id) {
                    a.subjects.forEach(sub => {
                        assignedMap[sub] = { teacherId: t._id, teacherName: t.name };
                    });
                }
            });
        });

        res.json({ batchId: batch._id, batchName: batch.name, subjects: batch.subjects || [], assignments: assignedMap });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/teachers/bulk
exports.bulkUpload = async (req, res) => {
    try {
        const { teachers } = req.body;
        if (!Array.isArray(teachers) || teachers.length === 0)
            return res.status(400).json({ message: 'No teacher data provided' });

        const currentYear = new Date().getFullYear() % 100;
        const yearPrefix = `TCH${currentYear}`;

        const lastTeacher = await Teacher.findOne({ regNo: new RegExp(`^${yearPrefix}`) }, 'regNo').sort({ regNo: -1 });
        let nextNum = 1;
        if (lastTeacher && lastTeacher.regNo) {
            const numPart = lastTeacher.regNo.replace(yearPrefix, '');
            const num = parseInt(numPart, 10);
            if (!isNaN(num)) nextNum = num + 1;
        }

        let successCount = 0;
        let failedCount = 0;
        const errors = [];

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

        const defaultPassword = 'teacher@123';

        await Promise.all(teachers.map(async (t, i) => {
            try {
                const getValue = (keys) => {
                    const match = keys.find(k => t[k] !== undefined);
                    return match !== undefined ? t[match] : undefined;
                };

                const teacher = new Teacher({
                    name: String(getValue(['name', 'NAME', 'Teacher Name', 'TEACHER NAME']) || '').trim(),
                    email: String(getValue(['email', 'EMAIL', 'EMAIL ADDRESS', 'Email Address']) || '').toLowerCase().trim() || undefined,
                    phone: String(getValue(['phone', 'PHONE', 'MOBILE NUMBER', 'Mobile']) || '').trim() || undefined,
                    gender: String(getValue(['gender', 'GENDER']) || '').trim().replace(/^\w/, c => c.toUpperCase()), // capitalize first letter
                    dob: parseExcelDate(getValue(['dob', 'DOB', 'DATE OF BIRTH', 'Date of Birth'])),
                    department: String(getValue(['department', 'DEPARTMENT']) || '').trim(),
                    designation: String(getValue(['designation', 'DESIGNATION']) || '').trim(),
                    salary: Number(getValue(['salary', 'SALARY', 'MONTHLY SALARY'])) || 0,
                    experience: String(getValue(['experience', 'EXPERIENCE']) || '').trim(),
                    qualifications: String(getValue(['qualifications', 'QUALIFICATIONS']) || '').trim(),
                    joiningDate: parseExcelDate(getValue(['joiningDate', 'JOINING DATE', 'Joining Date'])) || new Date(),
                    regNo: `${yearPrefix}${String(nextNum + i).padStart(2, '0')}`,
                    password: defaultPassword,
                    status: 'active'
                });

                await teacher.save();
                successCount++;
            } catch (err) {
                failedCount++;
                errors.push({ name: t.name || 'Unknown', error: err.message });
            }
        }));

        res.status(201).json({
            message: `${successCount} teachers inserted, ${failedCount} failed.`,
            total: teachers.length,
            success: successCount,
            failed: failedCount,
            errors
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
