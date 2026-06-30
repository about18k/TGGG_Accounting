import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import './PrintAttendance.css';
import { Printer, X } from 'lucide-react';

function PrintAttendance({ token, internId, internName, filterType, selectedDate, onClose, initialStartMonth, initialEndMonth, employees }) {
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [employeeSignatures, setEmployeeSignatures] = useState({});
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [allEmployeesList, setAllEmployeesList] = useState([]);

  const currentUser = useMemo(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Error parsing user from localStorage:', e);
      return null;
    }
  }, []);

  const isAccountingUser = useMemo(() => {
    if (!currentUser) return false;
    const role = String(currentUser.role || '').toLowerCase();
    const dept = String(currentUser.department_name || '').toLowerCase();
    return role === 'accounting' || dept === 'accounting department' || dept === 'accounting';
  }, [currentUser]);

  const inChargeName = useMemo(() => {
    if (!isAccountingUser || !currentUser) return '';
    const fullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
    return fullName || currentUser.name || currentUser.username || '';
  }, [isAccountingUser, currentUser]);

  const inChargeSignature = useMemo(() => {
    if (!isAccountingUser || !currentUser) return null;
    return currentUser.signature_image || currentUser.signature || null;
  }, [isAccountingUser, currentUser]);

  useEffect(() => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setStartMonth(initialStartMonth || currentMonth);
    setEndMonth(initialEndMonth || currentMonth);
  }, [initialStartMonth, initialEndMonth]);

  useEffect(() => {
    if (startMonth && endMonth) {
      fetchAttendance();
    }
    // eslint-disable-next-line
  }, [internId, startMonth, endMonth]);

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || timeStr === '-') return null;
    try {
      if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const [time, meridiem] = timeStr.split(' ');
        let [h, m] = time.split(':').map(Number);
        if (meridiem === 'PM' && h !== 12) h += 12;
        if (meridiem === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      }
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    } catch (e) {
      return null;
    }
  };

  const formatTime12 = (timeStr) => {
    if (!timeStr || timeStr === '-') return '';
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      return timeStr.trim();
    }
    try {
      const [hours, minutes] = timeStr.split(':');
      const hr = parseInt(hours, 10);
      const m = minutes.substring(0, 2);
      const ampm = hr >= 12 ? 'PM' : 'AM';
      const displayHr = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr;
      return `${displayHr}:${m} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const determineSession = (timeIn, sessionTypeFromApi) => {
    if (sessionTypeFromApi) {
      const type = sessionTypeFromApi.toLowerCase();
      if (type === 'morning') return 'Morning';
      if (type === 'afternoon') return 'Afternoon';
      if (type === 'overtime') return 'Overtime';
    }
    if (!timeIn) return null;
    const minutes = parseTimeToMinutes(timeIn);
    if (minutes === null) return null;
    if (minutes < 12 * 60) return 'Morning';
    if (minutes >= 12 * 60 && minutes < 18 * 60) return 'Afternoon';
    return 'Overtime';
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let response;
      try {
        response = await api.get('/attendance/all/');
      } catch (err) {
        // Fallback for regular employees who cannot view all attendance
        if (err.response?.status === 403) {
          response = await api.get('/attendance/my/');
        } else {
          throw err;
        }
      }

      const { data } = response;
      let filtered = Array.isArray(data) ? data : [];

      // Filter by month range
      if (startMonth && endMonth) {
        filtered = filtered.filter(a => {
          if (!a.date) return false;
          const recordDate = new Date(a.date);
          if (isNaN(recordDate.getTime())) return false;
          const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
          return recordMonth >= startMonth && recordMonth <= endMonth;
        });
      }

      // Single-employee mode: filter by internId if employees prop is not provided
      if (!employees && internId) {
        filtered = filtered.filter(a => String(a.employee_id ?? a.user_id) === String(internId));
      }

      // Merge with employees prop to ensure all employees are present
      const mergedMap = {};
      if (employees && employees.length > 0) {
        employees.forEach(e => {
          const empId = String(e.id);
          mergedMap[empId] = {
            id: empId,
            name: e.name,
            signature: e.signature || null,
            role: e.role || 'Employee'
          };
        });
      }

      const byEmp = {};
      const signatures = {};
      filtered.forEach(entry => {
        const empId = String(entry.employee_id ?? entry.user_id);
        
        // Populate signature, name, and role for allUniqueEmployees
        if (!mergedMap[empId]) {
          mergedMap[empId] = {
            id: empId,
            name: entry.employee_name || String(empId),
            signature: entry.employee_signature || null,
            role: entry.employee_role || 'Employee'
          };
        } else {
          if (entry.employee_signature && !mergedMap[empId].signature) {
            mergedMap[empId].signature = entry.employee_signature;
          }
          if (entry.employee_role && (!mergedMap[empId].role || mergedMap[empId].role === 'Employee')) {
            mergedMap[empId].role = entry.employee_role;
          }
        }

        if (entry.employee_signature) {
          signatures[empId] = entry.employee_signature;
        }

        if (!byEmp[empId]) byEmp[empId] = {};
        if (!byEmp[empId][entry.date]) {
          byEmp[empId][entry.date] = {
            date: entry.date,
            morning_time_in: null,
            morning_time_out: null,
            afternoon_time_in: null,
            afternoon_time_out: null,
            ot_time_in: null,
            ot_time_out: null,
            employee_signature: entry.employee_signature || null
          };
        }

        const record = byEmp[empId][entry.date];
        const session = determineSession(entry.time_in, entry.session_type);

        if (session === 'Morning') {
          record.morning_time_in = entry.time_in;
          record.morning_time_out = entry.time_out;
        } else if (session === 'Afternoon') {
          record.afternoon_time_in = entry.time_in;
          record.afternoon_time_out = entry.time_out;
        } else if (session === 'Overtime') {
          record.ot_time_in = entry.time_in;
          record.ot_time_out = entry.time_out;
        }
      });

      setEmployeeSignatures(signatures);
      setAllEmployeesList(Object.values(mergedMap));

      // Convert nested date objects to sorted arrays per employee
      const result = {};
      for (const empId of Object.keys(byEmp)) {
        result[empId] = Object.values(byEmp[empId]);
      }
      setAttendance(result);
    } catch (error) {
      console.error('Error fetching attendance in PrintAttendance:', error);
    }
    setLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const getMonthsInRange = () => {
    if (!startMonth || !endMonth) return [];
    
    const months = [];
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return [];
    
    let current = new Date(start);
    while (current <= end) {
      months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
    
    return months;
  };

  const formatLateMinutes = (totalMins) => {
    if (!totalMins || totalMins <= 0) return '0 mins';
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    const hrLabel = hrs === 1 ? 'hr' : 'hrs';
    const minLabel = mins === 1 ? 'min' : 'mins';
    
    if (hrs > 0 && mins > 0) {
      return `${hrs} ${hrLabel} ${mins} ${minLabel}`;
    }
    if (hrs > 0) {
      return `${hrs} ${hrLabel}`;
    }
    return `${mins} ${minLabel}`;
  };

  const getMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  const groupMonthsForPages = () => {
    const months = getMonthsInRange();
    const pages = [];
    
    // Group into chunks of 2 months for side-by-side display
    for (let i = 0; i < months.length; i += 2) {
      pages.push(months.slice(i, i + 2));
    }
    
    return pages;
  };

  // Detailed calculations for a single day based on strict 8:00-12:00 and 13:00-17:00 bounds
  const getDailyDetails = (record, day, year, month) => {
    const totalDays = new Date(year, month, 0).getDate();
    if (day > totalDays) {
      return { amIn: '', amOut: '', pmIn: '', pmOut: '', hours: '', mins: '', lateMins: 0, isBlank: true };
    }

    if (!record) {
      return { amIn: '', amOut: '', pmIn: '', pmOut: '', hours: '', mins: '', lateMins: 0, isBlank: false };
    }

    const amInMin = parseTimeToMinutes(record.morning_time_in);
    const amOutMin = parseTimeToMinutes(record.morning_time_out);
    const pmInMin = parseTimeToMinutes(record.afternoon_time_in);
    const pmOutMin = parseTimeToMinutes(record.afternoon_time_out);

    let amMinutesWorked = 0;
    if (amInMin !== null && amOutMin !== null && amOutMin > amInMin) {
      const baselineStart = 8 * 60;
      let effIn = amInMin;
      if (amInMin <= baselineStart + 5) {
        effIn = baselineStart;
      } else {
        effIn = baselineStart + (amInMin - (baselineStart + 5));
      }
      const effOut = Math.min(amOutMin, 12 * 60); // 12:00 PM
      amMinutesWorked = Math.max(0, effOut - effIn);
    }

    let pmMinutesWorked = 0;
    if (pmInMin !== null && pmOutMin !== null && pmOutMin > pmInMin) {
      const baselineStart = 13 * 60;
      let effIn = pmInMin;
      if (pmInMin <= baselineStart + 5) {
        effIn = baselineStart;
      } else {
        effIn = baselineStart + (pmInMin - (baselineStart + 5));
      }
      const effOut = Math.min(pmOutMin, 17 * 60); // 5:00 PM
      pmMinutesWorked = Math.max(0, effOut - effIn);
    }

    const totalMinutes = amMinutesWorked + pmMinutesWorked;

    // Late minutes calculations: relative to baselines with 5-minute grace period offsets (morning: 8:05 AM, afternoon: 1:05 PM)
    let dailyLateMins = 0;
    const morningCutoff = 8 * 60 + 5; // 8:05 AM
    const afternoonCutoff = 13 * 60 + 5; // 1:05 PM

    if (amInMin !== null && amInMin > morningCutoff) {
      dailyLateMins += (amInMin - morningCutoff);
    }
    if (pmInMin !== null && pmInMin > afternoonCutoff) {
      dailyLateMins += (pmInMin - afternoonCutoff);
    }

    return {
      amIn: record.morning_time_in ? formatTime12(record.morning_time_in) : '',
      amOut: record.morning_time_out ? formatTime12(record.morning_time_out) : '',
      pmIn: record.afternoon_time_in ? formatTime12(record.afternoon_time_in) : '',
      pmOut: record.afternoon_time_out ? formatTime12(record.afternoon_time_out) : '',
      hours: totalMinutes > 0 ? Math.floor(totalMinutes / 60) : '',
      mins: totalMinutes > 0 ? totalMinutes % 60 : '',
      rawMinutes: totalMinutes,
      lateMins: dailyLateMins,
      isBlank: false
    };
  };

  // Compile monthly sums (total hours, minutes, and late minutes)
  const calculateMonthSummary = (empRecords, year, month) => {
    let totalWorkedMinutes = 0;
    let totalLateMinutes = 0;

    const totalDays = new Date(year, month, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;
      const record = empRecords.find(r => r.date === dateKey);

      const details = getDailyDetails(record, d, year, month);
      if (!details.isBlank) {
        totalWorkedMinutes += (details.rawMinutes || 0);
        totalLateMinutes += (details.lateMins || 0);
      }
    }

    return {
      hours: totalWorkedMinutes > 0 ? Math.floor(totalWorkedMinutes / 60) : 0,
      mins: totalWorkedMinutes > 0 ? totalWorkedMinutes % 60 : 0,
      lateMinutes: totalLateMinutes
    };
  };

  // Initialize defaults based on initial properties
  useEffect(() => {
    if (allEmployeesList.length > 0) {
      if (employees && employees.length === 1) {
        setSelectedEmployeeFilter(String(employees[0].id));
      } else if (!employees && internId) {
        setSelectedEmployeeFilter(String(internId));
      }
    }
  }, [allEmployeesList, employees, internId]);

  const uniqueRoles = useMemo(() => {
    const roles = allEmployeesList.map(e => e.role).filter(Boolean);
    return ['all', ...Array.from(new Set(roles))];
  }, [allEmployeesList]);

  const handleEmployeeChange = (empId) => {
    setSelectedEmployeeFilter(empId);
    if (empId !== 'all') {
      const emp = allEmployeesList.find(x => String(x.id) === String(empId));
      if (emp && emp.role && selectedRoleFilter !== 'all') {
        if (emp.role.toLowerCase() !== selectedRoleFilter.toLowerCase()) {
          setSelectedRoleFilter('all');
        }
      }
    }
  };

  const handleRoleChange = (role) => {
    setSelectedRoleFilter(role);
    if (role !== 'all' && selectedEmployeeFilter !== 'all') {
      const emp = allEmployeesList.find(x => String(x.id) === String(selectedEmployeeFilter));
      if (emp && emp.role && emp.role.toLowerCase() !== role.toLowerCase()) {
        setSelectedEmployeeFilter('all');
      }
    }
  };

  const employeesToRender = useMemo(() => {
    let list = allEmployeesList;

    // Filter by selected employee
    if (selectedEmployeeFilter !== 'all') {
      list = list.filter(e => String(e.id) === selectedEmployeeFilter);
    }

    // Filter by selected role
    if (selectedRoleFilter !== 'all') {
      list = list.filter(e => e.role && e.role.toLowerCase() === selectedRoleFilter.toLowerCase());
    }

    // Fallback if list ends up empty
    if (list.length === 0) {
      if (employees) return employees;
      if (internId) return [{ id: String(internId), name: internName }];
    }

    return list;
  }, [allEmployeesList, selectedEmployeeFilter, selectedRoleFilter, employees, internId, internName]);

  const pages = groupMonthsForPages();

  return (
    <div className="print-container">
      <div className="no-print">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="month-filter">
            <label>Start Month:</label>
            <input
              type="month"
              value={startMonth}
              onChange={(e) => setStartMonth(e.target.value)}
            />
          </div>
          <div className="month-filter">
            <label>End Month:</label>
            <input
              type="month"
              value={endMonth}
              onChange={(e) => setEndMonth(e.target.value)}
            />
          </div>
          {allEmployeesList.length > 1 && (
            <>
              <div className="month-filter">
                <label>Employee:</label>
                <select
                  value={selectedEmployeeFilter}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                >
                  <option value="all">All Employees</option>
                  {allEmployeesList.map((emp) => (
                    <option key={emp.id} value={String(emp.id)}>{emp.name}</option>
                  ))}
                </select>
              </div>
              <div className="month-filter">
                <label>Role:</label>
                <select
                  value={selectedRoleFilter}
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  <option value="all">All Roles</option>
                  {uniqueRoles.filter((r) => r !== 'all').map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
        <div className="button-group">
          <button onClick={onClose} className="close-btn"><X size={16} /> Close</button>
          <button onClick={handlePrint} className="print-btn"><Printer size={16} /> Print DTR</button>
        </div>
      </div>
      
      {(() => {
        const empsToRender = employeesToRender;

        return empsToRender.flatMap((emp) => {
          const empRecords = attendance[String(emp.id)] || [];
          const empSignatureUrl = employeeSignatures[String(emp.id)] || emp.signature || null;

          return pages.map((pageMonths, pageIndex) => {
            // If only one month in pageMonths, duplicate it to print side-by-side
            const pageMonthsToRender = pageMonths.length === 1 
              ? [pageMonths[0], pageMonths[0]] 
              : pageMonths;

            return (
              <div key={`${emp.id}-${pageIndex}`} className="print-content">
                <div className="dtr-columns-container">
                  {pageMonthsToRender.map((monthStr, colIndex) => {
                    const [year, month] = monthStr.split('-').map(Number);
                    const monthSummary = calculateMonthSummary(empRecords, year, month);

                    // Build exactly 31 day rows
                    const dayRows = [];
                    for (let d = 1; d <= 31; d++) {
                      const dayStr = String(d).padStart(2, '0');
                      const dateKey = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;
                      const record = empRecords.find(r => r.date === dateKey);
                      dayRows.push({
                        dayNum: d,
                        details: getDailyDetails(record, d, year, month)
                      });
                    }

                    return (
                      <div key={`${monthStr}-${colIndex}`} className="dtr-column">
                        <div className="dtr-header">
                          <h2 className="dtr-title">DAILY TIME RECORD</h2>
                          <div className="dtr-employee-name-container">
                            <div className="dtr-employee-name">{emp.name}</div>
                            <div className="dtr-label-subtext">(Name)</div>
                          </div>
                          
                          <div className="dtr-header-row">
                            <span>For the month of</span>
                            <span className="dtr-header-underline">{getMonthName(monthStr)}</span>
                          </div>
                          
                          <div className="dtr-header-row">
                            <span>Office Hours (regular days)</span>
                            <span className="dtr-header-underline">8:00 AM - 12:00 PM / 1:00 PM - 5:00 PM</span>
                          </div>

                          <div className="dtr-header-row">
                            <span>Arrival & Departure</span>
                            <span className="dtr-header-underline"></span>
                          </div>

                          <div className="dtr-header-row border-last">
                            <span>Saturdays</span>
                            <span className="dtr-header-underline"></span>
                          </div>
                        </div>

                        <table className="dtr-table">
                          <thead>
                            <tr>
                              <th rowSpan="2" className="day-col"></th>
                              <th colSpan="2">A.M.</th>
                              <th colSpan="2">P.M.</th>
                              <th rowSpan="2">Hours</th>
                              <th rowSpan="2">Min.</th>
                            </tr>
                            <tr>
                              <th className="sub-th">Arrival</th>
                              <th className="sub-th">Departure</th>
                              <th className="sub-th">Arrival</th>
                              <th className="sub-th">Departure</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dayRows.map(({ dayNum, details }) => (
                              <tr key={dayNum}>
                                <td className="day-cell">{dayNum}</td>
                                <td>{details.amIn}</td>
                                <td>{details.amOut}</td>
                                <td>{details.pmIn}</td>
                                <td>{details.pmOut}</td>
                                <td>{details.hours}</td>
                                <td>{details.mins}</td>
                              </tr>
                            ))}
                            <tr className="dtr-total-row">
                              <td colSpan="5">Total</td>
                              <td>{monthSummary.hours || ''}</td>
                              <td>{monthSummary.mins || ''}</td>
                            </tr>
                          </tbody>
                        </table>

                        <div className="dtr-footer">
                          <p className="dtr-footer-text">
                            I certify on my honor that the above is true and correct record of the hours of work performed, 
                            record of which was made daily at the time of arrival and departure from office.
                          </p>

                          <div className="dtr-signature-block">
                            {empSignatureUrl && (
                              <img src={empSignatureUrl} alt="Signature" className="dtr-signature-image" />
                            )}
                            <div className="dtr-name-underlined">{emp.name.toUpperCase()}</div>
                            <div className="dtr-label-subtext">(Signature)</div>
                          </div>

                          <div className="dtr-verification-block">
                            <div className="dtr-verification-text">Verified as to the prescribed office hours</div>
                            <div className="dtr-signature-block" style={{ margin: '0.6cm auto 0.2cm auto', width: '80%' }}>
                              {inChargeSignature && (
                                <img 
                                  src={inChargeSignature} 
                                  alt="In-Charge Signature" 
                                  className="dtr-signature-image" 
                                  style={{ top: '-25px' }} 
                                />
                              )}
                              <div className="dtr-name-underlined" style={{ width: '100%', minHeight: '16px' }}>
                                {inChargeName ? inChargeName.toUpperCase() : '\u00A0'}
                              </div>
                              <div className="dtr-label-subtext" style={{ textTransform: 'uppercase', fontSize: '0.48rem', letterSpacing: '0.05em' }}>
                                (In-charge)
                              </div>
                            </div>
                          </div>

                          <div className="dtr-late-minutes-block">
                            Late: {formatLateMinutes(monthSummary.lateMinutes)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        });
      })()}
    </div>
  );
}

export default PrintAttendance;
