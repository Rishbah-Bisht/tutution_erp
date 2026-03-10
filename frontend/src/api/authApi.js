import axios from 'axios';
import { API_BASE_URL, TEACHER_API_BASE_URL } from './apiConfig';

const API = axios.create({ baseURL: API_BASE_URL });
const TEACHER_API = axios.create({ baseURL: TEACHER_API_BASE_URL });

// --- Admin ---
export const adminLogin = (data) => API.post('/api/admin/login', data);

// --- Teacher ---
export const teacherLogin = (data) => TEACHER_API.post('/api/teacher/login', data);



// --- Student ---
export const studentLogin = (data) => API.post('/api/student/login', data);

export default {
    adminLogin,
    teacherLogin,
    studentLogin
};
