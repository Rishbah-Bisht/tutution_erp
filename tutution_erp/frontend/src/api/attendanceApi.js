import axios from 'axios';
import apiClient, { TEACHER_API_BASE_URL } from './apiConfig';

const teacherAttendanceClient = axios.create({
    baseURL: `${TEACHER_API_BASE_URL}/api`,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const getAdminAttendanceSetup = () => apiClient.get('/attendance/setup/admin');
export const getSubjects = (params = {}) => apiClient.get('/subjects', { params });
export const createSubject = (payload) => apiClient.post('/subjects', payload);
export const getTeacherAssignments = (params = {}) => apiClient.get('/teacher-assignments', { params });
export const assignSubjectToTeacher = (payload) => apiClient.post('/teacher-assignments', payload);
export const getAdminAttendanceRoster = (params) => apiClient.get('/attendance/roster', { params });
export const markAdminAttendance = (payload) => apiClient.post('/attendance/mark', payload);
export const updateAdminAttendance = (attendanceId, payload) => apiClient.put(`/attendance/${attendanceId}`, payload);
export const getAdminAttendanceReport = (params) => apiClient.get('/attendance/report', { params });
export const getStudentAttendanceReport = (params) => apiClient.get('/attendance/student/report', { params });

export const getTeacherAssignedBatches = () => teacherAttendanceClient.get('/attendance/teacher/assigned-batches');
export const getTeacherAttendanceRoster = (params) => teacherAttendanceClient.get('/attendance/roster', { params });
export const markTeacherAttendance = (payload) => teacherAttendanceClient.post('/attendance/mark', payload);
export const updateTeacherAttendance = (attendanceId, payload) => teacherAttendanceClient.put(`/attendance/${attendanceId}`, payload);
export const getTeacherAttendanceReport = (params) => teacherAttendanceClient.get('/attendance/report', { params });
