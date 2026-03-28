import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, DollarSign, RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react';
import PublicNavigation from '../Public_Dashboard/PublicNavigation';
import CeoSidebar from './CeoSidebar';
import { getRecentPayroll } from '../../../services/payrollService';

const cardClass = 'rounded-2xl border border-white/10 bg-[#001f35]/70 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]';

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 'PHP 0.00';
  return `PHP ${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getPreparedBy = (record) => {
  const preparedBy = record?.payslip_details?.prepared_by || record?.prepared_by;
  if (preparedBy && String(preparedBy).trim()) return preparedBy;
  return 'Accounting Department';
};

const normalizeRecords = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
};

export default function CeoPayrollProcessedPage({ user, onNavigate, onLogout }) {
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecords = async ({ force = false } = {}) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getRecentPayroll({}, { force });
      setRecords(normalizeRecords(data));
    } catch (requestError) {
      console.error('Failed to load payroll records:', requestError);
      setError(requestError?.response?.data?.error || 'Unable to load processed payroll records.');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return records;

    return records.filter((record) => {
      const searchable = [
        record?.employee_name,
        record?.employee_email,
        record?.employee_role,
        record?.period_start,
        record?.period_end,
        record?.status_label,
        getPreparedBy(record),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [records, query]);

  const totalProcessed = records.length;
  const distinctEmployees = new Set(records.map((record) => record?.employee_id).filter(Boolean)).size;
  const totalNetPay = records.reduce((sum, record) => {
    const amount = Number(record?.net_salary || 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const latestProcessedDate = useMemo(() => {
    if (!records.length) return '-';
    const sorted = [...records].sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
    return formatDate(sorted[0]?.created_at || sorted[0]?.payment_date);
  }, [records]);

  return (
    <div className="min-h-screen bg-[#00273C]">
      <PublicNavigation onNavigate={onNavigate} currentPage="ceo-payroll" user={user} onLogout={onLogout} />

      <div className="pt-40 sm:pt-28 px-4 sm:px-6 pb-10">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
          <aside className="hidden lg:block lg:w-64 shrink-0">
            <CeoSidebar currentPage="ceo-payroll" onNavigate={onNavigate} />
          </aside>

          <main className="flex-1 min-w-0 space-y-6">
            <section className={`${cardClass} p-5 sm:p-6`}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Financial Oversight</p>
                  <h1 className="mt-1 text-2xl font-semibold text-white">Processed Payroll Records</h1>
                  <p className="mt-2 text-sm text-white/60">Review payroll entries processed by accounting and confirm coverage per employee.</p>
                </div>

                <button
                  type="button"
                  onClick={() => fetchRecords({ force: true })}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 transition hover:border-[#FF7120]/45 hover:bg-[#FF7120]/12"
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className={`${cardClass} p-5`}>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Records</p>
                <p className="mt-2 text-2xl font-semibold text-white">{totalProcessed}</p>
              </div>
              <div className={`${cardClass} p-5`}>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Employees Covered</p>
                <p className="mt-2 text-2xl font-semibold text-white">{distinctEmployees}</p>
              </div>
              <div className={`${cardClass} p-5`}>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Total Net Pay</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(totalNetPay)}</p>
              </div>
              <div className={`${cardClass} p-5`}>
                <p className="text-xs uppercase tracking-[0.14em] text-white/45">Latest Processed</p>
                <p className="mt-2 text-2xl font-semibold text-white">{latestProcessedDate}</p>
              </div>
            </section>

            <section className={`${cardClass} p-5 sm:p-6`}>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search employee, period, status, processed by"
                  className="w-full rounded-xl border border-white/15 bg-[#00162A] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-white/45 focus:border-[#FF7120]/50 focus:outline-none"
                />
              </label>

              {error ? (
                <div className="mt-4 rounded-xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div>
              ) : null}

              {isLoading ? (
                <p className="mt-5 text-sm text-white/60">Loading payroll records...</p>
              ) : filteredRecords.length === 0 ? (
                <p className="mt-5 text-sm text-white/60">No payroll records matched your search.</p>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[960px] text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-xs uppercase tracking-[0.12em] text-white/45">
                        <th className="px-3 py-3">Employee</th>
                        <th className="px-3 py-3">Period</th>
                        <th className="px-3 py-3">Net Salary</th>
                        <th className="px-3 py-3">Processed By</th>
                        <th className="px-3 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((record) => (
                        <tr key={record?.id} className="border-b border-white/5">
                          <td className="px-3 py-4 align-top">
                            <div className="font-medium text-white">{record?.employee_name || '-'}</div>
                            <div className="mt-1 text-xs text-white/50">{record?.employee_email || '-'}</div>
                          </td>
                          <td className="px-3 py-4 align-top text-white/80">
                            <div className="inline-flex items-center gap-2">
                              <CalendarDays className="h-3.5 w-3.5 text-[#FF7120]" />
                              <span>{formatDate(record?.period_start)} - {formatDate(record?.period_end)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top text-white">
                            <div className="inline-flex items-center gap-2 font-semibold text-[#FFAE73]">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>{formatCurrency(record?.net_salary)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top text-white/80">
                            <div className="inline-flex items-center gap-2">
                              <UserRound className="h-3.5 w-3.5 text-[#FF7120]" />
                              <span>{getPreparedBy(record)}</span>
                            </div>
                          </td>
                          <td className="px-3 py-4 align-top">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/12 px-2.5 py-1 text-xs font-medium text-emerald-100">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              {record?.status_label || 'Processed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
