import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAccountingEmployees } from '../services/adminService';
import { getAllAttendance } from '../services/attendanceService';
import { getAllOvertime } from '../services/overtimeService';

const roleFilterMap = {
  Accounting: 'accounting',
  'Site Coordinator': 'site_coordinator',
  'Site Engineer': 'site_engineer',
  'BIM Specialist': 'bim_specialist',
  Interns: 'intern',
  'Junior Designer': 'junior_architect',
  'Studio Head': 'studio_head',
};

const normalizeRole = (value = '') => {
  const v = value.toLowerCase().trim();
  if (v === 'intern') return 'interns';
  if (v === 'junior architect') return 'junior designer';
  return v;
};

const timeToMinutes = (timeValue) => {
  if (!timeValue || typeof timeValue !== 'string' || !timeValue.includes(':')) return null;
  const [hourPart, minutePart] = timeValue.split(':');
  const hours = Number(hourPart);
  const minutes = Number(minutePart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return (hours * 60) + minutes;
};

const getWorkedHours = (record) => {
  const inMinutes = timeToMinutes(record?.time_in);
  const outMinutes = timeToMinutes(record?.time_out);
  if (inMinutes === null || outMinutes === null || outMinutes < inMinutes) return 0;
  return (outMinutes - inMinutes) / 60;
};

export function useEmployees(selectedDepartment = 'All', selectedStatus = 'All', searchTerm = '') {
  const [employees, setEmployees] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [overtimeRequests, setOvertimeRequests] = useState([]);

  const fetchEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const roleFilter = roleFilterMap[selectedDepartment] || undefined;
      const data = await getAccountingEmployees({
        active_only: true,
        ...(roleFilter ? { role: roleFilter } : {}),
      });
      setEmployees(data);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDepartment]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    let isActive = true;

    const fetchAttendanceRecords = async () => {
      setIsAttendanceLoading(true);
      try {
        const [attendanceData, otData] = await Promise.allSettled([
          getAllAttendance(),
          getAllOvertime({ force: true }),
        ]);
        if (!isActive) return;
        setAttendanceRecords(Array.isArray(attendanceData.value) ? attendanceData.value : []);
        setOvertimeRequests(Array.isArray(otData.value) ? otData.value : []);
      } catch (error) {
        console.error('Failed to fetch attendance/overtime records:', error);
        if (isActive) {
          setAttendanceRecords([]);
          setOvertimeRequests([]);
        }
      } finally {
        if (isActive) {
          setIsAttendanceLoading(false);
        }
      }
    };

    fetchAttendanceRecords();

    return () => {
      isActive = false;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return employees.filter((employee) => {
      const name = String(employee.name || '').toLowerCase();
      const email = String(employee.email || '').toLowerCase();
      const department = String(employee.department || '').toLowerCase();

      const matchesSearch =
        !search ||
        name.includes(search) ||
        email.includes(search) ||
        department.includes(search);

      const matchesDepartment =
        selectedDepartment === 'All' ||
        normalizeRole(employee.position) === normalizeRole(selectedDepartment);

      const matchesStatus = selectedStatus === 'All' || employee.status === selectedStatus;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, selectedDepartment, selectedStatus]);

  const employeeStats = useMemo(() => {
    let active = 0;
    let onLeave = 0;

    for (const employee of employees) {
      if (employee.status === 'Active') active += 1;
      if (employee.status === 'On Leave') onLeave += 1;
    }

    return {
      total: employees.length,
      active,
      onLeave,
    };
  }, [employees]);

  const employeeAttendanceStats = useMemo(() => {
    const byEmployee = new Map();

    attendanceRecords.forEach((record) => {
      const employeeId = record?.employee_id ?? record?.user_id;
      if (employeeId === undefined || employeeId === null) return;

      const key = String(employeeId);
      const status = String(record?.status || '').toLowerCase();
      const dateKey = record?.date || (record?.created_at ? String(record.created_at).slice(0, 10) : null);

      if (!byEmployee.has(key)) {
        byEmployee.set(key, {
          totalHours: 0,
          totalOvertimeHours: 0,
          totalLateHours: 0,
          dayMap: new Map(),
        });
      }

      const current = byEmployee.get(key);
      const workedHours = getWorkedHours(record);
      current.totalHours += workedHours;
      if (record?.session_type === 'overtime') {
        current.totalOvertimeHours += workedHours;
      }

      const lateHours = Number(record?.late_deduction_hours || 0);
      if (Number.isFinite(lateHours) && lateHours > 0) {
        current.totalLateHours += lateHours;
      }

      if (dateKey) {
        const dayStats = current.dayMap.get(dateKey) || {
          hasPresent: false,
          hasLate: false,
        };

        if (status === 'present' || status === 'late') {
          dayStats.hasPresent = true;
        }

        if (status === 'late' || Boolean(record?.is_late)) {
          dayStats.hasLate = true;
        }

        current.dayMap.set(dateKey, dayStats);
      }
    });

    const summary = new Map();

    byEmployee.forEach((data, employeeId) => {
      let totalDays = 0;
      let onTime = 0;
      let late = 0;

      data.dayMap.forEach((dayStats) => {
        if (!dayStats.hasPresent) return;
        totalDays += 1;
        if (dayStats.hasLate) {
          late += 1;
        } else {
          onTime += 1;
        }
      });

      summary.set(employeeId, {
        totalDays,
        totalHours: Number(data.totalHours.toFixed(2)),
        totalOvertime: Number(data.totalOvertimeHours.toFixed(2)),
        onTime,
        late,
        totalLate: Number(data.totalLateHours.toFixed(2)),
      });
    });

    return summary;
  }, [attendanceRecords]);

  const otRequestActualHoursMap = useMemo(() => {
    const map = new Map();
    for (const req of overtimeRequests) {
      if (!req.management_signature || req.actual_hours == null) continue;
      const empId = String(req.employee_id);
      const hrs = parseFloat(req.actual_hours) || 0;
      map.set(empId, (map.get(empId) || 0) + hrs);
    }
    return map;
  }, [overtimeRequests]);

  const otRequestCountMap = useMemo(() => {
    const map = new Map();
    for (const req of overtimeRequests) {
      if (!req.management_signature) continue;
      const empId = String(req.employee_id);
      const existing = map.get(empId) || { total: 0, withHours: 0 };
      existing.total += 1;
      if (req.actual_hours != null) existing.withHours += 1;
      map.set(empId, existing);
    }
    return map;
  }, [overtimeRequests]);

  return {
    employees,
    attendanceRecords,
    isLoading,
    isAttendanceLoading,
    overtimeRequests,
    filteredEmployees,
    employeeStats,
    employeeAttendanceStats,
    otRequestActualHoursMap,
    otRequestCountMap,
    fetchEmployees
  };
}
