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
  updateUserAccount,
  deleteUserAccount,
} from '../../../../services/adminService';

// ── Groups & Leaders ──────────────────────────────────────
export {
  getGroups,
  createGroup,
  deleteGroup as disbandGroup,
} from '../../../../services/todoService';

export { toggleLeader } from '../../../../services/todoService';

// Convenience wrappers that match the old API shape
import { toggleLeader as _toggleLeader } from '../../../../services/todoService';

export async function makeLeader(userId) {
  return _toggleLeader(userId, true);
}

export async function removeLeader(userId) {
  return _toggleLeader(userId, false);
}
