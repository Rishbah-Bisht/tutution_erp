const attendanceService = require('../services/attendance.service');

exports.createSubject = async (req, res) => {
    try {
        const subject = await attendanceService.createSubject(req.body);
        res.status(201).json({ message: 'Subject created successfully.', subject });
    } catch (error) {
        const status = error.status || (error.code === 11000 ? 400 : 500);
        res.status(status).json({ message: error.message || 'Failed to create subject.' });
    }
};

exports.getSubjects = async (req, res) => {
    try {
        const subjects = await attendanceService.listSubjects({
            activeOnly: req.query.activeOnly !== 'false'
        });
        res.json({ subjects });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Failed to fetch subjects.' });
    }
};
