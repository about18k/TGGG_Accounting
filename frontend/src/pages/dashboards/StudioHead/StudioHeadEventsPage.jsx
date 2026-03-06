import React from 'react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import StudioHeadSidebar from './components/StudioHeadSidebar';
import EventsPanel from './components/EventsPanel';

export default function StudioHeadEventsPage({ user, onLogout, onNavigate }) {
    const cardClass = "rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg";

    return (
        <div className="min-h-screen bg-[#00273C] relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-cyan-400/10 blur-[90px]" />
            </div>

            <PublicNavigation
                onNavigate={onNavigate}
                currentPage="events"
                user={user}
                onLogout={onLogout}
            />

            <div className="relative pt-40 sm:pt-28 px-3 sm:px-6 pb-10">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Main Sidebar */}
                        <aside className="w-full lg:w-64 shrink-0 hidden lg:block">
                            <StudioHeadSidebar currentPage="events" onNavigate={onNavigate} />
                        </aside>

                        {/* Main Content Area */}
                        <main className="flex-1 min-w-0">
                            <div className={cardClass}>
                                {/* Header */}
                                <div className="p-6 border-b border-white/10">
                                    <h1 className="text-2xl font-semibold text-white">Calendar & Events</h1>
                                    <p className="text-white/60 text-sm mt-1">Manage office schedule, holidays, and reviews.</p>
                                </div>

                                <div className="p-6">
                                    <EventsPanel user={user} />
                                </div>
                            </div>
                        </main>
                    </div>
                </div>
            </div>
        </div>
    );
}
