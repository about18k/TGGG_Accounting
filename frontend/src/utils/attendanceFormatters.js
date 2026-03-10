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
  const inMins = parseMinutes(timeIn);
  const outMins = parseMinutes(timeOut);
  if (inMins === null || outMins === null) return 0;
  const m = outMins - inMins;
  return m > 0 ? m : 0;
};

/**
 * Parse time string to total minutes
 */
export const parseMinutes = (timeStr) => {
  if (!timeStr) return null;
  const parts = timeStr.trim().split(' ');
  if (parts.length === 2) {
    const [time, meridiem] = parts;
    let [h, m] = time.split(':').map(Number);
    if (meridiem.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (meridiem.toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const [hRaw, mRaw] = timeStr.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

/**
 * Calculate session validity minutes matching backend session_service.py policy
 * Gross hours minus late deductions
 */
export const calcSessionMinutes = (record) => {
  if (!record || !record.time_out || !record.session_type) return 0;

  const outMinutes = parseMinutes(record.time_out);
  if (outMinutes === null) return 0;

  const SESSION_BASELINES = {
    morning: 8 * 60,
    afternoon: 13 * 60,
    overtime: 19 * 60
  };
  const SESSION_END_BASELINES = {
    morning: 12 * 60,
    afternoon: 17 * 60,
    overtime: 22 * 60
  };
  const SESSION_MAX_HOURS = {
    morning: 4 * 60,
    afternoon: 4 * 60,
    overtime: 3 * 60
  };

  const baselineStart = SESSION_BASELINES[record.session_type];
  const baselineEnd = SESSION_END_BASELINES[record.session_type];
  const maxMins = SESSION_MAX_HOURS[record.session_type];

  if (baselineStart === undefined || baselineEnd === undefined || maxMins === undefined) return 0;

  if (outMinutes <= baselineStart) return 0;

  // Cap checkout at session end
  const effectiveEnd = Math.min(outMinutes, baselineEnd);

  // Calculate gross minutes from baseline start
  let grossMins = effectiveEnd - baselineStart;
  if (grossMins <= 0) return 0;
  if (grossMins > maxMins) grossMins = maxMins;

  // Subtract the strict late deduction already calculated by the backend
  const lateDeductionMins = Math.round(parseFloat(record.late_deduction_hours || 0) * 60);

  const netMins = grossMins - lateDeductionMins;
  return Math.max(0, netMins);
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
    calcSessionMinutes(am) +
    calcSessionMinutes(pm) +
    calcSessionMinutes(ot);
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
