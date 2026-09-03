import { axiosClient } from '../axiosClient';

export const usersApi = {
  list: () => axiosClient.get('/api/users').then((res) => res.data),
  create: (payload) => axiosClient.post('/api/users', payload).then((res) => res.data),
  activate: (id) => axiosClient.patch(`/api/users/${id}/activate`).then((res) => res.data),
  deactivate: (id) => axiosClient.patch(`/api/users/${id}/deactivate`).then((res) => res.data),
  assignRoles: (id, roleNames) => axiosClient.put(`/api/users/${id}/roles`, roleNames).then((res) => res.data),
};
