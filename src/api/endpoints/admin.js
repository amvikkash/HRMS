import { axiosClient } from '../axiosClient';

export const adminApi = {
  companies: () => axiosClient.get('/api/admin/companies').then((res) => res.data),
  createCompany: (payload) => axiosClient.post('/api/admin/companies', payload).then((res) => res.data),
  updateCompany: (id, payload) => axiosClient.put(`/api/admin/companies/${id}`, payload).then((res) => res.data),
  subscriptions: () => axiosClient.get('/api/admin/subscriptions').then((res) => res.data),
  createSubscription: (companyId, payload) => axiosClient.post(`/api/admin/companies/${companyId}/subscription`, payload).then((res) => res.data),
  updateSubscription: (id, payload) => axiosClient.put(`/api/admin/subscriptions/${id}`, payload).then((res) => res.data),
};
