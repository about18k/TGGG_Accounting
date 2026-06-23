import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { RefreshCcw, Search, Clock3, CheckCircle2, DollarSign, Package, FileText, Send, XCircle, FolderOpen, Upload } from 'lucide-react';
import materialRequestService from '../../services/materialRequestService';
import purchaseOrderService from '../../services/purchaseOrderService';
import MaterialRequestFormModal from '../../components/modals/MaterialRequestFormModal';
import StudioHeadPoCreationModal from '../../components/modals/StudioHeadPoCreationModal';
import { CardSkeleton } from '../../components/SkeletonLoader';
import SummaryCard from '../../components/material-requests/SummaryCard';
import ProjectListSidebar from '../../components/material-requests/ProjectListSidebar';
import RequestItemCard from '../../components/material-requests/RequestItemCard';
import { cardClass, formatDate } from '../../components/material-requests/utils';

// Used for CEO and Studio Head inner tabs
const getTabConfig = (role) => {
  const base = [
    { id: 'pending', label: 'Needs Review', description: 'Waiting for decision', icon: Clock3, emptyText: 'No requests waiting for review.' },
    { id: 'approved', label: 'Reviewed by CEO', description: 'Finalized by CEO', icon: CheckCircle2, emptyText: 'No approved requests.' },
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
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Tabs state
  const [pageTab, setPageTab] = useState(reviewerRole === 'accounting' ? 'tally' : 'material-request'); // 'material-request' | 'expenses' | 'tally'
  const [activeTab, setActiveTab] = useState('pending'); // used for ceo/studio_head
  const [searchQuery, setSearchQuery] = useState(''); // used for accounting/search
  const [tallyFilter, setTallyFilter] = useState('pending'); // 'all' | 'pending' | 'tallied'

  // Selected state
  const [selectedProjectId, setSelectedProjectId] = useState(null); // for project lists
  const [selectedExpensesProjectId, setSelectedExpensesProjectId] = useState(null); // for expenses lists
  const [selectedRequestId, setSelectedRequestId] = useState(null); // for single request detail
  const [selectedPoId, setSelectedPoId] = useState(null); // for accounting PO detail
  
  // Tally Form state
  const [tallyNotes, setTallyNotes] = useState('');
  const [tallyReceiptFile, setTallyReceiptFile] = useState(null);
  const [tallySubmitting, setTallySubmitting] = useState(false);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRequestForForm, setSelectedRequestForForm] = useState(null);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [selectedRequestForAllocation, setSelectedRequestForAllocation] = useState(null);
  
  const [expandedRequestIds, setExpandedRequestIds] = useState(new Set());
  const [decisionNote, setDecisionNote] = useState('');
  const [decisionNotes, setDecisionNotes] = useState({});
  // Captures the decision note text at the moment Studio Head clicks "Approve", so it can be sent to the MR approval API after the PO form is submitted
  const [pendingApprovalNote, setPendingApprovalNote] = useState('');
  // True when the PO modal was opened via the decision panel "Approve" button (pending MR) vs. "Process PO" on an already-forwarded request
  const [isApprovalPending, setIsApprovalPending] = useState(false);

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

    // Load POs from database API
    const poResult = await purchaseOrderService.getPurchaseOrders();
    if (poResult.success) {
      const poData = Array.isArray(poResult.data) ? poResult.data : (poResult.data?.results || []);
      setPurchaseOrders(poData);
    } else {
      // Fallback local storage aggregation
      const allSimulatedPOs = [];
      const dataList = result.success ? (Array.isArray(result.data) ? result.data : (result.data?.results || [])) : [];
      dataList.forEach(mr => {
        const raw = localStorage.getItem('po_batches_' + mr.id);
        if (raw) {
          try {
            const batches = JSON.parse(raw);
            batches.forEach(b => {
              if (b.purchase_orders) {
                b.purchase_orders.forEach(po => {
                  allSimulatedPOs.push(po);
                });
              }
            });
          } catch(e){}
        }
      });
      setPurchaseOrders(allSimulatedPOs);
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

  // Grouping logic for Project Lists (Accounting uses filteredRequests, CEO/Studio Head use approvedRequests/activeRequests)
  const mainProjectGroupSource = useMemo(() => {
    if (reviewerRole === 'studio_head') {
      return activeRequests;
    }
    return approvedRequests;
  }, [reviewerRole, activeRequests, approvedRequests]);

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

  const expensesProjectGroupSource = useMemo(() => {
    return requests.filter(r => r.status === 'approved');
  }, [requests]);

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
    const shouldShowProjectList = 
      (isAccounting && pageTab === 'material-request') || 
      (!isAccounting && pageTab === 'material-request' && (reviewerRole === 'studio_head' || activeTab === 'approved'));

    if (shouldShowProjectList) {
      if (requestsByProjectMap.length > 0) {
        const exists = requestsByProjectMap.some(p => p.id === selectedProjectId);
        if (!selectedProjectId || !exists) {
          setSelectedProjectId(requestsByProjectMap[0].id);
        }
      } else {
        setSelectedProjectId(null);
      }
    }
  }, [pageTab, activeTab, requestsByProjectMap, isAccounting, reviewerRole, selectedProjectId]);

  useEffect(() => {
    if (pageTab === 'expenses' && expensesByProjectMap.length > 0 && !selectedExpensesProjectId) {
      setSelectedExpensesProjectId(expensesByProjectMap[0].id);
    }
  }, [pageTab, expensesByProjectMap, selectedExpensesProjectId]);

  useEffect(() => {
    if (!isAccounting && reviewerRole !== 'studio_head' && activeTab !== 'approved') {
      if (activeRequests.length > 0 && !selectedRequestId) {
        setSelectedRequestId(activeRequests[0].id);
      } else if (activeRequests.length === 0) {
        setSelectedRequestId(null);
      } else if (selectedRequestId && !activeRequests.some(r => r.id === selectedRequestId)) {
         setSelectedRequestId(activeRequests[0].id);
      }
    }
  }, [activeRequests, activeTab, isAccounting, reviewerRole, selectedRequestId]);

  useEffect(() => {
    if (isAccounting && pageTab === 'tally') {
      const approvedPOs = purchaseOrders.filter(po => po.status === 'approved');
      const filtered = approvedPOs.filter(po => {
        if (tallyFilter === 'pending') return !po.is_tallied;
        if (tallyFilter === 'tallied') return po.is_tallied;
        return true;
      });
      if (filtered.length > 0 && !selectedPoId) {
        setSelectedPoId(filtered[0].id);
      } else if (filtered.length === 0) {
        setSelectedPoId(null);
      } else if (selectedPoId && !filtered.some(po => po.id === selectedPoId)) {
        setSelectedPoId(filtered[0].id);
      }
    }
  }, [pageTab, purchaseOrders, tallyFilter, isAccounting, selectedPoId]);

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

  const handlePoApproval = async (poId, decision, reason = '') => {
    if (decision === 'reject' && !reason.trim()) {
      toast.error('Please specify a rejection reason.');
      return;
    }
    
    setLoading(true);
    let result;
    if (decision === 'approve') {
      result = await purchaseOrderService.approvePurchaseOrder(poId);
    } else {
      result = await purchaseOrderService.rejectPurchaseOrder(poId, reason);
    }

    if (result.success) {
      toast.success(decision === 'approve' ? 'Purchase Order Approved.' : 'Purchase Order Rejected.');
      fetchRequests({ silent: true });
    } else {
      // Mock local storage update fallback
      toast.success(decision === 'approve' ? '[Simulated] Purchase Order Approved.' : '[Simulated] Purchase Order Rejected.');
      requests.forEach(mr => {
        const raw = localStorage.getItem('po_batches_' + mr.id);
        if (raw) {
          try {
             const batches = JSON.parse(raw);
             let updated = false;
             batches.forEach(b => {
                if (b.purchase_orders) {
                   b.purchase_orders.forEach(po => {
                      if (po.id === poId) {
                         po.status = decision === 'approve' ? 'approved' : 'rejected';
                         if (decision === 'reject') po.rejection_reason = reason;
                         updated = true;
                      }
                   });
                }
             });
             if (updated) {
                localStorage.setItem('po_batches_' + mr.id, JSON.stringify(batches));
             }
          } catch(e){}
        }
      });
      fetchRequests({ silent: true });
    }
    setLoading(false);
  };

  const handleApproveReject = async (action, requestId, note) => {
    const request = requests.find(r => r.id === (requestId || selectedRequestId));
    if (!request) return;

    const actualNote = note !== undefined ? note : (decisionNotes[request.id] || decisionNote);

    if (action === 'reject' && !actualNote.trim()) {
      toast.error('Please provide a reason before rejecting this request.');
      return;
    }

    setSubmittingDecision(true);
    const result = await materialRequestService.approvalAction(request.id, action, actualNote);

    if (result.success) {
      toast.success(action === 'approve' 
        ? (reviewerRole === 'ceo' ? 'Material request approved and finalized.' : 'Material request approved and forwarded to CEO.')
        : 'Material request rejected and returned for revision.'
      );
      applyLocalDecision(request.id, action, actualNote);
      setDecisionNotes(prev => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });
      setDecisionNote('');
      fetchRequests({ silent: true });
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setSubmittingDecision(false);
  };

  // Called by StudioHeadPoCreationModal after PO submission when the request was pending Studio Head approval
  const handleApproveRequest = async (requestId, note = '') => {
    setSubmittingDecision(true);
    const result = await materialRequestService.approvalAction(requestId, 'approve', note);
    if (result.success) {
      toast.success('Material request approved and forwarded to CEO.');
      applyLocalDecision(requestId, 'approve', note);
      setDecisionNotes(prev => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      setDecisionNote('');
      fetchRequests({ silent: true });
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setSubmittingDecision(false);
  };

  const getRequestPOTotals = (req) => {
    const requestPOs = (purchaseOrders || []).filter(po => po.material_request === req.id || po.mr_id === req.id);
    const approvedPOs = requestPOs.filter(po => po.status === 'approved');
    
    const talliedSum = approvedPOs
      .filter(po => po.is_tallied)
      .reduce((sum, po) => sum + (po.items || []).reduce((iSum, item) => iSum + (Number(item.total) || 0), 0), 0);
      
    const totalSum = approvedPOs
      .reduce((sum, po) => sum + (po.items || []).reduce((iSum, item) => iSum + (Number(item.total) || 0), 0), 0);
      
    return { talliedSum, totalSum };
  };

  const handleTallySubmit = async (poId) => {
    setTallySubmitting(true);
    const formData = new FormData();
    formData.append('tally_notes', tallyNotes);
    if (tallyReceiptFile) {
      formData.append('receipt', tallyReceiptFile);
    }

    const res = await purchaseOrderService.tallyPurchaseOrder(poId, formData);
    if (res.success) {
      toast.success('Disbursement tallied and reconciled successfully.');
      setTallyNotes('');
      setTallyReceiptFile(null);
      fetchRequests({ silent: true });
    } else {
      toast.success('[Simulated] Disbursement tallied successfully.');
      
      setPurchaseOrders(prevPOs => {
        return prevPOs.map(po => {
          if (po.id === poId) {
            return {
              ...po,
              is_tallied: true,
              tally_notes: tallyNotes,
              tallied_by_name: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Accounting',
              tallied_at: new Date().toISOString(),
              tally_receipt: tallyReceiptFile ? URL.createObjectURL(tallyReceiptFile) : null
            };
          }
          return po;
        });
      });

      requests.forEach(mr => {
        const raw = localStorage.getItem('po_batches_' + mr.id);
        if (raw) {
          try {
             const batches = JSON.parse(raw);
             let updated = false;
             batches.forEach(b => {
                if (b.purchase_orders) {
                   b.purchase_orders.forEach(po => {
                      if (po.id === poId) {
                         po.is_tallied = true;
                         po.tally_notes = tallyNotes;
                         po.tallied_by_name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.email || 'Accounting';
                         po.tallied_at = new Date().toISOString();
                         po.tally_receipt = tallyReceiptFile ? URL.createObjectURL(tallyReceiptFile) : null;
                         updated = true;
                      }
                   });
                }
             });
             if (updated) {
                localStorage.setItem('po_batches_' + mr.id, JSON.stringify(batches));
             }
          } catch(e){}
        }
      });

      setTallyNotes('');
      setTallyReceiptFile(null);
      fetchRequests({ silent: true });
    }
    setTallySubmitting(false);
  };

  const renderAccountingTallyLayout = () => {
    const approvedPOs = purchaseOrders.filter(po => po.status === 'approved');
    const filteredPOs = approvedPOs.filter(po => {
      const matchesSearch = searchQuery ? (
        po.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.project_name?.toLowerCase().includes(searchQuery.toLowerCase())
      ) : true;

      if (tallyFilter === 'pending') {
        return matchesSearch && !po.is_tallied;
      }
      if (tallyFilter === 'tallied') {
        return matchesSearch && po.is_tallied;
      }
      return matchesSearch;
    });

    const activePO = approvedPOs.find(po => po.id === selectedPoId);

    return (
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch text-left">
        <div className="lg:col-span-1">
          <div className={`${cardClass} flex flex-col h-[70vh] min-h-[560px] lg:h-[740px] overflow-hidden`}>
            <div className="sticky top-0 z-10 p-5 border-b border-white/10 bg-[#001f35]/95 backdrop-blur-sm">
              <p className="text-lg font-semibold text-white">Purchase Orders</p>
              <p className="mt-1 text-sm text-white/55">Reconcile approved PO payouts</p>
              
              <div className="flex gap-2 mt-3 p-1 bg-black/20 border border-white/5 rounded-xl">
                {['pending', 'tallied', 'all'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => { setTallyFilter(filter); setSelectedPoId(null); }}
                    className={`flex-1 py-1.5 text-[11px] font-bold uppercase rounded-lg transition ${
                      tallyFilter === filter
                        ? 'bg-[#FF7120] text-white shadow-lg shadow-[#FF7120]/25'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {filter === 'pending' ? 'Pending' : filter === 'tallied' ? 'Reconciled' : 'All'}
                  </button>
                ))}
              </div>

              <div className="mt-3 relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search POs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 rounded-xl border border-white/10 bg-black/25 pl-9 pr-3 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/45"
                />
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
              ) : filteredPOs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center mb-4">
                     <Package className="w-6 h-6 text-white/40" />
                  </div>
                  <p className="text-sm font-semibold text-white/95">No Purchase Orders</p>
                  <p className="mt-1 text-xs text-white/50 text-center">No POs matched the criteria.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPOs.map((po) => {
                    const isSelected = selectedPoId === po.id;
                    const poTotal = (po.items || []).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
                    
                    return (
                      <button
                        key={po.id}
                        onClick={() => {
                          setSelectedPoId(po.id);
                          setTallyNotes(po.tally_notes || '');
                          setTallyReceiptFile(null);
                        }}
                        className={`w-full rounded-xl border p-4 text-left transition ${
                          isSelected 
                            ? 'bg-[#FF7120]/10 border-[#FF7120]/50 shadow-[0_0_15px_rgba(255,113,32,0.15)]' 
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2 mb-1">
                          <h4 className="font-extrabold text-white truncate text-sm flex-1 min-w-0 uppercase">{po.supplier}</h4>
                          <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            po.is_tallied 
                              ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' 
                              : 'text-amber-400 bg-amber-400/10 border-amber-400/20'
                          }`}>
                            {po.is_tallied ? 'RECONCILED' : 'UNSETTLED'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs text-white/55 mb-2">
                          <span>{po.po_number || 'No PO #'}</span>
                          <span className="font-bold text-[#FFBE9B]">₱{poTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-2 border-t border-white/5 text-white/40">
                          <span className="truncate">Proj: {po.project_name}</span>
                          <span>{po.date ? formatDate(po.date) : ''}</span>
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
          {!activePO ? (
            <div className={`${cardClass} flex flex-col items-center justify-center h-[70vh] min-h-[560px] lg:h-[740px] p-8`}>
              <Package className="w-12 h-12 text-white/20 mb-4" />
              <p className="text-white/60">Select a Purchase Order to view details and process settlement.</p>
            </div>
          ) : (
            <div className={`${cardClass} block h-[70vh] min-h-[560px] lg:h-[740px] p-6 space-y-6 overflow-y-auto`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="text-left">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF7120]">Purchase Order Details</span>
                  <h3 className="text-xl font-black text-white uppercase mt-1">{activePO.supplier}</h3>
                  <p className="text-xs text-white/60 mt-0.5">Project: <span className="text-white font-semibold">{activePO.project_name}</span></p>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded bg-[#FF7120]/15 border border-[#FF7120]/30 text-[#FF7120] uppercase">
                    {activePO.po_number}
                  </span>
                  <p className="text-xs text-white/45 mt-1.5">Date: {activePO.date ? formatDate(activePO.date) : '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#001725] border border-white/10 rounded-xl p-4 text-xs text-left">
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Billing Account Name</p>
                  <p className="text-white font-medium text-sm mt-0.5">{activePO.account_name || 'Not Provided'}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Billing Account Number</p>
                  <p className="text-white font-medium text-sm mt-0.5">{activePO.account_number || 'Not Provided'}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Payment Terms</p>
                  <p className="text-white font-medium mt-0.5">{activePO.payment_terms || '-'}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">RFP Reference Number</p>
                  <p className="text-white font-medium mt-0.5">{activePO.rfp_number || '-'}</p>
                </div>
              </div>

              <div>
                <p className="text-[#FFBE9B] text-xs font-bold uppercase tracking-wider mb-2 text-left">Itemized Materials</p>
                <div className="rounded-xl border border-white/10 bg-black/25 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#001f35] text-white/50 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Discount</th>
                        <th className="px-4 py-3 text-right">Net Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(activePO.items || []).map((item, index) => (
                        <tr key={index} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                          <td className="px-4 py-3 text-right text-white/70">{item.quantity} {item.unit}</td>
                          <td className="px-4 py-3 text-right text-white/70">₱{Number(item.price || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right text-white/70">{item.discount ? `${item.discount}%` : '-'}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#FFBE9B]">₱{Number(item.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center bg-[#FF7120]/5 px-4 py-3 rounded-xl mt-3 border border-[#FF7120]/15">
                  <span className="text-xs font-extrabold text-white/80 uppercase">Total Amount Due:</span>
                  <span className="text-lg font-black text-[#FF7120]">
                    ₱{(activePO.items || []).reduce((sum, i) => sum + Number(i.total || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#FF7120]" />
                  <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">Payout Reconciliation</h4>
                </div>

                {!activePO.is_tallied ? (
                  <div className="space-y-4">
                    <div className="text-left">
                      <label className="block text-xs font-bold text-white/60 uppercase mb-2">Upload Transfer/Payment Receipt (slip)</label>
                      <div className="relative border-2 border-dashed border-white/10 hover:border-[#FF7120]/50 rounded-xl bg-black/10 transition p-6 text-center cursor-pointer group">
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={(e) => setTallyReceiptFile(e.target.files[0])}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-10 h-10 bg-white/5 group-hover:bg-[#FF7120]/10 rounded-lg flex items-center justify-center border border-white/10 group-hover:border-[#FF7120]/30 transition">
                            <Upload className="w-5 h-5 text-white/60 group-hover:text-[#FF7120]" />
                          </div>
                          {tallyReceiptFile ? (
                            <div>
                              <p className="text-xs font-semibold text-white truncate max-w-md">{tallyReceiptFile.name}</p>
                              <p className="text-[10px] text-white/45">{(tallyReceiptFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-xs font-bold text-white/80">Select payment slip image or document</p>
                              <p className="text-[10px] text-white/45 mt-0.5">Drag and drop file here or click to browse</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-left">
                      <label className="block text-xs font-bold text-white/60 uppercase mb-2">Tally / Disbursement Notes</label>
                      <textarea
                        value={tallyNotes}
                        onChange={(e) => setTallyNotes(e.target.value)}
                        placeholder="Log reference numbers, actual release time, bank names, or notes..."
                        className="w-full bg-black/25 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-white/30 focus:border-[#FF7120]/50 outline-none resize-none min-h-[80px]"
                      />
                    </div>

                    <button
                      onClick={() => handleTallySubmit(activePO.id)}
                      disabled={tallySubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#FF7120] text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-lg shadow-[#FF7120]/25 transition disabled:opacity-50"
                    >
                      {tallySubmitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Reconcile & Complete Tally
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-5 space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-emerald-500/10 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Reconciled & Documented</span>
                      </div>
                      <span className="text-[10px] text-emerald-400/70 font-semibold">
                        {activePO.tallied_at ? formatDate(activePO.tallied_at) : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-white/45 text-[9px] uppercase font-bold">Settled By</p>
                        <p className="text-white font-medium mt-0.5">{activePO.tallied_by_name || activePO.tallied_by_email || 'Accounting Agent'}</p>
                      </div>
                      <div>
                        <p className="text-white/45 text-[9px] uppercase font-bold">Status</p>
                        <p className="text-emerald-400 font-bold mt-0.5">Funds Fully Released</p>
                      </div>
                    </div>

                    {activePO.tally_notes && (
                      <div>
                        <p className="text-white/45 text-[9px] uppercase font-bold mb-1">Accounting Notes</p>
                        <p className="bg-black/25 text-white/80 rounded-lg p-3 text-xs whitespace-pre-wrap">{activePO.tally_notes}</p>
                      </div>
                    )}

                    {activePO.tally_receipt && (
                      <div>
                        <p className="text-white/45 text-[9px] uppercase font-bold mb-2">Attached Receipt Slip</p>
                        <a
                          href={activePO.tally_receipt}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block group relative max-w-xs"
                        >
                          <img
                            src={activePO.tally_receipt}
                            alt="Payment Receipt"
                            className="w-full h-auto rounded-lg border border-white/10 group-hover:brightness-110 transition"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-lg transition backdrop-blur-sm">
                            <span className="bg-[#FF7120] text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl">
                              View Full Document
                            </span>
                          </div>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  };

  // ── RENDERERS ──
  const renderStatsCards = () => {
    if (isAccounting) {
      const approvedPOs = purchaseOrders.filter(po => po.status === 'approved');
      const pendingTally = approvedPOs.filter(po => !po.is_tallied).length;
      const talliedPOs = approvedPOs.filter(po => po.is_tallied);
      const fullyReconciled = talliedPOs.length;
      
      const totalDisbursed = talliedPOs.reduce((sum, po) => {
        const poTotal = (po.items || []).reduce((iSum, item) => iSum + (Number(item.total) || 0), 0);
        return sum + poTotal;
      }, 0);

      const stats = [
        { id: 'total-pos', label: 'Approved POs', value: approvedPOs.length, icon: FileText, tone: 'neutral' },
        { id: 'pending-tally', label: 'Pending Tally', value: pendingTally, icon: Clock3, tone: 'pending' },
        { id: 'tallied-pos', label: 'Fully Reconciled', value: fullyReconciled, icon: CheckCircle2, tone: 'approved' },
        { id: 'total-disbursed', label: 'Total Disbursed', value: `₱${totalDisbursed.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`, icon: DollarSign, tone: 'neutral' },
      ];

      return (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <SummaryCard
              key={stat.id}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              tone={stat.tone}
              isActive={
                pageTab === 'tally' && (
                  (stat.id === 'pending-tally' && tallyFilter === 'pending') ||
                  (stat.id === 'tallied-pos' && tallyFilter === 'tallied') ||
                  (stat.id === 'total-pos' && tallyFilter === 'all')
                )
              }
              onClick={() => {
                setPageTab('tally');
                setSelectedPoId(null);
                if (stat.id === 'pending-tally') {
                  setTallyFilter('pending');
                } else if (stat.id === 'tallied-pos') {
                  setTallyFilter('tallied');
                } else if (stat.id === 'total-pos') {
                  setTallyFilter('all');
                }
              }}
            />
          ))}
        </section>
      );
    }

    const totalExpenses = requests.reduce((sum, r) => {
      const { totalSum } = getRequestPOTotals(r);
      return sum + totalSum;
    }, 0);

    return (
      <section className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-${TAB_CONFIG.length + 1} gap-4`}>
        {TAB_CONFIG.map((tab) => {
          let tabCount = requestsByTab[tab.id]?.length || 0;
          return (
            <SummaryCard
              key={tab.id}
              label={tab.label}
              value={tabCount}
              icon={tab.icon}
              tone={tab.id}
              isActive={pageTab === 'material-request' && activeTab === tab.id}
              onClick={() => {
                setPageTab('material-request');
                setActiveTab(tab.id);
              }}
            />
          );
        })}
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
    if (!request) return null;

    const requiresDecision = request.status === 'pending_review' && 
      (reviewerRole === 'ceo' ? !request.reviewed_by_ceo : !request.reviewed_by_studio_head);

    if (!requiresDecision) return null;

    const note = decisionNotes[request.id] || decisionNote || '';

    // Studio Head Step 1: "Approve" captures note and opens PO builder.
    // The MR is NOT marked as forwarded yet — that only happens when the PO is submitted (Step 2).
    const handleStudioHeadApprove = () => {
      setPendingApprovalNote(note);
      setIsApprovalPending(true);
      setSelectedRequestForAllocation(request);
      setIsAllocationModalOpen(true);
    };

    return (
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        {requiresDecision && (
          <>
            <h4 className="text-sm font-semibold text-white mb-3">Your Decision</h4>
            <textarea
              value={note}
              onChange={(e) => {
                const val = e.target.value;
                setDecisionNotes(prev => ({ ...prev, [request.id]: val }));
                setDecisionNote(val);
              }}
              placeholder="Add comments or reasoning for your decision (required for rejection)..."
              className="w-full bg-[#00273C]/50 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/30 focus:border-[#FF7120]/50 transition min-h-[100px] mb-4"
            />

            {reviewerRole === 'studio_head' && (
              <p className="text-[11px] text-white/40 mb-3 flex items-center gap-1.5">
                <span className="text-[#FF7120] font-bold">ℹ</span>
                Approving will open the PO builder (Step 2). Fill out and submit the PO to forward to the CEO.
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              {reviewerRole === 'studio_head' ? (
                // Step 1 — opens PO modal. Actual API forward happens on PO submit.
                <button
                  onClick={handleStudioHeadApprove}
                  disabled={submittingDecision}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-500/20 transition disabled:opacity-50"
                >
                  {submittingDecision ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve — Fill Out PO
                </button>
              ) : (
                <button
                  onClick={() => handleApproveReject('approve', request.id, note)}
                  disabled={submittingDecision}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-500/20 transition disabled:opacity-50"
                >
                  {submittingDecision ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve
                </button>
              )}
              <button
                onClick={() => handleApproveReject('reject', request.id, note)}
                disabled={submittingDecision}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition disabled:opacity-50"
              >
                {submittingDecision ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject Request
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderStudioHeadDecisionBlock = (req) => {
    const note = decisionNotes[req.id] || '';
    
    const handleStudioHeadApprove = () => {
      setPendingApprovalNote(note);
      setIsApprovalPending(true);
      setSelectedRequestForAllocation(req);
      setIsAllocationModalOpen(true);
    };

    return (
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
        <h4 className="text-sm font-semibold text-white mb-3 text-left">Your Decision</h4>
        <textarea
          value={note}
          onChange={(e) => setDecisionNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
          placeholder="Add comments or reasoning for your decision (required for rejection)..."
          className="w-full bg-[#00273C]/50 border border-white/10 rounded-lg p-3 text-sm text-white placeholder:text-white/30 focus:border-[#FF7120]/50 transition min-h-[100px] mb-4 text-left"
        />

        <p className="text-[11px] text-white/40 mb-3 flex items-center gap-1.5 text-left">
          <span className="text-[#FF7120] font-bold">ℹ</span>
          Approving will open the PO builder (Step 2). Fill out and submit the PO to forward to the CEO.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleStudioHeadApprove}
            disabled={submittingDecision}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-500/20 transition disabled:opacity-50"
          >
            {submittingDecision ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Approve — Fill Out PO
          </button>
          <button
            onClick={() => handleApproveReject('reject', req.id, note)}
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

  const renderCardActionSlot = (req, isExpensesMode = false) => {
    if (reviewerRole !== 'studio_head' || isExpensesMode) return null;

    if (req.status === 'approved') {
      return (
        <div className="inline-flex items-center justify-center min-w-[140px] px-6 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold">
          <CheckCircle2 className="w-4 h-4 mr-2" /> Approved
        </div>
      );
    }

    if (req.status === 'rejected') {
      return (
        <div className="inline-flex items-center justify-center min-w-[140px] px-6 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold">
          <XCircle className="w-4 h-4 mr-2" /> Rejected
        </div>
      );
    }

    if (req.reviewed_by_studio_head) {
      return (
        <div className="inline-flex items-center justify-center min-w-[140px] px-6 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl text-sm font-bold">
          <Clock3 className="w-4 h-4 mr-2" /> Forwarded
        </div>
      );
    }

    // It is pending review and not reviewed by studio head
    return renderStudioHeadDecisionBlock(req);
  };

  const renderProjectListLayout = (isExpensesMode = false) => {
    const mapSource = isExpensesMode ? expensesByProjectMap : requestsByProjectMap;
    const selectedId = isExpensesMode ? selectedExpensesProjectId : selectedProjectId;
    const activeGroup = mapSource.find(g => g.id === selectedId);

    return (
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-1">
          <div className="h-[70vh] min-h-[560px] lg:h-[740px]">
          <ProjectListSidebar 
            projects={mapSource} 
            loading={loading} 
            selectedProjectId={selectedId} 
            onSelectProject={isExpensesMode ? setSelectedExpensesProjectId : setSelectedProjectId} 
            emptyText={isExpensesMode ? "No processed projects with expenses yet." : "No requests found."}
          />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className={`${cardClass} block h-[70vh] min-h-[560px] lg:h-[740px] p-6 overflow-y-auto`}>
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
                    <div className="rounded-2xl border border-[#FF7120]/25 bg-gradient-to-br from-[#FF7120]/10 to-transparent p-5 mb-4 text-left">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Total Project Expenses</p>
                      <p className="mt-2 text-3xl font-bold text-white">
                        ₱{activeGroup.requests.reduce((sum, r) => {
                          const { totalSum } = getRequestPOTotals(r);
                          return sum + totalSum;
                        }, 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                 )}

                 {isExpensesMode && isAccounting ? (
                   // Accounting Expenses Table
                   <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                     <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-[0.12em] text-white/40 font-semibold text-left">
                       <div className="col-span-1">#</div>
                       <div className="col-span-3">Requester</div>
                       <div className="col-span-2">Date</div>
                       <div className="col-span-2 text-right">Reconciled</div>
                       <div className="col-span-2 text-right">Approved POs</div>
                       <div className="col-span-2 text-center">Form</div>
                     </div>
                     <div>
                       {activeGroup.requests.map((req, idx) => {
                         const { talliedSum, totalSum } = getRequestPOTotals(req);
                         return (
                           <div key={req.id} className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 hover:bg-white/[0.03] transition items-center text-sm text-left">
                             <div className="col-span-1"><span className="grid h-6 w-6 place-items-center rounded-md bg-[#FF7120]/15 text-[#FF7120] text-xs font-bold">{idx + 1}</span></div>
                             <div className="col-span-3 min-w-0"><p className="text-white font-medium truncate">{req.created_by_name || 'Unknown'}</p></div>
                             <div className="col-span-2 text-white/60">{formatDate(req.request_date)}</div>
                             <div className="col-span-2 text-right text-emerald-400 font-medium">₱{talliedSum.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
                             <div className="col-span-2 text-right text-white font-medium">₱{totalSum.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</div>
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
                   <div className="space-y-3 pr-1">
                     {activeGroup.requests.map((req, idx) => (
                       <RequestItemCard 
                         key={req.id}
                         request={req}
                         index={idx}
                         isExpanded={expandedRequestIds.has(req.id)}
                         onToggleExpand={toggleExpandRequest}
                         onOpenForm={handleOpenForm}
                         userRole={reviewerRole}
                         actionSlot={renderCardActionSlot(req, isExpensesMode)}
                         purchaseOrders={purchaseOrders}
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

  // Renders PO cards for the Studio Head "Forwarded to CEO" tab
  const renderStudioHeadForwardedPOs = () => {
    const forwardedMrIds = new Set(forwardedRequests.map(r => r.id));
    const forwardedPOs = purchaseOrders.filter(
      po => forwardedMrIds.has(po.material_request) || forwardedMrIds.has(po.mr_id)
    );

    if (forwardedPOs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-[#001f35]/50 border border-white/5 rounded-2xl">
          <Package className="h-12 w-12 text-white/20 mb-3" />
          <p className="text-white/60 text-sm">No Purchase Orders have been submitted to CEO yet.</p>
          <p className="text-xs text-white/35 mt-1">Process a forwarded request via the "Process PO" button to generate POs.</p>
        </div>
      );
    }

    return (
      <div className="flex gap-6 overflow-x-auto pb-6 pt-2 snap-x scroll-smooth custom-scrollbar">
        {forwardedPOs.map((po) => (
          <div
            key={po.id}
            className="w-full max-w-[480px] bg-[#002035] border border-white/10 rounded-2xl p-6 flex flex-col justify-between shrink-0 snap-start shadow-xl relative hover:border-[#FF7120]/40 transition"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-extrabold text-white text-base truncate max-w-[240px] uppercase">{po.supplier}</h3>
                  <p className="text-[11px] text-white/50 mt-1 uppercase font-bold">Project: {po.project_name}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${
                  po.status === 'approved'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : po.status === 'rejected'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-[#FF7120]/30 bg-[#FF7120]/10 text-[#FF7120]'
                } uppercase`}>
                  {po.status === 'approved' ? 'APPROVED' : po.status === 'rejected' ? 'REJECTED' : 'PENDING CEO'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">P.O. Number</p>
                  <p className="text-white font-medium">{po.po_number || 'DRAFT PO'}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Date</p>
                  <p className="text-white font-medium">{po.date || (po.created_at ? new Date(po.created_at).toLocaleDateString() : '-')}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Payment Terms</p>
                  <p className="text-white font-medium">{po.payment_terms || '-'}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Bill To</p>
                  <p className="text-white font-medium">{po.bill_to || '-'}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Account Name</p>
                  <p className="text-white font-medium truncate">{po.account_name || '-'}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Account Number</p>
                  <p className="text-white font-medium">{po.account_number || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/45 text-[9px] uppercase font-bold">RFP Reference</p>
                  <p className="text-white font-medium">{po.rfp_number || '-'}</p>
                </div>
              </div>

              {/* Items Summary Table */}
              <div>
                <p className="text-[#FFBE9B] text-[10px] uppercase font-extrabold tracking-wider mb-2">Itemized Materials</p>
                <div className="rounded-lg border border-white/5 bg-black/25 max-h-[160px] overflow-y-auto overflow-x-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[#041e30] text-white/50 text-[9px] uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Description</th>
                        <th className="px-2 py-1.5 text-right w-16">Qty</th>
                        <th className="px-2 py-1.5 text-right w-24">Net Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(po.items || []).map((item, index) => (
                        <tr key={index} className="border-t border-white/5">
                          <td className="px-2 py-1.5 text-white truncate max-w-[180px]">{item.name}</td>
                          <td className="px-2 py-1.5 text-right text-white/70">{item.quantity} {item.unit}</td>
                          <td className="px-2 py-1.5 text-right font-semibold text-[#FFBE9B]">₱{Number(item.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center bg-[#FF7120]/5 px-3 py-2 rounded-lg mt-2 border border-[#FF7120]/10">
                  <span className="text-[11px] font-bold text-white/80 uppercase">Total Amount:</span>
                  <span className="text-sm font-extrabold text-[#FF7120]">₱{(po.items || []).reduce((sum, i) => sum + Number(i.total || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {po.status === 'approved' && (
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                <span>Approved by CEO</span>
                <span className="font-semibold text-emerald-400">✓ Approved</span>
              </div>
            )}
            {po.status === 'rejected' && (
              <div className="mt-4 pt-3 border-t border-white/10 text-xs">
                <p className="text-red-400 font-bold">Rejected by CEO</p>
                {po.rejection_reason && <p className="text-white/60 text-[11px] mt-1 bg-black/20 rounded p-2 italic">"{po.rejection_reason}"</p>}
              </div>
            )}
            {po.status === 'pending_approval' && (
              <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/45 italic">
                Awaiting CEO review…
              </div>
            )}

            {/* FR4 — Allow creating a supplemental PO for the same MR */}
            <button
              type="button"
              onClick={() => {
                const req = forwardedRequests.find(r => r.id === (po.material_request || po.mr_id));
                if (req) { setIsApprovalPending(false); setSelectedRequestForAllocation(req); setIsAllocationModalOpen(true); }
              }}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-white/30 hover:text-[#FF7120]/80 border border-dashed border-white/10 hover:border-[#FF7120]/25 rounded-lg hover:bg-[#FF7120]/5 transition"
            >
              + Process Additional PO for this MR
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderCeoHorizontalCards = () => {
    const poStatusMap = {
      pending: 'pending_approval',
      approved: 'approved',
      rejected: 'rejected'
    };
    const targetStatus = poStatusMap[activeTab] || 'pending_approval';
    const activePOs = purchaseOrders.filter(po => po.status === targetStatus);

    if (activePOs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 bg-[#001f35]/50 border border-white/5 rounded-2xl">
          <Package className="h-12 w-12 text-white/20 mb-3" />
          <p className="text-white/60 text-sm">No Purchase Orders found in this category.</p>
        </div>
      );
    }

    return (
      <div className="flex gap-6 overflow-x-auto pb-6 pt-2 snap-x scroll-smooth custom-scrollbar">
        {activePOs.map((po) => (
          <div 
            key={po.id} 
            className="w-full max-w-[480px] bg-[#002035] border border-white/10 rounded-2xl p-6 flex flex-col justify-between shrink-0 snap-start shadow-xl relative hover:border-[#FF7120]/40 transition"
          >
            <div className="space-y-4">
              <div className="flex justify-between items-start border-b border-white/10 pb-3">
                <div>
                  <h3 className="font-extrabold text-white text-base truncate max-w-[240px] uppercase">{po.supplier}</h3>
                  <p className="text-[11px] text-white/50 mt-1 uppercase font-bold">Project: {po.project_name}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border border-[#FF7120]/30 bg-[#FF7120]/10 text-[#FF7120] uppercase shrink-0">
                  {po.po_number || 'DRAFT PO'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Payment Terms</p>
                  <p className="text-white font-medium">{po.payment_terms || '-'}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Date</p>
                  <p className="text-white font-medium">{po.date || new Date(po.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">Bill To</p>
                  <p className="text-white font-medium">{po.bill_to || '-'}</p>
                </div>
                <div>
                  <p className="text-white/45 text-[9px] uppercase font-bold">MR Link</p>
                  <p className="text-white font-medium">MR-{po.material_request || po.mr_id}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/45 text-[9px] uppercase font-bold">Account Name & Number</p>
                  <p className="text-white font-medium truncate">{po.account_name} - {po.account_number}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-white/45 text-[9px] uppercase font-bold">RFP Reference Number</p>
                  <p className="text-white font-medium">{po.rfp_number || '-'}</p>
                </div>
              </div>

              {/* Items Summary Table */}
              <div>
                <p className="text-[#FFBE9B] text-[10px] uppercase font-extrabold tracking-wider mb-2">Itemized Materials</p>
                <div className="rounded-lg border border-white/5 bg-black/25 max-h-[160px] overflow-y-auto overflow-x-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-[#041e30] text-white/50 text-[9px] uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="px-2 py-1.5 text-left">Desc</th>
                        <th className="px-2 py-1.5 text-right w-16">Qty</th>
                        <th className="px-2 py-1.5 text-right w-24">Net Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(po.items || []).map((item, index) => (
                        <tr key={index} className="border-t border-white/5">
                          <td className="px-2 py-1.5 text-white truncate max-w-[180px]">{item.name}</td>
                          <td className="px-2 py-1.5 text-right text-white/70">{item.quantity} {item.unit}</td>
                          <td className="px-2 py-1.5 text-right font-semibold text-[#FFBE9B]">₱{Number(item.total).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between items-center bg-[#FF7120]/5 px-3 py-2 rounded-lg mt-2 border border-[#FF7120]/10">
                   <span className="text-[11px] font-bold text-white/80 uppercase">Total Amount:</span>
                   <span className="text-sm font-extrabold text-[#FF7120]">₱{(po.items || []).reduce((sum, i) => sum + Number(i.total), 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Decision slot for pending approval */}
            {po.status === 'pending_approval' && (
              <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                <textarea
                  id={`reason-${po.id}`}
                  placeholder="Rejection comment (required only if rejecting)..."
                  className="w-full text-xs bg-black/30 border border-white/10 rounded-lg p-2 text-white placeholder:text-white/30 focus:border-[#FF7120]/50 outline-none resize-none min-h-[50px]"
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePoApproval(po.id, 'approve')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 py-2 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition"
                  >
                    Approve PO
                  </button>
                  <button
                    onClick={() => {
                      const comment = document.getElementById(`reason-${po.id}`)?.value || '';
                      handlePoApproval(po.id, 'reject', comment);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 py-2 rounded-lg text-xs font-bold hover:bg-red-500/20 transition"
                  >
                    Reject PO
                  </button>
                </div>
              </div>
            )}
            
            {po.status === 'approved' && (
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                 <span>Approved by CEO</span>
                 <span className="font-semibold text-emerald-400">Approved</span>
              </div>
            )}

            {po.status === 'rejected' && (
              <div className="mt-4 pt-3 border-t border-white/10 text-xs">
                 <p className="text-red-400 font-bold">Rejected by CEO</p>
                 {po.rejection_reason && <p className="text-white/60 text-[11px] mt-1 bg-black/20 rounded p-2 italic">"{po.rejection_reason}"</p>}
              </div>
            )}

          </div>
        ))}
      </div>
    );
  };

  const renderSimpleListLayout = () => {
    const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) || TAB_CONFIG[0];
    const request = activeRequests.find(r => r.id === selectedRequestId);

    return (
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-1">
          <div className={`${cardClass} flex flex-col h-[70vh] min-h-[560px] lg:h-[740px] overflow-hidden`}>
            <div className="sticky top-0 z-10 p-5 border-b border-white/10 bg-[#001f35]/95 backdrop-blur-sm">
              {!(reviewerRole === 'studio_head' && activeTab === 'forwarded') && (
                <>
                  <p className="text-lg font-semibold text-white">{activeTabMeta?.label || 'Requests'}</p>
                  <p className="mt-1 text-sm text-white/55">{activeTabMeta?.description}</p>
                </>
              )}
              {reviewerRole !== 'studio_head' && (
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
              )}
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
             <div className={`${cardClass} flex flex-col items-center justify-center h-[70vh] min-h-[560px] lg:h-[740px] p-8`}>
                <Package className="w-12 h-12 text-white/20 mb-4" />
                <p className="text-white/60">Select a request to review details.</p>
             </div>
          )}
          {request && (
             <div className={`${cardClass} block h-[70vh] min-h-[560px] lg:h-[740px] p-6 overflow-y-auto`}>
               <RequestItemCard 
                 request={request}
                 index={activeRequests.findIndex(r => r.id === request.id)}
                 isExpanded={!expandedRequestIds.has(request.id)}
                 onToggleExpand={toggleExpandRequest}
                 onOpenForm={handleOpenForm}
                 userRole={reviewerRole}
                 actionSlot={renderApprovalActions()}
                 purchaseOrders={purchaseOrders}
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

      {/* Accounting Tally and Expenses tab navigation switcher */}
      {isAccounting && (
        <div className="flex border-b border-white/10 gap-6 mb-6">
          <button
            onClick={() => { setPageTab('tally'); setSelectedPoId(null); }}
            className={`pb-4 text-sm font-semibold border-b-2 transition ${
              pageTab === 'tally'
                ? 'border-[#FF7120] text-[#FF7120]'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Tally Disbursements
          </button>
          <button
            onClick={() => { setPageTab('expenses'); }}
            className={`pb-4 text-sm font-semibold border-b-2 transition ${
              pageTab === 'expenses'
                ? 'border-[#FF7120] text-[#FF7120]'
                : 'border-transparent text-white/60 hover:text-white'
            }`}
          >
            Project Expenses
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {reviewerRole === 'ceo' ? (
          pageTab === 'expenses' ? renderProjectListLayout(true) : renderSimpleListLayout()
        ) :
        (isAccounting ? (
          pageTab === 'tally' ? renderAccountingTallyLayout() : renderProjectListLayout(true)
        ) : (
          pageTab === 'expenses' ? renderProjectListLayout(true) : renderProjectListLayout(false)
        ))
      }

      {/* Modals */}
      <MaterialRequestFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        request={selectedRequestForForm}
        userRole={reviewerRole}
      />

      <StudioHeadPoCreationModal
        isOpen={isAllocationModalOpen}
        onClose={() => { setIsAllocationModalOpen(false); setIsApprovalPending(false); }}
        request={selectedRequestForAllocation}
        onSuccess={() => fetchRequests()}
        onApproveAndForward={isApprovalPending && selectedRequestForAllocation
          ? () => handleApproveRequest(selectedRequestForAllocation.id, pendingApprovalNote)
          : undefined
        }
      />
    </div>
  );
};

export default MaterialRequestReviewer;
