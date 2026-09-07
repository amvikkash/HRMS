import { axiosClient } from '../axiosClient';

export const salaryStructuresApi = {
  getCurrent: (employeeId) => axiosClient.get(`/api/salary/structures/employee/${employeeId}/current`).then((res) => res.data),
  getHistory: (employeeId) => axiosClient.get(`/api/salary/structures/employee/${employeeId}`).then((res) => res.data),
  upsert: (payload) => axiosClient.post('/api/salary/structures', payload).then((res) => res.data),
};

export const employeeSalaryApi = {
  list: ({ search, departmentId, status, sortBy, sortDir, page = 0, size = 10 } = {}) =>
    axiosClient
      .get('/api/salary/employees', { params: { search: search || undefined, departmentId: departmentId || undefined, status: status || undefined, sortBy, sortDir, page, size } })
      .then((res) => res.data),
  getDetail: (employeeId) => axiosClient.get(`/api/salary/employees/${employeeId}`).then((res) => res.data),
};

export const payrollApi = {
  listRuns: () => axiosClient.get('/api/salary/payroll-runs').then((res) => res.data),
  getRun: (runId) => axiosClient.get(`/api/salary/payroll-runs/${runId}`).then((res) => res.data),
  createRun: (payload) => axiosClient.post('/api/salary/payroll-runs', payload).then((res) => res.data),
  setItemHold: (runId, itemId, payload) => axiosClient.patch(`/api/salary/payroll-runs/${runId}/items/${itemId}/hold`, payload).then((res) => res.data),
  process: (runId) => axiosClient.post(`/api/salary/payroll-runs/${runId}/process`).then((res) => res.data),
  markPaid: (runId, payload) => axiosClient.post(`/api/salary/payroll-runs/${runId}/mark-paid`, payload || {}).then((res) => res.data),
  cancel: (runId) => axiosClient.delete(`/api/salary/payroll-runs/${runId}`).then((res) => res.data),
};

export const salaryDashboardApi = {
  summary: () => axiosClient.get('/api/salary/dashboard/summary').then((res) => res.data),
};
