const Batch = require('../models/Batch');
const Admin = require('../models/Admin');
const Teacher = require('../models/Teacher');

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
        const query = { classroom, schedule: { $exists: true, $ne: [] } };
        if (excludeBatchId) {
            query._id = { $ne: excludeBatchId }; // if editing an existing batch
        }

        const batches = await Batch.find(query).select('schedule');
        const occupied = new Set();

        batches.forEach(b => {
            b.schedule?.forEach(s => {
                occupied.add(`${s.day}-${s.time}`);
            });
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

        // 2. Fetch all other batch schedules to check occupancy
        const allOtherBatches = await Batch.find({
            _id: { $ne: batchId },
            schedule: { $exists: true, $ne: [] }
        }).select('classroom schedule');

        // Build room occupancy map
        const roomOccupancy = {};
        classrooms.forEach(c => roomOccupancy[c] = new Set());
        allOtherBatches.forEach(b => {
            if (b.classroom && roomOccupancy[b.classroom]) {
                b.schedule?.forEach(s => roomOccupancy[b.classroom].add(`${s.day}-${s.time}`));
            }
        });

        // 3. Fetch all active teachers to check their availability
        const teachers = await Teacher.find({ status: 'active' });
        const teacherOccupancy = {};
        teachers.forEach(t => teacherOccupancy[t.name] = new Set());

        const otherBatchesWithTeachers = await Batch.find({
            _id: { $ne: batchId },
            schedule: { $exists: true, $ne: [] }
        }).select('schedule');

        // Note: For teacher occupancy, we must check ALL batches (including those from other rooms)
        const allBatches = await Batch.find({ schedule: { $exists: true, $ne: [] } }).select('schedule');
        allBatches.forEach(b => {
            b.schedule?.forEach(s => {
                if (s.teacher && teacherOccupancy[s.teacher]) {
                    teacherOccupancy[s.teacher].add(`${s.day}-${s.time}`);
                }
            });
        });

        const timeSlots = buildTimeSlots();
        let selectedRoom = null;
        let generatedEntries = [];

        // 4. Algorithm: Find a room, then for each subject, find a slot and a teacher
        // We iterate classrooms one by one
        for (const room of classrooms) {
            let tempEntries = [];
            let currentRoomOccupancy = new Set(roomOccupancy[room]);
            let currentTeacherOccupancy = JSON.parse(JSON.stringify(
                Object.fromEntries(Object.entries(teacherOccupancy).map(([k, v]) => [k, Array.from(v)]))
            ));
            // Convert back to sets
            Object.keys(currentTeacherOccupancy).forEach(k => currentTeacherOccupancy[k] = new Set(currentTeacherOccupancy[k]));

            let possible = true;

            for (const subject of subjects) {
                // Find a teacher who is assigned to this batch and subject
                const potentialTeachers = teachers.filter(t =>
                    t.assignments?.some(a =>
                        (a.batchId?.toString() === batchId.toString() || a.batchName === batch.name) &&
                        a.subjects?.includes(subject)
                    )
                );

                if (potentialTeachers.length === 0) {
                    // Fallback: any teacher who can teach this subject generally (if we had subject expertise in model)
                    // For now, if no one is assigned, we might have to stop or pick "Unassigned"
                }

                const teacherToUse = potentialTeachers.length > 0 ? potentialTeachers[0] : null;
                const teacherName = teacherToUse ? teacherToUse.name : 'Unassigned';

                // Find a slot where BOTH room and teacher are free
                let foundSlot = false;
                for (const day of DAYS) {
                    for (const time of timeSlots) {
                        const slotKey = `${day}-${time}`;
                        const roomFree = !currentRoomOccupancy.has(slotKey);
                        const teacherFree = teacherName === 'Unassigned' || !currentTeacherOccupancy[teacherName].has(slotKey);

                        if (roomFree && teacherFree) {
                            tempEntries.push({ day, time, subject, teacher: teacherName });
                            currentRoomOccupancy.add(slotKey);
                            if (teacherName !== 'Unassigned') currentTeacherOccupancy[teacherName].add(slotKey);
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

        return res.json({
            schedule: generatedEntries,
            classroom: selectedRoom,
            // For the summary teacher, we pick the most frequent or first one
            teacher: generatedEntries[0]?.teacher || 'Unassigned'
        });

    } catch (err) {
        res.status(500).json({ message: 'Server error during batch auto-schedule', error: err.message });
    }
};
