import { axiosClient } from '../axiosClient';

export const selfServiceApi = {
  assets: () => axiosClient.get('/api/employee-assets/me').then((res) => res.data),
  notifications: () => axiosClient.get('/api/notifications').then((res) => res.data),
  markNotificationRead: (id) => axiosClient.patch(`/api/notifications/${id}/read`).then((res) => res.data),
  supportRequests: () => axiosClient.get('/api/support/requests').then((res) => res.data),
  createSupportRequest: (payload) => axiosClient.post('/api/support/requests', payload).then((res) => res.data),
};
