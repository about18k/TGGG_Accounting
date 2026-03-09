import { styles } from '../studioHeadStyles';

export default function UserRow({
  user,
  loading = false,
  onEditUser,
  onToggleUserStatus,
  onDeleteUser,
}) {
  const handleEdit = () => {
    const nextFirst = window.prompt('Edit first name', user.first_name || '');
    if (nextFirst === null) return;

    const nextLast = window.prompt('Edit last name', user.last_name || '');
    if (nextLast === null) return;

    onEditUser?.(user.id, {
      first_name: nextFirst.trim(),
      last_name: nextLast.trim(),
    });
  };

  const handleToggleStatus = () => {
    onToggleUserStatus?.(user.id, !user.is_active);
  };

  const handleDelete = () => {
    const confirmed = window.confirm(`Delete user ${user.email}? This cannot be undone.`);
    if (!confirmed) return;
    onDeleteUser?.(user.id);
  };

  return (
    <div
      style={{
        ...styles.panel2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user.profile_picture ? (
          <img
            src={user.profile_picture}
            alt={user.first_name || user.email}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '1px solid rgba(6, 182, 212, 0.3)',
            }}
          />
        ) : (
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(8, 145, 178, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22d3ee',
              fontWeight: 700,
              fontSize: '14px',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              flexShrink: 0,
            }}
          >
            {user.first_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 700 }}>
            {user.first_name} {user.last_name}
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '12px' }}>{user.email}</div>
          <div style={{ color: '#9CA3AF', fontSize: '12px' }}>
            {user.role_name || user.role || 'No role'} • {user.department_name || 'No department'} •{' '}
            {user.is_active ? 'Active' : 'Suspended'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleEdit}
          disabled={loading}
          style={{
            padding: '6px 10px',
            backgroundColor: '#1f3b53',
            border: '1px solid #2c4d66',
            color: 'white',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Edit
        </button>

        <button
          onClick={handleToggleStatus}
          disabled={loading}
          style={{
            padding: '6px 10px',
            backgroundColor: user.is_active ? '#263a34' : '#1f3b53',
            border: user.is_active ? '1px solid #2f5c4f' : '1px solid #2c4d66',
            color: user.is_active ? '#d1fae5' : '#dbeafe',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {user.is_active ? 'Suspend' : 'Activate'}
        </button>

        <button
          onClick={handleDelete}
          disabled={loading}
          style={{
            padding: '6px 10px',
            backgroundColor: '#3b1f24',
            border: '1px solid #5f2a33',
            color: '#fecaca',
            borderRadius: '8px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
