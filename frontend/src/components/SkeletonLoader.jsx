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

export const PageSkeleton = () => (
  <div className="w-full space-y-6">
    {/* Header Card Skeleton */}
    <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md p-6 sm:p-8 space-y-4">
      <div className="skeleton skeleton-text" style={{ width: '120px', height: '12px' }}></div>
      <div className="skeleton skeleton-text" style={{ width: '280px', height: '32px' }}></div>
      <div className="skeleton skeleton-text" style={{ width: '70%', height: '14px' }}></div>
    </div>
    
    {/* Content Card Skeleton */}
    <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md p-6 space-y-6">
      <div className="flex gap-2">
        <div className="skeleton skeleton-badge" style={{ width: '100px', height: '32px' }}></div>
        <div className="skeleton skeleton-badge" style={{ width: '100px', height: '32px' }}></div>
      </div>
      <div className="space-y-3 pt-2">
        <div className="skeleton skeleton-text" style={{ width: '100%', height: '16px' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '90%', height: '16px' }}></div>
        <div className="skeleton skeleton-text" style={{ width: '95%', height: '16px' }}></div>
      </div>
    </div>
  </div>
);
