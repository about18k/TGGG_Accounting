import { useEffect, useRef, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import UserRow from './UserRow';
import EmptyState from './EmptyState';
import { getDepartments } from '../services/studioHeadApi';

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="bg-[#002035] rounded-xl p-6 border border-white/5 flex flex-col items-center justify-center gap-2">
      <div className="text-3xl font-bold text-[#FF7120]">{value}</div>
      <div className="text-sm text-[#FF7120] font-medium flex items-center gap-2">
        <Icon size={16} />
        {title}
      </div>
    </div>
  );
}

export default function ManageUsersPanel({
  searchTerm,
  setSearchTerm,
  usersLoading,
  usersError,
  userActionById,
  filteredUsers,
  allowedRoles,
  onAddUser,
  onEditUser,
  onToggleUserStatus,
  onDeleteUser,
}) {
  const users = Array.isArray(filteredUsers) ? filteredUsers : [];
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addForm, setAddForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'employee',
    department_id: '',
    date_hired: '',
  });
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    role: 'employee',
    department_id: '',
    date_hired: '',
  });
  const editCardRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const loadDepartments = async () => {
      setDepartmentsLoading(true);
      try {
        const data = await getDepartments();
        if (!cancelled) {
          setDepartments(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setDepartments([]);
        }
      } finally {
        if (!cancelled) {
          setDepartmentsLoading(false);
        }
      }
    };

    loadDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalUsers = users.length;
  const activeUsers = users.filter((user) => user.is_active).length;
  const suspendedUsers = totalUsers - activeUsers;
  const editLoading = !!(editingUser && userActionById?.[editingUser.id]);

  const openEditModal = (user) => {
    const departmentId = user.department_id ?? user.department ?? '';

    setEditError('');
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || 'employee',
      department_id: departmentId === '' || departmentId === null ? '' : String(departmentId),
      date_hired: user.date_hired || '',
    });

    requestAnimationFrame(() => {
      editCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const closeEditEditor = () => {
    if (editingUser && userActionById?.[editingUser.id]) {
      return;
    }

    setEditError('');
    setEditingUser(null);
  };

  const openAddEditor = () => {
    setAddError('');
    setShowAddForm(true);
  };

  const closeAddEditor = () => {
    if (addLoading) {
      return;
    }

    setAddError('');
    setShowAddForm(false);
    setAddForm({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'employee',
      department_id: '',
      date_hired: '',
    });
  };

  const handleAddSubmit = async (event) => {
    event.preventDefault();

    const firstName = addForm.first_name.trim();
    const lastName = addForm.last_name.trim();
    const email = addForm.email.trim().toLowerCase();
    const password = addForm.password;

    if (!firstName || !lastName || !email || !password) {
      setAddError('First name, last name, email, and password are required.');
      return;
    }

    if (password.length < 8) {
      setAddError('Password must be at least 8 characters.');
      return;
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      email,
      password,
      role: addForm.role,
      department_id: addForm.department_id === '' ? null : Number(addForm.department_id),
      date_hired: addForm.date_hired || null,
      is_active: true,
    };

    setAddLoading(true);
    const result = await onAddUser?.(payload);
    setAddLoading(false);

    if (result?.success) {
      closeAddEditor();
      return;
    }

    setAddError(result?.error || 'Failed to create account.');
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingUser) {
      return;
    }

    const firstName = editForm.first_name.trim();
    const lastName = editForm.last_name.trim();

    if (!firstName || !lastName) {
      setEditError('First name and last name are required.');
      return;
    }

    const payload = {
      first_name: firstName,
      last_name: lastName,
      role: editForm.role,
      department_id: editForm.department_id === '' ? null : Number(editForm.department_id),
      date_hired: editForm.date_hired || null,
    };

    const result = await onEditUser?.(editingUser.id, payload);
    if (result?.success) {
      closeEditEditor();
      return;
    }

    setEditError(result?.error || 'Failed to update user.');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Users" value={totalUsers} icon={Users} />
        <StatCard title="Active" value={activeUsers} icon={Users} />
        <StatCard title="Suspended" value={suspendedUsers} icon={Users} />
      </div>

      {/* Main Panel */}
      <div className="bg-[#00273C]/60 rounded-xl border border-white/10 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-white">Manage Users</h2>
            <p className="text-white/60 text-sm mt-1">Add, edit, suspend, or remove accounts.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#FF7120]" size={16} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#001f35] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] w-full sm:w-64"
              />
            </div>

            <button
              type="button"
              onClick={openAddEditor}
              className="flex items-center justify-center gap-2 bg-[#FF7120] hover:bg-[#ff853e] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
              <Plus size={16} />
              Add Account
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="mb-6 rounded-xl border border-emerald-400/20 bg-[#001f35] p-5">
            <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Add Account</h3>
                <p className="text-white/60 text-sm mt-1">
                  Create a new user account directly from Studio Head.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddEditor}
                disabled={addLoading}
                className="border border-white/10 text-white/70 hover:text-white hover:border-white/20 rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="block text-xs text-white/60 mb-2">First Name</span>
                  <input
                    type="text"
                    value={addForm.first_name}
                    onChange={(event) => setAddForm((prev) => ({ ...prev, first_name: event.target.value }))}
                    disabled={addLoading}
                    className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-white/60 mb-2">Last Name</span>
                  <input
                    type="text"
                    value={addForm.last_name}
                    onChange={(event) => setAddForm((prev) => ({ ...prev, last_name: event.target.value }))}
                    disabled={addLoading}
                    className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="block text-xs text-white/60 mb-2">Email</span>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(event) => setAddForm((prev) => ({ ...prev, email: event.target.value }))}
                    disabled={addLoading}
                    className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-white/60 mb-2">Temporary Password</span>
                  <input
                    type="password"
                    value={addForm.password}
                    onChange={(event) => setAddForm((prev) => ({ ...prev, password: event.target.value }))}
                    disabled={addLoading}
                    className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                    placeholder="At least 8 characters"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="block text-xs text-white/60 mb-2">Role</span>
                  <select
                    value={addForm.role}
                    onChange={(event) => setAddForm((prev) => ({ ...prev, role: event.target.value }))}
                    disabled={addLoading}
                    className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                  >
                    {(allowedRoles || []).map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-xs text-white/60 mb-2">
                    Department {departmentsLoading ? '(loading...)' : ''}
                  </span>
                  <select
                    value={addForm.department_id}
                    onChange={(event) => setAddForm((prev) => ({ ...prev, department_id: event.target.value }))}
                    disabled={addLoading || departmentsLoading}
                    className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block max-w-xs">
                <span className="block text-xs text-white/60 mb-2">Date Started Working</span>
                <input
                  type="date"
                  value={addForm.date_hired}
                  onChange={(event) => setAddForm((prev) => ({ ...prev, date_hired: event.target.value }))}
                  disabled={addLoading}
                  className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                />
              </label>

              {addError && (
                <div className="text-sm text-red-300">{addError}</div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeAddEditor}
                  disabled={addLoading}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addLoading}
                  className="rounded-lg bg-[#FF7120] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff853e] transition-colors disabled:opacity-50"
                >
                  {addLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        )}

        {editingUser && (
          <div
            ref={editCardRef}
            className="mb-6 rounded-xl border border-[#FF7120]/25 bg-[#001f35] p-5"
          >
            <div className="flex flex-col gap-3 mb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Edit User</h3>
                <p className="text-white/60 text-sm mt-1">
                  Update {editingUser.email}&apos;s name, role, department, and employment start date.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditEditor}
                disabled={editLoading}
                className="border border-white/10 text-white/70 hover:text-white hover:border-white/20 rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="block text-xs text-white/60 mb-2">First Name</span>
                  <input
                    type="text"
                    value={editForm.first_name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, first_name: event.target.value }))}
                    disabled={editLoading}
                    className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs text-white/60 mb-2">Last Name</span>
                  <input
                    type="text"
                    value={editForm.last_name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, last_name: event.target.value }))}
                    disabled={editLoading}
                    className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="block text-xs text-white/60 mb-2">Role</span>
                  <select
                    value={editForm.role}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, role: event.target.value }))}
                    disabled={editLoading}
                    className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                  >
                    {(allowedRoles || []).map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-xs text-white/60 mb-2">
                    Department {departmentsLoading ? '(loading...)' : ''}
                  </span>
                  <select
                    value={editForm.department_id}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, department_id: event.target.value }))}
                    disabled={editLoading || departmentsLoading}
                    className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                  >
                    <option value="">Unassigned</option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block max-w-xs">
                <span className="block text-xs text-white/60 mb-2">Date Started Working</span>
                <input
                  type="date"
                  value={editForm.date_hired}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, date_hired: event.target.value }))}
                  disabled={editLoading}
                  className="w-full rounded-lg border border-white/10 bg-[#00273C] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF7120] disabled:opacity-50"
                />
              </label>

              {editError && (
                <div className="text-sm text-red-300">{editError}</div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeEditEditor}
                  disabled={editLoading}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-lg bg-[#FF7120] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ff853e] transition-colors disabled:opacity-50"
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-2 manage-users-list">
          <style>
            {`
              .manage-users-list::-webkit-scrollbar {
                display: none;
              }
              .manage-users-list {
                scrollbar-width: none;
                -ms-overflow-style: none;
              }
            `}
          </style>

          {usersLoading && <div className="text-gray-400 text-sm py-4">Loading users...</div>}
          {usersError && <div className="text-red-400 text-sm py-4">{usersError}</div>}

          {!usersLoading && !usersError && users.length === 0 && (
            <div className="py-10">
              <EmptyState title="No users found" subtitle="Try searching by email or full name." />
            </div>
          )}

          {!usersLoading && !usersError && users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              loading={!!userActionById?.[user.id]}
              onEditUser={openEditModal}
              onToggleUserStatus={onToggleUserStatus}
              onDeleteUser={onDeleteUser}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
