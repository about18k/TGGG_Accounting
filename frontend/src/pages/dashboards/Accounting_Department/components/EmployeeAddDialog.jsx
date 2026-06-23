import React, { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Eye, EyeOff } from 'lucide-react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Label,
} from '../../../../components/ui/accounting-ui';
import { addAccountingEmployee } from '../../../../services/adminService';

export const EmployeeAddDialog = ({ isAddEmployeeOpen, setIsAddEmployeeOpen, fetchEmployees }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    startDate: '',
    temporary_password: '',
  });
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);

  const handleAddEmployee = async () => {
    const firstName = formData.first_name.trim();
    const lastName = formData.last_name.trim();
    const email = formData.email.trim();
    const temporaryPassword = formData.temporary_password;

    if (!firstName || !lastName || !email) {
      toast.error('Validation Error', {
        description: 'First name, last name, and email are required.',
      });
      return;
    }

    if (!temporaryPassword || temporaryPassword.length < 8) {
      toast.error('Validation Error', {
        description: 'Temporary password is required and must be at least 8 characters.',
      });
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
        startDate: formData.startDate,
        temporary_password: temporaryPassword,
      });
      setIsAddEmployeeOpen(false);
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        startDate: '',
        temporary_password: '',
      });
      fetchEmployees();
      toast.success('Employee Submitted', {
        description: 'The account is pending Studio Head/Admin approval and a confirmation email has been sent.',
      });
    } catch (error) {
      toast.error('Addition Failed', {
        description: error.response?.data?.error || error.message,
      });
    } finally {
      setIsAddingEmployee(false);
    }
  };

  return (
    <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[#FF7120] hover:bg-[#FF7120]/90 text-white border-0">
          <Plus className="w-4 h-4" />
          Add Employee
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#001f35] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Add New Employee</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-white/80">First Name</Label>
            <Input id="firstName" className="bg-[#00273C] border-white/10 text-white" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} placeholder="Enter first name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-white/80">Last Name</Label>
            <Input id="lastName" className="bg-[#00273C] border-white/10 text-white" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} placeholder="Enter last name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-white/80">Email</Label>
            <Input id="email" className="bg-[#00273C] border-white/10 text-white" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="Enter email address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-white/80">Start Date</Label>
            <Input id="startDate" className="bg-[#00273C] border-white/10 text-white" type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="temporaryPassword" className="text-white/80">Temporary Password</Label>
            <div className="relative">
              <Input
                id="temporaryPassword"
                className="bg-[#00273C] border-white/10 text-white pr-10"
                type={showTemporaryPassword ? 'text' : 'password'}
                value={formData.temporary_password}
                onChange={e => setFormData({ ...formData, temporary_password: e.target.value })}
                placeholder="Set a temporary password (min. 8 characters)"
              />
              <button
                type="button"
                onClick={() => setShowTemporaryPassword(prev => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                aria-label={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'}
              >
                {showTemporaryPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" className="border-white/10 hover:bg-white/10 text-white" onClick={() => setIsAddEmployeeOpen(false)}>Cancel</Button>
          <Button onClick={handleAddEmployee} disabled={isAddingEmployee} className="bg-[#FF7120] hover:bg-[#FF7120]/90 text-white border-0">
            {isAddingEmployee ? 'Adding...' : 'Add Employee'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
