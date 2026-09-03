import { axiosClient } from '../axiosClient';

export const reportsApi = {
  employees: () => axiosClient.get('/api/reports/employees').then((res) => res.data),
  attendance: (startDate, endDate) =>
    axiosClient.get('/api/reports/attendance', { params: { startDate, endDate } }).then((res) => res.data),
  leave: (year) => axiosClient.get('/api/reports/leave', { params: year ? { year } : {} }).then((res) => res.data),
  recruitment: () => axiosClient.get('/api/reports/recruitment').then((res) => res.data),
  departmentComparison: (startDate, endDate) => axiosClient.get('/api/reports/departments/comparison', { params: { startDate, endDate } }).then((res) => res.data),
};
