import React, { useState, useEffect } from 'react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import JuniorDesignerSidebar from './components/JuniorDesignerSidebar';
import bimDocumentationService from '../../../services/bimDocumentationService';
import CommentThread from '../../../components/CommentThread';
import { toast } from 'sonner';
import Alert from '../../../components/Alert';

const MAX_UPLOAD_FILES = 5;
const TODAY_ISO = new Date().toISOString().split('T')[0];

const JuniorDesignerDocumentationPage = ({ user, onNavigate }) => {
    const [activeTab, setActiveTab] = useState('create');
    const [docTitle, setDocTitle] = useState('');
    const [docDate, setDocDate] = useState(TODAY_ISO);
    const [docType, setDocType] = useState('');
    const [docDescription, setDocDescription] = useState('');
    const [imageFiles, setImageFiles] = useState([]);
    const [savedDocs, setSavedDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [openThreadDocId, setOpenThreadDocId] = useState(null);
    const [editingDocId, setEditingDocId] = useState(null);
    const [editingRejectedDoc, setEditingRejectedDoc] = useState(false);
    const [localFilePreviews, setLocalFilePreviews] = useState([]);
    const [existingEditFiles, setExistingEditFiles] = useState([]);
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

    useEffect(() => {
        fetchDocumentations();
    }, []);

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

    const fetchDocumentations = async () => {
        setLoading(true);
        const result = await bimDocumentationService.getDocumentations();
        if (result.success) {
            const docs = Array.isArray(result.data) ? result.data : (result.data?.results || []);
            setSavedDocs(docs);
        } else {
            toast.error('Load Failed', { description: 'Failed to load documentations: ' + result.error });
        }
        setLoading(false);
    };

    const isForwardedToCeo = (doc) => {
        return doc?.status === 'pending_review' && !!doc?.reviewed_by_studio_head;
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
        
        const message = isStudioHeadRejected(doc)
            ? 'Editing rejected documentation. Save your changes, then resubmit for review.'
            : 'Editing draft documentation.';
        toast.info('Editing Mode', { description: message });
    };

    const getStatusColor = (doc) => {
        if (isForwardedToCeo(doc)) {
            return 'approved';
        }

        switch (doc?.status) {
            case 'draft':
                return 'neutral';
            case 'pending_review':
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
        if (isForwardedToCeo(doc)) {
            return 'Forwarded to the CEO';
        }

        const labels = {
            draft: 'Draft',
            pending_review: 'Pending Review',
            approved: 'Approved',
            rejected: 'Rejected',
        };
        return labels[doc?.status] || doc?.status;
    };

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
                imageFiles,
            })
            : await bimDocumentationService.createDocumentation({
                title: docTitle.trim(),
                description: docDescription.trim(),
                doc_type: docType.trim(),
                doc_date: docDate,
                imageFiles,
            });

        if (result.success) {
            const successTitle = editingDocId ? 'Documentation Updated' : 'Design Documentation Saved';
            const successDesc = editingDocId ? 'Design documentation updated successfully!' : 'Design documentation saved successfully!';
            toast.success(successTitle, { description: successDesc });
            
            const wasEditing = Boolean(editingDocId);
            const wasRejectedRevision = editingRejectedDoc;
            fetchDocumentations();
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
            const msg = isStudioHeadRejected(doc)
                ? 'Documentation resubmitted for Studio Head review!'
                : 'Documentation submitted for Studio Head review!';
            toast.success('Submission Successful', { description: msg });
            fetchDocumentations();
        } else {
            toast.error('Submission Failed', { description: 'Error: ' + result.error });
        }
        setLoading(false);
    };

    const deleteDocumentation = async (docId) => {
        askConfirmation('Are you sure you want to delete this documentation?', async () => {
            setLoading(true);
            const result = await bimDocumentationService.deleteDocumentation(docId);
            if (result.success) {
                toast.success('Documentation Deleted', { description: 'Documentation deleted successfully!' });
                fetchDocumentations();
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
                        <JuniorDesignerSidebar currentPage="documentation" onNavigate={onNavigate} />
                    </aside>

                    <main className="flex-1 min-w-0 space-y-6">
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
                                    Create<span className="hidden sm:inline"> Design</span> Documentation
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
                            </div>
                        </div>

                        {activeTab === 'create' && (
                            <div className={cardClass}>
                                <div className="p-6 border-b border-white/10">
                                    <h2 className="text-2xl font-semibold text-white">
                                        {editingDocId ? 'Edit Design Documentation' : 'Create New Design Documentation'}
                                    </h2>
                                    <p className="text-white/60 text-sm mt-1">
                                        {editingRejectedDoc
                                            ? 'This submission was rejected by Studio Head. Update details, then resubmit from Manage Documentation.'
                                            : 'Create design documentation and submit for Studio Head review, then CEO approval.'}
                                    </p>
                                </div>
                                <form onSubmit={saveDocumentation} className="p-6 space-y-5">
                                    {editingDocId && (
                                        <div className="rounded-xl border border-cyan-400/25 bg-cyan-500/10 p-4">
                                            <p className="text-sm font-semibold text-cyan-100">
                                                {editingRejectedDoc ? 'Revising Studio Head-rejected documentation' : 'Editing draft documentation'}
                                            </p>
                                            <p className="text-xs text-cyan-200/80 mt-1">
                                                Save your changes, then submit from Manage Documentation.
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
                                                placeholder="Ex: Facade Concept - Tower B"
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
                                            placeholder="Ex: Facade Concept"
                                            className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 text-sm text-white outline-none focus:border-[#FF7120]/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-white/70 text-sm font-semibold mb-2">Description</label>
                                        <textarea
                                            value={docDescription}
                                            onChange={(e) => setDocDescription(e.target.value)}
                                            rows={4}
                                            placeholder="Describe design intent, updates, and reference notes."
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
                                    <div className="flex items-center gap-3 pt-2">
                                        {editingDocId && (
                                            <button
                                                type="button"
                                                onClick={resetDocumentationForm}
                                                disabled={loading}
                                                className="rounded-xl border border-white/20 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="rounded-xl bg-[#FF7120] px-6 py-2.5 text-sm font-semibold text-white hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? 'Saving...' : (editingDocId ? 'Save Changes' : 'Save as Draft')}
                                        </button>
                                        {loading && <p className="text-xs text-white/50 animate-pulse">Processing request...</p>}
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === 'manage' && (
                            <div className={cardClass}>
                                <div className="p-6 border-b border-white/10">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-semibold text-white">Manage Documentation</h2>
                                            <p className="text-white/60 text-sm mt-1">View, delete drafts, and submit your design documentation for review.</p>
                                        </div>
                                        <button
                                            onClick={fetchDocumentations}
                                            className="px-4 py-2 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/20 transition"
                                        >
                                            Refresh
                                        </button>
                                    </div>
                                </div>
                                <div className="p-6">
                                    {loading && <p className="text-center text-white/60">Loading...</p>}
                                    {!loading && savedDocs.length === 0 && (
                                        <p className="text-center text-white/55 py-8">No documentation yet. Create one to get started.</p>
                                    )}
                                    {!loading && savedDocs.length > 0 && (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {savedDocs.map((doc) => {
                                                const files = doc.files || [];
                                                const previewableImages = files.filter((file) => (file.is_image || file.file_type === 'image') && file.file_url);
                                                const rejectedByStudioHead = isStudioHeadRejected(doc);
                                                const canSubmitForReview = doc.status === 'draft' || rejectedByStudioHead;
                                                const canEdit = doc.status === 'draft' || rejectedByStudioHead;

                                                return (
                                                    <div key={doc.id} className="rounded-xl border border-white/10 bg-[#00273C]/40 p-5 space-y-4 hover:border-white/20 transition">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1">
                                                                <h3 className="text-lg font-semibold text-white">{doc.title}</h3>
                                                                <p className="text-xs text-white/50 mt-1">Created: {new Date(doc.created_at).toLocaleDateString()}</p>
                                                            </div>
                                                            <Badge tone={getStatusColor(doc)}>
                                                                {getStatusLabel(doc)}
                                                            </Badge>
                                                        </div>

                                                        <div className="flex gap-2 flex-wrap">
                                                            <Badge tone="neutral">{doc.doc_date}</Badge>
                                                            <Badge tone="neutral">{getDisplayType(doc.doc_type)}</Badge>
                                                        </div>

                                                        {doc.description && (
                                                            <p className="text-xs text-white/70 line-clamp-2">{doc.description}</p>
                                                        )}

                                                        {previewableImages.length > 0 && (
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-semibold text-white/70">Image Preview</p>
                                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                                    {previewableImages.slice(0, 6).map((file) => (
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
                                                            </div>
                                                        )}

                                                        {(doc.files?.length ?? doc.file_count ?? 0) > 0 && (
                                                            <div className="space-y-2">
                                                                <p className="text-xs font-semibold text-white/70">Files ({doc.files?.length ?? doc.file_count ?? 0})</p>
                                                                <div className="space-y-1">
                                                                    {(doc.files || []).slice(0, 3).map((file) => (
                                                                        <p key={file.id} className="text-xs text-white/60 truncate">
                                                                            {file.file_type === 'model' ? 'Model' : 'Image'} - {file.file_name}
                                                                        </p>
                                                                    ))}
                                                                    {(doc.files?.length ?? 0) > 3 && (
                                                                        <p className="text-xs text-white/50">+ {(doc.files?.length ?? 0) - 3} more file(s)</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(canSubmitForReview || canEdit) && (
                                                            <div className="flex gap-2 pt-2 border-t border-white/10">
                                                                {canEdit && (
                                                                    <button
                                                                        onClick={() => startEditingDocumentation(doc)}
                                                                        disabled={loading}
                                                                        className="px-4 rounded-lg border border-cyan-400/35 text-cyan-200 text-xs font-semibold py-2 hover:bg-cyan-500/10 transition disabled:opacity-50"
                                                                    >
                                                                        {rejectedByStudioHead ? 'Edit Rejected' : 'Edit Draft'}
                                                                    </button>
                                                                )}
                                                                {canSubmitForReview && (
                                                                    <button
                                                                        onClick={() => submitForReview(doc)}
                                                                        disabled={loading}
                                                                        className="flex-1 rounded-lg bg-emerald-600/20 text-emerald-300 text-xs font-semibold py-2 hover:bg-emerald-600/30 transition disabled:opacity-50"
                                                                    >
                                                                        {rejectedByStudioHead ? 'Resubmit for Review' : 'Submit for Review'}
                                                                    </button>
                                                                )}
                                                                {doc.status === 'draft' && (
                                                                    <button
                                                                        onClick={() => deleteDocumentation(doc.id)}
                                                                        disabled={loading}
                                                                        className="px-4 rounded-lg bg-red-600/20 text-red-300 text-xs font-semibold py-2 hover:bg-red-600/30 transition disabled:opacity-50"
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {doc.status === 'pending_review' && !doc.reviewed_by_studio_head && (
                                                            <div className="pt-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                                                <p className="text-xs text-blue-300">Awaiting Studio Head review...</p>
                                                            </div>
                                                        )}

                                                        {doc.status === 'pending_review' && doc.reviewed_by_studio_head && (
                                                            <div className="pt-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                                <p className="text-xs text-green-300">Forwarded to the CEO</p>
                                                            </div>
                                                        )}

                                                        {doc.status === 'approved' && (
                                                            <div className="pt-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                                <p className="text-xs text-green-300">Documentation approved</p>
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

                                                        {doc.status !== 'draft' && (
                                                            <div className="pt-2 border-t border-white/10">
                                                                <button
                                                                    onClick={() => setOpenThreadDocId(openThreadDocId === doc.id ? null : doc.id)}
                                                                    className="w-full text-left text-xs font-semibold text-white/60 hover:text-white/90 transition flex items-center gap-2 py-1"
                                                                >
                                                                    <span>Discussion</span>
                                                                    <span className="text-white/40">{openThreadDocId === doc.id ? 'Hide' : 'Show'}</span>
                                                                </button>
                                                                {openThreadDocId === doc.id && (
                                                                    <div className="mt-3">
                                                                        <CommentThread docId={doc.id} currentUser={user} />
                                                                    </div>
                                                                )}
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
                    </main>
                </div>
            </div>

            {zoomedImage && (
                <div className="fixed inset-0 z-[100] bg-black/85 p-4 sm:p-8" onClick={closeImageZoom}>
                    <div className="mx-auto flex h-full w-full max-w-6xl flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-white">{zoomedImage.file_name}</p>
                            <div className="flex items-center gap-2">
                                <button type="button" onClick={zoomOut} className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">-</button>
                                <button type="button" onClick={zoomReset} className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Reset</button>
                                <button type="button" onClick={zoomIn} className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">+</button>
                                <button type="button" onClick={closeImageZoom} className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20">Close</button>
                            </div>
                        </div>
                        <div className="relative flex-1 overflow-auto rounded-xl border border-white/10 bg-black/40">
                            <div className="grid min-h-full place-items-center p-6">
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

export default JuniorDesignerDocumentationPage;
