const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const Batch = require('../models/Batch');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const TeacherAssignment = require('../models/TeacherAssignment');
const { triggerAutomaticNotification } = require('./notificationService');

const VALID_STATUSES = ['Present', 'Absent', 'Late'];

const asObjectId = (value, label) => {
    if (!mongoose.Types.ObjectId.isValid(value)) {
        const error = new Error(`${label} is invalid.`);
        error.status = 400;
        throw error;
    }
    return new mongoose.Types.ObjectId(value);
};

const normalizeAttendanceDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        const error = new Error('A valid attendance date is required.');
        error.status = 400;
        throw error;
    }
    date.setHours(0, 0, 0, 0);
    return date;
};

const normalizeStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    const map = {
        present: 'Present',
        absent: 'Absent',
        late: 'Late'
    };
    if (!map[normalized]) {
        const error = new Error('Attendance status must be Present, Absent, or Late.');
        error.status = 400;
        throw error;
    }
    return map[normalized];
};

const ensureTeacherAccess = async (teacherId, batchId, subjectId) => {
    const assignment = await TeacherAssignment.findOne({
        teacherId,
        batchId,
        subjectId,
        isActive: true
    }).lean();

    if (!assignment) {
        const error = new Error('You are not assigned to this batch and subject.');
        error.status = 403;
        throw error;
    }

    return assignment;
};

const ensureSubjectLinkedToBatch = async (batch, subject) => {
    const updates = {};
    const hasSubjectId = (batch.subjectIds || []).some((id) => id.toString() === subject._id.toString());
    const hasSubjectName = (batch.subjects || []).includes(subject.name);

    if (!hasSubjectId) {
        updates.$addToSet = { ...(updates.$addToSet || {}), subjectIds: subject._id };
    }

    if (!hasSubjectName) {
        updates.$addToSet = { ...(updates.$addToSet || {}), subjects: subject.name };
    }

    if (Object.keys(updates).length > 0) {
        await Batch.findByIdAndUpdate(batch._id, updates);
    }
};

const syncLegacyTeacherAssignments = async (teacherId) => {
    const assignments = await TeacherAssignment.find({ teacherId, isActive: true })
        .populate('batchId', 'name')
        .populate('subjectId', 'name')
        .lean();

    const grouped = new Map();

    assignments.forEach((assignment) => {
        const batchKey = assignment.batchId?._id?.toString() || assignment.batchId?.toString();
        if (!batchKey) return;

        if (!grouped.has(batchKey)) {
            grouped.set(batchKey, {
                batchId: assignment.batchId?._id || assignment.batchId,
                batchName: assignment.batchId?.name || '',
                subjects: []
            });
        }

        const current = grouped.get(batchKey);
        const subjectName = assignment.subjectId?.name || '';
        if (subjectName && !current.subjects.includes(subjectName)) {
            current.subjects.push(subjectName);
        }
    });

    await Teacher.findByIdAndUpdate(teacherId, {
        assignments: Array.from(grouped.values())
    });
};

const buildAssignmentQuery = ({ teacherId, batchId, subjectId, activeOnly = true }) => {
    const query = {};
    if (teacherId) query.teacherId = asObjectId(teacherId, 'Teacher');
    if (batchId) query.batchId = asObjectId(batchId, 'Batch');
    if (subjectId) query.subjectId = asObjectId(subjectId, 'Subject');
    if (activeOnly) query.isActive = true;
    return query;
};

exports.createSubject = async ({ name, code, batchId }) => {
    if (!name || !String(name).trim()) {
        const error = new Error('Subject name is required.');
        error.status = 400;
        throw error;
    }

    if (!batchId || !mongoose.Types.ObjectId.isValid(batchId)) {
        const error = new Error('A valid batchId is required.');
        error.status = 400;
        throw error;
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
        const error = new Error('Batch not found.');
        error.status = 404;
        throw error;
    }

    const subject = new Subject({
        name: String(name).trim(),
        code: code ? String(code).trim().toUpperCase() : undefined,
        batchId: new mongoose.Types.ObjectId(batchId)
    });

    await subject.save();

    // Automatically add this new subject to the batch's subject lists
    await ensureSubjectLinkedToBatch(batch, subject);

    return subject.toObject();
};

