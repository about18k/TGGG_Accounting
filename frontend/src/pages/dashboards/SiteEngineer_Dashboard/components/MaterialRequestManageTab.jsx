import React from 'react';
import { Clock3, AlertTriangle, CheckCircle2, XCircle, FileText, Send, Trash2, Image as ImageIcon } from 'lucide-react';
import { CardSkeleton } from '../../../../components/SkeletonLoader';
import MaterialRequestCommentThread from '../../../../components/MaterialRequestCommentThread';
import { getRequestStage, isStudioHeadRejected, normalizeRequestImageUrl, formatDate } from '../../../../hooks/useMaterialRequests';

const STATUS_META = {
  draft: {
    label: 'Draft',
    className: 'bg-white/5 text-white/70 border-white/10',
  },
  pending_studio_head: {
    label: 'Pending Studio Head Review',
    className: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
  },
  pending_ceo: {
    label: 'Forwarded to CEO',
    className: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
  },
  approved: {
    label: 'Approved by CEO',
    className: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/10 text-red-200 border-red-500/20',
  },
};

const MaterialRequestManageTab = ({
  requests,
  loading,
  user,
  actionRequestId,
  startEditingRequest,
  submitExistingRequest,
  setSelectedRequestForModal,
  setIsFormModalOpen,
  openDeleteDraftConfirm,
  cardClass
}) => {
  return (
    <div className={`${cardClass} p-6`}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">My Material Requests</h2>
        <p className="text-sm text-white/50 mt-1">Manage your own material requests throughout the approval workflow.</p>
      </div>

      {loading && <CardSkeleton />}

      {!loading && requests.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-white/70 font-medium">No material requests yet.</p>
          <p className="text-white/45 text-sm mt-1">Create a request and submit it to start the Studio Head → CEO approval chain.</p>
        </div>
      )}

      {!loading && requests.length > 0 && (
        <div className="space-y-4">
          {requests.map((request) => {
            const stage = getRequestStage(request);
            const statusMeta = STATUS_META[stage] || STATUS_META.draft;
            const rejectedByStudioHead = isStudioHeadRejected(request);
            const requestImageUrl = normalizeRequestImageUrl(request.request_image);
            const canSubmit = request.status === 'draft' || rejectedByStudioHead;
            const canEdit = request.status === 'draft' || rejectedByStudioHead;
            const canDelete = request.status === 'draft';

            return (
              <div key={request.id} className="rounded-2xl border border-white/10 bg-[#00273C]/45 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{request.project_name}</h3>
                    <p className="text-xs text-white/50 mt-1">
                      Requested {formatDate(request.request_date)} · Required {formatDate(request.required_date)}
                    </p>
                  </div>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}>
                    {statusMeta.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-white/45 text-xs">Priority</p>
                    <p className="text-white mt-1 capitalize">{request.priority}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-white/45 text-xs">Delivery Location</p>
                    <p className="text-white mt-1">{request.delivery_location}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-white/45 text-xs">Materials</p>
                  <p className="text-white mt-1">
                    {request.item_count || request.items?.length || 0} item(s)
                  </p>
                  {Array.isArray(request.items) && request.items.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {request.items.slice(0, 6).map((item) => (
                        <span key={item.id} className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/80 border border-white/10">
                          {item.name} ({item.quantity} {item.unit})
                        </span>
                      ))}
                      {request.items.length > 6 && (
                        <span className="text-xs px-2 py-1 rounded-lg bg-white/10 text-white/70 border border-white/10">
                          +{request.items.length - 6} more
                        </span>
                      )}
                    </div>
                  ) : (
                    requestImageUrl && (
                      <div className="mt-2 text-xs text-white/50 italic flex items-center gap-1.5">
                        <ImageIcon className="h-3 w-3" />
                        Photo-based request (no items listed)
                      </div>
                    )
                  )}
                </div>

                {requestImageUrl && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3">
                    <p className="text-white/45 text-xs">Request Attachment</p>
                    <a
                      href={requestImageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block group"
                      title="Open attached request image"
                    >
                      <img
                        src={requestImageUrl}
                        alt={`${request.project_name || 'Material request'} attachment`}
                        className="w-24 h-24 object-cover rounded-lg border border-blue-500/30 bg-[#001f35] shadow-sm group-hover:brightness-110 transition"
                      />
                    </a>
                    <p className="text-xs text-blue-200/80 mt-2">
                      {request.project_name || 'Material request'} attachment
                    </p>
                  </div>
                )}

                {request.studio_head_comments && (
                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/70">Studio Head Note</p>
                    <p className="text-sm text-cyan-100 mt-1">{request.studio_head_comments}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => startEditingRequest(request)}
                      disabled={actionRequestId === request.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/35 text-cyan-100 text-sm font-medium hover:bg-cyan-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {rejectedByStudioHead ? 'Edit Rejected Request' : 'Edit Draft'}
                    </button>
                  )}

                  {canSubmit && (
                    <button
                      type="button"
                      onClick={() => submitExistingRequest(request)}
                      disabled={actionRequestId === request.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF7120] text-white text-sm font-medium hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
                      {actionRequestId === request.id
                        ? 'Submitting...'
                        : (rejectedByStudioHead ? 'Resubmit to Studio Head' : 'Submit to Studio Head')}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequestForModal(request);
                      setIsFormModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition"
                  >
                    <FileText className="h-4 w-4" />
                    View Form
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => openDeleteDraftConfirm(request)}
                      disabled={actionRequestId === request.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-400/35 text-red-200 text-sm font-medium hover:bg-red-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Draft
                    </button>
                  )}

                  {stage === 'pending_studio_head' && (
                    <span className="inline-flex items-center gap-2 text-blue-200 text-sm">
                      <Clock3 className="h-4 w-4" />
                      Waiting for Studio Head review.
                    </span>
                  )}

                  {stage === 'pending_ceo' && (
                    <span className="inline-flex items-center gap-2 text-cyan-200 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      Passed Studio Head and now waiting for CEO final decision.
                    </span>
                  )}

                  {stage === 'approved' && (
                    <span className="inline-flex items-center gap-2 text-emerald-200 text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      Approved by CEO.
                    </span>
                  )}

                  {stage === 'rejected' && (
                    <div className="inline-flex items-center gap-2 text-red-200 text-sm">
                      <XCircle className="h-4 w-4" />
                      {rejectedByStudioHead
                        ? 'Rejected by Studio Head. Revise and resubmit.'
                        : 'Rejected by CEO. Final decision reached.'}
                    </div>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <MaterialRequestCommentThread requestId={request.id} currentUser={user} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MaterialRequestManageTab;
