import apiClient from './apiConfig';

export const getSubjects = (params) => apiClient.get('/subjects', { params });
export const createSubject = (data) => apiClient.post('/subjects', data);
