/**
 * @fileoverview API Service - Axios-based HTTP client for backend API
 * @module services/api
 * @description Provides configured axios instance and organized API methods
 * for all backend endpoints. Includes request/response interceptors for
 * authentication and error handling.
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Configured axios instance with base URL and default headers
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add authentication token
 * Automatically adds JWT token from localStorage to all requests
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor to handle errors
 * Automatically redirects to login on 401 Unauthorized responses
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Authentication API methods
 * @namespace authAPI
 */
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
};

/**
 * Applications API methods
 * @namespace applicationsAPI
 */
export const applicationsAPI = {
  getAll: (params) => api.get('/applications', { params }),
  getById: (id) => api.get(`/applications/${id}`),
  create: (data) => api.post('/applications', data),
  update: (id, data) => api.put(`/applications/${id}`, data),
  delete: (id) => api.delete(`/applications/${id}`),
  submit: (id) => api.post(`/applications/${id}/submit`),
  updateStatus: (id, status) => api.post(`/applications/${id}/status`, { status }),
  complete: (id) => api.post(`/applications/${id}/complete`),
  getStatistics: () => api.get('/applications/statistics'),
  generateMemo: (id) => api.get(`/applications/${id}/memo`),
};

/**
 * Documents API methods
 * @namespace documentsAPI
 */
export const documentsAPI = {
  getByApplication: (applicationId) => api.get(`/applications/${applicationId}/documents`),
  getChecklist: (applicationId) => api.get(`/applications/${applicationId}/documents/checklist`),
  upload: (applicationId, formData) => 
    api.post(`/applications/${applicationId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getById: (id) => api.get(`/documents/${id}`),
  download: (id) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  delete: (id) => api.delete(`/documents/${id}`),
};

/**
 * Agent Review API methods
 * @namespace agentReviewAPI
 */
export const agentReviewAPI = {
  run: (applicationId) => api.post(`/applications/${applicationId}/agent-review`),
};

/**
 * Analysis API methods
 * @namespace analysisAPI
 */
export const analysisAPI = {
  getByApplication: (applicationId) => api.get(`/applications/${applicationId}/analysis`),
  create: (applicationId) => api.post(`/applications/${applicationId}/analysis`),
  updateAssumptions: (applicationId, data) => 
    api.put(`/applications/${applicationId}/analysis/assumptions`, data),
};

/**
 * Decision API methods
 * @namespace decisionAPI
 */
export const decisionAPI = {
  getByApplication: (applicationId) => api.get(`/applications/${applicationId}/decision`),
  submitRecommendation: (applicationId, data) => 
    api.post(`/applications/${applicationId}/decision/recommend`, data),
  finalize: (applicationId, data) => 
    api.post(`/applications/${applicationId}/decision/finalize`, data),
};

/**
 * Memo API methods
 * @namespace memoAPI
 */
export const memoAPI = {
  generate: (applicationId) => api.get(`/applications/${applicationId}/memo`),
};

/**
 * Audit API methods
 * @namespace auditAPI
 */
export const auditAPI = {
  getAll: (params) => api.get('/audit', { params }),
  getByApplication: (applicationId) => api.get(`/applications/${applicationId}/audit`),
};

/**
 * Config API methods
 * @namespace configAPI
 */
export const configAPI = {
  getPolicy: () => api.get('/config/policy'),
  updatePolicy: (data) => api.put('/config/policy', data),
};

export default api;

// Made with Bob
