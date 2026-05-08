import { useEffect, useMemo, useState } from 'react';
import {
  approvePendingUser,
  createUserAccount,
  deleteUserAccount,
  getAllUsers,
  getPendingUsers,
  updateUserAccount,
  makeLeader,
  removeLeader,
  getGroups,
  createGroup,
  disbandGroup,
} from '../services/studioHeadApi';

export function useStudioHeadDashboard() {
  const [activeTab, setActiveTab] = useState('approvals'); // approvals | users | reviews | coordination

  const [message, setMessage] = useState('');
  const [approvingUserId, setApprovingUserId] = useState(null);
  const [decliningUserId, setDecliningUserId] = useState(null);

  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [userActionById, setUserActionById] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Groups
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // role selection per pending user
  const [roleByUserId, setRoleByUserId] = useState({});

  const resolveUserId = (userOrId) => {
    if (userOrId && typeof userOrId === 'object') {
      return userOrId.id ?? userOrId.user_id ?? userOrId.userId ?? null;
    }
    return userOrId ?? null;
  };

  const allowedRoles = useMemo(() => ([
    { value: 'accounting', label: 'Accounting' },
    { value: 'employee', label: 'Employee' },
    { value: 'bim_specialist', label: 'BIM Specialist' },
    { value: 'intern', label: 'Intern' },
    { value: 'junior_architect', label: 'Junior Architect' },
    { value: 'president', label: 'President' },
    { value: 'site_engineer', label: 'Site Engineer' },
    { value: 'site_coordinator', label: 'Site Coordinator' },
    { value: 'studio_head', label: 'Studio Head' },
    { value: 'admin', label: 'Admin' },
    { value: 'ceo', label: 'CEO' },
  ]), []);

  async function fetchPending() {
    try {
      setPendingLoading(true);
      const data = await getPendingUsers();
      const list = Array.isArray(data) ? data : (data?.users ?? []);
      const normalizedList = list
        .map((u) => {
          const id = resolveUserId(u);
          if (id === null || id === undefined || id === '') return null;
          return { ...u, id };
        })
        .filter(Boolean);

      setPendingUsers(normalizedList);

      // initialize role defaults if missing
      setRoleByUserId((prev) => {
        const next = { ...prev };
        for (const u of normalizedList) {
          const id = resolveUserId(u);
          if (id !== null && id !== undefined && !next[id]) next[id] = 'accounting';
        }
        return next;
      });
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Failed to load pending users.');
    } finally {
      setPendingLoading(false);
    }
  }

  async function fetchUsers(options = {}) {
    try {
      setUsersError('');
      setUsersLoading(true);
      const data = await getAllUsers({ force: options.force === true });
      const list = Array.isArray(data) ? data : (data?.users ?? []);
      setUsers(list);
    } catch (e) {
      setUsersError(e?.response?.data?.error || 'Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }

  async function fetchGroups() {
    try {
      setGroupsLoading(true);
      const data = await getGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      setMessage('Failed to load groups.');
    } finally {
      setGroupsLoading(false);
    }
  }

  async function approveUser(userId) {
    const resolvedUserId = resolveUserId(userId);

    if (resolvedUserId === null || resolvedUserId === undefined || resolvedUserId === '') {
      setMessage('Failed to approve user: missing user ID.');
      return;
    }

    const role = roleByUserId[resolvedUserId] || 'accounting';
    try {
      setApprovingUserId(resolvedUserId);
      setMessage('');
      await approvePendingUser(resolvedUserId, role);
      setMessage('User approved successfully.');
      await fetchPending();
      await fetchUsers();
    } catch (e) {
      setMessage(e?.response?.data?.error || e?.message || 'Failed to approve user.');
    } finally {
      setApprovingUserId(null);
    }
  }

  async function declinePendingUser(userId) {
    const resolvedUserId = resolveUserId(userId);

    if (resolvedUserId === null || resolvedUserId === undefined || resolvedUserId === '') {
      setMessage('Failed to decline user: missing user ID.');
      return;
    }

    try {
      setDecliningUserId(resolvedUserId);
      setMessage('');
      await deleteUserAccount(resolvedUserId);
      setMessage('User declined and deleted successfully.');
      await fetchPending();
      await fetchUsers();
    } catch (e) {
      setMessage(e?.response?.data?.error || e?.message || 'Failed to decline user.');
    } finally {
      setDecliningUserId(null);
    }
  }

  async function editUser(userId, updates) {
    try {
      setUserActionById((prev) => ({ ...prev, [userId]: true }));
      await updateUserAccount(userId, updates);
      setMessage('User updated successfully.');
      await fetchUsers();
      return { success: true };
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to update user.';
      setMessage(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setUserActionById((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function addUser(payload) {
    try {
      setMessage('');
      await createUserAccount(payload);
      setMessage('Account created successfully.');
      await fetchUsers();
      return { success: true };
    } catch (e) {
      const errorMsg = e?.response?.data?.error || e?.message || 'Failed to create account.';
      setMessage(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async function toggleUserStatus(userId, isActive) {
    try {
      setUserActionById((prev) => ({ ...prev, [userId]: true }));
      await updateUserAccount(userId, { is_active: isActive });
      setMessage(`User ${isActive ? 'activated' : 'suspended'} successfully.`);
      await fetchUsers();
    } catch (e) {
      setMessage(`Failed to ${isActive ? 'activate' : 'suspend'} user.`);
    } finally {
      setUserActionById((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function removeUser(userId) {
    try {
      setUserActionById((prev) => ({ ...prev, [userId]: true }));
      await deleteUserAccount(userId);
      setMessage('User deleted successfully.');
      await fetchUsers({ force: true });
    } catch (e) {
      setMessage(e?.response?.data?.error || e?.message || 'Failed to delete user.');
    } finally {
      setUserActionById((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function handleMakeLeader(userId) {
    try {
      setUserActionById((prev) => ({ ...prev, [userId]: true }));
      await makeLeader(userId);
      setMessage('User is now a leader.');
      await fetchUsers();
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Failed to make user a leader.');
    } finally {
      setUserActionById((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function handleRemoveLeader(userId) {
    try {
      setUserActionById((prev) => ({ ...prev, [userId]: true }));
      await removeLeader(userId);
      setMessage('User is no longer a leader.');
      await fetchUsers();
      await fetchGroups(); // In case a group's leader was removed
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Failed to remove leader status.');
    } finally {
      setUserActionById((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function handleCreateGroup(payload) {
    try {
      await createGroup(payload);
      setMessage('Group created successfully.');
      await fetchGroups();
      return true;
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Failed to create group.');
      return false;
    }
  }

  async function handleDisbandGroup(groupId) {
    try {
      await disbandGroup(groupId);
      setMessage('Group disbanded successfully.');
      await fetchGroups();
      return true;
    } catch (e) {
      setMessage(e?.response?.data?.error || 'Failed to disband group.');
      return false;
    }
  }

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return users;

    return users.filter((u) => {
      const name = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [users, searchTerm]);

  useEffect(() => {
    fetchPending();
    fetchUsers();
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // tabs
    activeTab,
    setActiveTab,

    // banner message
    message,
    setMessage,

    // approvals
    pendingUsers,
    pendingLoading,
    roleByUserId,
    setRoleByUserId,
    allowedRoles,
    approveUser,
    approvingUserId,
    declinePendingUser,
    decliningUserId,

    // users
    usersLoading,
    usersError,
    userActionById,
    searchTerm,
    setSearchTerm,
    filteredUsers,
    addUser,
    editUser,
    toggleUserStatus,
    removeUser,

    // groups and leaders
    groups,
    groupsLoading,
    handleMakeLeader,
    handleRemoveLeader,
    handleCreateGroup,
    handleDisbandGroup,

    // refresh
    fetchPending,
    fetchUsers,
    fetchGroups,
  };
}
