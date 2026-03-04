import axios from 'axios';
import { API_BASE_URL } from './apiConfig';


const API = axios.create({ baseURL: `${API_BASE_URL}/admin` });

export const checkAdminExists = () => API.get('/check-admin');
export const adminSignup = (data) => API.post('/signup', data);
export const adminLogin = (data) => API.post('/login', data);

// Dashboard API (requires JWT)
const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const getAdminProfile = () => API.get('/profile', authHeader());
export const updateAdminProfile = (data) => API.put('/profile', data, authHeader());
export const updateAdminSettings = (data) => API.put('/settings', data, authHeader());

const DASH_API = axios.create({ baseURL: `${API_BASE_URL}/api` });

export const fetchDashboard = () => DASH_API.get('/admin', authHeader());

export default API;
