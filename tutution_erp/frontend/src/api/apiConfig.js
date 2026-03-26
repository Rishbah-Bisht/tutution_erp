import axios from 'axios';
import { clearClientSession } from '../utils/authSession';

const getBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL !== undefined) {
        return import.meta.env.VITE_API_BASE_URL;
    }
    // Fallback for local development
    if (import.meta.env.DEV) {
        return 'http://localhost:5000';
    }
    // Production fallback (same domain)
    return '';
};

export const API_BASE_URL = getBaseUrl().replace(/\/$/, '');
export const TEACHER_API_BASE_URL = (import.meta.env.VITE_TEACHER_API_BASE_URL || API_BASE_URL).replace(/\/$/, '');


// Configured axios instance for generic API calls
const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = String(error.config?.url || '');
        const isAuthRequest = /\/(login|signup|logout)$/.test(url);

        if (status === 401 && !isAuthRequest && typeof window !== 'undefined') {
            const role = localStorage.getItem('role');
            const currentPath = window.location.pathname;
            clearClientSession();

            if (currentPath !== '/login' && currentPath !== '/signup') {
                window.location.assign('/login');
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
