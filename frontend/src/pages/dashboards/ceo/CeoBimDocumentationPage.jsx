import React, { useEffect, useMemo, useState } from 'react';
import {
    CalendarDays,
    CheckCircle2,
    Clock3,
    FileText,
    FolderKanban,
    RefreshCcw,
    Search,
    User2,
    XCircle,
} from 'lucide-react';
import bimDocumentationService from '../../../services/bimDocumentationService';
import CommentThread from '../../../components/CommentThread';
import { toast } from 'sonner';
import { CardSkeleton } from '../../../components/SkeletonLoader';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

const TAB_CONFIG = [
    {
        id: 'pending',
        label: 'Needs Decision',
        description: 'Ready for your final approval',
        icon: Clock3,
        emptyText: 'No documentation is waiting for your decision.',
    },
    {
        id: 'approved',
        label: 'Approved',
        description: 'Finalized by the CEO',
        icon: CheckCircle2,
        emptyText: 'No approved documentation yet.',
    },
    {
        id: 'rejected',
        label: 'Rejected',
        description: 'Sent back for revision',
        icon: XCircle,
        emptyText: 'No rejected documentation.',
    },
];

const STATUS_TO_TAB_ID = {
    pending_ceo_review: 'pending',
    approved: 'approved',
    rejected: 'rejected',
};

const TAB_TONES = {
    pending: 'pending',
    approved: 'approved',
    rejected: 'rejected',
};

const getStatusMeta = (status) => {
    const tabId = STATUS_TO_TAB_ID[status] || 'pending';
    const tab = TAB_CONFIG.find((item) => item.id === tabId) || TAB_CONFIG[0];

    return {
        tabId,
        label: tab.label,
        tone: TAB_TONES[tabId] || 'neutral',
    };
};

const DOC_TYPE_LABELS = {
    'model-update': 'Model Update',
    'clash-detection': 'Clash Detection',
    'drawing-package': 'Drawing Package',
    'simulation': 'Simulation / Rendering',
    'bim-standards': 'BIM Standards',
};

const Badge = ({ tone = 'neutral', children, className = '' }) => {
    const toneClasses = {
        pending: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
        approved: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
        rejected: 'bg-red-500/10 text-red-200 border-red-500/20',
        warn: 'bg-[#FF7120]/10 text-[#FFBE9B] border-[#FF7120]/20',
        neutral: 'bg-white/5 text-white/70 border-white/10',
    };

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone] || toneClasses.neutral} ${className}`.trim()}>
            {children}
        </span>
    );
};

const formatDate = (value, options) => {
    if (!value) return '—';

    return new Date(value).toLocaleDateString('en-US', options || {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

const formatDateTime = (value) => {
    if (!value) return '—';

    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
};

const normalizeFileUrl = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // Keep URLs safe when file names include spaces or special characters.
    try {
        return encodeURI(raw);
    } catch {
        return raw;
    }
};

const isImageFile = (file) => {
    if (!file) return false;

    if (file.is_image === true) return true;

    const fileType = String(file.file_type || '').toLowerCase();
    if (fileType.includes('image')) return true;

    const fileName = String(file.file_name || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(fileName);
};

const getAttachmentDisplayName = (name) => {
    const rawName = String(name || '').trim();

    if (!rawName) {
        return 'Attachment';
    }

    const cleanedName = rawName
        .replace(/\bchatgpt\b/gi, '')
        .replace(/[\s_-]{2,}/g, ' ')
        .replace(/^[\s._-]+|[\s._-]+$/g, '')
        .trim();

    return cleanedName || rawName;
};

const getDisplayType = (type) => DOC_TYPE_LABELS[type] || type || 'Documentation';
const normalizeText = (value) => String(value || '').trim().toLowerCase();

const SummaryCard = ({ label, value, icon: Icon, tone = 'neutral', isActive = false, onClick }) => {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${cardClass} w-full p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group ${
                isActive
                    ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
                    : 'hover:border-[#FF7120]/30'
            }`}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-white/60 font-medium">{label}</p>
                    <p className="text-2xl font-bold mt-2 text-white">{value}</p>
                </div>
                <Icon className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
            </div>
        </button>
    );
};

