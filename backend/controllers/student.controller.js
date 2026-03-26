const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { triggerAutomaticNotification } = require('../services/notificationService');
const { connectPostgres, getPrismaClient } = require('../config/postgres');

const getActivityConfig = () => ({
    onlineMinutes: Math.max(parseInt(process.env.ACTIVITY_ONLINE_MINUTES || '5', 10) || 5, 1),
    inactiveDays: Math.max(parseInt(process.env.ACTIVITY_INACTIVE_DAYS || '7', 10) || 7, 1)
});

const deriveActivityStatus = (student) => {
    const { onlineMinutes, inactiveDays } = getActivityConfig();
    const lastActiveAt = student.lastActiveAt || student.lastAppOpenAt || student.portalAccess?.lastLoginAt || null;

    if (!lastActiveAt) {
        return {
            status: 'inactive',
            lastActiveAt: null,
            lastAppOpenAt: student.lastAppOpenAt || null,
            device: student.lastDevice || {}
        };
    }

    const now = Date.now();
    const diffMs = now - new Date(lastActiveAt).getTime();
    const minutesSince = diffMs / (60 * 1000);
    const daysSince = diffMs / (24 * 60 * 60 * 1000);

    let status = 'offline';
    if (minutesSince <= onlineMinutes) status = 'online';
    if (daysSince >= inactiveDays) status = 'inactive';

    return {
        status,
        lastActiveAt,
        lastAppOpenAt: student.lastAppOpenAt || null,
        device: student.lastDevice || {}
    };
};

const getAttendanceDateRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

const buildAttendanceSummaryMap = async (studentIds, { dateFrom, dateTo } = {}) => {
    if (!studentIds || studentIds.length === 0) return new Map();

    const match = { studentId: { $in: studentIds } };
    if (dateFrom || dateTo) {
        match.attendanceDate = {};
        if (dateFrom) match.attendanceDate.$gte = dateFrom;
        if (dateTo) match.attendanceDate.$lte = dateTo;
    }

    const rows = await Attendance.aggregate([
        { $match: match },
        {
            $group: {
                _id: { studentId: '$studentId', status: '$status' },
                count: { $sum: 1 }
            }
        }
    ]);

    const summaryMap = new Map();

    rows.forEach((row) => {
        const studentId = row._id.studentId.toString();
        if (!summaryMap.has(studentId)) {
            summaryMap.set(studentId, { total: 0, present: 0, absent: 0, late: 0, percentage: 0 });
        }
        const summary = summaryMap.get(studentId);
        if (row._id.status === 'Present') summary.present = row.count;
        if (row._id.status === 'Absent') summary.absent = row.count;
        if (row._id.status === 'Late') summary.late = row.count;
    });

    summaryMap.forEach((summary) => {
        summary.total = summary.present + summary.absent + summary.late;
        summary.percentage = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;
    });

    return summaryMap;
};

const toActivityFilters = (query = {}) => {
    const rawActivity = String(query.activityStatus || query.activity || '').toLowerCase();
    const statusParam = String(query.status || '').toLowerCase();
    let activityStatus = rawActivity;
    let studentStatus = query.studentStatus || '';

    if (!activityStatus && ['online', 'offline', 'inactive'].includes(statusParam)) {
        activityStatus = statusParam;
    } else if (!studentStatus && statusParam && !['online', 'offline', 'inactive'].includes(statusParam)) {
        studentStatus = statusParam;
    }

    return { activityStatus, studentStatus };
};

const toMoney = (value) => Number(Number(value || 0).toFixed(2));

