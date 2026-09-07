import { axiosClient } from '../axiosClient';

export const employeesApi = {
  list: (search) => axiosClient.get('/api/employees', { params: search ? { search } : {} }).then((res) => res.data),
  listPaged: (search, page = 0, size = 25, departmentId) =>
    axiosClient.get('/api/employees/paged', { params: { search: search || undefined, departmentId: departmentId || undefined, page, size } }).then((res) => res.data),
  getById: (id) => axiosClient.get(`/api/employees/${id}`).then((res) => res.data),
  create: (payload) => axiosClient.post('/api/employees', payload).then((res) => res.data),
  previewImport: (file) => {
    const body = new FormData(); body.append('file', file);
    return axiosClient.post('/api/employees/import/preview', body).then((res) => res.data);
  },
  importEmployees: (file, validOnly = false) => {
    const body = new FormData(); body.append('file', file);
    return axiosClient.post(`/api/employees/import?validOnly=${validOnly}`, body).then((res) => res.data);
  },
  downloadImportTemplate: () => axiosClient.get('/api/employees/import/template', { responseType: 'blob' }).then((res) => {
    const url = URL.createObjectURL(res.data); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'employee-import-template.xlsx'; anchor.click(); URL.revokeObjectURL(url);
  }),
  update: (id, payload) => axiosClient.put(`/api/employees/${id}`, payload).then((res) => res.data),
  updateStatus: (id, status, reason) =>
    axiosClient.patch(`/api/employees/${id}/status`, { status, reason }).then((res) => res.data),
  setBiometricMapping: (id, deviceUserId) =>
    axiosClient.patch(`/api/employees/${id}/biometric-mapping`, { deviceUserId }).then((res) => res.data),
  sendInvitation: (id) => axiosClient.post(`/api/employees/${id}/invitation`).then((res) => res.data),
  setAccountStatus: (id, status) => axiosClient.patch(`/api/employees/${id}/account-status`, { status }).then((res) => res.data),
};
