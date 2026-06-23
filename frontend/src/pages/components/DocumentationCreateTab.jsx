import React from 'react';
import { MAX_UPLOAD_FILES, TODAY_ISO } from '../useDocumentation';

export function DocumentationCreateTab({ hookState }) {
    const {
        editingDocId,
        editingRejectedDoc,
        docTitle, setDocTitle,
        docDate, setDocDate,
        docType, setDocType,
        docDescription, setDocDescription,
        imageFiles,
        localFilePreviews,
        existingEditFiles,
        openImageZoom,
        removeSelectedFile,
        removeExistingFile,
        handleFileSelection,
        saveDocumentation,
        loading
    } = hookState;

    const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

    return (
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
                <div className="flex justify-end border-t border-white/10 pt-4">
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
    );
}
