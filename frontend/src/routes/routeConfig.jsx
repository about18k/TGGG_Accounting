/**
 * Route configuration extracted from App.jsx
 * Maps user roles + currentPage to the correct dashboard component.
 */
import { lazy, Suspense } from 'react';

// Shared Layout and Navigation Components
import DashboardLayout from '../layouts/DashboardLayout';
import PublicNavigation from '../pages/dashboards/Public_Dashboard/PublicNavigation';
import AccountingSidebar from '../pages/dashboards/Accounting_Department/AccountingSidebar';
import EmployeeAttendanceDashboard from '../pages/dashboards/Public_Dashboard/AttendanceDashboard';

import { getDefaultPage } from '../layouts/sidebarConfig';
import { PageSkeleton } from '../components/SkeletonLoader';

// ── Lazy-loaded Shared Pages ─────────────────────────────────
const CalendarPage = lazy(() => import('../pages/CalendarPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));

// ── Lazy-loaded Role Pages ─────────────────────────────────
const StudioHeadDashboard = lazy(() => import('../pages/dashboards/StudioHead/StudioHeadDashboard'));
const StudioHeadBimDocumentationPage = lazy(() => import('../pages/dashboards/StudioHead/StudioHeadBimDocumentationPage'));
const StudioHeadJuniorArchitectDocumentationPage = lazy(() => import('../pages/dashboards/StudioHead/StudioHeadJuniorArchitectDocumentationPage'));
const StudioHeadMaterialRequestPage = lazy(() => import('../pages/dashboards/StudioHead/StudioHeadMaterialRequestPage'));
const StudioHeadOvertimePage = lazy(() => import('../pages/dashboards/StudioHead/StudioHeadOvertimePage'));

const InternOvertimePage = lazy(() => import('../pages/dashboards/Intern_Dashboard/OvertimePage'));

const BimSpecialistOvertimePage = lazy(() => import('../pages/dashboards/BimSpecialist/BimSpecialistOvertimePage'));
const BimSpecialistDocumentationPage = lazy(() => import('../pages/dashboards/BimSpecialist/BimSpecialistDocumentationPage'));

const EngineerHub = lazy(() => import('../pages/dashboards/SiteEngineer_Dashboard/EngineerHub'));
const SiteEngineerOvertimePage = lazy(() => import('../pages/dashboards/SiteEngineer_Dashboard/SiteEngineerOvertimePage'));

const CoordinatorHub = lazy(() => import('../pages/dashboards/SiteCoordinator_Dashboard/CoordinatorHub'));
const SiteCoordinatorOvertimePage = lazy(() => import('../pages/dashboards/SiteCoordinator_Dashboard/SiteCoordinatorOvertimePage'));

const JuniorDesignerOvertimePage = lazy(() => import('../pages/dashboards/JuniorDesigner_Dashboard/JuniorDesignerOvertimePage'));
const JuniorDesignerDocumentationPage = lazy(() => import('../pages/dashboards/JuniorDesigner_Dashboard/JuniorDesignerDocumentationPage'));

const CeoDashboardPage = lazy(() => import('../pages/dashboards/ceo/CeoDashboardPage'));
const CeoBimDocumentationPage = lazy(() => import('../pages/dashboards/ceo/CeoBimDocumentationPage'));
const CeoJuniorArchitectDocumentationPage = lazy(() => import('../pages/dashboards/ceo/CeoJuniorArchitectDocumentationPage'));
const CeoMaterialRequestPage = lazy(() => import('../pages/dashboards/ceo/CeoMaterialRequestPage'));
const CeoOvertimePage = lazy(() => import('../pages/dashboards/ceo/CeoOvertimePage'));
const CeoEmployeeDirectoryPage = lazy(() => import('../pages/dashboards/ceo/CeoEmployeeDirectoryPage'));
const CeoPayrollProcessedPage = lazy(() => import('../pages/dashboards/ceo/CeoPayrollProcessedPage'));

const EmployeeOvertimePage = lazy(() => import('../pages/dashboards/Public_Dashboard/OvertimePage'));

// ── Lazy loaded Accounting Pages ──────────────────────────────
const loadAccountingDashboardLayout = () => import('../pages/dashboards/Accounting_Department/DashboardLayout');
const loadAccountingDashboardOverview = () => import('../pages/dashboards/Accounting_Department/DashboardOverview');
const loadAccountingEmployeeManagement = () => import('../pages/dashboards/Accounting_Department/EmployeeManagement');
const loadAccountingAttendanceLeave = () => import('../pages/dashboards/Accounting_Department/AttendanceLeave');
const loadAccountingPayrollManagement = () => import('../pages/dashboards/Accounting_Department/PayrollManagement');
const loadAccountingSettings = () => import('../pages/dashboards/Accounting_Department/Settings');
const loadAccountingPersonalAttendance = () => import('../pages/dashboards/Accounting_Department/AccountingPersonalAttendance');
const loadAccountingOvertimePage = () => import('../pages/dashboards/Accounting_Department/AccountingOvertimePage');
const loadAccountingEventsPanel = () => import('../pages/dashboards/Accounting_Department/Calendar_Events/AccountingEventsPanel');
const loadAccountingMaterialRequestPage = () => import('../pages/dashboards/Accounting_Department/AccountingMaterialRequestPage');
const loadAccountingOvertimeRequestsPanel = () => import('../pages/dashboards/shared/OvertimeRequestApprovalsPanel');

const AccountingDashboardLayout = lazy(() => loadAccountingDashboardLayout().then((mod) => ({ default: mod.DashboardLayout })));
const AccountingDashboardOverview = lazy(() => loadAccountingDashboardOverview().then((mod) => ({ default: mod.DashboardOverview })));
const AccountingEmployeeManagement = lazy(() => loadAccountingEmployeeManagement().then((mod) => ({ default: mod.EmployeeManagement })));
const AccountingAttendanceLeave = lazy(() => loadAccountingAttendanceLeave().then((mod) => ({ default: mod.AttendanceLeave })));
const AccountingPayrollManagement = lazy(() => loadAccountingPayrollManagement().then((mod) => ({ default: mod.PayrollManagement })));
const AccountingSettings = lazy(() => loadAccountingSettings().then((mod) => ({ default: mod.Settings })));
const AccountingPersonalAttendance = lazy(() => loadAccountingPersonalAttendance());
const AccountingOvertimePage = lazy(() => loadAccountingOvertimePage());
const AccountingEventsPanel = lazy(() => loadAccountingEventsPanel());
const AccountingMaterialRequestPage = lazy(() => loadAccountingMaterialRequestPage());
const AccountingOvertimeRequestsPanel = lazy(() => loadAccountingOvertimeRequestsPanel());

export function preloadDashboardAssets({ role, currentPage, departmentName } = {}) {
    const normalizedRole = String(role || '').toLowerCase();
    const normalizedPage = String(currentPage || '').toLowerCase();
    const normalizedDepartment = String(departmentName || '').toLowerCase();
    const isAccountingEmployee = normalizedRole === 'employee' && (
        normalizedDepartment === 'accounting department' || normalizedDepartment === 'accounting'
    );

    const preloads = [import('../pages/CalendarPage')];

    if (normalizedRole === 'accounting' || isAccountingEmployee) {
        preloads.push(
            loadAccountingDashboardLayout(),
            loadAccountingDashboardOverview(),
            loadAccountingEmployeeManagement(),
            loadAccountingAttendanceLeave(),
            loadAccountingPayrollManagement(),
            loadAccountingSettings(),
            import('../pages/ProfilePage'),
            loadAccountingOvertimePage(),
            loadAccountingPersonalAttendance(),
            loadAccountingEventsPanel(),
            loadAccountingMaterialRequestPage(),
            loadAccountingOvertimeRequestsPanel(),
        );
    }

    if (normalizedPage === 'overtime') {
        preloads.push(loadAccountingOvertimePage(), loadAccountingOvertimeRequestsPanel());
    }

    return Promise.allSettled(preloads);
}

/**
 * Renders the accounting dashboard with its own layout and tabs.
 */
export function renderAccountingDashboard({
    user, token, currentPage, handleLogout, handleNavigate,
    notifications, markNotificationRead, markAllNotificationsRead,
}) {
    // Profile page is rendered outside the standard accounting tabs
    if (currentPage === 'profile') {
        return (
            <Suspense fallback={<div className="min-h-screen bg-[#00273C] p-6 sm:p-8"><PageSkeleton /></div>}>
                <div className="min-h-screen bg-[#00273C] relative">
                    <PublicNavigation onNavigate={handleNavigate} currentPage="profile" user={user} onLogout={handleLogout} />
                    <div className="relative pt-28 px-3 sm:px-6 pb-10">
                        <div className="w-full flex flex-col lg:flex-row gap-6">
                            <aside className="hidden lg:block lg:w-64 shrink-0">
                                <AccountingSidebar currentPage="profile" onNavigate={handleNavigate} onLogout={handleLogout} />
                            </aside>
                            <main className="flex-1 min-w-0">
                                <ProfilePage user={user} token={token} onLogout={handleLogout} />
                            </main>
                        </div>
                    </div>
                </div>
            </Suspense>
        );
    }

    const accountingTabs = ['dashboard', 'employees', 'attendance', 'payroll', 'settings'];
    const activeTab = accountingTabs.includes(currentPage) ? currentPage : 'dashboard';
    const effectiveSection = 
        currentPage === 'personal-attendance' ? 'personal-attendance' :
        currentPage === 'overtime' ? 'overtime' :
        currentPage === 'events' ? 'events' :
        currentPage === 'otrequest' ? 'otrequest' :
        currentPage === 'material-requests' ? 'material-requests' : 'main';

    const renderContent = () => {
        if (effectiveSection === 'personal-attendance') return <div className="space-y-4"><AccountingPersonalAttendance user={user} onNavigate={handleNavigate} /></div>;
        if (effectiveSection === 'overtime') return <AccountingOvertimePage user={user} token={token} onNavigate={handleNavigate} embedded />;
        if (effectiveSection === 'events') return <AccountingEventsPanel />;
        if (effectiveSection === 'otrequest') return <AccountingOvertimeRequestsPanel reviewerRole="accounting" />;
        if (effectiveSection === 'material-requests') return <AccountingMaterialRequestPage user={user} />;
        
        switch (activeTab) {
            case 'dashboard': return <AccountingDashboardOverview user={user} onNavigate={handleNavigate} />;
            case 'employees': return <AccountingEmployeeManagement />;
            case 'attendance': return <AccountingAttendanceLeave />;
            case 'payroll': return <AccountingPayrollManagement />;
            case 'settings': return <AccountingSettings />;
            default: return <AccountingDashboardOverview user={user} onNavigate={handleNavigate} />;
        }
    };

    return (
        <Suspense fallback={<div className="min-h-screen bg-[#00273C] p-6 sm:p-8"><PageSkeleton /></div>}>
            <AccountingDashboardLayout
                activeTab={activeTab}
                activeSection={effectiveSection}
                onLogout={handleLogout}
                onNavigate={handleNavigate}
                currentPage={currentPage}
                notifications={notifications}
                onNotificationClick={markNotificationRead}
                onMarkAllRead={markAllNotificationsRead}
            >
                <Suspense fallback={<PageSkeleton />}>
                    {renderContent()}
                </Suspense>
            </AccountingDashboardLayout>
        </Suspense>
    );
}

// ── Page registry ───────────────────────────────────────────────
const PAGE_REGISTRY = {
  // Shared pages
  'attendance': { Component: EmployeeAttendanceDashboard, props: { embedded: true } },
  'calendar': { Component: CalendarPage },
  'profile': { Component: ProfilePage },
  
  // CEO
  'ceo-dashboard': { Component: CeoDashboardPage },
  'ceo-calendar': { Component: CalendarPage },
  'ceo-employees': { Component: CeoEmployeeDirectoryPage },
  'ceo-payroll': { Component: CeoPayrollProcessedPage },
  'ceo-bim-docs': { Component: CeoBimDocumentationPage },
  'ceo-junior-docs': { Component: CeoJuniorArchitectDocumentationPage },
  'ceo-material-requests': { Component: CeoMaterialRequestPage },
  
  // Studio Head
  'studio-head-bim-docs': { Component: StudioHeadBimDocumentationPage },
  'studio-head-junior-docs': { Component: StudioHeadJuniorArchitectDocumentationPage },
  'studio-head-material-requests': { Component: StudioHeadMaterialRequestPage },
  'approvals': { Component: StudioHeadDashboard, props: { currentPage: 'approvals' } },
  'users': { Component: StudioHeadDashboard, props: { currentPage: 'users' } },
  'reviews': { Component: StudioHeadDashboard, props: { currentPage: 'reviews' } },
  'coordination': { Component: StudioHeadDashboard, props: { currentPage: 'coordination' } },
  'studio-head': { Component: StudioHeadDashboard, props: { currentPage: 'studio-head' } },

  // Site Engineer & Coordinator
  'engineer-hub': { Component: EngineerHub },
  'coordinator-hub': { Component: CoordinatorHub },
  
  // Junior Designer & BIM Specialist
  'documentation': null, // Resolved dynamically below based on role
  'designer-hub': { Component: EmployeeAttendanceDashboard, props: { embedded: true } }, // Temporary fallback mapping based on existing code
};

const OVERTIME_REGISTRY = {
  'studio_head': StudioHeadOvertimePage,
  'site_engineer': SiteEngineerOvertimePage,
  'site_coordinator': SiteCoordinatorOvertimePage,
  'junior_architect': JuniorDesignerOvertimePage,
  'intern': InternOvertimePage,
  'bim_specialist': BimSpecialistOvertimePage,
  'ceo': CeoOvertimePage,
  'employee': EmployeeOvertimePage
};

const LoadingFallback = () => (
  <PageSkeleton />
);

/**
 * Main dashboard renderer — maps role + currentPage to the right component.
 */
export function renderDashboard({
    user, token, currentPage, accountingSection, activeTab,
    setActiveTab, setAccountingSection, handleLogout, handleNavigate, fetchNotifications,
    notifications, markNotificationRead, markAllNotificationsRead,
}) {
    if (!user) return null;

    const isAccountingUser = user.role === 'accounting' || (
        user.role === 'employee' && (
            user.department_name?.toLowerCase() === 'accounting department' ||
            user.department_name?.toLowerCase() === 'accounting'
        )
    );

    if (isAccountingUser) {
        return renderAccountingDashboard({
            user, token, currentPage, accountingSection, activeTab, setActiveTab, setAccountingSection, handleLogout, handleNavigate,
            notifications, markNotificationRead, markAllNotificationsRead
        });
    }

    const resolvedPage = String(currentPage || getDefaultPage(user.role)).toLowerCase();
    
    let Component;
    let extraProps = {};

    if (resolvedPage === 'overtime') {
        Component = OVERTIME_REGISTRY[user.role] || EmployeeOvertimePage;
        // In original code, some use token={token}, some use token={localStorage.getItem('token')}
        // We will pass both token and localStorage string directly as fallback inside the component if needed.
        extraProps = { token: token || localStorage.getItem('token') };
    } else if (resolvedPage === 'documentation') {
        Component = user.role === 'bim_specialist' ? BimSpecialistDocumentationPage : JuniorDesignerDocumentationPage;
    } else {
        const entry = PAGE_REGISTRY[resolvedPage];
        if (entry) {
            Component = entry.Component;
            extraProps = entry.props || {};
        } else {
            // Default fallback
            Component = EmployeeAttendanceDashboard;
            extraProps = { embedded: true };
        }
    }

    return (
        <DashboardLayout user={user} currentPage={resolvedPage} onNavigate={handleNavigate} onLogout={handleLogout}>
            <Suspense fallback={<LoadingFallback />}>
                <Component
                    user={user}
                    token={token}
                    onLogout={handleLogout}
                    onNavigate={handleNavigate}
                    {...extraProps}
                />
            </Suspense>
        </DashboardLayout>
    );
}
