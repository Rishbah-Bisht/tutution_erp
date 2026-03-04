import axios from 'axios';

// Dynamic API Base URL logic for deployment
const getBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL) return import.meta.env.VITE_API_BASE_URL;

    // Fallback for local development
    return 'http://localhost:5000';
};

export const API_BASE_URL = getBaseUrl().replace(/\/$/, '');

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
