import React from 'react';

export const Badge = ({ tone = 'neutral', children }) => {
    const toneClasses = {
        warn: 'bg-[#FF7120]/10 text-[#FF7120] border-[#FF7120]/30',
        good: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
        pending: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
        approved: 'bg-green-500/10 text-green-300 border-green-500/20',
        rejected: 'bg-red-500/10 text-red-300 border-red-500/20',
        neutral: 'bg-white/5 text-white/70 border-white/10',
    };
    const cls = toneClasses[tone] || toneClasses.neutral;
    return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${cls}`}>{children}</span>;
};

export const EmptyStatePanel = ({ Icon, title, subtitle, accent = 'orange', compact = false }) => {
    const tone = accent === 'green'
        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
        : 'bg-[#FF7120]/10 border-[#FF7120]/25 text-[#FF7120]';

    return (
        <div className={`rounded-xl bg-transparent text-center ${compact ? 'p-4' : 'p-8'}`}>
            <div className={`mx-auto ${compact ? 'mb-2.5 h-10 w-10 rounded-xl' : 'mb-4 h-14 w-14 rounded-2xl'} border flex items-center justify-center ${tone}`}>
                <Icon className={compact ? 'h-4.5 w-4.5' : 'h-6 w-6'} />
            </div>
            <p className={`${compact ? 'text-sm' : 'text-lg'} font-semibold text-white/90`}>{title}</p>
            <p className={`mt-2 ${compact ? 'text-xs max-w-[260px]' : 'text-sm max-w-[300px]'} text-white/55 mx-auto`}>{subtitle}</p>
        </div>
    );
};
