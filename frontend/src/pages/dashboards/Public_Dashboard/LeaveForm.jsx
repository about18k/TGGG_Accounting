import React, { useState } from 'react';
import Alert from '../../../components/Alert.jsx';
import { submitLeave } from '../../../services/leaveService';

const LEAVE_TYPES = [
  { value: 'sick', label: 'Sick Leave' },
  { value: 'vacation', label: 'Vacation Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'bereavement', label: 'Bereavement Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
];

const getToday = () => new Date().toISOString().split('T')[0];

const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  background: '#001a2b',
  color: '#e8eaed',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  fontSize: '0.9rem',
};

export default function LeaveForm({ token, activeTab, onTabChange, extraTabs = [] }) {
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [form, setForm] = useState({
    leave_type: '',
    start_date: getToday(),
    end_date: getToday(),
    reason: '',
  });

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!form.leave_type) {
      setAlert({ type: 'error', title: 'Validation error', message: 'Please select leave type.' });
      return;
    }
    if (!form.start_date || !form.end_date) {
      setAlert({ type: 'error', title: 'Validation error', message: 'Start and end dates are required.' });
      return;
    }
    if (form.end_date < form.start_date) {
      setAlert({ type: 'error', title: 'Validation error', message: 'End date cannot be before start date.' });
      return;
    }
    if (!form.reason.trim()) {
      setAlert({ type: 'error', title: 'Validation error', message: 'Please provide a reason.' });
      return;
    }

    setSaving(true);
    try {
      await submitLeave({
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim(),
      });

      setAlert({
        type: 'success',
        title: 'Leave submitted',
        message: 'Your leave request has been submitted for approval.',
      });
      setForm({
        leave_type: '',
        start_date: getToday(),
        end_date: getToday(),
        reason: '',
      });
    } catch (err) {
      setAlert({
        type: 'error',
        title: 'Submit failed',
        message: err.response?.data?.error || 'Failed to submit leave request.',
      });
    } finally {
      setSaving(false);
    }
  };

  const tabStyle = (isActive) => ({
    padding: '0.5rem 1rem',
    background: isActive ? '#FF7120' : 'transparent',
    color: isActive ? 'white' : '#9ca3af',
    border: `1px solid ${isActive ? '#FF7120' : 'rgba(255, 113, 32, 0.3)'}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  });

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      {extraTabs.includes('ot-form') && (
        <button
          type="button"
          onClick={() => onTabChange && onTabChange('ot-form')}
          style={tabStyle(activeTab === 'ot-form')}
        >
          Request OT
        </button>
      )}
      {extraTabs.includes('ot-status') && (
        <button
          type="button"
          onClick={() => onTabChange && onTabChange('ot-status')}
          style={tabStyle(activeTab === 'ot-status')}
        >
          OT Status
        </button>
      )}
      <button
        type="button"
        onClick={() => onTabChange && onTabChange('leave-form')}
        style={tabStyle(activeTab === 'leave-form')}
      >
        Request Leave
      </button>
      <button
        type="button"
        onClick={() => onTabChange && onTabChange('leave-status')}
        style={tabStyle(activeTab === 'leave-status')}
      >
        Leave Status
      </button>
    </div>
  );

  return (
    <>
      {alert && (
        <Alert
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <div className="overtime-card" style={{ boxSizing: 'border-box', maxWidth: '100%', width: '100%', overflow: 'hidden' }}>
        <div className="overtime-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>Leave Request Form</h2>
            <p>Submit leave details for review and approval.</p>
          </div>
          {onTabChange && renderTabs()}
        </div>

        <form onSubmit={handleSubmit} className="overtime-form">
          <div className="overtime-grid" style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <div className="overtime-field" style={{ gridColumn: '1 / -1' }}>
              <label>Leave Type</label>
              <select
                value={form.leave_type}
                onChange={(e) => updateField('leave_type', e.target.value)}
                style={inputStyle}
              >
                <option value="">Select leave type</option>
                {LEAVE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="overtime-field">
              <label>Start Date</label>
              <input
                type="date"
                value={form.start_date}
                min={getToday()}
                onChange={(e) => updateField('start_date', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div className="overtime-field">
              <label>End Date</label>
              <input
                type="date"
                value={form.end_date}
                min={form.start_date || getToday()}
                onChange={(e) => updateField('end_date', e.target.value)}
                style={inputStyle}
              />
            </div>

            <div className="overtime-field" style={{ gridColumn: '1 / -1' }}>
              <label>Reason</label>
              <textarea
                rows={5}
                value={form.reason}
                onChange={(e) => updateField('reason', e.target.value)}
                placeholder="Please describe the reason for your leave request."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
          </div>

          <div className="overtime-submit">
            <button type="submit" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Leave Request'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
