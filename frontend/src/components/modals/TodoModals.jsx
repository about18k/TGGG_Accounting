import React from 'react';

export const CreateGroupModal = ({ show, onClose, onCreate, groupName, setGroupName, groupDesc, setGroupDesc }) => {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#001824', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '400px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', color: '#e8eaed' }}>Create New Group</h3>
        <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name..." style={{ width: '100%', padding: '0.75rem', background: '#00273C', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem' }} />
        <textarea value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="Description (optional)..." rows={3} style={{ width: '100%', padding: '0.75rem', background: '#00273C', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '1rem', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={onCreate} style={{ flex: 1, padding: '0.75rem', background: '#FF7120', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>Create</button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export const ManageGroupsModal = ({ show, onClose, groups, isCoordinator, userProfile, availableUsers, onDeleteGroup, onRemoveMember, onAddMember, Icon }) => {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#001824', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflow: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', color: '#e8eaed' }}>Manage Groups</h3>
        {groups.map(group => (
          <div key={group.id} style={{ background: '#00273C', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h4 style={{ margin: 0, color: '#e8eaed' }}>{group.name}</h4>
                <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.85rem' }}>Leader: {group.leader?.full_name || 'None'}</p>
              </div>
              {(isCoordinator || group.leader_id === userProfile?.id) && (
                <button onClick={() => onDeleteGroup(group.id)} style={{ background: 'rgba(255, 80, 80, 0.1)', border: '1px solid rgba(255, 80, 80, 0.3)', color: '#ff5050', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Icon name="trash" size={14} color="#ff5050" strokeWidth={2} />Delete Group</span>
                </button>
              )}
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ color: '#e8eaed', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Members ({group.members?.length || 0}):</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {group.members?.map(member => (
                  <span key={member.user?.id} style={{ background: 'rgba(255, 113, 32, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.8rem', color: '#e8eaed', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {member.user?.full_name}
                    {(isCoordinator || group.leader_id === userProfile?.id) && (
                      <button onClick={() => onRemoveMember(group.id, member.user?.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 0, fontSize: '0.9rem' }}>×</button>
                    )}
                  </span>
                ))}
                {(!group.members || group.members.length === 0) && <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>No members yet</span>}
              </div>
            </div>
            {(isCoordinator || group.leader_id === userProfile?.id) && availableUsers.length > 0 && (
              <select onChange={(e) => { if (e.target.value) { onAddMember(group.id, e.target.value); e.target.value = ''; } }} style={{ width: '100%', padding: '0.5rem', background: '#001824', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <option value="">Add member...</option>
                {availableUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            )}
          </div>
        ))}
        <button onClick={onClose} style={{ width: '100%', padding: '0.75rem', background: 'transparent', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', marginTop: '0.5rem' }}>Close</button>
      </div>
    </div>
  );
};

export const ManageLeadersModal = ({ show, onClose, interns, onToggleLeader, Icon }) => {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#001824', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '500px', maxHeight: '80vh', overflow: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <h3 style={{ margin: '0 0 1.5rem 0', color: '#e8eaed', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Icon name="crown" size={16} color="#ffc107" strokeWidth={2} />Manage Leaders</h3>
        <p style={{ color: '#6b7280', marginBottom: '1rem', fontSize: '0.85rem' }}>Assign or remove leader status from interns. Leaders can create groups and assign tasks.</p>
        {interns.map(intern => (
          <div key={intern.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#00273C', borderRadius: '8px', marginBottom: '0.5rem', border: `1px solid ${intern.is_leader ? 'rgba(255, 193, 7, 0.3)' : 'rgba(255, 255, 255, 0.1)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {intern.is_leader && <Icon name="crown" size={14} color="#ffc107" strokeWidth={2} />}
              <span style={{ color: '#e8eaed' }}>{intern.full_name}</span>
            </div>
            <button onClick={() => onToggleLeader(intern.id, intern.is_leader)} style={{ padding: '0.5rem 1rem', background: intern.is_leader ? 'transparent' : '#FF7120', color: intern.is_leader ? '#ff6b6b' : 'white', border: intern.is_leader ? '1px solid #ff6b6b' : 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>
              {intern.is_leader ? 'Remove Leader' : 'Make Leader'}
            </button>
          </div>
        ))}
        {interns.length === 0 && <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>No interns found.</p>}
        <button onClick={onClose} style={{ width: '100%', padding: '0.75rem', background: 'transparent', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', marginTop: '1rem' }}>Close</button>
      </div>
    </div>
  );
};

export const DeleteConfirmModal = ({ show, onClose, onConfirm, message = 'Are you sure you want to delete this?', title = 'Confirm Delete' }) => {
  if (!show) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
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
            border: '2px solid #FF7120',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative',
            animation: 'slideUp 0.3s ease-out'
          }}
        >
          {/* Close button */}
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
              color: 'white',
              fontSize: '18px',
              lineHeight: 1
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>

          {/* Icon */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            <div style={{
              backgroundColor: 'rgba(255, 113, 32, 0.1)',
              borderRadius: '50%',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'bounce 0.5s ease-out'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#FF7120" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h3 style={{
            color: '#FF7120',
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

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onConfirm}
              style={{
                flex: 1,
                padding: '14px 24px',
                backgroundColor: '#FF7120',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(255, 113, 32, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(255, 113, 32, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.3)';
              }}
            >
              Delete
            </button>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </>
  );
};

export const ConfirmTaskModal = ({ show, onClose, onConfirm, todo, task, setTask, description, setDescription, startDate, setStartDate, deadline, setDeadline, assignee, setAssignee, members, Icon }) => {
  if (!show || !todo) return null;

  const handleConfirm = () => {
    if (deadline && startDate && deadline < startDate) {
      alert('Deadline cannot be earlier than start date.');
      return;
    }
    onConfirm();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#001824', borderRadius: '16px', padding: '2rem', maxWidth: '500px', width: '100%', border: '1px solid rgba(255, 113, 32, 0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e8eaed' }}><Icon name="check" size={24} color="#FF7120" strokeWidth={2} />Confirm Task</h2>
        {todo.suggester && <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1rem' }}>Suggested by: <span style={{ color: '#FF7120' }}>{todo.suggester.full_name}</span></p>}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e8eaed', fontSize: '0.85rem' }}>Task Title</label>
          <textarea value={task} onChange={(e) => setTask(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#00273C', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', fontSize: '0.9rem', minHeight: '60px', resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e8eaed', fontSize: '0.85rem' }}>Description (Optional)</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add task description..." style={{ width: '100%', padding: '0.75rem', background: '#00273C', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e8eaed', fontSize: '0.85rem' }}>Start Date</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#00273C', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', fontSize: '0.9rem', colorScheme: 'dark', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e8eaed', fontSize: '0.85rem' }}>Deadline</label>
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#00273C', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', fontSize: '0.9rem', colorScheme: 'dark', boxSizing: 'border-box' }} />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#e8eaed', fontSize: '0.85rem' }}>Assign To</label>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} style={{ width: '100%', padding: '0.75rem', background: '#00273C', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px', fontSize: '0.9rem' }}>
            <option value="">-- Select Assignee (Optional) --</option>
            {members.map(member => <option key={member.id} value={member.id}>{member.full_name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleConfirm} style={{ flex: 1, padding: '0.75rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>Confirm & Assign</button>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: '#e8eaed', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
