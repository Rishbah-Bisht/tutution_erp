# Attendance System Design

## Schema Design

### Users
- Existing implementation keeps `Admin` and `Teacher` as separate MongoDB models.
- RBAC is enforced through JWT role claims and route middleware.
- Recommended future consolidation:
  - `User { name, email, phone, passwordHash, role, status, profileImage }`
  - Roles: `admin`, `teacher`

### Students
- Existing model: `backend/models/Student.js`
- Key fields used by attendance:
  - `name`
  - `rollNo`
  - `batchId`
  - `status`
- Indexed for batch and status driven roster queries.

### Batches
- Existing model: `backend/models/Batch.js`
- Attendance additions:
  - `subjectIds: [ObjectId]`
  - `subjects: [String]` kept for backward compatibility

### Subjects
- New model: `backend/models/Subject.js`
- Fields:
  - `name`
  - `code`
  - `description`
  - `isActive`
  - `createdAt`
  - `updatedAt`

### TeacherAssignments
- New model: `backend/models/TeacherAssignment.js`
- Fields:
  - `teacherId`
  - `batchId`
  - `subjectId`
  - `assignedBy`
  - `isActive`
  - `createdAt`
  - `updatedAt`
- Unique constraint:
  - one teacher per `batchId + subjectId`

### Attendance
- New shape in `backend/models/Attendance.js`
- Fields:
  - `studentId`
  - `batchId`
  - `subjectId`
  - `date`
  - `attendanceDate`
  - `status`
  - `markedBy`
  - `markedByRole`
  - `notes`
  - `createdAt`
  - `updatedAt`
- Unique constraint:
  - `studentId + batchId + subjectId + attendanceDate`

## Indexing Strategy

- `Attendance(studentId, batchId, subjectId, attendanceDate)` unique
- `Attendance(batchId, subjectId, attendanceDate)`
- `Attendance(studentId, attendanceDate)`
- `TeacherAssignment(batchId, subjectId)` unique
- `TeacherAssignment(teacherId, isActive, batchId)`
- `Batch(isActive, name)`
- `Subject(name)` unique
- `Subject(code)` unique sparse

These indexes support:
- large batch roster reads
- subject/date report filtering
- duplicate attendance prevention
- teacher-scoped access checks
- future analytics and percentage calculations

## API Structure

### Subject APIs
- `GET /api/subjects`
- `POST /api/subjects`

### Teacher Assignment APIs
- `GET /api/teacher-assignments`
- `POST /api/teacher-assignments`

### Attendance APIs
- `GET /api/attendance/setup/admin`
- `GET /api/attendance/teacher/assigned-batches`
- `GET /api/attendance/roster?batchId=&subjectId=&date=`
- `POST /api/attendance/mark`
- `PUT /api/attendance/:id`
- `GET /api/attendance/report?batchId=&subjectId=&studentId=&dateFrom=&dateTo=&page=&limit=`

## RBAC Rules

### Admin
- can create subjects
- can assign subjects to teachers
- can mark attendance for any batch/subject
- can update any attendance record
- can query all attendance reports

### Teacher
- can only access `TeacherAssignment` combinations assigned to them
- can only load roster for assigned `batchId + subjectId`
- can only mark attendance for assigned `batchId + subjectId`
- can only view history for assigned `batchId + subjectId`

## Future Analytics Readiness

The current design already supports:
- attendance percentage calculation by student, subject, or batch
- daily/weekly/monthly trend aggregation
- late arrival analysis
- absence alert jobs
- predictive analytics over attendance streaks

Recommended next analytics fields if needed:
- `termId`
- `session`
- `attendanceSource` (`web`, `mobile`, `bulk-import`)
- `alertTriggeredAt`

## React Native Attendance Logic

```tsx
const [filters, setFilters] = useState({
  batchId: '',
  subjectId: '',
  date: new Date().toISOString().slice(0, 10),
});
const [students, setStudents] = useState([]);

async function loadAssignedBatches() {
  const res = await api.get('/attendance/teacher/assigned-batches');
  return res.data.batches;
}

async function loadRoster() {
  const res = await api.get('/attendance/roster', { params: filters });
  setStudents(res.data.students);
}

function updateStatus(studentId: string, status: 'Present' | 'Absent' | 'Late') {
  setStudents((current) =>
    current.map((student) =>
      student._id === studentId ? { ...student, attendanceStatus: status } : student
    )
  );
}

async function saveAttendance() {
  await api.post('/attendance/mark', {
    ...filters,
    entries: students.map((student) => ({
      studentId: student._id,
      status: student.attendanceStatus || 'Present',
    })),
  });
}
```

## Example Mobile Screen Layout

- top selector: batch
- second selector: subject
- date picker
- student list
- segmented toggle: `Present / Absent / Late`
- sticky bottom button: `Save Attendance`

