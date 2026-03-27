import axios from 'axios';
import { API_BASE_URL, attachAuthToken } from './apiConfig';


const API = attachAuthToken(axios.create({
    baseURL: `${API_BASE_URL}/api/admin`,
    withCredentials: true
}));

export const checkAdminExists = () => API.get('/check-admin');
export const adminSignup = (data) => API.post('/signup', data);
export const adminLogin = (data) => API.post('/login', data);
export const adminLogout = () => API.post('/logout');

export const getAdminProfile = () => API.get('/profile');
export const updateAdminProfile = (data) => API.put('/profile', data);
export const updateSettings = (data) => API.put('/settings', data);

// Settings page extra metrics
export const getDatabaseStats = () => axios.get(`${API_BASE_URL}/api/settings/db-stats`, { withCredentials: true });

// The dashboard work routes are also under this base
export const fetchDashboard = () => API.get('/');

// Database Wipe APIs
export const wipeDatabase = (password) => API.post('/wipe-database', { password });

export default API;