// GET /api/students/stats
exports.getStudentStats = async (req, res) => {
    try {
        const total = await Student.countDocuments();
        const active = await Student.countDocuments({ status: 'active' });
        const completed = await Student.countDocuments({ status: 'completed' });

        let feePending = 0;
        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const pendingBalances = await prisma.feeBalance.findMany({
                where: {
                    status: { in: ['PENDING', 'OVERDUE'] }
                },
                select: {
                    studentId: true
                }
            });

            const pendingFeeStudentIds = pendingBalances
                .map((row) => row.studentId)
                .filter((id) => mongoose.Types.ObjectId.isValid(id));

            feePending = await Student.countDocuments({
                _id: { $in: pendingFeeStudentIds },
                status: 'active'
            });
        } catch (error) {
            console.warn('[StudentStats] Prisma fee balances unavailable:', error.message);
        }

        // New admissions this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const newAdmissions = await Student.countDocuments({ admissionDate: { $gte: startOfMonth } });

        const { start, end } = getAttendanceDateRange();
        const attendanceRows = await Attendance.aggregate([
            { $match: { attendanceDate: { $gte: start, $lte: end } } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const presentCount = attendanceRows.find((row) => row._id === 'Present')?.count || 0;
        const totalCount = attendanceRows.reduce((sum, row) => sum + row.count, 0);
        const attendanceAvg = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

        res.json({
            total,
            active,
            completed,
            feePending,
            newAdmissions,
            attendanceAvg
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching stats', error: err.message });
    }
};

// GET /api/students/activity
exports.getStudentActivity = async (req, res) => {
    try {
        const { search = '', batch = '', page = 1, limit = 20 } = req.query;
        const { activityStatus, studentStatus } = toActivityFilters(req.query);

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
        const safePage = Math.max(parseInt(page, 10) || 1, 1);
        const skip = (safePage - 1) * safeLimit;

        const match = {};
        if (search) {
            match.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { rollNo: { $regex: search, $options: 'i' } }
            ];
        }

        if (batch && mongoose.Types.ObjectId.isValid(batch)) {
            match.batchId = new mongoose.Types.ObjectId(batch);
        }

        if (studentStatus) {
            match.status = studentStatus;
        }

        const { onlineMinutes, inactiveDays } = getActivityConfig();
        const now = new Date();
        const onlineThreshold = new Date(now.getTime() - onlineMinutes * 60 * 1000);
        const inactiveThreshold = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000);

        const pipeline = [
            { $match: match },
            {
                $addFields: {
                    activityAt: {
                        $ifNull: [
                            '$lastActiveAt',
                            { $ifNull: ['$lastAppOpenAt', '$portalAccess.lastLoginAt'] }
                        ]
                    }
                }
            },
            {
                $addFields: {
                    activityStatus: {
                        $switch: {
                            branches: [
                                {
                                    case: {
                                        $or: [
                                            { $eq: ['$activityAt', null] },
                                            { $lte: ['$activityAt', inactiveThreshold] }
                                        ]
                                    },
                                    then: 'inactive'
                                },
                                {
                                    case: { $gte: ['$activityAt', onlineThreshold] },
                                    then: 'online'
                                }
                            ],
                            default: 'offline'
                        }
                    }
                }
            }
        ];

        if (activityStatus) {
            pipeline.push({ $match: { activityStatus } });
        }

        pipeline.push({
            $facet: {
                data: [
                    { $sort: { activityAt: -1, name: 1 } },
                    { $skip: skip },
                    { $limit: safeLimit },
                    {
                        $project: {
                            name: 1,
                            rollNo: 1,
                            className: 1,
                            batchId: 1,
                            status: 1,
                            contact: 1,
                            email: 1,
                            portalAccess: 1,
                            lastActiveAt: 1,
                            lastAppOpenAt: 1,
                            lastDevice: 1,
                            activityStatus: 1,
                            activityAt: 1
                        }
                    }
                ],
                total: [{ $count: 'count' }]
            }
        });

        const [result] = await Student.aggregate(pipeline);
        const total = result?.total?.[0]?.count || 0;
        const students = (result?.data || []).map((student) => ({
            ...student,
            activity: {
                status: student.activityStatus,
                lastActiveAt: student.lastActiveAt || null,
                lastAppOpenAt: student.lastAppOpenAt || null,
                device: student.lastDevice || {}
            }
        }));

        res.json({
            students,
            total,
            page: safePage,
            pages: Math.ceil(total / safeLimit),
            thresholds: { onlineMinutes, inactiveDays }
        });
    } catch (err) {
        console.error('[getStudentActivity]', err);
        res.status(500).json({ message: 'Server error', error: err.message });
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

        const { start, end } = getAttendanceDateRange();
        const attendanceMap = await buildAttendanceSummaryMap(
            students.map((student) => student._id),
            { dateFrom: start, dateTo: end }
        );

        const enriched = students.map((student) => ({
            ...student,
            activity: deriveActivityStatus(student),
            attendanceSummary: attendanceMap.get(student._id.toString()) || {
                total: 0,
                present: 0,
                absent: 0,
                late: 0,
                percentage: 0
            }
        }));

        res.json({ students: enriched, total, page: parseInt(page), pages: Math.ceil(total / limit) });
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
            portalAccess: { signupStatus: 'no' },
            fees: data.fees || 0,
            registrationFee: data.registrationFee || 0,
            fatherName: data.fatherName,
            motherName: data.motherName,
            currentYear: data.currentYear || '1',
            status: data.batchId ? 'active' : 'batch_pending'
        };

        const student = new Student(studentData);
        await student.save();

        // Send onboarding notification
        if (student) {
            await triggerAutomaticNotification({
                studentId: student._id,
                message: `Welcome ${student.name}! Your registration is successful. Roll No: ${student.rollNo}, Password: ${req.body.password || 'student@123'}. Please login to your portal to complete your profile.`,
                eventType: 'studentRegistration',
                adminId: req.admin?.id,
                data: {
                    password: req.body.password || 'student@123'
                }
            });
        }

        const result = student.toObject();
        delete result.password;
        res.status(201).json({
            message: student.batchId ? 'Student created successfully' : 'Student created (Batch Pending)',
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

        if (data.password !== undefined) {
            if (String(data.password).trim()) {
                data.password = await bcrypt.hash(String(data.password).trim(), 10);
            } else {
                delete data.password;
            }
        }

        if (isActivatingBatch && oldStudent.status === 'batch_pending') {
            data.status = 'active';
        }

        const student = await Student.findByIdAndUpdate(req.params.id, data, { new: true });

        if (isActivatingBatch) {
            if (student && data.batchId) {
                const batch = await require('../models/Batch').findById(data.batchId);
                await triggerAutomaticNotification({
                    studentId: student._id,
                    message: `Hello ${student.name}, you have been assigned to the batch: ${batch?.name || 'Assigned Batch'}. Timing: ${batch?.timeSlots?.[0] || 'TBA'}.`,
                    eventType: 'batchAssignment',
                    adminId: req.admin?.id,
                    data: {
                        batchName: batch?.name || 'Assigned Batch',
                        timing: batch?.timeSlots?.[0] || 'TBA'
                    }
                });
            }
        }

        res.json({
            message: isActivatingBatch ? 'Batch assigned successfully' : 'Updated',
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

        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            await prisma.feePayment.deleteMany({ where: { studentId: student._id.toString() } });
            await prisma.feeBalance.deleteMany({ where: { studentId: student._id.toString() } });
        } catch (error) {
            console.warn('[deleteStudent] Prisma fee cleanup skipped:', error.message);
        }

        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /api/students/delete-all
exports.deleteAllStudents = async (req, res) => {
    try {
        await Student.deleteMany({});

        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            await prisma.feePayment.deleteMany({});
            await prisma.feeBalance.deleteMany({});
        } catch (error) {
            console.warn('[deleteAllStudents] Prisma fee cleanup skipped:', error.message);
        }

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
                    password: 'student@123',
                    portalAccess: { signupStatus: 'no' }
                });
                await student.save();

                // Send onboarding notification
                if (student) {
                    await triggerAutomaticNotification({
                        studentId: student._id,
                        message: `Welcome ${student.name}! Your registration is successful. Roll No: ${student.rollNo}, Password: student@123. Please login to your portal.`,
                        eventType: 'studentRegistration',
                        adminId: req.admin?.id,
                        data: {
                            password: 'student@123'
                        }
                    });
                }

                successCount++;
            } catch (err) {
                failedCount++;
                errors.push({ name: s.name || 'Unknown', error: err.message });
            }
        }));

        res.status(201).json({
            message: `${successCount} students inserted, ${failedCount} failed.`,
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
        let feeBalance = null;
        let feePayments = [];

        try {
            await connectPostgres();
            const prisma = getPrismaClient();
            const studentId = student._id.toString();
            const [balanceRecord, paymentRecords] = await Promise.all([
                prisma.feeBalance.findUnique({
                    where: { studentId }
                }),
                prisma.feePayment.findMany({
                    where: { studentId },
                    orderBy: { paymentDate: 'desc' }
                })
            ]);

            feeBalance = balanceRecord ? {
                ...balanceRecord,
                totalCharged: toMoney(balanceRecord.totalCharged),
                totalPaid: toMoney(balanceRecord.totalPaid),
                currentBalance: toMoney(balanceRecord.currentBalance),
                overdueAmount: toMoney(balanceRecord.overdueAmount),
                status: String(balanceRecord.status || '').toLowerCase()
            } : null;

            feePayments = paymentRecords.map((payment) => ({
                ...payment,
                amount: toMoney(payment.amount),
                balanceBeforePayment: toMoney(payment.balanceBeforePayment),
                balanceAfterPayment: toMoney(payment.balanceAfterPayment)
            }));
        } catch (error) {
            console.warn('[getStudentById] Prisma fee lookup unavailable:', error.message);
        }

        const { start, end } = getAttendanceDateRange();
        const attendanceMap = await buildAttendanceSummaryMap([student._id], { dateFrom: start, dateTo: end });
        const attendanceSummary = attendanceMap.get(student._id.toString()) || {
            total: 0,
            present: 0,
            absent: 0,
            late: 0,
            percentage: 0
        };

        res.json({
            student: { ...student, activity: deriveActivityStatus(student), attendanceSummary },
            feeBalance,
            feePayments,
            fees: feePayments
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
