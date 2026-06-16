import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { RefreshCcw, Search, Clock3, CheckCircle2, DollarSign, Package, FileText, Send, XCircle, FolderOpen } from 'lucide-react';
import materialRequestService from '../../services/materialRequestService';
import MaterialRequestFormModal from '../../components/modals/MaterialRequestFormModal';
import BudgetAllocationModal from '../../components/modals/BudgetAllocationModal';
import { CardSkeleton } from '../../components/SkeletonLoader';
import SummaryCard from '../../components/material-requests/SummaryCard';
import ProjectListSidebar from '../../components/material-requests/ProjectListSidebar';
import RequestItemCard from '../../components/material-requests/RequestItemCard';
import { cardClass, formatDate } from '../../components/material-requests/utils';

// Used for CEO and Studio Head inner tabs
const getTabConfig = (role) => {
  const base = [
    { id: 'pending', label: 'Needs Review', description: 'Waiting for decision', icon: Clock3, emptyText: 'No requests waiting for review.' },
    { id: 'approved', label: 'Approved', description: 'Finalized by CEO', icon: CheckCircle2, emptyText: 'No approved requests.' },
    { id: 'rejected', label: 'Rejected', description: 'Returned for revision', icon: XCircle, emptyText: 'No rejected requests.' }
  ];
  if (role === 'studio_head') {
    return [
      base[0],
      { id: 'forwarded', label: 'Forwarded to CEO', description: 'Reviewed by you', icon: Send, emptyText: 'No forwarded requests.' },
      ...base.slice(1)
    ];
  }
  return base;
};

