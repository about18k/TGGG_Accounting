/**
 * Admin service — user management, approvals, accounting employees
 * Absorbs the former studioHeadApi.js
 */
import api from './api';
import {
    buildRequestCacheKey,
    invalidateRequestCache,
    withRequestCache,
} from './requestCache';

const ADMIN_CACHE_PREFIX = {
    pendingUsers: 'admin:pending-users',
    allUsers: 'admin:all-users',
    departments: 'admin:departments',
    accountingEmployees: 'admin:accounting-employees',
};

// ── User Management ─────────────────────────────────────
export async function getPendingUsers(options = {}) {
    return withRequestCache({
        key: ADMIN_CACHE_PREFIX.pendingUsers,
        ttlMs: 20000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/accounts/pending/');
            return data;
        },
    });
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
    invalidateRequestCache(ADMIN_CACHE_PREFIX.pendingUsers);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.allUsers);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.accountingEmployees);
    return data;
}

export async function getAllUsers(options = {}) {
    return withRequestCache({
        key: ADMIN_CACHE_PREFIX.allUsers,
        ttlMs: 20000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/accounts/users/');
            return data;
        },
    });
}

export async function updateUserAccount(userId, payload) {
    const { data } = await api.patch(`/accounts/users/${userId}/`, payload);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.allUsers);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.pendingUsers);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.accountingEmployees);
    return data;
}

export async function createUserAccount(payload) {
    const { data } = await api.post('/accounts/users/', payload);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.allUsers);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.pendingUsers);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.accountingEmployees);
    return data;
}

export async function deleteUserAccount(userId) {
    const { data } = await api.delete(`/accounts/users/${userId}/`);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.allUsers);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.pendingUsers);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.accountingEmployees);
    return data;
}

export async function getDepartments(options = {}) {
    return withRequestCache({
        key: ADMIN_CACHE_PREFIX.departments,
        ttlMs: 120000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/accounts/departments/');
            return data;
        },
    });
}

// ── Accounting Employee Management ──────────────────────
export async function getAccountingEmployees(params, options = {}) {
    return withRequestCache({
        key: buildRequestCacheKey(ADMIN_CACHE_PREFIX.accountingEmployees, params),
        ttlMs: 20000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/accounts/accounting/employees/', { params });
            return data;
        },
    });
}

export async function addAccountingEmployee(payload) {
    const { data } = await api.post('/accounts/accounting/employees/', payload);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.accountingEmployees);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.pendingUsers);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.allUsers);
    return data;
}

export async function updateAccountingEmployee(userId, payload) {
    const { data } = await api.patch(`/accounts/accounting/employees/${userId}/`, payload);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.accountingEmployees);
    invalidateRequestCache(ADMIN_CACHE_PREFIX.allUsers);
    return data;
}
