const attendanceService = require('../services/attendance.service');

exports.getAdminSetup = async (_req, res) => {
    try {
        const data = await attendanceService.getAdminSetupData();
        res.json(data);
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to load attendance setup data.' });
    }
};

exports.getTeacherAssignedBatches = async (req, res) => {
    try {
        const data = await attendanceService.getTeacherAssignedBatches(req.userId);
        res.json(data);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to load teacher assignments.' });
    }
};

exports.getRoster = async (req, res) => {
    try {
        const data = await attendanceService.getAttendanceRoster({
            actorRole: req.role,
            actorId: req.userId,
            batchId: req.query.batchId,
            subjectId: req.query.subjectId,
            date: req.query.date
        });
        res.json(data);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to load attendance roster.' });
    }
};

exports.markAttendance = async (req, res) => {
    try {
        const result = await attendanceService.markAttendance({
            actorRole: req.role,
            actorId: req.userId,
            batchId: req.body.batchId,
            subjectId: req.body.subjectId,
            date: req.body.date,
            entries: req.body.entries
        });

        res.status(201).json({
            message: 'Attendance saved successfully.',
            ...result
        });
    } catch (error) {
        const status = error.status || (error.code === 11000 ? 409 : 500);
        res.status(status).json({ message: error.message || 'Failed to mark attendance.' });
    }
};

exports.updateAttendance = async (req, res) => {
    try {
        const attendance = await attendanceService.updateAttendanceRecord({
            actorRole: req.role,
            actorId: req.userId,
            attendanceId: req.params.id,
            status: req.body.status,
            notes: req.body.notes
        });

        res.json({
            message: 'Attendance updated successfully.',
            attendance
        });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to update attendance.' });
    }
};

exports.getAttendanceReport = async (req, res) => {
    try {
        const report = await attendanceService.getAttendanceReport({
            actorRole: req.role,
            actorId: req.userId,
            batchId: req.query.batchId,
            subjectId: req.query.subjectId,
            studentId: req.query.studentId,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            page: req.query.page,
            limit: req.query.limit
        });

        res.json(report);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to fetch attendance report.' });
    }
};

exports.getStudentAttendanceReport = async (req, res) => {
    try {
        const report = await attendanceService.getAttendanceReport({
            actorRole: req.role,
            actorId: req.userId,
            dateFrom: req.query.dateFrom,
            dateTo: req.query.dateTo,
            page: req.query.page,
            limit: req.query.limit
        });

        res.json(report);
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to fetch attendance report.' });
    }
};
