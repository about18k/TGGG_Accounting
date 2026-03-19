import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  RefreshCcw,
  Send,
  User2,
  XCircle,
} from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import StudioHeadSidebar from './components/StudioHeadSidebar';
import materialRequestService from '../../../services/materialRequestService';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

const TAB_CONFIG = [
  {
    id: 'pending',
    label: 'Needs Review',
    description: 'Waiting for Studio Head decision',
    emptyText: 'No material requests are waiting for your review.',
  },
  {
    id: 'forwarded',
    label: 'Forwarded to CEO',
    description: 'Reviewed by Studio Head, waiting CEO decision',
    emptyText: 'No material requests have been forwarded to CEO yet.',
  },
  {
    id: 'approved',
    label: 'Approved',
    description: 'Finalized by CEO',
    emptyText: 'No approved material requests yet.',
  },
  {
    id: 'rejected',
    label: 'Rejected',
    description: 'Returned for revision',
    emptyText: 'No rejected material requests.',
  },
];

const TAB_TONES = {
  pending: 'pending',
  forwarded: 'forwarded',
  approved: 'approved',
  rejected: 'rejected',
};

const getStatusMeta = (request) => {
  if (!request) {
    return { tabId: 'pending', label: 'Needs Review', tone: 'pending' };
  }

  let tabId = 'pending';

  if (request.status === 'approved') {
    tabId = 'approved';
  } else if (request.status === 'rejected') {
    tabId = 'rejected';
  } else if (request.status === 'pending_review' && request.reviewed_by_studio_head) {
    tabId = 'forwarded';
  }

  const tab = TAB_CONFIG.find((item) => item.id === tabId) || TAB_CONFIG[0];

  return {
    tabId,
    label: tab.label,
    tone: TAB_TONES[tabId] || 'neutral',
  };
};

const Badge = ({ tone = 'neutral', children, className = '' }) => {
  const toneClasses = {
    pending: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
    forwarded: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
    approved: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-200 border-red-500/20',
    neutral: 'bg-white/5 text-white/70 border-white/10',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone] || toneClasses.neutral} ${className}`.trim()}>
      {children}
    </span>
  );
};

const formatDate = (value) => {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const SummaryCard = ({ label, value, icon: Icon, tone = 'neutral', isActive = false, onClick }) => {
    const toneStyles = {
        pending: 'border-[#FF7120]/20 bg-[#FF7120]/10 text-[#FFBE9B]',
        forwarded: 'border-cyan-500/15 bg-cyan-500/8 text-cyan-200',
        approved: 'border-emerald-500/15 bg-emerald-500/8 text-emerald-200',
        rejected: 'border-red-500/15 bg-red-500/8 text-red-200',
        neutral: 'border-white/10 bg-white/[0.03] text-white',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${cardClass} w-full p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7120]/40 active:scale-[0.99] ${
                isActive
                    ? 'border-[#FF7120]/55 bg-[#FF7120]/8 shadow-[0_0_20px_rgba(255,113,32,0.18)]'
                    : 'hover:-translate-y-0.5 hover:border-[#FF7120]/35 hover:bg-white/[0.05] hover:shadow-[0_10px_24px_rgba(0,0,0,0.25)]'
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className={`text-sm ${isActive ? 'text-white/80' : 'text-white/55'}`}>{label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                </div>
                <div className={`grid h-12 w-12 place-items-center rounded-full border ${toneStyles[tone] || toneStyles.neutral} ${isActive ? 'ring-2 ring-[#FF7120]/40 ring-offset-2 ring-offset-[#001F35]' : ''}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </button>
    );
};


