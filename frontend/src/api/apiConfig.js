import axios from 'axios';

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
export const TEACHER_API_BASE_URL = import.meta.env.VITE_TEACHER_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:5001' : API_BASE_URL);


// Configured axios instance for generic API calls
const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Configure interceptor for JWT token
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

export default apiClient;
