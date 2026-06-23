import React from 'react';

const Badge = ({ tone = 'neutral', children, className = '' }) => {
  const toneClasses = {
    pending: 'bg-blue-500/10 text-blue-200 border-blue-500/20',
    forwarded: 'bg-cyan-500/10 text-cyan-200 border-cyan-500/20',
    approved: 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20',
    rejected: 'bg-red-500/10 text-red-200 border-red-500/20',
    neutral: 'bg-white/5 text-white/70 border-white/10',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClasses[tone] || toneClasses.neutral} ${className}`.trim()}>
      {children}
    </span>
  );
};

export default Badge;
