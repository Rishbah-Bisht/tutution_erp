const mongoose = require('mongoose');
const TeacherAssignment = require('../models/TeacherAssignment');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const { getPrismaClient, connectPostgres } = require('../config/postgres');

const getTeacherBatchIds = async (teacherId) => {
    const assignments = await TeacherAssignment.find({ teacherId, isActive: true })
        .select('batchId')
        .lean();

    const unique = Array.from(new Set(assignments.map((a) => a.batchId.toString())));
    return unique.map((id) => new mongoose.Types.ObjectId(id));
};

const hasBatchAccess = (batchIds, batchId) => {
    const target = batchId.toString();
    return batchIds.some((id) => id.toString() === target);
};

exports.getAssignedStudents = async (req, res) => {
    try {
        const batchIds = await getTeacherBatchIds(req.userId);
        if (batchIds.length === 0) {
            return res.json({ students: [] });
        }

        const batchId = req.query.batchId;
        if (batchId && !hasBatchAccess(batchIds, batchId)) {
            return res.status(403).json({ message: 'Access denied to this batch.' });
        }

        const query = {
            status: 'active',
            batchId: batchId ? new mongoose.Types.ObjectId(batchId) : { $in: batchIds }
        };

        const students = await Student.find(query)
            .select('name rollNo contact email batchId')
            .populate('batchId', 'name course')
            .sort({ name: 1 })
            .lean();

        res.json({ students });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load students.' });
    }
};

exports.getTeacherExams = async (req, res) => {
    try {
        const batchIds = await getTeacherBatchIds(req.userId);
        if (batchIds.length === 0) {
            return res.json({ exams: [] });
        }

        const query = { batchId: { $in: batchIds } };
        if (req.query.status) {
            query.status = req.query.status;
        }

        const exams = await Exam.find(query)
            .populate('batchId', 'name course')
            .sort({ date: -1, createdAt: -1 })
            .lean();

        const examIds = exams.map((exam) => exam._id);
        let resultStats = [];

        if (examIds.length > 0) {
            resultStats = await ExamResult.aggregate([
                { $match: { examId: { $in: examIds } } },
                {
                    $group: {
                        _id: '$examId',
                        count: { $sum: 1 },
                        latestUpload: { $max: '$uploadedAt' }
                    }
                }
            ]);
        }

        const statsMap = new Map(
            resultStats.map((row) => [row._id.toString(), row])
        );

        const decorated = exams.map((exam) => {
            const stats = statsMap.get(exam._id.toString());
            return {
                ...exam,
                resultCount: stats?.count || 0,
                resultsUploadedAt: stats?.latestUpload || null
            };
        });

        res.json({ exams: decorated });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load exams.' });
    }
};

exports.getTeacherExamResults = async (req, res) => {
    try {
        const exam = await Exam.findById(req.params.id).populate('batchId', 'name course').lean();
        if (!exam) return res.status(404).json({ message: 'Exam not found' });

        const batchIds = await getTeacherBatchIds(req.userId);
        const examBatchId = exam.batchId?._id || exam.batchId;

        if (!hasBatchAccess(batchIds, examBatchId)) {
            return res.status(403).json({ message: 'Access denied to this exam.' });
        }

        const results = await ExamResult.find({ examId: exam._id })
            .populate('studentId', 'name rollNo')
            .sort({ 'studentId.name': 1 })
            .lean();

        res.json({ exam, results });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load exam results.' });
    }
};

exports.getTeacherSalaries = async (req, res) => {
    try {
        await connectPostgres();
        const prisma = getPrismaClient();
        const teacherId = req.userId;

        const records = await prisma.payrollRecord.findMany({
            where: { teacherId },
            include: {
                deductions: {
                    orderBy: { createdAt: 'asc' }
                }
            },
            orderBy: [
                { payrollMonth: 'desc' },
                { createdAt: 'desc' }
            ]
        });

        const COMPATIBILITY_STATUS_MAP = {
            'PAID': 'Paid',
            'PARTIALLY_PAID': 'Processing',
            'PENDING': 'Pending'
        };

        const mapped = records.map(record => {
            const leaveDeductions = record.deductions
                .filter(d => d.deductionType === 'LEAVE')
                .reduce((sum, d) => sum + Number(d.amount), 0);
            const advanceDeductions = record.deductions
                .filter(d => d.deductionType === 'ADVANCE')
                .reduce((sum, d) => sum + Number(d.amount), 0);

            return {
                _id: record.id,
                monthYear: record.payrollMonth,
                baseSalary: Number(record.baseSalary),
                extraClassesAmount: Number(record.extraClassesAmount || 0),
                bonusAmount: Number(record.bonusAmount || 0),
                leaveDeductions,
                advanceDeductions,
                netSalary: Number(record.netSalary),
                status: COMPATIBILITY_STATUS_MAP[record.status] || 'Pending',
                paymentMethod: record.paymentMethod,
                transactionId: record.paymentReference,
                paymentDate: record.paymentDate,
                createdAt: record.createdAt
            };
        });

        res.json(mapped);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load salaries.' });
    }
};
