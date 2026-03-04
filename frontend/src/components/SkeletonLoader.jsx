import React from 'react';
import './SkeletonLoader.css';

export const TableSkeleton = () => (
  <div className="skeleton-table">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="skeleton-row">
        <div className="skeleton skeleton-text" style={{ width: '15%' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '12%' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '10%' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '10%' }}></div>
        <div className="skeleton skeleton-badge"></div>
        <div className="skeleton skeleton-text" style={{ width: '8%' }}></div>
        <div className="skeleton skeleton-avatar"></div>
      </div>
    ))}
  </div>
);

export const CardSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-title"></div>
    <div className="skeleton skeleton-text" style={{ width: '80%', marginTop: '1rem' }}></div>
    <div className="skeleton skeleton-text" style={{ width: '60%', marginTop: '0.75rem' }}></div>
    <div className="skeleton skeleton-text" style={{ width: '45%', marginTop: '0.75rem' }}></div>
    <div className="skeleton skeleton-button" style={{ marginTop: '1.5rem' }}></div>
  </div>
);
