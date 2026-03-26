import axios from 'axios';
import { API_BASE_URL, TEACHER_API_BASE_URL } from './apiConfig';

const API = axios.create({ baseURL: API_BASE_URL, withCredentials: true });
const TEACHER_API = axios.create({ baseURL: TEACHER_API_BASE_URL, withCredentials: true });

// --- Admin ---
export const adminLogin = (data) => API.post('/api/admin/login', data);
export const adminLogout = () => API.post('/api/admin/logout');

// --- Teacher ---
export const teacherLogin = (data) => TEACHER_API.post('/api/teacher/login', data);
export const teacherLogout = () => TEACHER_API.post('/api/teacher/logout');


// --- Student ---
export const studentSignup = (data) => API.post('/api/student/signup', data);
export const studentLogin = (data) => API.post('/api/student/login', data);
export const studentLogout = () => API.post('/api/student/logout');
export const studentCompleteSetup = (data) => API.post('/api/student/complete-setup', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export default {
    adminLogin,
    adminLogout,
    teacherLogin,
    teacherLogout,
    studentSignup,
    studentLogin,
    studentLogout,
    studentCompleteSetup
};
