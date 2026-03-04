const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const { queueNotification } = require('../services/emailService');

// GET /api/exams — list all exams
exports.getAllExams = async (req, res) => {
    try {
        const exams = await Exam.find()
            .populate('batchId', 'name subjects')
            .sort({ createdAt: -1 })
            .lean();
        res.json({ exams });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/exams — create a new test
exports.createExam = async (req, res) => {
    try {
        const { name, subject, batchId, date, totalMarks, passingMarks } = req.body;
        if (!name || !subject || !batchId || !totalMarks || !passingMarks) {
            return res.status(400).json({ message: 'Name, subject, batch, totalMarks and passingMarks are required.' });
        }
        if (parseFloat(passingMarks) > parseFloat(totalMarks)) {
            return res.status(400).json({ message: 'Passing marks cannot exceed total marks.' });
        }
        const exam = new Exam({ name, subject, batchId, date, totalMarks, passingMarks });
        await exam.save();
        await exam.populate('batchId', 'name subjects');
        res.status(201).json({ message: 'Test created successfully', exam });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// PUT /api/exams/:id — update exam details (admin only)
exports.updateExam = async (req, res) => {
    try {
        const { name, subject, date, totalMarks, passingMarks, status } = req.body;
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        if (name) exam.name = name;
        if (subject) exam.subject = subject;
        if (date) exam.date = date;
        if (totalMarks) exam.totalMarks = totalMarks;
        if (passingMarks) exam.passingMarks = passingMarks;
        if (status) exam.status = status;

        await exam.save();
        await exam.populate('batchId', 'name subjects');
        res.json({ message: 'Exam updated', exam });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/exams/:id
exports.deleteExam = async (req, res) => {
    try {
        await Exam.findByIdAndDelete(req.params.id);
        await ExamResult.deleteMany({ examId: req.params.id });
        res.json({ message: 'Exam and all results deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/:id/students — fetch students in the exam's batch
exports.getExamStudents = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('batchId', 'name');
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const students = await Student.find({ batchId: exam.batchId._id, status: 'active' })
            .select('name rollNo _id')
            .sort({ name: 1 })
            .lean();

        // Attach existing result if any
        const results = await ExamResult.find({ examId: exam._id }).lean();
        const resultMap = {};
        results.forEach(r => { resultMap[r.studentId.toString()] = r; });

        const rows = students.map(s => ({
            ...s,
            result: resultMap[s._id.toString()] || null
        }));

        res.json({ exam, students: rows });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/:id/results — get all results for a test
exports.getExamResults = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('batchId', 'name').lean();
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const results = await ExamResult.find({ examId: req.params.id })
            .populate('studentId', 'name rollNo')
            .populate('uploadedBy', 'name')
            .sort({ 'studentId.name': 1 })
            .lean();

        res.json({ exam, results });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /api/exams/:id/results — bulk upload / save marks
exports.saveMarks = async (req, res) => {
    try {
        const { marks } = req.body; // Array of { studentId, marksObtained, remarks }
        const exam = await Exam.findById(req.params.id);
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        if (!Array.isArray(marks) || marks.length === 0) {
            return res.status(400).json({ message: 'marks array is required.' });
        }

        const uploadedBy = req.teacher?.id || null; // null means admin

        const ops = marks.map(({ studentId, marksObtained, remarks }) => ({
            updateOne: {
                filter: { examId: exam._id, studentId },
                update: {
                    $set: {
                        batchId: exam.batchId,
                        marksObtained: parseFloat(marksObtained) || 0,
                        remarks: remarks || '',
                        uploadedBy,
                        uploadedAt: new Date()
                    }
                },
                upsert: true
            }
        }));

        await ExamResult.bulkWrite(ops);

        // Mark exam as completed once marks are uploaded
        if (exam.status === 'scheduled') {
            exam.status = 'completed';
            await exam.save();
        }

        // Email Notification: Result Announced to each student
        const studentIds = marks.map(m => m.studentId);
        const students = await Student.find({ _id: { $in: studentIds } }).select('name email _id').lean();
        const studentMap = {};
        students.forEach(s => { studentMap[s._id.toString()] = s; });

        marks.forEach(m => {
            const student = studentMap[m.studentId?.toString()];
            if (student && student.email) {
                const mo = parseFloat(m.marksObtained) || 0;
                const pass = mo >= exam.passingMarks;
                const grace = exam.passingMarks - 0.05 * exam.totalMarks;
                const result = pass ? 'PASS' : 'FAIL';
                const resultColor = pass ? '#15803d' : (mo >= grace ? '#a16207' : '#be123c');

                queueNotification({
                    recipientEmail: student.email,
                    recipientName: student.name,
                    subject: `Result Announced: ${exam.name} — ${result}`,
                    type: 'result_announced',
                    data: {
                        examName: exam.name,
                        subject: exam.subject,
                        marksObtained: mo,
                        totalMarks: exam.totalMarks,
                        passingMarks: exam.passingMarks,
                        result,
                        resultColor
                    }
                }).catch(e => console.error('[ExamEmail] result_announced error:', e));
            }
        });

        res.json({ message: `Marks saved for ${marks.length} students.` });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
