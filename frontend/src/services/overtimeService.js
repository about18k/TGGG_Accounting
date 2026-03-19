/**
 * Overtime service — submit, view, approve OT requests
 */
import api from './api';
import {
    invalidateRequestCache,
    withRequestCache,
} from './requestCache';

const OVERTIME_CACHE_PREFIX = {
    my: 'overtime:my',
    all: 'overtime:all',
};

export async function getMyOvertime(options = {}) {
    return withRequestCache({
        key: OVERTIME_CACHE_PREFIX.my,
        ttlMs: 15000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/overtime/my');
            return data;
        },
    });
}

export async function getAllOvertime(options = {}) {
    return withRequestCache({
        key: OVERTIME_CACHE_PREFIX.all,
        ttlMs: 15000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/overtime/all');
            return data;
        },
    });
}

export async function submitOvertime(payload) {
    const { data } = await api.post('/overtime', payload);
    invalidateRequestCache(OVERTIME_CACHE_PREFIX.my);
    invalidateRequestCache(OVERTIME_CACHE_PREFIX.all);
    return data;
}

export async function approveOvertime(id, payload) {
    const { data } = await api.put(`/overtime/${id}/approve`, payload);
    invalidateRequestCache(OVERTIME_CACHE_PREFIX.my);
    invalidateRequestCache(OVERTIME_CACHE_PREFIX.all);
    return data;
}
