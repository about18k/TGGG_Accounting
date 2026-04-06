/**
 * Route configuration extracted from App.jsx
 * Maps user roles + currentPage to the correct dashboard component.
 */
import { lazy, Suspense } from 'react';

import StudioHeadDashboard from '../pages/dashboards/StudioHead/StudioHeadDashboard';
import StudioHeadAttendance from '../pages/dashboards/StudioHead/StudioHeadAttendance';
import StudioHeadProfilePage from '../pages/dashboards/StudioHead/StudioHeadProfilePage';
import StudioHeadBimDocumentationPage from '../pages/dashboards/StudioHead/StudioHeadBimDocumentationPage';
import StudioHeadJuniorArchitectDocumentationPage from '../pages/dashboards/StudioHead/StudioHeadJuniorArchitectDocumentationPage';
import StudioHeadMaterialRequestPage from '../pages/dashboards/StudioHead/StudioHeadMaterialRequestPage';

import InternAttendanceDashboard from '../pages/dashboards/Intern_Dashboard/InternAttendance';
import InternOvertimePage from '../pages/dashboards/Intern_Dashboard/OvertimePage';
import InternTodoPage from '../pages/dashboards/Intern_Dashboard/TodoPage';
import InternProfilePage from '../pages/dashboards/Intern_Dashboard/ProfilePage';

import EmployeeAttendanceDashboard from '../pages/dashboards/Public_Dashboard/AttendanceDashboard';
import EmployeeOvertimePage from '../pages/dashboards/Public_Dashboard/OvertimePage';
import EmployeeTodoPage from '../pages/dashboards/Public_Dashboard/TodoPage';
import EmployeeProfilePage from '../pages/dashboards/Public_Dashboard/ProfilePage';

import BimSpecialistAttendanceDashboard from '../pages/dashboards/BimSpecialist/BimAttendance';
import BimSpecialistOvertimePage from '../pages/dashboards/BimSpecialist/BimSpecialistOvertimePage';
import BimSpecialistTodoPage from '../pages/dashboards/BimSpecialist/BimSpecialistTodoPage';
import BimSpecialistDocumentationPage from '../pages/dashboards/BimSpecialist/BimSpecialistDocumentationPage';
import BimSpecialistProfilePage from '../pages/dashboards/BimSpecialist/BimSpecialistProfilePage';

import SiteEngineerAttendanceDashboard from '../pages/dashboards/SiteEngineer_Dashboard/SiteEngineerAttendance';
import EngineerHub from '../pages/dashboards/SiteEngineer_Dashboard/EngineerHub';
import SiteEngineerOvertimePage from '../pages/dashboards/SiteEngineer_Dashboard/SiteEngineerOvertimePage';
import SiteEngineerTodoPage from '../pages/dashboards/SiteEngineer_Dashboard/SiteEngineerTodoPage';
import SiteEngineerProfilePage from '../pages/dashboards/SiteEngineer_Dashboard/SiteEngineerProfilePage';

import SiteCoordinatorAttendanceDashboard from '../pages/dashboards/SiteCoordinator_Dashboard/SiteCoordinatorAttendance';
import CoordinatorHub from '../pages/dashboards/SiteCoordinator_Dashboard/CoordinatorHub';
import SiteCoordinatorOvertimePage from '../pages/dashboards/SiteCoordinator_Dashboard/SiteCoordinatorOvertimePage';
import SiteCoordinatorTodoPage from '../pages/dashboards/SiteCoordinator_Dashboard/SiteCoordinatorTodoPage';
import SiteCoordinatorProfilePage from '../pages/dashboards/SiteCoordinator_Dashboard/SiteCoordinatorProfilePage';

import JuniorDesignerAttendanceDashboard from '../pages/dashboards/JuniorDesigner_Dashboard/JuniorDesignerAttendance';
import JuniorDesignerOvertimePage from '../pages/dashboards/JuniorDesigner_Dashboard/JuniorDesignerOvertimePage';
import JuniorDesignerTodoPage from '../pages/dashboards/JuniorDesigner_Dashboard/JuniorDesignerTodoPage';
import JuniorDesignerProfilePage from '../pages/dashboards/JuniorDesigner_Dashboard/JuniorDesignerProfilePage';
import JuniorDesignerDocumentationPage from '../pages/dashboards/JuniorDesigner_Dashboard/JuniorDesignerDocumentationPage';

