const express = require('express');
const router = express.Router();
const { disableTeacherAccess } = require('../middleware/disableRoleAccess');

router.use(disableTeacherAccess);

module.exports = router;
