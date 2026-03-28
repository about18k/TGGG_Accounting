import React, { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Building2, Mail, RefreshCw, Search, Users } from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import CeoSidebar from './CeoSidebar';
import { getAllUsers } from '../../../services/adminService';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

const formatRole = (user) => {
  if (user?.role_name) return user.role_name;
  if (!user?.role) return 'Unassigned';
  return String(user.role)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getFullName = (user) => {
  const fullName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim();
  return fullName || user?.name || user?.email || 'Unknown';
};

const normalizeUsersResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.users)) return payload.users;
  return [];
};

export default function CeoEmployeeDirectoryPage({ user, onNavigate, onLogout }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async ({ force = false } = {}) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAllUsers({ force });
      setUsers(normalizeUsersResponse(data));
    } catch (requestError) {
      console.error('Failed to load employee directory:', requestError);
      setError(requestError?.response?.data?.error || 'Unable to load employees right now.');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const roleOptions = useMemo(() => {
    const uniqueRoles = Array.from(new Set(users.map((item) => formatRole(item)).filter(Boolean)));
    return uniqueRoles.sort((a, b) => a.localeCompare(b));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((item) => {
      const userRole = formatRole(item);
      if (roleFilter !== 'all' && userRole !== roleFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        getFullName(item),
        item?.email,
        item?.employee_id,
        item?.department_name,
        item?.phone_number,
        userRole,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [users, query, roleFilter]);

  const totalEmployees = users.length;
  const activeEmployees = users.filter((item) => Boolean(item?.is_active)).length;
  const totalDepartments = new Set(users.map((item) => item?.department_name).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-[#00273C]">
      <PublicNavigation onNavigate={onNavigate} currentPage="ceo-employees" user={user} onLogout={onLogout} />

      <div className="pt-40 sm:pt-28 px-4 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <CeoSidebar currentPage="ceo-employees" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0 space-y-6">
            <section className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Workforce Visibility</p>
                  <h1 className="mt-1 text-2xl font-semibold text-white">All Employees</h1>
                  <p className="mt-2 text-sm text-white/60">View employee details across all departments and roles.</p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchUsers({ force: true })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-[#FF7120]/45 hover:bg-[#FF7120]/12"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className={`${cardClass} p-5`}>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Total Employees</p>
                <p className="mt-2 text-2xl font-semibold text-white">{totalEmployees}</p>
              </div>
              <div className={`${cardClass} p-5`}>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Active Accounts</p>
                <p className="mt-2 text-2xl font-semibold text-white">{activeEmployees}</p>
              </div>
              <div className={`${cardClass} p-5`}>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Departments</p>
                <p className="mt-2 text-2xl font-semibold text-white">{totalDepartments}</p>
              </div>
            </section>

            <section className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <label className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                  <input
                    type="text"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search name, email, role, employee ID"
                    className="w-full rounded-xl border border-white/15 bg-[#00162A] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/45 focus:border-[#FF7120]/50 focus:outline-none"
                  />
                </label>

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="rounded-xl border border-white/15 bg-[#00162A] px-3 py-2.5 text-sm text-white focus:border-[#FF7120]/50 focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
              ) : null}

              {isLoading ? (
                <p className="mt-5 text-sm text-white/60">Loading employees...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="mt-5 text-sm text-white/60">No employees matched your filter.</p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[840px] text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.12em] text-white/45">
                        <th className="px-3 py-3">Employee</th>
                        <th className="px-3 py-3">Role</th>
                        <th className="px-3 py-3">Department</th>
                        <th className="px-3 py-3">Email</th>
                        <th className="px-3 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((item) => {
                        const fullName = getFullName(item);
                        const roleName = formatRole(item);
                        const statusLabel = item?.is_active ? 'Active' : 'Inactive';
                        return (
                          <tr key={item?.id || `${item?.email}-${item?.employee_id || ''}`} className="border-b border-white/5">
                            <td className="px-3 py-4 align-top">
                              <div className="font-medium text-white">{fullName}</div>
                              <div className="mt-1 text-xs text-white/50">ID: {item?.employee_id || 'N/A'}</div>
                            </td>
                            <td className="px-3 py-4 align-top text-white/80">
                              <div className="inline-flex items-center gap-2">
                                <BriefcaseBusiness className="h-3.5 w-3.5 text-[#FF7120]" />
                                <span>{roleName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-4 align-top text-white/80">
                              <div className="inline-flex items-center gap-2">
                                <Building2 className="h-3.5 w-3.5 text-[#FF7120]" />
                                <span>{item?.department_name || 'Unassigned'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-4 align-top text-white/80">
                              <div className="inline-flex items-center gap-2">
                                <Mail className="h-3.5 w-3.5 text-[#FF7120]" />
                                <span>{item?.email || '-'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-4 align-top">
                              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${item?.is_active ? 'border-emerald-400/35 bg-emerald-500/12 text-emerald-100' : 'border-white/20 bg-white/6 text-white/70'}`}>
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className={`${cardClass} p-4 text-xs text-white/55`}>
              <div className="flex flex-wrap items-center gap-4">
                <span className="inline-flex items-center gap-2"><Users className="h-3.5 w-3.5 text-[#FF7120]" /> CEO employee visibility</span>
                <span>Data source: Accounts user directory</span>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
