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
        const { name, subject, chapter, batchId, date, totalMarks, passingMarks } = req.body;
        if (!name || !subject || !chapter || !batchId || !totalMarks || !passingMarks) {
            return res.status(400).json({ message: 'Name, subject, chapter, batch, totalMarks and passingMarks are required.' });
        }
        if (parseFloat(passingMarks) > parseFloat(totalMarks)) {
            return res.status(400).json({ message: 'Passing marks cannot exceed total marks.' });
        }
        const exam = new Exam({ name, subject, chapter, batchId, date, totalMarks, passingMarks });
        await exam.save();
        await exam.populate('batchId', 'name subjects');

        // Email Notification: Test Scheduled to all active students in batch
        const students = await Student.find({ batchId, status: 'active' }).select('name email').lean();

        students.forEach(student => {
            if (student.email) {
                queueNotification({
                    recipientEmail: student.email,
                    recipientName: student.name,
                    subject: `New Test Scheduled: ${name}`,
                    type: 'test_scheduled',
                    data: {
                        examName: name,
                        subject,
                        chapter,
                        date: date ? new Date(date).toLocaleDateString('en-IN') : 'TBD',
                        totalMarks,
                        passingMarks
                    }
                }).catch(e => console.error('[ExamEmail] test_scheduled error:', e));
            }
        });

        res.status(201).json({ message: 'Test created and students notified', exam });
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

        const ops = marks.map(({ studentId, marksObtained, remarks, isPresent }) => ({
            updateOne: {
                filter: { examId: exam._id, studentId },
                update: {
                    $set: {
                        batchId: exam.batchId,
                        marksObtained: parseFloat(marksObtained) || 0,
                        isPresent: isPresent !== undefined ? isPresent : true,
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

// GET /api/exams/:id/analytics — test-level stats
exports.getExamAnalytics = async (req, res) => {
    try {
        const examId = req.params.id;
        const exam = await Exam.findById(examId).populate('batchId', 'name').lean();
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const results = await ExamResult.find({ examId }).lean();
        if (results.length === 0) {
            return res.json({
                exam,
                avgScore: 0,
                highestScore: 0,
                lowestScore: 0,
                appeared: 0,
                absent: 0
            });
        }

        const presentResults = results.filter(r => r.isPresent);
        const scores = presentResults.map(r => r.marksObtained);

        const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const high = scores.length ? Math.max(...scores) : 0;
        const low = scores.length ? Math.min(...scores) : 0;

        res.json({
            exam,
            avgScore: parseFloat(avg.toFixed(2)),
            highestScore: high,
            lowestScore: low,
            appeared: presentResults.length,
            absent: results.length - presentResults.length
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/student/:id/performance — student-level deep dive
exports.getStudentPerformance = async (req, res) => {
    try {
        const studentId = req.params.id;
        const results = await ExamResult.find({ studentId })
            .populate('examId')
            .sort({ 'examId.date': 1 })
            .lean();

        if (results.length === 0) {
            return res.json({ history: [], stats: {}, chapters: {}, suggestion: 'No test data available.' });
        }

        // 1. History & Basic Stats
        const history = results.map(r => ({
            testName: r.examId.name,
            subject: r.examId.subject,
            chapter: r.examId.chapter,
            date: r.examId.date,
            marks: r.marksObtained,
            maxMarks: r.examId.totalMarks,
            percentage: (r.marksObtained / r.examId.totalMarks) * 100,
            isPresent: r.isPresent
        }));

        const presentTests = history.filter(h => h.isPresent);
        const percentages = presentTests.map(h => h.percentage);

        const avg = percentages.length ? (percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0;
        const best = percentages.length ? Math.max(...percentages) : 0;
        const worst = percentages.length ? Math.min(...percentages) : 0;

        // 2. Improvement Tracker (compare last 2 available results)
        let improvement = 0;
        if (presentTests.length >= 2) {
            const current = presentTests[presentTests.length - 1].percentage;
            const last = presentTests[presentTests.length - 2].percentage;
            improvement = parseFloat((current - last).toFixed(2));
        }

        // 3. Chapter Analysis
        const chapterData = {};
        presentTests.forEach(t => {
            if (!chapterData[t.chapter]) chapterData[t.chapter] = { total: 0, count: 0 };
            chapterData[t.chapter].total += t.percentage;
            chapterData[t.chapter].count += 1;
        });

        const chapters = {};
        Object.keys(chapterData).forEach(ch => {
            const score = chapterData[ch].total / chapterData[ch].count;
            chapters[ch] = {
                score: parseFloat(score.toFixed(2)),
                status: score >= 75 ? 'Strong' : (score >= 50 ? 'Average' : 'Weak')
            };
        });

        // 4. Suggestions (Simple Logic)
        const weakChapters = Object.keys(chapters).filter(ch => chapters[ch].status === 'Weak');
        const suggestion = weakChapters.length > 0
            ? `You are weak in ${weakChapters.join(', ')}. Practice more questions and revise formulas.`
            : 'Your performance is stable. Continue consistent practice!';

        res.json({
            history,
            stats: {
                avgScore: parseFloat(avg.toFixed(2)),
                bestScore: parseFloat(best.toFixed(2)),
                lowestScore: parseFloat(worst.toFixed(2)),
                totalTests: history.length,
                improvement
            },
            chapters,
            suggestion
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/batch/:id/improvers — Leaderboard
exports.getBatchImprovers = async (req, res) => {
    try {
        const batchId = req.params.id;
        const students = await Student.find({ batchId, status: 'active' }).select('name').lean();

        const improvers = [];

        for (const student of students) {
            const results = await ExamResult.find({ studentId: student._id })
                .populate('examId')
                .sort({ 'examId.date': -1 })
                .limit(2)
                .lean();

            if (results.length === 2 && results[0].isPresent && results[1].isPresent) {
                const currentPerc = (results[0].marksObtained / results[0].examId.totalMarks) * 100;
                const lastPerc = (results[1].marksObtained / results[1].examId.totalMarks) * 100;
                const diff = parseFloat((currentPerc - lastPerc).toFixed(2));

                if (diff > 0) {
                    improvers.push({
                        name: student.name,
                        improvement: diff,
                        current: currentPerc.toFixed(1),
                        last: lastPerc.toFixed(1)
                    });
                }
            }
        }

        res.json({ improvers: improvers.sort((a, b) => b.improvement - a.improvement).slice(0, 10) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /api/exams/batch/:id/top-scorers — Batch Merit List
exports.getBatchTopScorers = async (req, res) => {
    try {
        const batchId = req.params.id;
        const students = await Student.find({ batchId, status: 'active' }).select('name').lean();

        const scorers = [];

        for (const student of students) {
            const results = await ExamResult.find({ studentId: student._id, isPresent: true })
                .populate('examId')
                .lean();

            if (results.length > 0) {
                const totalPerc = results.reduce((sum, r) => {
                    const maxMarks = r.examId?.totalMarks || 100;
                    return sum + (r.marksObtained / maxMarks) * 100;
                }, 0);
                const avgPerc = totalPerc / results.length;

                scorers.push({
                    name: student.name,
                    avgScore: parseFloat(avgPerc.toFixed(2)),
                    testsTaken: results.length
                });
            }
        }

        res.json({ scorers: scorers.sort((a, b) => b.avgScore - a.avgScore).slice(0, 10) });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
