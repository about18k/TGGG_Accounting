import { styles } from '../studioHeadStyles';

export default function PendingUserCard({ user, role, onChangeRole, allowedRoles, onApprove, loading }) {
  return (
    <div style={{ ...styles.panel2, border: '1px solid rgba(255,113,32,0.2)' }}>
      <p style={{ margin: 0, fontWeight: 700 }}>
        {user.first_name} {user.last_name}{' '}
        <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({user.email})</span>
      </p>

      <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>
        Joined: {user.created_at ? new Date(user.created_at).toLocaleString() : '—'}
      </p>

      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
        <select
          value={role}
          onChange={(e) => onChangeRole(e.target.value)}
          style={{
            padding: '8px',
            backgroundColor: '#1a2332',
            border: '1px solid #47545E',
            borderRadius: '8px',
            color: 'white',
          }}
        >
          {allowedRoles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onApprove}
        disabled={loading}
        style={{
          marginTop: '12px',
          width: '100%',
          padding: '10px',
          backgroundColor: '#FF7120',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          fontWeight: 800,
        }}
      >
        {loading ? 'Approving...' : 'Approve & Send Email'}
      </button>
    </div>
  );
}
