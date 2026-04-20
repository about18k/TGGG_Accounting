import React, { useEffect, useMemo, useState } from 'react';
import {
    CheckCircle2,
    Clock3,
    FileText,
    Paperclip,
    Send,
    User2,
    XCircle,
} from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import bimDocumentationService from '../../../services/bimDocumentationService';
import CommentThread from '../../../components/CommentThread';
import StudioHeadSidebar from './components/StudioHeadSidebar';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

const TAB_CONFIG = [
    {
        id: 'pending',
        label: 'Needs Review',
        description: 'Waiting for Studio Head decision',
        emptyText: 'No documentation is waiting for your review.',
    },
    {
        id: 'forwarded',
        label: 'Forwarded to CEO',
        description: 'Reviewed by Studio Head, waiting CEO decision',
        emptyText: 'No documentation has been forwarded to CEO yet.',
    },
    {
        id: 'approved',
        label: 'Approved',
        description: 'Finalized as approved',
        emptyText: 'No approved documentation yet.',
    },
    {
        id: 'rejected',
        label: 'Rejected',
        description: 'Returned for revision',
        emptyText: 'No rejected documentation.',
    },
];

const TAB_TONES = {
    pending: 'pending',
    forwarded: 'forwarded',
    approved: 'approved',
    rejected: 'rejected',
};

