const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/teacher.controller');
const verifyPwd = require('../middleware/verifyAdminPassword');
const upload = require('../middleware/upload');
const { verifyAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');

router.use(verifyAdmin);

router.get('/', ctrl.getAllTeachers);
router.get('/summary', ctrl.getSummary);
router.post('/bulk', verifyPwd, ctrl.bulkUpload);

router.post('/', upload.single('profileImage'), ctrl.createTeacher);
router.put('/bulk-update', verifyPwd, ctrl.bulkUpdate);
router.put('/:id', upload.single('profileImage'), verifyPwd, ctrl.updateTeacher);
router.delete('/:id', requireSuperAdmin, verifyPwd, ctrl.deleteTeacher);

module.exports = router;
