const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { verifyAdmin } = require('../middleware/auth.middleware');

router.get('/', verifyAdmin, templateController.getAllTemplates);
router.put('/:id', verifyAdmin, templateController.updateTemplate);

module.exports = router;
