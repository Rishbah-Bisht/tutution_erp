const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const schedulerController = require('../controllers/scheduler.controller');

// Generate time slots 08:00 → 20:00 (hourly)
const buildTimeSlots = () => {
    const slots = [];
    for (let h = 8; h <= 20; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return slots;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// GET /api/scheduler/config
router.get('/config', async (req, res) => {
    try {
        const admin = await Admin.findOne().select('roomsAvailable coachingName');
        const roomCount = parseInt(admin?.roomsAvailable) || 5;
        const classrooms = Array.from({ length: roomCount }, (_, i) => `Room ${i + 1}`);

        res.json({
            days: DAYS,
            timeSlots: buildTimeSlots(),
            classrooms,
        });
    } catch (err) {
        res.status(500).json({ message: 'Scheduler config error', error: err.message });
    }
});

router.post('/auto', schedulerController.autoSchedule);
router.post('/auto-batch', schedulerController.autoScheduleBatch);
router.post('/expert-auto', schedulerController.expertAISchedule);
router.post('/smart-auto', schedulerController.smartAutoSchedule);

module.exports = router;
