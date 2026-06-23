import React from 'react';

export function DocumentationImageZoom({
    zoomedImage,
    zoomScale,
    closeImageZoom,
    zoomIn,
    zoomOut,
    zoomReset
}) {
    if (!zoomedImage) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/85 p-2 sm:p-4 md:p-8" onClick={closeImageZoom}>
            <div className="mx-auto flex h-full w-full max-w-6xl flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                    <p className="truncate text-xs sm:text-sm font-semibold text-white">{zoomedImage.file_name}</p>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button type="button" onClick={zoomOut} className="rounded-lg border border-white/20 bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-white hover:bg-white/20">-</button>
                        <button type="button" onClick={zoomReset} className="rounded-lg border border-white/20 bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-white hover:bg-white/20">Reset</button>
                        <button type="button" onClick={zoomIn} className="rounded-lg border border-white/20 bg-white/10 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-white hover:bg-white/20">+</button>
                        <button type="button" onClick={closeImageZoom} className="ml-2 sm:ml-4 rounded-lg bg-red-500/20 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-red-300 hover:bg-red-500/30">Close</button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-black/50 p-2 sm:p-4">
                    <div className="flex min-h-full items-center justify-center">
                        <img
                            src={zoomedImage.file_url}
                            alt={zoomedImage.file_name}
                            style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
                            className="max-h-full max-w-full object-contain transition-transform duration-200"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
