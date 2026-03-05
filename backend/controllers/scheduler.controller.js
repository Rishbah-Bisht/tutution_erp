const Batch = require('../models/Batch');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');
const Schedule = require('../models/Schedule');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const buildTimeSlots = () => {
    const slots = [];
    for (let h = 8; h <= 20; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return slots;
};

// POST /api/scheduler/auto
// Heuristic "AI" scheduler: Generates a weekly schedule based on required subjects
// and checks classroom availability to prevent conflicts.
exports.autoSchedule = async (req, res) => {
    try {
        const { classroom, subjects, excludeBatchId } = req.body;

        if (!classroom) {
            return res.status(400).json({ message: 'Classroom is required to auto-schedule.' });
        }

        // 1. Fetch current room occupancy
        const allSchedules = await Schedule.find({
            roomAllotted: classroom,
            batchId: { $ne: excludeBatchId }
        });
        const occupied = new Set();

        allSchedules.forEach(s => {
            occupied.add(`${s.day}-${s.timeSlot}`);
        });

        // 2. Determine number of slots needed
        // Usually 1 slot per subject per week. If no subjects picked, default to 5 slots.
        const slotsNeeded = subjects && subjects.length > 0 ? subjects.length : 5;

        const timeSlots = buildTimeSlots();
        const availableSlots = [];

        // 3. Find all available slots for this room
        // Preferred days: Monday to Friday
        for (const day of DAYS) {
            for (const time of timeSlots) {
                if (!occupied.has(`${day}-${time}`)) {
                    availableSlots.push({ day, time });
                }
            }
        }

        if (availableSlots.length < slotsNeeded) {
            return res.status(400).json({
                message: `Not enough available slots in ${classroom}. Needed ${slotsNeeded}, but only found ${availableSlots.length}.`
            });
        }

        // 4. Algorithm to distribute slots optimally
        // Goal: Spread slots across different days, ideally at consistent times.
        const selectedSchedule = [];
        const daysUsed = new Set();

        // Let's try to pick a consistent time (e.g., 09:00, 10:00) that is open across multiple days
        let chosenConsistentTime = null;
        let bestDayCoverage = 0;

        for (const time of timeSlots) {
            let matchingDays = availableSlots.filter(s => s.time === time);
            if (matchingDays.length > bestDayCoverage) {
                bestDayCoverage = matchingDays.length;
                chosenConsistentTime = time;
            }
        }

        // Try to allocate at the consistent time first
        if (chosenConsistentTime) {
            for (const slot of availableSlots) {
                if (selectedSchedule.length >= slotsNeeded) break;
                if (slot.time === chosenConsistentTime && !daysUsed.has(slot.day)) {
                    selectedSchedule.push(slot);
                    daysUsed.add(slot.day);
                }
            }
        }

        // 1st fallback pass: distribute one slot per day for any available time
        for (const slot of availableSlots) {
            if (selectedSchedule.length >= slotsNeeded) break;
            if (!daysUsed.has(slot.day)) {
                selectedSchedule.push(slot);
                daysUsed.add(slot.day);
            }
        }

        // 2nd fallback pass: just take any available slot
        for (const slot of availableSlots) {
            if (selectedSchedule.length >= slotsNeeded) break;
            const alreadySelected = selectedSchedule.some(s => s.day === slot.day && s.time === slot.time);
            if (!alreadySelected) {
                selectedSchedule.push(slot);
            }
        }

        // Sort schedule chronologically
        const dayOrder = Object.fromEntries(DAYS.map((d, i) => [d, i]));
        selectedSchedule.sort((a, b) => {
            if (dayOrder[a.day] !== dayOrder[b.day]) {
                return dayOrder[a.day] - dayOrder[b.day];
            }
            return a.time.localeCompare(b.time);
        });

        return res.json({ schedule: selectedSchedule });

    } catch (err) {
        res.status(500).json({ message: 'Server error during auto-schedule', error: err.message });
    }
};

// POST /api/scheduler/auto-batch
// Fully automated: Takes a batchId, looks at its subjects, 
// finds an available room, finds assigned teachers for each subject, 
// and generates the time slots with teacher names.
// POST /api/scheduler/expert-auto
// Specialized Scheduler: 3 subjects, 3 timings, X days
exports.expertAISchedule = async (req, res) => {
    try {
        const { classroom, subjects, timings, daysCount, batchId, batchName, course } = req.body;

        if (!classroom || !subjects || !timings || !daysCount) {
            return res.status(400).json({ message: 'Missing required parameters: classroom, subjects, timings, daysCount.' });
        }

        if (subjects.length > 3 || timings.length > 3) {
            return res.status(400).json({ message: 'Expert scheduler supports a maximum of 3 subjects.' });
        }

        if (subjects.length !== timings.length) {
            return res.status(400).json({ message: 'Number of subjects must match number of timings.' });
        }

        // 1. Fetch ALL current schedules to check global occupancy
        const allSchedules = await Schedule.find({ batchId: { $ne: batchId } });
        const admin = await Admin.findOne().select('roomsAvailable');
        const roomCount = parseInt(admin?.roomsAvailable) || 5;
        const classrooms = Array.from({ length: roomCount }, (_, i) => `Room ${i + 1}`);

        // Build occupancy map: "day-time" -> array of { room, subject, teacher, course }
        const globalOccupancy = {};
        allSchedules.forEach(s => {
            const key = `${s.day}-${s.timeSlot}`;
            if (!globalOccupancy[key]) globalOccupancy[key] = [];
            globalOccupancy[key].push({
                room: s.roomAllotted,
                subject: s.subject,
                teacher: s.teacher,
                course: s.course
            });
        });

        // 2. Fetch teachers assigned to these subjects for this batch
        const teachers = await Teacher.find({ status: 'active' });
        const subjectTeachers = {};

        subjects.forEach(sub => {
            const found = teachers.find(t =>
                t.assignments?.some(a =>
                    (a.batchId?.toString() === batchId || a.batchName === batchName) &&
                    a.subjects?.includes(sub)
                )
            );
            subjectTeachers[sub] = found ? found.name : 'Unassigned';
        });

        // 3. Generate Schedule
        const generatedSchedule = [];
        const workingDays = DAYS.slice(0, daysCount);

        for (const day of workingDays) {
            for (let i = 0; i < subjects.length; i++) {
                const time = timings[i];
                const subject = subjects[i];
                const teacher = subjectTeachers[subject];
                const slotKey = `${day}-${time}`;
                const slotsAtTime = globalOccupancy[slotKey] || [];

                let assignedRoom = null;
                let isMerged = false;

                // Rule 1: Common Subject Logic (Same Course, Subject, Teacher)
                const sharedMatch = slotsAtTime.find(s =>
                    s.subject === subject &&
                    s.teacher === teacher &&
                    s.course === course
                );

                if (sharedMatch) {
                    assignedRoom = sharedMatch.room;
                    isMerged = true;
                } else {
                    // Rule 2: Teacher Busy Check
                    const teacherBusy = slotsAtTime.find(s => s.teacher === teacher);
                    if (teacherBusy) {
                        return res.status(400).json({
                            message: `Conflict: Teacher ${teacher} is busy in ${teacherBusy.room} teaching ${teacherBusy.subject} at ${time}.`
                        });
                    }

                    // Rule 3: Split Subject Logic / Preferred Room
                    // If preferred room is busy or occupied by the same class (different subject), find another.
                    const roomOccupied = slotsAtTime.find(s => s.room === classroom);
                    if (!roomOccupied) {
                        assignedRoom = classroom;
                    } else {
                        // Find ANY other available room
                        const otherRoom = classrooms.find(r => !slotsAtTime.some(s => s.room === r));
                        if (otherRoom) {
                            assignedRoom = otherRoom;
                        } else {
                            return res.status(400).json({
                                message: `Conflict: No rooms available in the center on ${day} at ${time}.`
                            });
                        }
                    }
                }

                generatedSchedule.push({
                    day,
                    time,
                    subject,
                    teacher,
                    room: assignedRoom,
                    isMerged
                });

                // Update local occupancy map for this generation pass
                if (!globalOccupancy[slotKey]) globalOccupancy[slotKey] = [];
                globalOccupancy[slotKey].push({
                    room: assignedRoom,
                    subject: subject,
                    teacher: teacher,
                    course: course
                });
            }
        }

        // 4. Persistence: Update Schedule collection and Batch document
        // Delete old schedule for this batch first
        await Schedule.deleteMany({ batchId });

        const scheduleDocs = generatedSchedule.map(s => ({
            batchId,
            course,
            subject: s.subject,
            teacher: s.teacher,
            day: s.day,
            timeSlot: s.time,
            roomAllotted: s.room,
            isMerged: s.isMerged
        }));
        await Schedule.insertMany(scheduleDocs);

        // Update Batch model for legacy support/quick view
        await Batch.findByIdAndUpdate(batchId, {
            schedule: generatedSchedule.map(s => ({
                day: s.day,
                time: s.time,
                subject: s.subject,
                teacher: s.teacher,
                room: s.room
            }))
        });

        return res.json({ schedule: generatedSchedule });

    } catch (err) {
        console.error('Error in expertAISchedule:', err);
        res.status(500).json({ message: 'Server error during expert auto-schedule', error: err.message });
    }
};

exports.autoScheduleBatch = async (req, res) => {
    try {
        const { batchId } = req.body;
        if (!batchId) return res.status(400).json({ message: 'Batch ID is required.' });

        const batch = await Batch.findById(batchId);
        if (!batch) return res.status(404).json({ message: 'Batch not found.' });

        const subjects = batch.subjects || [];
        if (subjects.length === 0) return res.status(400).json({ message: 'Batch has no subjects assigned.' });

        // 1. Fetch config (Rooms)
        const admin = await Admin.findOne().select('roomsAvailable');
        const roomCount = parseInt(admin?.roomsAvailable) || 5;
        const classrooms = Array.from({ length: roomCount }, (_, i) => `Room ${i + 1}`);

        // 2. Fetch all current schedules to check occupancy
        const allSchedules = await Schedule.find({ batchId: { $ne: batchId } });

        // Build occupancy map: "day-time" -> array of { room, subject, teacher, course }
        const globalOccupancy = {};
        allSchedules.forEach(s => {
            const key = `${s.day}-${s.timeSlot}`;
            if (!globalOccupancy[key]) globalOccupancy[key] = [];
            globalOccupancy[key].push({
                room: s.roomAllotted,
                subject: s.subject,
                teacher: s.teacher,
                course: s.course
            });
        });

        // 3. Fetch all active teachers
        const teachers = await Teacher.find({ status: 'active' });
        const timeSlots = buildTimeSlots();
        let selectedRoom = null;
        let generatedEntries = [];

        // 4. Algorithm: Find a room, then for each subject, find a slot and a teacher
        // We iterate classrooms one by one as "Primary Classroom" candidates
        for (const room of classrooms) {
            let tempEntries = [];
            let possible = true;

            for (const subject of subjects) {
                const potentialTeachers = teachers.filter(t =>
                    t.assignments?.some(a =>
                        (a.batchId?.toString() === batchId.toString() || a.batchName === batch.name) &&
                        a.subjects?.includes(subject)
                    )
                );

                const teacherToUse = potentialTeachers.length > 0 ? potentialTeachers[0] : null;
                const teacherName = teacherToUse ? teacherToUse.name : 'Unassigned';

                let foundSlot = false;
                for (const day of DAYS) {
                    for (const time of timeSlots) {
                        const slotKey = `${day}-${time}`;
                        const slotsAtTime = globalOccupancy[slotKey] || [];

                        // Rule 1: Common Subject Logic (Shared Room)
                        const sharedMatch = slotsAtTime.find(s =>
                            s.subject === subject &&
                            s.teacher === teacherName &&
                            s.course === batch.course
                        );

                        if (sharedMatch) {
                            tempEntries.push({
                                day,
                                time,
                                subject,
                                teacher: teacherName,
                                room: sharedMatch.room,
                                isMerged: true
                            });
                            foundSlot = true;
                            break;
                        }

                        // Rule 2: Teacher Busy Check
                        const isTeacherBusy = slotsAtTime.some(s => s.teacher === teacherName);
                        if (isTeacherBusy) continue;

                        // Rule 3: Split Subject Logic / Room Availability
                        const isRoomFree = !slotsAtTime.some(s => s.room === room);
                        if (isRoomFree) {
                            tempEntries.push({
                                day,
                                time,
                                subject,
                                teacher: teacherName,
                                room: room,
                                isMerged: false
                            });
                            // Update local temp occupancy
                            if (!globalOccupancy[slotKey]) globalOccupancy[slotKey] = [];
                            globalOccupancy[slotKey].push({
                                room,
                                subject,
                                teacher: teacherName,
                                course: batch.course
                            });
                            foundSlot = true;
                            break;
                        }
                    }
                    if (foundSlot) break;
                }

                if (!foundSlot) {
                    possible = false;
                    break;
                }
            }

            if (possible) {
                selectedRoom = room;
                generatedEntries = tempEntries;
                break;
            }
        }

        if (!selectedRoom) {
            return res.status(400).json({ message: 'Could not find a conflict-free schedule for all subjects in any room with assigned teachers.' });
        }

        // Sort entries
        const dayOrder = Object.fromEntries(DAYS.map((d, i) => [d, i]));
        generatedEntries.sort((a, b) => {
            if (dayOrder[a.day] !== dayOrder[b.day]) return dayOrder[a.day] - dayOrder[b.day];
            return a.time.localeCompare(b.time);
        });

        // 5. Persistence
        await Schedule.deleteMany({ batchId });
        const scheduleDocs = generatedEntries.map(s => ({
            batchId,
            course: batch.course,
            subject: s.subject,
            teacher: s.teacher,
            day: s.day,
            timeSlot: s.time,
            roomAllotted: s.room,
            isMerged: s.isMerged
        }));
        await Schedule.insertMany(scheduleDocs);

        // Update Batch document
        await Batch.findByIdAndUpdate(batchId, {
            classroom: selectedRoom,
            schedule: generatedEntries.map(s => ({
                day: s.day,
                time: s.time,
                subject: s.subject,
                teacher: s.teacher,
                room: s.room
            }))
        });

        return res.json({
            schedule: generatedEntries,
            classroom: selectedRoom,
            teacher: generatedEntries[0]?.teacher || 'Unassigned'
        });

    } catch (err) {
        console.error('Error in autoScheduleBatch:', err);
        res.status(500).json({ message: 'Server error during batch auto-schedule', error: err.message });
    }
};

// Helper to sync manual batch schedule changes to the centralized Schedule collection
exports.syncBatchSchedule = async (batchId, course, scheduleArray) => {
    try {
        const Schedule = require('../models/Schedule');
        await Schedule.deleteMany({ batchId });
        if (!scheduleArray || scheduleArray.length === 0) return;

        // Fetch other schedules for merging detection
        const allOther = await Schedule.find({ batchId: { $ne: batchId } });
        const occupancy = {};
        allOther.forEach(s => {
            const key = `${s.day}-${s.timeSlot}`;
            if (!occupancy[key]) occupancy[key] = [];
            occupancy[key].push(s);
        });

        const docs = scheduleArray.map(s => {
            const slotKey = `${s.day}-${s.time}`;
            const isMerged = (occupancy[slotKey] || []).some(other =>
                other.course === course &&
                other.subject === s.subject &&
                other.teacher === s.teacher
            );

            return {
                batchId,
                course,
                subject: s.subject,
                teacher: s.teacher,
                day: s.day,
                timeSlot: s.time,
                roomAllotted: s.room,
                isMerged
            };
        });

        await Schedule.insertMany(docs);
    } catch (err) {
        console.error('Error syncing batch schedule:', err);
    }
};
