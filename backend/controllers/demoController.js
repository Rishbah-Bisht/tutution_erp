const DemoTest = require('../models/DemoTest');

/**
 * @desc    Create a new test record
 * @route   POST /api/demo
 * @access  Public
 */
exports.createTest = async (req, res, next) => {
    try {
        const test = await DemoTest.create(req.body);

        res.status(201).json({
            success: true,
            data: test
        });
    } catch (error) {
        // Pass error to the global error handler middleware
        next(error);
    }
};

/**
 * @desc    Get all test records
 * @route   GET /api/demo
 * @access  Public
 */
exports.getTests = async (req, res, next) => {
    try {
        const tests = await DemoTest.find();

        res.status(200).json({
            success: true,
            count: tests.length,
            data: tests
        });
    } catch (error) {
        next(error);
    }
};
