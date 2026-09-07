import { axiosClient } from '../axiosClient';

export const authApi = {
  login: (username, password) =>
    axiosClient.post('/api/auth/login', { username, password }).then((res) => res.data),

  logout: (refreshToken) => axiosClient.post('/api/auth/logout', { refreshToken }),

  me: () => axiosClient.get('/api/auth/me').then((res) => res.data),

  changePassword: (currentPassword, newPassword) =>
    axiosClient.post('/api/auth/change-password', { currentPassword, newPassword }).then((res) => res.data),

  inspectInvitation: (token) => axiosClient.get('/api/auth/activate/inspect', { params: { token } }).then((res) => res.data),
  activateAccount: (token, password) => axiosClient.post('/api/auth/activate', { token, password }).then((res) => res.data),
  requestPasswordReset: (identifier) => axiosClient.post('/api/auth/forgot-password', { identifier }),
  resetPassword: (token, password) => axiosClient.post('/api/auth/reset-password', { token, password }).then((res) => res.data),
};
