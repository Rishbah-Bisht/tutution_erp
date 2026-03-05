const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/exam.controller');
const { adminAuth } = require('../middleware/auth.middleware');

// All routes require admin auth
router.use(adminAuth);

router.get('/', ctrl.getAllExams);
router.post('/', ctrl.createExam);
router.put('/:id', ctrl.updateExam);
router.delete('/:id', ctrl.deleteExam);

router.get('/:id/students', ctrl.getExamStudents);
router.get('/:id/results', ctrl.getExamResults);
router.post('/:id/results', ctrl.saveMarks);

// Analytics & Performance
router.get('/:id/analytics', ctrl.getExamAnalytics);
router.get('/student/:id/performance', ctrl.getStudentPerformance);
router.get('/batch/:id/improvers', ctrl.getBatchImprovers);
router.get('/batch/:id/top-scorers', ctrl.getBatchTopScorers);

module.exports = router;
