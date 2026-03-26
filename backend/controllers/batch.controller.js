const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const mongoose = require('mongoose');
const { syncBatchSchedule } = require('./scheduler.controller');
const STANDARD_SUBJECTS = [
    'Mathematics', 'Science', 'English', 'Hindi', 'Social Science',
    'Physics', 'Chemistry', 'Biology', 'Accountancy', 'Business Studies',
    'Economics', 'Computer Science', 'History', 'Geography', 'All Subjects'
];

// GET /api/batches
exports.getAllBatches = async (req, res) => {
    try {
        const { search = '', course = '', status = '', page = 1, limit = 20 } = req.query;
        const query = {};
        if (search) query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { course: { $regex: search, $options: 'i' } }
        ];
        if (course) query.course = course;
        if (status === 'active') query.isActive = true;
        if (status === 'inactive') query.isActive = false;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await Batch.countDocuments(query);
        const batches = await Batch.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean();

        // Student count per batch
        const batchIds = batches.map(b => b._id);
        const counts = await Student.aggregate([
            { $match: { batchId: { $in: batchIds } } },
            { $group: { _id: '$batchId', count: { $sum: 1 }, totalFees: { $sum: '$feesPaid' } } }
        ]);
        const countMap = {};
        counts.forEach(c => { countMap[c._id.toString()] = { count: c.count, earnings: c.totalFees }; });

        const result = batches.map(b => ({
            ...b,
            studentCount: countMap[b._id.toString()]?.count || 0,
            earnings: countMap[b._id.toString()]?.earnings || 0,
        }));

        res.json({ batches: result, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/batches
exports.createBatch = async (req, res) => {
    try {
        const { name, course, capacity, subjects, classroom, schedule, fees, teacher, startDate, endDate } = req.body;
        if (!name) return res.status(400).json({ message: 'Batch name is required' });

        // Build display timeSlots from structured schedule
        const timeSlots = (schedule || []).map(s => `${s.day} ${s.time}`);

        const batch = new Batch({ name, course, capacity, subjects, classroom, schedule, timeSlots, fees, teacher, startDate, endDate });
        await batch.save();

        // CENTRALIZED SYNC
        await syncBatchSchedule(batch._id, batch.course, schedule);

        res.status(201).json({ message: 'Batch created', batch });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/batches/:id  (protected by verifyAdminPassword middleware)
exports.updateBatch = async (req, res) => {
    try {
        const { adminPassword, ...updateData } = req.body;

        // Rebuild display slots if schedule updated
        if (updateData.schedule) {
            updateData.timeSlots = updateData.schedule.map(s => `${s.day} ${s.time}`);
        }

        const batch = await Batch.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        // CENTRALIZED SYNC
        if (updateData.schedule || updateData.course) {
            await syncBatchSchedule(batch._id, batch.course, batch.schedule);
        }

        res.json({ message: 'Batch updated', batch });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/batches/:id  (protected by verifyAdminPassword middleware)
exports.deleteBatch = async (req, res) => {
    try {
        const batch = await Batch.findByIdAndDelete(req.params.id);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        // CENTRALIZED SYNC
        const Schedule = require('../models/Schedule');
        await Schedule.deleteMany({ batchId: req.params.id });

        res.json({ message: 'Batch deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PATCH /api/batches/:id/toggle
exports.toggleStatus = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });
        batch.isActive = !batch.isActive;
        await batch.save();
        res.json({ message: `Batch ${batch.isActive ? 'activated' : 'deactivated'}`, batch });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/batches/courses/:course/subjects
exports.getSubjectsByCourse = (req, res) => {
    const course = String(req.params.course || "").toLowerCase();
    const classNumMatch = course.match(/\d+/);
    const num = classNumMatch ? parseInt(classNumMatch[0]) : null;

    // 1. School Level (Class 1-10) - Should check this before senior streams
    if (num && num <= 10) {
        if (num >= 9) {
            return res.json({ subjects: ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'IT'] });
        }
        if (num >= 5) {
            return res.json({ subjects: ['All Subjects', 'Mathematics', 'Science', 'English', 'Hindi', 'Social Science'] });
        }
        return res.json({ subjects: ['All Subjects'] });
    }

    // 2. Senior Science (Class 11, 12, or just "Science" without low class num)
    if (course.includes('science') || course.includes('sci') || course.includes('pcb') || course.includes('pcm')) {
        return res.json({ subjects: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Computer Science', 'English', 'P.E.'] });
    }

    // 3. Senior Commerce
    if (course.includes('commerce') || course.includes('com')) {
        return res.json({ subjects: ['Accountancy', 'Business Studies', 'Economics', 'Mathematics', 'English', 'Informatics Practices'] });
    }

    // 4. Senior Arts / Humanities
    if (course.includes('arts') || course.includes('humanities') || course.includes('art')) {
        return res.json({ subjects: ['History', 'Geography', 'Political Science', 'Economics', 'Psychology', 'Fine Arts', 'English', 'Hindi'] });
    }

    // 5. Default Fallback
    res.json({ subjects: STANDARD_SUBJECTS });
};

// GET /api/batches/room-occupancy?excludeBatchId=xxx
exports.getRoomOccupancy = async (req, res) => {
    try {
        const { excludeBatchId } = req.query;
        const Schedule = require('../models/Schedule');
        const schedules = await Schedule.find();

        const occupancy = {};
        schedules.forEach(s => {
            if (excludeBatchId && s.batchId.toString() === excludeBatchId) return;

            const room = s.roomAllotted;
            if (!occupancy[room]) occupancy[room] = {};
            if (!occupancy[room][s.day]) occupancy[room][s.day] = {};
            occupancy[room][s.day][s.timeSlot] = s.course + " (" + s.subject + ")";
        });

        res.json({ occupancy });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/batches/export
exports.exportBatches = async (req, res) => {
    try {
        const batches = await Batch.find().sort({ createdAt: -1 }).lean();
        res.json({ batches });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/batches/:id
exports.getBatchById = async (req, res) => {
    try {
        const batch = await Batch.findById(req.params.id).lean();
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        // Get student list and stats
        const students = await Student.find({ batchId: batch._id, isDeleted: { $ne: true } })
            .select('name rollNo feesPaid status profileImage')
            .sort({ name: 1 })
            .lean();

        const stats = {
            studentCount: students.length,
            totalEarnings: students.reduce((sum, s) => sum + (s.feesPaid || 0), 0),
            activeCount: students.filter(s => s.status === 'active').length
        };

        res.json({ batch: { ...batch, ...stats }, students });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PATCH /api/batches/:id/subjects
exports.updateBatchSubjects = async (req, res) => {
    try {
        const { subjectIds, subjects } = req.body;

        // Ensure both arrays exist (even if empty) to prevent accidental null assignments
        if (!Array.isArray(subjectIds) || !Array.isArray(subjects)) {
            return res.status(400).json({ message: 'Invalid data format. subjectIds and subjects must be arrays.' });
        }

        const batch = await Batch.findByIdAndUpdate(
            req.params.id,
            { $set: { subjectIds, subjects } },
            { new: true }
        );

        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        res.json({ message: 'Batch subjects updated successfully', batch });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
