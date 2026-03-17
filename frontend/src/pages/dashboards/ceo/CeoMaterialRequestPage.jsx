import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCcw,
  User2,
  XCircle,
} from 'lucide-react';
import CeoNavigation from './CeoNavigation';
import CeoSidebar from './CeoSidebar';
import materialRequestService from '../../../services/materialRequestService';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

const TAB_CONFIG = [
  {
    id: 'pending',
    label: 'Needs Decision',
    description: 'Ready for your final approval',
    icon: Clock3,
    emptyText: 'No material requests are waiting for your decision.',
  },
  {
    id: 'approved',
    label: 'Approved',
    description: 'Finalized by CEO',
    icon: CheckCircle2,
    emptyText: 'No approved material requests yet.',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    description: 'Returned for revision',
    icon: XCircle,
    emptyText: 'No rejected material requests.',
  },
];

const STATUS_TO_TAB_ID = {
  pending_review: 'pending',
  approved: 'approved',
  rejected: 'rejected',
};

const Badge = ({ tone = 'neutral', children }) => {
  const toneClasses = {
    pending: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
    approved: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-200 border-red-500/20',
    neutral: 'bg-white/5 text-white/70 border-white/10',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone] || toneClasses.neutral}`}>
      {children}
    </span>
  );
};

const getStatusMeta = (status) => {
  const tabId = STATUS_TO_TAB_ID[status] || 'pending';
  const tab = TAB_CONFIG.find((item) => item.id === tabId) || TAB_CONFIG[0];

  return {
    tabId,
    label: tab.label,
    tone: tabId,
  };
};

const formatDate = (value) => {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const SummaryCard = ({ label, value, icon: Icon, tone, isActive, onClick }) => {
  const toneStyles = {
    pending: 'border-blue-500/15 bg-blue-500/8 text-blue-200',
    approved: 'border-emerald-500/15 bg-emerald-500/8 text-emerald-200',
    rejected: 'border-red-500/15 bg-red-500/8 text-red-200',
    neutral: 'border-white/10 bg-white/[0.03] text-white',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${cardClass} w-full p-5 text-left transition-all duration-200 ${
        isActive
          ? 'border-[#FF7120]/55 bg-[#FF7120]/8 shadow-[0_0_20px_rgba(255,113,32,0.18)]'
          : 'hover:-translate-y-0.5 hover:border-[#FF7120]/35 hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-sm ${isActive ? 'text-white/80' : 'text-white/55'}`}>{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-2xl border ${toneStyles[tone] || toneStyles.neutral}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );
};

