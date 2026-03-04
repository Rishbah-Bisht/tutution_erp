const mongoose = require('mongoose');
require('dotenv').config();
const Notification = require('./models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system';

async function checkNotifications() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const stats = await Notification.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        console.log('\n--- Notification Stats ---');
        stats.forEach(s => {
            console.log(`${s._id}: ${s.count}`);
        });

        const failed = await Notification.find({ status: 'failed' }).limit(5).sort({ updatedAt: -1 });
        if (failed.length > 0) {
            console.log('\n--- Last 5 Failures ---');
            failed.forEach(f => {
                console.log(`To: ${f.recipientEmail} | Error: ${f.lastError}`);
            });
        }

        const pending = await Notification.find({ status: 'pending' }).limit(5).sort({ createdAt: 1 });
        if (pending.length > 0) {
            console.log('\n--- Oldest 5 Pending ---');
            pending.forEach(p => {
                console.log(`To: ${p.recipientEmail} | Created: ${p.createdAt}`);
            });
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkNotifications();
