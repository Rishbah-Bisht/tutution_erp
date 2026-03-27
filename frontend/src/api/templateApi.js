import axios from 'axios';
import { API_BASE_URL, attachAuthToken } from './apiConfig';

const API = attachAuthToken(axios.create({
    baseURL: `${API_BASE_URL}/api/templates`,
    withCredentials: true
}));

export const fetchTemplates = () => API.get('/');
export const updateTemplate = (id, data) => API.put(`/${id}`, data);

export default API;
