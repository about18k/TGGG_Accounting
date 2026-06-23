import React from 'react';
import { CheckCircle2, Clock3 } from 'lucide-react';
import { CardSkeleton } from '../../components/SkeletonLoader';
import CommentThread from '../../components/CommentThread';
import { Badge, EmptyStatePanel } from './DocumentationShared';

export function DocumentationJuniorReviewTab({ hookState, user }) {
    const {
        fetchDocumentations,
        juniorOutcomeFilter, setJuniorOutcomeFilter,
        juniorPendingReviewDocs, juniorApprovedDocs, juniorRejectedDocs,
        loading, juniorOutcomeDocs,
        getDisplayType, openImageZoom, isPreviewExpanded, togglePreviewExpanded,
        getStatusColor, getStatusLabel,
        reviewComments, setReviewComment,
        handleJuniorReviewDecision, decisionLoadingByDoc
    } = hookState;

    const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

    return (
        <div className={cardClass}>
            <div className="p-4 sm:p-6 border-b border-white/10">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                    <div className="max-w-2xl text-left space-y-1.5">
                        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight text-white">Junior Architect Review</h2>
                        <p className="text-sm leading-relaxed text-white/65">
                            Review Junior Architect documentation pending approval, then browse finalized approvals.
                        </p>
                    </div>
                    <div className="self-start sm:self-end flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => fetchDocumentations()}
                            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 text-white/75 text-xs sm:text-sm hover:bg-white/20 transition"
                        >
                            Refresh
                        </button>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2.5 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => setJuniorOutcomeFilter('pending')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                    juniorOutcomeFilter === 'pending'
                                        ? 'bg-[#FF7120]/20 text-[#FFb07a] border border-[#FF7120]/40'
                                        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                Pending ({juniorPendingReviewDocs.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setJuniorOutcomeFilter('approved')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                    juniorOutcomeFilter === 'approved'
                                        ? 'bg-[#FF7120]/20 text-[#FFb07a] border border-[#FF7120]/40'
                                        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                Approved ({juniorApprovedDocs.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setJuniorOutcomeFilter('rejected')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                    juniorOutcomeFilter === 'rejected'
                                        ? 'bg-[#FF7120]/20 text-[#FFb07a] border border-[#FF7120]/40'
                                        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                Rejected ({juniorRejectedDocs.length})
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6">
                {loading && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <CardSkeleton />
                        <CardSkeleton />
                    </div>
                )}

                {!loading && juniorOutcomeDocs.length === 0 && (
                    <EmptyStatePanel
                        Icon={juniorOutcomeFilter === 'approved' ? CheckCircle2 : Clock3}
                        accent={juniorOutcomeFilter === 'approved' ? 'green' : 'orange'}
                        title={juniorOutcomeFilter === 'pending'
                            ? 'No pending approvals'
                            : (juniorOutcomeFilter === 'rejected' ? 'No rejected submissions yet' : 'No approved submissions yet')}
                        subtitle={juniorOutcomeFilter === 'pending'
                            ? 'Junior Architect submissions awaiting BIM, Studio Head, or CEO approval will show here.'
                            : (juniorOutcomeFilter === 'rejected'
                                ? 'Rejected Junior Architect documentation will show here when available.'
                                : 'Approved Junior Architect documentation will show here once finalized.')}
                    />
                )}

                {!loading && juniorOutcomeFilter === 'pending' && juniorPendingReviewDocs.length > 0 && (
                    <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-fr">
                            {juniorPendingReviewDocs.map((doc) => {
                                const files = doc.files || [];
                                const previewableImages = files.filter((file) => (file.is_image || file.file_type === 'image') && file.file_url);
                                const commentValue = reviewComments[doc.id] || '';
                                const decisionLoading = Boolean(decisionLoadingByDoc[doc.id]);
                                const canBimDecide = doc.status === 'pending_bim_review' && !doc.reviewed_by_bim;

                                return (
                                    <div key={doc.id} className="h-full rounded-2xl border border-white/10 bg-[#00273C]/45 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4 hover:border-white/20 transition flex flex-col">
                                        <div className="space-y-3 pb-3 border-b border-white/10">
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base sm:text-lg font-semibold text-white leading-snug truncate">{doc.title}</h3>
                                                    <p className="text-xs text-white/50 mt-1">By: {doc.created_by_name || doc.created_by_email || 'Junior Architect'}</p>
                                                </div>
                                                <Badge tone={getStatusColor(doc)}>{getStatusLabel(doc)}</Badge>
                                            </div>

                                            <div className="flex gap-2.5 flex-wrap">
                                                <Badge tone="neutral">Doc Date: {doc.doc_date || '-'}</Badge>
                                                <Badge tone="neutral">Document Type: {getDisplayType(doc.doc_type)}</Badge>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-3 pt-1">
                                        {doc.description && (
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">Description</p>
                                                <p className="text-sm leading-relaxed text-white/80 line-clamp-3">{doc.description}</p>
                                            </div>
                                        )}

                                        {previewableImages.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">Image Preview</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {previewableImages.slice(0, isPreviewExpanded('junior-pending', doc.id) ? previewableImages.length : 3).map((file) => (
                                                        <button
                                                            key={file.id}
                                                            type="button"
                                                            onClick={() => openImageZoom(file)}
                                                            className="group overflow-hidden rounded-lg border border-white/10 bg-black/20"
                                                            title={`Open ${file.file_name}`}
                                                        >
                                                            <img
                                                                src={file.file_url}
                                                                alt={file.file_name}
                                                                className="h-24 w-full object-cover transition group-hover:scale-105"
                                                                loading="lazy"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                                {previewableImages.length > 3 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => togglePreviewExpanded('junior-pending', doc.id)}
                                                        className="text-xs font-semibold text-[#7ec8ff] hover:text-[#9dd8ff] transition"
                                                    >
                                                        {isPreviewExpanded('junior-pending', doc.id)
                                                            ? 'Show fewer images'
                                                            : `+ ${previewableImages.length - 3} more image(s)`}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        </div>

                                        {canBimDecide && (
                                            <>
                                                <div className="space-y-2 pt-3 border-t border-white/10">
                                                    <label className="block text-xs font-semibold text-white/70">Review Comment</label>
                                                    <textarea
                                                        value={commentValue}
                                                        onChange={(e) => setReviewComment(doc.id, e.target.value)}
                                                        rows={3}
                                                        placeholder="Add BIM review feedback (required when rejecting)."
                                                        className="w-full rounded-lg border border-white/15 bg-[#00273C]/60 px-3 py-2 text-xs text-white placeholder:text-white/45 outline-none resize-none focus:border-[#FF7120]/50"
                                                    />
                                                </div>

                                                <div className="flex gap-2 pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleJuniorReviewDecision(doc.id, 'approve')}
                                                        disabled={decisionLoading}
                                                        className="flex-1 rounded-lg bg-emerald-600/20 text-emerald-300 text-xs font-semibold py-2 hover:bg-emerald-600/30 transition disabled:opacity-50"
                                                    >
                                                        {decisionLoading ? 'Processing...' : 'Approve'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleJuniorReviewDecision(doc.id, 'reject')}
                                                        disabled={decisionLoading}
                                                        className="flex-1 rounded-lg bg-red-600/20 text-red-300 text-xs font-semibold py-2 hover:bg-red-600/30 transition disabled:opacity-50"
                                                    >
                                                        {decisionLoading ? 'Processing...' : 'Reject'}
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                )}

                {!loading && juniorOutcomeFilter !== 'pending' && juniorOutcomeDocs.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-fr">
                        {juniorOutcomeDocs.map((doc) => {
                            const files = doc.files || [];
                            const previewableImages = files.filter((file) => (file.is_image || file.file_type === 'image') && file.file_url);

                            return (
                                <div key={doc.id} className="h-full rounded-2xl border border-white/10 bg-[#00273C]/45 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4 hover:border-white/20 transition flex flex-col">
                                    <div className="space-y-3 pb-3 border-b border-white/10">
                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-base sm:text-lg font-semibold text-white leading-snug truncate">{doc.title}</h3>
                                                <p className="text-xs text-white/50 mt-1">By: {doc.created_by_name || doc.created_by_email || 'Junior Architect'}</p>
                                            </div>
                                            <Badge tone={getStatusColor(doc)}>
                                                {getStatusLabel(doc)}
                                            </Badge>
                                        </div>

                                        <div className="flex gap-2.5 flex-wrap">
                                            <Badge tone="neutral">Doc Date: {doc.doc_date || '-'}</Badge>
                                            <Badge tone="neutral">Document Type: {getDisplayType(doc.doc_type)}</Badge>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-3 pt-1">
                                    {doc.description && (
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">Description</p>
                                            <p className="text-sm leading-relaxed text-white/80 line-clamp-2">{doc.description}</p>
                                        </div>
                                    )}

                                    {previewableImages.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">Image Preview</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {previewableImages.slice(0, isPreviewExpanded('junior-approved', doc.id) ? previewableImages.length : 3).map((file) => (
                                                    <button
                                                        key={file.id}
                                                        type="button"
                                                        onClick={() => openImageZoom(file)}
                                                        className="group overflow-hidden rounded-lg border border-white/10 bg-black/20"
                                                        title={`Open ${file.file_name}`}
                                                    >
                                                        <img
                                                            src={file.file_url}
                                                            alt={file.file_name}
                                                            className="h-24 w-full object-cover transition group-hover:scale-105"
                                                            loading="lazy"
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                            {previewableImages.length > 3 && (
                                                <button
                                                    type="button"
                                                    onClick={() => togglePreviewExpanded('junior-approved', doc.id)}
                                                    className="text-xs font-semibold text-[#7ec8ff] hover:text-[#9dd8ff] transition"
                                                >
                                                    {isPreviewExpanded('junior-approved', doc.id)
                                                        ? 'Show fewer images'
                                                        : `+ ${previewableImages.length - 3} more image(s)`}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {doc.ceo_comments && (
                                        <div className="pt-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                            <p className="text-xs text-green-300">CEO Note</p>
                                            <p className="text-xs text-green-200/80 mt-1 line-clamp-2">{doc.ceo_comments}</p>
                                        </div>
                                    )}

                                    </div>

                                    <div className="mt-auto pt-3 border-t border-white/10">
                                        <CommentThread docId={doc.id} currentUser={user} collapsible />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
