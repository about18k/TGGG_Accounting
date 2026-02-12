export default function MessageBanner({ message, onClose }) {
  if (!message) return null;

  const isFail = message.toLowerCase().includes('fail');

  return (
    <div
      style={{
        padding: '12px 16px',
        marginBottom: '16px',
        backgroundColor: isFail ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
        border: `1px solid ${isFail ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
        borderRadius: '10px',
        color: isFail ? '#EF4444' : '#10B981',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '14px',
        }}
      >
        ✕
      </button>
    </div>
  );
}
