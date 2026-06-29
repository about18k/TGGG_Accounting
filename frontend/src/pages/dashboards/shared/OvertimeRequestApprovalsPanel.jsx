import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { CheckCircle2, Clock3, Search, UserRound, ArrowDownUp, RefreshCcw, FileText } from 'lucide-react';
import { approveOvertime, getAllOvertime, removeOvertime, setOvertimeActualHours } from '../../../services/overtimeService';
import { toast } from 'sonner';
import { getProfile } from '../../../services/profileService';
import { TableSkeleton } from '../../../components/SkeletonLoader';

const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatTime12 = (timeStr) => {
  if (!timeStr || timeStr === '-') return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) {
    return timeStr.trim();
  }
  try {
    const [hours, minutes] = timeStr.split(':');
    const hr = parseInt(hours, 10);
    const m = minutes.substring(0, 2);
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
    return `${displayHr}:${m} ${ampm}`;
  } catch (e) {
    return timeStr;
  }
};

const formatJobPosition = (value) => {
  if (!value) return '';
  return String(value).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
};

const REVIEWER_CONFIG = {
  accounting: {
    field: 'management_signature',
    label: 'Accounting',
    actionLabel: 'Confirm',
  },
};

const hasSignature = (value) => Boolean(String(value || '').trim());

