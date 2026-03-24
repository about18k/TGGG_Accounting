import React, { useEffect, useState } from 'react';
import { Package, RefreshCcw, FileText, Search, Calendar, User, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import materialRequestService from '../../../services/materialRequestService';
import MaterialRequestFormModal from '../../../components/modals/MaterialRequestFormModal';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg';

const AccountingMaterialRequestPage = ({ user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const filteredRequests = requests.filter(req => 
    req.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.created_by_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    req.id.toString().includes(searchQuery)
  );

  useEffect(() => {
    // Auto-select the first request if none is selected
    if (filteredRequests.length > 0 && !selectedRequest) {
      setSelectedRequest(filteredRequests[0]);
    }
  }, [filteredRequests, selectedRequest]);

  const openModal = (request) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Package className="h-6 w-6 text-[#FF7120]" />
              Approved Material Requests
            </h1>
            <p className="text-white/60 text-sm mt-1">Review and print finalized material requisition forms for procurement.</p>
          </div>
          <button
            onClick={fetchRequests}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* Left Section: Request List */}
            <div className="lg:col-span-1">
              <div className="flex flex-col h-full bg-black/20 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 bg-white/5">
                  <h2 className="text-lg font-bold text-white">Approved Requests</h2>
                  <p className="text-xs text-white/50">{filteredRequests.length} total</p>
                </div>
                
                <div className="p-3 overflow-y-auto max-h-[700px] space-y-2 pr-1">
                  {loading ? (
                    <div className="py-10 text-center text-white/50 text-sm font-bold">Loading requests...</div>
                  ) : filteredRequests.length === 0 ? (
                    <div className="py-10 text-center text-white/40 text-sm font-medium">No approved requests found.</div>
                  ) : (
                    filteredRequests.map((request) => (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => setSelectedRequest(request)}
                        className={`w-full text-left p-4 rounded-xl border transition ${
                          selectedRequest?.id === request.id 
                            ? 'bg-[#FF7120]/10 border-[#FF7120]/50 shadow-[0_0_15px_rgba(255,113,32,0.15)]' 
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/20'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-bold text-white truncate text-sm">{request.project_name}</h3>
                        </div>
                        <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-black">M.R-{request.id} • {(request.priority || 'Normal').toUpperCase()}</p>
                        
                        <div className="mt-3 grid gap-1.5 text-xs text-white/60">
                           <div className="flex items-center gap-2 min-w-0">
                              <User className="w-3.5 h-3.5 shrink-0 text-white/40" /> 
                              <span className="truncate">{request.created_by_name || 'System User'}</span>
                           </div>
                           <div className="flex items-center gap-2 min-w-0">
                              <Calendar className="w-3.5 h-3.5 shrink-0 text-white/40" /> 
                              <span className="truncate">{new Date(request.request_date).toLocaleDateString()}</span>
                           </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Section: Request Details */}
            <div className="lg:col-span-2">
              <div className="flex flex-col h-full bg-black/20 rounded-xl border border-white/10 p-6">
                {!selectedRequest && !loading ? (
                  <div className="h-full flex flex-col items-center justify-center py-20">
                    <Package className="h-12 w-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 font-medium font-bold">Select an approved request to view details.</p>
                  </div>
                ) : selectedRequest ? (
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-[#FF7120]/70 shrink-0" />
                          <h3 className="text-2xl font-semibold text-white truncate">{selectedRequest.project_name}</h3>
                        </div>
                        <p className="text-xs text-white/50 mt-1 flex items-center gap-2">
                          <span className="uppercase tracking-widest font-bold">M.R-{selectedRequest.id}</span>
                          <span>·</span>
                          <span>Requested {new Date(selectedRequest.request_date).toLocaleDateString()}</span>
                          <span>·</span>
                          <span>Required {selectedRequest.required_date ? new Date(selectedRequest.required_date).toLocaleDateString() : 'N/A'}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => openModal(selectedRequest)}
                        className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-[#FF7120] text-white rounded-xl text-sm font-semibold shadow-lg shadow-[#FF7120]/20 hover:scale-105 transition-transform active:scale-95"
                      >
                        <FileText className="h-4 w-4" />
                        View Form
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-white/45 text-[11px] uppercase tracking-widest font-semibold mb-2">Requester</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <User className="h-4 w-4 text-[#FF7120]" />
                          <span className="text-white font-medium">{selectedRequest.created_by_name}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-white/5 rounded-md border border-white/10 text-white/60">
                            {selectedRequest.requester_role ? selectedRequest.requester_role.replace('_', ' ') : 'Staff'}
                          </span>
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                        <p className="text-white/45 text-[11px] uppercase tracking-widest font-semibold mb-2">Delivery Location</p>
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-4 w-4 text-[#FF7120]" />
                          <p className="text-white">{selectedRequest.delivery_location || 'Not Specified'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4">
                        <p className="text-cyan-200/70 text-[11px] uppercase tracking-widest font-semibold mb-2">Studio Head Approval</p>
                        <div className="mt-1">
                          <p className="text-cyan-100 font-medium">{selectedRequest.reviewed_by_studio_head_name || 'System Approved'}</p>
                          <p className="text-[10px] text-cyan-500 mt-0.5">
                            {selectedRequest.studio_head_reviewed_at ? new Date(selectedRequest.studio_head_reviewed_at).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                        <p className="text-emerald-200/70 text-[11px] uppercase tracking-widest font-semibold mb-2">CEO / President Approval</p>
                        <div className="mt-1">
                          <p className="text-emerald-100 font-medium">{selectedRequest.reviewed_by_ceo_name || 'Final Approval'}</p>
                          <p className="text-[10px] text-emerald-500 mt-0.5">
                            {selectedRequest.ceo_reviewed_at ? new Date(selectedRequest.ceo_reviewed_at).toLocaleString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4 flex-1">
                      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                        <p className="text-white/45 text-[11px] uppercase tracking-widest font-semibold">Materials List</p>
                        <span className="text-[10px] text-white/50">{selectedRequest.items?.length || 0} item(s)</span>
                      </div>
                      {selectedRequest.items?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.items.map((item, idx) => (
                            <span key={item.id || idx} className="text-sm px-3 py-1.5 rounded-lg bg-white/5 text-white/90 border border-white/10 flex items-center gap-2">
                              <span>{item.name}</span>
                              <span className="text-[#FF7120] font-semibold">{item.quantity} {item.unit}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/40 italic">Materials detailed in the attached photo.</p>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
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
