const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/student.controller');
const verifyPwd = require('../middleware/verifyAdminPassword');
const upload = require('../middleware/upload');
const { verifyAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');

router.use(verifyAdmin);

router.get('/', ctrl.getAllStudents);
router.get('/stats', ctrl.getStudentStats);
router.get('/activity', ctrl.getStudentActivity);
router.get('/export', ctrl.exportStudents);
router.get('/batches', ctrl.getBatches);
router.post('/', upload.single('profileImage'), ctrl.createStudent);
router.post('/bulk', ctrl.bulkUpload);
router.delete('/delete-all', requireSuperAdmin, verifyPwd, ctrl.deleteAllStudents);
router.put('/:id', upload.single('profileImage'), verifyPwd, ctrl.updateStudent);
router.get('/:id', ctrl.getStudentById);
router.delete('/:id', requireSuperAdmin, verifyPwd, ctrl.deleteStudent);

module.exports = router;
