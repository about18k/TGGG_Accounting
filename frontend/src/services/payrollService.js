/**
 * Payroll service — employees, deductions, payroll processing
 */
import api from './api';
import {
    buildRequestCacheKey,
    invalidateRequestCache,
    withRequestCache,
} from './requestCache';

const PAYROLL_CACHE_PREFIX = {
    employees: 'payroll:employees',
    recent: 'payroll:recent',
    deductions: 'payroll:deductions',
    attendanceSummary: 'payroll:attendance-summary',
    contributions: 'payroll:employee-contributions',
    allowanceEligibility: 'payroll:allowance-eligibility',
};

const getContributionCacheKey = (employeeId) => `${PAYROLL_CACHE_PREFIX.contributions}:${employeeId}`;

export async function getPayrollEmployees(options = {}) {
    return withRequestCache({
        key: PAYROLL_CACHE_PREFIX.employees,
        ttlMs: 30000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/payroll/employees/');
            return data;
        },
    });
}

export async function getRecentPayroll(params = {}, options = {}) {
    return withRequestCache({
        key: buildRequestCacheKey(PAYROLL_CACHE_PREFIX.recent, params),
        ttlMs: 20000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/payroll/recent/', { params });
            return data;
        },
    });
}

export async function getPayrollPayslipImage(payslipId) {
    const { data } = await api.get(`/payroll/recent/${payslipId}/payslip-image/`, {
        responseType: 'blob',
    });
    return data;
}

export async function getDeductions() {
    return withRequestCache({
        key: PAYROLL_CACHE_PREFIX.deductions,
        ttlMs: 60000,
        request: async () => {
            const { data } = await api.get('/payroll/deductions/');
            return data;
        },
    });
}

export async function createDeduction(payload) {
    const { data } = await api.post('/payroll/deductions/', payload);
    invalidateRequestCache(PAYROLL_CACHE_PREFIX.deductions);
    return data;
}

export async function deleteDeduction(id) {
    const { data } = await api.delete(`/payroll/deductions/${id}/`);
    invalidateRequestCache(PAYROLL_CACHE_PREFIX.deductions);
    return data;
}

export async function getAttendanceSummary(params, options = {}) {
    return withRequestCache({
        key: buildRequestCacheKey(PAYROLL_CACHE_PREFIX.attendanceSummary, params),
        ttlMs: 20000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/payroll/attendance-summary/', { params });
            return data;
        },
    });
}

export async function processPayroll(payload) {
    const { data } = await api.post('/payroll/process/', payload);
    invalidateRequestCache(PAYROLL_CACHE_PREFIX.recent);
    invalidateRequestCache(PAYROLL_CACHE_PREFIX.attendanceSummary);
    return data;
}

export async function getPayrollAllowanceEligibility(options = {}) {
    return withRequestCache({
        key: PAYROLL_CACHE_PREFIX.allowanceEligibility,
        ttlMs: 30000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get('/payroll/allowance-eligibility/');
            return data;
        },
    });
}

export async function updatePayrollAllowanceEligibility(payload) {
    const { data } = await api.post('/payroll/allowance-eligibility/', payload);
    invalidateRequestCache(PAYROLL_CACHE_PREFIX.allowanceEligibility);
    invalidateRequestCache(PAYROLL_CACHE_PREFIX.employees);
    return data;
}

export async function getEmployeeContributions(employeeId, options = {}) {
    return withRequestCache({
        key: getContributionCacheKey(employeeId),
        ttlMs: 60000,
        force: options.force === true,
        request: async () => {
            const { data } = await api.get(`/payroll/employees/${employeeId}/contributions/`);
            return data;
        },
    });
}

export async function updateEmployeeContributions(employeeId, payload) {
    const { data } = await api.post(`/payroll/employees/${employeeId}/contributions/`, payload);
    invalidateRequestCache(getContributionCacheKey(employeeId), { exact: true });
    return data;
}

export async function deleteEmployeeContribution(employeeId, contributionId) {
    const { data } = await api.delete(`/payroll/employees/${employeeId}/contributions/${contributionId}/`);
    invalidateRequestCache(getContributionCacheKey(employeeId), { exact: true });
    return data;
}
