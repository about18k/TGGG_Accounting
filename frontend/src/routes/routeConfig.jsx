/**
 * Route configuration extracted from App.jsx
 * Maps user roles + currentPage to the correct dashboard component.
 */
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

import { DashboardLayout } from '../pages/dashboards/Accounting_Department/DashboardLayout';
import { DashboardOverview } from '../pages/dashboards/Accounting_Department/DashboardOverview';
import { EmployeeManagement } from '../pages/dashboards/Accounting_Department/EmployeeManagement';
import { AttendanceLeave } from '../pages/dashboards/Accounting_Department/AttendanceLeave';
import { PayrollManagement } from '../pages/dashboards/Accounting_Department/PayrollManagement';
import { Settings } from '../pages/dashboards/Accounting_Department/Settings';
import AccountingPersonalAttendance from '../pages/dashboards/Accounting_Department/AccountingPersonalAttendance';
import AccountingOvertimePage from '../pages/dashboards/Accounting_Department/AccountingOvertimePage';
import AccountingEventsPanel from '../pages/dashboards/Accounting_Department/AccountingEventsPanel';

/**
 * Renders the accounting dashboard with its own layout and tabs.
 */
export function renderAccountingDashboard({
    user, token, currentPage, accountingSection, activeTab,
    setActiveTab, setAccountingSection, handleLogout, handleNavigate,
}) {
    const effectiveSection =
        accountingSection !== 'main'
            ? accountingSection
            : currentPage === 'personal-attendance'
                ? 'personal-attendance'
                : currentPage === 'overtime'
                    ? 'overtime'
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
        switch (activeTab) {
            case 'dashboard':
                return <DashboardOverview user={user} />;
            case 'employees':
                return <EmployeeManagement />;
            case 'attendance':
                return <AttendanceLeave />;
            case 'payroll':
                return <PayrollManagement />;
            case 'settings':
                return <Settings />;
            default:
                return <DashboardOverview user={user} />;
        }
    };

    return (
        <DashboardLayout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeSection={effectiveSection}
            setActiveSection={setAccountingSection}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            currentPage={currentPage}
        >
            {renderContent()}
        </DashboardLayout>
    );
}

/**
 * Main dashboard renderer — maps role + currentPage to the right component.
 */
export function renderDashboard({
    user, token, currentPage, accountingSection, activeTab,
    setActiveTab, setAccountingSection, handleLogout, handleNavigate, fetchNotifications,
}) {
    if (!user) return null;

    // Studio head / admin
    if (user.role === 'studio_head' || user.role === 'admin') {
        if (currentPage === 'attendance') return <StudioHeadAttendance user={user} token={localStorage.getItem('token')} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <EmployeeOvertimePage user={user} token={localStorage.getItem('token')} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'profile') return <StudioHeadProfilePage user={user} token={localStorage.getItem('token')} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'studio-head-bim-docs') return <StudioHeadBimDocumentationPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'studio-head-junior-docs') return <StudioHeadJuniorArchitectDocumentationPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'studio-head-material-requests') return <StudioHeadMaterialRequestPage user={user} onNavigate={handleNavigate} />;
        if (currentPage === 'studio-head') return <StudioHeadDashboard user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <StudioHeadDashboard user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // Accounting
    if (user.role === 'accounting') {
        return renderAccountingDashboard({ user, token, currentPage, accountingSection, activeTab, setActiveTab, setAccountingSection, handleLogout, handleNavigate });
    }

    // Employee in Accounting Department
    if (user.role === 'employee' && (user.department_name?.toLowerCase() === 'accounting department' || user.department_name?.toLowerCase() === 'accounting')) {
        return renderAccountingDashboard({ user, token, currentPage, accountingSection, activeTab, setActiveTab, setAccountingSection, handleLogout, handleNavigate });
    }

    // Site Engineer
    if (user.role === 'site_engineer') {
        if (currentPage === 'engineer-hub') return <EngineerHub user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <SiteEngineerOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <SiteEngineerTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <SiteEngineerProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <SiteEngineerAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // Site Coordinator
    if (user.role === 'site_coordinator') {
        if (currentPage === 'coordinator-hub') return <CoordinatorHub user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <SiteCoordinatorOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <SiteCoordinatorTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <SiteCoordinatorProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <SiteCoordinatorAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // Junior Designer / Architect
    if (user.role === 'junior_architect') {
        if (currentPage === 'designer-hub') return <JuniorDesignerAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'documentation') return <JuniorDesignerDocumentationPage user={user} onNavigate={handleNavigate} />;
        if (currentPage === 'overtime') return <JuniorDesignerOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <JuniorDesignerTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <JuniorDesignerProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <JuniorDesignerAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // Intern
    if (user.role === 'intern') {
        if (currentPage === 'overtime') return <InternOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <InternTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <InternProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <InternAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // Employee
    if (user.role === 'employee') {
        if (currentPage === 'overtime') return <EmployeeOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <EmployeeTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'profile') return <EmployeeProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <EmployeeAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // BIM Specialist
    if (user.role === 'bim_specialist') {
        if (currentPage === 'overtime') return <BimSpecialistOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'todo') return <BimSpecialistTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
        if (currentPage === 'documentation') return <BimSpecialistDocumentationPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
        if (currentPage === 'profile') return <BimSpecialistProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
        return <BimSpecialistAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    }

    // CEO / President
    if (user.role === 'president' || user.role === 'ceo') {
        if (currentPage === 'ceo-dashboard') return <CeoDashboardPage user={user} onLogout={handleLogout} onNavigate={handleNavigate} />;
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
        return renderAccountingDashboard({ user, token, currentPage, accountingSection, activeTab, setActiveTab, setAccountingSection, handleLogout, handleNavigate });
    }

    // Fallback → Employee Dashboard
    if (currentPage === 'overtime') return <EmployeeOvertimePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    if (currentPage === 'todo') return <EmployeeTodoPage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} onNotificationUpdate={fetchNotifications} />;
    if (currentPage === 'profile') return <EmployeeProfilePage user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
    return <EmployeeAttendanceDashboard user={user} token={token} onLogout={handleLogout} onNavigate={handleNavigate} />;
}
