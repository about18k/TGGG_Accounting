import { useEffect, useMemo, useState } from 'react';
import {
  approvePendingUser,
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
  const [activeTab, setActiveTab] = useState('overview'); // overview | approvals | users | reviews | coordination

  const [message, setMessage] = useState('');
  const [approvingUserId, setApprovingUserId] = useState(null);

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
  ]), []);

  async function fetchPending() {
    try {
      setPendingLoading(true);
      const data = await getPendingUsers();
      const list = Array.isArray(data) ? data : (data?.users ?? []);
      setPendingUsers(list);

      // initialize role defaults if missing
      setRoleByUserId((prev) => {
        const next = { ...prev };
        for (const u of list) if (!next[u.id]) next[u.id] = 'accounting';
        return next;
      });
    } catch (e) {
      setMessage('Failed to load pending users.');
    } finally {
      setPendingLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      setUsersError('');
      setUsersLoading(true);
      const data = await getAllUsers();
      const list = Array.isArray(data) ? data : (data?.users ?? []);
      setUsers(list);
    } catch (e) {
      setUsersError('Failed to load users.');
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
    const role = roleByUserId[userId] || 'accounting';
    try {
      setApprovingUserId(userId);
      setMessage('');
      await approvePendingUser({ userId, role });
      setMessage('User approved successfully.');
      await fetchPending();
      await fetchUsers();
    } catch (e) {
      setMessage('Failed to approve user.');
    } finally {
      setApprovingUserId(null);
    }
  }

  async function editUser(userId, updates) {
    try {
      setUserActionById((prev) => ({ ...prev, [userId]: true }));
      await updateUserAccount(userId, updates);
      setMessage('User updated successfully.');
      await fetchUsers();
    } catch (e) {
      setMessage('Failed to update user.');
    } finally {
      setUserActionById((prev) => ({ ...prev, [userId]: false }));
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
      await fetchUsers();
    } catch (e) {
      setMessage('Failed to delete user.');
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

    // users
    usersLoading,
    usersError,
    userActionById,
    searchTerm,
    setSearchTerm,
    filteredUsers,
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
