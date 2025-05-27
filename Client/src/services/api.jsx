import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true
});

// Auth API
export const login = (credentials) => API.post('/api/auth/login', credentials);
export const logout = () => API.post('/api/auth/logout');

// Tests API
export const createTest = (testData) => API.post('/api/tests', testData);
export const assignTest = (testId, userIds, deadline) => 
  API.post(`/api/tests/${testId}/assign`, { userIds, deadline });
export const getTestResults = (testId) => 
  API.get(`/api/tests/${testId}/results`);

// Users API
export const getUsers = () => API.get('/api/users');

// Interceptors
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if(token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

API.interceptors.response.use(
  response => response,
  error => {
    if(error.response.status === 401) {
      window.location = '/login';
    }
    return Promise.reject(error);
  }
);