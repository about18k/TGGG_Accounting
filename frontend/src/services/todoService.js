/**
 * Todo service — personal todos, groups, department tasks
 */
import api from './api';
import {
    buildRequestCacheKey,
    invalidateRequestCache,
    withRequestCache,
} from './requestCache';

const TODO_CACHE_PREFIX = {
    todos: 'todo:todos',
    groups: 'todo:groups',
    departmentTasks: 'todo:department-tasks',
    availableUsers: 'todo:available-users',
    interns: 'todo:interns',
};

// ── Personal Todos ──────────────────────────────────────
export async function getTodos(type, options = {}) {
    return withRequestCache({
        key: buildRequestCacheKey(TODO_CACHE_PREFIX.todos, { type: type || 'personal' }),
        ttlMs: 10000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/todos', { params: { type } });
            return data;
        },
    });
}

export async function createTodo(payload) {
    const { data } = await api.post('/todos', payload);
    invalidateRequestCache(TODO_CACHE_PREFIX.todos);
    invalidateRequestCache(TODO_CACHE_PREFIX.departmentTasks);
    return data;
}

export async function toggleTodo(id, completed) {
    const { data } = await api.put(`/todos/${id}`, { completed: !completed });
    invalidateRequestCache(TODO_CACHE_PREFIX.todos);
    return data;
}

export async function deleteTodo(id) {
    const { data } = await api.delete(`/todos/${id}`);
    invalidateRequestCache(TODO_CACHE_PREFIX.todos);
    invalidateRequestCache(TODO_CACHE_PREFIX.departmentTasks);
    return data;
}

export async function confirmTodo(id, payload) {
    const { data } = await api.post(`/todos/${id}/confirm`, payload);
    invalidateRequestCache(TODO_CACHE_PREFIX.todos);
    return data;
}

export async function confirmCompletion(id) {
    const { data } = await api.post(`/todos/${id}/confirm-completion`);
    invalidateRequestCache(TODO_CACHE_PREFIX.todos);
    return data;
}

export async function rejectCompletion(id) {
    const { data } = await api.post(`/todos/${id}/reject-completion`);
    invalidateRequestCache(TODO_CACHE_PREFIX.todos);
    return data;
}

// ── Groups ──────────────────────────────────────────────
export async function getGroups(options = {}) {
    return withRequestCache({
        key: TODO_CACHE_PREFIX.groups,
        ttlMs: 30000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/groups');
            return data;
        },
    });
}

export async function createGroup(payload) {
    const { data } = await api.post('/groups', payload);
    invalidateRequestCache(TODO_CACHE_PREFIX.groups);
    invalidateRequestCache(TODO_CACHE_PREFIX.availableUsers);
    return data;
}

export async function deleteGroup(id) {
    const { data } = await api.delete(`/groups/${id}`);
    invalidateRequestCache(TODO_CACHE_PREFIX.groups);
    invalidateRequestCache(TODO_CACHE_PREFIX.availableUsers);
    return data;
}

export async function addGroupMember(groupId, userId) {
    const { data } = await api.post(`/groups/${groupId}/members`, { user_id: userId });
    invalidateRequestCache(TODO_CACHE_PREFIX.groups);
    invalidateRequestCache(TODO_CACHE_PREFIX.availableUsers);
    return data;
}

export async function removeGroupMember(groupId, userId) {
    const { data } = await api.delete(`/groups/${groupId}/members/${userId}`);
    invalidateRequestCache(TODO_CACHE_PREFIX.groups);
    invalidateRequestCache(TODO_CACHE_PREFIX.availableUsers);
    return data;
}

// ── Department Tasks ────────────────────────────────────
export async function getDepartmentTasks(options = {}) {
    return withRequestCache({
        key: TODO_CACHE_PREFIX.departmentTasks,
        ttlMs: 10000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/department-tasks');
            return data;
        },
    });
}

export async function createDepartmentTask(payload) {
    const { data } = await api.post('/department-tasks', payload);
    invalidateRequestCache(TODO_CACHE_PREFIX.departmentTasks);
    return data;
}

export async function grabTask(id) {
    const { data } = await api.post(`/department-tasks/${id}/grab`);
    invalidateRequestCache(TODO_CACHE_PREFIX.departmentTasks);
    return data;
}

export async function completeTask(id) {
    const { data } = await api.post(`/department-tasks/${id}/complete`);
    invalidateRequestCache(TODO_CACHE_PREFIX.departmentTasks);
    return data;
}

export async function abandonTask(id) {
    const { data } = await api.post(`/department-tasks/${id}/abandon`);
    invalidateRequestCache(TODO_CACHE_PREFIX.departmentTasks);
    return data;
}

export async function deleteDepartmentTask(id) {
    const { data } = await api.delete(`/department-tasks/${id}`);
    invalidateRequestCache(TODO_CACHE_PREFIX.departmentTasks);
    return data;
}

// ── Users ───────────────────────────────────────────────
export async function getAvailableUsers(options = {}) {
    return withRequestCache({
        key: TODO_CACHE_PREFIX.availableUsers,
        ttlMs: 30000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/users/available');
            return data;
        },
    });
}

export async function getInterns(options = {}) {
    return withRequestCache({
        key: TODO_CACHE_PREFIX.interns,
        ttlMs: 60000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/users/interns');
            return data;
        },
    });
}

export async function toggleLeader(userId, makeLead) {
    const endpoint = makeLead ? 'make-leader' : 'remove-leader';
    const { data } = await api.post(`/users/${userId}/${endpoint}`);
    invalidateRequestCache(TODO_CACHE_PREFIX.interns);
    invalidateRequestCache(TODO_CACHE_PREFIX.availableUsers);
    invalidateRequestCache(TODO_CACHE_PREFIX.groups);
    return data;
}
