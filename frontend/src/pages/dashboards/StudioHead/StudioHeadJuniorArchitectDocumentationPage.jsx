import React from 'react';
import StudioHeadBimDocumentationPage from './StudioHeadBimDocumentationPage';

const StudioHeadJuniorArchitectDocumentationPage = ({ user, onNavigate }) => (
    <StudioHeadBimDocumentationPage
        user={user}
        onNavigate={onNavigate}
        pageEyebrow="Studio Head Review"
        pageTitle="Junior Architect Documentation"
        pageDescription="Approve Junior Architect documentation submissions before they are forwarded to the CEO."
        sidebarCurrentPage="junior-architect-docs"
        documentationQuery={{ created_by_role: 'junior_architect' }}
    />
);

export default StudioHeadJuniorArchitectDocumentationPage;
