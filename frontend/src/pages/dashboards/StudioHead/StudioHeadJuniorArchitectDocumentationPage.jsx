import React from 'react';
import StudioHeadBimDocumentationPage from './StudioHeadBimDocumentationPage';

const StudioHeadJuniorArchitectDocumentationPage = ({ user, onNavigate }) => (
    <StudioHeadBimDocumentationPage
        user={user}
        onNavigate={onNavigate}
        pageEyebrow="Studio Head Review"
        pageTitle="Junior Architect Documentation"
        pageDescription="Approve Junior Architect documentation submissions before they are forwarded to the CEO."
        navigationCurrentPage="studio-head-junior-docs"
        sidebarCurrentPage="studio-head-junior-docs"
        documentationQuery={{ created_by_role: 'junior_architect' }}
    />
);

export default StudioHeadJuniorArchitectDocumentationPage;