const getStatusMeta = (doc) => {
    if (!doc) {
        return {
            tabId: 'pending',
            label: 'Needs Review',
            tone: 'pending',
        };
    }

    let tabId = 'pending';

    if (doc.status === 'approved') {
        tabId = 'approved';
    } else if (doc.status === 'rejected') {
        tabId = 'rejected';
    } else if (doc.status === 'pending_ceo_review' && doc.reviewed_by_studio_head) {
        tabId = 'forwarded';
    }

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
        forwarded: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
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

const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const isImageFile = (file) => {
    if (!file) return false;

    if (file.is_image === true) return true;

    const fileType = String(file.file_type || '').toLowerCase();
    if (fileType.includes('image')) return true;

    const fileName = String(file.file_name || '').toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(fileName);
};

const getDisplayType = (type) => DOC_TYPE_LABELS[type] || type || 'Documentation';
const normalizeText = (value) => String(value || '').trim().toLowerCase();

const SummaryCard = ({ label, value, icon: Icon, tone = 'neutral', isActive = false, onClick }) => {
    const toneStyles = {
        pending: 'border-[#FF7120]/20 bg-[#FF7120]/10 text-[#FFBE9B]',
        forwarded: 'border-cyan-500/15 bg-cyan-500/8 text-cyan-200',
        approved: 'border-emerald-500/15 bg-emerald-500/8 text-emerald-200',
        rejected: 'border-red-500/15 bg-red-500/8 text-red-200',
        neutral: 'border-white/10 bg-white/[0.03] text-white',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            className={`${cardClass} w-full p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7120]/40 active:scale-[0.99] ${
                isActive
                    ? 'border-[#FF7120]/55 bg-[#FF7120]/8 shadow-[0_0_20px_rgba(255,113,32,0.18)]'
                    : 'hover:-translate-y-0.5 hover:border-[#FF7120]/35 hover:bg-white/[0.05] hover:shadow-[0_10px_24px_rgba(0,0,0,0.25)]'
            }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className={`text-sm ${isActive ? 'text-white/80' : 'text-white/55'}`}>{label}</p>
                    <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
                </div>
                <div className={`grid h-12 w-12 place-items-center rounded-full border ${toneStyles[tone] || toneStyles.neutral} ${isActive ? 'ring-2 ring-[#FF7120]/40 ring-offset-2 ring-offset-[#001F35]' : ''}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </button>
    );
};

const DocumentListItem = ({ doc, isSelected, onSelect, showStudioHeadNote = true }) => {
    const statusMeta = getStatusMeta(doc);
    const attachmentCount = doc.files?.length ?? doc.file_count ?? 0;
    const titleText = String(doc.title || 'Untitled documentation').trim();
    const displayType = String(getDisplayType(doc.doc_type) || '').trim();
    const normalizedTitle = normalizeText(titleText);
    const normalizedType = normalizeText(displayType);
    const shouldShowType = Boolean(displayType)
        && normalizedType !== normalizedTitle
        && !['no file', 'no files'].includes(normalizedType);

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
                <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
            </div>

            <div className="mt-3 grid gap-2 text-xs text-white/55 sm:grid-cols-1">
                <div className="flex items-center gap-2 min-w-0">
                    <User2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{doc.created_by_name || 'Unknown author'}</span>
                </div>
            </div>

            {showStudioHeadNote && doc.studio_head_comments && (
                <div className="mt-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">Studio Head Note</p>
                    <p className="mt-1 text-xs text-white/65 line-clamp-2">{doc.studio_head_comments}</p>
                </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/40">
                <span>{formatDateTime(doc.created_at)}</span>
                <span className="inline-flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" />
                    {attachmentCount} file{attachmentCount === 1 ? '' : 's'}
                </span>
            </div>
        </button>
    );
};

const StudioHeadBimDocumentationPage = ({
    user,
    onNavigate,
    pageEyebrow = 'Studio Head Review',
    pageTitle = 'BIM Documentation',
    pageDescription = 'Review submitted documentation and decide which files move forward to CEO.',
    navigationCurrentPage = 'studio-head-bim-docs',
    sidebarCurrentPage = 'studio-head-bim-docs',
    documentationQuery = {},
    showListStudioHeadNote = true,
}) => {
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingDocs, setPendingDocs] = useState([]);
    const [forwardedDocs, setForwardedDocs] = useState([]);
    const [approvedDocs, setApprovedDocs] = useState([]);
    const [rejectedDocs, setRejectedDocs] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(null);
    const [approvalComments, setApprovalComments] = useState('');
    const [loading, setLoading] = useState(false);
    const [submittingDecision, setSubmittingDecision] = useState(false);
    const [message, setMessage] = useState('');
    const [previewImage, setPreviewImage] = useState(null);

    const reviewerName = useMemo(() => {
        const first = user?.first_name || '';
        const last = user?.last_name || '';
        const fullName = `${first} ${last}`.trim();
        return fullName || user?.full_name || user?.name || user?.email || 'Studio Head';
    }, [user]);

    const docsByTab = useMemo(() => ({
        pending: pendingDocs,
        forwarded: forwardedDocs,
        approved: approvedDocs,
        rejected: rejectedDocs,
    }), [pendingDocs, forwardedDocs, approvedDocs, rejectedDocs]);

    const activeDocs = docsByTab[activeTab] || [];
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

            setPendingDocs(docs.filter((doc) => doc.status === 'pending_studio_head_review'));
            setForwardedDocs(docs.filter((doc) => doc.status === 'pending_ceo_review'));
            setApprovedDocs(docs.filter((doc) => doc.status === 'approved'));
            setRejectedDocs(docs.filter((doc) => doc.status === 'rejected'));
        } else {
            setMessage(`Failed to load documentations: ${result.error}`);
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
                status: action === 'approve' ? 'pending_ceo_review' : 'rejected',
                reviewed_by_studio_head: user?.id || found.reviewed_by_studio_head || true,
                reviewed_by_studio_head_name: reviewerName,
                studio_head_reviewed_at: reviewedAt,
                studio_head_comments: comments || '',
                updated_at: reviewedAt,
            };

            return current.filter((doc) => doc.id !== docId);
        });

        if (!updatedDoc) {
            return;
        }

        if (action === 'approve') {
            setForwardedDocs((current) => [updatedDoc, ...current.filter((doc) => doc.id !== docId)]);
            setActiveTab('forwarded');
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
            setMessage('Documentation approved and forwarded to CEO.');
            setApprovalComments('');
            applyLocalDecision(selectedDoc.id, 'approve', approvalComments);
            fetchDocumentations({ silent: true });
        } else {
            setMessage(`Error: ${result.error}`);
        }

        setSubmittingDecision(false);
    };

    const handleReject = async () => {
        if (!selectedDoc) return;

        if (!approvalComments.trim()) {
            setMessage('Please provide a reason before rejecting this documentation.');
            return;
        }

        setSubmittingDecision(true);
        const result = await bimDocumentationService.approvalAction(selectedDoc.id, 'reject', approvalComments);

        if (result.success) {
            setMessage('Documentation rejected and returned for revision.');
            setApprovalComments('');
            applyLocalDecision(selectedDoc.id, 'reject', approvalComments);
            fetchDocumentations({ silent: true });
        } else {
            setMessage(`Error: ${result.error}`);
        }

        setSubmittingDecision(false);
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setApprovalComments('');
        setMessage('');
    };

    const openImagePreview = (file) => {
        const imageUrl = file?.file_url || file?.file || null;
        if (!imageUrl) return;

        setPreviewImage({
            url: imageUrl,
            name: file?.file_name || 'Image Preview',
        });
    };

    const closeImagePreview = () => {
        setPreviewImage(null);
    };

    const requiresDecision = Boolean(
        selectedDoc && selectedDoc.status === 'pending_studio_head_review' && !selectedDoc.reviewed_by_studio_head
    );
    const statusMeta = getStatusMeta(selectedDoc);
    const attachmentCount = selectedDoc ? (selectedDoc.files?.length ?? selectedDoc.file_count ?? 0) : 0;

    return (
        <div className="min-h-screen bg-[#00273C] relative">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
            </div>

            <PublicNavigation onNavigate={onNavigate} currentPage={navigationCurrentPage} user={user} />

            <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
                <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
                    <aside className="w-64 shrink-0 hidden lg:block">
                        <StudioHeadSidebar currentPage={sidebarCurrentPage} onNavigate={onNavigate} />
                    </aside>

                    <main className="flex-1 min-w-0 space-y-6">
                        <section className={cardClass}>
                            <div className="p-6 sm:p-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
                                <div className="max-w-3xl">
                                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">{pageEyebrow}</p>
                                    <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">{pageTitle}</h1>
                                    <p className="mt-3 text-sm text-white/60 max-w-2xl">{pageDescription}</p>
                                </div>
                            </div>
                        </section>

                        {message && (
                            <div className={`rounded-xl border px-4 py-3 text-sm ${
                                message.startsWith('Error') || message.startsWith('Failed')
                                    ? 'border-red-500/20 bg-red-500/10 text-red-200'
                                    : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                            }`}>
                                {message}
                            </div>
                        )}

                        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <SummaryCard
                                label="Waiting"
                                value={pendingDocs.length}
                                icon={Clock3}
                                tone="pending"
                                isActive={activeTab === 'pending'}
                                onClick={() => handleTabChange('pending')}
                            />
                            <SummaryCard
                                label="Forwarded"
                                value={forwardedDocs.length}
                                icon={Send}
                                tone="forwarded"
                                isActive={activeTab === 'forwarded'}
                                onClick={() => handleTabChange('forwarded')}
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

                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                            <div className="lg:col-span-1">
                                <div className={`${cardClass} flex flex-col h-full`}>
                                    <div className="p-5 border-b border-white/10">
                                        <p className="text-lg font-semibold text-white">{activeTabMeta.label}</p>
                                        <p className="mt-1 text-sm text-white/55">{activeTabMeta.description}</p>
                                    </div>

                                    <div className="p-4">
                                        {loading ? (
                                            <p className="py-10 text-center text-sm text-white/55">Loading documentation...</p>
                                        ) : activeDocs.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-16 px-4">
                                                <div className="w-16 h-16 bg-[#FF7120]/10 rounded-2xl border border-[#FF7120]/20 flex items-center justify-center mb-4">
                                                    <Clock3 className="w-8 h-8 text-[#FF7120]" />
                                                </div>
                                                <p className="text-xl font-semibold text-white/90">Nothing here right now</p>
                                                <p className="mt-2 text-sm text-white/50 max-w-[200px] mx-auto">{activeTabMeta.emptyText}</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3 max-h-[740px] overflow-y-auto pr-1">
                                                {activeDocs.map((doc) => (
                                                    <DocumentListItem
                                                        key={doc.id}
                                                        doc={doc}
                                                        isSelected={selectedDoc?.id === doc.id}
                                                        onSelect={setSelectedDocId}
                                                        showStudioHeadNote={showListStudioHeadNote}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2">
                                {selectedDoc ? (
                                    <section className={`${cardClass} flex flex-col h-full`}>
                                        <div className="p-6 border-b border-white/10">
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

                                        <div className="p-6 space-y-6">
                                            <div>
                                                <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
                                                <p className="text-sm text-white/72 whitespace-pre-wrap leading-7">
                                                    {selectedDoc.description || 'No description was provided for this submission.'}
                                                </p>
                                            </div>

                                            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/35">Studio Head Note</p>
                                                <p className="mt-2 text-sm text-white/72 whitespace-pre-wrap leading-7">
                                                    {selectedDoc.studio_head_comments || 'No Studio Head note has been saved for this documentation yet.'}
                                                </p>
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-semibold text-white mb-3">Attached Files</h3>
                                                {attachmentCount > 0 ? (
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {(selectedDoc.files || []).map((file) => {
                                                            const fileHref = file.file_url || file.file || null;
                                                            const previewableImage = Boolean(fileHref) && isImageFile(file);
                                                            return (
                                                                <div key={file.id} className="group relative rounded-lg border border-white/10 bg-black/20 p-2 hover:border-white/20 transition">
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
                                                                        title={file.file_name}
                                                                    >
                                                                        {previewableImage && fileHref ? (
                                                                            <img
                                                                                src={fileHref}
                                                                                alt={file.file_name || 'Attachment image'}
                                                                                className="h-20 w-full object-cover rounded-md"
                                                                            />
                                                                        ) : (
                                                                            <div className="h-20 w-full rounded-md bg-white/5 grid place-items-center">
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
                                                                        <p className="mt-1 text-[11px] text-white/70 truncate">{file.file_name}</p>
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
                                                    <h3 className="text-sm font-semibold text-white">Your Review</h3>
                                                    <div>
                                                        <label className="block text-sm text-white/70 font-semibold mb-2">Studio Head Note (required for rejection)</label>
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
                                                            {submittingDecision ? 'Processing...' : 'Approve and Forward'}
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
                                            ) : (
                                                <div className={`rounded-xl border px-4 py-4 ${
                                                    statusMeta.tabId === 'forwarded'
                                                        ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100'
                                                        : statusMeta.tabId === 'approved'
                                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
                                                            : 'border-red-500/20 bg-red-500/10 text-red-100'
                                                }`}>
                                                    <p className="text-sm font-semibold">
                                                        {statusMeta.tabId === 'forwarded'
                                                            ? 'Forwarded to CEO'
                                                            : statusMeta.tabId === 'approved'
                                                                ? 'Approved'
                                                                : 'Rejected'}
                                                    </p>
                                                    <p className="mt-2 text-sm leading-7 opacity-90 whitespace-pre-wrap">
                                                        {selectedDoc.studio_head_comments || 'No additional note was saved for this decision.'}
                                                    </p>
                                                    <p className="mt-3 text-xs opacity-70">
                                                        Recorded {formatDateTime(selectedDoc.studio_head_reviewed_at || selectedDoc.updated_at)}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="border-t border-white/10 pt-6">
                                                <CommentThread docId={selectedDoc.id} currentUser={user} collapsible defaultOpen={false} />
                                            </div>
                                        </div>
                                    </section>
                                ) : (
                                    <div className={`${cardClass} h-full flex flex-col items-center justify-center p-8 text-center`}>
                                        <div className="w-20 h-20 bg-[#FF7120]/10 rounded-3xl border border-[#FF7120]/20 flex items-center justify-center mb-6">
                                            <FileText className="w-10 h-10 text-[#FF7120]" />
                                        </div>
                                        <h3 className="text-2xl font-semibold text-white mb-2">Check Documentation Details</h3>
                                        <p className="text-white/50 max-w-sm mx-auto">
                                            Select a documentation from the list on the left to review its content, attachments, and discussion history.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>
                </div>
            </div>

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

export default StudioHeadBimDocumentationPage;
