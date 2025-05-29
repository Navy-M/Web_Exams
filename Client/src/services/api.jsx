import axios from 'axios';

const API = axios.create({
  baseURL: "http://localhost:5000/api", // Backend base URL
  withCredentials: true, // To include cookies for auth
});

// --- AUTH API ---
export const login = async (credentials) => {
  try {
    const res = await API.post('/auth/login', credentials);
    return res; // will contain res.data.token and res.data.user (you handle this in context)
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

export const getProfile = async () => {
  try {
    const res = await API.get('/auth/me');
    return res;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to fetch profile');
  }
};

export const logout = async () => {
  try {
    await API.post('/auth/logout');
    localStorage.removeItem("token");
  } catch (error) {
    console.error("Logout failed:", error);
  }
};

// --- USERS API ---
export const getUsers = () => API.get('/users');
export const getUserById = (userId) => API.get(`/users/${userId}`);
export const createUser = (userData) => API.post('/users', userData);
export const updateUser = (userId, updatedData) => API.put(`/users/${userId}`, updatedData);
export const deleteUser = (userId) => API.delete(`/users/${userId}`);

// --- TESTS API ---
export const createTest = (testData) => API.post('/tests', testData);
export const getTests = () => API.get('/tests');
export const getTestById = (testId) => API.get(`/tests/${testId}`);
export const updateTest = (testId, updatedData) => API.put(`/tests/${testId}`, updatedData);
export const deleteTest = (testId) => API.delete(`/tests/${testId}`);

export const assignTest = (testId, userIds, deadline) =>
  API.post(`/tests/${testId}/assign`, { userIds, deadline });

export const getTestResults = (testId) => API.get(`/tests/${testId}/results`);

// --- REQUEST INTERCEPTOR ---
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- RESPONSE INTERCEPTOR ---
API.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      window.location.href = '/login'; // Redirect to login if unauthorized
    }
    return Promise.reject(error);
  }
);

export default API;
