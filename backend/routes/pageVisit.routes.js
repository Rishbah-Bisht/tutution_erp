const express = require('express');
const cors = require('cors');
const router = express.Router();
const PageVisit = require('../models/PageVisit');

// --- CORS: only allow POST requests from the Vercel frontend ---
const allowedOrigin = process.env.CORS_ORIGIN; // e.g. https://student-erp-frontend-delta.vercel.app

const trackVisitCors = cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (server-side tools, curl) — optional, remove if you
        // want to be strict and only allow browser requests from the exact Vercel domain.
        if (!origin) return callback(null, true);
        if (allowedOrigin && origin === allowedOrigin) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['POST', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
});

// Handle CORS preflight for this route
router.options('/', trackVisitCors);

// POST /api/track-visit
router.post('/', trackVisitCors, async (req, res) => {
    try {
        const { pageUrl, role } = req.body;

        // Silently skip if required fields are missing
        if (!pageUrl) {
            return res.status(200).json({ success: true, skipped: 'no-url' });
        }

        // Skip local/internal traffic by IP
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
        if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.')) {
            return res.status(200).json({ success: true, skipped: 'local-ip' });
        }

        // Skip admin routes — they are never tracked
        const adminPaths = ['/admin', '/dashboard', '/profile'];
        if (adminPaths.some(p => pageUrl.startsWith(p))) {
            return res.status(200).json({ success: true, skipped: 'admin-path' });
        }

        // Today's date in YYYY-MM-DD (UTC)
        const today = new Date().toISOString().slice(0, 10);

        const normalizedRole = ['admin', 'teacher', 'student', 'guest'].includes(role)
            ? role
            : 'guest';

        // Atomic increment — creates the document if it doesn't exist yet (upsert)
        await PageVisit.findOneAndUpdate(
            { date: today, pageUrl, role: normalizedRole },
            { $inc: { visits: 1 } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        // Log but don't expose internals
        console.error('PageVisit tracking error:', error.message);
        return res.status(500).json({ success: false });
    }
});

module.exports = router;
