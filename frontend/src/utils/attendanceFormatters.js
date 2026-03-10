/**
 * Shared attendance formatting utilities.
 * Used consistently across all role dashboards for attendance history display.
 */

/**
 * Format time from HH:MM to 12-hour format with AM/PM
 * @param {string} t - Time string in HH:MM format
 * @returns {string} Formatted time (e.g., "8:30 AM") or "-" if invalid
 */
export const formatTime12 = (t) => {
  if (!t) return '-';
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
};

/**
 * Calculate minutes between two times
 * @param {string} timeIn - Check-in time in HH:MM format
 * @param {string} timeOut - Check-out time in HH:MM format
 * @returns {number} Minutes elapsed, or 0 if invalid
 */
export const calcMinutes = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 0;
  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);
  if ([inH, inM, outH, outM].some((v) => Number.isNaN(v))) return 0;
  const m = outH * 60 + outM - (inH * 60 + inM);
  return m > 0 ? m : 0;
};

/**
 * Format decimal hours as "Xh Ym" string
 * @param {number} decimalHours - Decimal hours (e.g., 1.5 for 1h 30m)
 * @returns {string} Formatted string (e.g., "1h 30m") or "0"
 */
export const formatLateDeduction = (decimalHours) => {
  if (!decimalHours || decimalHours === 0) return '0';
  const hours = Math.floor(decimalHours);
  const mins = Math.round((decimalHours - hours) * 60);
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

/**
 * Build late deduction breakdown by session
 * @param {Object} am - Morning attendance record
 * @param {Object} pm - Afternoon attendance record
 * @param {Object} ot - Overtime attendance record
 * @returns {string} Breakdown string (e.g., "AM: -1h | PM: -30m")
 */
export const buildLateBreakdown = (am, pm, ot) => {
  const parts = [];
  if (am?.is_late) parts.push(`AM: -${formatLateDeduction(am.late_deduction_hours)}`);
  if (pm?.is_late) parts.push(`PM: -${formatLateDeduction(pm.late_deduction_hours)}`);
  if (ot?.is_late) parts.push(`OT: -${formatLateDeduction(ot.late_deduction_hours)}`);
  return parts.join(' | ');
};

/**
 * Group attendance records by date and session type
 * @param {Array} rows - Attendance records with date and session_type fields
 * @returns {Array} Array of daily groups with {date, morning, afternoon, overtime}
 */
export const groupByDate = (rows) => {
  const groups = {};
  rows.forEach((row) => {
    const d = row.date;
    if (!groups[d]) groups[d] = { date: d, morning: null, afternoon: null, overtime: null };
    if (row.session_type === 'morning') groups[d].morning = row;
    else if (row.session_type === 'afternoon') groups[d].afternoon = row;
    else if (row.session_type === 'overtime') groups[d].overtime = row;
    else if (!groups[d].morning) groups[d].morning = row;
  });
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * Calculate total hours worked across all sessions in a day
 * @param {Object} am - Morning record
 * @param {Object} pm - Afternoon record
 * @param {Object} ot - Overtime record
 * @returns {string} Formatted hours (e.g., "8h 30m") or "-"
 */
export const calculateTotalHours = (am, pm, ot) => {
  const totalMins =
    calcMinutes(am?.time_in, am?.time_out) +
    calcMinutes(pm?.time_in, pm?.time_out) +
    calcMinutes(ot?.time_in, ot?.time_out);
  return totalMins > 0 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : '-';
};

/**
 * Calculate total late deduction across all sessions in a day
 * @param {Object} am - Morning record
 * @param {Object} pm - Afternoon record
 * @param {Object} ot - Overtime record
 * @returns {number} Total deduction in decimal hours
 */
export const calculateTotalDeduction = (am, pm, ot) => {
  return (
    parseFloat(am?.late_deduction_hours || 0) +
    parseFloat(pm?.late_deduction_hours || 0) +
    parseFloat(ot?.late_deduction_hours || 0)
  );
};

/**
 * Get primary location from attendance records (prefers most recent)
 * @param {Object} am - Morning record
 * @param {Object} pm - Afternoon record
 * @param {Object} ot - Overtime record
 * @returns {string} Location string or "-"
 */
export const getPrimaryLocation = (am, pm, ot) => {
  return am?.clock_in_address || pm?.clock_in_address || ot?.clock_in_address ||
    am?.location || pm?.location || ot?.location || '-';
};

/**
 * Combine all notes from sessions with separator
 * @param {Object} am - Morning record
 * @param {Object} pm - Afternoon record
 * @param {Object} ot - Overtime record
 * @returns {string} Combined notes or empty string
 */
export const getCombinedNotes = (am, pm, ot) => {
  return [am?.notes, am?.work_doc_note, pm?.notes, pm?.work_doc_note, ot?.notes, ot?.work_doc_note].filter(Boolean).join(' | ');
};

/**
 * Get primary attachment from attendance records
 * @param {Object} am - Morning record
 * @param {Object} pm - Afternoon record
 * @param {Object} ot - Overtime record
 * @returns {Object} Object with {url, filename} or null
 */
export const getPrimaryAttachment = (am, pm, ot) => {
  const attachment_url = am?.attachment_url || pm?.attachment_url || ot?.attachment_url;
  const attachment_filename = am?.attachment_filename || pm?.attachment_filename || ot?.attachment_filename;
  return attachment_url ? { url: attachment_url, filename: attachment_filename || 'Download' } : null;
};
