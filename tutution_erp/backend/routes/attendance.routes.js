const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');
const { disableStudentAccess, disableTeacherAccess } = require('../middleware/disableRoleAccess');

router.get('/setup/admin', verifyAdmin, controller.getAdminSetup);
router.get('/teacher/assigned-batches', disableTeacherAccess, controller.getTeacherAssignedBatches);
router.get('/roster', verifyAdmin, controller.getRoster);
router.post('/mark', verifyAdmin, controller.markAttendance);
router.put('/:id', verifyAdmin, controller.updateAttendance);
router.get('/report', verifyAdmin, controller.getAttendanceReport);
router.get('/student/report', disableStudentAccess, controller.getStudentAttendanceReport);

module.exports = router;
