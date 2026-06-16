import React from 'react';
import { ChevronDown, ChevronUp, FileText, CheckCircle2 } from 'lucide-react';
import { formatDate } from './utils';
import MaterialRequestFormModal from '../../components/modals/MaterialRequestFormModal';
import MaterialRequestCommentThread from '../../components/MaterialRequestCommentThread';

const RequestItemCard = ({ 
  request, 
  index, 
  isExpanded, 
  onToggleExpand, 
  onOpenForm, 
  userRole, 
  actionSlot 
}) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#00273C]/45 overflow-hidden transition hover:border-white/15">
      {/* Compact header — always visible */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => onToggleExpand(request.id)}
          className="flex-1 min-w-0 flex items-center gap-3 text-left focus:outline-none rounded-lg p-1 hover:bg-white/5 transition -ml-1"
        >
          <span className="shrink-0 grid h-7 w-7 place-items-center rounded-lg bg-[#FF7120]/15 text-[#FF7120] text-xs font-bold">
            #{index + 1}
          </span>
          <div className="flex-1 min-w-0 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {request.created_by_name || request.created_by_email || 'Unknown'}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45 mt-0.5">
                <span className="capitalize">{request.priority || 'NORMAL'}</span>
                <span className="hidden sm:inline">·</span>
                <span>{formatDate(request.request_date)}</span>
                <span className="hidden sm:inline">·</span>
                <span>{request.items?.length || 0} item{(request.items?.length || 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:mt-0 pt-2 sm:pt-0 border-t border-white/5 sm:border-0 pl-10 sm:pl-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenForm(request);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/20 text-white text-xs font-medium rounded-lg hover:bg-white/10 transition"
          >
            <FileText className="h-3.5 w-3.5" />
            View Form
          </button>
          <button
            type="button"
            onClick={() => onToggleExpand(request.id)}
            className="p-1.5 hover:bg-white/10 rounded transition focus:outline-none hidden sm:block"
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
              <p className="text-white mt-0.5">{formatDate(request.request_date)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <p className="text-white/45 text-xs">Required Date</p>
              <p className="text-white mt-0.5">{formatDate(request.required_date)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <p className="text-white/45 text-xs">Priority</p>
              <p className="text-white mt-0.5 uppercase">{request.priority || 'NORMAL'}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
              <p className="text-white/45 text-xs">Location</p>
              <p className="text-white mt-0.5 truncate">{request.delivery_location || '-'}</p>
            </div>
          </div>

          {/* Notes */}
          {request.notes && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-white/45 text-xs">Notes</p>
              <p className="text-white/75 text-sm mt-1">{request.notes}</p>
            </div>
          )}

          {/* Accounting Formal Proof Details */}
          {(request.accounting_notes || request.accounting_receipt) && (
            <details className="group rounded-xl border border-[#04434a] bg-[#022127] overflow-hidden [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none hover:bg-[#032e36] transition">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#00e699]" />
                  <p className="text-[#00e699] text-xs font-bold uppercase tracking-wider">Fund Allocation Record</p>
                </div>
                <ChevronDown className="h-4 w-4 text-[#00e699]/50 group-open:rotate-180 transition-transform" />
              </summary>
              
              <div className="px-4 pb-4 border-t border-[#04434a] pt-4">
                {request.budget_allocated && (
                  <p className="text-[#00e699] font-bold mb-4 text-sm">
                    Released Amount: ₱{Number(request.budget_allocated).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </p>
                )}

                {request.accounting_notes && (
                  <div className="bg-[#01141a] rounded-lg p-3 mb-4 border border-[#04434a]">
                    <p className="text-[#00e699]/70 text-[10px] uppercase mb-1 font-bold">Accounting Notes</p>
                    <p className="text-[#ccfbf0] text-sm whitespace-pre-wrap">{request.accounting_notes}</p>
                  </div>
                )}

                {request.accounting_receipt && (
                  <div>
                    <p className="text-[#00e699]/70 text-[10px] uppercase mb-2 font-bold">Attached Proof</p>
                    <a href={request.accounting_receipt} target="_blank" rel="noopener noreferrer" className="block w-full max-w-sm group/img relative">
                      <img src={request.accounting_receipt} alt="Accounting Proof" className="w-full h-auto rounded-lg border border-[#04434a] shadow-md transition group-hover/img:brightness-110" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition bg-black/40 rounded-lg backdrop-blur-sm">
                         <span className="bg-[#00e699] text-[#01141a] px-3 py-1.5 rounded-lg text-xs font-bold shadow-xl">View Full Document</span>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Inline Form View (no image) or Attachment (image exists) */}
          {(!request.request_image && request.items?.length > 0) ? (
            <div className="mt-2 mb-4 border border-[#FF7120]/30 rounded-xl overflow-hidden shadow-lg bg-white overflow-x-auto print-container-wrapper">
              <MaterialRequestFormModal 
                isOpen={true} 
                request={request} 
                userRole={userRole} 
                inline={true} 
              />
            </div>
          ) : request.request_image ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-center">
              <p className="text-white/45 text-xs text-left mb-2">Attachment</p>
              <a href={request.request_image} target="_blank" rel="noopener noreferrer" className="inline-block w-full max-w-xs group relative">
                <img src={request.request_image} alt="Request" className="w-full h-auto rounded-lg border border-white/10 transition group-hover:brightness-110" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/20 rounded-lg">
                   <span className="bg-[#FF7120] text-white px-3 py-1.5 rounded-lg text-xs font-medium">View Full Image</span>
                </div>
              </a>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white/45 text-xs">Materials List</p>
                <span className="text-[10px] text-white/50">{request.items?.length || 0} item(s)</span>
              </div>
              <p className="text-xs text-white/40 italic text-center py-4">No materials listed or image attached.</p>
            </div>
          )}

          {/* Discussion thread and actions */}
          <div className="border-t border-white/10 pt-4 flex flex-col gap-6">
            <MaterialRequestCommentThread 
              requestId={request.id} 
            />
            {actionSlot}
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestItemCard;
