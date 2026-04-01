import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  DollarSign,
  Eye,
  FileText,
  FolderOpen,
  MapPin,
  MessageSquare,
  Package,
  RefreshCcw,
  User2,
  XCircle,
} from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import CeoSidebar from './CeoSidebar';
import materialRequestService from '../../../services/materialRequestService';
import MaterialRequestCommentThread from '../../../components/MaterialRequestCommentThread';
import MaterialRequestFormModal from '../../../components/modals/MaterialRequestFormModal';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

const TAB_CONFIG = [
  {
    id: 'pending',
    label: 'Needs Review',
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
  const [pageTab, setPageTab] = useState('material-request'); // 'material-request' | 'expenses'
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [showDetailDiscussion, setShowDetailDiscussion] = useState(false);

  // ── Approved-tab project view ──────────────────────
  const [selectedApprovedProject, setSelectedApprovedProject] = useState(null);
  const [expandedApprovedIds, setExpandedApprovedIds] = useState(new Set());
  const [openDiscussionIds, setOpenDiscussionIds] = useState(new Set());

  // ── Expenses tab state ────────────────────────────
  const [selectedExpensesProject, setSelectedExpensesProject] = useState(null);
  const [expensesFormRequest, setExpensesFormRequest] = useState(null);

  // Group approved requests by project (client-side)
  const approvedByProjectMap = useMemo(() => {
    const map = new Map(); // key = project id (or 'unlinked'), value = { project, requests[] }
    approvedRequests.forEach((req) => {
      const key = req.project || 'unlinked';
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: req.project_name || 'Unlinked Requests',
          location: req.delivery_location || '-',
          requests: [],
        });
      }
      map.get(key).requests.push(req);
    });
    return Array.from(map.values());
  }, [approvedRequests]);

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

  // Auto-select first project in approved tab
  useEffect(() => {
    if (activeTab === 'approved' && approvedByProjectMap.length > 0 && !selectedApprovedProject) {
      setSelectedApprovedProject(approvedByProjectMap[0].id);
    }
  }, [activeTab, approvedByProjectMap, selectedApprovedProject]);

  const toggleExpandApproved = (requestId) => {
    setExpandedApprovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

  const toggleDiscussion = (requestId) => {
    setOpenDiscussionIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  };

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
      toast.error(`Failed to load material requests: ${result.error}`);
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
      toast.success('Material request approved and finalized.');
      applyLocalDecision(selectedRequest.id, 'approve', decisionNote);
      setDecisionNote('');
      fetchRequests({ silent: true });
    } else {
      toast.error(`Error: ${result.error}`);
    }

    setSubmittingDecision(false);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    if (!decisionNote.trim()) {
      toast.error('Please provide a reason before rejecting this request.');
      return;
    }

    setSubmittingDecision(true);
    const result = await materialRequestService.approvalAction(selectedRequest.id, 'reject', decisionNote);

    if (result.success) {
      toast.success('Material request rejected and returned for revision.');
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
    <div className="min-h-screen bg-[#00273C] relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
      </div>

      <PublicNavigation onNavigate={onNavigate} currentPage="ceo-material-requests" user={user} onLogout={onLogout} />

      <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          <aside className="w-64 shrink-0 hidden lg:block">
            <CeoSidebar currentPage="ceo-material-requests" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0 space-y-6">
            <section className={`${cardClass} p-6`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">CEO Final Review</p>
                  <h1 className="mt-2 text-2xl sm:text-3xl font-semibold text-white">Material Request and Expenses</h1>
                  <p className="mt-2 text-sm text-white/60">
                    Manage material requests and view project expense summaries.
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

              {/* ── Top-level page tabs ───────────────────── */}
              <div className="mt-5 flex gap-2 border-t border-white/10 pt-5">
                <button
                  type="button"
                  onClick={() => setPageTab('material-request')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    pageTab === 'material-request'
                      ? 'bg-[#FF7120] text-white shadow-lg shadow-[#FF7120]/20'
                      : 'border border-white/15 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Material Request
                </button>
                <button
                  type="button"
                  onClick={() => setPageTab('expenses')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    pageTab === 'expenses'
                      ? 'bg-[#FF7120] text-white shadow-lg shadow-[#FF7120]/20'
                      : 'border border-white/15 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Project Materials & Expenses
                </button>
              </div>
            </section>

            {/* ══════════════════════════════════════════════════
                 TAB 1: MATERIAL REQUEST (existing content)
               ══════════════════════════════════════════════════ */}
            {pageTab === 'material-request' && (
            <>
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


            {/* ── APPROVED TAB: Project-grouped layout ─────────── */}
            {activeTab === 'approved' && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Left panel — Project list */}
                <div className="lg:col-span-1">
                  <div className={`${cardClass} flex flex-col h-full p-5 space-y-4`}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-[#FF7120]" />
                      <h2 className="text-lg font-semibold text-white">Projects</h2>
                    </div>

                    {loading && <p className="text-sm text-white/60 py-6 text-center">Loading...</p>}

                    {!loading && approvedByProjectMap.length === 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55 text-center">
                        No approved material requests yet.
                      </div>
                    )}

                    {!loading && approvedByProjectMap.length > 0 && (
                      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                        {approvedByProjectMap.map((group) => {
                          const isSelected = selectedApprovedProject === group.id;
                          return (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => {
                                setSelectedApprovedProject(group.id);
                                setExpandedApprovedIds(new Set());
                              }}
                              className={`w-full rounded-2xl border p-4 text-left transition ${
                                isSelected
                                  ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
                                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                              }`}
                            >
                              <p className="text-sm font-semibold text-white truncate">{group.name}</p>
                              <div className="mt-2 flex items-center gap-3 text-xs text-white/50">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {group.location}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                  {group.requests.length} request{group.requests.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right panel — Approved requests for selected project */}
                <div className="lg:col-span-2">
                  <div className={`${cardClass} flex flex-col h-full p-6`}>
                    {(() => {
                      const activeGroup = approvedByProjectMap.find((g) => g.id === selectedApprovedProject);
                      if (!activeGroup) {
                        return (
                          <div className="h-full grid place-items-center text-center py-12">
                            <div>
                              <FolderOpen className="mx-auto h-9 w-9 text-white/25" />
                              <p className="mt-3 text-white/70">Select a project to view approved requests.</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-5">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Approved Requests</p>
                              <h3 className="mt-1 text-xl font-semibold text-white">{activeGroup.name}</h3>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {activeGroup.requests.length} approved
                            </span>
                          </div>

                          {/* Request Cards */}
                          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                            {activeGroup.requests.map((req, idx) => {
                              const isExpanded = expandedApprovedIds.has(req.id);
                              return (
                                <div
                                  key={req.id}
                                  className="rounded-2xl border border-white/10 bg-[#00273C]/45 overflow-hidden transition hover:border-white/15"
                                >
                                  {/* Compact header — always visible */}
                                  <div className="w-full flex items-center gap-3 px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleExpandApproved(req.id)}
                                      className="flex-1 min-w-0 flex items-center gap-3 text-left focus:outline-none rounded-lg"
                                    >
                                      <span className="shrink-0 grid h-7 w-7 place-items-center rounded-lg bg-[#FF7120]/15 text-[#FF7120] text-xs font-bold">
                                        #{idx + 1}
                                      </span>
                                      <div className="flex-1 min-w-0 flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                          <p className="text-sm font-medium text-white truncate">
                                            {req.created_by_name || req.created_by_email || 'Unknown'}
                                          </p>
                                          <div className="flex items-center gap-3 text-xs text-white/45 mt-0.5">
                                            <span className="capitalize">{req.priority}</span>
                                            <span>·</span>
                                            <span>{formatDate(req.request_date)}</span>
                                            <span>·</span>
                                            <span>{req.items?.length || 0} item{(req.items?.length || 0) !== 1 ? 's' : ''}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </button>

                                    <div className="flex items-center gap-3 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedRequestId(req.id);
                                          setIsFormModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/20 text-white text-xs font-medium rounded-lg hover:bg-white/10 transition"
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                        View Form
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandApproved(req.id)}
                                        className="p-1 hover:bg-white/5 rounded transition focus:outline-none"
                                      >
                                        {isExpanded
                                          ? <ChevronUp className="h-4 w-4 text-white/40 shrink-0" />
                                          : <ChevronDown className="h-4 w-4 text-white/40 shrink-0" />
                                        }
                                      </button>
                                    </div>
                                  </div>

                                  {/* Expanded details */}
                                  {isExpanded && (
                                    <div className="border-t border-white/10 px-4 py-4 space-y-4">

                                      {/* Meta grid */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                                          <p className="text-white/45 text-xs">Request Date</p>
                                          <p className="text-white mt-0.5">{formatDate(req.request_date)}</p>
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                                          <p className="text-white/45 text-xs">Required Date</p>
                                          <p className="text-white mt-0.5">{formatDate(req.required_date)}</p>
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                                          <p className="text-white/45 text-xs">Priority</p>
                                          <p className="text-white mt-0.5 capitalize">{req.priority}</p>
                                        </div>
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                                          <p className="text-white/45 text-xs">Location</p>
                                          <p className="text-white mt-0.5 truncate">{req.delivery_location || '-'}</p>
                                        </div>
                                      </div>

                                      {/* Notes */}
                                      {req.notes && (
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                          <p className="text-white/45 text-xs">Notes</p>
                                          <p className="text-white/75 text-sm mt-1">{req.notes}</p>
                                        </div>
                                      )}

                                      {/* Inline Form View (no image) or Attachment (image exists) */}
                                      {(!req.request_image && req.items?.length > 0) ? (
                                        <div className="mt-2 mb-4 border border-[#FF7120]/30 rounded-xl overflow-hidden shadow-lg bg-white overflow-x-auto print-container-wrapper">
                                          <MaterialRequestFormModal 
                                            isOpen={true} 
                                            request={req} 
                                            userRole={user?.role} 
                                            inline={true} 
                                          />
                                        </div>
                                      ) : req.request_image ? (
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
                                          <p className="text-white/45 text-xs text-left mb-2">Attachment</p>
                                          <a href={req.request_image} target="_blank" rel="noopener noreferrer" className="inline-block w-full max-w-xs group relative">
                                            <img src={req.request_image} alt="Request" className="w-full h-auto rounded-lg border border-white/10 transition group-hover:brightness-110" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/20 rounded-lg">
                                               <span className="bg-[#FF7120] text-white px-3 py-1.5 rounded-lg text-xs font-medium">View Full Image</span>
                                            </div>
                                          </a>
                                        </div>
                                      ) : (
                                        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                          <p className="text-white/45 text-xs mb-2">Materials List</p>
                                          <p className="text-xs text-white/40 italic text-center py-4">No materials listed or image attached.</p>
                                        </div>
                                      )}

                                      {/* Discussion thread */}
                                      <div className="border-t border-white/10 pt-3">
                                        <MaterialRequestCommentThread requestId={req.id} />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </section>
            )}

            {/* ── PENDING / REJECTED TABS: Standard list+detail layout ── */}
            {activeTab !== 'approved' && (
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              <div className="lg:col-span-1">
                <div className={`${cardClass} flex flex-col h-full p-5 space-y-4`}>
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
                      
                      // Priority badge logic matching Studio Head/Accounting
                      const priority = (request.priority || 'Normal').toUpperCase();
                      const pColors = {
                          URGENT: 'text-red-400 bg-red-400/10 border-red-400/20',
                          HIGH: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
                          NORMAL: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                      };
                      const priorityClass = pColors[priority] || pColors.NORMAL;

                      return (
                        <button
                          key={request.id}
                          type="button"
                          onClick={() => setSelectedRequestId(request.id)}
                          className={`w-full rounded-xl border p-4 text-left transition ${
                            isSelected
                              ? 'bg-[#FF7120]/10 border-[#FF7120]/50 shadow-[0_0_15px_rgba(255,113,32,0.15)]'
                              : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-3 mb-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="font-bold text-white truncate text-sm">{request.project_name}</h3>
                            </div>
                            <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${priorityClass}`}>
                              {priority}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-2.5 border-t border-white/5 gap-2">
                            <div className="flex items-center gap-1.5 text-white/60 min-w-0">
                              <User2 className="w-3.5 h-3.5 shrink-0 opacity-70 text-[#FF7120]" /> 
                              <span className="truncate">{request.created_by_name || 'System User'}</span>
                              <span className="shrink-0 text-[8px] uppercase tracking-wider px-1.5 py-0.5 bg-white/5 rounded text-white/50 border border-white/10 font-bold">
                                {request.requester_role ? request.requester_role.replace('_', ' ') : 'Staff'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-white/50 shrink-0">
                              <CalendarDays className="w-3.5 h-3.5 shrink-0 opacity-70" /> 
                              <span>{formatDate(request.request_date)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className={`${cardClass} flex flex-col h-full p-6`}>
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
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsFormModalOpen(true)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/20 text-white text-xs font-medium rounded-lg hover:bg-white/10 transition"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          View Form
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-white/45 text-xs">Requested By</p>
                        <p className="text-white mt-1">{selectedRequest.created_by_name || selectedRequest.created_by_email || '-'}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-white/45 text-xs">Delivery Location</p>
                        <p className="inline-flex items-center gap-2 text-white mt-1 truncate">
                          <MapPin className="h-3.5 w-3.5 text-[#FF7120] shrink-0" />
                          <span className="truncate">{selectedRequest.delivery_location || '-'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedRequest.notes && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <p className="text-white/45 text-xs">Notes</p>
                        <p className="text-white/75 text-sm mt-1">{selectedRequest.notes}</p>
                      </div>
                    )}

                    {/* Inline Form View (no image) or Attachment (image exists) */}
                    {(!selectedRequest.request_image && selectedRequest.items?.length > 0) ? (
                      <div className="mt-2 mb-6 border border-[#FF7120]/30 rounded-xl overflow-hidden shadow-lg bg-white overflow-x-auto print-container-wrapper">
                        <MaterialRequestFormModal 
                          isOpen={true} 
                          request={selectedRequest} 
                          userRole={user?.role} 
                          inline={true} 
                        />
                      </div>
                    ) : selectedRequest.request_image ? (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                        <p className="text-white/45 text-xs text-left mb-3">Material Request Image</p>
                        <a href={selectedRequest.request_image} target="_blank" rel="noopener noreferrer" className="inline-block w-full max-w-sm group relative">
                          <img 
                            src={selectedRequest.request_image} 
                            alt="Material Request" 
                            className="w-full h-auto rounded-lg border border-white/10 shadow-lg transition group-hover:brightness-110"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/20 rounded-lg">
                             <span className="bg-[#FF7120] text-white px-3 py-1.5 rounded-lg text-xs font-medium">View Full Image</span>
                          </div>
                        </a>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-white/45 text-xs">Materials Requested</p>
                        <p className="text-sm text-white/40 italic text-center py-8">No materials listed or image attached.</p>
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
                            className="inline-flex items-center gap-2 rounded-xl bg-[#FF7120] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 shadow-lg shadow-[#FF7120]/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {submittingDecision ? 'Submitting...' : 'Approve Request'}
                          </button>
                          <button
                            type="button"
                            onClick={handleReject}
                            disabled={submittingDecision}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject Request
                          </button>
                        </div>
                      </div>
                    )}



                    <div className="border-t border-white/10 pt-6">
                      <MaterialRequestCommentThread requestId={selectedRequest.id} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
            )}
            </> /* end Material Request tab */
            )}

            {/* ══════════════════════════════════════════════════
                 TAB 2: PROJECT MATERIALS & EXPENSES
               ══════════════════════════════════════════════════ */}
            {pageTab === 'expenses' && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Left panel — Project list */}
                <div className="lg:col-span-1">
                  <div className={`${cardClass} flex flex-col h-full p-5 space-y-4`}>
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-[#FF7120]" />
                      <h2 className="text-lg font-semibold text-white">Projects</h2>
                    </div>

                    {loading && <p className="text-sm text-white/60 py-6 text-center">Loading...</p>}

                    {!loading && approvedByProjectMap.length === 0 && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55 text-center">
                        No approved projects with expenses yet.
                      </div>
                    )}

                    {!loading && approvedByProjectMap.length > 0 && (
                      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                        {approvedByProjectMap.map((group) => {
                          const isSelected = selectedExpensesProject === group.id;
                          return (
                            <button
                              key={group.id}
                              type="button"
                              onClick={() => setSelectedExpensesProject(group.id)}
                              className={`w-full rounded-2xl border p-4 text-left transition ${
                                isSelected
                                  ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
                                  : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                              }`}
                            >
                              <p className="text-sm font-semibold text-white truncate">{group.name}</p>
                              <div className="mt-2 flex items-center text-xs text-white/50">
                                <span className="inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                  {group.requests.length} request{group.requests.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right panel — Expense details for selected project */}
                <div className="lg:col-span-2">
                  <div className={`${cardClass} flex flex-col h-full p-6`}>
                    {(() => {
                      const activeGroup = approvedByProjectMap.find((g) => g.id === selectedExpensesProject);
                      if (!activeGroup) {
                        return (
                          <div className="h-full grid place-items-center text-center py-12">
                            <div>
                              <DollarSign className="mx-auto h-9 w-9 text-white/25" />
                              <p className="mt-3 text-white/70">Select a project to view expenses.</p>
                            </div>
                          </div>
                        );
                      }

                      const totalExpenses = activeGroup.requests.reduce((sum, r) => {
                      const itemsTotal = (r.items || []).reduce((iSum, item) => iSum + (parseFloat(item.total) || 0), 0);
                      return sum + itemsTotal;
                    }, 0);

                      const firstReq = activeGroup.requests[0];

                      return (
                        <div className="space-y-5">
                          {/* Project header */}
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Project Overview</p>
                              <h3 className="mt-1 text-xl font-semibold text-white">{activeGroup.name}</h3>
                            </div>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {activeGroup.requests.length} approved
                            </span>
                          </div>

                          {/* Project meta */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <p className="text-white/45 text-xs">Location</p>
                              <p className="text-white mt-1 inline-flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-[#FF7120]" />
                                {activeGroup.location}
                              </p>
                            </div>
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <p className="text-white/45 text-xs">Date Started</p>
                              <p className="text-white mt-1">{firstReq ? formatDate(firstReq.request_date) : '-'}</p>
                            </div>
                          </div>

                          {/* Total Expenses */}
                          <div className="rounded-2xl border border-[#FF7120]/25 bg-gradient-to-br from-[#FF7120]/10 to-transparent p-5">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Total Expenses</p>
                            <p className="mt-2 text-3xl font-bold text-white">
                              ₱{totalExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </p>
                          </div>

                          {/* Request table */}
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                            {/* Table header */}
                            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-white/40 font-semibold">
                              <div className="col-span-1">#</div>
                              <div className="col-span-4">Requester</div>
                              <div className="col-span-3">Date of Request</div>
                              <div className="col-span-2 text-right">Budget</div>
                              <div className="col-span-2 text-center">Form</div>
                            </div>

                            {/* Table rows */}
                            <div className="max-h-[50vh] overflow-y-auto">
                              {activeGroup.requests.map((req, idx) => {
                                const reqBudgetVal = (req.items || []).reduce((s, item) => s + (parseFloat(item.total) || 0), 0);
                                return (
                                  <div
                                    key={req.id}
                                    className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] transition items-center text-sm"
                                  >
                                    <div className="col-span-1">
                                      <span className="grid h-6 w-6 place-items-center rounded-md bg-[#FF7120]/15 text-[#FF7120] text-xs font-bold">
                                        {idx + 1}
                                      </span>
                                    </div>
                                    <div className="col-span-4 min-w-0">
                                      <p className="text-white font-medium truncate">{req.created_by_name || req.created_by_email || 'Unknown'}</p>
                                    </div>
                                    <div className="col-span-3 text-white/60">
                                      {formatDate(req.request_date)}
                                    </div>
                                    <div className="col-span-2 text-right text-white font-medium">
                                      ₱{reqBudgetVal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="col-span-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpensesFormRequest(req);
                                          setIsFormModalOpen(true);
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/15 text-xs text-white/70 hover:bg-white/10 hover:text-white transition"
                                      >
                                        <Eye className="h-4 w-4" />
                                        View
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </section>
            )}

          </main>
        </div>
      </div>
      <MaterialRequestFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setExpensesFormRequest(null);
        }}
        request={expensesFormRequest || selectedRequest}
        userRole={user?.role}
      />
    </div>
  );
};

export default CeoMaterialRequestPage;