const RequestListItem = ({ request, isSelected, onSelect }) => {
    const statusMeta = getStatusMeta(request);

    return (
        <button
            type="button"
            onClick={() => onSelect(request.id)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
                isSelected
                    ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{request.project_name}</p>
                    <p className="mt-1 text-xs text-white/45">{request.priority?.toUpperCase() || '-'} priority</p>
                </div>
                <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-2">
                <div className="flex items-center gap-2 min-w-0">
                    <User2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{request.created_by_name || request.created_by_email || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{formatDate(request.request_date)}</span>
                </div>
            </div>
        </button>
    );
};

const StudioHeadMaterialRequestPage = ({ user, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [forwardedRequests, setForwardedRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [message, setMessage] = useState('');

  const requestsByTab = useMemo(() => ({
    pending: pendingRequests,
    forwarded: forwardedRequests,
    approved: approvedRequests,
    rejected: rejectedRequests,
  }), [pendingRequests, forwardedRequests, approvedRequests, rejectedRequests]);

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

      setPendingRequests(requests.filter((request) => request.status === 'pending_review' && !request.reviewed_by_studio_head));
      setForwardedRequests(requests.filter((request) => request.status === 'pending_review' && request.reviewed_by_studio_head));
      setApprovedRequests(requests.filter((request) => request.status === 'approved'));
      setRejectedRequests(requests.filter((request) => request.status === 'rejected'));
    } else {
      setMessage(`Failed to load material requests: ${result.error}`);
    }

    if (!silent) {
      setLoading(false);
    }
  };

  const applyLocalDecision = (requestId, action, comments) => {
    const reviewedAt = new Date().toISOString();
    const reviewerLabel = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Studio Head';
    let updatedRequest = null;

    setPendingRequests((current) => {
      const found = current.find((request) => request.id === requestId);
      if (!found) {
        return current;
      }

      updatedRequest = {
        ...found,
        status: action === 'approve' ? 'pending_review' : 'rejected',
        reviewed_by_studio_head: user?.id || found.reviewed_by_studio_head || true,
        reviewed_by_studio_head_name: reviewerLabel,
        studio_head_reviewed_at: reviewedAt,
        studio_head_comments: comments || '',
        updated_at: reviewedAt,
      };

      return current.filter((request) => request.id !== requestId);
    });

    if (!updatedRequest) {
      return;
    }

    if (action === 'approve') {
      setForwardedRequests((current) => [updatedRequest, ...current.filter((request) => request.id !== requestId)]);
      setActiveTab('forwarded');
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
      setMessage('Material request approved and forwarded to CEO.');
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
    selectedRequest && selectedRequest.status === 'pending_review' && !selectedRequest.reviewed_by_studio_head
  );

  const selectedStatusMeta = getStatusMeta(selectedRequest);

  return (
    <div className="min-h-screen bg-[#00273C] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="studio-head-material-requests" user={user} />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <StudioHeadSidebar currentPage="studio-head-material-requests" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0 space-y-6">
            <section className={cardClass}>
              <div className="p-6 sm:p-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
                  <div className="max-w-3xl">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">Studio Head Review</p>
                      <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Material Requests</h1>
                      <p className="mt-3 text-sm text-white/60 max-w-2xl">
                          Review Site Engineer requests, then forward approved requests to CEO for final decision.
                      </p>
                  </div>
                  <button
                      type="button"
                      onClick={() => fetchRequests()}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition focus:ring-2 focus:ring-[#FF7120]/40"
                  >
                      <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                  </button>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <SummaryCard
                label="Needs Review"
                value={pendingRequests.length}
                icon={Clock3}
                tone="pending"
                isActive={activeTab === 'pending'}
                onClick={() => setActiveTab('pending')}
              />
              <SummaryCard
                label="Forwarded to CEO"
                value={forwardedRequests.length}
                icon={Send}
                tone="forwarded"
                isActive={activeTab === 'forwarded'}
                onClick={() => setActiveTab('forwarded')}
              />
              <SummaryCard
                label="Approved"
                value={approvedRequests.length}
                icon={CheckCircle2}
                tone="approved"
                isActive={activeTab === 'approved'}
                onClick={() => setActiveTab('approved')}
              />
              <SummaryCard
                label="Rejected"
                value={rejectedRequests.length}
                icon={XCircle}
                tone="rejected"
                isActive={activeTab === 'rejected'}
                onClick={() => setActiveTab('rejected')}
              />
            </section>

            {message && (
              <section className={`${cardClass} border ${message.startsWith('Error') ? 'border-red-500/25 bg-red-500/10 text-red-200' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200'} p-4 text-sm`}>
                {message}
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-1">
                  <div className={`${cardClass} flex flex-col h-full`}>
                      <div className="p-5 border-b border-white/10">
                          <p className="text-lg font-semibold text-white">{activeTabMeta.label}</p>
                          <p className="mt-1 text-sm text-white/55">{activeTabMeta.description}</p>
                      </div>

                      <div className="p-4">
                          {loading ? (
                              <p className="py-10 text-center text-sm text-white/55">Loading requests...</p>
                          ) : activeRequests.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-16 px-4">
                                  <div className="w-16 h-16 bg-[#FF7120]/10 rounded-2xl border border-[#FF7120]/20 flex items-center justify-center mb-4">
                                      <Clock3 className="w-8 h-8 text-[#FF7120]" />
                                  </div>
                                  <p className="text-xl font-semibold text-white/90">Nothing here right now</p>
                                  <p className="mt-2 text-sm text-white/50 max-w-[200px] mx-auto text-center">{activeTabMeta.emptyText}</p>
                              </div>
                          ) : (
                              <div className="space-y-3 max-h-[740px] overflow-y-auto pr-1">
                                  {activeRequests.map((request) => (
                                      <RequestListItem
                                          key={request.id}
                                          request={request}
                                          isSelected={selectedRequest?.id === request.id}
                                          onSelect={setSelectedRequestId}
                                      />
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-2">
                {!selectedRequest && !loading && (
                  <div className={`${cardClass} flex flex-col items-center justify-center h-full p-8`}>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-8 h-8 text-white/40" />
                      </div>
                      <p className="text-white/60 font-medium">Select a request to review details.</p>
                    </div>
                  </div>
                )}

                {selectedRequest && (
                  <section className={`${cardClass} flex flex-col h-full`}>
                      <div className="p-6 border-b border-white/10">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                              <div className="min-w-0">
                                  <h2 className="text-2xl font-semibold text-white break-words">{selectedRequest.project_name}</h2>
                                  <p className="text-sm text-white/60 mt-2">
                                      Submitted by {selectedRequest.created_by_name || selectedRequest.created_by_email || 'Unknown author'}
                                  </p>
                              </div>
                              <button
                                  type="button"
                                  onClick={() => setActiveTab(selectedStatusMeta.tabId)}
                                  className="rounded-full"
                                  title={`Open ${selectedStatusMeta.label} tab`}
                              >
                                  <Badge tone={selectedStatusMeta.tone} className="cursor-pointer">
                                      {selectedStatusMeta.label}
                                  </Badge>
                              </button>
                          </div>
                      </div>

                      <div className="p-6 space-y-6">

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
                        <label className="block text-sm text-white/70 font-semibold">Studio Head Note (required for rejection)</label>
                        <textarea
                          value={decisionNote}
                          onChange={(event) => setDecisionNote(event.target.value)}
                          rows={3}
                          placeholder="Add a review note for this request..."
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
                            {submittingDecision ? 'Submitting...' : 'Approve and Forward to CEO'}
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

                    {!requiresDecision && selectedRequest.studio_head_comments && (
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/70">Studio Head Decision</p>
                        <p className="mt-2 text-sm text-cyan-100">{selectedRequest.studio_head_comments}</p>
                      </div>
                    )}

                    {!requiresDecision && selectedRequest.ceo_comments && (
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-200/70">CEO Decision</p>
                        <p className="mt-2 text-sm text-emerald-100">{selectedRequest.ceo_comments}</p>
                      </div>
                    )}
                  </div>
                </section>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default StudioHeadMaterialRequestPage;