import CeoAttendanceDashboard from '../pages/dashboards/ceo/ceoAttendance';
import CeoDashboardPage from '../pages/dashboards/ceo/CeoDashboardPage';
import CeoBimDocumentationPage from '../pages/dashboards/ceo/CeoBimDocumentationPage';
import CeoJuniorArchitectDocumentationPage from '../pages/dashboards/ceo/CeoJuniorArchitectDocumentationPage';
import CeoMaterialRequestPage from '../pages/dashboards/ceo/CeoMaterialRequestPage';
import CeoOvertimePage from '../pages/dashboards/ceo/CeoOvertimePage';
import CeoTodoPage from '../pages/dashboards/ceo/CeoTodoPage';
import CeoProfilePage from '../pages/dashboards/ceo/CeoProfilePage';
import CeoEmployeeDirectoryPage from '../pages/dashboards/ceo/CeoEmployeeDirectoryPage';
import CeoPayrollProcessedPage from '../pages/dashboards/ceo/CeoPayrollProcessedPage';
import CeoCalendarPage from '../pages/dashboards/ceo/CeoCalendarPage';

const AccountingDashboardLayout = lazy(() =>
    import('../pages/dashboards/Accounting_Department/DashboardLayout').then((mod) => ({ default: mod.DashboardLayout }))
);
const AccountingDashboardOverview = lazy(() =>
    import('../pages/dashboards/Accounting_Department/DashboardOverview').then((mod) => ({ default: mod.DashboardOverview }))
);
const AccountingEmployeeManagement = lazy(() =>
    import('../pages/dashboards/Accounting_Department/EmployeeManagement').then((mod) => ({ default: mod.EmployeeManagement }))
);
const AccountingAttendanceLeave = lazy(() =>
    import('../pages/dashboards/Accounting_Department/AttendanceLeave').then((mod) => ({ default: mod.AttendanceLeave }))
);
const AccountingPayrollManagement = lazy(() =>
    import('../pages/dashboards/Accounting_Department/PayrollManagement').then((mod) => ({ default: mod.PayrollManagement }))
);
const AccountingSettings = lazy(() =>
    import('../pages/dashboards/Accounting_Department/Settings').then((mod) => ({ default: mod.Settings }))
);
const AccountingPersonalAttendance = lazy(() =>
    import('../pages/dashboards/Accounting_Department/AccountingPersonalAttendance')
);
const AccountingOvertimePage = lazy(() =>
    import('../pages/dashboards/Accounting_Department/AccountingOvertimePage')
);
const AccountingEventsPanel = lazy(() =>
    import('../pages/dashboards/Accounting_Department/Calendar_Events/AccountingEventsPanel')
);
const AccountingMaterialRequestPage = lazy(() =>
    import('../pages/dashboards/Accounting_Department/AccountingMaterialRequestPage')
);
const AccountingOvertimeRequestsPanel = lazy(() =>
    import('../pages/dashboards/shared/OvertimeRequestApprovalsPanel')
);
const EmployeeCalendarPage = lazy(() =>
    import('../pages/dashboards/shared/EmployeeCalendarPage')
);
const AccountingProfilePage = lazy(() =>
    import('../pages/dashboards/Accounting_Department/AccountingProfilePage')
);

// Suspense wrapper for lazy-loaded calendar page
const SuspendedCalendarPage = ({ user, onNavigate }) => (
    <Suspense fallback={<div className="min-h-screen bg-[#00273C] text-white flex items-center justify-center text-sm">Loading calendar...</div>}>
        <EmployeeCalendarPage user={user} onNavigate={onNavigate} />
    </Suspense>
);

/**
 * Renders the accounting dashboard with its own layout and tabs.
 */
