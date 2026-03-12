import { useEffect, useRef, useState } from 'react';
import { styles, colors } from '../studioHeadStyles';
import UserRow from './UserRow';
import EmptyState from './EmptyState';
import { getDepartments } from '../services/studioHeadApi';

export default function ManageUsersPanel({
  searchTerm,
  setSearchTerm,
  usersLoading,
  usersError,
  userActionById,
  filteredUsers,
  allowedRoles,
  onEditUser,
  onToggleUserStatus,
  onDeleteUser,
}) {
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editError, setEditError] = useState('');
  const editCardRef = useRef(null);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    role: 'employee',
    department_id: '',
    date_hired: '',
  });

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

  const openEditModal = (user) => {
    setEditError('');
    setEditingUser(user);
    setEditForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || 'employee',
      department_id: user.department ?? '',
      date_hired: user.date_hired || '',
    });

    requestAnimationFrame(() => {
      editCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const closeEditEditor = () => {
    if (editingUser && userActionById?.[editingUser.id]) return;
    setEditError('');
    setEditingUser(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;

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

  const editLoading = !!(editingUser && userActionById?.[editingUser.id]);

  return (
    <div style={styles.panel}>
      <h2 style={{ margin: 0, fontSize: '20px' }}>Manage Users</h2>
      <p style={{ color: colors.textMuted, marginTop: '8px' }}>
        Add, edit, suspend, or remove accounts.
      </p>

      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <input
          type="text"
          placeholder="Search by name or email"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.input}
        />
        <button style={{ ...styles.buttonGhost, opacity: 0.6, cursor: 'not-allowed' }} disabled>
          Add Account
        </button>
      </div>

      {editingUser && (
        <div
          ref={editCardRef}
          style={{
            marginTop: '16px',
            padding: '18px',
            backgroundColor: '#002035',
            border: '1px solid rgba(255,113,32,0.24)',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Edit User</h3>
              <p style={{ color: colors.textMuted, marginTop: '6px', marginBottom: 0 }}>
                Update {editingUser.email}'s name, role, department, and employment start date.
              </p>
            </div>
            <button
              type="button"
              onClick={closeEditEditor}
              disabled={editLoading}
              style={{
                ...styles.buttonGhost,
                padding: '8px 12px',
                opacity: editLoading ? 0.6 : 1,
                cursor: editLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Close
            </button>
          </div>

          <form onSubmit={handleEditSubmit} style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>First Name</label>
                <input
                  type="text"
                  value={editForm.first_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, first_name: e.target.value }))}
                  style={styles.input}
                  disabled={editLoading}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Last Name</label>
                <input
                  type="text"
                  value={editForm.last_name}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, last_name: e.target.value }))}
                  style={styles.input}
                  disabled={editLoading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                  style={{ ...styles.input, width: '100%' }}
                  disabled={editLoading}
                >
                  {(allowedRoles || []).map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>
                  Department {departmentsLoading ? '(loading...)' : ''}
                </label>
                <select
                  value={editForm.department_id}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, department_id: e.target.value }))}
                  style={{ ...styles.input, width: '100%' }}
                  disabled={editLoading || departmentsLoading}
                >
                  <option value="">Unassigned</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ maxWidth: '240px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Date Started Working</label>
              <input
                type="date"
                value={editForm.date_hired}
                onChange={(e) => setEditForm((prev) => ({ ...prev, date_hired: e.target.value }))}
                style={styles.input}
                disabled={editLoading}
              />
            </div>

            {editError && (
              <div style={{ color: '#FCA5A5', fontSize: '13px' }}>{editError}</div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={closeEditEditor}
                disabled={editLoading}
                style={{
                  ...styles.buttonGhost,
                  opacity: editLoading ? 0.6 : 1,
                  cursor: editLoading ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                style={{
                  ...styles.buttonPrimary,
                  opacity: editLoading ? 0.75 : 1,
                  cursor: editLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {editLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginTop: '16px', display: 'grid', gap: '10px' }}>
        {usersLoading && <div style={{ color: colors.textMuted }}>Loading users...</div>}
        {usersError && <div style={{ color: '#FCA5A5' }}>{usersError}</div>}

        {!usersLoading && !usersError && filteredUsers.length === 0 && (
          <EmptyState title="No users found" subtitle="Try searching by email or full name." />
        )}

        {!usersLoading && !usersError && filteredUsers.map((u) => (
          <UserRow
            key={u.id}
            user={u}
            loading={!!userActionById?.[u.id]}
            onEditUser={openEditModal}
            onToggleUserStatus={onToggleUserStatus}
            onDeleteUser={onDeleteUser}
          />
        ))}
      </div>
    </div>
  );
}
