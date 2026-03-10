const express = require('express');
const router = express.Router();
const { createTest, getTests } = require('../controllers/demoController');

router.route('/')
    .get(getTests)
    .post(createTest);

module.exports = router;
