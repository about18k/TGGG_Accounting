import React, { useEffect, useState, useMemo } from 'react';
import { 
  Package, 
  RefreshCcw, 
  FileText, 
  Search, 
  CalendarDays, 
  User2, 
  MapPin, 
  Image as ImageIcon,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import materialRequestService from '../../../services/materialRequestService';
import MaterialRequestFormModal from '../../../components/modals/MaterialRequestFormModal';
import MaterialRequestCommentThread from '../../../components/MaterialRequestCommentThread';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

const Badge = ({ tone = 'neutral', children, className = '' }) => {
  const toneClasses = {
    pending: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
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

const AccountingMaterialRequestPage = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pageTab, setPageTab] = useState('material-request'); // 'material-request' | 'expenses'
  const [selectedExpensesProject, setSelectedExpensesProject] = useState(null);
  const [selectedApprovedProject, setSelectedApprovedProject] = useState(null);
  const [showDetailDiscussion, setShowDetailDiscussion] = useState(null);
  const [expandedRequestIds, setExpandedRequestIds] = useState(new Set());

  const toggleExpandRequest = (reqId) => {
    setExpandedRequestIds(prev => {
      const next = new Set(prev);
      if (next.has(reqId)) {
        next.delete(reqId);
      } else {
        next.add(reqId);
      }
      return next;
    });
  };

  const filteredRequests = requests.filter(req => 
    req.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.created_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.id.toString().includes(searchQuery)
  );

  // Group requests by project for the main 'material-request' tab
  const requestsByProjectMap = useMemo(() => {
    const map = new Map();
    filteredRequests.forEach((req) => {
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
  }, [filteredRequests]);

  // Group ONLY APPROVED requests by project for 'expenses' tab
  const approvedByProjectMap = useMemo(() => {
    const map = new Map();
    filteredRequests.filter(r => r.status === 'approved').forEach((req) => {
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
  }, [filteredRequests]);

  useEffect(() => {
    fetchRequests();
  }, []);


  const fetchRequests = async () => {
    setLoading(true);
    const result = await materialRequestService.getMaterialRequests();
    if (result.success) {
      const data = Array.isArray(result.data) ? result.data : (result.data?.results || []);
      setRequests(data);
    } else {
      toast.error(`Failed to load material requests: ${result.error}`);
    }
    setLoading(false);
  };



  useEffect(() => {
    // Auto-select the first project in material-request tab
    if (pageTab === 'material-request' && requestsByProjectMap.length > 0 && !selectedApprovedProject) {
      setSelectedApprovedProject(requestsByProjectMap[0].id);
    }
    // Auto-select the first project in expenses tab
    if (pageTab === 'expenses' && approvedByProjectMap.length > 0 && !selectedExpensesProject) {
      setSelectedExpensesProject(approvedByProjectMap[0].id);
    }
  }, [pageTab, requestsByProjectMap, approvedByProjectMap, selectedApprovedProject, selectedExpensesProject]);



  const openModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="p-6 sm:p-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">Accounting Department</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Material Request</h1>
            <p className="mt-3 text-sm text-white/60 max-w-2xl">Review and manage requisition forms and project-based material expenses.</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchRequests}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mt-5 flex gap-2 border-t border-white/10 pt-5 px-6 sm:px-8 pb-5">
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
            Project Expenses
          </button>
        </div>

        <div className="p-4 border-b border-white/10 bg-white/5 text-sm font-bold">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by project, requester, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#001f35] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-white placeholder:text-white/30 outline-none focus:border-[#FF7120]/50 transition"
            />
          </div>
        </div>

        <div className="p-6">
          {pageTab === 'material-request' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Left Section: Project List (CEO Style) */}
            <div className="lg:col-span-1">
              <div className={`${cardClass} flex flex-col h-full p-5 space-y-4`}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-[#FF7120]" />
                  <h2 className="text-lg font-semibold text-white">Projects</h2>
                </div>
                
                {loading && <p className="text-sm text-white/60 py-6 text-center">Loading...</p>}
                
                {!loading && requestsByProjectMap.length === 0 && (
                   <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55 text-center">
                     No requests found.
                   </div>
                )}

                {!loading && requestsByProjectMap.length > 0 && (
                  <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                    {requestsByProjectMap.map((group) => {
                      const isSelected = selectedApprovedProject === group.id;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            setSelectedApprovedProject(group.id);
                            setExpandedRequestIds(new Set());
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

            {/* Right Section: Expandable Request List (CEO Style) */}
            <div className="lg:col-span-2">
              <div className={`${cardClass} flex flex-col h-full p-6`}>
                {(() => {
                  const activeGroup = requestsByProjectMap.find((g) => g.id === selectedApprovedProject);
                  if (!activeGroup) {
                    return (
                      <div className="h-full grid place-items-center text-center py-12">
                        <div>
                          <FolderOpen className="mx-auto h-9 w-9 text-white/25" />
                          <p className="mt-3 text-white/70">Select a project to view requests.</p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-5">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div>

                          <h3 className="mt-1 text-xl font-semibold text-white">{activeGroup.name}</h3>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {activeGroup.requests.length} total
                        </span>
                      </div>

                      {/* Request Cards */}
                      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
                        {activeGroup.requests.map((req, idx) => {
                          const isExpanded = expandedRequestIds.has(req.id);
                          return (
                            <div
                              key={req.id}
                              className="rounded-2xl border border-white/10 bg-[#00273C]/45 overflow-hidden transition hover:border-white/15"
                            >
                              {/* Compact header — always visible */}
                              <div className="w-full flex items-center gap-3 px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => toggleExpandRequest(req.id)}
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
                                        <span className="capitalize">{req.priority || 'NORMAL'}</span>
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
                                      openModal(req);
                                    }}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/20 text-white text-xs font-medium rounded-lg hover:bg-white/10 transition"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    View Form
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandRequest(req.id)}
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
                                      <p className="text-white mt-0.5 uppercase">{req.priority || 'NORMAL'}</p>
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
                                      <div className="flex items-center justify-between mb-2">
                                        <p className="text-white/45 text-xs">Materials List</p>
                                        <span className="text-[10px] text-white/50">{req.items?.length || 0} item(s)</span>
                                      </div>
                                      <p className="text-xs text-white/40 italic text-center py-4">No materials listed or image attached.</p>
                                    </div>
                                  )}

                                      <div className="border-t border-white/10 pt-4 flex flex-col gap-4">
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
          </div>
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
                            <FolderOpen className="mx-auto h-12 w-12 text-white/20 mb-4" />
                            <p className="text-white/60">Select a project to view cumulative expenses.</p>
                          </div>
                        </div>
                      );
                    }

                    // Calculate total ₱
                    const totalProjectExpenses = activeGroup.requests.reduce((sum, r) => {
                      const budget = Number(r.budget_allocated) || 0;
                      if (budget > 0) return sum + budget;
                      
                      const itemsTotal = (r.items || []).reduce((iSum, item) => iSum + (Number(item.total) || 0), 0);
                      return sum + itemsTotal;
                    }, 0);

                    return (
                      <div className="space-y-6">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Project Overview</p>
                            <h3 className="mt-2 text-2xl font-bold text-white">{activeGroup.name}</h3>
                          </div>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                             <CheckCircle2 className="h-3.5 w-3.5" />
                             {activeGroup.requests.length} approved
                          </span>
                        </div>

                        {/* Total Expenses Card - Studio Head Style */}
                        <div className="rounded-2xl border border-[#FF7120]/25 bg-gradient-to-br from-[#FF7120]/10 to-transparent p-5">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Total Project Expenses</p>
                          <p className="mt-2 text-3xl font-bold text-white">
                            ₱{totalProjectExpenses.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </p>
                        </div>

                        {/* Request table */}
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                          {/* Table header */}
                          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-white/40 font-semibold">
                            <div className="col-span-1">#</div>
                            <div className="col-span-4">Requester</div>
                            <div className="col-span-3">Date of Request</div>
                            <div className="col-span-2 text-right">Total</div>
                            <div className="col-span-2 text-center">Form</div>
                          </div>

                          {/* Table rows */}
                          <div className="max-h-[50vh] overflow-y-auto">
                            {activeGroup.requests.map((req, idx) => {
                              const itemsTotal = (req.items || []).reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
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
                                    ₱{itemsTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                  </div>
                                  <div className="col-span-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => openModal(req)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-white/15 text-xs text-white/70 hover:bg-white/10 hover:text-white transition"
                                    >
                                      <FileText className="h-3 w-3" />
                                      View Form
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
        </div>
      </div>

      <MaterialRequestFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        request={selectedRequest}
        userRole="accounting"
      />
    </div>
  );
};

export default AccountingMaterialRequestPage;
