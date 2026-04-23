import React, { useState, useEffect } from 'react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import BimSpecialistSidebar from './components/BimSpecialistSidebar';
import bimDocumentationService from '../../../services/bimDocumentationService';
import CommentThread from '../../../components/CommentThread';
import { CheckCircle2, Clock3, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import Alert from '../../../components/Alert';

const MAX_UPLOAD_FILES = 5;
const TODAY_ISO = new Date().toISOString().split('T')[0];

const BimSpecialistDocumentationPage = ({ user, onNavigate }) => {
    const [activeTab, setActiveTab] = useState('create');
    const [docTitle, setDocTitle] = useState('');
    const [docDate, setDocDate] = useState(TODAY_ISO);
    const [docType, setDocType] = useState('');
    const [docDescription, setDocDescription] = useState('');
    const [manageSubTab, setManageSubTab] = useState('all');
    const [manageStatusFilter, setManageStatusFilter] = useState('all');
    const [imageFiles, setImageFiles] = useState([]);
    const [savedDocs, setSavedDocs] = useState([]);
    const [juniorPendingReviewDocs, setJuniorPendingReviewDocs] = useState([]);
    const [juniorApprovedDocs, setJuniorApprovedDocs] = useState([]);
    const [juniorRejectedDocs, setJuniorRejectedDocs] = useState([]);
    const [juniorOutcomeFilter, setJuniorOutcomeFilter] = useState('approved');
    const [reviewComments, setReviewComments] = useState({});
    const [decisionLoadingByDoc, setDecisionLoadingByDoc] = useState({});
    const [loading, setLoading] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [editingDocId, setEditingDocId] = useState(null);
    const [editingRejectedDoc, setEditingRejectedDoc] = useState(false);
    const [localFilePreviews, setLocalFilePreviews] = useState([]);
    const [existingEditFiles, setExistingEditFiles] = useState([]);
    const [expandedPreviewByCard, setExpandedPreviewByCard] = useState({});
    const [alertConfig, setAlertConfig] = useState({ show: false, type: '', title: '', message: '' });

    const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

    const Badge = ({ tone = 'neutral', children }) => {
        const toneClasses = {
            warn: 'bg-[#FF7120]/10 text-[#FF7120] border-[#FF7120]/30',
            good: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
            pending: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
            approved: 'bg-green-500/10 text-green-300 border-green-500/20',
            rejected: 'bg-red-500/10 text-red-300 border-red-500/20',
            neutral: 'bg-white/5 text-white/70 border-white/10',
        };
        const cls = toneClasses[tone] || toneClasses.neutral;
        return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${cls}`}>{children}</span>;
    };

    const EmptyStatePanel = ({ Icon, title, subtitle, accent = 'orange', compact = false }) => {
        const tone = accent === 'green'
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
            : 'bg-[#FF7120]/10 border-[#FF7120]/25 text-[#FF7120]';

        return (
            <div className={`rounded-xl bg-transparent text-center ${compact ? 'p-4' : 'p-8'}`}>
                <div className={`mx-auto ${compact ? 'mb-2.5 h-10 w-10 rounded-xl' : 'mb-4 h-14 w-14 rounded-2xl'} border flex items-center justify-center ${tone}`}>
                    <Icon className={compact ? 'h-4.5 w-4.5' : 'h-6 w-6'} />
                </div>
                <p className={`${compact ? 'text-sm' : 'text-lg'} font-semibold text-white/90`}>{title}</p>
                <p className={`mt-2 ${compact ? 'text-xs max-w-[260px]' : 'text-sm max-w-[300px]'} text-white/55 mx-auto`}>{subtitle}</p>
            </div>
        );
    };

    // Load documentation when account changes
    useEffect(() => {
        setSavedDocs([]);
        setJuniorPendingReviewDocs([]);
        setJuniorApprovedDocs([]);
        setJuniorRejectedDocs([]);
        fetchDocumentations();
    }, [user?.id, user?.email]);

    useEffect(() => {
        const previews = imageFiles.map((file) => ({
            id: `${file.name}-${file.lastModified}-${file.size}`,
            file_name: file.name,
            file_url: URL.createObjectURL(file),
            is_image: file.type.startsWith('image/'),
        }));
        setLocalFilePreviews(previews);

        return () => {
            previews.forEach((preview) => URL.revokeObjectURL(preview.file_url));
        };
    }, [imageFiles]);

    const normalizeDocStatus = (status) => {
        const value = String(status || '').trim().toLowerCase();
        if (value === 'approve') return 'approved';
        if (value === 'reject') return 'rejected';
        if (value === 'pending' || value === 'pending_review') return 'pending_bim_review';
        return value;
    };

    const fetchDocumentations = async ({ silent = false } = {}) => {
        if (!silent) {
            setLoading(true);
        }

        const result = await bimDocumentationService.getDocumentations();
        if (result.success) {
            const docs = (Array.isArray(result.data) ? result.data : (result.data?.results || []))
                .map((doc) => ({
                    ...doc,
                    status: normalizeDocStatus(doc?.status),
                }));

            const isOwnedByCurrentUser = (doc) => {
                if (user?.id && doc?.created_by === user.id) {
                    return true;
                }
                if (user?.email && doc?.created_by_email === user.email) {
                    return true;
                }
                return false;
            };

            const ownDocs = docs.filter((doc) => isOwnedByCurrentUser(doc));
            const juniorForBimReviewDocs = docs.filter((doc) => (
                !isOwnedByCurrentUser(doc)
                && ['pending_bim_review', 'pending_studio_head_review', 'pending_ceo_review'].includes(doc.status)
            ));
            const juniorFinalApprovedDocs = docs.filter((doc) => (
                !isOwnedByCurrentUser(doc)
                && doc.status === 'approved'
            ));
            const juniorFinalRejectedDocs = docs.filter((doc) => (
                !isOwnedByCurrentUser(doc)
                && doc.status === 'rejected'
            ));

            setSavedDocs(ownDocs);
            setJuniorPendingReviewDocs(juniorForBimReviewDocs);
            setJuniorApprovedDocs(juniorFinalApprovedDocs);
            setJuniorRejectedDocs(juniorFinalRejectedDocs);
        } else {
            toast.error('Load Failed', { description: 'Failed to load documentations: ' + result.error });
        }

        if (!silent) {
            setLoading(false);
        }
    };

    const upsertSavedDoc = (doc) => {
        if (!doc?.id) return;

        const normalizedDoc = {
            ...doc,
            files: Array.isArray(doc.files) ? doc.files : [],
        };

        setSavedDocs((current) => [normalizedDoc, ...current.filter((item) => item.id !== normalizedDoc.id)]);
    };

    const markSubmittedLocally = (docId) => {
        const updatedAt = new Date().toISOString();

        setSavedDocs((current) => current.map((doc) => {
            if (doc.id !== docId) {
                return doc;
            }

            return {
                ...doc,
                status: 'pending_studio_head_review',
                reviewed_by_bim: null,
                bim_reviewed_at: null,
                bim_comments: '',
                reviewed_by_studio_head: null,
                studio_head_reviewed_at: null,
                studio_head_comments: '',
                updated_at: updatedAt,
            };
        }));
    };

    const getPreviewCardKey = (section, docId) => `${section}-${docId}`;

    const isPreviewExpanded = (section, docId) => Boolean(expandedPreviewByCard[getPreviewCardKey(section, docId)]);

    const togglePreviewExpanded = (section, docId) => {
        const key = getPreviewCardKey(section, docId);
        setExpandedPreviewByCard((current) => ({
            ...current,
            [key]: !current[key],
        }));
    };

    const isStudioHeadRejected = (doc) => {
        return doc?.status === 'rejected' && !!doc?.reviewed_by_studio_head && !doc?.reviewed_by_ceo;
    };

    const resetDocumentationForm = () => {
        setDocTitle('');
        setDocDate(TODAY_ISO);
        setDocType('');
        setDocDescription('');
        setImageFiles([]);
        setExistingEditFiles([]);
        setEditingDocId(null);
        setEditingRejectedDoc(false);
    };

    const startEditingDocumentation = (doc) => {
        setDocTitle(doc.title || '');
        setDocDate(TODAY_ISO);
        setDocType(doc.doc_type || '');
        setDocDescription(doc.description || '');
        setImageFiles([]);
        setExistingEditFiles(Array.isArray(doc.files) ? doc.files : []);
        setEditingDocId(doc.id);
        setEditingRejectedDoc(isStudioHeadRejected(doc));
        setActiveTab('create');
        toast.info('Editing Mode', { description: isStudioHeadRejected(doc)
            ? 'Editing rejected documentation. Save your changes, then resubmit for review.'
            : 'Editing draft documentation.' });
    };

    const isForwardedToCeo = (doc) => {
        return doc?.status === 'pending_ceo_review' && !!doc?.reviewed_by_studio_head && !!doc?.reviewed_by_bim;
    };

    const getStatusColor = (doc) => {
        if (isForwardedToCeo(doc)) {
            return 'approved';
        }

        switch (doc?.status) {
            case 'draft':
                return 'neutral';
            case 'pending_bim_review':
            case 'pending_studio_head_review':
            case 'pending_ceo_review':
                return 'pending';
            case 'approved':
                return 'approved';
            case 'rejected':
                return 'rejected';
            default:
                return 'neutral';
        }
    };

    const getStatusLabel = (doc) => {
        if (doc?.status === 'pending_bim_review') {
            const awaitingBim = !doc?.reviewed_by_bim;
            const awaitingStudioHead = !doc?.reviewed_by_studio_head;

            if (awaitingBim && awaitingStudioHead) {
                return 'Awaiting Approval';
            }
            if (awaitingBim) {
                return 'Awaiting BIM Approval';
            }
            if (awaitingStudioHead) {
                return 'Awaiting Studio Head Approval';
            }

            return 'Awaiting Approval';
        }
        if (doc?.status === 'pending_studio_head_review') {
            return 'Awaiting Studio Head Approval';
        }
        if (isForwardedToCeo(doc)) {
            return 'Awaiting CEO Final Review';
        }

        const labels = {
            draft: 'Draft',
            approved: 'Approved',
            rejected: 'Rejected',
        };
        return labels[doc?.status] || doc?.status;
    };

    const isPendingStatus = (status) => (
        status === 'pending_bim_review'
        || status === 'pending_studio_head_review'
        || status === 'pending_ceo_review'
    );

    const matchesManageStatusFilter = (doc, filter) => {
        if (filter === 'all') return true;
        if (filter === 'pending') return isPendingStatus(doc?.status);
        if (filter === 'approved') return doc?.status === 'approved';
        if (filter === 'rejected') return doc?.status === 'rejected';
        return true;
    };

    const completedManageDocs = savedDocs.filter((doc) => doc?.status === 'approved');
    const manageDocs = (manageSubTab === 'completed'
        ? completedManageDocs
        : savedDocs.filter((doc) => matchesManageStatusFilter(doc, manageStatusFilter))
    );
    const juniorOutcomeDocs = juniorOutcomeFilter === 'pending'
        ? juniorPendingReviewDocs
        : (juniorOutcomeFilter === 'rejected' ? juniorRejectedDocs : juniorApprovedDocs);

    const saveDocumentation = async (e) => {
        e.preventDefault();

        if (!docTitle.trim()) {
            toast.error('Validation Error', { description: 'Please enter a title.' });
            return;
        }
        if (!docDate) {
            toast.error('Validation Error', { description: 'Please select a date.' });
            return;
        }
        if (docDate !== TODAY_ISO) {
            toast.error('Validation Error', { description: 'Only today\'s date is allowed.' });
            return;
        }
        if (!docType.trim()) {
            toast.error('Validation Error', { description: 'Please enter a type.' });
            return;
        }
        if ((imageFiles.length + existingEditFiles.length) === 0) {
            toast.error('Validation Error', { description: 'Please attach at least one file before saving.' });
            return;
        }
        if (imageFiles.length > MAX_UPLOAD_FILES) {
            toast.error('Validation Error', { description: `You can upload up to ${MAX_UPLOAD_FILES} files only.` });
            return;
        }

        setLoading(true);
        const result = editingDocId
            ? await bimDocumentationService.updateDocumentation(editingDocId, {
                title: docTitle.trim(),
                description: docDescription.trim(),
                doc_type: docType.trim(),
                doc_date: docDate,
            })
            : await bimDocumentationService.createDocumentation({
                title: docTitle.trim(),
                description: docDescription.trim(),
                doc_type: docType.trim(),
                doc_date: docDate,
                imageFiles,
            });

        if (result.success) {
            toast.success(editingDocId ? 'Documentation Updated' : 'Documentation Saved', {
                description: editingDocId ? 'Documentation updated successfully!' : 'Documentation saved successfully!',
            });
            const wasEditing = Boolean(editingDocId);
            const wasRejectedRevision = editingRejectedDoc;
            upsertSavedDoc(result.data);
            fetchDocumentations({ silent: true });
            resetDocumentationForm();
            if (wasEditing) {
                setActiveTab('manage');
                if (wasRejectedRevision) {
                    toast.info('Ready for Resubmission', { description: 'Documentation updated. Click "Resubmit for Review" in Manage Documentation.' });
                }
            }
        } else {
            toast.error('Save Failed', { description: 'Error: ' + result.error });
        }
        setLoading(false);
    };

    const submitForReview = async (doc) => {
        setLoading(true);
        const result = await bimDocumentationService.submitForReview(doc.id);
        if (result.success) {
            toast.success('Submission Successful', { description: isStudioHeadRejected(doc)
                ? 'Documentation resubmitted for Studio Head review!'
                : 'Documentation submitted for review!' });
            markSubmittedLocally(doc.id);
            fetchDocumentations({ silent: true });
        } else {
            toast.error('Submission Failed', { description: 'Error: ' + result.error });
        }
        setLoading(false);
    };

    const setReviewComment = (docId, value) => {
        setReviewComments((current) => ({ ...current, [docId]: value }));
    };

    const handleJuniorReviewDecision = async (docId, action) => {
        const comment = (reviewComments[docId] || '').trim();
        if (action === 'reject' && !comment) {
            toast.error('Validation Error', { description: 'Please provide a rejection reason.' });
            return;
        }

        setDecisionLoadingByDoc((current) => ({ ...current, [docId]: true }));
        const result = await bimDocumentationService.approvalAction(docId, action, comment);
        if (result.success) {
            toast.success(
                action === 'approve' ? 'Documentation Approved' : 'Documentation Rejected',
                {
                    description: action === 'approve'
                        ? 'Junior Architect documentation approved by BIM.'
                        : 'Junior Architect documentation rejected and returned for revision.',
                }
            );
            setReviewComments((current) => ({ ...current, [docId]: '' }));
            fetchDocumentations({ silent: true });
        } else {
            toast.error('Decision Failed', { description: result.error || 'Failed to process review decision.' });
        }
        setDecisionLoadingByDoc((current) => ({ ...current, [docId]: false }));
    };

    const deleteDocumentation = async (docId) => {
        askConfirmation('Are you sure you want to delete this documentation?', async () => {
            setLoading(true);
            const result = await bimDocumentationService.deleteDocumentation(docId);
            if (result.success) {
                toast.success('Documentation Deleted', { description: 'Documentation deleted successfully!' });
                setSavedDocs((current) => current.filter((doc) => doc.id !== docId));
                fetchDocumentations({ silent: true });
            } else {
                toast.error('Deletion Failed', { description: 'Error: ' + result.error });
            }
            setLoading(false);
        });
    };

    const getDisplayType = (type) => {
        const types = {
            'model-update': 'Model Update',
            'clash-detection': 'Clash Detection',
            'drawing-package': 'Drawing Package',
            'simulation': 'Simulation / Rendering',
            'bim-standards': 'BIM Standards',
        };
        return types[type] || type;
    };

    const openImageZoom = (file) => {
        if (!file?.file_url) return;
        setZoomedImage(file);
        setZoomScale(1);
    };

    const closeImageZoom = () => {
        setZoomedImage(null);
        setZoomScale(1);
    };

    const zoomIn = () => setZoomScale((prev) => Math.min(prev + 0.25, 3));
    const zoomOut = () => setZoomScale((prev) => Math.max(prev - 0.25, 0.5));
    const zoomReset = () => setZoomScale(1);

    const removeSelectedFile = (fileId) => {
        setImageFiles((current) => current.filter((file) => `${file.name}-${file.lastModified}-${file.size}` !== fileId));
    };

    const askConfirmation = (message, onConfirm) => {
        setAlertConfig({
            show: true,
            type: 'warning',
            title: 'Confirmation',
            message,
            showCancel: true,
            onConfirm: async () => {
                setAlertConfig((prev) => ({ ...prev, show: false }));
                if (onConfirm) await onConfirm();
            },
        });
    };

    const removeExistingFile = async (fileId) => {
        if (!editingDocId || !fileId) return;
        askConfirmation('Remove this attached file?', async () => {
            const result = await bimDocumentationService.removeFile(editingDocId, fileId);
            if (!result.success) {
                toast.error('Remove Failed', { description: result.error || 'Failed to remove file.' });
                return;
            }

            setExistingEditFiles((current) => current.filter((file) => file.id !== fileId));
            toast.success('File Removed', { description: 'Attached file removed successfully.' });
        });
    };

    const ALLOWED_MIME_TYPES = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const handleFileSelection = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        // Validate file types
        const invalidFiles = selectedFiles.filter(file => !ALLOWED_MIME_TYPES.includes(file.type));
        if (invalidFiles.length > 0) {
            toast.error('Invalid File Type', { 
                description: `Only images, PDF, and Word files are allowed. Rejected: ${invalidFiles.map(f => f.name).join(', ')}`
            });
            e.target.value = ''; // Reset input
            return;
        }

        // Calculate remaining capacity
        const currentCount = imageFiles.length;
        const remainingSlots = MAX_UPLOAD_FILES - currentCount;

        if (remainingSlots <= 0) {
            toast.error('Upload Limit Reached', { description: `Maximum ${MAX_UPLOAD_FILES} files allowed.` });
            e.target.value = '';
            return;
        }

        // Append files up to the limit
        const filesToAdd = selectedFiles.slice(0, remainingSlots);
        if (selectedFiles.length > remainingSlots) {
            toast.warning('Some Files Skipped', { 
                description: `Only ${remainingSlots} more file(s) can be added. ${selectedFiles.length - remainingSlots} file(s) were not added.`
            });
        }

        setImageFiles(prev => [...prev, ...filesToAdd]);
        e.target.value = ''; // Reset input to allow re-selecting same files
    };

    return (
        <div className="min-h-screen bg-[#00273C] relative">
            {alertConfig.show && (
                <Alert
                    type={alertConfig.type}
                    title={alertConfig.title}
                    message={alertConfig.message}
                    onClose={() => setAlertConfig((prev) => ({ ...prev, show: false }))}
                    showCancel={alertConfig.showCancel}
                    onConfirm={alertConfig.onConfirm}
                />
            )}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
            </div>

            <PublicNavigation onNavigate={onNavigate} currentPage="documentation" user={user} />

            <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
                <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
                    <aside className="w-64 shrink-0 hidden lg:block">
                        <BimSpecialistSidebar currentPage="documentation" onNavigate={onNavigate} />
                    </aside>

                    <main className="flex-1 min-w-0 space-y-6">
                        {/* Tab Navigation */}
                        <div className={cardClass}>
                            <div className="flex flex-col sm:flex-row gap-2 p-3 sm:p-2 border-b border-white/10">
                                <button
                                    onClick={() => setActiveTab('create')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition ${
                                        activeTab === 'create'
                                            ? 'bg-[#FF7120] text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/5 border border-[#FF7120]/30'
                                    }`}
                                >
                                    Create<span className="hidden sm:inline"> Documentation</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('manage')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition ${
                                        activeTab === 'manage'
                                            ? 'bg-[#FF7120] text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/5 border border-[#FF7120]/30'
                                    }`}
                                >
                                    Manage<span className="hidden sm:inline"> Documentation</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('junior-approved')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition ${
                                        activeTab === 'junior-approved'
                                            ? 'bg-[#FF7120] text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/5 border border-[#FF7120]/30'
                                    }`}
                                >
                                    Junior<span className="hidden sm:inline"> Architect</span> Approved
                                </button>
                            </div>
                        </div>

                        {/* Create Tab */}
                        {activeTab === 'create' && (
                            <div className={cardClass}>
                                <div className="p-4 sm:p-6 border-b border-white/10">
                                    <h2 className="text-lg sm:text-2xl font-semibold text-white">
                                        {editingDocId ? 'Edit Documentation' : 'Create New Documentation'}
                                    </h2>
                                    <p className="text-white/60 text-xs sm:text-sm mt-1">
                                        {editingRejectedDoc
                                            ? 'This submission was rejected by Studio Head. Update details, then resubmit from Manage Documentation.'
                                            : 'Document BIM updates and save as draft or submit for review.'}
                                    </p>
                                </div>
                                <form onSubmit={saveDocumentation} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                                    {editingDocId && (
                                        <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-4">
                                            <p className="text-sm font-semibold text-cyan-100">
                                                {editingRejectedDoc ? 'Revising Studio Head-rejected documentation' : 'Editing draft documentation'}
                                            </p>
                                            <p className="text-xs text-cyan-200/80 mt-1">
                                                Save your changes, then use Manage Documentation to submit.
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-white/70 text-sm font-semibold mb-2">Title *</label>
                                            <input
                                                value={docTitle}
                                                onChange={(e) => setDocTitle(e.target.value)}
                                                type="text"
                                                placeholder="Ex: Clash Detection Report - Tower A"
                                                className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 text-sm text-white placeholder:text-white/45 outline-none focus:border-[#FF7120]/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-white/70 text-sm font-semibold mb-2">Date *</label>
                                            <input
                                                value={docDate}
                                                onChange={(e) => setDocDate(e.target.value)}
                                                type="date"
                                                min={TODAY_ISO}
                                                max={TODAY_ISO}
                                                className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 text-sm text-white outline-none focus:border-[#FF7120]/50"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-white/70 text-sm font-semibold mb-2">Type *</label>
                                        <input
                                            value={docType}
                                            onChange={(e) => setDocType(e.target.value)}
                                            type="text"
                                            placeholder="Ex: Clash Detection"
                                            className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 text-sm text-white outline-none focus:border-[#FF7120]/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/70 text-sm font-semibold mb-2">Description</label>
                                        <textarea
                                            value={docDescription}
                                            onChange={(e) => setDocDescription(e.target.value)}
                                            rows={4}
                                            placeholder="Describe updates, issues, integration notes, and standards checks."
                                            className="w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none resize-none focus:border-[#FF7120]/50"
                                        />
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-[#00273C]/40 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="block text-white/70 text-sm font-semibold">Images / References / Docs</label>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                imageFiles.length >= MAX_UPLOAD_FILES 
                                                    ? 'bg-red-500/20 text-red-300' 
                                                    : 'bg-white/10 text-white/60'
                                            }`}>
                                                {imageFiles.length}/{MAX_UPLOAD_FILES}
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="file"
                                                multiple
                                                accept=".pdf,.doc,.docx,image/*"
                                                onChange={handleFileSelection}
                                                disabled={imageFiles.length >= MAX_UPLOAD_FILES}
                                                className={`block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:cursor-pointer transition ${
                                                    imageFiles.length >= MAX_UPLOAD_FILES
                                                        ? 'opacity-50 cursor-not-allowed file:bg-white/10 file:text-white/40'
                                                        : 'file:bg-[#FF7120]/20 file:text-[#FF7120] hover:file:bg-[#FF7120]/30'
                                                }`}
                                            />
                                            {imageFiles.length >= MAX_UPLOAD_FILES && (
                                                <p className="text-xs text-amber-400 mt-2">Maximum files reached. Remove a file to add more.</p>
                                            )}
                                            <p className="text-xs text-white/50 mt-2">Accept: Images, PDF, Word files</p>
                                            {localFilePreviews.length > 0 && (
                                                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {localFilePreviews.map((file) => (
                                                        <div
                                                            key={file.id}
                                                            className="group relative rounded-lg border border-white/10 bg-black/20 p-2 hover:border-white/20 transition"
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (file.is_image) {
                                                                        openImageZoom(file);
                                                                        return;
                                                                    }
                                                                    window.open(file.file_url, '_blank', 'noopener,noreferrer');
                                                                }}
                                                                className="w-full text-left"
                                                                title={file.file_name}
                                                            >
                                                                {file.is_image ? (
                                                                    <img
                                                                        src={file.file_url}
                                                                        alt={file.file_name}
                                                                        className="h-20 w-full object-cover rounded-md"
                                                                    />
                                                                ) : (
                                                                    <div className="h-20 w-full rounded-md bg-white/5 grid place-items-center">
                                                                        {file.file_name?.toLowerCase().endsWith('.pdf') ? (
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
                                                            <button
                                                                type="button"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    removeSelectedFile(file.id);
                                                                }}
                                                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                                title="Remove file"
                                                            >
                                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {editingDocId && existingEditFiles.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    <p className="text-xs text-white/60 font-semibold">Existing attached files</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                        {existingEditFiles.map((file) => (
                                                            <div key={file.id} className="group relative rounded-lg border border-white/10 bg-black/20 p-2 hover:border-white/20 transition">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if ((file.is_image || file.file_type === 'image') && file.file_url) {
                                                                            openImageZoom(file);
                                                                            return;
                                                                        }
                                                                        if (file.file_url) {
                                                                            window.open(file.file_url, '_blank', 'noopener,noreferrer');
                                                                        }
                                                                    }}
                                                                    className="w-full text-left"
                                                                    title={file.file_name}
                                                                >
                                                                    {(file.is_image || file.file_type === 'image') && file.file_url ? (
                                                                        <img
                                                                            src={file.file_url}
                                                                            alt={file.file_name}
                                                                            className="h-20 w-full object-cover rounded-md"
                                                                        />
                                                                    ) : (
                                                                        <div className="h-20 w-full rounded-md bg-white/5 grid place-items-center">
                                                                            {file.file_name?.toLowerCase().endsWith('.pdf') ? (
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
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeExistingFile(file.id)}
                                                                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                                                    title="Remove file"
                                                                >
                                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 pt-2">
                                        {editingDocId && (
                                            <button
                                                type="button"
                                                onClick={resetDocumentationForm}
                                                disabled={loading}
                                                className="rounded-xl border border-white/20 px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="rounded-xl bg-[#FF7120] px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? 'Saving...' : (editingDocId ? 'Save Changes' : 'Save as Draft')}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Manage Tab */}
                        {activeTab === 'manage' && (
                            <div className={cardClass}>
                                <div className="p-4 sm:p-6 border-b border-white/10">
                                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                                        <div className="max-w-2xl text-left space-y-1.5">
                                            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight leading-tight text-white">Manage Documentation</h2>
                                            <p className="text-sm leading-relaxed text-white/65">View, edit, delete, or submit your documentation for review.</p>
                                        </div>

                                        <div className="self-start lg:self-start flex flex-col items-start lg:items-end gap-2.5 w-full lg:w-auto">
                                            <button
                                                onClick={fetchDocumentations}
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
                                    {loading && <p className="text-center text-white/60">Loading...</p>}
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
                        )}

                        {activeTab === 'junior-approved' && (
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
                                                onClick={fetchDocumentations}
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
                                    {loading && <p className="text-center text-white/60">Loading...</p>}

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
                        )}
                    </main>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 z-100 bg-black/85 p-2 sm:p-4 md:p-8" onClick={closeImageZoom}>
                    <div className="mx-auto flex h-full w-full max-w-6xl flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                            <p className="truncate text-xs sm:text-sm font-semibold text-white">{zoomedImage.file_name}</p>
                            <div className="flex items-center gap-1 sm:gap-2">
                                <button type="button" onClick={zoomOut} className="rounded-lg border border-white/20 bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-white hover:bg-white/20">-</button>
                                <button type="button" onClick={zoomReset} className="rounded-lg border border-white/20 bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-white hover:bg-white/20">Reset</button>
                                <button type="button" onClick={zoomIn} className="rounded-lg border border-white/20 bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-white hover:bg-white/20">+</button>
                                <button type="button" onClick={closeImageZoom} className="rounded-lg border border-white/20 bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-white hover:bg-white/20">Close</button>
                            </div>
                        </div>
                        <div className="relative flex-1 overflow-auto rounded-xl border border-white/10 bg-black/40">
                            <div className="grid min-h-full place-items-center p-3 sm:p-6">
                                <img
                                    src={zoomedImage.file_url}
                                    alt={zoomedImage.file_name}
                                    className="max-h-full max-w-full origin-center transition-transform duration-150"
                                    style={{ transform: `scale(${zoomScale})` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BimSpecialistDocumentationPage;
