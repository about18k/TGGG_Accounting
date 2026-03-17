/**
 * Admin service — user management, approvals, accounting employees
 * Absorbs the former studioHeadApi.js
 */
import api from './api';

// ── User Management ─────────────────────────────────────
export async function getPendingUsers() {
    const { data } = await api.get('/accounts/pending/');
    return data;
}

export async function approvePendingUser(userId, role) {
    const resolvedUserId = typeof userId === 'object'
        ? (userId?.id ?? userId?.user_id ?? userId?.userId)
        : userId;

    if (resolvedUserId === undefined || resolvedUserId === null || resolvedUserId === '') {
        throw new Error('Missing user id for approval request');
    }

    const normalizedRole = typeof role === 'string'
        ? role.trim().toLowerCase().replace(/\s+/g, '_')
        : role;

    const { data } = await api.post('/accounts/approve/', {
        user_id: resolvedUserId,
        userId: resolvedUserId,
        role: normalizedRole || 'accounting',
    });
    return data;
}

export async function getAllUsers() {
    const { data } = await api.get('/accounts/users/');
    return data;
}

export async function updateUserAccount(userId, payload) {
    const { data } = await api.patch(`/accounts/users/${userId}/`, payload);
    return data;
}

export async function deleteUserAccount(userId) {
    const { data } = await api.delete(`/accounts/users/${userId}/`);
    return data;
}

export async function getDepartments() {
    const { data } = await api.get('/accounts/departments/');
    return data;
}

// ── Accounting Employee Management ──────────────────────
export async function getAccountingEmployees(params) {
    const { data } = await api.get('/accounts/accounting/employees/', { params });
    return data;
}

export async function addAccountingEmployee(payload) {
    const { data } = await api.post('/accounts/accounting/employees/', payload);
    return data;
}

export async function updateAccountingEmployee(userId, payload) {
    const { data } = await api.patch(`/accounts/accounting/employees/${userId}/`, payload);
    return data;
}
