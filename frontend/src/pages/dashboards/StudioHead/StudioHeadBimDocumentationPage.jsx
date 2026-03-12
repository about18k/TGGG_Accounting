import React, { useState, useEffect } from 'react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import bimDocumentationService from '../../../services/bimDocumentationService';
import CommentThread from '../../../components/CommentThread';
import StudioHeadSidebar from './components/StudioHeadSidebar';

const StudioHeadBimDocumentationPage = ({ user, onNavigate }) => {
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingDocs, setPendingDocs] = useState([]);
    const [approvedDocs, setApprovedDocs] = useState([]);
    const [forwardedDocs, setForwardedDocs] = useState([]);
    const [rejectedDocs, setRejectedDocs] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [approvalComments, setApprovalComments] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [zoomedImage, setZoomedImage] = useState(null);
    const [zoomScale, setZoomScale] = useState(1);

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

    const fetchDocumentations = async () => {
        setLoading(true);
        const result = await bimDocumentationService.getDocumentations();
        if (result.success) {
            const docs = Array.isArray(result.data) ? result.data : (result.data?.results || []);
            // Organize docs by status
            const pending = docs.filter((doc) => doc.status === 'pending_review' && !doc.reviewed_by_studio_head);
            const forwarded = docs.filter((doc) => doc.status === 'pending_review' && doc.reviewed_by_studio_head);
            const approved = docs.filter((doc) => doc.status === 'approved');
            const rejected = docs.filter((doc) => doc.status === 'rejected');
            
            setPendingDocs(pending);
            setForwardedDocs(forwarded);
            setApprovedDocs(approved);
            setRejectedDocs(rejected);
        } else {
            setMessage('Failed to load documentations: ' + result.error);
        }
        setLoading(false);
    };

    const handleApprove = async () => {
        if (!selectedDoc) return;
        
        setLoading(true);
        const result = await bimDocumentationService.approvalAction(
            selectedDoc.id,
            'approve',
            approvalComments
        );

        if (result.success) {
            setMessage('Documentation approved and forwarded to CEO!');
            setSelectedDoc(null);
            setApprovalComments('');
            fetchDocumentations();
            setTimeout(() => setMessage(''), 3000);
        } else {
            setMessage('Error: ' + result.error);
        }
        setLoading(false);
    };

    const handleReject = async () => {
        if (!selectedDoc || !approvalComments.trim()) {
            setMessage('Please provide rejection reason');
            return;
        }
        
        setLoading(true);
        const result = await bimDocumentationService.approvalAction(
            selectedDoc.id,
            'reject',
            approvalComments
        );

        if (result.success) {
            setMessage('Documentation rejected. BIM Specialist will be notified.');
            setSelectedDoc(null);
            setApprovalComments('');
            fetchDocumentations();
            setTimeout(() => setMessage(''), 3000);
        } else {
            setMessage('Error: ' + result.error);
        }
        setLoading(false);
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

    const selectedDocFiles = selectedDoc?.files || [];
    const previewableImages = selectedDocFiles.filter(
        (file) => (file.is_image || file.file_type === 'image') && file.file_url
    );

    const DocumentCard = ({ doc, isSelected, onSelect }) => {
        const isForwarded = !!(doc.reviewed_by_studio_head && doc.status === 'pending_review');
        return (
        <div
            onClick={() => onSelect(doc)}
            className={`rounded-xl border p-5 cursor-pointer transition ${
                isSelected
                    ? 'border-[#FF7120] bg-[#001f35] shadow-[0_0_20px_rgba(255,113,32,0.2)]'
                    : 'border-white/10 bg-[#00273C]/40 hover:border-white/20 hover:bg-[#00273C]/60'
            }`}
        >
            <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white flex-1">{doc.title}</h3>
                    <Badge tone={isForwarded ? 'good' : 'pending'}>
                        {isForwarded ? '📤 Forwarded to CEO' : 'Pending'}
                    </Badge>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <Badge tone="neutral">{doc.doc_date}</Badge>
                    <Badge tone="neutral">{getDisplayType(doc.doc_type)}</Badge>
                </div>

                <div className="flex items-center gap-2 text-xs text-white/60">
                    <span>👤 {doc.created_by_name}</span>
                    <span>•</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                </div>

                {doc.description && (
                    <p className="text-xs text-white/70 line-clamp-2">{doc.description}</p>
                )}

                {(doc.files?.length ?? doc.file_count ?? 0) > 0 && (
                    <p className="text-xs text-white/60">📎 {doc.files?.length ?? doc.file_count ?? 0} file(s) attached</p>
                )}
            </div>
        </div>
        );
    };

    const getTabCount = (tabName) => {
        switch (tabName) {
            case 'pending':
                return pendingDocs.length;
            case 'forwarded':
                return forwardedDocs.length;
            case 'approved':
                return approvedDocs.length;
            case 'rejected':
                return rejectedDocs.length;
            default:
                return 0;
        }
    };

    return (
        <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
            </div>

            <PublicNavigation onNavigate={onNavigate} currentPage="bim-documentation" user={user} />

            <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
                <div className="max-w-[1600px] mx-auto flex gap-6">
                    <aside className="w-64 shrink-0 hidden lg:block">
                        <StudioHeadSidebar currentPage="bim-docs" onNavigate={onNavigate} />
                    </aside>

                    <main className="flex-1 min-w-0">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className={cardClass}>
                            <div className="p-6">
                                <h1 className="text-3xl font-bold text-white">BIM Documentation Review</h1>
                                <p className="text-white/60 text-sm mt-2">Review and approve BIM Specialist documentation before forwarding to CEO</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Documentation List */}
                            <div className="lg:col-span-1 space-y-4">
                                {/* Tab Navigation */}
                                <div className={cardClass}>
                                    <div className="p-2 space-y-2">
                                        {['pending', 'forwarded', 'approved', 'rejected'].map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`w-full py-2 px-4 rounded-lg text-sm font-semibold transition flex items-center justify-between ${
                                                    activeTab === tab
                                                        ? 'bg-[#FF7120] text-white'
                                                        : 'text-white/60 hover:text-white bg-white/5'
                                                }`}
                                            >
                                                <span>
                                                    {tab === 'pending' && '⏳ Pending'}
                                                    {tab === 'forwarded' && '📤 Forwarded to CEO'}
                                                    {tab === 'approved' && '✅ Approved'}
                                                    {tab === 'rejected' && '❌ Rejected'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                    activeTab === tab
                                                        ? 'bg-white/20'
                                                        : 'bg-white/10'
                                                }`}>
                                                    {getTabCount(tab)}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Documentation List */}
                                <div className={cardClass}>
                                    <div className="p-4">
                                        {loading && <p className="text-center text-white/60 py-6">Loading...</p>}
                                        
                                        {!loading && activeTab === 'pending' && pendingDocs.length === 0 && (
                                            <p className="text-center text-white/55 py-6">No pending documentations</p>
                                        )}
                                        {!loading && activeTab === 'forwarded' && forwardedDocs.length === 0 && (
                                            <p className="text-center text-white/55 py-6">No documentations forwarded to CEO yet</p>
                                        )}
                                        {!loading && activeTab === 'approved' && approvedDocs.length === 0 && (
                                            <p className="text-center text-white/55 py-6">No approved documentations</p>
                                        )}
                                        {!loading && activeTab === 'rejected' && rejectedDocs.length === 0 && (
                                            <p className="text-center text-white/55 py-6">No rejected documentations</p>
                                        )}

                                        <div className="space-y-3 max-h-[700px] overflow-y-auto">
                                            {activeTab === 'pending' && pendingDocs.map((doc) => (
                                                <DocumentCard
                                                    key={doc.id}
                                                    doc={doc}
                                                    isSelected={selectedDoc?.id === doc.id}
                                                    onSelect={setSelectedDoc}
                                                />
                                            ))}
                                            {activeTab === 'forwarded' && forwardedDocs.map((doc) => (
                                                <DocumentCard
                                                    key={doc.id}
                                                    doc={doc}
                                                    isSelected={selectedDoc?.id === doc.id}
                                                    onSelect={setSelectedDoc}
                                                />
                                            ))}
                                            {activeTab === 'approved' && approvedDocs.map((doc) => (
                                                <DocumentCard
                                                    key={doc.id}
                                                    doc={doc}
                                                    isSelected={selectedDoc?.id === doc.id}
                                                    onSelect={setSelectedDoc}
                                                />
                                            ))}
                                            {activeTab === 'rejected' && rejectedDocs.map((doc) => (
                                                <DocumentCard
                                                    key={doc.id}
                                                    doc={doc}
                                                    isSelected={selectedDoc?.id === doc.id}
                                                    onSelect={setSelectedDoc}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Documentation Details */}
                            <div className="lg:col-span-2">
                                {selectedDoc ? (
                                    <div className={cardClass}>
                                        <div className="p-6 border-b border-white/10 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h2 className="text-2xl font-bold text-white">{selectedDoc.title}</h2>
                                                    <p className="text-sm text-white/60 mt-2">
                                                        Submitted by {selectedDoc.created_by_name} on {new Date(selectedDoc.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 flex-wrap">
                                                <Badge tone="neutral">{selectedDoc.doc_date}</Badge>
                                                <Badge tone="neutral">{getDisplayType(selectedDoc.doc_type)}</Badge>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-6">
                                            {/* Description */}
                                            {selectedDoc.description && (
                                                <div>
                                                    <h3 className="text-sm font-semibold text-white mb-3">Description</h3>
                                                    <p className="text-sm text-white/70 whitespace-pre-wrap">{selectedDoc.description}</p>
                                                </div>
                                            )}

                                            {previewableImages.length > 0 && (
                                                <div>
                                                    <h3 className="text-sm font-semibold text-white mb-3">Image Preview</h3>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        {previewableImages.map((file) => (
                                                            <button
                                                                key={file.id}
                                                                type="button"
                                                                onClick={() => openImageZoom(file)}
                                                                className="group overflow-hidden rounded-xl border border-white/10 bg-black/20"
                                                                title={`Open ${file.file_name}`}
                                                            >
                                                                <img
                                                                    src={file.file_url}
                                                                    alt={file.file_name}
                                                                    className="h-32 w-full object-cover transition group-hover:scale-105"
                                                                    loading="lazy"
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Files */}
                                            {(selectedDoc.files?.length ?? selectedDoc.file_count ?? 0) > 0 && (
                                                <div>
                                                    <h3 className="text-sm font-semibold text-white mb-3">📎 Attached Files ({selectedDoc.files?.length ?? selectedDoc.file_count ?? 0})</h3>
                                                    <div className="space-y-2">
                                                        {(selectedDoc.files || []).map((file) => (
                                                            <div
                                                                key={file.id}
                                                                className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                                                            >
                                                                <span className="text-lg">
                                                                    {file.file_type === 'model' ? '📦' : '🖼️'}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm text-white truncate">{file.file_name}</p>
                                                                    <p className="text-xs text-white/50">
                                                                        {(file.file_size / 1024 / 1024).toFixed(2)} MB • {new Date(file.uploaded_at).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Approval Section */}
                                            {selectedDoc.status === 'pending_review' && !selectedDoc.reviewed_by_studio_head && (
                                                <div className="space-y-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                    <h3 className="text-sm font-semibold text-white">Your Review</h3>
                                                    
                                                    <div>
                                                        <label className="block text-sm text-white/70 font-semibold mb-2">
                                                            Comments (Required for rejection)
                                                        </label>
                                                        <textarea
                                                            value={approvalComments}
                                                            onChange={(e) => setApprovalComments(e.target.value)}
                                                            rows={4}
                                                            placeholder="Add your feedback or rejection reason..."
                                                            className="w-full rounded-lg border border-white/15 bg-[#00273C]/60 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none focus:border-blue-500/50 resize-none"
                                                        />
                                                    </div>

                                                    {message && (
                                                        <p className={`text-xs ${
                                                            message.includes('Error')
                                                                ? 'text-red-400'
                                                                : 'text-emerald-400'
                                                        }`}>
                                                            {message}
                                                        </p>
                                                    )}

                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={handleApprove}
                                                            disabled={loading}
                                                            className="flex-1 rounded-lg bg-emerald-600/20 text-emerald-300 font-semibold py-2.5 hover:bg-emerald-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            ✓ Approve
                                                        </button>
                                                        <button
                                                            onClick={handleReject}
                                                            disabled={loading || !approvalComments.trim()}
                                                            className="flex-1 rounded-lg bg-red-600/20 text-red-300 font-semibold py-2.5 hover:bg-red-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            ✗ Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Forwarded to CEO Status */}
                                            {selectedDoc.reviewed_by_studio_head && selectedDoc.status === 'pending_review' && (
                                                <div className="p-4 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                                                    <p className="text-sm text-cyan-300 font-semibold">📤 Forwarded to CEO</p>
                                                    <p className="text-xs text-cyan-300/80 mt-1">You approved this. Awaiting the CEO's decision.</p>
                                                    {selectedDoc.studio_head_comments && (
                                                        <p className="text-xs text-cyan-300/80 mt-2">Your comments: {selectedDoc.studio_head_comments}</p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Approved Status */}
                                            {selectedDoc.status === 'approved' && (
                                                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                    <p className="text-sm text-emerald-300 font-semibold">✓ Approved by Studio Head</p>
                                                    <p className="text-xs text-emerald-300/80 mt-2">{selectedDoc.studio_head_comments}</p>
                                                </div>
                                            )}

                                            {/* Rejected Status */}
                                            {selectedDoc.status === 'rejected' && (
                                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                                                    <p className="text-sm text-red-300 font-semibold">✗ Rejected by Studio Head</p>
                                                    <p className="text-xs text-red-300/80 mt-2">{selectedDoc.studio_head_comments}</p>
                                                </div>
                                            )}

                                            {/* Discussion Thread */}
                                            <div className="border-t border-white/10 pt-6">
                                                <CommentThread docId={selectedDoc.id} currentUser={user} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={cardClass}>
                                        <div className="p-12 text-center">
                                            <p className="text-white/55">Select a documentation to view details</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
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

export default StudioHeadBimDocumentationPage;
