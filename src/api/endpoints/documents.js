import { axiosClient } from '../axiosClient';

export const documentsApi = {
  byEmployee: (employeeId) => axiosClient.get(`/api/documents/employee/${employeeId}`).then((res) => res.data),
  expiringSoon: (days) => axiosClient.get('/api/documents/expiring-soon', { params: days ? { days } : {} }).then((res) => res.data),
  create: (payload) => axiosClient.post('/api/documents', payload).then((res) => res.data),
  remove: (id) => axiosClient.delete(`/api/documents/${id}`),
};

export const DOCUMENT_TYPE_LABEL = {
  ID_PROOF: 'ID Proof',
  PASSPORT: 'Passport',
  WORK_VISA: 'Work Visa',
  PROFESSIONAL_CERTIFICATION: 'Professional Certification',
  EMPLOYMENT_CONTRACT: 'Employment Contract',
  OTHER: 'Other',
  AADHAAR: 'Aadhaar',
  PAN: 'PAN',
  EXPERIENCE_LETTER: 'Experience Letter',
};

export const MANDATORY_DOCUMENTS = [
  { type: 'AADHAAR', label: 'Aadhaar' },
  { type: 'PAN', label: 'PAN' },
  { type: 'EXPERIENCE_LETTER', label: 'Experience Letter' },
];
