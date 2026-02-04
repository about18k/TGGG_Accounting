import React from 'react';
import { CheckCircle, AlertCircle, X, Loader2 } from 'lucide-react';

const StatusModal = ({ isOpen, onClose, type = 'success', title, message, autoClose = false, duration = 3000 }) => {
  React.useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, duration, onClose]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle size={48} color="#10B981" />,
    error: <AlertCircle size={48} color="#EF4444" />,
    info: <AlertCircle size={48} color="#3B82F6" />,
    loading: <Loader2 size={48} color="#FF7120" className="animate-spin" />
  };

  const colors = {
    success: {
      bg: 'rgba(16, 185, 129, 0.1)',
      border: '#10B981',
      title: '#10B981'
    },
    error: {
      bg: 'rgba(239, 68, 68, 0.1)',
      border: '#EF4444',
      title: '#EF4444'
    },
    info: {
      bg: 'rgba(59, 130, 246, 0.1)',
      border: '#3B82F6',
      title: '#3B82F6'
    },
    loading: {
      bg: 'rgba(255, 113, 32, 0.1)',
      border: '#FF7120',
      title: '#FF7120'
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={type !== 'loading' ? onClose : undefined}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Modal */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#002035',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '480px',
            width: '90%',
            border: `2px solid ${colors[type].border}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          {/* Close button - hide on loading */}
          {type !== 'loading' && (
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              <X size={18} />
            </button>
          )}

          {/* Icon */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: colors[type].bg,
              borderRadius: '50%',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: type === 'loading' ? 'pulse 2s ease-in-out infinite' : 'bounce 0.5s ease-out'
            }}>
              {icons[type]}
            </div>
          </div>

          {/* Title */}
          <h3 style={{
            color: colors[type].title,
            fontSize: '24px',
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: '12px',
            letterSpacing: '-0.5px'
          }}>
            {title}
          </h3>

          {/* Message */}
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '16px',
            textAlign: 'center',
            lineHeight: '1.6',
            marginBottom: '32px'
          }}>
            {message}
          </p>

          {/* Action button - hide on loading */}
          {type !== 'loading' && (
            <button
              onClick={onClose}
              style={{
                width: '100%',
                padding: '14px 24px',
                backgroundColor: colors[type].border,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: `0 4px 12px ${colors[type].bg}`
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = `0 8px 20px ${colors[type].bg}`;
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = `0 4px 12px ${colors[type].bg}`;
              }}
            >
              {type === 'success' ? 'Great!' : 'Got it'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
};

export default StatusModal;
