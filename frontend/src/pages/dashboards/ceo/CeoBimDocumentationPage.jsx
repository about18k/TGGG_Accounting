import React, { useState, useEffect } from 'react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import bimDocumentationService from '../../../services/bimDocumentationService';
import CommentThread from '../../../components/CommentThread';

const CeoBimDocumentationPage = ({ user, onNavigate }) => {
    const [activeTab, setActiveTab] = useState('pending');
    const [pendingDocs, setPendingDocs] = useState([]);
    const [approvedDocs, setApprovedDocs] = useState([]);
    const [rejectedDocs, setRejectedDocs] = useState([]);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [approvalComments, setApprovalComments] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

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
            // CEO sees only docs that have been approved by Studio Head
            const allDocs = docs.filter(
                (doc) => doc.reviewed_by_studio_head !== null && doc.reviewed_by_studio_head !== undefined
            );
            
            const pending = allDocs.filter((doc) => doc.status === 'pending_review');
            const approved = allDocs.filter((doc) => doc.status === 'approved');
            const rejected = allDocs.filter((doc) => doc.status === 'rejected');
            
            setPendingDocs(pending);
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
            setMessage('Documentation approved and finalized!');
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
            setMessage('Documentation rejected. Studio Head and BIM Specialist will be notified.');
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

    const DocumentCard = ({ doc, isSelected, onSelect }) => (
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
                    <Badge tone="pending">Under Review</Badge>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <Badge tone="neutral">{doc.doc_date}</Badge>
                    <Badge tone="neutral">{getDisplayType(doc.doc_type)}</Badge>
                </div>

                <div className="space-y-1 text-xs text-white/60">
                    <p>👤 Created by: {doc.created_by_name}</p>
                    <p>✓ Studio Head: {doc.reviewed_by_studio_head_name || 'Pending'}</p>
                    <p>📅 {new Date(doc.created_at).toLocaleDateString()}</p>
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

    const getTabCount = (tabName) => {
        switch (tabName) {
            case 'pending':
                return pendingDocs.length;
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
                <div className="max-w-[1600px] mx-auto">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className={cardClass}>
                            <div className="p-6">
                                <h1 className="text-3xl font-bold text-white">BIM Documentation Approval</h1>
                                <p className="text-white/60 text-sm mt-2">Final approval of BIM documentation reviewed by Studio Head</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left: Documentation List */}
                            <div className="lg:col-span-1 space-y-4">
                                {/* Tab Navigation */}
                                <div className={cardClass}>
                                    <div className="p-2 space-y-2">
                                        {['pending', 'approved', 'rejected'].map((tab) => (
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
                                                    {tab === 'approved' && '✅ Approved'}
                                                    {tab === 'rejected' && '❌ Rejected'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                                    activeTab === tab
                                                        ? 'bg-white/20'
                                                        : 'bg-white/10'
                                                }`}>
                                                    {getTabCount(activeTab)}
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
                                                        Created by {selectedDoc.created_by_name} on {new Date(selectedDoc.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3 flex-wrap">
                                                <Badge tone="neutral">{selectedDoc.doc_date}</Badge>
                                                <Badge tone="neutral">{getDisplayType(selectedDoc.doc_type)}</Badge>
                                            </div>
                                        </div>

                                        <div className="p-6 space-y-6">
                                            {/* Approval Chain */}
                                            <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
                                                <h3 className="text-sm font-semibold text-white">📋 Approval Chain</h3>
                                                <div className="space-y-2 text-xs">
                                                    <div className="flex items-center gap-3">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
                                                        <div>
                                                            <p className="text-white font-semibold">{selectedDoc.created_by_name}</p>
                                                            <p className="text-white/60">Created • {new Date(selectedDoc.created_at).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {selectedDoc.reviewed_by_studio_head_name ? (
                                                            <>
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
                                                                <div>
                                                                    <p className="text-white font-semibold">{selectedDoc.reviewed_by_studio_head_name}</p>
                                                                    <p className="text-white/60">Studio Head Approved • {new Date(selectedDoc.studio_head_reviewed_at).toLocaleString()}</p>
                                                                    {selectedDoc.studio_head_comments && (
                                                                        <p className="text-white/70 mt-1">{selectedDoc.studio_head_comments}</p>
                                                                    )}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-500/20 text-gray-400">◯</span>
                                                                <div>
                                                                    <p className="text-white/60 font-semibold">Studio Head Review</p>
                                                                    <p className="text-white/50">Pending...</p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {selectedDoc.reviewed_by_ceo_name ? (
                                                            <>
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300">✓</span>
                                                                <div>
                                                                    <p className="text-white font-semibold">{selectedDoc.reviewed_by_ceo_name}</p>
                                                                    <p className="text-white/60">CEO Approval • {new Date(selectedDoc.ceo_reviewed_at).toLocaleString()}</p>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-300">◯</span>
                                                                <div>
                                                                    <p className="text-white font-semibold">CEO Approval</p>
                                                                    <p className="text-white/60">Awaiting your decision...</p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            {selectedDoc.description && (
                                                <div>
                                                    <h3 className="text-sm font-semibold text-white mb-3">Description</h3>
                                                    <p className="text-sm text-white/70 whitespace-pre-wrap">{selectedDoc.description}</p>
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
                                            {selectedDoc.status === 'pending_review' && !selectedDoc.reviewed_by_ceo_name && (
                                                <div className="space-y-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                                    <h3 className="text-sm font-semibold text-white">Your Final Decision</h3>
                                                    
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
                                                            ✓ Approve Finalization
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

                                            {/* Approved Status */}
                                            {selectedDoc.reviewed_by_ceo_name && selectedDoc.status === 'approved' && (
                                                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                    <p className="text-sm text-emerald-300 font-semibold">✓ Approved by CEO</p>
                                                    <p className="text-xs text-emerald-300/80 mt-2">{selectedDoc.ceo_comments}</p>
                                                </div>
                                            )}

                                            {/* Rejected Status */}
                                            {selectedDoc.reviewed_by_ceo_name && selectedDoc.status === 'rejected' && (
                                                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                                                    <p className="text-sm text-red-300 font-semibold">✗ Rejected by CEO</p>
                                                    <p className="text-xs text-red-300/80 mt-2">{selectedDoc.ceo_comments}</p>
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
                                            <p className="text-white/55">Select a documentation to view details and take action</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CeoBimDocumentationPage;
