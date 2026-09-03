import { axiosClient, API_BASE_URL } from '../axiosClient';
import { tokenStorage } from '../../auth/tokenStorage';

export const attendanceApi = {
  byDate: (date) => axiosClient.get('/api/attendance', { params: date ? { date } : {} }).then((res) => res.data),
  byEmployee: (employeeId) => axiosClient.get(`/api/attendance/employee/${employeeId}`).then((res) => res.data),
  unmapped: () => axiosClient.get('/api/attendance/unmapped').then((res) => res.data),
  exceptions: (date) => axiosClient.get('/api/attendance/exceptions', { params: date ? { date } : {} }).then((res) => res.data),
  // EventSource can't set an Authorization header, so the access token
  // rides along as a query param for this one connection - see the
  // matching comment in JwtAuthenticationFilter on the backend.
  streamUrl: () => `${API_BASE_URL}/api/attendance/stream?token=${encodeURIComponent(tokenStorage.getAccessToken() || '')}`,
};

export const devicesApi = {
  list: () => axiosClient.get('/api/devices').then((res) => res.data),
  rename: (id, deviceName) => axiosClient.patch(`/api/devices/${id}/rename`, { deviceName }).then((res) => res.data),
};
