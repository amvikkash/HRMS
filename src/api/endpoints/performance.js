import { axiosClient } from '../axiosClient';

export const goalsApi = {
  byEmployee: (employeeId) => axiosClient.get(`/api/goals/employee/${employeeId}`).then((res) => res.data),
  create: (payload) => axiosClient.post('/api/goals', payload).then((res) => res.data),
  updateProgress: (id, payload) => axiosClient.patch(`/api/goals/${id}/progress`, payload).then((res) => res.data),
};

export const performanceReviewsApi = {
  list: () => axiosClient.get('/api/performance-reviews').then((res) => res.data),
  byEmployee: (employeeId) => axiosClient.get(`/api/performance-reviews/employee/${employeeId}`).then((res) => res.data),
  create: (payload) => axiosClient.post('/api/performance-reviews', payload).then((res) => res.data),
  submit: (id) => axiosClient.patch(`/api/performance-reviews/${id}/submit`).then((res) => res.data),
  acknowledge: (id) => axiosClient.patch(`/api/performance-reviews/${id}/acknowledge`).then((res) => res.data),
};
