import { styles } from '../studioHeadStyles';

export default function UserRow({ user }) {
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

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          style={{
            padding: '6px 10px',
            backgroundColor: '#1f3b53',
            border: '1px solid #2c4d66',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Edit
        </button>

        <button
          style={{
            padding: '6px 10px',
            backgroundColor: '#263a34',
            border: '1px solid #2f5c4f',
            color: '#d1fae5',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Suspend
        </button>

        <button
          style={{
            padding: '6px 10px',
            backgroundColor: '#3b1f24',
            border: '1px solid #5f2a33',
            color: '#fecaca',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
