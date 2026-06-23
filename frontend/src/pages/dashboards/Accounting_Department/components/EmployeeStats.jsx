import React from 'react';
import { Users, UserCheck, UserX, Building } from 'lucide-react';

export const EmployeeStats = ({ employeeStats, roleFiltersCount }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Employees */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60 font-medium">Total Employees</p>
            <p className="text-2xl font-bold mt-2 text-white">{employeeStats.total}</p>
          </div>
          <Users className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
        </div>
      </div>

      {/* Active */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60 font-medium">Active</p>
            <p className="text-2xl font-bold mt-2 text-white">{employeeStats.active}</p>
          </div>
          <UserCheck className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
        </div>
      </div>

      {/* On Leave */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60 font-medium">On Leave</p>
            <p className="text-2xl font-bold mt-2 text-white">{employeeStats.onLeave}</p>
          </div>
          <UserX className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
        </div>
      </div>

      {/* Roles */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-lg p-6 transition-all duration-300 hover:scale-[1.02] hover:border-[#FF7120]/30 hover:shadow-[0_10px_20px_rgba(0,0,0,0.15)] group">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60 font-medium">Roles</p>
            <p className="text-2xl font-bold mt-2 text-white">{roleFiltersCount}</p>
          </div>
          <Building className="w-8 h-8 text-[#FF7120] transition-transform duration-300 group-hover:scale-110" />
        </div>
      </div>
    </div>
  );
};
