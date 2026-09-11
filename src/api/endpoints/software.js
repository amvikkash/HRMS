import { axiosClient } from '../axiosClient';

export const softwareApi = {
  packages: () => axiosClient.get('/api/software/packages').then((res) => res.data),
  versions: (packageId) => axiosClient.get(`/api/software/packages/${packageId}/versions`).then((res) => res.data),
  createPackage: (payload) => axiosClient.post('/api/software/packages', payload).then((res) => res.data),
  createVersion: (packageId, payload, installer) => {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
    form.append('installer', installer);
    return axiosClient.post(`/api/software/packages/${packageId}/versions`, form).then((res) => res.data);
  },
  deployments: () => axiosClient.get('/api/software/deployments').then((res) => res.data),
  deploymentTargets: (deploymentId) => axiosClient.get(`/api/software/deployments/${deploymentId}/targets`).then((res) => res.data),
  createDeployment: (payload) => axiosClient.post('/api/software/deployments', payload).then((res) => res.data),
};
