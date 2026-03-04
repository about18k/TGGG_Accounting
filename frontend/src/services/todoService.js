/**
 * Todo service — personal todos, groups, department tasks
 */
import api from './api';

// ── Personal Todos ──────────────────────────────────────
export async function getTodos(type) {
    const { data } = await api.get('/todos', { params: { type } });
    return data;
}

export async function createTodo(payload) {
    const { data } = await api.post('/todos', payload);
    return data;
}

export async function toggleTodo(id, completed) {
    const { data } = await api.put(`/todos/${id}`, { completed: !completed });
    return data;
}

export async function deleteTodo(id) {
    const { data } = await api.delete(`/todos/${id}`);
    return data;
}

export async function confirmTodo(id, payload) {
    const { data } = await api.post(`/todos/${id}/confirm`, payload);
    return data;
}

export async function confirmCompletion(id) {
    const { data } = await api.post(`/todos/${id}/confirm-completion`);
    return data;
}

export async function rejectCompletion(id) {
    const { data } = await api.post(`/todos/${id}/reject-completion`);
    return data;
}

// ── Groups ──────────────────────────────────────────────
export async function getGroups() {
    const { data } = await api.get('/groups');
    return data;
}

export async function createGroup(payload) {
    const { data } = await api.post('/groups', payload);
    return data;
}

export async function deleteGroup(id) {
    const { data } = await api.delete(`/groups/${id}`);
    return data;
}

export async function addGroupMember(groupId, userId) {
    const { data } = await api.post(`/groups/${groupId}/members`, { user_id: userId });
    return data;
}

export async function removeGroupMember(groupId, userId) {
    const { data } = await api.delete(`/groups/${groupId}/members/${userId}`);
    return data;
}

// ── Department Tasks ────────────────────────────────────
export async function getDepartmentTasks() {
    const { data } = await api.get('/department-tasks');
    return data;
}

export async function createDepartmentTask(payload) {
    const { data } = await api.post('/department-tasks', payload);
    return data;
}

export async function grabTask(id) {
    const { data } = await api.post(`/department-tasks/${id}/grab`);
    return data;
}

export async function completeTask(id) {
    const { data } = await api.post(`/department-tasks/${id}/complete`);
    return data;
}

export async function abandonTask(id) {
    const { data } = await api.post(`/department-tasks/${id}/abandon`);
    return data;
}

export async function deleteDepartmentTask(id) {
    const { data } = await api.delete(`/department-tasks/${id}`);
    return data;
}

// ── Users ───────────────────────────────────────────────
export async function getAvailableUsers() {
    const { data } = await api.get('/users/available');
    return data;
}

export async function getInterns() {
    const { data } = await api.get('/users/interns');
    return data;
}

export async function toggleLeader(userId, makeLead) {
    const endpoint = makeLead ? 'make-leader' : 'remove-leader';
    const { data } = await api.post(`/users/${userId}/${endpoint}`);
    return data;
}
