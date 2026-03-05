const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');

// GET /api/settings
// This is a public/unprotected route used strictly for fetching dynamic
// UI themes, logo layout, and global dropdown parameters.
router.get('/', async (req, res) => {
    try {
        const admin = await Admin.findOne().select('coachingName instituteLogo classesOffered roomsAvailable instituteAddress instituteEmail institutePhone');

        if (!admin) {
            return res.json({
                coachingName: 'Defacto ERP',
                instituteLogo: '',
                classesOffered: ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'],
                roomsAvailable: 5,
                instituteAddress: '',
                instituteEmail: '',
                institutePhone: ''
            });
        }

        res.json({
            coachingName: admin.coachingName || 'Defacto ERP',
            instituteLogo: admin.instituteLogo,
            classesOffered: admin.classesOffered && admin.classesOffered.length ? admin.classesOffered : ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'],
            roomsAvailable: admin.roomsAvailable || 5,
            instituteAddress: admin.instituteAddress || '',
            instituteEmail: admin.instituteEmail || '',
            institutePhone: admin.institutePhone || ''
        });

    } catch (err) {
        console.error('[SettingsAPIError]', err);
        res.status(500).json({ message: 'Settings API error', error: err.message });
    }
});

module.exports = router;
