/**
 * Payroll service — employees, deductions, payroll processing
 */
import api from './api';

export async function getPayrollEmployees() {
    const { data } = await api.get('/payroll/employees/');
    return data;
}

export async function getRecentPayroll() {
    const { data } = await api.get('/payroll/recent/');
    return data;
}

export async function getDeductions() {
    const { data } = await api.get('/payroll/deductions/');
    return data;
}

export async function createDeduction(payload) {
    const { data } = await api.post('/payroll/deductions/', payload);
    return data;
}

export async function deleteDeduction(id) {
    const { data } = await api.delete(`/payroll/deductions/${id}/`);
    return data;
}

export async function getAttendanceSummary(params) {
    const { data } = await api.get('/payroll/attendance-summary/', { params });
    return data;
}

export async function processPayroll(payload) {
    const { data } = await api.post('/payroll/process/', payload);
    return data;
}
