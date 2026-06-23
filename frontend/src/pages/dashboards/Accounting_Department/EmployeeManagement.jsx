import React, { useState } from 'react';
import { toast } from 'sonner';
import { getAccountingEmployees } from '../../../services/adminService';
import {
  Card,
  CardContent,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/accounting-ui';
import { Search, Download } from 'lucide-react';

import { useEmployees } from '../../../hooks/useEmployees';
import { EmployeeStats } from './components/EmployeeStats';
import { EmployeeGrid } from './components/EmployeeGrid';
import { EmployeeAddDialog } from './components/EmployeeAddDialog';
import { EmployeeDetailsDialog } from './components/EmployeeDetailsDialog';

const roleFilters = ['All', 'Accounting', 'Site Coordinator', 'Site Engineer', 'BIM Specialist', 'Interns', 'Junior Designer', 'Studio Head'];
const statuses = ['All', 'Active', 'On Leave', 'Inactive'];

export function EmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    filteredEmployees,
    employeeStats,
    employeeAttendanceStats,
    otRequestActualHoursMap,
    isAttendanceLoading,
    fetchEmployees
  } = useEmployees(selectedDepartment, selectedStatus, searchTerm);

  const handleExportEmployees = async () => {
    setIsExporting(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const allEmployees = await getAccountingEmployees({ active_only: true });
      if (!allEmployees?.length) {
        toast.error('Export Failed', { description: 'No employees available to export.' });
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const now = new Date();

      doc.setFontSize(16);
      doc.text('Employee Details Report', 14, 14);
      doc.setFontSize(10);
      doc.text(`Generated: ${now.toLocaleString()}`, 14, 20);
      doc.text(`Total Employees: ${allEmployees.length}`, 14, 26);

      autoTable(doc, {
        startY: 32,
        head: [[
          'Name',
          'Email',
          'Phone',
          'Department',
          'Position',
          'Status',
          'Join Date',
          'Salary',
          'Location',
          'Manager',
        ]],
        body: allEmployees.map((employee) => ([
          employee.name || '',
          employee.email || '',
          employee.phone || '',
          employee.department || '',
          employee.position || '',
          employee.status || '',
          employee.joinDate || '',
          employee.salary ? `$${Number(employee.salary).toLocaleString()}` : '',
          employee.location || '',
          employee.manager || '',
        ])),
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [2, 27, 44],
          textColor: [255, 255, 255],
        },
      });

      doc.save(`employees-${now.toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      toast.error('Export Failed', {
        description: error.response?.data?.error || error.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const openEmployeeDetails = (employee) => {
    setSelectedEmployee(employee);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
        <div className="p-6 sm:p-8 flex flex-col xl:flex-row xl:items-end xl:justify-between gap-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#FF7120]/80">Accounting Department</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold text-white">Employee Management</h1>
            <p className="mt-3 text-sm text-white/60 max-w-2xl">
              Manage employee profiles, join dates, role assignments, and salary details.
            </p>
          </div>
          <div className="flex flex-row items-center gap-3 shrink-0">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleExportEmployees}
              disabled={isExporting}
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
            <EmployeeAddDialog 
              isAddEmployeeOpen={isAddEmployeeOpen} 
              setIsAddEmployeeOpen={setIsAddEmployeeOpen} 
              fetchEmployees={fetchEmployees} 
            />
          </div>
        </div>
      </div>

      <EmployeeStats 
        employeeStats={employeeStats} 
        roleFiltersCount={roleFilters.length - 1} 
      />

      {/* Filters and Search */}
      <Card className="border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.22)] bg-[#001f35]/70 backdrop-blur-md rounded-2xl">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 w-4 h-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#00273C] border-white/10 text-white placeholder:text-white/40"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-48 bg-[#00273C] border-white/10 text-white">
                <SelectValue>
                  {selectedDepartment === 'All' ? 'All Roles' : selectedDepartment}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#001f35] border-white/10 text-white">
                {roleFilters.map(dept => (
                  <SelectItem key={dept} value={dept} className="text-white hover:bg-[#00273C]">{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-48 bg-[#00273C] border-white/10 text-white">
                <SelectValue>
                  {selectedStatus === 'All' ? 'All Statuses' : selectedStatus}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#001f35] border-white/10 text-white">
                {statuses.map(status => (
                  <SelectItem key={status} value={status} className="text-white hover:bg-[#00273C]">{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <EmployeeGrid 
        filteredEmployees={filteredEmployees}
        employeeAttendanceStats={employeeAttendanceStats}
        otRequestActualHoursMap={otRequestActualHoursMap}
        isAttendanceLoading={isAttendanceLoading}
        openEmployeeDetails={openEmployeeDetails}
      />

      <EmployeeDetailsDialog 
        selectedEmployee={selectedEmployee} 
        setSelectedEmployee={setSelectedEmployee} 
        fetchEmployees={fetchEmployees}
      />
    </div>
  );
}

export default EmployeeManagement;
