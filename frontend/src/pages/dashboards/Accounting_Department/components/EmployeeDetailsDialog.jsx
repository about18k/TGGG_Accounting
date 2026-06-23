import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Mail, MapPin, Building, Briefcase, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Label,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Button
} from '../../../../components/ui/accounting-ui';
import { updateAccountingEmployee } from '../../../../services/adminService';

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

export const EmployeeDetailsDialog = ({
  selectedEmployee,
  setSelectedEmployee,
  fetchEmployees
}) => {
  const [isEditingEmployee, setIsEditingEmployee] = useState(false);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    startDate: '',
    status: 'Active',
    salary: '',
  });

  useEffect(() => {
    if (!selectedEmployee) {
      setIsEditingEmployee(false);
    }
  }, [selectedEmployee]);

  const closeEmployeeDialog = () => {
    setSelectedEmployee(null);
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
      startDate: selectedEmployee.joinDate || '',
      status: selectedEmployee.status || 'Active',
      salary: selectedEmployee.salary || '',
    });
    setIsEditingEmployee(true);
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    const firstName = editFormData.first_name.trim();
    const lastName = editFormData.last_name.trim();
    const email = editFormData.email.trim();

    if (!firstName || !lastName || !email) {
      toast.error('Validation Error', {
        description: 'First name, last name, and email are required.',
      });
      return;
    }

    setIsUpdatingEmployee(true);
    try {
      await updateAccountingEmployee(selectedEmployee.id, {
        first_name: firstName,
        last_name: lastName,
        email,
        startDate: editFormData.startDate || null,
        status: editFormData.status,
        salary: editFormData.salary || null,
      });

      toast.success('Employee Updated', { description: 'Employee updated successfully.' });
      setIsEditingEmployee(false);
      closeEmployeeDialog();
      fetchEmployees();
    } catch (error) {
      toast.error('Update Failed', {
        description: error.response?.data?.error || error.message,
      });
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  return (
    <Dialog open={!!selectedEmployee} onOpenChange={() => closeEmployeeDialog()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#001f35] border-white/10 text-white">
        {selectedEmployee && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border border-white/10">
                  <AvatarImage src={selectedEmployee.avatar} alt={selectedEmployee.name} />
                  <AvatarFallback>{selectedEmployee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-white">{selectedEmployee.name || '---'}</DialogTitle>
                  <p className="text-white/60 text-sm mt-0.5">{selectedEmployee.position || '---'}</p>
                  <div className="mt-2">
                    {getStatusBadge(selectedEmployee.status)}
                  </div>
                </div>
              </div>
            </DialogHeader>
            {!isEditingEmployee ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-white/80 mb-2">Contact Information</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Mail className="w-4 h-4 text-[#FF7120]/80" />
                        {selectedEmployee.email || '---'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <MapPin className="w-4 h-4 text-[#FF7120]/80" />
                        {selectedEmployee.location || '---'}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white/80 mb-2">Employment Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Building className="w-4 h-4 text-[#FF7120]/80" />
                        {selectedEmployee.department || '---'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Briefcase className="w-4 h-4 text-[#FF7120]/80" />
                        {selectedEmployee.position || '---'}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <Calendar className="w-4 h-4 text-[#FF7120]/80" />
                        Joined {selectedEmployee.joinDate ? new Date(selectedEmployee.joinDate).toLocaleDateString() : '---'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-white/80 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmployee.skills && selectedEmployee.skills.length > 0 ? selectedEmployee.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="bg-[#00273C] border-white/10 text-white/80">{skill}</Badge>
                      )) : <span className="text-sm text-white/60">---</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white/80 mb-2">Manager</h4>
                    <p className="text-sm text-white/70">{selectedEmployee.manager || '---'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-white/80 mb-2">Salary</h4>
                    <p className="text-sm font-semibold text-green-400">{selectedEmployee.salary ? `₱${Number(selectedEmployee.salary).toLocaleString('en-PH')}` : '---'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editFirstName" className="text-white/80">First Name</Label>
                  <Input
                    id="editFirstName"
                    className="bg-[#00273C] border-white/10 text-white"
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLastName" className="text-white/80">Last Name</Label>
                  <Input
                    id="editLastName"
                    className="bg-[#00273C] border-white/10 text-white"
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="editEmail" className="text-white/80">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    className="bg-[#00273C] border-white/10 text-white"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStartDate" className="text-white/80">Start Date</Label>
                  <Input
                    id="editStartDate"
                    type="date"
                    className="bg-[#00273C] border-white/10 text-white"
                    value={editFormData.startDate}
                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="editStatus" className="text-white/80">Status</Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                  >
                    <SelectTrigger id="editStatus" className="bg-[#00273C] border-white/10 text-white">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#001f35] border-white/10 text-white">
                      <SelectItem value="Active" className="text-white hover:bg-[#00273C]">Active</SelectItem>
                      <SelectItem value="Inactive" className="text-white hover:bg-[#00273C]">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="editSalary" className="text-white/80">Monthly Salary (₱)</Label>
                  <Input
                    id="editSalary"
                    type="number"
                    className="bg-[#00273C] border-white/10 text-white"
                    value={editFormData.salary}
                    onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value })}
                    placeholder="Enter monthly salary"
                    min="0"
                    step="100"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-white/10 hover:bg-white/10 text-white" onClick={() => (isEditingEmployee ? setIsEditingEmployee(false) : closeEmployeeDialog())}>
                {isEditingEmployee ? 'Cancel' : 'Close'}
              </Button>
              {!isEditingEmployee ? (
                <Button onClick={startEditEmployee} className="bg-[#FF7120] hover:bg-[#FF7120]/90 text-white border-0">Edit Employee</Button>
              ) : (
                <Button onClick={handleUpdateEmployee} disabled={isUpdatingEmployee} className="bg-[#FF7120] hover:bg-[#FF7120]/90 text-white border-0">
                  {isUpdatingEmployee ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
