const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const jwt = require('jsonwebtoken');
const { requireEnv } = require('../config/env');

const JWT_SECRET = requireEnv('JWT_SECRET');

const getActivityConfig = () => ({
    onlineMinutes: Math.max(parseInt(process.env.ACTIVITY_ONLINE_MINUTES || '5', 10) || 5, 1),
    inactiveDays: Math.max(parseInt(process.env.ACTIVITY_INACTIVE_DAYS || '7', 10) || 7, 1)
});

// ── Auth Middleware ──────────────────────────────────────────────────────────
const auth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: 'No token provided' });
    try {
        const token = header.split(' ')[1];
        req.admin = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// ── GET /admin — Dashboard Data ──────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
    try {
        const { onlineMinutes, inactiveDays } = getActivityConfig();
        const now = new Date();
        const onlineThreshold = new Date(now.getTime() - onlineMinutes * 60 * 1000);
        const inactiveThreshold = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000);
        let totalFeesPaid = 0;

        // Core counts
        const [totalStudents, totalTeachers, activeBatches, activityStats] = await Promise.all([
            Student.countDocuments(),
            require('../models/Teacher').countDocuments(),
            Batch.countDocuments({ isActive: true }),
            Student.aggregate([
                {
                    $addFields: {
                        activityAt: {
                            $ifNull: [
                                '$lastActiveAt',
                                { $ifNull: ['$lastAppOpenAt', '$portalAccess.lastLoginAt'] }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        activityStatus: {
                            $switch: {
                                branches: [
                                    {
                                        case: {
                                            $or: [
                                                { $eq: ['$activityAt', null] },
                                                { $lte: ['$activityAt', inactiveThreshold] }
                                            ]
                                        },
                                        then: 'inactive'
                                    },
                                    { case: { $gte: ['$activityAt', onlineThreshold] }, then: 'online' }
                                ],
                                default: 'offline'
                            }
                        }
                    }
                },
                { $group: { _id: '$activityStatus', count: { $sum: 1 } } }
            ])
        ]);

        // Recent admissions (last 5)
        const recentAdmissions = await Student.find()
            .sort({ joinedAt: -1 })
            .limit(5)
            .select('name rollNo joinedAt fees feesPaid')
            .populate('batchId', 'name');

        // Attendance trend — last 7 days
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);

        const attendanceTrend = await Attendance.aggregate([
            {
                $match: {
                    attendanceDate: { $gte: sevenDaysAgo, $lte: today }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$attendanceDate' } },
                        status: { $toLower: '$status' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        // Build a clean 7-day array
        const trend = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const present = attendanceTrend.find(a => a._id.date === key && a._id.status === 'present')?.count || 0;
            const absent = attendanceTrend.find(a => a._id.date === key && a._id.status === 'absent')?.count || 0;
            trend.push({ date: key, present, absent });
        }

        const activitySummary = {
            online: activityStats.find((item) => item._id === 'online')?.count || 0,
            offline: activityStats.find((item) => item._id === 'offline')?.count || 0,
            inactive: activityStats.find((item) => item._id === 'inactive')?.count || 0
        };

        res.json({
            totalStudents,
            activeBatches,
            totalTeachers,
            totalFeesPaid,
            recentAdmissions,
            attendanceTrend: trend,
            activitySummary,
            activityThresholds: { onlineMinutes, inactiveDays }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


module.exports = router;
