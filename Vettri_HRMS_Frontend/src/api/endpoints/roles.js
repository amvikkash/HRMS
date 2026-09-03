import { axiosClient } from '../axiosClient';

export const rolesApi = {
  list: () => axiosClient.get('/api/roles').then((res) => res.data),
};
