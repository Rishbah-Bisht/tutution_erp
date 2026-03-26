const express = require('express');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Batch = require('../models/Batch');
const Attendance = require('../models/Attendance');
const Fee = require('../models/Fee');
const Exam = require('../models/Exam');
const { TeacherSalary } = require('../models/TeacherPayroll');
const { verifyAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

const getActivityConfig = () => ({
    onlineMinutes: Math.max(parseInt(process.env.ACTIVITY_ONLINE_MINUTES || '5', 10) || 5, 1),
    inactiveDays: Math.max(parseInt(process.env.ACTIVITY_INACTIVE_DAYS || '7', 10) || 7, 1)
});

const startOfDay = (value = new Date()) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const endOfDay = (value = new Date()) => {
    const date = new Date(value);
    date.setHours(23, 59, 59, 999);
    return date;
};

const startOfWeek = (value = new Date()) => {
    const date = startOfDay(value);
    const dayIndex = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - dayIndex);
    return date;
};

const buildMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const buildMonthBuckets = (count, value = new Date()) => {
    const buckets = [];

    for (let index = count - 1; index >= 0; index -= 1) {
        const date = new Date(value.getFullYear(), value.getMonth() - index, 1);
        buckets.push({
            key: buildMonthKey(date),
            label: date.toLocaleDateString('en-IN', { month: 'short' }),
            start: new Date(date.getFullYear(), date.getMonth(), 1),
            end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
        });
    }

    return buckets;
};

const getLatestPaymentDate = (paymentHistory = []) => {
    if (!Array.isArray(paymentHistory) || paymentHistory.length === 0) return null;

    return paymentHistory.reduce((latest, payment) => {
        if (!payment?.date) return latest;
        if (!latest) return payment.date;
        return new Date(payment.date) > new Date(latest) ? payment.date : latest;
    }, null);
};

const sortByNullableDate = (left, right, direction = 'asc') => {
    const leftTime = left ? new Date(left).getTime() : null;
    const rightTime = right ? new Date(right).getTime() : null;

    if (leftTime === null && rightTime === null) return 0;
    if (leftTime === null) return 1;
    if (rightTime === null) return -1;

    return direction === 'asc' ? leftTime - rightTime : rightTime - leftTime;
};

