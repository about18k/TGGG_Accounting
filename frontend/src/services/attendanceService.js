/**
 * Attendance service — clock in/out, attendance records, events
 */
import api from './api';

export async function getMyAttendance() {
    const { data } = await api.get('/attendance/my/');
    return data;
}

export async function getTodayAttendance() {
    const { data } = await api.get('/attendance/my/today/');
    return data;
}

export async function getAllAttendance(params) {
    const { data } = await api.get('/attendance/all/', { params });
    return data;
}

export async function clockIn(payload) {
    const { data } = await api.post('/attendance/clock-in/', payload);
    return data;
}

export async function clockOut(payload) {
    const { data } = await api.post('/attendance/clock-out/', payload);
    return data;
}

export async function getEvents(params) {
    const { data } = await api.get('/attendance/events/', { params });
    return data;
}

export async function createEvent(payload) {
    const { data } = await api.post('/attendance/events/', payload);
    return data;
}

export async function getOvertimeRecords() {
    const { data } = await api.get('/attendance/overtime/');
    return data;
}
