import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, Edit2, Trash2, X, Check, MoreVertical } from 'lucide-react';
import materialRequestService from '../services/materialRequestService';

const ROLE_STYLE = {
    site_engineer:  { bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'Site Engineer' },
    site_coordinator: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', label: 'Site Coordinator' },
    studio_head:    { bg: 'bg-purple-500/20', text: 'text-purple-300', label: 'Studio Head' },
    ceo:            { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'CEO' },
    president:      { bg: 'bg-amber-500/20', text: 'text-amber-300', label: 'President' },
    admin:          { bg: 'bg-white/10', text: 'text-white/60', label: 'Admin' },
};

const RoleBadge = ({ role }) => {
    const style = ROLE_STYLE[role] || { bg: 'bg-white/10', text: 'text-white/60', label: role || 'User' };
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text}`}>
            {style.label}
        </span>
    );
};

const formatDate = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

/**
 * Single reply row (one level deep)
 */
const ReplyItem = ({ reply, requestId, currentUserId, onRefresh }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(reply.content);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const menuRef = useRef(null);

    const isOwner = reply.author_id === currentUserId;
    const canModify = isOwner && !reply.is_system_comment;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showMenu]);

    const handleEdit = async () => {
        const text = editText.trim();
        if (!text || text === reply.content || saving) return;
        setSaving(true);
        try {
            const result = await materialRequestService.editComment(requestId, reply.id, text);
            if (result.success) {
                setIsEditing(false);
                onRefresh();
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            const result = await materialRequestService.deleteComment(requestId, reply.id);
            if (result.success) {
                onRefresh();
            }
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    return (
        <div className={`flex gap-3 rounded-lg p-3 ${reply.is_system_comment ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 border border-white/5'}`}>
            <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-[#FF7120]/20 flex items-center justify-center text-xs font-bold text-[#FF7120]">
                {(reply.author_name || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <RoleBadge role={reply.author_role} />
                        <span className="text-xs font-semibold text-white">{reply.author_name}</span>
                        <span className="text-[10px] text-white/40">{formatDate(reply.created_at)}</span>
                        {reply.updated_at && reply.updated_at !== reply.created_at && (
                            <span className="text-[10px] text-white/30 italic">(edited)</span>
                        )}
                    </div>
                    {canModify && !isEditing && (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-1 rounded hover:bg-white/10 transition"
                            >
                                <MoreVertical className="h-4 w-4 text-white/40 hover:text-white/70" />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-[#00273C] border border-white/15 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                                    <button
                                        onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
                                    >
                                        <Edit2 className="h-3 w-3" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}
                                        disabled={deleting}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/70 hover:bg-white/10 transition disabled:opacity-50"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        {deleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full rounded-lg border border-white/15 bg-[#00273C]/70 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50 resize-none"
                            rows={2}
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={handleEdit}
                                disabled={saving || !editText.trim()}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#FF7120]/80 px-3 py-1 text-xs font-semibold text-white hover:bg-[#FF7120] transition disabled:opacity-50"
                            >
                                <Check className="h-3 w-3" />
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                onClick={() => { setIsEditing(false); setEditText(reply.content); }}
                                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/20 transition"
                            >
                                <X className="h-3 w-3" />
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-white/80 whitespace-pre-wrap break-words">{reply.content}</p>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md rounded-2xl border border-red-400/25 bg-[#001f35] shadow-2xl p-6">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-red-500/15 border border-red-400/35 flex items-center justify-center shrink-0">
                                <Trash2 className="h-5 w-5 text-red-300" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white">Delete Reply?</h3>
                                <p className="text-sm text-white/70 mt-1">
                                    This action cannot be undone. The reply will be permanently deleted.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                                className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-400/35 text-red-200 hover:bg-red-500/30 transition disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                {deleting ? 'Deleting...' : 'Delete Reply'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Single comment with its replies and reply-box
 */
const CommentItem = ({ comment, requestId, currentUserId, onRefresh }) => {
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [posting, setPosting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const menuRef = useRef(null);

    const isOwner = comment.author_id === currentUserId;
    const canModify = isOwner && !comment.is_system_comment;

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showMenu]);

    const submitReply = async () => {
        const text = replyText.trim();
        if (!text || posting) return;
        setPosting(true);
        try {
            const result = await materialRequestService.postComment(requestId, text, comment.id);
            if (result.success) {
                setReplyText('');
                setShowReplyBox(false);
                onRefresh();
            }
        } finally {
            setPosting(false);
        }
    };

    const handleEdit = async () => {
        const text = editText.trim();
        if (!text || text === comment.content || saving) return;
        setSaving(true);
        try {
            const result = await materialRequestService.editComment(requestId, comment.id, text);
            if (result.success) {
                setIsEditing(false);
                onRefresh();
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleting) return;
        setDeleting(true);
        try {
            const result = await materialRequestService.deleteComment(requestId, comment.id);
            if (result.success) {
                onRefresh();
            }
        } finally {
            setDeleting(false);
            setShowDeleteModal(false);
        }
    };

    return (
        <div className={`rounded-xl p-4 space-y-3 ${comment.is_system_comment ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 border border-white/10'}`}>
            <div className="flex gap-3">
                <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-[#FF7120]/20 flex items-center justify-center text-sm font-bold text-[#FF7120]">
                    {(comment.author_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <RoleBadge role={comment.author_role} />
                            <span className="text-sm font-semibold text-white">{comment.author_name}</span>
                            <span className="text-xs text-white/40">{formatDate(comment.created_at)}</span>
                            {comment.updated_at && comment.updated_at !== comment.created_at && (
                                <span className="text-xs text-white/30 italic">(edited)</span>
                            )}
                            {comment.is_system_comment && (
                                <span className="text-[10px] text-amber-400/80 italic">system</span>
                            )}
                        </div>
                        {canModify && !isEditing && (
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-1 rounded hover:bg-white/10 transition"
                                >
                                    <MoreVertical className="h-4 w-4 text-white/40 hover:text-white/70" />
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-[#00273C] border border-white/15 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                                        <button
                                            onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/10 transition"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}
                                            disabled={deleting}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400/70 hover:bg-white/10 transition disabled:opacity-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            {deleting ? 'Deleting...' : 'Delete'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    {isEditing ? (
                        <div className="space-y-2">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                className="w-full rounded-lg border border-white/15 bg-[#00273C]/70 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50 resize-none"
                                rows={3}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleEdit}
                                    disabled={saving || !editText.trim()}
                                    className="inline-flex items-center gap-1 rounded-lg bg-[#FF7120]/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#FF7120] transition disabled:opacity-50"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                    onClick={() => { setIsEditing(false); setEditText(comment.content); }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20 transition"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-white/80 whitespace-pre-wrap break-words">{comment.content}</p>
                    )}
                </div>
            </div>

            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 space-y-2 border-l-2 border-white/10 pl-3">
                    {comment.replies.map((reply) => (
                        <ReplyItem key={reply.id} reply={reply} requestId={requestId} currentUserId={currentUserId} onRefresh={onRefresh} />
                    ))}
                </div>
            )}

            <div className="ml-11">
                {showReplyBox ? (
                    <div className="flex gap-2">
                        <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply(); }
                            }}
                            placeholder="Write a reply…"
                            autoFocus
                            className="flex-1 rounded-lg border border-white/15 bg-[#00273C]/70 px-3 py-1.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
                        />
                        <button
                            onClick={submitReply}
                            disabled={posting || !replyText.trim()}
                            className="rounded-lg bg-[#FF7120]/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#FF7120] transition disabled:opacity-50"
                        >
                            Reply
                        </button>
                        <button
                            onClick={() => { setShowReplyBox(false); setReplyText(''); }}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/20 transition"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowReplyBox(true)}
                        className="text-xs text-white/45 hover:text-white/80 transition"
                    >
                        💬 Reply
                    </button>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
                    <div className="w-full max-w-md rounded-2xl border border-red-400/25 bg-[#001f35] shadow-2xl p-6">
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-red-500/15 border border-red-400/35 flex items-center justify-center shrink-0">
                                <Trash2 className="h-5 w-5 text-red-300" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-white">Delete Comment?</h3>
                                <p className="text-sm text-white/70 mt-1">
                                    This will permanently delete this comment and all its replies. This action cannot be undone.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                disabled={deleting}
                                className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/10 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-400/35 text-red-200 hover:bg-red-500/30 transition disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                {deleting ? 'Deleting...' : 'Delete Comment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Full comment thread for one Material Request.
 *
 * Props:
 *   requestId   {number}  – material request pk
 *   currentUser {object}  – { id, role, ... }
 */
const MaterialRequestCommentThread = ({ requestId, currentUser, leftAction, rightAction }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [posting, setPosting] = useState(false);
    const [loading, setLoading] = useState(false);

    const currentUserId = currentUser?.id;

    const loadComments = useCallback(async () => {
        if (!requestId) return;
        setLoading(true);
        const result = await materialRequestService.getComments(requestId);
        if (result.success) setComments(result.data || []);
        setLoading(false);
    }, [requestId]);

    useEffect(() => {
        loadComments();
    }, [loadComments]);

    const submitComment = async () => {
        const text = newComment.trim();
        if (!text || posting) return;
        setPosting(true);
        try {
            const result = await materialRequestService.postComment(requestId, text);
            if (result.success) {
                setNewComment('');
                loadComments();
            }
        } finally {
            setPosting(false);
        }
    };

    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-4">
                    {leftAction && (
                        <div className="shrink-0">
                            {leftAction}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors group"
                    >
                        <MessageSquare className="h-4 w-4 text-[#FF7120]" />
                        <span>Discussion Thread</span>
                        {comments.length > 0 && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                                {comments.length}
                            </span>
                        )}
                        {isOpen ? (
                            <ChevronUp className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity ml-1" />
                        ) : (
                            <ChevronDown className="h-4 w-4 opacity-50 group-hover:opacity-100 transition-opacity ml-1" />
                        )}
                    </button>
                </div>
                {rightAction && (
                    <div className="shrink-0">
                        {rightAction}
                    </div>
                )}
            </div>

            {isOpen && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 pt-2 border-t border-white/5">
                    <div className="flex gap-2">
                <input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); }
                    }}
                    placeholder="Write a comment…"
                    className="flex-1 rounded-xl border border-white/15 bg-[#00273C]/70 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#FF7120]/50"
                />
                <button
                    onClick={submitComment}
                    disabled={posting || !newComment.trim()}
                    className="rounded-xl bg-[#FF7120] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {posting ? '…' : 'Post'}
                </button>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {loading && (
                    <p className="text-center text-xs text-white/50 py-4">Loading comments…</p>
                )}
                {!loading && comments.length === 0 && (
                    <p className="text-center text-xs text-white/40 py-4">
                        No comments yet. Be the first!
                    </p>
                )}
                {!loading && comments.map((comment) => (
                    <CommentItem
                        key={comment.id}
                        comment={comment}
                        requestId={requestId}
                        currentUserId={currentUserId}
                        onRefresh={loadComments}
                    />
                ))}
            </div>
                </div>
            )}
        </div>
    );
};

export default MaterialRequestCommentThread;