const parseIsoDate = (value) => {
  if (!value) return null;
  const dt = new Date(`${value}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const isRequestExpired = (requestItem) => {
  if (!requestItem || hasSignature(requestItem.management_signature)) return false;

  if (requestItem.is_expired === true) return true;

  const validUntil = parseIsoDate(requestItem.valid_until);
  if (!validUntil) return false;

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return todayOnly > validUntil;
};

const toDisplayStatus = (requestItem) => {
  const managementApproved = hasSignature(requestItem.management_signature);

  if (managementApproved && requestItem.is_completed) {
    return {
      label: 'Completed',
      tone: 'bg-sky-500/15 text-sky-300 border-sky-400/30',
    };
  }

  if (managementApproved) {
    return {
      label: 'Approved',
      tone: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
    };
  }

  if (isRequestExpired(requestItem)) {
    return {
      label: 'Expired',
      tone: 'bg-rose-500/15 text-rose-300 border-rose-400/30',
    };
  }

  return {
    label: 'Pending Accounting Review',
    tone: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  };
};

/* ─── ActualHoursModal ─────────────────────────────────────────────────────── */
function ActualHoursModal({ req, onClose, onSaved }) {
  const [hours, setHours] = useState(req.actual_hours !== null && req.actual_hours !== undefined ? String(req.actual_hours) : '');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleSave = async () => {
    const parsed = parseFloat(hours);
    if (hours.trim() === '' || isNaN(parsed) || parsed < 0) {
      toast.error('Invalid Input', { description: 'Please enter a valid number of hours (0 or more).' });
      return;
    }
    setSaving(true);
    try {
      const updated = await setOvertimeActualHours(req.id, parsed);
      toast.success('Hours Saved', {
        description: `${parsed} hr(s) recorded for ${req.full_name || req.employee_name}.`,
      });
      onSaved(updated);
    } catch (err) {
      toast.error('Save Failed', {
        description: err.response?.data?.error || 'Could not save hours.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  const isEdit = req.actual_hours !== null && req.actual_hours !== undefined;

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: '1rem',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'linear-gradient(135deg, #00273C 0%, #001a2b 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 113, 32, 0.35)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,113,32,0.1)',
        maxWidth: '440px', width: '100%',
        padding: '1.75rem',
        animation: 'slideUp 0.18s ease-out',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{
                background: 'rgba(255,113,32,0.15)', color: '#FF7120',
                borderRadius: '6px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em'
              }}>
                {isEdit ? 'EDIT HOURS' : 'LOG HOURS'}
              </span>
            </div>
            <h3 style={{ color: '#e8eaed', margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>
              {req.full_name || req.employee_name}
            </h3>
            <p style={{ color: '#a0a4a8', fontSize: '0.82rem', margin: '0.15rem 0 0' }}>
              {req.department || ''}{req.department && req.date_completed ? ' · ' : ''}{req.date_completed || ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#a0a4a8', fontSize: '1.5rem', cursor: 'pointer', lineHeight: 1, padding: '0 0.25rem' }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Info row */}
        <div style={{
          background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
          padding: '0.75rem 1rem', marginBottom: '1.25rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div>
            <div style={{ color: '#a0a4a8', fontSize: '0.75rem', marginBottom: '2px' }}>Anticipated Hours</div>
            <div style={{ color: '#e8eaed', fontWeight: '700', fontSize: '1.1rem' }}>
              {req.anticipated_hours} <span style={{ fontSize: '0.78rem', color: '#a0a4a8', fontWeight: '400' }}>hrs</span>
            </div>
          </div>
          {isEdit && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#a0a4a8', fontSize: '0.75rem', marginBottom: '2px' }}>Previously Logged</div>
              <div style={{ color: '#FF7120', fontWeight: '700', fontSize: '1.1rem' }}>
                {req.actual_hours} <span style={{ fontSize: '0.78rem', color: '#a0a4a8', fontWeight: '400' }}>hrs</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#a0a4a8', fontSize: '0.82rem', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Actual Hours Worked
          </label>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. 2.5"
              style={{
                width: '100%', padding: '0.75rem 3rem 0.75rem 1rem',
                background: '#001a2b', color: '#e8eaed',
                border: '1px solid rgba(255,113,32,0.4)', borderRadius: '10px',
                fontSize: '1.2rem', fontWeight: '600', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#FF7120'; e.target.style.boxShadow = '0 0 0 3px rgba(255,113,32,0.15)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'rgba(255,113,32,0.4)'; e.target.style.boxShadow = 'none'; }}
            />
            <span style={{
              position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
              color: '#a0a4a8', fontSize: '0.85rem', fontWeight: '600', pointerEvents: 'none',
            }}>hrs</span>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '0.4rem 0 0', lineHeight: 1.4 }}>
            Enter the total overtime hours the employee actually worked. Decimals are allowed (e.g. 1.5 = 1 hr 30 min).
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '0.7rem',
              background: saving ? 'rgba(255,113,32,0.5)' : '#FF7120',
              color: 'white', border: 'none', borderRadius: '10px',
              fontWeight: '700', fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { if (!saving) e.target.style.background = '#ff8a3a'; }}
            onMouseLeave={(e) => { if (!saving) e.target.style.background = '#FF7120'; }}
          >
            {saving ? 'Saving…' : isEdit ? 'Update Hours' : 'Save Hours'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '0.7rem 1.25rem',
              background: 'transparent', color: '#a0a4a8',
              border: '1px solid rgba(255,113,32,0.3)', borderRadius: '10px',
              fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.target.style.color = '#e8eaed'; e.target.style.borderColor = 'rgba(255,113,32,0.6)'; }}
            onMouseLeave={(e) => { e.target.style.color = '#a0a4a8'; e.target.style.borderColor = 'rgba(255,113,32,0.3)'; }}
          >
            Cancel
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

export default function OvertimeRequestApprovalsPanel({ reviewerRole = 'accounting' }) {
  const reviewer = REVIEWER_CONFIG[reviewerRole] || REVIEWER_CONFIG.accounting;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [showSortPopover, setShowSortPopover] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [actualHoursTarget, setActualHoursTarget] = useState(null);

  const handleActualHoursSaved = (updatedReq) => {
    setRequests(prev => prev.map(r => r.id === updatedReq.id ? updatedReq : r));
    setActualHoursTarget(null);
  };

  const loadRequests = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllOvertime();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load OT requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    let result = [...requests];

    if (filterType === 'pending') {
      result = result.filter(r => !hasSignature(r[reviewer.field]));
    } else if (filterType === 'confirmed') {
      result = result.filter(r => hasSignature(r[reviewer.field]));
    }

    const term = query.trim().toLowerCase();
    if (term) {
      result = result.filter((requestItem) => {
        const employeeName = String(requestItem.full_name || requestItem.employee_name || '').toLowerCase();
        const department = String(requestItem.department || '').toLowerCase();
        const explanation = String(requestItem.explanation || '').toLowerCase();
        return employeeName.includes(term) || department.includes(term) || explanation.includes(term);
      });
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date_completed || a.created_at || 0);
      const dateB = new Date(b.date_completed || b.created_at || 0);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [requests, query, filterType, sortOrder, reviewer.field]);

  const stats = useMemo(() => {
    const total = filteredRequests.length;
    const approved = filteredRequests.filter((requestItem) => hasSignature(requestItem[reviewer.field])).length;
    const completed = filteredRequests.filter((requestItem) => Boolean(requestItem.is_completed)).length;
    const pendingMine = filteredRequests.filter((requestItem) => !hasSignature(requestItem[reviewer.field])).length;
    return { total, approved, completed, pendingMine };
  }, [filteredRequests, reviewer.field]);

  const selectedRequest = useMemo(
    () => filteredRequests.find((requestItem) => requestItem.id === selectedId) || null,
    [filteredRequests, selectedId]
  );

  const printReport = (req, accountingSignatureImage) => {
    if (!req) return;
    const periods = Array.isArray(req.periods) ? req.periods : [];

    const fixUrl = (url) => {
      if (!url) return '';
      if (url.startsWith('data:') || url.startsWith('http')) return url;
      return `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`;
    };

    // Use the explicit accounting signature image if provided, otherwise check existing signature URL/text
    let acctSigHtml = '<div style="height:60px"></div>';
    const sigToCheck = accountingSignatureImage || req.management_signature;
    if (sigToCheck) {
      const isImageUrl = sigToCheck.startsWith('data:') || sigToCheck.startsWith('http') || sigToCheck.startsWith('/media') || sigToCheck.startsWith('/');
      if (isImageUrl) {
        acctSigHtml = `<img src="${fixUrl(sigToCheck)}" alt="Accounting Signature" />`;
      } else {
        acctSigHtml = `<div style="font-size:9pt; font-weight:bold; height:60px; display:flex; align-items:center; justify-content:center;">${escapeHtml(sigToCheck)}</div>`;
      }
    }

    const periodRows = [];
    for (let i = 0; i < 5; i++) {
      const period = periods[i];
      periodRows.push(`
        <tr>
          <td class="period-cell">${period ? escapeHtml(period.start_date || '') : ''}</td>
          <td class="period-cell">${period ? escapeHtml(formatTime12(period.start_time || '')) : ''}</td>
          <td class="period-cell">${period ? escapeHtml(formatTime12(period.end_time || '')) : ''}</td>
        </tr>
      `);
    }

    const html = `
      <html>
        <head>
          <title>OT Request Form</title>
          <style>
            @page { size: A4; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; background: #fff; color: #000; padding: 0.5in; font-size: 10pt; line-height: 1.3; }
            .form-container { max-width: 800px; margin: 0 auto; border: 2px solid #000; padding: 0; }
            .header { display: flex; flex-direction: column; align-items: center; border-bottom: 2px solid #000; padding: 25px 20px; text-align: center; }
            .logo { max-width: 380px; height: auto; margin-bottom: 15px; display: block; }
            .form-title { font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; }
            .section { padding: 10px 15px; border-bottom: 1px solid #000; }
            .section:last-child { border-bottom: none; }
            .section-title { font-weight: bold; font-size: 10pt; margin-bottom: 8px; text-transform: uppercase; background: #f0f0f0; padding: 3px 8px; margin: -10px -15px 8px -15px; }
            .field-row { display: flex; margin-bottom: 7px; align-items: flex-start; }
            .field-group { flex: 1; display: flex; align-items: baseline; }
            .field-label { font-weight: bold; min-width: 130px; font-size: 9pt; }
            .field-value { flex: 1; border-bottom: 1px solid #000; min-height: 15px; padding: 1px 3px; font-size: 9pt; }
            .periods-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .periods-table th { background: #e0e0e0; border: 1px solid #000; padding: 5px 3px; font-size: 9pt; font-weight: bold; text-align: center; }
            .periods-table td.period-cell { border: 1px solid #000; padding: 5px 3px; height: 20px; text-align: center; font-size: 9pt; }
            .explanation-box { border: 1px solid #000; min-height: 50px; padding: 6px; margin-top: 5px; font-size: 9pt; line-height: 1.3; }
            .signature-section { display: flex; justify-content: space-between; margin-top: 25px; align-items: flex-end; }
            .signature-block { width: 220px; text-align: center; display: flex; flex-direction: column; align-items: center; }
            .signature-block1 { width: 220px; text-align: center; display: flex; flex-direction: column; align-items: center; }
            .signature-image { width: 100%; height: 50px; display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 2px; }
            .signature-image img { max-width: 140px; max-height: 48px; object-fit: contain; display: block; margin: 0 auto; }
            .employee-name { font-weight: bold; font-size: 10pt; margin: 2px 0; text-transform: uppercase; }
            .signature-label { font-size: 8pt; font-weight: bold; border-top: 1px solid #000; padding-top: 3px; display: block; width: 100%; }
            .approval-title { font-weight: bold; font-size: 10pt; margin-bottom: 8px; text-align: center; text-transform: uppercase; }
            .approval-signatures { display: flex; justify-content: space-around; }
            .approval-block { width: 40%; text-align: center; }
            .approval-note { font-weight: bold; margin-bottom: 5px; font-size: 9pt; }
            .total-hours { font-weight: bold; background: #f5f5f5; padding: 5px 10px; display: inline-block; border: 1px solid #000; margin-top: 5px; }
            @media print { body { padding: 0; } .form-container { border: 2px solid #000; } }
          </style>
        </head>
        <body>
          <div class="form-container">
            <div class="header">
              <img src="/formlogo2.webp" alt="Company Logo" class="logo" />
              <div><div class="form-title">OT Request Form</div></div>
            </div>
            <div class="section">
              <div class="section-title">Employee Information</div>
              <div class="field-row"><div class="field-group"><span class="field-label">Employee Name:</span><span class="field-value">${escapeHtml(req.employee_name || req.full_name || '')}</span></div></div>
              <div class="field-row">
                <div class="field-group" style="flex:1; margin-right:20px;"><span class="field-label">Job Position:</span><span class="field-value">${escapeHtml(formatJobPosition(req.job_position || ''))}</span></div>
                <div class="field-group" style="flex:1;"><span class="field-label">Department:</span><span class="field-value">${escapeHtml(req.department || '')}</span></div>
              </div>
              <div class="field-row"><div class="field-group"><span class="field-label">Date of Request:</span><span class="field-value">${escapeHtml(req.date_completed || '')}</span></div></div>
            </div>
            <div class="section">
              <div class="section-title">Overtime Schedule</div>
              <table class="periods-table">
                <thead><tr><th style="width:40%;">Date</th><th style="width:30%;">Start Time</th><th style="width:30%;">End Time</th></tr></thead>
                <tbody>${periodRows.join('')}</tbody>
              </table>
              <div style="margin-top:15px; text-align:right;">
                ${req.actual_hours != null 
                  ? `<span class="total-hours">Total Actual Hours: ${escapeHtml(req.actual_hours)} hours</span>`
                  : `<span class="total-hours">Total Anticipated Hours: ${escapeHtml(req.anticipated_hours || '0')} hours</span>`
                }
              </div>
            </div>
            <div class="section">
              <div class="section-title">Reason / Justification for Overtime</div>
              <div class="explanation-box">${escapeHtml(req.explanation || '')}</div>
            </div>
            <div class="section">
              <div class="section-title">Employee Acknowledgment</div>
              <div class="signature-section">
                <div class="signature-block">
                  <div class="signature-image">
                    ${req.employee_signature ? `<img src="${fixUrl(req.employee_signature)}" alt="Employee Signature" />` : '<div style="height:60px"></div>'}
                  </div>
                  <div class="employee-name">${escapeHtml(req.employee_name || req.full_name || '')}</div>
                  <div class="signature-label">Employee Signature</div>
                </div>
                <div class="signature-block1">
                  <div style="height:60px; display:flex; align-items:flex-end; justify-content:center; font-weight:bold; font-size:10pt; padding-bottom:2px;">
                    ${escapeHtml(req.date_completed || '')}
                  </div>
                  <div class="signature-label">Date Request Submitted</div>
                </div>
              </div>
            </div>
            <div class="section">
              <div class="approval-title">For Official Use Only - Approval</div>
              <div class="field-row" style="margin-bottom:15px;"><div class="field-group"><span class="field-label">Approval Date:</span><span class="field-value">${escapeHtml(req.approval_date || '')}</span><div class="approval-note" style="margin-left:15px;">Approved</div></div></div>
              <div class="approval-signatures">
                <div class="approval-block">
                  <div class="signature-image">
                    ${acctSigHtml}
                  </div>
                  <div class="employee-name">${escapeHtml(req.management_name || '')}</div>
                  <div class="signature-label">Accounting Signature</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return html;
  };

  const onConfirm = async (requestItem) => {
    if (!requestItem || hasSignature(requestItem[reviewer.field]) || isRequestExpired(requestItem)) {
      return;
    }

    // Open print window synchronously (before async) to avoid popup blocker
    const printWindow = window.open('', '_blank');

    setSavingId(requestItem.id);
    setError('');

    try {
      // Fetch current user's profile for the signature
      const profileData = await getProfile();
      if (!profileData.signature_image) {
        toast.error('Signature Missing', {
          description: 'You must set your signature in your Profile before confirming requests.'
        });
        if (printWindow) printWindow.close();
        setSavingId(null);
        return;
      }

      const payload = { 
        [reviewer.field]: profileData.signature_image,
        management_name: [profileData.first_name, profileData.last_name].filter(Boolean).join(' ') || profileData.full_name
      };

      const updated = await approveOvertime(requestItem.id, payload);
      setRequests((previous) => previous.map((item) => (item.id === requestItem.id ? updated : item)));
      setSelectedId((previous) => (previous === requestItem.id ? requestItem.id : previous));
      toast.success('Confirmed successfully');

      // Write the print form into the already-opened window with the actual signature image
      if (printWindow) {
        const html = printReport(updated, profileData.signature_image);
        printWindow.document.write(html);
        printWindow.document.close();
        // Wait for images to load before printing
        printWindow.onload = () => printWindow.print();
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to confirm OT request.');
      toast.error('Confirmation failed');
      if (printWindow) printWindow.close();
    } finally {
      setSavingId(null);
    }
  };

  const onRemove = async (requestItem) => {
    if (!requestItem || hasSignature(requestItem[reviewer.field])) {
      return;
    }

    setRemoveTarget(requestItem);
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;

    setSavingId(removeTarget.id);
    setError('');

    try {
      await removeOvertime(removeTarget.id);
      setRequests((previous) => previous.filter((item) => item.id !== removeTarget.id));
      setSelectedId((previous) => (previous === removeTarget.id ? null : previous));
      setRemoveTarget(null);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to remove OT request.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
        <div className="p-6 sm:p-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">Accounting Department</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">OT Requests</h1>
            <p className="mt-3 text-sm text-white/60 max-w-2xl">
              Accounting confirmation is required before overtime time-in/time-out is allowed.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadRequests}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition text-sm font-semibold"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total / Visible Requests */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Visible Requests</p>
              <p className="text-2xl font-bold mt-2 text-white">{stats.total}</p>
            </div>
            <FileText className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>

        {/* Approved by Accounting */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Approved by Accounting</p>
              <p className="text-2xl font-bold mt-2 text-white">{stats.approved}</p>
              <p className="text-xs text-white/45 mt-1">Completed: {stats.completed}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>

        {/* Needs Confirmation */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60 font-medium">Needs {reviewer.label} Confirmation</p>
              <p className="text-2xl font-bold mt-2 text-white">{stats.pendingMine}</p>
            </div>
            <Clock3 className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)] p-4 sm:p-6 space-y-4">

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex p-1 space-x-1 bg-[#00273C]/60 rounded-xl border border-white/10 w-full sm:w-auto">
           <button 
             onClick={() => setFilterType('all')}
             className={`px-4 py-2 text-sm font-medium rounded-lg transition ${filterType === 'all' ? 'bg-[#FF7120] text-white' : 'text-white/60 hover:text-white'}`}
           >
             All
           </button>
           <button 
             onClick={() => setFilterType('pending')}
             className={`px-4 py-2 text-sm font-medium rounded-lg transition ${filterType === 'pending' ? 'bg-[#FF7120] text-white' : 'text-white/60 hover:text-white'}`}
           >
             Pending
           </button>
           <button 
             onClick={() => setFilterType('confirmed')}
             className={`px-4 py-2 text-sm font-medium rounded-lg transition ${filterType === 'confirmed' ? 'bg-[#FF7120] text-white' : 'text-white/60 hover:text-white'}`}
           >
             Confirmed
           </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 relative">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/45" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 pl-10 pr-4 text-sm text-white placeholder:text-white/45 outline-none focus:border-[#FF7120]/70 focus:ring-2 focus:ring-[#FF7120]/25"
            />
          </div>
          
          <div>
            <button
              onClick={() => setShowSortPopover(!showSortPopover)}
              className="h-10 px-4 rounded-xl border border-white/15 bg-[#00273C]/60 text-white hover:border-[#FF7120]/50 transition flex items-center gap-2"
            >
              <ArrowDownUp className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Sort</span>
            </button>
            {showSortPopover && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowSortPopover(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-[#001f35] border border-white/10 rounded-xl shadow-xl z-20 py-2">
                  <button
                    onClick={() => { setSortOrder('newest'); setShowSortPopover(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition border-b border-white/5 ${sortOrder === 'newest' ? 'text-[#FF9A5A]' : 'text-white/80'}`}
                  >
                    Newest to Oldest
                  </button>
                  <button
                    onClick={() => { setSortOrder('oldest'); setShowSortPopover(false); }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition ${sortOrder === 'oldest' ? 'text-[#FF9A5A]' : 'text-white/80'}`}
                  >
                    Oldest to Newest
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{error}</div>
      ) : null}

      <div className="overflow-x-auto overflow-y-auto max-h-[500px] rounded-xl border border-white/10">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-[#00273C]/70 text-white/70 sticky top-0 z-10">
            <tr>
              <th className="text-left font-medium px-4 py-3">Employee</th>
              <th className="text-left font-medium px-4 py-3">Department</th>
              <th className="text-left font-medium px-4 py-3">Date</th>
              <th className="text-left font-medium px-4 py-3">Hours</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">{reviewer.label}</th>
              <th className="text-center font-medium px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <TableSkeleton />
                </td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/60">No OT requests found.</td>
              </tr>
            ) : (
              filteredRequests.map((requestItem) => {
                const status = toDisplayStatus(requestItem);
                const alreadyConfirmed = hasSignature(requestItem[reviewer.field]);
                const isExpired = isRequestExpired(requestItem);
                return (
                  <tr
                    key={requestItem.id}
                    className="border-t border-white/5 hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3 text-white">
                      <div className="font-medium">{requestItem.full_name || requestItem.employee_name || '-'}</div>
                      <div className="text-xs text-white/55">ID #{requestItem.id}</div>
                    </td>
                    <td className="px-4 py-3 text-white/80">{requestItem.department || '-'}</td>
                    <td className="px-4 py-3 text-white/80">{requestItem.date_completed || '-'}</td>
                    <td className="px-4 py-3 text-white/80">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-white/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
                          <span>Anticipated: <strong className="text-white/90 font-medium">{requestItem.anticipated_hours || '-'} hrs</strong></span>
                        </div>
                        {requestItem.actual_hours != null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF7120]" />
                            <span className="text-xs text-[#FF9A5A]">
                              Actual: <strong className="text-sm font-bold text-white">{requestItem.actual_hours} hrs</strong>
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-white/40 italic pl-3">No actual hours logged</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs ${status.tone}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {alreadyConfirmed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-300 text-xs">
                          <Clock3 className="h-3.5 w-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center justify-center gap-2">
                        {alreadyConfirmed ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              const printWindow = window.open('', '_blank');
                              if (printWindow) {
                                const html = printReport(requestItem, null);
                                printWindow.document.write(html);
                                printWindow.document.close();
                                printWindow.onload = () => printWindow.print();
                              }
                            }}
                            className="h-9 px-3 rounded-lg text-xs font-semibold transition border border-gray-400/40 text-gray-200 hover:bg-gray-500/15 inline-flex items-center justify-center leading-none"
                          >
                            Print
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={savingId === requestItem.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              onRemove(requestItem);
                            }}
                            className={`h-9 px-3 rounded-lg text-xs font-semibold transition border border-red-400/40 text-red-200 hover:bg-red-500/15 inline-flex items-center justify-center leading-none disabled:opacity-60 ${savingId === requestItem.id ? 'opacity-70 cursor-wait' : ''}`}
                          >
                            {savingId === requestItem.id ? 'Saving...' : 'Remove'}
                          </button>
                        )}
                        {alreadyConfirmed && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActualHoursTarget(requestItem);
                            }}
                            className="h-9 px-3 rounded-lg text-xs font-semibold transition bg-[#FF7120] text-white hover:bg-[#ff8a3a] inline-flex items-center justify-center leading-none"
                          >
                            {requestItem.actual_hours != null ? 'Edit Hours' : 'Log Hours'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(requestItem.id);
                          }}
                          className="h-9 px-3 rounded-lg text-xs font-semibold transition bg-[#FF7120] text-white hover:bg-[#ff8a3a] inline-flex items-center justify-center leading-none"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest ? ReactDOM.createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm overflow-y-auto scroll-smooth"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="flex items-start justify-center p-4 min-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white text-black w-full max-w-[900px] my-8 shadow-2xl rounded-xl flex flex-col">
              {/* Header bar */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2" />
                <div className="flex items-center gap-3">
                  {hasSignature(selectedRequest[reviewer.field]) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(null);
                        setActualHoursTarget(selectedRequest);
                      }}
                      className="inline-flex items-center justify-center h-10 px-4 bg-[#FF7120] text-white rounded-lg font-semibold hover:bg-[#ff8a3a] transition text-sm leading-none"
                    >
                      {selectedRequest.actual_hours != null ? 'Edit Actual Hours' : 'Log Actual Hours'}
                    </button>
                  )}
                  {!hasSignature(selectedRequest[reviewer.field]) && !isRequestExpired(selectedRequest) && (
                    <button
                      type="button"
                      disabled={savingId === selectedRequest.id}
                      onClick={() => onConfirm(selectedRequest)}
                      className={`inline-flex items-center gap-2 px-4 py-2 bg-[#FF7120] text-white rounded-lg font-semibold hover:brightness-95 transition ${savingId === selectedRequest.id ? 'opacity-70 cursor-wait' : ''}`}
                    >
                      {savingId === selectedRequest.id ? 'Confirming...' : 'Confirm'}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedId(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                  >
                    <span className="text-xl leading-none">×</span>
                  </button>
                </div>
              </div>

              {/* Form content */}
              <div className="px-10 pb-10 pt-0 flex-1 flex flex-col">
                {/* Company Logo */}
                <div className="flex flex-col items-center justify-center mb-0">
                  <img src="/formlogo2.webp" alt="Triple G Logo" className="h-24 w-auto object-contain mb-0" />
                  <h2 className="text-2xl font-black text-center border-b-2 border-black pb-0.5 tracking-[0.25em] uppercase">OT REQUEST FORM</h2>
                </div>

                {/* Employee Information */}
                <div className="mt-4 border-2 border-black">
                  <div className="bg-gray-100 px-3 py-1 font-bold text-[10pt] uppercase">Employee Information</div>
                  <div className="px-4 py-2 space-y-1.5 text-[9pt]">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold min-w-[130px]">Employee Name:</span>
                      <span className="flex-1 border-b border-black min-h-[15px] px-1">{selectedRequest.employee_name || selectedRequest.full_name || ''}</span>
                    </div>
                    <div className="flex items-baseline gap-4">
                      <div className="flex items-baseline gap-2 flex-1">
                        <span className="font-bold min-w-[130px]">Job Position:</span>
                        <span className="flex-1 border-b border-black min-h-[15px] px-1">{formatJobPosition(selectedRequest.job_position || '')}</span>
                      </div>
                      <div className="flex items-baseline gap-2 flex-1">
                        <span className="font-bold min-w-[100px]">Department:</span>
                        <span className="flex-1 border-b border-black min-h-[15px] px-1">{selectedRequest.department || ''}</span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold min-w-[130px]">Date of Request:</span>
                      <span className="flex-1 border-b border-black min-h-[15px] px-1">{selectedRequest.date_completed || ''}</span>
                    </div>
                  </div>
                </div>

                {/* Overtime Schedule */}
                <div className="border-x-2 border-b-2 border-black">
                  <div className="bg-gray-100 px-3 py-1 font-bold text-[10pt] uppercase">Overtime Schedule</div>
                  <div className="px-4 py-2">
                    <table className="w-full border-collapse text-[9pt]">
                      <thead>
                        <tr>
                          <th className="bg-gray-200 border border-black px-1 py-1 text-center font-bold w-[40%]">Date</th>
                          <th className="bg-gray-200 border border-black px-1 py-1 text-center font-bold w-[30%]">Start Time</th>
                          <th className="bg-gray-200 border border-black px-1 py-1 text-center font-bold w-[30%]">End Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const periods = Array.isArray(selectedRequest.periods) ? selectedRequest.periods : [];
                          const rows = [];
                          for (let i = 0; i < 5; i++) {
                            const p = periods[i];
                            rows.push(
                              <tr key={i}>
                                <td className="border border-black px-1 py-1 text-center h-[20px]">{p?.start_date || ''}</td>
                                <td className="border border-black px-1 py-1 text-center h-[20px]">{p?.start_time ? formatTime12(p.start_time) : ''}</td>
                                <td className="border border-black px-1 py-1 text-center h-[20px]">{p?.end_time ? formatTime12(p.end_time) : ''}</td>
                              </tr>
                            );
                          }
                          return rows;
                        })()}
                      </tbody>
                    </table>
                    <div className="mt-3 flex items-center justify-end">
                      {selectedRequest.actual_hours != null ? (
                        <span className="font-bold bg-gray-50 px-2.5 py-1 border border-black text-[9pt] inline-block">
                          Total Actual Hours: {selectedRequest.actual_hours} hours
                        </span>
                      ) : (
                        <span className="font-bold bg-gray-50 px-2.5 py-1 border border-black text-[9pt] inline-block">
                          Total Anticipated Hours: {selectedRequest.anticipated_hours || '0'} hours
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason / Justification */}
                <div className="border-x-2 border-b-2 border-black">
                  <div className="bg-gray-100 px-3 py-1 font-bold text-[10pt] uppercase">Reason / Justification for Overtime</div>
                  <div className="px-4 py-2">
                    <div className="border border-black min-h-[50px] p-1.5 text-[9pt] leading-snug whitespace-pre-wrap">
                      {selectedRequest.explanation || ''}
                    </div>
                  </div>
                </div>

                {/* Employee Acknowledgment */}
                <div className="border-x-2 border-b-2 border-black">
                  <div className="bg-gray-100 px-3 py-1 font-bold text-[10pt] uppercase">Employee Acknowledgment</div>
                  <div className="px-4 py-4">
                    <div className="flex justify-between items-end mt-4">
                      <div className="w-[220px] text-center flex flex-col items-center">
                        <div className="w-full h-[50px] flex items-center justify-center mb-1">
                          {selectedRequest.employee_signature ? (
                            <img src={(() => {
                              const url = selectedRequest.employee_signature;
                              if (!url) return '';
                              if (url.startsWith('data:') || url.startsWith('http')) return url;
                              return `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`;
                            })()} alt="Employee Signature" className="max-w-[140px] max-h-[48px] object-contain" />
                          ) : <div className="h-[50px]" />}
                        </div>
                        <div className="font-bold text-[10pt] uppercase mt-0.5">{selectedRequest.employee_name || selectedRequest.full_name || ''}</div>
                        <div className="text-[8pt] font-bold border-t border-black pt-0.5 w-full">Employee Signature</div>
                      </div>
                      <div className="w-[45%] text-center flex flex-col items-center">
                        <div className="h-[60px] flex items-end justify-center font-bold text-[10pt] pb-0.5">
                          {selectedRequest.date_completed || ''}
                        </div>
                        <div className="text-[8pt] font-bold border-t border-black pt-0.5">Date Request Submitted</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Official Approval */}
                <div className="border-x-2 border-b-2 border-black">
                  <div className="px-4 py-3">
                    <div className="font-bold text-[10pt] text-center uppercase mb-2">For Official Use Only - Approval</div>
                    <div className="flex items-baseline gap-2 mb-4 text-[9pt]">
                      <span className="font-bold min-w-[130px]">Approval Date:</span>
                      <span className="flex-1 border-b border-black min-h-[15px] px-1">{selectedRequest.approval_date || ''}</span>
                      <span className="font-bold ml-4">Approved</span>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-[220px] text-center flex flex-col items-center">
                        <div className="w-full h-[50px] flex items-center justify-center mb-1">
                          {(() => {
                            const sig = selectedRequest.management_signature;
                            if (!sig) return <div className="h-[50px]" />;
                            // Check if it's an actual image URL/data URI
                            const isImageUrl = sig.startsWith('data:') || sig.startsWith('http') || sig.startsWith('/media') || sig.startsWith('/');
                            if (isImageUrl) {
                              const url = sig.startsWith('data:') || sig.startsWith('http') ? sig : `http://localhost:8000${sig.startsWith('/') ? '' : '/'}${sig}`;
                              return <img src={url} alt="Accounting Signature" className="max-w-[140px] max-h-[48px] object-contain" />;
                            }
                            // It's just text (e.g., "Name (date)"), show as text
                            return <div className="text-[9pt] font-bold">{sig}</div>;
                          })()}
                        </div>
                        <div className="font-bold text-[10pt] uppercase mt-0.5">{selectedRequest.management_name || ''}</div>
                        <div className="text-[8pt] font-bold border-t border-black pt-0.5 w-full">Accounting Signature</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {actualHoursTarget && (
        <ActualHoursModal
          req={actualHoursTarget}
          onClose={() => setActualHoursTarget(null)}
          onSaved={handleActualHoursSaved}
        />
      )}

      {removeTarget ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => (savingId ? null : setRemoveTarget(null))}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#001f35] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Remove OT Request?</h3>
            <p className="mt-2 text-sm text-white/70">
              This will permanently remove the OT request for {removeTarget.full_name || removeTarget.employee_name || 'this employee'}.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={savingId === removeTarget.id}
                className="h-9 px-3 rounded-lg border border-white/20 text-white/80 hover:bg-white/5 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemove}
                disabled={savingId === removeTarget.id}
                className="h-9 px-3 rounded-lg border border-red-400/40 text-red-200 hover:bg-red-500/15 disabled:opacity-60"
              >
                {savingId === removeTarget.id ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}
