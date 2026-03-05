const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Batch = require('./models/Batch');
const Admin = require('./models/Admin');
const Teacher = require('./models/Teacher');
const Schedule = require('./models/Schedule');
const { expertAISchedule } = require('./controllers/scheduler.controller');

dotenv.config();

async function runTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Cleanup
        await Batch.deleteMany({ name: /^TEST_/ });
        await Schedule.deleteMany({});
        await Teacher.deleteMany({ name: /^TEST_Teacher/ });

        // Setup Admin (Room count)
        let admin = await Admin.findOne();
        if (!admin) {
            admin = await Admin.create({
                adminName: 'Test Admin',
                email: 'test@example.com',
                password: 'password123',
                roomsAvailable: '5'
            });
        }

        // Setup Teachers
        const teacherA = await Teacher.create({
            name: 'TEST_Teacher_A', email: 'ta@test.com', phone: '111', status: 'active'
        });
        const teacherB = await Teacher.create({
            name: 'TEST_Teacher_B', email: 'tb@test.com', phone: '222', status: 'active'
        });

        console.log('Setting up Batch 1: Class 11 PCM (Physics)...');
        const batch1 = await Batch.create({
            name: 'TEST_PCM_11',
            course: 'Class 11',
            subjects: ['Physics'],
            classroom: 'Room 1'
        });
        teacherA.assignments = [{ batchId: batch1._id, batchName: batch1.name, subjects: ['Physics'] }];
        await teacherA.save();

        const mockRes = {
            status: function (code) { this.statusCode = code; return this; },
            json: function (data) { this.data = data; return this; }
        };

        // 1. Schedule Batch 1
        console.log('Scheduling Batch 1...');
        await expertAISchedule({
            body: {
                classroom: 'Room 1',
                subjects: ['Physics'],
                timings: ['09:00'],
                daysCount: 1,
                course: 'Class 11',
                batchId: batch1._id,
                batchName: batch1.name
            }
        }, mockRes);

        const schedule1 = await Schedule.find({ batchId: batch1._id });
        console.log('Batch 1 (PCM) Room:', schedule1[0].roomAllotted);

        // 2. Schedule Batch 2 (Same Class, Same Subject, Same Teacher)
        console.log('\nSetting up Batch 2: Class 11 PCB (Physics)...');
        const batch2 = await Batch.create({
            name: 'TEST_PCB_11',
            course: 'Class 11',
            subjects: ['Physics'],
            classroom: 'Room 1'
        });
        // Teacher A also teaches Batch 2
        teacherA.assignments.push({ batchId: batch2._id, batchName: batch2.name, subjects: ['Physics'] });
        await teacherA.save();

        console.log('Scheduling Batch 2...');
        await expertAISchedule({
            body: {
                classroom: 'Room 1',
                subjects: ['Physics'],
                timings: ['09:00'],
                daysCount: 1,
                course: 'Class 11',
                batchId: batch2._id,
                batchName: batch2.name
            }
        }, mockRes);

        const schedule2 = await Schedule.find({ batchId: batch2._id });
        console.log('Batch 2 (PCB) Room:', schedule2[0].roomAllotted);
        console.log('Is Merged:', schedule2[0].isMerged);

        const sharedMatch = schedule1[0].roomAllotted === schedule2[0].roomAllotted && schedule2[0].isMerged === true;
        console.log('VERIFICATION 1 (Common Subject):', sharedMatch ? 'PASS' : 'FAIL');

        // 3. Schedule Batch 3 (Same Class, DIFFERENT Subject: Biology)
        console.log('\nSetting up Batch 3: Class 11 PCB (Biology)...');
        const batch3 = await Batch.create({
            name: 'TEST_PCB_11_Bio',
            course: 'Class 11',
            subjects: ['Biology'],
            classroom: 'Room 1'
        });
        teacherB.assignments = [{ batchId: batch3._id, batchName: batch3.name, subjects: ['Biology'] }];
        await teacherB.save();

        console.log('Scheduling Batch 3 at the SAME TIME (09:00)...');
        await expertAISchedule({
            body: {
                classroom: 'Room 1',
                subjects: ['Biology'],
                timings: ['09:00'],
                daysCount: 1,
                course: 'Class 11',
                batchId: batch3._id,
                batchName: batch3.name
            }
        }, mockRes);

        if (mockRes.statusCode >= 400) {
            console.log('Error scheduling Batch 3:', mockRes.data.message);
        } else {
            const schedule3 = await Schedule.find({ batchId: batch3._id });
            console.log('Batch 3 (Biology) Room:', schedule3[0].roomAllotted);
            console.log('Is Merged:', schedule3[0].isMerged);

            const splitMatch = schedule3[0].roomAllotted !== schedule1[0].roomAllotted && schedule3[0].isMerged === false;
            console.log('VERIFICATION 2 (Split Subject):', splitMatch ? 'PASS' : 'FAIL');
        }

        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    }
}

runTest();
