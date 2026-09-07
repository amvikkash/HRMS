import { axiosClient } from '../axiosClient';

export const dashboardApi = {
  summary: () => axiosClient.get('/api/dashboard/summary').then((res) => res.data),
  myTeam: () => axiosClient.get('/api/dashboard/my-team').then((res) => res.data),
};
