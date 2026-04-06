import { useMemo, useRef, useState } from 'react';
import { Clock, FileText, Paperclip, PenLine, Plus, X } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './WorkDocEditor.css';
import { toast } from 'sonner';

/**
 * Shared Work Documentation card with rich text editing + attachments.
 * Drop-in replacement for the plain textarea cards across all role dashboards.
 */
const CustomToolbar = ({ id, onAttach }) => (
    <div id={id} className="border-b border-white/10 px-2.5 py-2 flex items-center bg-transparent">
        <div className="flex items-center flex-wrap">
            <span className="ql-formats mr-2 hidden sm:inline-flex">
                <button className="ql-bold" />
                <button className="ql-italic" />
                <button className="ql-underline" />
            </span>
            <span className="ql-formats mr-2">
                <button className="ql-list" value="ordered" />
                <button className="ql-list" value="bullet" />
            </span>
            <span className="ql-formats">
                <button className="ql-clean" />
            </span>
            <span className="w-px h-4 bg-white/10 mx-1 hidden sm:block"></span>
            <button
                type="button"
                onClick={onAttach}
                className="flex items-center justify-center p-1.5 rounded-md hover:bg-white/10 group transition"
                title="Attach file (Max 3)"
            >
                <Paperclip className="h-4.5 w-4.5 text-white/50 group-hover:text-[#FF7120] transition-colors" />
            </button>
        </div>
    </div>
);

export default function WorkDocCard({
    value = '',
    onChange,
    attachments = [],
    onAttachmentsChange,
    defaultOpen = false,
    disabled = false,
    disabledMessage = null,
    cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]',
    placeholder = 'Example: Completed database design, attended team meeting, fixed bug #123...',
}) {
    const [isEditing, setIsEditing] = useState(defaultOpen);
    const fileInputRef = useRef(null);
    const toolbarId = useMemo(() => `toolbar-${Math.random().toString(36).substr(2, 9)}`, []);

    const quillModules = useMemo(() => ({
        toolbar: {
            container: `#${toolbarId}`
        }
    }), [toolbarId]);

    const handleAttachClick = () => {
        if (attachments.length >= 3) {
            toast.warning('Maximum Attachments Reached', {
                description: 'You can only upload a maximum of 3 attachments.',
            });
            return;
        }
        fileInputRef.current?.click();
    };

    const quillFormats = ['bold', 'italic', 'underline', 'list', 'bullet'];

    const handleFileDrop = (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || e.target?.files || []);

        if (files.length && onAttachmentsChange) {
            onAttachmentsChange((prev) => {
                const combined = [...(prev || []), ...files];
                if (combined.length > 3) {
                    toast.warning('Maximum Attachments Reached', {
                        description: 'Maximum 3 attachments allowed.',
                    });
                    return combined.slice(0, 3);
                }
                return combined;
            });
        }

        // Reset input so choosing same file again works
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const removeAttachment = (index) => {
        if (onAttachmentsChange) {
            onAttachmentsChange((prev) => (prev || []).filter((_, i) => i !== index));
        }
    };

    const getFilePreview = (file) => {
        if (file.type.startsWith('image/')) {
            return URL.createObjectURL(file);
        }
        return null; // Return null if not image, we'll render icon instead
    };

    return (
        <div className={`${cardClass} p-4 sm:p-6 flex flex-col relative overflow-hidden`}>
            {/* Lock overlay */}
            {disabled && (
                <div className="absolute inset-0 z-10 rounded-2xl flex flex-col items-center justify-center gap-3 bg-[#00273C]/75 backdrop-blur-[2px] pointer-events-none">
                    <Clock className="h-7 w-7 text-amber-400 shrink-0" />
                    <div className="text-center px-6">
                        <p className="text-amber-300 font-semibold text-sm">Work Documentation Locked</p>
                        {disabledMessage && (
                            <p className="text-amber-300/70 text-xs mt-1">{disabledMessage}</p>
                        )}
                    </div>
                </div>
            )}
            {/* Card content — dims + blocks interaction when locked */}
            <div className={disabled ? 'pointer-events-none select-none opacity-40' : ''}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div>
                        <h3 className="text-white font-semibold tracking-tight text-[clamp(0.95rem,2.4vw,1.1rem)]">
                            Time Out
                        </h3>
                        {isEditing && (
                            <p className="mt-0.5 text-white/50 text-sm">
                                Document your work before clocking out.
                            </p>
                        )}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center gap-2 text-[0.85rem] font-semibold transition bg-transparent border-none text-white hover:text-[#FF7120]"
                >
                    {isEditing ? (
                        <>
                            <X className="h-4 w-4" />
                            <span className="hidden sm:inline">Close</span>
                        </>
                    ) : (
                        <>
                            <Plus className="h-4 w-4" />
                            Work Documentation
                        </>
                    )}
                </button>
            </div>

            {/* Expanding Body */}
            {isEditing && (
                <div className="mt-5 space-y-4 flex-1 flex flex-col animate-[fadeIn_0.2s_ease-out]">
                    <label className="block text-white/60 text-sm font-semibold">
                        What did you accomplish today?{' '}
                        <span className="font-normal text-white/40">(Required for Time Out)</span>
                    </label>

                    {/* Rich Text Editor */}
                    <div className="work-doc-editor rounded-xl border border-white/10 bg-[#00273C]/60 overflow-hidden flex-1 flex flex-col relative"
                        onDrop={handleFileDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <CustomToolbar id={toolbarId} onAttach={handleAttachClick} />

                        {/* Inline Attachments Preview Map */}
                        {attachments.length > 0 && (
                            <div className="px-4 py-3 border-b border-white/10 bg-black/10 flex flex-wrap gap-3">
                                {attachments.map((file, i) => {
                                    const isImage = file.type.startsWith('image/');
                                    const previewUrl = isImage ? URL.createObjectURL(file) : null;
                                    return (
                                        <div
                                            key={i}
                                            className="relative group rounded-lg overflow-hidden border border-white/10 bg-[#001f35] flex items-center justify-center h-14 w-20 sm:w-24 shrink-0 transition hover:border-[#FF7120]/50"
                                            title={file.name}
                                        >
                                            {isImage ? (
                                                <img
                                                    src={previewUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center text-white/50 p-1">
                                                    <FileText className="h-5 w-5 mb-1" />
                                                    <span className="text-[0.6rem] w-full text-center truncate px-1">
                                                        {file.name}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Remove overlay */}
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(i)}
                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                                            >
                                                <X className="h-5 w-5 text-red-400 hover:text-red-300 transition-colors drop-shadow-md" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <ReactQuill
                            theme="snow"
                            value={value}
                            onChange={onChange}
                            placeholder="Type your work documentation here... (Drag & drop files to attach)"
                            modules={quillModules}
                            formats={quillFormats}
                        />

                        {/* Hidden file input controlled by custom toolbar button */}
                        <input
                            type="file"
                            multiple
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileDrop}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
                        />
                    </div>
                </div>
            )}

            {/* Map Portal Target */}
            <div id="map-preview-portal" className="empty:min-h-75 empty:mt-6 empty:rounded-2xl empty:bg-white/5 empty:animate-pulse"></div>
            </div>
        </div>
    );
}
