import React, { useEffect, useState } from 'react';
import { Package, RefreshCcw, FileText, Search, Calendar, User, MapPin, Image as ImageIcon } from 'lucide-react';
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
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <div className="flex flex-col min-w-0 justify-center">
                            <h3 className="font-bold text-white truncate text-sm">{request.project_name}</h3>
                          </div>
                          {(() => {
                            const priority = (request.priority || 'Normal').toUpperCase();
                            const pColors = {
                              URGENT: 'text-red-400 bg-red-400/10 border-red-400/20',
                              HIGH: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
                              NORMAL: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                            };
                            const colorClass = pColors[priority] || pColors.NORMAL;
                            return (
                              <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded border ${colorClass}`}>
                                {priority}
                              </span>
                            );
                          })()}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs pt-2.5 border-t border-white/5 gap-2">
                          <div className="flex items-center gap-1.5 text-white/60 min-w-0">
                            <User className="w-3.5 h-3.5 shrink-0 opacity-70" /> 
                            <span className="truncate">{request.created_by_name || 'System User'}</span>
                            <span className="shrink-0 text-[8px] uppercase tracking-wider px-1.5 py-0.5 bg-white/5 rounded text-white/50 border border-white/10">
                              {request.requester_role ? request.requester_role.replace('_', ' ') : 'Staff'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-white/50 shrink-0">
                            <Calendar className="w-3.5 h-3.5 shrink-0 opacity-70" /> 
                            <span>{new Date(request.request_date).toLocaleDateString()}</span>
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
                      {(!selectedRequest || selectedRequest.request_image || !(selectedRequest.items?.length > 0)) && (
                        <button
                          onClick={() => openModal(selectedRequest)}
                          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-[#FF7120] text-white rounded-xl text-sm font-semibold shadow-lg shadow-[#FF7120]/20 hover:scale-105 transition-transform active:scale-95"
                        >
                          <FileText className="h-4 w-4" />
                          View Form
                        </button>
                      )}
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



                    {(!selectedRequest.request_image && selectedRequest.items?.length > 0) ? (
                      <div className="mt-2 mb-6 border border-[#FF7120]/30 rounded-xl overflow-hidden shadow-lg bg-white overflow-x-auto print-container-wrapper">
                        <MaterialRequestFormModal 
                          isOpen={true} 
                          request={selectedRequest} 
                          userRole="accounting" 
                          inline={true} 
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
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
                    )}

                    {selectedRequest.request_image && (
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-4">
                        <p className="text-white/45 text-[11px] uppercase tracking-widest font-semibold mb-3">Material Request Image</p>
                        <a 
                          href={selectedRequest.request_image} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block w-full max-w-sm group relative mx-auto"
                        >
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
                    )}


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
