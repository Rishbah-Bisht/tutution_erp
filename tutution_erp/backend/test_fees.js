const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/erp_db').then(async () => {
    try {
        const Fee = require('./models/Fee');
        const count = await Fee.countDocuments({ status: { $in: ['pending', 'partial', 'overdue'] } });
        console.log('Total pending fees count:', count);
        const distinctStudents = await Fee.distinct('studentId', { status: { $in: ['pending', 'partial', 'overdue'] } });
        console.log('Number of distinct students owing fees:', distinctStudents.length);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
});
