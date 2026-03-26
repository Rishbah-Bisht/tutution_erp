const express = require('express');
const router = express.Router();
const controller = require('../controllers/teacher.portal.controller');
const { verifyTeacher } = require('../middleware/auth.middleware');

router.use(verifyTeacher);

router.get('/students', controller.getAssignedStudents);
router.get('/exams', controller.getTeacherExams);
router.get('/exams/:id/results', controller.getTeacherExamResults);
router.get('/salaries', controller.getTeacherSalaries);

module.exports = router;
