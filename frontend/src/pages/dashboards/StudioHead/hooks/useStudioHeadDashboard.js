import { useEffect, useMemo, useState } from 'react';
import { approvePendingUser, getAllUsers, getPendingUsers } from '../services/studioHeadApi';

export function useStudioHeadDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // overview | approvals | users | reviews | coordination

  const [message, setMessage] = useState('');
  const [loadingApprove, setLoadingApprove] = useState(false);

  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // role selection per pending user
  const [roleByUserId, setRoleByUserId] = useState({});

  const allowedRoles = useMemo(() => ([
    { value: 'accounting', label: 'Accounting' },
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

  async function approveUser(userId) {
    const role = roleByUserId[userId] || 'accounting';
    try {
      setLoadingApprove(true);
      setMessage('');
      await approvePendingUser({ userId, role });
      setMessage('User approved successfully.');
      await fetchPending();
      await fetchUsers();
    } catch (e) {
      setMessage('Failed to approve user.');
    } finally {
      setLoadingApprove(false);
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
    loadingApprove,

    // users
    usersLoading,
    usersError,
    searchTerm,
    setSearchTerm,
    filteredUsers,

    // refresh
    fetchPending,
    fetchUsers,
  };
}
