import React, { useState } from 'react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import BimSpecialistSidebar from './components/BimSpecialistSidebar';

const MODEL_ACCEPT = '.rvt,.ifc,.obj,.fbx,.skp,.dwg,.dxf,.stl';

const BimSpecialistDocumentationPage = ({ user, onNavigate }) => {
    const [docTitle, setDocTitle] = useState('');
    const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
    const [docType, setDocType] = useState('model-update');
    const [docDescription, setDocDescription] = useState('');
    const [modelFiles, setModelFiles] = useState([]);
    const [imageFiles, setImageFiles] = useState([]);
    const [savedDocs, setSavedDocs] = useState([]);
    const [docMessage, setDocMessage] = useState('');

    const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

    const Badge = ({ tone = 'neutral', children }) => {
        const cls =
            tone === 'warn'
                ? 'bg-[#FF7120]/10 text-[#FF7120] border-[#FF7120]/30'
                : tone === 'good'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : 'bg-white/5 text-white/70 border-white/10';
        return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${cls}`}>{children}</span>;
    };

    const saveDocumentation = (e) => {
        e.preventDefault();
        if (!docTitle.trim()) return setDocMessage('Please enter a title.');
        if (!docDate) return setDocMessage('Please select a date.');
        if (!modelFiles.length && !imageFiles.length) return setDocMessage('Upload at least one file.');

        setSavedDocs((prev) => [
            {
                id: Date.now(),
                title: docTitle.trim(),
                date: docDate,
                type: docType,
                description: docDescription.trim(),
                modelFiles: modelFiles.map((f) => f.name),
                imageFiles: imageFiles.map((f) => f.name),
            },
            ...prev,
        ]);
        setDocTitle('');
        setDocDescription('');
        setModelFiles([]);
        setImageFiles([]);
        setDocMessage('Documentation saved.');
    };

    return (
        <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
            </div>

            <PublicNavigation onNavigate={onNavigate} currentPage="documentation" user={user} />

            <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
                <div className="max-w-[1600px] mx-auto flex gap-6">
                    <aside className="w-64 shrink-0 hidden lg:block">
                        <BimSpecialistSidebar currentPage="documentation" onNavigate={onNavigate} />
                    </aside>

                    <main className="flex-1 min-w-0 space-y-6">
                        <div className={cardClass}>
                            <div className="p-6 border-b border-white/10">
                                <h1 className="text-2xl font-semibold text-white">Documentation</h1>
                                <p className="text-white/60 text-sm mt-1">Upload model files/images and document BIM updates transparently.</p>
                            </div>
                            <form onSubmit={saveDocumentation} className="p-6 space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-white/70 text-sm font-semibold mb-2">Title</label>
                                        <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} type="text" placeholder="Ex: Clash Detection Report - Tower A" className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 text-sm text-white placeholder:text-white/45 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-white/70 text-sm font-semibold mb-2">Date</label>
                                        <input value={docDate} onChange={(e) => setDocDate(e.target.value)} type="date" className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 text-sm text-white outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-white/70 text-sm font-semibold mb-2">Type</label>
                                    <select value={docType} onChange={(e) => setDocType(e.target.value)} className="h-10 w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 text-sm text-white outline-none">
                                        <option value="model-update">Model Update</option>
                                        <option value="clash-detection">Clash Detection</option>
                                        <option value="drawing-package">Drawing Package</option>
                                        <option value="simulation">Simulation / Rendering</option>
                                        <option value="bim-standards">BIM Standards</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-white/70 text-sm font-semibold mb-2">Description</label>
                                    <textarea value={docDescription} onChange={(e) => setDocDescription(e.target.value)} rows={5} placeholder="Describe updates, issues, integration notes, and standards checks." className="w-full rounded-xl border border-white/15 bg-[#00273C]/60 px-3 py-2 text-sm text-white placeholder:text-white/45 outline-none resize-none" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="rounded-xl border border-white/10 bg-[#00273C]/40 p-4">
                                        <label className="block text-white/70 text-sm font-semibold mb-2">3D Model Files</label>
                                        <input type="file" multiple accept={MODEL_ACCEPT} onChange={(e) => setModelFiles(Array.from(e.target.files || []))} className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF7120]/20 file:px-3 file:py-2 file:text-[#FF7120]" />
                                    </div>
                                    <div className="rounded-xl border border-white/10 bg-[#00273C]/40 p-4">
                                        <label className="block text-white/70 text-sm font-semibold mb-2">Images / References</label>
                                        <input type="file" multiple accept="image/*" onChange={(e) => setImageFiles(Array.from(e.target.files || []))} className="block w-full text-sm text-white/70 file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF7120]/20 file:px-3 file:py-2 file:text-[#FF7120]" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button type="submit" className="rounded-xl bg-[#FF7120] px-5 py-2.5 text-sm font-semibold text-white hover:brightness-95 transition">Save Documentation</button>
                                    {docMessage && <p className="text-xs text-white/70">{docMessage}</p>}
                                </div>
                            </form>
                        </div>
                        <div className={cardClass}>
                            <div className="p-6 border-b border-white/10">
                                <h3 className="text-white text-lg font-semibold">Recent Logs</h3>
                            </div>
                            <div className="p-6 space-y-3 max-h-[420px] overflow-auto">
                                {savedDocs.length === 0 && <p className="text-sm text-white/55">No documentation yet.</p>}
                                {savedDocs.map((doc) => (
                                    <div key={doc.id} className="rounded-xl border border-white/10 bg-[#00273C]/40 p-4 space-y-2">
                                        <p className="text-sm font-semibold text-white">{doc.title}</p>
                                        <div className="flex gap-2 flex-wrap"><Badge tone="neutral">{doc.date}</Badge><Badge tone="neutral">{doc.type}</Badge></div>
                                        {doc.description && <p className="text-xs text-white/65">{doc.description}</p>}
                                        {doc.modelFiles.length > 0 && <p className="text-xs text-white/70">Models: {doc.modelFiles.join(', ')}</p>}
                                        {doc.imageFiles.length > 0 && <p className="text-xs text-white/70">Images: {doc.imageFiles.join(', ')}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default BimSpecialistDocumentationPage;
