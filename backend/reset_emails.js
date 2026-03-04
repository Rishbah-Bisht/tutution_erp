const mongoose = require('mongoose');
require('dotenv').config();
const Notification = require('./models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/erp_system';

async function resetFailedNotifications() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const result = await Notification.updateMany(
            { status: 'failed' },
            { $set: { status: 'pending', retryCount: 0 } }
        );

        console.log(`Successfully reset ${result.modifiedCount} failed notifications to pending.`);

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

resetFailedNotifications();
