import { axiosClient } from '../axiosClient';

export const departmentsApi = {
  list: () => axiosClient.get('/api/departments').then((res) => res.data),
  create: (payload) => axiosClient.post('/api/departments', payload).then((res) => res.data),
  activate: (id) => axiosClient.patch(`/api/departments/${id}/activate`),
  deactivate: (id) => axiosClient.patch(`/api/departments/${id}/deactivate`),
};

export const designationsApi = {
  list: () => axiosClient.get('/api/designations').then((res) => res.data),
  create: (payload) => axiosClient.post('/api/designations', payload).then((res) => res.data),
};

export const teamsApi = {
  list: () => axiosClient.get('/api/teams').then((res) => res.data),
  create: (payload) => axiosClient.post('/api/teams', payload).then((res) => res.data),
};