export function renderAccountingDashboard({
    user, token, currentPage, handleLogout, handleNavigate,
    notifications, markNotificationRead, markAllNotificationsRead,
}) {
    // Profile page is rendered outside the dashboard layout
    if (currentPage === 'profile') {
        return (
            <Suspense fallback={<div className="min-h-screen bg-[#00273C] text-white flex items-center justify-center text-sm">Loading profile...</div>}>
                <AccountingProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />
            </Suspense>
        );
    }

    // Standard accounting tabs that map directly to pages
    const accountingTabs = ['dashboard', 'employees', 'attendance', 'payroll', 'settings'];
    
    // Determine the active tab from the URL (currentPage)
    const activeTab = accountingTabs.includes(currentPage) ? currentPage : 'dashboard';
    
    // Determine if we are in a sub-section (Personal Attendance or Overtime)
    const effectiveSection = 
        currentPage === 'personal-attendance'
            ? 'personal-attendance'
            : currentPage === 'overtime'
                ? 'overtime'
                : currentPage === 'events'
                    ? 'events'
                    : currentPage === 'otrequest'
                        ? 'otrequest'
                    : currentPage === 'material-requests'
                        ? 'material-requests'
                    : 'main';

    const renderContent = () => {
        if (effectiveSection === 'personal-attendance') {
            return (
                <div className="space-y-4">
                    <AccountingPersonalAttendance user={user} onNavigate={handleNavigate} />
                </div>
            );
        }
        if (effectiveSection === 'overtime') {
            return (
                <AccountingOvertimePage
                    user={user}
                    token={token}
                    onNavigate={handleNavigate}
                    embedded
                />
            );
        }
        if (effectiveSection === 'events') {
            return <AccountingEventsPanel />;
        }
        if (effectiveSection === 'otrequest') {
            return <AccountingOvertimeRequestsPanel reviewerRole="accounting" />;
        }
        if (effectiveSection === 'material-requests') {
            return <AccountingMaterialRequestPage user={user} />;
        }
        switch (activeTab) {
            case 'dashboard':
                return <AccountingDashboardOverview user={user} />;
            case 'employees':
                return <AccountingEmployeeManagement />;
            case 'attendance':
                return <AccountingAttendanceLeave />;
            case 'payroll':
                return <AccountingPayrollManagement />;
            case 'settings':
                return <AccountingSettings />;
            default:
                return <AccountingDashboardOverview user={user} />;
        }
    };

    return (
        <Suspense fallback={<div className="min-h-screen bg-[#00273C] text-white flex items-center justify-center text-sm">Loading accounting workspace...</div>}>
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
                <Suspense fallback={<div className="py-8 text-sm text-white/70">Loading page...</div>}>
                    {renderContent()}
                </Suspense>
            </AccountingDashboardLayout>
        </Suspense>
    );
}

/**
 * Main dashboard renderer — maps role + currentPage to the right component.
 */
