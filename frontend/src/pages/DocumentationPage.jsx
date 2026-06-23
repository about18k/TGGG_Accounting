import React from 'react';
import Alert from '../components/Alert';
import { useDocumentation } from './useDocumentation';
import { DocumentationCreateTab } from './components/DocumentationCreateTab';
import { DocumentationManageTab } from './components/DocumentationManageTab';
import { DocumentationJuniorReviewTab } from './components/DocumentationJuniorReviewTab';
import { DocumentationImageZoom } from './components/DocumentationImageZoom';

const DocumentationPage = ({ user, onNavigate }) => {
    const hookState = useDocumentation(user);
    const {
        isBimSpecialist,
        activeTab,
        setActiveTab,
        alertConfig, setAlertConfig,
        zoomedImage, zoomScale, closeImageZoom, zoomIn, zoomOut, zoomReset
    } = hookState;

    const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

    return (
        <div className="w-full relative animate-fade-in space-y-6">
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

            {/* Tab Navigation */}
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
                        Create<span className="hidden sm:inline"> Documentation</span>
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
                    {isBimSpecialist && (
                        <button
                            onClick={() => setActiveTab('junior-approved')}
                            className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition ${
                                activeTab === 'junior-approved'
                                    ? 'bg-[#FF7120] text-white'
                                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-[#FF7120]/30'
                            }`}
                        >
                            Junior<span className="hidden sm:inline"> Architect</span> Approved
                        </button>
                    )}
                </div>
            </div>

            {/* Content area */}
            {activeTab === 'create' && <DocumentationCreateTab hookState={hookState} />}
            {activeTab === 'manage' && <DocumentationManageTab hookState={hookState} user={user} />}
            {isBimSpecialist && activeTab === 'junior-approved' && (
                <DocumentationJuniorReviewTab hookState={hookState} user={user} />
            )}

            <DocumentationImageZoom 
                zoomedImage={zoomedImage}
                zoomScale={zoomScale}
                closeImageZoom={closeImageZoom}
                zoomIn={zoomIn}
                zoomOut={zoomOut}
                zoomReset={zoomReset}
            />
        </div>
    );
};

export default DocumentationPage;
