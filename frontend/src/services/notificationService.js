/**
 * Notification service — fetch, mark read, mark all read
 */
import api from './api';
import {
    invalidateRequestCache,
    withRequestCache,
} from './requestCache';

const NOTIFICATION_CACHE_PREFIX = {
    list: 'notification:list',
};

export async function getNotifications(options = {}) {
    return withRequestCache({
        key: NOTIFICATION_CACHE_PREFIX.list,
        ttlMs: 10000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/notifications');
            return data;
        },
    });
}

export async function markNotificationRead(id) {
    const { data } = await api.post(`/notifications/${id}/read`);
    invalidateRequestCache(NOTIFICATION_CACHE_PREFIX.list);
    return data;
}

export async function markAllNotificationsRead() {
    const { data } = await api.post('/notifications/read-all');
    invalidateRequestCache(NOTIFICATION_CACHE_PREFIX.list);
    return data;
}
