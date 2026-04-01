import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
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
const ReplyItem = ({ reply }) => (
    <div className={`flex gap-3 rounded-lg p-3 ${reply.is_system_comment ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 border border-white/5'}`}>
        <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-[#FF7120]/20 flex items-center justify-center text-xs font-bold text-[#FF7120]">
            {(reply.author_name || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
                <RoleBadge role={reply.author_role} />
                <span className="text-xs font-semibold text-white">{reply.author_name}</span>
                <span className="text-[10px] text-white/40">{formatDate(reply.created_at)}</span>
            </div>
            <p className="text-sm text-white/80 whitespace-pre-wrap break-words">{reply.content}</p>
        </div>
    </div>
);

/**
 * Single comment with its replies and reply-box
 */
const CommentItem = ({ comment, requestId, onRefresh }) => {
    const [showReplyBox, setShowReplyBox] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [posting, setPosting] = useState(false);

    const submitReply = async () => {
        const text = replyText.trim();
        if (!text) return;
        setPosting(true);
        const result = await materialRequestService.postComment(requestId, text, comment.id);
        if (result.success) {
            setReplyText('');
            setShowReplyBox(false);
            onRefresh();
        }
        setPosting(false);
    };

    return (
        <div className={`rounded-xl p-4 space-y-3 ${comment.is_system_comment ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/5 border border-white/10'}`}>
            <div className="flex gap-3">
                <div className="mt-0.5 h-8 w-8 shrink-0 rounded-full bg-[#FF7120]/20 flex items-center justify-center text-sm font-bold text-[#FF7120]">
                    {(comment.author_name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <RoleBadge role={comment.author_role} />
                        <span className="text-sm font-semibold text-white">{comment.author_name}</span>
                        <span className="text-xs text-white/40">{formatDate(comment.created_at)}</span>
                        {comment.is_system_comment && (
                            <span className="text-[10px] text-amber-400/80 italic">system</span>
                        )}
                    </div>
                    <p className="text-sm text-white/80 whitespace-pre-wrap break-words">{comment.content}</p>
                </div>
            </div>

            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 space-y-2 border-l-2 border-white/10 pl-3">
                    {comment.replies.map((reply) => (
                        <ReplyItem key={reply.id} reply={reply} />
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
        </div>
    );
};

/**
 * Full comment thread for one Material Request.
 *
 * Props:
 *   requestId   {number}  – material request pk
 */
const MaterialRequestCommentThread = ({ requestId }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [posting, setPosting] = useState(false);
    const [loading, setLoading] = useState(false);

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
        if (!text) return;
        setPosting(true);
        const result = await materialRequestService.postComment(requestId, text);
        if (result.success) {
            setNewComment('');
            loadComments();
        }
        setPosting(false);
    };

    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="space-y-4">
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
