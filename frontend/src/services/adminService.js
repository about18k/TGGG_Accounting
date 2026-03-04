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
    const { data } = await api.post('/accounts/approve/', { user_id: userId, role });
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
