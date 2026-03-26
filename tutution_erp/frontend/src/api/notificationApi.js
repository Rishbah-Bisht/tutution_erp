import apiClient from './apiConfig';

export const fetchNotificationRecipients = (params = {}) => apiClient.get('/notifications/recipients', { params });
export const fetchNotificationHistory = (params = {}) => apiClient.get('/notifications/history', { params });
export const sendAdminNotifications = (payload) => apiClient.post('/notifications/send', payload);
export const cleanupNotificationHistory = (adminPassword) => apiClient.post('/notifications/cleanup', { adminPassword });
