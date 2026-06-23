import React from 'react';
import { cardClass } from './utils';

const SummaryCard = ({ label, value, icon: Icon, tone = 'neutral', isActive = false, onClick }) => {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`${cardClass} w-full p-6 text-left transition-all duration-300 ${onClick ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7120]/40 cursor-pointer' : ''} hover:scale-[1.02] hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group ${
        isActive
          ? 'border-[#FF7120]/50 bg-[#FF7120]/10 shadow-[0_0_24px_rgba(255,113,32,0.12)]'
          : 'hover:border-[#FF7120]/30'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/60 font-medium">{label}</p>
          <p className="text-2xl font-bold mt-2 text-white">{value}</p>
        </div>
        {Icon && <Icon className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />}
      </div>
    </Component>
  );
};

export default SummaryCard;
