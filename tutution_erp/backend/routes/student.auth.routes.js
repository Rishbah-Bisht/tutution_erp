const express = require('express');
const router = express.Router();
const { disableStudentAccess } = require('../middleware/disableRoleAccess');

router.use(disableStudentAccess);

module.exports = router;
