import { axiosClient } from '../axiosClient';

export const leaveRequestsApi = {
  list: (status) => axiosClient.get('/api/leave-requests', { params: status ? { status } : {} }).then((res) => res.data),
  teamList: (status) => axiosClient.get('/api/leave-requests/team', { params: status ? { status } : {} }).then((res) => res.data),
  byEmployee: (employeeId) => axiosClient.get(`/api/leave-requests/employee/${employeeId}`).then((res) => res.data),
  balance: (employeeId, year) =>
    axiosClient.get(`/api/leave-requests/employee/${employeeId}/balance`, { params: year ? { year } : {} }).then((res) => res.data),
  apply: (payload) => axiosClient.post('/api/leave-requests', payload).then((res) => res.data),
  approve: (id, note) => axiosClient.patch(`/api/leave-requests/${id}/approve`, { note }).then((res) => res.data),
  reject: (id, note) => axiosClient.patch(`/api/leave-requests/${id}/reject`, { note }).then((res) => res.data),
  cancel: (id) => axiosClient.patch(`/api/leave-requests/${id}/cancel`).then((res) => res.data),
};

export const leaveTypesApi = {
  list: () => axiosClient.get('/api/leave-types').then((res) => res.data),
  create: (payload) => axiosClient.post('/api/leave-types', payload).then((res) => res.data),
  update: (id, payload) => axiosClient.put(`/api/leave-types/${id}`, payload).then((res) => res.data),
};

export const holidaysApi = {
  list: () => axiosClient.get('/api/holidays').then((res) => res.data),
  create: (payload) => axiosClient.post('/api/holidays', payload).then((res) => res.data),
  remove: (id) => axiosClient.delete(`/api/holidays/${id}`),
};
