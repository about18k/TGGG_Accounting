/**
 * Overtime service — submit, view, approve OT requests
 */
import api from './api';

export async function getMyOvertime() {
    const { data } = await api.get('/overtime/my');
    return data;
}

export async function getAllOvertime() {
    const { data } = await api.get('/overtime/all');
    return data;
}

export async function submitOvertime(payload) {
    const { data } = await api.post('/overtime', payload);
    return data;
}

export async function approveOvertime(id, payload) {
    const { data } = await api.put(`/overtime/${id}/approve`, payload);
    return data;
}
