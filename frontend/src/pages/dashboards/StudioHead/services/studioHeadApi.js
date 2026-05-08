/**
 * StudioHead API — re-exports from centralized service modules.
 *
 * Consumers of these functions don't need to change their imports;
 * all calls now go through the shared api.js interceptors.
 */

// ── Account management ────────────────────────────────────
export {
  getPendingUsers,
  approvePendingUser,
  getAllUsers,
  createUserAccount,
  updateUserAccount,
  deleteUserAccount,
  getDepartments,
} from '../../../../services/adminService';

// ── Groups & Leaders ──────────────────────────────────────
import api from '../../../../services/api';

export async function getGroups() {
  const { data } = await api.get('/groups');
  return data;
}

export async function createGroup(payload) {
  const { data } = await api.post('/groups', payload);
  return data;
}

export async function disbandGroup(id) {
  const { data } = await api.delete(`/groups/${id}`);
  return data;
}

export async function toggleLeader(userId, makeLead) {
  const endpoint = makeLead ? 'make-leader' : 'remove-leader';
  const { data } = await api.post(`/users/${userId}/${endpoint}`);
  return data;
}

export async function makeLeader(userId) {
  return toggleLeader(userId, true);
}

export async function removeLeader(userId) {
  return toggleLeader(userId, false);
}
