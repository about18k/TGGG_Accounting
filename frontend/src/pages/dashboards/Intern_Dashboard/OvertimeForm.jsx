import React, { useState, useEffect } from 'react';
import Alert from '../../../components/Alert.jsx';
import { CardSkeleton } from '../../../components/SkeletonLoader.jsx';
import { getProfile } from '../../../services/profileService';
import { submitOvertime } from '../../../services/overtimeService';

const getTodayDate = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
};

const TIME_SLOTS = [
  { value: '19:00', label: '7:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' }
];

const calculateTotalHoursFromPeriods = (periods) => {
  let totalMilliseconds = 0;
  periods.forEach(({ start_date, start_time, end_date, end_time }) => {
    if (!start_date || !start_time || !end_date || !end_time) {
      return;
    }
    const start = new Date(`${start_date}T${start_time}`);
    const end = new Date(`${end_date}T${end_time}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return;
    }
    const diff = end - start;
    if (diff > 0) {
      totalMilliseconds += diff;
    }
  });
  return totalMilliseconds / (1000 * 60 * 60);
};

const getInitialFormState = () => ({
  employee_name: '',
  job_position: '',
  date_completed: getTodayDate(),
  department: '',
  anticipated_hours: '',
  explanation: '',
  employee_signature: '',
  management_signature: '',
  approval_date: ''
});

function OvertimeForm({ token, activeTab, onTabChange, extraTabs = [] }) {
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState([
    {
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: ''
    }
  ]);
  const [form, setForm] = useState(getInitialFormState);

  useEffect(() => {
    const totalHours = calculateTotalHoursFromPeriods(periods);
    const hoursText = totalHours > 0 ? totalHours.toFixed(2) : '';
    setForm(prev => {
      if (prev.anticipated_hours === hoursText) {
        return prev;
      }
      return { ...prev, anticipated_hours: hoursText };
    });
  }, [periods]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await getProfile();
        setForm(prev => ({
          ...prev,
          employee_name: data.full_name || `${data.first_name} ${data.last_name}`.trim() || prev.employee_name,
          job_position: data.role_name || data.role || prev.job_position,
          employee_signature: data.signature_image || ''
        }));
      } catch (err) {
        console.error('Failed to load profile', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [token]);

  const updateFormField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updatePeriod = (index, field, value) => {
    setPeriods(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const validateForm = () => {
    if (!form.employee_name.trim()) {
      return 'Employee name is required.';
    }
    if (!form.job_position.trim()) {
      return 'Job position is required.';
    }
    if (!form.date_completed) {
      return 'Date of completion is required.';
    }
    if (!form.department) {
      return 'Please select a department.';
    }
    const todayIso = getTodayDate();
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const cutoffMinutes = 15 * 60;
    const hasSameDayPeriod = periods.some(period =>
      period.start_date === todayIso && period.end_date === todayIso
    );
    if (hasSameDayPeriod && nowMinutes >= cutoffMinutes) {
      return 'Same-day OT requests must be submitted before 3:00 PM.';
    }
    const hasAnyPeriod = periods.some(period => period.start_date || period.end_date || period.start_time || period.end_time);
    if (!hasAnyPeriod) {
      return 'Add at least one overtime period.';
    }

    // Check for duplicate periods (same start_date and end_date)
    const seenPeriodDates = new Set();
    for (let index = 0; index < periods.length; index += 1) {
      const period = periods[index];
      const hasEntry = period.start_date || period.end_date || period.start_time || period.end_time;
      if (!hasEntry) {
        continue;
      }
      const periodKey = `${period.start_date}|${period.end_date}`;
      if (seenPeriodDates.has(periodKey)) {
        return `Duplicate period found: Period ${index + 1} has the same start and end date as another period. Each period must have unique dates.`;
      }
      seenPeriodDates.add(periodKey);
    }

    for (let index = 0; index < periods.length; index += 1) {
      const period = periods[index];
      const hasEntry = period.start_date || period.end_date || period.start_time || period.end_time;
      if (!hasEntry) {
        continue;
      }
      if (!period.start_date || !period.end_date || !period.start_time || !period.end_time) {
        return `Period ${index + 1} is incomplete. Please fill all date and time fields.`;
      }

      const start = new Date(`${period.start_date}T${period.start_time}`);
      const end = new Date(`${period.end_date}T${period.end_time}`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return `Period ${index + 1} has an invalid date or time.`;
      }
      if (end <= start) {
        return `Period ${index + 1} must end after it starts.`;
      }
    }
    const totalHours = calculateTotalHoursFromPeriods(periods);
    if (totalHours <= 0) {
      return 'Anticipated overtime hours could not be calculated. Please review your periods.';
    }
    if (!form.explanation.trim()) {
      return 'Please provide an explanation for the overtime.';
    }
    if (!form.employee_signature) {
      return 'Please sign the form before submitting.';
    }
    return '';
  };

  const addRow = () => {
    setPeriods(prev => [...prev, { start_date: '', end_date: '', start_time: '', end_time: '' }]);
  };

  const removeRow = (index) => {
    setPeriods(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    const validationError = validateForm();

    if (validationError) {
      setAlert({ type: 'error', title: 'Validation error', message: validationError });
      return;
    }
    setSaving(true);
    try {
      if (!form.employee_signature) {
        setAlert({ type: 'error', title: 'No Signature', message: 'Please set your signature in your Profile settings.' });
        setSaving(false);
        return;
      }

      const payload = {
        ...form,
        periods: periods.filter(p => p.start_date || p.end_date || p.start_time || p.end_time)
      };
      await submitOvertime(payload);
      setAlert({ type: 'success', title: 'Submitted', message: 'OT request submitted successfully.' });
      setPeriods([{
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: ''
      }]);
      setForm(getInitialFormState());
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit OT request.';
      setAlert({ type: 'error', title: 'Error', message: msg });
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
    transition: 'all 0.2s'
  });

  const renderTabs = () => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={() => onTabChange && onTabChange('ot-form')}
        style={tabStyle(activeTab === 'ot-form')}
      >
        Request OT
      </button>
      <button
        type="button"
        onClick={() => onTabChange && onTabChange('ot-status')}
        style={tabStyle(activeTab === 'ot-status')}
      >
        OT Status
      </button>
      {extraTabs.includes('leave-form') && (
        <button
          type="button"
          onClick={() => onTabChange && onTabChange('leave-form')}
          style={tabStyle(activeTab === 'leave-form')}
        >
          Request Leave
        </button>
      )}
      {extraTabs.includes('leave-status') && (
        <button
          type="button"
          onClick={() => onTabChange && onTabChange('leave-status')}
          style={tabStyle(activeTab === 'leave-status')}
        >
          Leave Status
        </button>
      )}
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
        {loading ? (
          <CardSkeleton />
        ) : (
          <>
            <div className="overtime-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2>OT Request Form</h2>
                <p>Submit OT details for approval.</p>
              </div>
              {onTabChange && renderTabs()}
            </div>

            <form onSubmit={handleSubmit} className="overtime-form">
              <div className="overtime-grid">
                <div className="overtime-field">
                  <label>Employee Name</label>
                  <input
                    type="text"
                    value={form.employee_name}
                    onChange={(e) => updateFormField('employee_name', e.target.value)}
                    required
                  />
                </div>
                <div className="overtime-field">
                  <label>Job Position</label>
                  <input
                    type="text"
                    value={form.job_position}
                    onChange={(e) => updateFormField('job_position', e.target.value)}
                    required
                  />
                </div>
                <div className="overtime-field">
                  <label>Date Form Completed</label>
                  <input
                    type="date"
                    value={form.date_completed}
                    min={getTodayDate()}
                    max={getTodayDate()}
                    onChange={(e) => updateFormField('date_completed', e.target.value)}
                    required
                  />
                </div>
                <div className="overtime-field span-3">
                  <label>Department</label>
                  <select
                    value={form.department}
                    onChange={(e) => updateFormField('department', e.target.value)}
                    required
                  >
                    <option value="">Select department</option>
                    <option value="OJT Department">OJT Department</option>
                    <option value="Design Department">DesignDepartment</option>
                    <option value="Engineering Department">Engineering Department</option>
                    <option value="Accounting Department">Accounting Department</option>
                  </select>
                </div>
              </div>

              <div className="overtime-section">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {periods.map((p, idx) => (
                    <div key={`period-${idx}`} style={{
                      background: '#00273C',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxSizing: 'border-box',
                      width: '100%',
                      overflow: 'hidden'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ color: '#e8eaed', margin: 0, fontSize: '0.9rem' }}>Period {idx + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          disabled={periods.length <= 1}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 113, 32, 0.3)',
                            color: periods.length <= 1 ? '#6b7280' : '#FF7120',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            cursor: periods.length <= 1 ? 'not-allowed' : 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', color: '#a0a4a8', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Start Date</label>
                          <input
                            type="date"
                            value={p.start_date}
                            min={getTodayDate()}
                            onChange={(e) => {
                              updatePeriod(idx, 'start_date', e.target.value);
                              updatePeriod(idx, 'end_date', e.target.value);
                            }}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: '#001a2b',
                              color: '#e8eaed',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#a0a4a8', marginBottom: '0.4rem', fontSize: '0.85rem' }}>End Date</label>
                          <input
                            type="date"
                            value={p.end_date}
                            min={p.start_date || getTodayDate()}
                            onChange={(e) => updatePeriod(idx, 'end_date', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: '#001a2b',
                              color: '#e8eaed',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              fontSize: '0.9rem'
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#a0a4a8', marginBottom: '0.4rem', fontSize: '0.85rem' }}>Start Time</label>
                          <select
                            value={p.start_time}
                            onChange={(e) => updatePeriod(idx, 'start_time', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: '#001a2b',
                              color: '#e8eaed',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              fontSize: '0.9rem'
                            }}
                          >
                            <option value="">Select time</option>
                            {TIME_SLOTS.map(slot => (
                              <option key={`start-${slot.value}`} value={slot.value}>
                                {slot.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', color: '#a0a4a8', marginBottom: '0.4rem', fontSize: '0.85rem' }}>End Time</label>
                          <select
                            value={p.end_time}
                            onChange={(e) => updatePeriod(idx, 'end_time', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: '#001a2b',
                              color: '#e8eaed',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '8px',
                              fontSize: '0.9rem'
                            }}
                          >
                            <option value="">Select time</option>
                            {TIME_SLOTS.map(slot => (
                              <option key={`end-${slot.value}`} value={slot.value}>
                                {slot.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addRow}
                    style={{
                      width: '100%',
                      background: '#FF7120',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e66310';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FF7120';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Add Period
                  </button>
                </div>
              </div>

              <div className="overtime-grid hours-explanation">
                <div className="overtime-field">
                  <label>Anticipated Number of Overtime Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.anticipated_hours}
                    readOnly
                  />
                </div>
                <div className="overtime-field stretch">
                  <label>Please provide an explanation of the work that requires overtime</label>
                  <textarea
                    rows="4"
                    value={form.explanation}
                    onChange={(e) => updateFormField('explanation', e.target.value)}
                  />
                </div>
              </div>


              <div className="overtime-section">
                <h4>Approval</h4>
                <div className="overtime-grid">
                  <div className="overtime-field">
                    <label>Employee Signature</label>
                    {form.employee_signature ? (
                      <div style={{
                        background: '#FFFFFF',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 113, 32, 0.3)',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '80px'
                      }}>
                        <img
                          src={form.employee_signature}
                          alt="Your Signature"
                          style={{ maxWidth: '100%', maxHeight: '100px', objectFit: 'contain' }}
                        />
                      </div>
                    ) : (
                      <div style={{
                        background: '#001a2b',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 113, 32, 0.3)',
                        padding: '1rem',
                        textAlign: 'center',
                        color: '#FF7120',
                        fontSize: '0.85rem'
                      }}>
                        No signature found. Please upload one in your Profile settings.
                      </div>
                    )}
                  </div>
                  <div className="overtime-field">
                    <label>Accounting Signature</label>
                    <input
                      type="text"
                      placeholder="To be signed"
                      disabled
                    />
                  </div>
                  <div className="overtime-field">
                    <label>Date of Approval</label>
                    <input
                      type="text"
                      placeholder="Wait for approval"
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="overtime-instructions">
                <h4>Instructions</h4>
                <ul>
                  <li>No overtime will be paid unless this form has been completed prior to overtime. In emergencies, complete within the same week.</li>
                  <li>The employee must submit a signed timesheet for specific overtime work before payroll completion.</li>
                  <li>The form will be reviewed by the Accounting department.</li>
                </ul>
              </div>

              <div className="overtime-submit">
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!saving) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 113, 32, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!saving) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {saving ? 'Submitting...' : 'Submit OT Request'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
}

export default OvertimeForm;
