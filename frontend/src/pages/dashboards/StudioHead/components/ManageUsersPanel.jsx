import { styles, colors } from '../studioHeadStyles';
import UserRow from './UserRow';
import EmptyState from './EmptyState';

export default function ManageUsersPanel({
  searchTerm,
  setSearchTerm,
  usersLoading,
  usersError,
  userActionById,
  filteredUsers,
  onEditUser,
  onToggleUserStatus,
  onDeleteUser,
}) {
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
            onEditUser={onEditUser}
            onToggleUserStatus={onToggleUserStatus}
            onDeleteUser={onDeleteUser}
          />
        ))}
      </div>
    </div>
  );
}
