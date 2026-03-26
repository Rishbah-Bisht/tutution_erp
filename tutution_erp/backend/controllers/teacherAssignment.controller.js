const attendanceService = require('../services/attendance.service');

exports.createAssignment = async (req, res) => {
    try {
        const assignment = await attendanceService.createOrUpdateAssignment({
            teacherId: req.body.teacherId,
            batchId: req.body.batchId,
            subjectId: req.body.subjectId,
            assignedBy: req.userId || req.admin?.id || null
        });

        res.status(201).json({
            message: 'Subject assigned to teacher successfully.',
            assignment
        });
    } catch (error) {
        const status = error.status || (error.code === 11000 ? 400 : 500);
        res.status(status).json({ message: error.message || 'Failed to assign subject to teacher.' });
    }
};

exports.getAssignments = async (req, res) => {
    try {
        const assignments = await attendanceService.listAssignments({
            teacherId: req.query.teacherId,
            batchId: req.query.batchId,
            subjectId: req.query.subjectId,
            activeOnly: req.query.activeOnly !== 'false'
        });

        res.json({ assignments });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || 'Failed to fetch teacher assignments.' });
    }
};