export function renderDashboard({
    user, token, currentPage, accountingSection, activeTab,
    setActiveTab, setAccountingSection, handleLogout, handleNavigate, fetchNotifications,
    notifications, markNotificationRead, markAllNotificationsRead,
}) {
    if (!user) return null;

    // Studio head / admin
    if (user.role === 'studio_head' || user.role === 'admin') {
        if (currentPage === 'attendance') return <StudioHeadAttendance user={user} token={localStorage.getItem('token')} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'calendar') return <SuspendedCalendarPage user={user} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <EmployeeOvertimePage user={user} token={localStorage.getItem('token')} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'profile') return <StudioHeadProfilePage user={user} token={localStorage.getItem('token')} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'studio-head-bim-docs') return <StudioHeadBimDocumentationPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'studio-head-junior-docs') return <StudioHeadJuniorArchitectDocumentationPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'studio-head-material-requests') return <StudioHeadMaterialRequestPage user={user} onNavigate={handleNavigate} />;

        // These keys map to panels inside StudioHeadDashboard
        const studioHeadPages = ['approvals', 'users', 'reviews', 'coordination', 'studio-head'];
        if (studioHeadPages.includes(currentPage)) {
            return <StudioHeadDashboard user={user} onLogout={handleLogout} onNavigate={handleNavigate} currentPage={currentPage} />;
        }
        
        return <StudioHeadDashboard user={user} onLogout={handleLogout} onNavigate={handleNavigate} currentPage="approvals" />;
    }

    // Accounting
    if (user.role === 'accounting') {
        return renderAccountingDashboard({
            user, token, currentPage, accountingSection, activeTab, setActiveTab, setAccountingSection, handleLogout, handleNavigate,
            notifications, markNotificationRead, markAllNotificationsRead
        });
    }

    // Employee in Accounting Department
    if (user.role === 'employee' && (user.department_name?.toLowerCase() === 'accounting department' || user.department_name?.toLowerCase() === 'accounting')) {
        return renderAccountingDashboard({
            user, token, currentPage, accountingSection, activeTab, setActiveTab, setAccountingSection, handleLogout, handleNavigate,
            notifications, markNotificationRead, markAllNotificationsRead
        });
    }

    // Site Engineer
    if (user.role === 'site_engineer') {
        if (currentPage === 'engineer-hub') return <EngineerHub user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'calendar') return <SuspendedCalendarPage user={user} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <SiteEngineerOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <SiteEngineerTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <SiteEngineerProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <SiteEngineerAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // Site Coordinator
    if (user.role === 'site_coordinator') {
        if (currentPage === 'coordinator-hub') return <CoordinatorHub user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'calendar') return <SuspendedCalendarPage user={user} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <SiteCoordinatorOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <SiteCoordinatorTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <SiteCoordinatorProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <SiteCoordinatorAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // Junior Designer / Architect
    if (user.role === 'junior_architect') {
        if (currentPage === 'designer-hub') return <JuniorDesignerAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'documentation') return <JuniorDesignerDocumentationPage user={user} onNavigate={handleNavigate} />;
        if (currentPage === 'calendar') return <SuspendedCalendarPage user={user} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <JuniorDesignerOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <JuniorDesignerTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <JuniorDesignerProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <JuniorDesignerAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // Intern
    if (user.role === 'intern') {
        if (currentPage === 'calendar') return <SuspendedCalendarPage user={user} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <InternOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <InternTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <InternProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <InternAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // Employee
    if (user.role === 'employee') {
        if (currentPage === 'calendar') return <SuspendedCalendarPage user={user} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <EmployeeOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <EmployeeTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <EmployeeProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <EmployeeAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // BIM Specialist
    if (user.role === 'bim_specialist') {
        if (currentPage === 'calendar') return <SuspendedCalendarPage user={user} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <BimSpecialistOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <BimSpecialistTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'documentation') return <BimSpecialistDocumentationPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'profile') return <BimSpecialistProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <BimSpecialistAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // CEO / President
    if (user.role === 'president' || user.role === 'ceo') {
        if (currentPage === 'ceo-dashboard') return <CeoDashboardPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'ceo-calendar') return <CeoCalendarPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'ceo-employees') return <CeoEmployeeDirectoryPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'ceo-payroll') return <CeoPayrollProcessedPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <CeoOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <CeoTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <CeoProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'ceo-bim-docs') return <CeoBimDocumentationPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'ceo-junior-docs') return <CeoJuniorArchitectDocumentationPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'ceo-material-requests') return <CeoMaterialRequestPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <CeoAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // Department-based fallback — Accounting
    const departmentKey = (user.department_name || '').toLowerCase();
    if (departmentKey === 'accounting department' || departmentKey === 'accounting') {
        return renderAccountingDashboard({
            user, token, currentPage, accountingSection, activeTab, setActiveTab, setAccountingSection, handleLogout, handleNavigate,
            notifications, markNotificationRead, markAllNotificationsRead
        });
    }

    // Fallback → Employee Dashboard
    if (currentPage === 'calendar') return <SuspendedCalendarPage user={user} onNavigate={handleNavigate} />;
    if (currentPage === 'overtime') return <EmployeeOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    if (currentPage === 'todo') return <EmployeeTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
    if (currentPage === 'profile') return <EmployeeProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    return <EmployeeAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
}