const MaterialRequestReviewer = ({ user, reviewerRole = 'ceo', onNavigate }) => {
  const isAccounting = reviewerRole === 'accounting';
  
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Tabs state
  const [pageTab, setPageTab] = useState('material-request'); // 'material-request' | 'expenses'
  const [activeTab, setActiveTab] = useState('pending'); // used for ceo/studio_head
  const [searchQuery, setSearchQuery] = useState(''); // used for accounting

  // Selected state
  const [selectedProjectId, setSelectedProjectId] = useState(null); // for project lists
  const [selectedExpensesProjectId, setSelectedExpensesProjectId] = useState(null); // for expenses lists
  const [selectedRequestId, setSelectedRequestId] = useState(null); // for single request detail
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRequestForForm, setSelectedRequestForForm] = useState(null);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [selectedRequestForAllocation, setSelectedRequestForAllocation] = useState(null);
  
  const [expandedRequestIds, setExpandedRequestIds] = useState(new Set());
  const [decisionNote, setDecisionNote] = useState('');

  const TAB_CONFIG = useMemo(() => getTabConfig(reviewerRole), [reviewerRole]);

  useEffect(() => {
    fetchRequests();
  }, [reviewerRole]);

  const fetchRequests = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    const result = await materialRequestService.getMaterialRequests();
    if (result.success) {
      const data = Array.isArray(result.data) ? result.data : (result.data?.results || []);
      setRequests(data);
    } else {
      toast.error(`Failed to load material requests: ${result.error}`);
    }
    if (!silent) setLoading(false);
  };

  // ── FILTERING & GROUPING ──
  const filteredRequests = useMemo(() => {
    if (!isAccounting) return requests;
    return requests.filter(req => 
      req.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.created_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.id.toString().includes(searchQuery)
    );
  }, [requests, searchQuery, isAccounting]);

  // For CEO/Studio Head grouping
  const pendingRequests = useMemo(() => {
    if (isAccounting) return [];
    if (reviewerRole === 'ceo') {
      return requests.filter(r => r.status === 'pending_review' && r.reviewed_by_studio_head !== null);
    }
    return requests.filter(r => r.status === 'pending_review' && !r.reviewed_by_studio_head);
  }, [requests, reviewerRole, isAccounting]);

  const forwardedRequests = useMemo(() => {
    if (isAccounting || reviewerRole !== 'studio_head') return [];
    return requests.filter(r => r.status === 'pending_review' && r.reviewed_by_studio_head);
  }, [requests, reviewerRole, isAccounting]);

  const approvedRequests = useMemo(() => {
    if (isAccounting) return [];
    return requests.filter(r => r.status === 'approved' && (reviewerRole === 'ceo' ? r.reviewed_by_ceo !== null : true));
  }, [requests, reviewerRole, isAccounting]);

  const rejectedRequests = useMemo(() => {
    if (isAccounting) return [];
    return requests.filter(r => r.status === 'rejected' && (reviewerRole === 'ceo' ? r.reviewed_by_ceo !== null : true));
  }, [requests, reviewerRole, isAccounting]);

  const requestsByTab = {
    pending: pendingRequests,
    forwarded: forwardedRequests,
    approved: approvedRequests,
    rejected: rejectedRequests,
  };

  const activeRequests = requestsByTab[activeTab] || [];

  // Grouping logic for Project Lists (Accounting uses filteredRequests, CEO/Studio Head use approvedRequests)
  const mainProjectGroupSource = isAccounting 
    ? filteredRequests.filter(r => r.accounting_status !== 'funds_released')
    : approvedRequests.filter(r => r.accounting_status !== 'funds_released');

  const requestsByProjectMap = useMemo(() => {
    const map = new Map();
    mainProjectGroupSource.forEach((req) => {
      const key = req.project || 'unlinked';
      if (!map.has(key)) {
        map.set(key, { id: key, name: req.project_name || 'Unlinked Requests', location: req.delivery_location || '-', requests: [] });
      }
      map.get(key).requests.push(req);
    });
    return Array.from(map.values());
  }, [mainProjectGroupSource]);

  const expensesProjectGroupSource = isAccounting
    ? filteredRequests.filter(r => r.status === 'approved' && r.accounting_status === 'funds_released')
    : approvedRequests.filter(r => r.accounting_status === 'funds_released');

  const expensesByProjectMap = useMemo(() => {
    const map = new Map();
    expensesProjectGroupSource.forEach((req) => {
      const key = req.project || 'unlinked';
      if (!map.has(key)) {
        map.set(key, { id: key, name: req.project_name || 'Unlinked Requests', location: req.delivery_location || '-', requests: [] });
      }
      map.get(key).requests.push(req);
    });
    return Array.from(map.values());
  }, [expensesProjectGroupSource]);

  // Auto-selection effects
  useEffect(() => {
    if ((isAccounting && pageTab === 'material-request') || (!isAccounting && activeTab === 'approved')) {
      if (requestsByProjectMap.length > 0 && !selectedProjectId) {
        setSelectedProjectId(requestsByProjectMap[0].id);
      }
    }
  }, [pageTab, activeTab, requestsByProjectMap, isAccounting, selectedProjectId]);

  useEffect(() => {
    if (pageTab === 'expenses' && expensesByProjectMap.length > 0 && !selectedExpensesProjectId) {
      setSelectedExpensesProjectId(expensesByProjectMap[0].id);
    }
  }, [pageTab, expensesByProjectMap, selectedExpensesProjectId]);

  useEffect(() => {
    if (!isAccounting && activeTab !== 'approved') {
      if (activeRequests.length > 0 && !selectedRequestId) {
        setSelectedRequestId(activeRequests[0].id);
      } else if (activeRequests.length === 0) {
        setSelectedRequestId(null);
      } else if (selectedRequestId && !activeRequests.some(r => r.id === selectedRequestId)) {
         setSelectedRequestId(activeRequests[0].id);
      }
    }
  }, [activeRequests, activeTab, isAccounting, selectedRequestId]);

  const toggleExpandRequest = (reqId) => {
    setExpandedRequestIds(prev => {
      const next = new Set(prev);
      if (next.has(reqId)) next.delete(reqId);
      else next.add(reqId);
      return next;
    });
  };

  const handleOpenForm = (request) => {
    setSelectedRequestForForm(request);
    setIsFormModalOpen(true);
  };

  // ── ACTIONS (CEO / Studio Head) ──
  const applyLocalDecision = (requestId, action, comments) => {
    const reviewedAt = new Date().toISOString();
    const reviewerLabel = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || (reviewerRole === 'ceo' ? 'CEO' : 'Studio Head');
    
    setRequests(current => {
      return current.map(req => {
        if (req.id !== requestId) return req;
        
        if (reviewerRole === 'ceo') {
          return {
            ...req,
            status: action === 'approve' ? 'approved' : 'rejected',
            reviewed_by_ceo: user?.id || true,
            reviewed_by_ceo_name: reviewerLabel,
            ceo_reviewed_at: reviewedAt,
            ceo_comments: comments || '',
            updated_at: reviewedAt,
          };
        } else {
           return {
            ...req,
            status: action === 'approve' ? 'pending_review' : 'rejected',
            reviewed_by_studio_head: user?.id || true,
            reviewed_by_studio_head_name: reviewerLabel,
            studio_head_reviewed_at: reviewedAt,
            studio_head_comments: comments || '',
            updated_at: reviewedAt,
          };
        }
      });
    });

    if (action === 'approve') {
       setActiveTab(reviewerRole === 'ceo' ? 'approved' : 'forwarded');
    } else {
       setActiveTab('rejected');
    }
    setSelectedRequestId(requestId);
  };

  const handleApproveReject = async (action) => {
    const request = requests.find(r => r.id === selectedRequestId);
    if (!request) return;

    if (action === 'reject' && !decisionNote.trim()) {
      toast.error('Please provide a reason before rejecting this request.');
      return;
    }

    setSubmittingDecision(true);
    const result = await materialRequestService.approvalAction(request.id, action, decisionNote);

    if (result.success) {
      toast.success(action === 'approve' 
        ? (reviewerRole === 'ceo' ? 'Material request approved and finalized.' : 'Material request approved and forwarded to CEO.')
        : 'Material request rejected and returned for revision.'
      );
      applyLocalDecision(request.id, action, decisionNote);
      setDecisionNote('');
      fetchRequests({ silent: true });
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setSubmittingDecision(false);
  };

  // ── RENDERERS ──
  const renderStatsCards = () => {
    if (isAccounting) {
      const total = requests.length;
      const pendingFunds = requests.filter(r => r.accounting_status === 'pending_funds').length;
      const fundsReleased = requests.filter(r => r.accounting_status === 'funds_released').length;
      const totalExpenses = requests.reduce((sum, r) => sum + (Number(r.budget_allocated) || 0), 0);

      const stats = [
        { id: 'total', label: 'Total Requests', value: total, icon: FileText },
        { id: 'pending', label: 'Pending Funds', value: pendingFunds, icon: Clock3 },
        { id: 'released', label: 'Funds Released', value: fundsReleased, icon: CheckCircle2 },
        { id: 'expenses', label: 'Total Released', value: `₱${totalExpenses.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`, icon: DollarSign },
      ];

      return (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <SummaryCard
              key={stat.id}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              tone="neutral"
              isActive={false}
            />
          ))}
        </section>
      );
    }

    const totalExpenses = requests.reduce((sum, r) => sum + (Number(r.budget_allocated) || 0), 0);

    return (
      <section className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-${TAB_CONFIG.length + 1} gap-4`}>
        {TAB_CONFIG.map((tab) => (
          <SummaryCard
            key={tab.id}
            label={tab.label}
            value={requestsByTab[tab.id].length}
            icon={tab.icon}
            tone={tab.id}
            isActive={pageTab === 'material-request' && activeTab === tab.id}
            onClick={() => {
              setPageTab('material-request');
              setActiveTab(tab.id);
            }}
          />
        ))}
        <SummaryCard
          key="expenses"
          label="Project Expenses"
          value={`₱${totalExpenses.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`}
          icon={DollarSign}
          tone="neutral"
          isActive={pageTab === 'expenses'}
          onClick={() => setPageTab('expenses')}
        />
      </section>
    );
  };

  const renderApprovalActions = () => {
    const request = activeRequests.find(r => r.id === selectedRequestId);
    const requiresDecision = request && request.status === 'pending_review' && 
      (reviewerRole === 'ceo' ? !request.reviewed_by_ceo : !request.reviewed_by_studio_head);

    if (!requiresDecision) return null;

    return (
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h4 className="text-sm font-semibold text-white mb-3">Your Decision</h4>
        <textarea
          value={decisionNote}
          onChange={(e) => setDecisionNote(e.target.value)}
          placeholder="Add comments or reasoning for your decision (required for rejection)..."
          className="w-full bg-[#00273C]/50 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/30 focus:border-[#FF7120]/50 transition min-h-[100px] mb-4"
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleApproveReject('approve')}
            disabled={submittingDecision}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-500/20 transition disabled:opacity-50"
          >
            {submittingDecision ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Approve {reviewerRole === 'studio_head' ? '& Forward' : ''}
          </button>
          <button
            onClick={() => handleApproveReject('reject')}
            disabled={submittingDecision}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition disabled:opacity-50"
          >
             {submittingDecision ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
             Reject Request
          </button>
        </div>
      </div>
    );
  };

  const renderProjectListLayout = (isExpensesMode = false) => {
    const mapSource = isExpensesMode ? expensesByProjectMap : requestsByProjectMap;
    const selectedId = isExpensesMode ? selectedExpensesProjectId : selectedProjectId;
    const activeGroup = mapSource.find(g => g.id === selectedId);

    return (
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-1">
          <ProjectListSidebar 
            projects={mapSource} 
            loading={loading} 
            selectedProjectId={selectedId} 
            onSelectProject={isExpensesMode ? setSelectedExpensesProjectId : setSelectedProjectId} 
            emptyText={isExpensesMode ? "No processed projects with expenses yet." : "No requests found."}
          />
        </div>

        <div className="lg:col-span-2">
          <div className={`${cardClass} flex flex-col h-full p-6`}>
            {!activeGroup ? (
               <div className="h-full grid place-items-center text-center py-12">
                 <div>
                   <FolderOpen className="mx-auto h-9 w-9 text-white/25" />
                   <p className="mt-3 text-white/70">Select a project to view {isExpensesMode ? 'cumulative expenses' : 'requests'}.</p>
                 </div>
               </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="mt-1 text-xl font-semibold text-white">{activeGroup.name}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {activeGroup.requests.length} {isExpensesMode ? 'processed' : 'total'}
                  </span>
                </div>

                {isExpensesMode && (
                   <div className="rounded-2xl border border-[#FF7120]/25 bg-gradient-to-br from-[#FF7120]/10 to-transparent p-5 mb-4">
                     <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Total Project Expenses</p>
                     <p className="mt-2 text-3xl font-bold text-white">
                       ₱{activeGroup.requests.reduce((sum, r) => sum + ((Number(r.budget_allocated) || 0) > 0 ? Number(r.budget_allocated) : (r.items || []).reduce((iSum, item) => iSum + (Number(item.total) || 0), 0)), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                     </p>
                   </div>
                )}

                {isExpensesMode && isAccounting ? (
                  // Accounting Expenses Table
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-white/40 font-semibold">
                      <div className="col-span-1">#</div>
                      <div className="col-span-3">Requester</div>
                      <div className="col-span-2">Date</div>
                      <div className="col-span-2 text-right">Allocated</div>
                      <div className="col-span-2 text-right">Total</div>
                      <div className="col-span-2 text-center">Form</div>
                    </div>
                    <div className="max-h-[50vh] overflow-y-auto">
                      {activeGroup.requests.map((req, idx) => {
                        const itemsTotal = (req.items || []).reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
                        return (
                          <div key={req.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] transition items-center text-sm">
                            <div className="col-span-1"><span className="grid h-6 w-6 place-items-center rounded-md bg-[#FF7120]/15 text-[#FF7120] text-xs font-bold">{idx + 1}</span></div>
                            <div className="col-span-3 min-w-0"><p className="text-white font-medium truncate">{req.created_by_name || 'Unknown'}</p></div>
                            <div className="col-span-2 text-white/60">{formatDate(req.request_date)}</div>
                            <div className="col-span-2 text-right text-emerald-400 font-medium">₱{req.budget_allocated ? Number(req.budget_allocated).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : '0.00'}</div>
                            <div className="col-span-2 text-right text-white font-medium">₱{itemsTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                            <div className="col-span-2 text-center">
                              <button onClick={() => handleOpenForm(req)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/15 text-xs text-white/70 hover:bg-white/10 hover:text-white transition">
                                <FileText className="h-3 w-3" /> Form
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Expandable List
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {activeGroup.requests.map((req, idx) => (
                      <RequestItemCard 
                        key={req.id}
                        request={req}
                        index={idx}
                        isExpanded={expandedRequestIds.has(req.id)}
                        onToggleExpand={toggleExpandRequest}
                        onOpenForm={handleOpenForm}
                        userRole={reviewerRole}
                        actionSlot={
                          isAccounting && !isExpensesMode ? (
                            req.accounting_status === 'pending_funds' ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedRequestForAllocation(req); setIsAllocationModalOpen(true); }}
                                className="inline-flex items-center justify-center min-w-[140px] px-6 py-2.5 bg-[#FF7120] text-white text-sm font-bold tracking-wide rounded-xl hover:brightness-110 shadow-lg shadow-[#FF7120]/30 transition"
                              >
                                Process
                              </button>
                            ) : req.accounting_status === 'funds_released' ? (
                              <span className="inline-flex items-center justify-center min-w-[140px] px-6 py-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold tracking-wide rounded-xl">
                                Processed
                              </span>
                            ) : null
                          ) : null
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };

  const renderSimpleListLayout = () => {
    const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) || TAB_CONFIG[0];
    const request = activeRequests.find(r => r.id === selectedRequestId);

    return (
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
        <div className="lg:col-span-1">
          <div className={`${cardClass} flex flex-col h-[70vh] min-h-[560px] lg:h-[740px] overflow-hidden`}>
            <div className="sticky top-0 z-10 p-5 border-b border-white/10 bg-[#001f35]/95 backdrop-blur-sm">
              <p className="text-lg font-semibold text-white">{activeTabMeta?.label || 'Requests'}</p>
              <p className="mt-1 text-sm text-white/55">{activeTabMeta?.description}</p>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-xl border border-white/10 bg-black/25 pl-9 pr-3 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/45"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
              ) : activeRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-16 h-16 bg-[#FF7120]/10 rounded-2xl border border-[#FF7120]/20 flex items-center justify-center mb-4">
                     <Clock3 className="w-8 h-8 text-[#FF7120]" />
                  </div>
                  <p className="text-xl font-semibold text-white/90">Nothing here right now</p>
                  <p className="mt-2 text-sm text-white/50 text-center">{activeTabMeta.emptyText}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRequests.map((req) => {
                    const isSelected = selectedRequestId === req.id;
                    const priorityClass = {
                        URGENT: 'text-red-400 bg-red-400/10 border-red-400/20',
                        HIGH: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
                        NORMAL: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                    }[(req.priority || 'NORMAL').toUpperCase()] || 'text-blue-400 bg-blue-400/10 border-blue-400/20';

                    return (
                      <button
                        key={req.id}
                        onClick={() => setSelectedRequestId(req.id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          isSelected ? 'bg-[#FF7120]/10 border-[#FF7120]/50 shadow-[0_0_15px_rgba(255,113,32,0.15)]' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3 mb-2">
                           <h3 className="font-bold text-white truncate text-sm flex-1 min-w-0">{req.project_name}</h3>
                           <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border ${priorityClass}`}>{(req.priority || 'Normal').toUpperCase()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-white/5 gap-2">
                          <span className="text-white/60 truncate">{req.created_by_name || 'System User'}</span>
                          <span className="text-white/50 shrink-0">{formatDate(req.request_date)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {!request && !loading && (
             <div className={`${cardClass} flex flex-col items-center justify-center h-full p-8`}>
               <Package className="w-12 h-12 text-white/20 mb-4" />
               <p className="text-white/60">Select a request to review details.</p>
             </div>
          )}
          {request && (
             <div className={`${cardClass} flex flex-col h-full p-6`}>
               <RequestItemCard 
                 request={request}
                 index={activeRequests.findIndex(r => r.id === request.id)}
                 isExpanded={true} // always expanded in this view
                 onToggleExpand={() => {}} // disable collapse
                 onOpenForm={handleOpenForm}
                 userRole={reviewerRole}
                 actionSlot={renderApprovalActions()}
               />
             </div>
          )}
        </div>
      </section>
    );
  };

  const dashboardLabel = { ceo: 'CEO Final Review', studio_head: 'Studio Head Dashboard', accounting: 'Accounting Department' }[reviewerRole];

  return (
    <div className="w-full relative animate-fade-in space-y-6">
      {/* Header */}
      <div className={`${cardClass} p-6 sm:p-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6`}>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">{dashboardLabel}</p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Material Request and Expenses</h1>
          <p className="mt-3 text-sm text-white/60 max-w-2xl">Manage material requests and view project expense summaries.</p>
        </div>
        <button onClick={() => fetchRequests()} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition font-semibold">
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {renderStatsCards()}

      {/* Main Content Area */}
      {pageTab === 'expenses' ? renderProjectListLayout(true) : 
        (isAccounting || activeTab === 'approved' ? renderProjectListLayout(false) : renderSimpleListLayout())
      }

      {/* Modals */}
      <MaterialRequestFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        request={selectedRequestForForm}
        userRole={reviewerRole}
      />

      <BudgetAllocationModal
        isOpen={isAllocationModalOpen}
        onClose={() => setIsAllocationModalOpen(false)}
        request={selectedRequestForAllocation}
        onSuccess={() => fetchRequests()}
      />
    </div>
  );
};

export default MaterialRequestReviewer;
