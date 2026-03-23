/**
 * Attendance service — clock in/out, attendance records, events
 */
import api from './api';
import {
    buildRequestCacheKey,
    invalidateRequestCache,
    withRequestCache,
} from './requestCache';

const ATTENDANCE_CACHE_PREFIX = {
    my: 'attendance:my',
    today: 'attendance:today',
    all: 'attendance:all',
    events: 'attendance:events',
    overtime: 'attendance:overtime',
};

export async function getMyAttendance(options = {}) {
    return withRequestCache({
        key: ATTENDANCE_CACHE_PREFIX.my,
        ttlMs: 10000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/attendance/my/');
            return data;
        },
    });
}

export async function getTodayAttendance(options = {}) {
    return withRequestCache({
        key: ATTENDANCE_CACHE_PREFIX.today,
        ttlMs: 10000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/attendance/my/today/');
            return data;
        },
    });
}

export async function getAllAttendance(params, options = {}) {
    return withRequestCache({
        key: buildRequestCacheKey(ATTENDANCE_CACHE_PREFIX.all, params),
        ttlMs: 30000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/attendance/all/', { params });
            return data;
        },
    });
}

export async function clockIn(payload) {
    const { data } = await api.post('/attendance/clock-in/', payload);
    invalidateRequestCache(ATTENDANCE_CACHE_PREFIX.my);
    invalidateRequestCache(ATTENDANCE_CACHE_PREFIX.today);
    invalidateRequestCache(ATTENDANCE_CACHE_PREFIX.all);
    return data;
}

export async function clockOut(payload) {
    const { data } = await api.post('/attendance/clock-out/', payload);
    invalidateRequestCache(ATTENDANCE_CACHE_PREFIX.my);
    invalidateRequestCache(ATTENDANCE_CACHE_PREFIX.today);
    invalidateRequestCache(ATTENDANCE_CACHE_PREFIX.all);
    return data;
}

export async function getEvents(params, options = {}) {
    return withRequestCache({
        key: buildRequestCacheKey(ATTENDANCE_CACHE_PREFIX.events, params),
        ttlMs: 60000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/attendance/events/', { params });
            return data;
        },
    });
}

export async function createEvent(payload) {
    const { data } = await api.post('/attendance/events/', payload);
    invalidateRequestCache(ATTENDANCE_CACHE_PREFIX.events);
    return data;
}

export async function getOvertimeRecords(options = {}) {
    return withRequestCache({
        key: ATTENDANCE_CACHE_PREFIX.overtime,
        ttlMs: 20000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/attendance/overtime/');
            return data;
        },
    });
}

export async function uploadWorkDocFile(attendanceId, file, note) {
    const formData = new FormData();
    if (file) {
        formData.append('file', file);
    }
    if (note) {
        formData.append('work_doc_note', note);
    }

    const { data } = await api.post(`/attendance/${attendanceId}/work-docs/upload/`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    invalidateRequestCache(ATTENDANCE_CACHE_PREFIX.my);
    invalidateRequestCache(ATTENDANCE_CACHE_PREFIX.today);
    invalidateRequestCache(ATTENDANCE_CACHE_PREFIX.all);
    return data;
}
