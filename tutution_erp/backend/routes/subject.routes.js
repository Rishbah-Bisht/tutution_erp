const express = require('express');
const router = express.Router();
const controller = require('../controllers/subject.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

router.get('/', verifyAdmin, controller.getSubjects);
router.post('/', verifyAdmin, controller.createSubject);

module.exports = router;
