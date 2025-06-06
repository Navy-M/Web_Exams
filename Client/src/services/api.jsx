import axios from 'axios';
import {Haland_Test } from './dummyData'

// Create Axios instance
const API = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // Required for sending cookies (for auth)
});

// --- REQUEST INTERCEPTOR ---
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// --- RESPONSE INTERCEPTOR ---
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || 'Unexpected error';

    if (status === 401) {
      console.warn('Unauthorized - redirecting to login...');
      window.location.href = '/login';
    }

    return Promise.reject(new Error(message));
  }
);


export const checkServer = async () => {
  try {
    const res = await axios.get('http://localhost:5000/api/health', {
      withCredentials: true, // Send cookies if any
    });
    console.log('Server reachable:', res.data.message);
  } catch (err) {
    console.error('Axios connection error:', err.message);
  }
};

// --- AUTH API ---
export const login = async (credentials) => {
  console.log('====== api login function called ======', credentials);
  try {
    const res = await API.post('/auth/login', credentials);
    // Optional: Save token if sent in response body instead of cookie
    if (res.data?.token) {
      localStorage.setItem('token', res.data.token);
    }
    return res.data;
  } catch (error) {
    console.error('Login error:', error.message);
    throw error;
  }
};

export const getProfile = async () => {
  try {
    const res = await API.get('/auth/profile');
    // console.log(res);
    
    return res.data;
  } catch (error) {
    console.error('Profile error:', error.message);
    throw error;
  }
};

export const logout = async () => {
  try {
    await API.post('/auth/logout');
    localStorage.removeItem('token');
  } catch (error) {
    console.error('Logout failed:', error.message);
    throw error;
  }
};

// --- USERS API ---
export const getUsers = async () => (await API.get('/users')).data;
export const getUserById = async (userId) => (await API.get(`/users/${userId}`)).data;
export const createUser = async (userData) => (await API.post('/users', userData)).data;
export const updateUser = async (userId, updatedData) => (await API.put(`/users/${userId}`, updatedData)).data;
export const deleteUser = async (userId) => (await API.delete(`/users/${userId}`)).data;

// --- TESTS API ---
export const getTests = async () => ( Haland_Test);

export const assignTest = async (testId, userIds, deadline) =>
  (await API.post(`/tests/${testId}/assign`, { userIds, deadline })).data;

export const getTestResults = async (testId) => (await API.get(`/tests/${testId}/results`)).data;

// --- RESULTS API ---
export const submitResult = async (resultData) => {
  try {
    const response = await API.post('/results', resultData);
    return response.data;
  } catch (error) {
    console.error('Error submitting result:', error);
    throw error;
  }
};

export default API;