router.get('/', verifyAdmin, async (req, res) => {
    try {
        const { onlineMinutes, inactiveDays } = getActivityConfig();
        const now = new Date();
        const todayStart = startOfDay(now);
        const onlineThreshold = new Date(now.getTime() - onlineMinutes * 60 * 1000);
        const inactiveThreshold = new Date(now.getTime() - inactiveDays * 24 * 60 * 60 * 1000);
        const weekStart = startOfWeek(now);
        const weekEnd = endOfDay(now);
        const monthBuckets = buildMonthBuckets(6, now);
        const monthlyAttendanceStart = monthBuckets[0]?.start || todayStart;
        const currentMonthYear = now.toISOString().slice(0, 7);

        const [
            totalStudents,
            activeBatches,
            totalTeachers,
            totalFeesPaidAgg,
            activityStats,
            weeklyAttendanceAgg,
            monthlyAttendanceAgg,
            pendingSalaryCount,
            rawFeeActivity,
            scheduledExams,
            recentCompletedExams
        ] = await Promise.all([
            Student.countDocuments(),
            Batch.countDocuments({ isActive: true }),
            Teacher.countDocuments({ status: 'active' }),
            Student.aggregate([{ $group: { _id: null, total: { $sum: '$feesPaid' } } }]),
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
            ]),
            Attendance.aggregate([
                {
                    $match: {
                        attendanceDate: { $gte: weekStart, $lte: weekEnd }
                    }
                },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            Attendance.aggregate([
                {
                    $match: {
                        attendanceDate: { $gte: monthlyAttendanceStart, $lte: weekEnd }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: '$attendanceDate' },
                            month: { $month: '$attendanceDate' },
                            status: '$status'
                        },
                        count: { $sum: 1 }
                    }
                }
            ]),
            TeacherSalary.countDocuments({
                monthYear: currentMonthYear,
                status: { $in: ['Pending', 'Processing'] }
            }),
            Fee.find({ isDeleted: { $ne: true } })
                .sort({ createdAt: -1 })
                .limit(40)
                .populate('studentId', 'name className')
                .populate('batchId', 'name')
                .lean(),
            Exam.find({ status: 'scheduled' })
                .populate('batchId', 'name')
                .lean(),
            Exam.find({ status: 'completed' })
                .populate('batchId', 'name')
                .sort({ date: -1, createdAt: -1 })
                .limit(5)
                .lean()
        ]);

        const activitySummary = {
            online: activityStats.find((item) => item._id === 'online')?.count || 0,
            offline: activityStats.find((item) => item._id === 'offline')?.count || 0,
            inactive: activityStats.find((item) => item._id === 'inactive')?.count || 0
        };

        const weeklyAttendance = {
            present: weeklyAttendanceAgg.find((item) => item._id === 'Present')?.count || 0,
            absent: weeklyAttendanceAgg.find((item) => item._id === 'Absent')?.count || 0,
            late: weeklyAttendanceAgg.find((item) => item._id === 'Late')?.count || 0
        };
        weeklyAttendance.total = weeklyAttendance.present + weeklyAttendance.absent + weeklyAttendance.late;
        weeklyAttendance.presentRate = weeklyAttendance.total > 0
            ? Math.round((weeklyAttendance.present / weeklyAttendance.total) * 100)
            : 0;

        const monthlyAttendanceMap = new Map();
        monthlyAttendanceAgg.forEach((entry) => {
            const key = `${entry._id.year}-${String(entry._id.month).padStart(2, '0')}`;
            if (!monthlyAttendanceMap.has(key)) {
                monthlyAttendanceMap.set(key, { present: 0, absent: 0, late: 0 });
            }

            const bucket = monthlyAttendanceMap.get(key);
            if (entry._id.status === 'Present') bucket.present = entry.count;
            if (entry._id.status === 'Absent') bucket.absent = entry.count;
            if (entry._id.status === 'Late') bucket.late = entry.count;
        });

        const monthlyAttendanceTrend = monthBuckets.map((bucket) => {
            const counts = monthlyAttendanceMap.get(bucket.key) || { present: 0, absent: 0, late: 0 };
            const total = counts.present + counts.absent + counts.late;
            return {
                label: bucket.label,
                key: bucket.key,
                present: counts.present,
                absent: counts.absent,
                late: counts.late,
                total,
                percentage: total > 0 ? Math.round((counts.present / total) * 100) : 0
            };
        });

        const recentFeeActivity = rawFeeActivity
            .map((fee) => {
                const latestPaymentDate = getLatestPaymentDate(fee.paymentHistory);
                const activityAt = latestPaymentDate || fee.paidDate || fee.dueDate || fee.createdAt;

                return {
                    _id: fee._id,
                    studentName: fee.studentId?.name || 'Unknown student',
                    className: fee.studentId?.className || '',
                    batchName: fee.batchId?.name || '',
                    status: fee.status || 'pending',
                    totalFee: fee.totalFee || 0,
                    amountPaid: fee.amountPaid || 0,
                    pendingAmount: fee.pendingAmount || 0,
                    activityAt
                };
            })
            .sort((left, right) => sortByNullableDate(left.activityAt, right.activityAt, 'desc'))
            .slice(0, 5);

        const upcomingScheduledExams = scheduledExams
            .sort((left, right) => sortByNullableDate(left.date, right.date, 'asc'))
            .slice(0, 5);

        const dashboardExams = [...upcomingScheduledExams];
        for (const exam of recentCompletedExams) {
            if (dashboardExams.length >= 5) break;
            if (!dashboardExams.some((item) => String(item._id) === String(exam._id))) {
                dashboardExams.push(exam);
            }
        }

        const upcomingExams = dashboardExams.map((exam) => ({
            _id: exam._id,
            name: exam.name,
            subject: exam.subject,
            batchName: exam.batchId?.name || 'All batches',
            date: exam.date || null,
            status: exam.status
        }));

        res.json({
            totalStudents,
            activeBatches,
            totalTeachers,
            totalFeesPaid: totalFeesPaidAgg[0]?.total || 0,
            activitySummary,
            activityThresholds: { onlineMinutes, inactiveDays },
            weeklyAttendance,
            monthlyAttendanceTrend,
            recentFeeActivity,
            upcomingExams,
            pendingSalaryAlert: {
                count: pendingSalaryCount,
                monthYear: currentMonthYear,
                monthLabel: now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