exports.listSubjects = async ({ activeOnly = true, batchId } = {}) => {
    const query = activeOnly ? { isActive: true } : {};
    if (batchId) {
        query.batchId = asObjectId(batchId, 'Batch');
    }
    return Subject.find(query).sort({ name: 1 }).lean();
};

exports.createOrUpdateAssignment = async ({ teacherId, batchId, subjectId, assignedBy }) => {
    const teacherObjectId = asObjectId(teacherId, 'Teacher');
    const batchObjectId = asObjectId(batchId, 'Batch');
    const subjectObjectId = asObjectId(subjectId, 'Subject');

    const [teacher, batch, subject, previousAssignment] = await Promise.all([
        Teacher.findById(teacherObjectId).select('name regNo').lean(),
        Batch.findById(batchObjectId).select('name course subjects subjectIds').lean(),
        Subject.findById(subjectObjectId).select('name code').lean(),
        TeacherAssignment.findOne({ batchId: batchObjectId, subjectId: subjectObjectId }).lean()
    ]);

    if (!teacher) {
        const error = new Error('Teacher not found.');
        error.status = 404;
        throw error;
    }

    if (!batch) {
        const error = new Error('Batch not found.');
        error.status = 404;
        throw error;
    }

    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    await ensureSubjectLinkedToBatch(batch, subject);

    const assignment = await TeacherAssignment.findOneAndUpdate(
        { batchId: batchObjectId, subjectId: subjectObjectId },
        {
            teacherId: teacherObjectId,
            batchId: batchObjectId,
            subjectId: subjectObjectId,
            assignedBy: assignedBy || null,
            isActive: true,
            updatedAt: new Date()
        },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    )
        .populate('teacherId', 'name regNo')
        .populate('batchId', 'name course')
        .populate('subjectId', 'name code');

    await syncLegacyTeacherAssignments(teacherObjectId);

    if (previousAssignment && previousAssignment.teacherId?.toString() !== teacherObjectId.toString()) {
        await syncLegacyTeacherAssignments(previousAssignment.teacherId);
    }

    // Trigger Automatic Notification
    triggerAutomaticNotification({
        eventType: 'teacherBatchAssignment',
        teacherId: teacherObjectId,
        message: `You have been assigned to batch ${batch.name} for ${subject.name}.`,
        data: {
            batchName: batch.name,
            schedule: 'Check your dashboard for schedule details' // Or extract from batch if available
        }
    });

    return assignment.toObject();
};

exports.listAssignments = async ({ teacherId, batchId, subjectId, activeOnly = true } = {}) => {
    const query = buildAssignmentQuery({ teacherId, batchId, subjectId, activeOnly });
    return TeacherAssignment.find(query)
        .populate('teacherId', 'name regNo')
        .populate('batchId', 'name course')
        .populate('subjectId', 'name code')
        .sort({ createdAt: -1 })
        .lean();
};

exports.getAdminSetupData = async () => {
    const [batches, teachers, subjects, assignments] = await Promise.all([
        Batch.find({ isActive: true }).select('name course subjects subjectIds').sort({ name: 1 }).lean(),
        Teacher.find({ status: 'active' }).select('name regNo').sort({ name: 1 }).lean(),
        Subject.find({ isActive: true }).select('name code').sort({ name: 1 }).lean(),
        TeacherAssignment.find({ isActive: true })
            .populate('teacherId', 'name regNo')
            .populate('batchId', 'name course')
            .populate('subjectId', 'name code')
            .sort({ createdAt: -1 })
            .lean()
    ]);

    return { batches, teachers, subjects, assignments };
};

exports.getTeacherAssignedBatches = async (teacherId) => {
    const teacherObjectId = asObjectId(teacherId, 'Teacher');

    const assignments = await TeacherAssignment.find({
        teacherId: teacherObjectId,
        isActive: true
    })
        .populate('batchId', 'name course')
        .populate('subjectId', 'name code')
        .sort({ createdAt: -1 })
        .lean();

    const grouped = new Map();
    assignments.forEach((assignment) => {
        const batchKey = assignment.batchId?._id?.toString();
        if (!batchKey) return;

        if (!grouped.has(batchKey)) {
            grouped.set(batchKey, {
                batchId: assignment.batchId._id,
                batchName: assignment.batchId.name,
                course: assignment.batchId.course || '',
                subjects: []
            });
        }

        grouped.get(batchKey).subjects.push({
            assignmentId: assignment._id,
            subjectId: assignment.subjectId?._id,
            subjectName: assignment.subjectId?.name || '',
            subjectCode: assignment.subjectId?.code || ''
        });
    });

    return {
        assignments,
        batches: Array.from(grouped.values())
    };
};

