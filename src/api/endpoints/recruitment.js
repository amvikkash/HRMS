import { axiosClient } from '../axiosClient';

export const jobOpeningsApi = {
  list: () => axiosClient.get('/api/job-openings').then((res) => res.data),
  create: (payload) => axiosClient.post('/api/job-openings', payload).then((res) => res.data),
  setStatus: (id, status) => axiosClient.patch(`/api/job-openings/${id}/status`, { status }).then((res) => res.data),
};

export const candidatesApi = {
  list: (jobOpeningId) => axiosClient.get('/api/candidates', { params: jobOpeningId ? { jobOpeningId } : {} }).then((res) => res.data),
  get: (id) => axiosClient.get(`/api/candidates/${id}`).then((res) => res.data),
  create: (payload) => axiosClient.post('/api/candidates', payload).then((res) => res.data),
  // decision: 'SHORTLISTED' | 'HOLD' | 'REJECTED', plus optional rating/remarks/rejectionReason
  review: (id, payload) => axiosClient.patch(`/api/candidates/${id}/review`, payload).then((res) => res.data),
  updateNotes: (id, notes) => axiosClient.patch(`/api/candidates/${id}/notes`, { notes }).then((res) => res.data),
  timeline: (id) => axiosClient.get(`/api/candidates/${id}/timeline`).then((res) => res.data),
  // targetStage: 'ROUND1' | 'ROUND2' | 'ROUND3' | 'HOLD' | 'REJECTED'
  advance: (id, payload) => axiosClient.patch(`/api/candidates/${id}/advance`, payload).then((res) => res.data),
  generateOffer: (id, payload) => axiosClient.post(`/api/candidates/${id}/generate-offer`, payload).then((res) => res.data),
  acceptOffer: (id) => axiosClient.post(`/api/candidates/${id}/accept-offer`).then((res) => res.data),
  // "Select for Manager Round": { managerEmployeeId, scheduledAt, meetingLink, instructions? }
  assignManager: (id, payload) => axiosClient.post(`/api/candidates/${id}/assign-manager`, payload).then((res) => res.data),
  // Offer letter upload/send workflow - see GenerateOfferModal (generateOffer, above) for the offer-terms step.
  uploadOfferLetter: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(`/api/candidates/${id}/offer-letter`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },
  downloadOfferLetter: (id) => axiosClient.get(`/api/candidates/${id}/offer-letter`, { responseType: 'blob' }),
  // Streamed inline (Content-Disposition: inline) rather than a plain URL, since the endpoint needs the same auth header as everything else - callers open the resulting blob in a new tab.
  previewOfferLetter: (id) => axiosClient.get(`/api/candidates/${id}/offer-letter/preview`, { responseType: 'blob' }),
  sendOfferLetter: (id) => axiosClient.post(`/api/candidates/${id}/send-offer-letter`).then((res) => res.data),
  // Same inline-preview pattern as previewOfferLetter above, for the candidate's resume.
  previewResume: (id) => axiosClient.get(`/api/candidates/${id}/resume/preview`, { responseType: 'blob' }),
};

export const interviewsApi = {
  byCandidate: (candidateId) => axiosClient.get(`/api/interviews/candidate/${candidateId}`).then((res) => res.data),
  upcoming: () => axiosClient.get('/api/interviews/upcoming').then((res) => res.data),
  // Manager Portal: interviews assigned to the current logged-in user
  my: () => axiosClient.get('/api/interviews/my').then((res) => res.data),
  // roundNumber: 1 | 2 | 3
  schedule: (payload) => axiosClient.post('/api/interviews', payload).then((res) => res.data),
  submitFeedback: (id, payload) => axiosClient.patch(`/api/interviews/${id}/feedback`, payload).then((res) => res.data),
  // Round 2/3 outcome: { technicalRating?, communicationRating?, overallRating, remarks?, decision }
  // decision for round 2: 'REJECTED' | 'SELECT_FOR_FINAL'; round 3: 'REJECTED' | 'APPROVED_FOR_OFFER'
  submitDecision: (id, payload) => axiosClient.patch(`/api/interviews/${id}/decision`, payload).then((res) => res.data),
};

// Public, unauthenticated - the Careers page. Uses the same axiosClient
// (it never forces a login redirect - only a real 401 from an authed
// endpoint does that, and these endpoints never return one).
export const careersApi = {
  listOpenJobs: () => axiosClient.get('/api/careers/jobs').then((res) => res.data),
  getJob: (id) => axiosClient.get(`/api/careers/jobs/${id}`).then((res) => res.data),
  apply: (applicationFields, resumeFile) => {
    const formData = new FormData();
    formData.append('application', new Blob([JSON.stringify(applicationFields)], { type: 'application/json' }));
    if (resumeFile) {
      formData.append('resume', resumeFile);
    }
    return axiosClient.post('/api/careers/apply', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((res) => res.data);
  },
};
