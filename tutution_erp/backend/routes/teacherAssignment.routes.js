const express = require('express');
const router = express.Router();
const controller = require('../controllers/teacherAssignment.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

router.get('/', verifyAdmin, controller.getAssignments);
router.post('/', verifyAdmin, controller.createAssignment);

module.exports = router;
