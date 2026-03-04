/**
 * Leave service — submit and view leave requests
 */
import api from './api';

export async function getMyLeaves() {
    const { data } = await api.get('/attendance/leave/my/');
    return data;
}

export async function submitLeave(payload) {
    const { data } = await api.post('/attendance/leave/', payload);
    return data;
}
