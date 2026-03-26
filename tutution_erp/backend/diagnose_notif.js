const mongoose = require('mongoose');
const mongoURI = 'mongodb+srv://ighost474:y06ysjTn0jlIzcVb@cluster0.bwwmerw.mongodb.net/erp_system';

async function diagnose() {
    try {
        await mongoose.connect(mongoURI);
        console.log('--- Database Connected ---');

        const Notification = mongoose.model('Notification', new mongoose.Schema({ 
            title: String, 
            message: String, 
            status: String, 
            type: String,
            pushResult: Object, 
            emailResult: Object,
            studentId: mongoose.Schema.Types.ObjectId,
            createdAt: Date 
        }));

        const Student = mongoose.model('Student', new mongoose.Schema({
            name: String,
            deviceTokens: [String],
            status: String
        }));

        console.log('\n--- Recent Notifications (Last 10) ---');
        const logs = await Notification.find().sort({ createdAt: -1 }).limit(10).lean();
        logs.forEach(l => {
            console.log(`[${l.createdAt.toISOString()}] ${l.type} - ${l.status}`);
            console.log(`  Title: ${l.title}`);
            if (l.pushResult) console.log(`  Push Result: ${JSON.stringify(l.pushResult)}`);
            if (l.emailResult) console.log(`  Email Result: ${JSON.stringify(l.emailResult)}`);
            console.log('-------------------');
        });

        console.log('\n--- Students with Device Tokens ---');
        const students = await Student.find({ 'deviceTokens.0': { $exists: true } }).limit(5).lean();
        console.log(`Count: ${students.length}`);
        students.forEach(s => {
            console.log(`- ${s.name}: ${s.deviceTokens.length} tokens`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Diagnosis failed:', err);
        process.exit(1);
    }
}

diagnose();
