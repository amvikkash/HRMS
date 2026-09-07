import { axiosClient } from '../axiosClient';

export const rolesApi = {
  list: () => axiosClient.get('/api/roles').then((res) => res.data),
  create: (payload) => axiosClient.post('/api/roles', payload).then((res) => res.data),
  updatePermissions: (id, permissionCodes) =>
    axiosClient.put(`/api/roles/${id}/permissions`, permissionCodes).then((res) => res.data),
  remove: (id) => axiosClient.delete(`/api/roles/${id}`),
};

export const permissionsApi = {
  list: () => axiosClient.get('/api/permissions').then((res) => res.data),
};
