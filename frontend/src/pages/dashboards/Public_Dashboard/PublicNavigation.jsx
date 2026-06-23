import React from 'react';
import { User } from 'lucide-react';
import NotificationBell from '../../../components/navigation/NotificationBell';
import DesktopNavLinks from '../../../components/navigation/DesktopNavLinks';
import MobileMenu from '../../../components/navigation/MobileMenu';

const PublicNavigation = ({ onNavigate, currentPage = 'attendance', user }) => {
  return (
    <nav className="fixed top-0 w-full z-50 px-3 sm:px-6 py-2 sm:py-4" style={{ background: '#001f35' }}>
      <div className="flex flex-row items-start lg:items-center justify-between w-full mx-auto px-2 sm:px-4 gap-2 lg:gap-0">
        {/* Logo & Title: Left side */}
        <div className="flex items-center gap-2 sm:gap-4 mt-1 lg:mt-0">
          <img src="/logo.webp" alt="TripleG AOC" className="h-8 sm:h-10" />
          <span className="text-lg sm:text-[1.3rem] font-semibold text-white whitespace-nowrap">
            Triple<span className="text-[#FF7120]">G</span> AOC
          </span>
        </div>

        {/* Right side container */}
        <div className="flex flex-col lg:flex-row items-end lg:items-center w-auto gap-2 lg:gap-4">
          <DesktopNavLinks user={user} currentPage={currentPage} onNavigate={onNavigate} />

          {/* Right actions wrapper */}
          <div className="flex flex-col items-end gap-2 lg:flex-row lg:items-center lg:gap-4 lg:order-2">
            {/* Notifications & Profile - Left side on mobile, Right side on desktop */}
            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationBell user={user} onNavigate={onNavigate} />

              <button
                onClick={() => onNavigate('profile')}
                style={{
                  background: currentPage === 'profile' ? '#FF7120' : 'transparent',
                  border: '1px solid #FF7120',
                  color: currentPage === 'profile' ? 'white' : '#FF7120',
                  padding: '0.4rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  transition: 'all 0.2s'
                }}
              >
                <User className="h-4 w-4" style={{ transition: 'color 0.2s' }} />
              </button>
            </div>
            
            {/* Mobile Menu Trigger: Grip Icon for Sidebar roles */}
            <div className="flex items-center justify-end lg:hidden mt-2 lg:mt-0">
              <MobileMenu user={user} currentPage={currentPage} onNavigate={onNavigate} />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default PublicNavigation;
