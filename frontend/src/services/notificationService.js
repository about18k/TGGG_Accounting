/**
 * Notification service — fetch, mark read, mark all read
 */
import api from './api';

export async function getNotifications() {
    const { data } = await api.get('/notifications');
    return data;
}

export async function markNotificationRead(id) {
    const { data } = await api.post(`/notifications/${id}/read`);
    return data;
}

export async function markAllNotificationsRead() {
    const { data } = await api.post('/notifications/read-all');
    return data;
}
