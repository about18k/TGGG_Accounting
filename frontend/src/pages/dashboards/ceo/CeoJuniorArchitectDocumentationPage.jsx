import React from 'react';
import CeoBimDocumentationPage from './CeoBimDocumentationPage';

const CeoJuniorArchitectDocumentationPage = ({ user, onNavigate, onLogout }) => (
    <CeoBimDocumentationPage
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
        pageEyebrow="CEO Final Review"
        pageTitle="Junior Architect Documentation"
        pageDescription="Review Junior Architect documentation that already passed Studio Head review."
        navigationCurrentPage="ceo-junior-docs"
        sidebarCurrentPage="ceo-junior-docs"
        documentationQuery={{ created_by_role: 'junior_architect' }}
    />
);

export default CeoJuniorArchitectDocumentationPage;