const DocumentListItem = ({ doc, isSelected, onSelect }) => {
    const statusMeta = getStatusMeta(doc.status);
    const titleText = String(doc.title || 'Untitled documentation').trim();
    const displayType = String(getDisplayType(doc.doc_type) || '').trim();
    const normalizedTitle = normalizeText(titleText);
    const normalizedType = normalizeText(displayType);
    const shouldShowType = Boolean(displayType)
        && normalizedType !== normalizedTitle
        && !['no file', 'no files'].includes(normalizedType);

    const statusLabel = statusMeta.tabId === 'pending' ? 'Pending' : statusMeta.label;

    return (
        <button
            type="button"
            onClick={() => onSelect(doc.id)}
            className={`w-full rounded-2xl border p-4 text-left transition ${
                isSelected
                    ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white line-clamp-2">{titleText}</p>
                    {shouldShowType && (
                        <p className="mt-1 text-xs text-white/45">{displayType}</p>
                    )}
                </div>
                <Badge tone={statusMeta.tone}>{statusLabel}</Badge>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/55">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <User2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{doc.created_by_name || 'Unknown author'}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{formatDateTime(doc.created_at)}</span>
                </div>
            </div>

        </button>
    );
};

const CeoBimDocumentationPage = ({
    user,
    onNavigate,
    onLogout,
    pageEyebrow = 'CEO Final Review',
    pageTitle = 'BIM Documentation',
    pageDescription = 'Final review for documentation forwarded by the Studio Head.',
    navigationCurrentPage = 'ceo-bim-docs',
    sidebarCurrentPage = 'ceo-bim-docs',
    documentationQuery = { created_by_role: 'bim_specialist' },
}) => {
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingDocs, setPendingDocs] = useState([]);
    const [approvedDocs, setApprovedDocs] = useState([]);
    const [rejectedDocs, setRejectedDocs] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [approvalComments, setApprovalComments] = useState('');
    const [loading, setLoading] = useState(false);
    const [submittingDecision, setSubmittingDecision] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const reviewerName = useMemo(() => {
        const first = user?.first_name || '';
        const last = user?.last_name || '';
        const fullName = `${first} ${last}`.trim();
        return fullName || user?.full_name || user?.name || user?.email || 'CEO';
    }, [user]);

    const docsByTab = useMemo(() => ({
        pending: pendingDocs,
        approved: approvedDocs,
        rejected: rejectedDocs,
    }), [pendingDocs, approvedDocs, rejectedDocs]);

    const activeDocs = docsByTab[activeTab] || [];
    const filteredDocs = useMemo(() => {
        if (!searchTerm.trim()) return activeDocs;
        const term = searchTerm.toLowerCase();
        return activeDocs.filter((doc) => {
            const title = String(doc.title || '').toLowerCase();
            const author = String(doc.created_by_name || '').toLowerCase();
            const docType = String(getDisplayType(doc.doc_type) || '').toLowerCase();
            return title.includes(term) || author.includes(term) || docType.includes(term);
        });
    }, [activeDocs, searchTerm]);

    const activeTabMeta = TAB_CONFIG.find((tab) => tab.id === activeTab) || TAB_CONFIG[0];
    const selectedDoc = useMemo(
        () => activeDocs.find((doc) => doc.id === selectedDocId) || activeDocs[0] || null,
        [activeDocs, selectedDocId]
    );

    useEffect(() => {
        fetchDocumentations();
    }, []);

    useEffect(() => {
        if (!activeDocs.length) {
            if (selectedDocId !== null) {
                setSelectedDocId(null);
            }
            return;
        }

        if (!activeDocs.some((doc) => doc.id === selectedDocId)) {
            setSelectedDocId(activeDocs[0].id);
        }
    }, [activeDocs, selectedDocId]);

    const fetchDocumentations = async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
        }

        const result = await bimDocumentationService.getDocumentations(documentationQuery);

        if (result.success) {
            const docs = Array.isArray(result.data) ? result.data : (result.data?.results || []);
            const ceoDocs = docs.filter(
                (doc) => {
                    if (doc.status === 'pending_ceo_review') {
                        return doc.reviewed_by_studio_head !== null && doc.reviewed_by_studio_head !== undefined;
                    }

                    if (doc.status === 'approved' || doc.status === 'rejected') {
                        return doc.reviewed_by_ceo !== null && doc.reviewed_by_ceo !== undefined;
                    }

                    return false;
                }
            );

            setPendingDocs(ceoDocs.filter((doc) => doc.status === 'pending_ceo_review'));
            setApprovedDocs(ceoDocs.filter((doc) => doc.status === 'approved'));
            setRejectedDocs(ceoDocs.filter((doc) => doc.status === 'rejected'));
        } else {
            toast.error('Load Failed', { description: `Failed to load documentations: ${result.error}` });
        }

        if (!silent) {
            setLoading(false);
        }
    };

    const applyLocalDecision = (docId, action, comments) => {
        const reviewedAt = new Date().toISOString();
        let updatedDoc = null;

        setPendingDocs((current) => {
            const found = current.find((doc) => doc.id === docId);

            if (!found) {
                return current;
            }

            updatedDoc = {
                ...found,
                status: action === 'approve' ? 'approved' : 'rejected',
                reviewed_by_ceo: user?.id || found.reviewed_by_ceo || true,
                reviewed_by_ceo_name: reviewerName,
                ceo_reviewed_at: reviewedAt,
                ceo_comments: comments || '',
                updated_at: reviewedAt,
            };

            return current.filter((doc) => doc.id !== docId);
        });

        if (!updatedDoc) {
            return;
        }

        if (action === 'approve') {
            setApprovedDocs((current) => [updatedDoc, ...current.filter((doc) => doc.id !== docId)]);
            setActiveTab('approved');
        } else {
            setRejectedDocs((current) => [updatedDoc, ...current.filter((doc) => doc.id !== docId)]);
            setActiveTab('rejected');
        }

        setSelectedDocId(updatedDoc.id);
    };

    const handleApprove = async () => {
        if (!selectedDoc) return;

        setSubmittingDecision(true);
        const result = await bimDocumentationService.approvalAction(selectedDoc.id, 'approve', approvalComments);

        if (result.success) {
            toast.success('Documentation approved and finalized.');
            setApprovalComments('');
            applyLocalDecision(selectedDoc.id, 'approve', approvalComments);
            fetchDocumentations({ silent: true });
        } else {
            toast.error('Approval Failed', { description: result.error || 'Failed to approve documentation.' });
        }

        setSubmittingDecision(false);
    };

    const handleReject = async () => {
        if (!selectedDoc) return;

        if (!approvalComments.trim()) {
            toast.error('Validation Error', { description: 'Please add a reason before rejecting this documentation.' });
            return;
        }

        setSubmittingDecision(true);
        const result = await bimDocumentationService.approvalAction(selectedDoc.id, 'reject', approvalComments);

        if (result.success) {
            toast.success('Documentation rejected and returned for revision.');
            setApprovalComments('');
            applyLocalDecision(selectedDoc.id, 'reject', approvalComments);
            fetchDocumentations({ silent: true });
        } else {
            toast.error('Rejection Failed', { description: result.error || 'Failed to reject documentation.' });
        }

        setSubmittingDecision(false);
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setApprovalComments('');
        setSearchTerm('');
    };

    const openImagePreview = (file) => {
        const imageUrl = normalizeFileUrl(file?.file_url || file?.file || null);
        if (!imageUrl) return;

        setPreviewImage({
            url: imageUrl,
            name: getAttachmentDisplayName(file?.file_name) || 'Image Preview',
        });
    };

    const closeImagePreview = () => {
        setPreviewImage(null);
    };

    const requiresDecision = Boolean(
        selectedDoc && selectedDoc.status === 'pending_ceo_review' && !selectedDoc.reviewed_by_ceo_name
    );
    const statusMeta = getStatusMeta(selectedDoc?.status);
    const attachmentCount = selectedDoc ? (selectedDoc.files?.length ?? selectedDoc.file_count ?? 0) : 0;

    return (
        <div className="w-full relative animate-fade-in space-y-6">
            <section className={cardClass}>
                            <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                                <div className="max-w-3xl">
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">{pageEyebrow}</p>
                                    <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">{pageTitle}</h1>
                                    <p className="mt-3 text-sm text-white/60 max-w-2xl">{pageDescription}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => fetchDocumentations()}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white transition focus:ring-2 focus:ring-[#FF7120]/40 font-semibold shrink-0"
                                >
                                    <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </section>

                        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SummaryCard
                                label="Waiting"
                                value={pendingDocs.length}
                                icon={Clock3}
                                tone="pending"
                                isActive={activeTab === 'pending'}
                                onClick={() => handleTabChange('pending')}
                            />
                            <SummaryCard
                                label="Approved"
                                value={approvedDocs.length}
                                icon={CheckCircle2}
                                tone="approved"
                                isActive={activeTab === 'approved'}
                                onClick={() => handleTabChange('approved')}
                            />
                            <SummaryCard
                                label="Rejected"
                                value={rejectedDocs.length}
                                icon={XCircle}
                                tone="rejected"
                                isActive={activeTab === 'rejected'}
                                onClick={() => handleTabChange('rejected')}
                            />
                        </section>

                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-stretch">
                            <div className="lg:col-span-1">
                                <div className={`${cardClass} flex flex-col h-[70vh] min-h-[560px] lg:h-[740px] overflow-hidden`}>
                                    <div className="sticky top-0 z-10 p-5 border-b border-white/10 bg-[#001f35]/95 backdrop-blur-sm">
                                        <p className="text-lg font-semibold text-white">{activeTabMeta.label}</p>
                                        <p className="mt-1 text-sm text-white/55">{activeTabMeta.description}</p>
                                        <div className="mt-3 relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="Search by title, type, author..."
                                                className="w-full h-9 rounded-xl border border-white/10 bg-black/25 pl-9 pr-3 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/45"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-h-0 overflow-y-auto p-4">
                                        {loading ? (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                <CardSkeleton />
                                                <CardSkeleton />
                                            </div>
                                        ) : activeDocs.length === 0 ? (
                                            <div className="flex h-full flex-col items-center justify-center py-16 px-4">
                                                <div className="w-16 h-16 bg-[#FF7120]/10 rounded-2xl border border-[#FF7120]/20 flex items-center justify-center mb-4">
                                                    <Clock3 className="w-8 h-8 text-[#FF7120]" />
                                                </div>
                                                <p className="text-xl font-semibold text-white/90">Nothing here right now</p>
                                                <p className="mt-2 text-sm text-white/50 max-w-[200px] mx-auto">{activeTabMeta.emptyText}</p>
                                            </div>
                                        ) : filteredDocs.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 px-4">
                                                <div className="w-16 h-16 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-center mb-4">
                                                    <Search className="w-8 h-8 text-white/40" />
                                                </div>
                                                <p className="text-lg font-semibold text-white/80">No results found</p>
                                                <p className="mt-2 text-sm text-white/40 max-w-[200px] mx-auto">No documents match "{searchTerm}".</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 pr-1">
                                                {filteredDocs.map((doc) => (
                                                    <DocumentListItem
                                                        key={doc.id}
                                                        doc={doc}
                                                        isSelected={selectedDoc?.id === doc.id}
                                                        onSelect={setSelectedDocId}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                {selectedDoc ? (
                                    <section className={`${cardClass} flex flex-col h-[70vh] min-h-[560px] lg:h-[740px] overflow-hidden`}>
                                        <div className="sticky top-0 z-10 p-6 border-b border-white/10 bg-[#001f35]/95 backdrop-blur-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                                <div className="min-w-0">
                                                    <h2 className="text-2xl font-semibold text-white break-words">{selectedDoc.title}</h2>
                                                    <p className="text-sm text-white/60 mt-2">
                                                        Submitted by {selectedDoc.created_by_name || 'Unknown author'} on {formatDate(selectedDoc.created_at)}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleTabChange(statusMeta.tabId)}
                                                    className="rounded-full"
                                                    title={`Open ${statusMeta.label} tab`}
                                                >
                                                    <Badge tone={statusMeta.tone} className="cursor-pointer">{statusMeta.label}</Badge>
                                                </button>
                                            </div>

                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <Badge tone="neutral">{formatDate(selectedDoc.doc_date)}</Badge>
                                                <Badge tone="neutral">{getDisplayType(selectedDoc.doc_type)}</Badge>
                                                <Badge tone="neutral">{attachmentCount} file{attachmentCount === 1 ? '' : 's'}</Badge>
                                            </div>
                                        </div>

                                        <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-6">
                                            <div>
                                                <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
                                                <p className="text-sm text-white/72 whitespace-pre-wrap leading-7">
                                                    {selectedDoc.description || 'No description was provided for this submission.'}
                                                </p>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-semibold text-white mb-3">Attached Files</h3>
                                                {attachmentCount > 0 ? (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                                        {(selectedDoc.files || []).map((file) => {
                                                            const fileHref = normalizeFileUrl(file.file_url || file.file || null);
                                                            const previewableImage = Boolean(fileHref) && isImageFile(file);
                                                            const displayFileName = getAttachmentDisplayName(file.file_name);
                                                            return (
                                                                <div key={file.id} className="group relative rounded-xl border border-white/10 bg-black/20 p-2 hover:border-[#FF7120]/35 transition">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            if (previewableImage && fileHref) {
                                                                                openImagePreview(file);
                                                                                return;
                                                                            }
                                                                            if (fileHref) {
                                                                                window.open(fileHref, '_blank', 'noopener,noreferrer');
                                                                            }
                                                                        }}
                                                                        className="w-full text-left"
                                                                        title={displayFileName}
                                                                    >
                                                                        {previewableImage && fileHref ? (
                                                                            <img
                                                                                src={fileHref}
                                                                                alt={displayFileName}
                                                                                className="h-20 w-full object-cover rounded-lg transition duration-200 group-hover:scale-105"
                                                                            />
                                                                        ) : (
                                                                            <div className="h-20 w-full rounded-lg bg-white/5 grid place-items-center transition duration-200 group-hover:bg-white/10">
                                                                                {String(file.file_name || '').toLowerCase().endsWith('.pdf') ? (
                                                                                    <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                                        <text x="7" y="17" fontSize="6" fill="currentColor" fontWeight="bold">PDF</text>
                                                                                    </svg>
                                                                                ) : (
                                                                                    <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                                                        <text x="5" y="17" fontSize="5" fill="currentColor" fontWeight="bold">DOC</text>
                                                                                    </svg>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        <p className="mt-1.5 text-[11px] text-white/70 truncate px-1">{displayFileName}</p>
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-white/50">No attachments were included with this documentation.</p>
                                                )}
                                            </div>

                                            {requiresDecision ? (
                                                <div className="space-y-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                                    <h3 className="text-sm font-semibold text-white">Your Decision</h3>
                                                    <div>
                                                        <label className="block text-sm text-white/70 font-semibold mb-2">CEO Note (required for rejection)</label>
                                                        <textarea
                                                            value={approvalComments}
                                                            onChange={(e) => setApprovalComments(e.target.value)}
                                                            rows={4}
                                                            placeholder="Add your note or rejection reason..."
                                                            className="w-full rounded-lg border border-white/15 bg-[#00273C]/60 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none focus:border-blue-500/50 resize-none"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={handleApprove}
                                                            disabled={submittingDecision}
                                                            className="rounded-lg bg-emerald-600/20 text-emerald-300 font-semibold py-2.5 hover:bg-emerald-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {submittingDecision ? 'Processing...' : 'Approve Finalization'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleReject}
                                                            disabled={submittingDecision || !approvalComments.trim()}
                                                            className="rounded-lg bg-red-600/20 text-red-300 font-semibold py-2.5 hover:bg-red-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {submittingDecision ? 'Processing...' : 'Reject and Return'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div className="mt-auto border-t border-white/10 pt-6">
                                                <p className="text-sm font-semibold text-white mb-3">Discussion</p>
                                                <CommentThread docId={selectedDoc.id} currentUser={user} collapsible defaultOpen={false} />
                                            </div>
                                        </div>
                                    </section>
                                ) : (
                                    <div className={`${cardClass} h-[70vh] min-h-[560px] lg:h-[740px]`}>
                                        <div className="flex h-full flex-col items-center justify-center py-32 px-4 text-center">
                                            <div className="w-20 h-20 bg-[#FF7120]/10 rounded-3xl border border-[#FF7120]/20 flex items-center justify-center mb-6">
                                                <FileText className="w-10 h-10 text-[#FF7120]" />
                                            </div>
                                            <h3 className="text-2xl font-semibold text-white mb-2">Check Documentation Details</h3>
                                            <p className="text-white/50 max-w-sm">
                                                Select a documentation from the list on the left to review its content, attachments, and discussion history.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>


            {previewImage && (
                <div className="fixed inset-0 z-[90] bg-black/80 p-4 sm:p-8" onClick={closeImagePreview}>
                    <div className="mx-auto flex h-full w-full max-w-5xl flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-white">{previewImage.name}</p>
                            <button
                                type="button"
                                onClick={closeImagePreview}
                                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
                            >
                                Close
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto rounded-xl border border-white/15 bg-black/40 p-4 grid place-items-center">
                            <img
                                src={previewImage.url}
                                alt={previewImage.name}
                                className="max-h-full max-w-full object-contain"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CeoBimDocumentationPage;
