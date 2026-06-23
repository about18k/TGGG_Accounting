import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import bimDocumentationService from '../services/bimDocumentationService';

export const MAX_UPLOAD_FILES = 5;
export const TODAY_ISO = new Date().toISOString().split('T')[0];
export const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

export function useDocumentation(user) {
    const isBimSpecialist = user?.role === 'bim_specialist';
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
        if (!silent) setLoading(true);

        const result = await bimDocumentationService.getDocumentations();
        if (result.success) {
            const docs = (Array.isArray(result.data) ? result.data : (result.data?.results || []))
                .map((doc) => ({
                    ...doc,
                    status: normalizeDocStatus(doc?.status),
                }));

            const isOwnedByCurrentUser = (doc) => {
                if (user?.id && doc?.created_by === user.id) return true;
                if (user?.email && doc?.created_by_email === user.email) return true;
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

        if (!silent) setLoading(false);
    };

    const upsertSavedDoc = (doc) => {
        if (!doc?.id) return;
        const normalizedDoc = { ...doc, files: Array.isArray(doc.files) ? doc.files : [] };
        setSavedDocs((current) => [normalizedDoc, ...current.filter((item) => item.id !== normalizedDoc.id)]);
    };

    const getPreviewCardKey = (section, docId) => `${section}-${docId}`;
    const isPreviewExpanded = (section, docId) => Boolean(expandedPreviewByCard[getPreviewCardKey(section, docId)]);
    const togglePreviewExpanded = (section, docId) => {
        const key = getPreviewCardKey(section, docId);
        setExpandedPreviewByCard((current) => ({ ...current, [key]: !current[key] }));
    };

    const isBimRejected = (doc) => doc?.status === 'rejected' && !!doc?.reviewed_by_bim && !doc?.reviewed_by_studio_head && !doc?.reviewed_by_ceo;
    const isStudioHeadRejected = (doc) => doc?.status === 'rejected' && !!doc?.reviewed_by_studio_head && !doc?.reviewed_by_ceo;
    const isRejectedByReviewer = (doc) => isBimRejected(doc) || isStudioHeadRejected(doc);
    const isForwardedToCeo = (doc) => doc?.status === 'pending_ceo_review' && !!doc?.reviewed_by_studio_head;

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
        setEditingRejectedDoc(isRejectedByReviewer(doc));
        setActiveTab('create');
        toast.info('Editing Mode', { description: isRejectedByReviewer(doc)
            ? 'Editing rejected documentation. Save your changes, then resubmit for review.'
            : 'Editing draft documentation.' });
    };

    const getStatusColor = (doc) => {
        if (isForwardedToCeo(doc)) return 'approved';
        switch (doc?.status) {
            case 'draft': return 'neutral';
            case 'pending_bim_review':
            case 'pending_studio_head_review':
            case 'pending_ceo_review': return 'pending';
            case 'approved': return 'approved';
            case 'rejected': return 'rejected';
            default: return 'neutral';
        }
    };

    const getStatusLabel = (doc) => {
        if (doc?.status === 'pending_bim_review') {
            const awaitingBim = !doc?.reviewed_by_bim;
            const awaitingStudioHead = !doc?.reviewed_by_studio_head;
            if (awaitingBim && awaitingStudioHead) return 'Awaiting Approval';
            if (awaitingBim) return 'Awaiting BIM Approval';
            if (awaitingStudioHead) return 'Awaiting Studio Head Approval';
            return 'Awaiting Approval';
        }
        if (doc?.status === 'pending_studio_head_review') return 'Awaiting Studio Head Approval';
        if (isForwardedToCeo(doc)) return 'Awaiting CEO Final Review';

        const labels = { draft: 'Draft', approved: 'Approved', rejected: 'Rejected' };
        return labels[doc?.status] || doc?.status;
    };

    const isPendingStatus = (status) => ['pending_bim_review', 'pending_studio_head_review', 'pending_ceo_review'].includes(status);
    const matchesManageStatusFilter = (doc, filter) => {
        if (filter === 'all') return true;
        if (filter === 'pending') return isPendingStatus(doc?.status);
        if (filter === 'approved') return doc?.status === 'approved';
        if (filter === 'rejected') return doc?.status === 'rejected';
        return true;
    };

    const completedManageDocs = savedDocs.filter((doc) => doc?.status === 'approved');
    const manageDocs = manageSubTab === 'completed'
        ? completedManageDocs
        : savedDocs.filter((doc) => matchesManageStatusFilter(doc, manageStatusFilter));
    const juniorOutcomeDocs = juniorOutcomeFilter === 'pending'
        ? juniorPendingReviewDocs
        : (juniorOutcomeFilter === 'rejected' ? juniorRejectedDocs : juniorApprovedDocs);

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

    const saveDocumentation = async (e) => {
        e.preventDefault();

        if (!docTitle.trim()) { toast.error('Validation Error', { description: 'Please enter a title.' }); return; }
        if (!docDate) { toast.error('Validation Error', { description: 'Please select a date.' }); return; }
        if (docDate !== TODAY_ISO) { toast.error('Validation Error', { description: 'Only today\'s date is allowed.' }); return; }
        if (!docType.trim()) { toast.error('Validation Error', { description: 'Please enter a type.' }); return; }
        if ((imageFiles.length + existingEditFiles.length) === 0) { toast.error('Validation Error', { description: 'Please attach at least one file before saving.' }); return; }
        if (imageFiles.length > MAX_UPLOAD_FILES) { toast.error('Validation Error', { description: `You can upload up to ${MAX_UPLOAD_FILES} files only.` }); return; }

        setLoading(true);
        const result = editingDocId
            ? await bimDocumentationService.updateDocumentation(editingDocId, {
                title: docTitle.trim(), description: docDescription.trim(), doc_type: docType.trim(), doc_date: docDate,
            })
            : await bimDocumentationService.createDocumentation({
                title: docTitle.trim(), description: docDescription.trim(), doc_type: docType.trim(), doc_date: docDate, imageFiles,
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
                if (wasRejectedRevision) toast.info('Ready for Resubmission', { description: 'Documentation updated. Click "Resubmit for Review" in Manage Documentation.' });
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
            const resubmitted = isRejectedByReviewer(doc);
            const targetReviewer = isBimSpecialist ? 'Studio Head' : 'BIM';
            toast.success('Submission Successful', { description: resubmitted ? `Documentation resubmitted for ${targetReviewer} review!` : `Documentation submitted for ${targetReviewer} review!` });
            fetchDocumentations({ silent: true });
        } else {
            toast.error('Submission Failed', { description: 'Error: ' + result.error });
        }
        setLoading(false);
    };

    const setReviewComment = (docId, value) => setReviewComments((current) => ({ ...current, [docId]: value }));

    const handleJuniorReviewDecision = async (docId, action) => {
        const comment = (reviewComments[docId] || '').trim();
        if (action === 'reject' && !comment) { toast.error('Validation Error', { description: 'Please provide a rejection reason.' }); return; }

        setDecisionLoadingByDoc((current) => ({ ...current, [docId]: true }));
        const result = await bimDocumentationService.approvalAction(docId, action, comment);
        if (result.success) {
            toast.success(action === 'approve' ? 'Documentation Approved' : 'Documentation Rejected', {
                description: action === 'approve' ? 'Junior Architect documentation approved by BIM.' : 'Junior Architect documentation rejected and returned for revision.',
            });
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
        const types = { 'model-update': 'Model Update', 'clash-detection': 'Clash Detection', 'drawing-package': 'Drawing Package', 'simulation': 'Simulation / Rendering', 'bim-standards': 'BIM Standards' };
        return types[type] || type;
    };

    const openImageZoom = (file) => { if (!file?.file_url) return; setZoomedImage(file); setZoomScale(1); };
    const closeImageZoom = () => { setZoomedImage(null); setZoomScale(1); };
    const zoomIn = () => setZoomScale((prev) => Math.min(prev + 0.25, 3));
    const zoomOut = () => setZoomScale((prev) => Math.max(prev - 0.25, 0.5));
    const zoomReset = () => setZoomScale(1);

    const removeSelectedFile = (fileId) => setImageFiles((current) => current.filter((file) => `${file.name}-${file.lastModified}-${file.size}` !== fileId));

    const removeExistingFile = async (fileId) => {
        if (!editingDocId || !fileId) return;
        askConfirmation('Remove this attached file?', async () => {
            const result = await bimDocumentationService.removeFile(editingDocId, fileId);
            if (!result.success) { toast.error('Remove Failed', { description: result.error || 'Failed to remove file.' }); return; }
            setExistingEditFiles((current) => current.filter((file) => file.id !== fileId));
            toast.success('File Removed', { description: 'Attached file removed successfully.' });
        });
    };

    const handleFileSelection = (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        const invalidFiles = selectedFiles.filter(file => !ALLOWED_MIME_TYPES.includes(file.type));
        if (invalidFiles.length > 0) {
            toast.error('Invalid File Type', { description: `Only images, PDF, and Word files are allowed. Rejected: ${invalidFiles.map(f => f.name).join(', ')}` });
            e.target.value = ''; return;
        }

        const currentCount = imageFiles.length;
        const remainingSlots = MAX_UPLOAD_FILES - currentCount;

        if (remainingSlots <= 0) {
            toast.error('Upload Limit Reached', { description: `Maximum ${MAX_UPLOAD_FILES} files allowed.` });
            e.target.value = ''; return;
        }

        const filesToAdd = selectedFiles.slice(0, remainingSlots);
        if (selectedFiles.length > remainingSlots) {
            toast.warning('Some Files Skipped', { description: `Only ${remainingSlots} more file(s) can be added. ${selectedFiles.length - remainingSlots} file(s) were not added.` });
        }

        setImageFiles(prev => [...prev, ...filesToAdd]);
        e.target.value = '';
    };

    return {
        isBimSpecialist, activeTab, setActiveTab, docTitle, setDocTitle, docDate, setDocDate, docType, setDocType, docDescription, setDocDescription,
        manageSubTab, setManageSubTab, manageStatusFilter, setManageStatusFilter, imageFiles, savedDocs,
        juniorPendingReviewDocs, juniorApprovedDocs, juniorRejectedDocs, juniorOutcomeFilter, setJuniorOutcomeFilter,
        reviewComments, setReviewComments, decisionLoadingByDoc, loading, fetchDocumentations,
        zoomedImage, zoomScale, editingDocId, editingRejectedDoc, localFilePreviews, existingEditFiles,
        alertConfig, setAlertConfig, getStatusColor, getStatusLabel, saveDocumentation, submitForReview, handleJuniorReviewDecision,
        deleteDocumentation, getDisplayType, openImageZoom, closeImageZoom, zoomIn, zoomOut, zoomReset,
        removeSelectedFile, removeExistingFile, handleFileSelection, setReviewComment, isPreviewExpanded, togglePreviewExpanded,
        startEditingDocumentation, isStudioHeadRejected, manageDocs, completedManageDocs, juniorOutcomeDocs
    };
}
