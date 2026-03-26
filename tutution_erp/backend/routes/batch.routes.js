const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/batch.controller');
const tCtrl = require('../controllers/teacher.controller');
const verifyPwd = require('../middleware/verifyAdminPassword');
const { verifyAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');

// Non-protected routes
router.get('/', verifyAdmin, ctrl.getAllBatches);
router.get('/export', verifyAdmin, ctrl.exportBatches);
router.get('/room-occupancy', verifyAdmin, ctrl.getRoomOccupancy);
router.get('/courses/:course/subjects', verifyAdmin, ctrl.getSubjectsByCourse);
router.get('/:id', verifyAdmin, ctrl.getBatchById);
router.post('/', verifyAdmin, ctrl.createBatch);
router.patch('/:id/toggle', verifyAdmin, ctrl.toggleStatus);

// Admin / Teacher accessible route for updating assigned subjects without password
router.patch('/:id/subjects', verifyAdmin, ctrl.updateBatchSubjects);

// Batch subjects with teacher assignment info (used by teacher form)
router.get('/:id/subjects', verifyAdmin, tCtrl.getBatchSubjectsWithAssignments);

// Password-protected routes
router.put('/:id', verifyAdmin, verifyPwd, ctrl.updateBatch);
router.delete('/:id', verifyAdmin, requireSuperAdmin, verifyPwd, ctrl.deleteBatch);

module.exports = router;