const CeoMaterialRequestPage = ({ user, onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [message, setMessage] = useState('');

  const requestsByTab = useMemo(() => ({
    pending: pendingRequests,
    approved: approvedRequests,
    rejected: rejectedRequests,
  }), [pendingRequests, approvedRequests, rejectedRequests]);

  const activeRequests = requestsByTab[activeTab] || [];
  const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) || TAB_CONFIG[0];

  const selectedRequest = useMemo(() => {
    return activeRequests.find((request) => request.id === selectedRequestId) || activeRequests[0] || null;
  }, [activeRequests, selectedRequestId]);

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!activeRequests.length) {
      if (selectedRequestId !== null) {
        setSelectedRequestId(null);
      }
      return;
    }

    if (!activeRequests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(activeRequests[0].id);
    }
  }, [activeRequests, selectedRequestId]);

  const fetchRequests = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
    }

    const result = await materialRequestService.getMaterialRequests();

    if (result.success) {
      const requests = Array.isArray(result.data) ? result.data : (result.data?.results || []);
      const ceoRequests = requests.filter((request) => {
        if (request.status === 'pending_review') {
          return request.reviewed_by_studio_head !== null && request.reviewed_by_studio_head !== undefined;
        }

        if (request.status === 'approved' || request.status === 'rejected') {
          return request.reviewed_by_ceo !== null && request.reviewed_by_ceo !== undefined;
        }

        return false;
      });

      setPendingRequests(ceoRequests.filter((request) => request.status === 'pending_review'));
      setApprovedRequests(ceoRequests.filter((request) => request.status === 'approved'));
      setRejectedRequests(ceoRequests.filter((request) => request.status === 'rejected'));
    } else {
      setMessage(`Failed to load material requests: ${result.error}`);
    }

    if (!silent) {
      setLoading(false);
    }
  };

  const applyLocalDecision = (requestId, action, comments) => {
    const reviewedAt = new Date().toISOString();
    const reviewerLabel = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'CEO';
    let updatedRequest = null;

    setPendingRequests((current) => {
      const found = current.find((request) => request.id === requestId);
      if (!found) {
        return current;
      }

      updatedRequest = {
        ...found,
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by_ceo: user?.id || found.reviewed_by_ceo || true,
        reviewed_by_ceo_name: reviewerLabel,
        ceo_reviewed_at: reviewedAt,
        ceo_comments: comments || '',
        updated_at: reviewedAt,
      };

      return current.filter((request) => request.id !== requestId);
    });

    if (!updatedRequest) {
      return;
    }

    if (action === 'approve') {
      setApprovedRequests((current) => [updatedRequest, ...current.filter((request) => request.id !== requestId)]);
      setActiveTab('approved');
    } else {
      setRejectedRequests((current) => [updatedRequest, ...current.filter((request) => request.id !== requestId)]);
      setActiveTab('rejected');
    }

    setSelectedRequestId(updatedRequest.id);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setSubmittingDecision(true);
    const result = await materialRequestService.approvalAction(selectedRequest.id, 'approve', decisionNote);

    if (result.success) {
      setMessage('Material request approved and finalized.');
      applyLocalDecision(selectedRequest.id, 'approve', decisionNote);
      setDecisionNote('');
      fetchRequests({ silent: true });
    } else {
      setMessage(`Error: ${result.error}`);
    }

    setSubmittingDecision(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!decisionNote.trim()) {
      setMessage('Please provide a reason before rejecting this request.');
      return;
    }

    setSubmittingDecision(true);
    const result = await materialRequestService.approvalAction(selectedRequest.id, 'reject', decisionNote);

    if (result.success) {
      setMessage('Material request rejected and returned for revision.');
      applyLocalDecision(selectedRequest.id, 'reject', decisionNote);
      setDecisionNote('');
      fetchRequests({ silent: true });
    } else {
      setMessage(`Error: ${result.error}`);
    }

    setSubmittingDecision(false);
  };

  const requiresDecision = Boolean(
    selectedRequest && selectedRequest.status === 'pending_review' && !selectedRequest.reviewed_by_ceo
  );

  const selectedStatusMeta = getStatusMeta(selectedRequest?.status);

  return (
    <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <CeoNavigation onNavigate={onNavigate} currentPage="ceo-material-requests" user={user} onLogout={onLogout} />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <CeoSidebar currentPage="ceo-material-requests" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0 space-y-6">
            <section className={`${cardClass} p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">CEO Final Review</p>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-white">Material Requests</h1>
                  <p className="mt-2 text-sm text-white/60">
                    Final decision for material requests already reviewed by Studio Head.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchRequests()}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TAB_CONFIG.map((tab) => {
                const value = tab.id === 'pending'
                  ? pendingRequests.length
                  : tab.id === 'approved'
                    ? approvedRequests.length
                    : rejectedRequests.length;

                return (
                  <SummaryCard
                    key={tab.id}
                    label={tab.label}
                    value={value}
                    icon={tab.icon}
                    tone={tab.id}
                    isActive={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  />
                );
              })}
            </section>

            {message && (
              <section className={`${cardClass} border ${message.startsWith('Error') ? 'border-red-500/25 bg-red-500/10 text-red-200' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'} p-4 text-sm`}>
                {message}
              </section>
            )}

            <section className="grid grid-cols-1 xl:grid-cols-[370px,1fr] gap-6">
              <div className={`${cardClass} p-5 space-y-4`}>
                <div>
                  <h2 className="text-lg font-semibold text-white">{activeTabMeta.label}</h2>
                  <p className="text-xs text-white/50 mt-1">{activeTabMeta.description}</p>
                </div>

                {loading && <p className="text-sm text-white/60 py-6 text-center">Loading requests...</p>}

                {!loading && activeRequests.length === 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55 text-center">
                    {activeTabMeta.emptyText}
                  </div>
                )}

                {!loading && activeRequests.length > 0 && (
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {activeRequests.map((request) => {
                      const statusMeta = getStatusMeta(request.status);
                      const isSelected = selectedRequest?.id === request.id;

                      return (
                        <button
                          key={request.id}
                          type="button"
                          onClick={() => setSelectedRequestId(request.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            isSelected
                              ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
                              : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-white truncate">{request.project_name}</p>
                              <p className="mt-1 text-xs text-white/45">{request.priority?.toUpperCase()} priority</p>
                            </div>
                            <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                          </div>

                          <div className="mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
                            <div className="inline-flex items-center gap-2 min-w-0">
                              <User2 className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{request.created_by_name || request.created_by_email || 'Unknown'}</span>
                            </div>
                            <div className="inline-flex items-center gap-2 min-w-0">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{formatDate(request.request_date)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={`${cardClass} p-6`}>
                {!selectedRequest && !loading && (
                  <div className="h-full grid place-items-center text-center">
                    <div>
                      <Package className="mx-auto h-9 w-9 text-white/25" />
                      <p className="mt-3 text-white/70">Select a request to review details.</p>
                    </div>
                  </div>
                )}

                {selectedRequest && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Material Request</p>
                        <h3 className="mt-2 text-2xl font-semibold text-white">{selectedRequest.project_name}</h3>
                      </div>
                      <Badge tone={selectedStatusMeta.tone}>{selectedStatusMeta.label}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-white/45 text-xs">Requested By</p>
                        <p className="text-white mt-1">{selectedRequest.created_by_name || selectedRequest.created_by_email || '-'}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-white/45 text-xs">Priority</p>
                        <p className="text-white mt-1 capitalize">{selectedRequest.priority}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-white/45 text-xs">Request Date</p>
                        <p className="text-white mt-1">{formatDate(selectedRequest.request_date)}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-white/45 text-xs">Required Date</p>
                        <p className="text-white mt-1">{formatDate(selectedRequest.required_date)}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-white/45 text-xs">Delivery Location</p>
                      <p className="inline-flex items-center gap-2 text-white mt-1">
                        <MapPin className="h-4 w-4 text-[#FF7120]" />
                        {selectedRequest.delivery_location || '-'}
                      </p>
                    </div>

                    {selectedRequest.studio_head_comments && (
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/70">Studio Head Note</p>
                        <p className="text-sm text-cyan-100 mt-2">{selectedRequest.studio_head_comments}</p>
                      </div>
                    )}

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-white/45 text-xs">Materials Requested</p>
                      <div className="mt-3 space-y-2">
                        {(selectedRequest.items || []).map((item) => (
                          <div key={item.id} className="rounded-lg border border-white/10 bg-black/10 p-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-white font-medium">{item.name}</p>
                              <span className="text-white/65">{item.quantity} {item.unit}</span>
                            </div>
                            {(item.category || item.specifications) && (
                              <p className="text-white/55 text-xs mt-1">
                                {[item.category, item.specifications].filter(Boolean).join(' - ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedRequest.notes && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-white/45 text-xs">Notes</p>
                        <p className="text-white/75 text-sm mt-1">{selectedRequest.notes}</p>
                      </div>
                    )}

                    {requiresDecision && (
                      <div className="rounded-xl border border-white/10 bg-black/15 p-4 space-y-3">
                        <label className="block text-sm text-white/70 font-semibold">CEO Note (required for rejection)</label>
                        <textarea
                          value={decisionNote}
                          onChange={(event) => setDecisionNote(event.target.value)}
                          rows={3}
                          placeholder="Add a final approval note..."
                          className="w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none resize-none focus:border-[#FF7120]/50"
                        />

                        <div className="flex flex-wrap gap-3 pt-1">
                          <button
                            type="button"
                            onClick={handleApprove}
                            disabled={submittingDecision}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/85 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {submittingDecision ? 'Submitting...' : 'Approve Request'}
                          </button>
                          <button
                            type="button"
                            onClick={handleReject}
                            disabled={submittingDecision}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-500/85 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject Request
                          </button>
                        </div>
                      </div>
                    )}

                    {!requiresDecision && selectedRequest.ceo_comments && (
                      <div className={`rounded-xl border p-4 ${selectedRequest.status === 'approved' ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-red-500/20 bg-red-500/10'}`}>
                        <p className={`text-[11px] uppercase tracking-[0.16em] ${selectedRequest.status === 'approved' ? 'text-emerald-200/70' : 'text-red-200/70'}`}>
                          {selectedRequest.status === 'approved' ? 'Approved by CEO' : 'Rejected by CEO'}
                        </p>
                        <p className={`mt-2 text-sm ${selectedRequest.status === 'approved' ? 'text-emerald-100' : 'text-red-100'}`}>
                          {selectedRequest.ceo_comments}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CeoMaterialRequestPage;