exports.getAttendanceRoster = async ({ actorRole, actorId, batchId, subjectId, date }) => {
    const batchObjectId = asObjectId(batchId, 'Batch');
    const subjectObjectId = asObjectId(subjectId, 'Subject');
    const attendanceDate = normalizeAttendanceDate(date || new Date());

    if (actorRole === 'teacher') {
        await ensureTeacherAccess(actorId, batchObjectId, subjectObjectId);
    }

    const [batch, subject, students, existingAttendance] = await Promise.all([
        Batch.findById(batchObjectId).select('name course subjects subjectIds').lean(),
        Subject.findById(subjectObjectId).select('name code').lean(),
        Student.find({ batchId: batchObjectId, status: 'active' })
            .select('name rollNo profileImage contact')
            .sort({ name: 1 })
            .lean(),
        Attendance.find({
            batchId: batchObjectId,
            subjectId: subjectObjectId,
            attendanceDate
        }).select('studentId status notes').lean()
    ]);

    if (!batch) {
        const error = new Error('Batch not found.');
        error.status = 404;
        throw error;
    }

    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    const attendanceMap = new Map(
        existingAttendance.map((record) => [
            record.studentId.toString(),
            {
                status: record.status,
                notes: record.notes || ''
            }
        ])
    );

    return {
        batch,
        subject,
        date: attendanceDate,
        isMarked: existingAttendance.length > 0,
        students: students.map((student) => ({
            ...student,
            attendanceStatus: attendanceMap.get(student._id.toString())?.status || 'Present',
            attendanceNotes: attendanceMap.get(student._id.toString())?.notes || ''
        }))
    };
};

exports.markAttendance = async ({ actorRole, actorId, batchId, subjectId, date, entries }) => {
    const batchObjectId = asObjectId(batchId, 'Batch');
    const subjectObjectId = asObjectId(subjectId, 'Subject');
    const attendanceDate = normalizeAttendanceDate(date);

    if (!Array.isArray(entries) || entries.length === 0) {
        const error = new Error('Attendance entries are required.');
        error.status = 400;
        throw error;
    }

    if (actorRole === 'teacher') {
        await ensureTeacherAccess(actorId, batchObjectId, subjectObjectId);
    }

    const [batch, subject] = await Promise.all([
        Batch.findById(batchObjectId).select('name course').lean(),
        Subject.findById(subjectObjectId).select('name code').lean()
    ]);

    if (!batch) {
        const error = new Error('Batch not found.');
        error.status = 404;
        throw error;
    }

    if (!subject) {
        const error = new Error('Subject not found.');
        error.status = 404;
        throw error;
    }

    const dedupedEntries = new Map();
    entries.forEach((entry) => {
        if (!entry?.studentId) return;
        dedupedEntries.set(String(entry.studentId), {
            studentId: String(entry.studentId),
            status: normalizeStatus(entry.status),
            notes: entry.notes ? String(entry.notes).trim() : ''
        });
    });

    if (dedupedEntries.size === 0) {
        const error = new Error('At least one valid student attendance entry is required.');
        error.status = 400;
        throw error;
    }

    const studentIds = Array.from(dedupedEntries.keys()).map((studentId) => asObjectId(studentId, 'Student'));

    const students = await Student.find({
        _id: { $in: studentIds },
        batchId: batchObjectId,
        status: 'active'
    }).select('name rollNo').lean();

    if (students.length !== studentIds.length) {
        const error = new Error('One or more students do not belong to the selected active batch.');
        error.status = 400;
        throw error;
    }

    const bulkOps = students.map((student) => {
        const entry = dedupedEntries.get(student._id.toString());
        return {
            updateOne: {
                filter: {
                    studentId: student._id,
                    batchId: batchObjectId,
                    subjectId: subjectObjectId,
                    attendanceDate
                },
                update: {
                    $set: {
                        studentId: student._id,
                        batchId: batchObjectId,
                        subjectId: subjectObjectId,
                        date: attendanceDate,
                        attendanceDate,
                        status: entry.status,
                        notes: entry.notes,
                        markedBy: actorId || null,
                        markedByModel: actorRole === 'admin' ? 'Admin' : 'Teacher',
                        markedByRole: actorRole,
                        updatedAt: new Date()
                    },
                    $setOnInsert: {
                        createdAt: new Date()
                    }
                },
                upsert: true
            }
        };
    });

    await Attendance.bulkWrite(bulkOps, { ordered: false });

    const statusSummary = {
        Present: 0,
        Absent: 0,
        Late: 0
    };

    students.forEach((student) => {
        const entry = dedupedEntries.get(student._id.toString());
        statusSummary[entry.status] += 1;
    });

    return {
        batch,
        subject,
        date: attendanceDate,
        totals: {
            processed: students.length,
            present: statusSummary.Present,
            absent: statusSummary.Absent,
            late: statusSummary.Late
        }
    };
};

