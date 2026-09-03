import { axiosClient } from '../axiosClient';

export const requirementsApi = {
  list: (status) => axiosClient.get('/api/requirements', { params: { status: status || undefined } }).then((res) => res.data),
  create: (payload) => axiosClient.post('/api/requirements', payload).then((res) => res.data),
  update: (id, payload) => axiosClient.put(`/api/requirements/${id}`, payload).then((res) => res.data),
  changeStatus: (id, status, closeReason) => axiosClient.patch(`/api/requirements/${id}/status`, { status, closeReason }).then((res) => res.data),
  remove: (id) => axiosClient.delete(`/api/requirements/${id}`),
};
