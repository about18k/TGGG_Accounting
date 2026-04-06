import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Search, UserRound } from 'lucide-react';
import { approveOvertime, getAllOvertime, removeOvertime } from '../../../services/overtimeService';
import { toast } from 'sonner';
import { getProfile } from '../../../services/profileService';

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

export default function OvertimeRequestApprovalsPanel({ reviewerRole = 'accounting' }) {
  const reviewer = REVIEWER_CONFIG[reviewerRole] || REVIEWER_CONFIG.accounting;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);

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
    const term = query.trim().toLowerCase();
    if (!term) return requests;

    return requests.filter((requestItem) => {
      const employeeName = String(requestItem.full_name || requestItem.employee_name || '').toLowerCase();
      const department = String(requestItem.department || '').toLowerCase();
      const explanation = String(requestItem.explanation || '').toLowerCase();
      return employeeName.includes(term) || department.includes(term) || explanation.includes(term);
    });
  }, [requests, query]);

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

  const onConfirm = async (requestItem) => {
    if (!requestItem || hasSignature(requestItem[reviewer.field]) || isRequestExpired(requestItem)) {
      return;
    }

    setSavingId(requestItem.id);
    setError('');

    try {
      // Fetch current user's profile for the signature
      const profileData = await getProfile();
      if (!profileData.signature_image) {
        toast.error('Signature Missing', {
          description: 'You must set your signature in your Profile before confirming requests.'
        });
        setSavingId(null);
        return;
      }

      const payload = { [reviewer.field]: profileData.signature_image };

      const updated = await approveOvertime(requestItem.id, payload);
      setRequests((previous) => previous.map((item) => (item.id === requestItem.id ? updated : item)));
      setSelectedId((previous) => (previous === requestItem.id ? requestItem.id : previous));
      toast.success('Confirmed successfully');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to confirm OT request.');
      toast.error('Confirmation failed');
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
    <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)] p-4 sm:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">OT Requests</h2>
          <p className="text-sm text-white/60 mt-1">
            Accounting confirmation is required before overtime time-in/time-out is allowed.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRequests}
          className="h-10 px-4 rounded-lg border border-[#FF7120]/40 text-[#FF9A5A] hover:bg-[#FF7120]/10 transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-[#00273C]/60 p-4">
          <p className="text-xs uppercase tracking-wide text-white/40">Visible Requests</p>
          <p className="text-2xl font-semibold text-white mt-1">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-200/70">Approved by Accounting</p>
          <p className="text-2xl font-semibold text-emerald-200 mt-1">{stats.approved}</p>
          <p className="text-xs text-emerald-200/70 mt-1">Completed: {stats.completed}</p>
        </div>
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-200/70">Needs {reviewer.label} Confirmation</p>
          <p className="text-2xl font-semibold text-amber-200 mt-1">{stats.pendingMine}</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/45" />
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search employee, department, or explanation"
          className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 pl-10 pr-4 text-sm text-white placeholder:text-white/45 outline-none focus:border-[#FF7120]/70 focus:ring-2 focus:ring-[#FF7120]/25"
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 text-red-200 px-4 py-3 text-sm">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-[#00273C]/70 text-white/70">
            <tr>
              <th className="text-left font-medium px-4 py-3">Employee</th>
              <th className="text-left font-medium px-4 py-3">Department</th>
              <th className="text-left font-medium px-4 py-3">Date</th>
              <th className="text-left font-medium px-4 py-3">Hours</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">{reviewer.label}</th>
              <th className="text-right font-medium px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-white/60">Loading requests...</td>
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
                    className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer"
                    onClick={() => setSelectedId(requestItem.id)}
                  >
                    <td className="px-4 py-3 text-white">
                      <div className="font-medium">{requestItem.full_name || requestItem.employee_name || '-'}</div>
                      <div className="text-xs text-white/55">ID #{requestItem.id}</div>
                    </td>
                    <td className="px-4 py-3 text-white/80">{requestItem.department || '-'}</td>
                    <td className="px-4 py-3 text-white/80">{requestItem.date_completed || '-'}</td>
                    <td className="px-4 py-3 text-white/80">{requestItem.anticipated_hours || '-'}</td>
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
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={alreadyConfirmed || savingId === requestItem.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemove(requestItem);
                          }}
                          className={`h-9 px-3 rounded-lg text-xs font-semibold transition ${alreadyConfirmed
                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                            : 'border border-red-400/40 text-red-200 hover:bg-red-500/15'} ${savingId === requestItem.id ? 'opacity-70 cursor-wait' : ''}`}
                        >
                          {savingId === requestItem.id ? 'Saving...' : 'Remove'}
                        </button>
                        <button
                          type="button"
                          disabled={alreadyConfirmed || isExpired || savingId === requestItem.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            onConfirm(requestItem);
                          }}
                          className={`h-9 px-3 rounded-lg text-xs font-semibold transition ${(alreadyConfirmed || isExpired)
                            ? 'bg-white/10 text-white/40 cursor-not-allowed'
                            : 'bg-[#FF7120] text-white hover:bg-[#ff8a3a]'} ${savingId === requestItem.id ? 'opacity-70 cursor-wait' : ''}`}
                          title={isExpired ? 'Expired OT requests cannot be confirmed.' : undefined}
                        >
                          {savingId === requestItem.id ? 'Saving...' : alreadyConfirmed ? 'Confirmed' : reviewer.actionLabel}
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

      {selectedRequest ? (
        <div className="rounded-xl border border-white/10 bg-[#00273C]/60 p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-white font-semibold">Request Details</h3>
              <p className="text-xs text-white/60 mt-1">{selectedRequest.full_name || selectedRequest.employee_name || '-'} | {selectedRequest.department || '-'}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="h-8 px-3 rounded-lg border border-white/15 text-white/70 hover:text-white hover:bg-white/5 transition"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-white/10 bg-[#001f35]/60 p-3">
              <p className="text-xs text-white/45 uppercase tracking-wide">Explanation</p>
              <p className="text-sm text-white/85 mt-2 whitespace-pre-wrap">{selectedRequest.explanation || '-'}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#001f35]/60 p-3">
              <p className="text-xs text-white/45 uppercase tracking-wide">Approvals</p>
              <div className="mt-2 space-y-2 text-sm">
                <p className="text-white/85"><span className="text-white/55">Accounting:</span> {hasSignature(selectedRequest.management_signature) ? 'Confirmed' : 'Pending'}</p>
                <p className="text-white/85"><span className="text-white/55">OT Attendance:</span> {selectedRequest.is_completed ? 'Completed' : 'Not completed yet'}</p>
                <p className="text-white/85"><span className="text-white/55">Approval Date:</span> {selectedRequest.approval_date || '-'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#001f35]/60 p-3">
            <p className="text-xs text-white/45 uppercase tracking-wide">Overtime Periods</p>
            {Array.isArray(selectedRequest.periods) && selectedRequest.periods.length > 0 ? (
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="text-white/60">
                    <tr>
                      <th className="text-left font-medium py-2 pr-4">Start Date</th>
                      <th className="text-left font-medium py-2 pr-4">Start Time</th>
                      <th className="text-left font-medium py-2 pr-4">End Date</th>
                      <th className="text-left font-medium py-2">End Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRequest.periods.map((period, index) => (
                      <tr key={`${selectedRequest.id}-period-${index}`} className="border-t border-white/5">
                        <td className="py-2 pr-4 text-white/85">{period?.start_date || '-'}</td>
                        <td className="py-2 pr-4 text-white/85">{period?.start_time || '-'}</td>
                        <td className="py-2 pr-4 text-white/85">{period?.end_date || '-'}</td>
                        <td className="py-2 text-white/85">{period?.end_time || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-2 text-sm text-white/65 inline-flex items-center gap-2">
                <UserRound className="h-4 w-4" /> No overtime period rows submitted.
              </div>
            )}
          </div>
        </div>
      ) : null}

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
  );
}