exports.updateAttendanceRecord = async ({ actorRole, actorId, attendanceId, status, notes }) => {
    const attendance = await Attendance.findById(attendanceId);
    if (!attendance) {
        const error = new Error('Attendance record not found.');
        error.status = 404;
        throw error;
    }

    if (actorRole === 'teacher') {
        await ensureTeacherAccess(actorId, attendance.batchId, attendance.subjectId);
    }

    attendance.status = normalizeStatus(status);
    attendance.notes = notes ? String(notes).trim() : attendance.notes;
    attendance.markedBy = actorId || attendance.markedBy;
    attendance.markedByModel = actorRole === 'admin' ? 'Admin' : 'Teacher';
    attendance.markedByRole = actorRole;
    attendance.updatedAt = new Date();

    await attendance.save();

    await attendance.populate('studentId', 'name rollNo');
    await attendance.populate('batchId', 'name');
    await attendance.populate('subjectId', 'name code');

    return attendance.toObject();
};

exports.getAttendanceReport = async ({
    actorRole,
    actorId,
    batchId,
    subjectId,
    studentId,
    dateFrom,
    dateTo,
    page = 1,
    limit = 50
}) => {
    const query = {};

    if (batchId) query.batchId = asObjectId(batchId, 'Batch');
    if (subjectId) query.subjectId = asObjectId(subjectId, 'Subject');
    if (studentId) query.studentId = asObjectId(studentId, 'Student');

    if (actorRole === 'student') {
        query.studentId = asObjectId(actorId, 'Student');
    }

    if (dateFrom || dateTo) {
        query.attendanceDate = {};
        if (dateFrom) query.attendanceDate.$gte = normalizeAttendanceDate(dateFrom);
        if (dateTo) query.attendanceDate.$lte = normalizeAttendanceDate(dateTo);
    }

    if (actorRole === 'teacher') {
        const teacherAssignments = await TeacherAssignment.find({
            teacherId: asObjectId(actorId, 'Teacher'),
            isActive: true
        }).select('batchId subjectId').lean();

        if (teacherAssignments.length === 0) {
            return {
                records: [],
                summary: { total: 0, present: 0, absent: 0, late: 0 },
                pagination: { page: Number(page), limit: Number(limit), total: 0, pages: 0 }
            };
        }

        query.$or = teacherAssignments.map((assignment) => ({
            batchId: assignment.batchId,
            subjectId: assignment.subjectId
        }));
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
    const skip = (safePage - 1) * safeLimit;

    const [records, total, summaryRows] = await Promise.all([
        Attendance.find(query)
            .populate('studentId', 'name rollNo')
            .populate('batchId', 'name course')
            .populate('subjectId', 'name code')
            .populate('markedBy', 'adminName name')
            .sort({ attendanceDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .lean(),
        Attendance.countDocuments(query),
        Attendance.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ])
    ]);

    const summary = {
        total,
        present: 0,
        absent: 0,
        late: 0
    };

    summaryRows.forEach((row) => {
        if (row._id === 'Present') summary.present = row.count;
        if (row._id === 'Absent') summary.absent = row.count;
        if (row._id === 'Late') summary.late = row.count;
    });

    return {
        records,
        summary,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            pages: total === 0 ? 0 : Math.ceil(total / safeLimit)
        }
    };
};
