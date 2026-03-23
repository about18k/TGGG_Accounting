import React from "react";
import MaterialRequest from "./MaterialRequest";
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import SiteEngineerSidebar from './components/SiteEngineerSidebar';

const EngineerHub = ({ user, onNavigate }) => {
    return (
        <div className="min-h-screen bg-[#00273C] relative">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
            </div>

            <PublicNavigation onNavigate={onNavigate} currentPage="engineer-hub" user={user} />

            <div className="relative pt-28 px-3 sm:px-6 pb-10">
                <div className="max-w-[1600px] mx-auto flex gap-6">
                    <aside className="w-64 shrink-0 hidden lg:block">
                        <SiteEngineerSidebar currentPage="engineer-hub" onNavigate={onNavigate} />
                    </aside>

                    <main className="flex-1 min-w-0">
                        <MaterialRequest user={user} onNavigate={onNavigate} />
                    </main>
                </div>
            </div>
        </div>
    );
};

export default EngineerHub;
