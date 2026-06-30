import { useEffect, useState } from 'react';
import { getActiveAnnouncements, dismissEvent } from '../services/attendanceService';
import { Megaphone, X } from 'lucide-react';
import { toast } from 'sonner';

const formatEventDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = String(dateStr).split('-').map(Number);
  if (!year || !month || !day) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const tickerStyles = `
  @keyframes marquee {
    0% { transform: translate3d(0, 0, 0); }
    100% { transform: translate3d(-50%, 0, 0); }
  }
  .ticker-container {
    overflow: hidden;
    white-space: nowrap;
    width: 100%;
    background-color: #001524;
    border-bottom: 1px solid rgba(255, 113, 32, 0.25);
    display: flex;
    align-items: center;
    position: relative;
  }
  .ticker-wrap {
    display: inline-flex;
    white-space: nowrap;
  }
  .ticker-move {
    display: inline-flex;
    white-space: nowrap;
    animation: marquee linear infinite;
  }
  .ticker-container:hover .ticker-move {
    animation-play-state: paused;
  }
`;

export default function AnnouncementBar({ user }) {
  const [announcements, setAnnouncements] = useState([]);

  const fetchAnnouncements = async () => {
    try {
      const data = await getActiveAnnouncements();
      setAnnouncements(data || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    const pollInterval = setInterval(fetchAnnouncements, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  const handleDismiss = async (eventId) => {
    try {
      await dismissEvent(eventId);
      toast.success('Announcement dismissed.');
      setAnnouncements((prev) => prev.filter((ann) => ann.id !== eventId));
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to dismiss announcement';
      toast.error(msg);
    }
  };

  if (announcements.length === 0) return null;

  const isAdmin =
    user?.role === 'accounting' ||
    user?.role === 'studio_head' ||
    user?.role === 'ceo';

  // Ensure there are at least 4 items in the list before duplicating for marquee to prevent gaps on wide screens
  const getExtendedAnnouncements = () => {
    let items = [...announcements];
    if (items.length === 0) return [];
    while (items.length < 4) {
      items = [...items, ...items];
    }
    return items;
  };

  const extendedList = getExtendedAnnouncements();
  const duration = Math.max(20, extendedList.length * 8);

  const renderAnnouncementItem = (ann, keyPrefix) => (
    <div
      key={`${ann.id}-${keyPrefix}`}
      className="inline-flex items-center gap-3 mx-12 text-xs sm:text-sm text-white/90"
    >
      <span className="font-semibold text-[#FF7120] whitespace-nowrap">{ann.title}</span>
      {ann.description && (
        <>
          <span className="text-white/30">—</span>
          <span className="text-white/80 whitespace-nowrap">{ann.description}</span>
        </>
      )}
      <span className="text-white/30">|</span>
      <span className="text-white/60 whitespace-nowrap">{formatEventDate(ann.date)}</span>
      {isAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss(ann.id);
          }}
          className="text-white/40 hover:text-red-400 p-0.5 rounded transition-colors ml-1.5 cursor-pointer flex items-center justify-center"
          title="Dismiss Announcement"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );

  return (
    <>
      <style>{tickerStyles}</style>
      <div className="w-full bg-[#001524] border-b border-[#FF7120]/30 flex items-center relative z-40 h-10 select-none overflow-hidden ticker-container">
        {/* Static Label */}
        <div className="h-full bg-[#FF7120] text-white font-bold text-xs uppercase px-4 flex items-center gap-2 shrink-0 z-10 shadow-[4px_0_10px_rgba(0,0,0,0.35)]">
          <Megaphone size={14} className="animate-pulse text-white" />
          <span className="hidden sm:inline tracking-wider">Announcements</span>
        </div>

        {/* Marquee Content */}
        <div className="flex-1 overflow-hidden h-full flex items-center relative">
          <div className="ticker-wrap h-full flex items-center">
            <div className="ticker-move" style={{ animationDuration: `${duration}s` }}>
              {extendedList.map((ann, idx) => renderAnnouncementItem(ann, `first-${idx}`))}
              {extendedList.map((ann, idx) => renderAnnouncementItem(ann, `second-${idx}`))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
