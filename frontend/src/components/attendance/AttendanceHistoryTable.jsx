import React, { useState } from 'react';
import { TableSkeleton } from '../SkeletonLoader';
import {
  formatTime12,
  groupByDate,
  calculateTotalHours,
  calculateTotalDeduction,
  buildLateBreakdown,
  getPrimaryLocation,
  getCombinedNotes,
  formatLateDeduction,
} from '../../utils/attendanceFormatters';
import { X, FileText } from 'lucide-react';

/**
 * Standardized Attendance History Table component
 * Used consistently across all role dashboards
 *
 * Props:
 * - records: Array of attendance records with session_type, time_in, time_out, etc.
 * - loading: Boolean indicating if data is loading
 * - error: String error message if any
 * - selectedDate: Currently selected date for filtering
 * - onDateChange: Callback when date is changed
 *
 * Attachment data comes directly from each record's attachment_url / attachment_filename
 * fields serialized by the backend — no extra per-row API calls needed.
 */
export default function AttendanceHistoryTable({
  records = [],
  loading = false,
  error = '',
  selectedDate = new Date().toISOString().split('T')[0],
  onDateChange = () => { },
}) {
  const [selectedWorkData, setSelectedWorkData] = useState(null);

  const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

  return (
    <div className={cardClass}>
      <div className="p-4 sm:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-white font-semibold flex-1 min-w-[200px] text-lg tracking-tight">
          My Attendance History
        </h3>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#001a2b] px-3 py-2 w-full sm:w-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="bg-transparent text-white/80 text-sm outline-none w-full cursor-pointer [&::-webkit-calendar-picker-indicator]:invert-[0.6]"
          />
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <table className="w-full min-w-[1200px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#001a2b] border-b border-white/10">
              {[
                'DATE',
                'AM IN',
                'AM OUT',
                'PM IN',
                'PM OUT',
                'OT IN',
                'OT OUT',
                'TOTAL HOURS',
                'LATE DEDUCTION',
                'LOCATION',
                'WORK DONE',
                'ATTACHMENTS',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-white/50 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={12} className="px-6 py-4">
                  <TableSkeleton />
                </td>
              </tr>
            )}

            {!loading && records.length === 0 && (
              <tr>
                <td colSpan={12} className="px-6 py-4 text-white/60 text-sm text-center">
                  No attendance records yet.
                </td>
              </tr>
            )}

            {!loading &&
              records.length > 0 &&
              (() => {
                const daily = groupByDate(records);
                return daily.map((day, index) => {
                  const am = day.morning;
                  const pm = day.afternoon;
                  const ot = day.overtime;

                  const totalHours = calculateTotalHours(am, pm, ot);
                  const totalDeduction = calculateTotalDeduction(am, pm, ot);
                  const anyLate = am?.is_late || pm?.is_late || ot?.is_late;
                  const address = getPrimaryLocation(am, pm, ot);
                  const allNotes = getCombinedNotes(am, pm, ot);

                  // Attachment: use data already embedded in the record by _serialize_attendance —
                  // no extra API call needed
                  const attendanceRecord = records.find(r => r.date === day.date);
                  const attachment = attendanceRecord?.attachment_url
                    ? { filename: attendanceRecord.attachment_filename, url: attendanceRecord.attachment_url }
                    : null;

                  return (
                    <React.Fragment key={day.date}>
                      <tr
                        className={[
                          'border-b border-white/5',
                          index % 2 === 0 ? 'bg-[#00273C]' : 'bg-[#001f35]',
                          'hover:bg-[#FF7120]/5 transition',
                        ].join(' ')}
                      >
                        <td className="px-4 py-4 text-white/90 text-sm whitespace-nowrap">
                          {day.date}
                        </td>
                        <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">
                          {formatTime12(am?.time_in)}
                        </td>
                        <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">
                          {formatTime12(am?.time_out)}
                        </td>
                        <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">
                          {formatTime12(pm?.time_in)}
                        </td>
                        <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">
                          {formatTime12(pm?.time_out)}
                        </td>
                        <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">
                          {formatTime12(ot?.time_in)}
                        </td>
                        <td className="px-4 py-4 text-white/85 text-sm whitespace-nowrap">
                          {formatTime12(ot?.time_out)}
                        </td>
                        <td className="px-4 py-4 text-emerald-400 text-sm font-semibold whitespace-nowrap">
                          {totalHours}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold">
                          {anyLate ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[#FF7120] font-bold">
                                -{formatLateDeduction(totalDeduction)}
                              </span>
                              <span className="text-white/50 text-xs">
                                {buildLateBreakdown(am, pm, ot)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-emerald-300">On time</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-white/70 text-sm max-w-[200px]">
                          <div className="flex flex-col gap-1.5">
                            {(am || pm || ot) && (
                              <>
                                {am && (
                                  <div className="border-l-2 border-emerald-500/30 pl-2 py-0.5">
                                    <div className="text-[10px] text-white/40 uppercase font-bold mb-0.5 tracking-tight">AM Session</div>
                                    <div className="flex flex-col gap-0.5" title={`In: ${am.clock_in_address || am.location}\nOut: ${am.clock_out_address || am.location}`}>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-emerald-400/70 font-bold w-6">IN:</span>
                                        <span className="truncate text-[11px] block">{am.clock_in_address || am.location || '-'}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-orange-400/70 font-bold w-6">OUT:</span>
                                        <span className="truncate text-[11px] block">{am.time_out ? (am.clock_out_address || am.location || '-') : '---'}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {pm && (
                                  <div className="border-l-2 border-blue-500/30 pl-2 py-0.5 mt-1">
                                    <div className="text-[10px] text-white/40 uppercase font-bold mb-0.5 tracking-tight">PM Session</div>
                                    <div className="flex flex-col gap-0.5" title={`In: ${pm.clock_in_address || pm.location}\nOut: ${pm.clock_out_address || pm.location}`}>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-emerald-400/70 font-bold w-6">IN:</span>
                                        <span className="truncate text-[11px] block">{pm.clock_in_address || pm.location || '-'}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-orange-400/70 font-bold w-6">OUT:</span>
                                        <span className="truncate text-[11px] block">{pm.time_out ? (pm.clock_out_address || pm.location || '-') : '---'}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            {!(am || pm) && ot && (
                               <div className="border-l-2 border-purple-500/30 pl-2 py-0.5">
                                 <div className="text-[10px] text-white/40 uppercase font-bold mb-0.5 tracking-tight">OT Session</div>
                                 <div className="flex flex-col gap-0.5">
                                   <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-emerald-400/70 font-bold w-6">IN:</span>
                                      <span className="truncate text-[11px] block">{ot.clock_in_address || ot.location || '-'}</span>
                                   </div>
                                   <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-orange-400/70 font-bold w-6">OUT:</span>
                                      <span className="truncate text-[11px] block">{ot.time_out ? (ot.clock_out_address || ot.location || '-') : '---'}</span>
                                   </div>
                                 </div>
                               </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-white/85 text-sm max-w-[180px]">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{allNotes || '-'}</span>
                            {allNotes && (
                              <button
                                className="shrink-0 p-1 px-2 text-[10px] rounded bg-[#FF7120] text-white hover:bg-[#e0611b] transition shadow-lg shadow-[#FF7120]/20"
                                onClick={() =>
                                  setSelectedWorkData({
                                    date: day.date,
                                    notes: allNotes,
                                  })
                                }
                                type="button"
                                aria-label="View work done details"
                              >
                                View Full
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm whitespace-nowrap">
                          {attachment ? (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                            >
                              <svg
                                className="w-4 h-4 shrink-0"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                              <span className="truncate max-w-[150px] inline-block" title={attachment.filename}>
                                {attachment.filename}
                              </span>
                            </a>
                          ) : (
                            <span className="text-white/40">—</span>
                          )}
                        </td>
                      </tr>

                      </React.Fragment>
                  );
                });
              })()}
          </tbody>
        </table>

        {error && <p className="mt-3 text-xs text-red-200 px-4 py-2">{error}</p>}
      </div>

      {/* Work Done Modal */}
      {selectedWorkData && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedWorkData(null)}
        >
          <div 
            className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#001f35] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#FF7120]/10 p-2 rounded-xl">
                  <FileText className="h-5 w-5 text-[#FF7120]" />
                </div>
                <div>
                  <h4 className="text-white font-semibold">Work Done (Full)</h4>
                  <p className="text-white/40 text-xs">{selectedWorkData.date}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedWorkData(null)}
                className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-line">
                {selectedWorkData.notes}
              </p>
            </div>
            <div className="p-4 border-t border-white/10 bg-[#001a2b]/50">
              <button
                type="button"
                onClick={() => setSelectedWorkData(null)}
                className="w-full py-2.5 rounded-xl bg-white/5 text-white/70 text-sm font-semibold hover:bg-white/10 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
