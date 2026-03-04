import React, { useState, useEffect } from 'react';
import { getAccountingEmployees, addAccountingEmployee, updateAccountingEmployee } from '../../../services/adminService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import {
  Search,
  Filter,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  UserCheck,
  UserX,
  Building,
  Briefcase,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';


const roleFilters = ['All', 'Accounting', 'Site Coordinator', 'Site Engineer', 'BIM Specialist', 'Interns', 'Junior Designer', 'Studio Head'];
const statuses = ['All', 'Active', 'On Leave', 'Inactive'];
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

export function EmployeeManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    startDate: '',
    status: 'Active',
  });
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    startDate: '',
    temporary_password: '',
  });



  const fetchEmployees = async () => {
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
  };

  useEffect(() => {
    fetchEmployees();
  }, [selectedDepartment]);

  const handleAddEmployee = async () => {
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const email = formData.email.trim();
    const temporaryPassword = formData.temporary_password;

    if (!firstName || !lastName || !email) {
      alert('First name, last name, and email are required.');
      return;
    }

    if (!temporaryPassword || temporaryPassword.length < 8) {
      alert('Temporary password is required and must be at least 8 characters.');
      return;
    }

    const confirmed = window.confirm(
      'Confirm employee creation?\n\nThe account will be submitted for Studio Head/Admin approval before login is allowed.'
    );
    if (!confirmed) return;

    setIsAddingEmployee(true);
    try {
      await addAccountingEmployee({
        first_name: firstName,
        last_name: lastName,
        email,
        phone: formData.phone,
        startDate: formData.startDate,
        temporary_password: temporaryPassword,
      });
      setIsAddEmployeeOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        startDate: '',
        temporary_password: '',
      });
      fetchEmployees();
      alert('Employee submitted successfully. The account is pending Studio Head/Admin approval and a confirmation email has been sent.');
    } catch (error) {
      alert("Failed to add employee: " + (error.response?.data?.error || error.message));
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const handleExportEmployees = async () => {
    setIsExporting(true);
    try {
      const allEmployees = await getAccountingEmployees({ active_only: true });
      if (!allEmployees?.length) {
        alert('No employees available to export.');
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
      alert(`Failed to export employees: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const openEmployeeDetails = (employee) => {
    setSelectedEmployee(employee);
    setIsEditingEmployee(false);
  };

  const startEditEmployee = () => {
    if (!selectedEmployee) return;
    const parts = String(selectedEmployee.name || '').trim().split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ');
    setEditFormData({
      first_name: firstName,
      last_name: lastName,
      email: selectedEmployee.email || '',
      phone: selectedEmployee.phone || '',
      startDate: selectedEmployee.joinDate || '',
      status: selectedEmployee.status || 'Active',
    });
    setIsEditingEmployee(true);
  };

  const closeEmployeeDialog = () => {
    setSelectedEmployee(null);
    setIsEditingEmployee(false);
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    const firstName = editFormData.first_name.trim();
    const lastName = editFormData.last_name.trim();
    const email = editFormData.email.trim();

    if (!firstName || !lastName || !email) {
      alert('First name, last name, and email are required.');
      return;
    }

    setIsUpdatingEmployee(true);
    try {
      await updateAccountingEmployee(selectedEmployee.id, {
        first_name: firstName,
        last_name: lastName,
        email,
        phone: editFormData.phone,
        startDate: editFormData.startDate || null,
        status: editFormData.status,
      });

      alert('Employee updated successfully.');
      setIsEditingEmployee(false);
      closeEmployeeDialog();
      fetchEmployees();
    } catch (error) {
      alert(`Failed to update employee: ${error.response?.data?.error || error.message}`);
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment =
      selectedDepartment === 'All' ||
      normalizeRole(employee.position) === normalizeRole(selectedDepartment);
    const matchesStatus = selectedStatus === 'All' || employee.status === selectedStatus;

    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const variants = {
      'Active': 'bg-primary/10 text-primary border-primary',
      'On Leave': 'bg-primary/10 text-primary border-primary',
      'Inactive': 'bg-red-500/10 text-red-500 border-red-500',
    };

    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const departmentStats = roleFilters.slice(1).map(dept => ({
    name: dept,
    count: employees.filter(emp => normalizeRole(emp.position) === normalizeRole(dept)).length,
    active: employees.filter(emp => normalizeRole(emp.position) === normalizeRole(dept) && emp.status === 'Active').length,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportEmployees}
            disabled={isExporting}
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
          <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} placeholder="Enter first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} placeholder="Enter last name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email address" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="Enter phone number" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="temporaryPassword">Temporary Password</Label>
                  <div className="relative">
                    <Input
                      id="temporaryPassword"
                      type={showTemporaryPassword ? 'text' : 'password'}
                      value={formData.temporary_password}
                      onChange={e => setFormData({ ...formData, temporary_password: e.target.value })}
                      placeholder="Set a temporary password (min. 8 characters)"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTemporaryPassword(prev => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'}
                    >
                      {showTemporaryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddEmployeeOpen(false)}>Cancel</Button>
                <Button onClick={handleAddEmployee} disabled={isAddingEmployee}>
                  {isAddingEmployee ? 'Adding...' : 'Add Employee'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-medium">{employees.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-medium">{employees.filter(emp => emp.status === 'Active').length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-medium">{employees.filter(emp => emp.status === 'On Leave').length}</p>
              </div>
              <UserX className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Roles</p>
                <p className="text-2xl font-medium">{roleFilters.length - 1}</p>
              </div>
              <Building className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue>
                  {selectedDepartment === 'All' ? 'All Roles' : selectedDepartment}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roleFilters.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue>
                  {selectedStatus === 'All' ? 'All Statuses' : selectedStatus}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="border-0 shadow-lg bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:shadow-xl transition-shadow cursor-pointer flex flex-col" onClick={() => openEmployeeDetails(employee)}>
            <CardContent className="p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={employee.avatar} alt={employee.name} />
                    <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">{employee.name || '---'}</h3>
                    <p className="text-xs text-muted-foreground truncate">{employee.position || '---'}</p>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(employee.status)}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-background rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total Days</p>
                  <p className="text-2xl font-bold text-primary">---</p>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                  <p className="text-2xl font-bold text-primary">---</p>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">On-Time</p>
                  <p className="text-2xl font-bold text-primary">---</p>
                </div>
                <div className="bg-background rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Late</p>
                  <p className="text-2xl font-bold text-primary">---</p>
                </div>
              </div>

              <div className="bg-background rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Total Late</p>
                <p className="text-2xl font-bold text-primary">---</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Employee Detail Dialog */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => closeEmployeeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedEmployee && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={selectedEmployee.avatar} alt={selectedEmployee.name} />
                    <AvatarFallback>{selectedEmployee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{selectedEmployee.name || '---'}</DialogTitle>
                    <p className="text-muted-foreground">{selectedEmployee.position || '---'}</p>
                    {getStatusBadge(selectedEmployee.status)}
                  </div>
                </div>
              </DialogHeader>
              {!isEditingEmployee ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Contact Information</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          {selectedEmployee.email || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {selectedEmployee.phone || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                          {selectedEmployee.location || '---'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Employment Details</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="w-4 h-4 text-muted-foreground" />
                          {selectedEmployee.department || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Briefcase className="w-4 h-4 text-muted-foreground" />
                          {selectedEmployee.position || '---'}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          Joined {selectedEmployee.joinDate ? new Date(selectedEmployee.joinDate).toLocaleDateString() : '---'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployee.skills && selectedEmployee.skills.length > 0 ? selectedEmployee.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">{skill}</Badge>
                        )) : <span className="text-sm text-muted-foreground">---</span>}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Manager</h4>
                      <p className="text-sm">{selectedEmployee.manager || '---'}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Salary</h4>
                      <p className="text-sm">{selectedEmployee.salary ? `$${selectedEmployee.salary.toLocaleString()}` : '---'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name</Label>
                    <Input
                      id="editFirstName"
                      value={editFormData.first_name}
                      onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input
                      id="editLastName"
                      value={editFormData.last_name}
                      onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="editEmail">Email</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editPhone">Phone</Label>
                    <Input
                      id="editPhone"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editStartDate">Start Date</Label>
                    <Input
                      id="editStartDate"
                      type="date"
                      value={editFormData.startDate}
                      onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="editStatus">Status</Label>
                    <Select
                      value={editFormData.status}
                      onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                    >
                      <SelectTrigger id="editStatus">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => (isEditingEmployee ? setIsEditingEmployee(false) : closeEmployeeDialog())}>
                  {isEditingEmployee ? 'Cancel' : 'Close'}
                </Button>
                {!isEditingEmployee ? (
                  <Button onClick={startEditEmployee}>Edit Employee</Button>
                ) : (
                  <Button onClick={handleUpdateEmployee} disabled={isUpdatingEmployee}>
                    {isUpdatingEmployee ? 'Saving...' : 'Save Changes'}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
