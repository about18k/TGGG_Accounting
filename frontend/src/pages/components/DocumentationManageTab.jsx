import React from 'react';
import { CheckCircle2, FolderOpen } from 'lucide-react';
import { CardSkeleton } from '../../components/SkeletonLoader';
import CommentThread from '../../components/CommentThread';
import { Badge, EmptyStatePanel } from './DocumentationShared';

export function DocumentationManageTab({ hookState, user }) {
    const {
        fetchDocumentations,
        manageSubTab, setManageSubTab,
        manageStatusFilter, setManageStatusFilter,
        savedDocs, completedManageDocs, manageDocs,
        loading,
        getDisplayType,
        openImageZoom,
        isPreviewExpanded, togglePreviewExpanded,
        startEditingDocumentation,
        submitForReview,
        deleteDocumentation,
        getStatusColor, getStatusLabel,
        isStudioHeadRejected
    } = hookState;

    const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

    return (
        <div className={cardClass}>
            <div className="p-4 sm:p-6 border-b border-white/10">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                    <div className="max-w-2xl text-left space-y-1.5">
                        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight text-white">Manage Documentation</h2>
                        <p className="text-sm leading-relaxed text-white/65">View, edit, delete, or submit your documentation for review.</p>
                    </div>

                    <div className="self-start lg:self-start flex flex-col items-start lg:items-end gap-2.5 w-full lg:w-auto">
                        <button
                            onClick={() => fetchDocumentations()}
                            className="px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 text-white/75 text-xs sm:text-sm hover:bg-white/20 transition"
                        >
                            Refresh
                        </button>

                        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 sm:gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-2.5 py-2.5 w-full lg:w-auto">
                            <button
                                type="button"
                                onClick={() => setManageSubTab('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                    manageSubTab === 'all'
                                        ? 'bg-[#FF7120]/20 text-[#FFb07a] border border-[#FF7120]/40'
                                        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                All Requests ({savedDocs.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setManageSubTab('completed')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                                    manageSubTab === 'completed'
                                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40'
                                        : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                                }`}
                            >
                                Completed ({completedManageDocs.length})
                            </button>

                            <div className="h-5 w-px bg-white/15 hidden sm:block" />

                            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55 whitespace-nowrap">Status</label>
                            <select
                                value={manageSubTab === 'completed' ? 'approved' : manageStatusFilter}
                                onChange={(e) => setManageStatusFilter(e.target.value)}
                                disabled={manageSubTab === 'completed'}
                                className="w-full sm:w-36 rounded-lg border border-white/15 bg-[#00273C]/70 px-3 py-1.5 text-xs text-white outline-none focus:border-[#FF7120]/50 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <option value="all">All</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                                <option value="approved">Approved</option>
                            </select>
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
                {!loading && manageDocs.length === 0 && (
                    <EmptyStatePanel
                        Icon={manageSubTab === 'completed' ? CheckCircle2 : FolderOpen}
                        accent={manageSubTab === 'completed' ? 'green' : 'orange'}
                        title={manageSubTab === 'completed' ? 'No completed documentation yet' : 'Nothing matched your filter'}
                        subtitle={manageSubTab === 'completed'
                            ? 'Approved documentation will appear here once review is completed.'
                            : 'Try changing the status filter or create a new documentation draft.'}
                    />
                )}
                {!loading && manageDocs.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-fr">
                        {manageDocs.map((doc) => {
                            const files = doc.files || [];
                            const previewableImages = files.filter((file) => (file.is_image || file.file_type === 'image') && file.file_url);
                            const rejectedByStudioHead = isStudioHeadRejected(doc);
                            const canSubmitForReview = doc.status === 'draft' || rejectedByStudioHead;
                            const canEdit = doc.status === 'draft' || rejectedByStudioHead;

                            return (
                            <div key={doc.id} className="h-full rounded-2xl border border-white/10 bg-[#00273C]/45 overflow-hidden p-3 sm:p-5 gap-3 sm:gap-4 hover:border-white/20 transition flex flex-col">
                                <div className="space-y-3 pb-3 border-b border-white/10">
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base sm:text-lg font-semibold text-white leading-snug truncate">{doc.title}</h3>
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

                                {previewableImages.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">Image Preview</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {previewableImages.slice(0, isPreviewExpanded('manage', doc.id) ? previewableImages.length : 3).map((file) => (
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
                                                onClick={() => togglePreviewExpanded('manage', doc.id)}
                                                className="text-xs font-semibold text-[#7ec8ff] hover:text-[#9dd8ff] transition"
                                            >
                                                {isPreviewExpanded('manage', doc.id)
                                                    ? 'Show fewer images'
                                                    : `+ ${previewableImages.length - 3} more image(s)`}
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <EmptyStatePanel
                                        Icon={FolderOpen}
                                        compact
                                        title="No attachments included"
                                        subtitle="No files were attached to this documentation entry."
                                    />
                                )}

                                {(canSubmitForReview || canEdit) && (
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                                        {canEdit && (
                                            <button
                                                onClick={() => startEditingDocumentation(doc)}
                                                disabled={loading}
                                                className="px-3 sm:px-4 rounded-lg border border-cyan-400/35 text-cyan-200 text-[10px] sm:text-xs font-semibold py-1.5 sm:py-2 hover:bg-cyan-500/10 transition disabled:opacity-50"
                                            >
                                                {rejectedByStudioHead ? 'Edit Rejected' : 'Edit Draft'}
                                            </button>
                                        )}
                                        {canSubmitForReview && (
                                            <button
                                                onClick={() => submitForReview(doc)}
                                                disabled={loading}
                                                className="flex-1 min-w-0 rounded-lg bg-emerald-600/20 text-emerald-300 text-[10px] sm:text-xs font-semibold py-1.5 sm:py-2 hover:bg-emerald-600/30 transition disabled:opacity-50"
                                            >
                                                {rejectedByStudioHead ? 'Resubmit' : 'Submit for Review'}
                                            </button>
                                        )}
                                        {doc.status === 'draft' && (
                                            <button
                                                onClick={() => deleteDocumentation(doc.id)}
                                                disabled={loading}
                                                className="px-3 sm:px-4 rounded-lg bg-red-600/20 text-red-300 text-[10px] sm:text-xs font-semibold py-1.5 sm:py-2 hover:bg-red-600/30 transition disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                )}

                                {doc.status === 'rejected' && (
                                    <div className="pt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <p className="text-xs text-red-300">
                                            {rejectedByStudioHead
                                                ? 'Rejected by Studio Head. Please revise and resubmit.'
                                                : 'Rejected at final review.'}
                                        </p>
                                        {(doc.studio_head_comments || doc.ceo_comments) && (
                                            <p className="text-xs text-red-300/80 mt-1 line-clamp-2">{doc.ceo_comments || doc.studio_head_comments}</p>
                                        )}
                                    </div>
                                )}

                                </div>

                                {doc.status !== 'draft' && (
                                    <div className="mt-auto pt-3 border-t border-white/10">
                                        <CommentThread docId={doc.id} currentUser={user} collapsible />
                                    </div>
                                )}
                            </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
