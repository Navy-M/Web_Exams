import axios from 'axios';

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
  (response) => {
    // Success: Directly pass through the response
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    // Custom error message extraction
    const message = data?.message || 
                    data?.error || 
                    'خطای سرور | Server error';

    // Handle specific status codes
    switch (status) {
      case 400:
        console.error('Bad Request:', data);
        break;
      case 401:
        console.warn('Unauthorized - Redirecting to login...');
        window.location.href = '/login';
        break;
      case 404:
        console.error('Not Found:', message);
        break;
      case 500:
        console.error('Server Error:', message);
        break;
      default:
        console.error('API Error:', message);
    }

    // Reject with a standardized error object
    return Promise.reject({
      status,
      message,
      data: data || null, // Include full error response if available
    });
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
export const createUser = async (userData) => (await API.post('/auth/register', userData)).data;
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
    // console.log("is trying");
  
  try {
    const res = await API.post('/auth/profile');
    // console.log(res.data);
    
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
export const updateUser = async (userId, updatedData) => (await API.put(`/users/${userId}`, updatedData)).data;
export const deleteUser = async (userId) => (await API.delete(`/users/${userId}`)).data;
export const completeProfile = async (form) => {
  try {
    const response = await API.post("/users/completeProf", form);
    return response.data; // assume { status: "...", message: "...", data: ... }
  } catch (error) {
    console.error("completeProfile error:", error);
    throw error.response?.data || { message: "خطای ناشناخته هنگام ارسال اطلاعات." };
  }
};
// --- TESTS API ---
export const getTestQuestions = async (testType) => {
  const res = (await API.post("tests/getquestions", {testType})).data;
  // console.log(res);
  return res;
}
// export const assignTest = async (testId, userIds, deadline) =>
//   (await API.post(`/tests/${testId}/assign`, { userIds, deadline })).data;

// --- RESULTS API ---
export const submitResult = async (resultData) => {
  try {
    // console.log("submitedResult req data : ",resultData);
    const response = await API.post('/results/submitUInfo', resultData);
    console.log("submitedResult response : ",response);
    
    return response.data;
  } catch (error) {
    console.error('Error submitting result:', error);
    throw error;
  }
};
export const getTestResults = async (resultId) => (await API.get(`/results/${resultId}`)).data;

export const deleteResult = async (resultId) => {
  try {
    const response = await API.delete(`/results/${resultId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting result:', error);
    throw error;
  }
};

export const getUserResults = async (userId) => {
  try {
    const response = await API.post(`/results/${userId}/list`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user results:', error);
    throw error;
  }
};
export const submitTestFeedback = async (feedbackData) => {
    // console.log("submitedFeedBack req data : ",feedbackData);
  try {
    const response = await API.post("/results/submitfeedback", {feedbackData});
    return response.data;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }
};

// export const submitUserResult = async (miniResultData) => {
//   try {
//     const response = await API.post(`/results/${miniResultData.}/userResult`, miniResultData);
//     console.log("submitUserResult response : ",response);
    
//     return response.data;
//   } catch (error) {
//     console.error('Error submitting result:', error);
//     throw error;
//   }
// }

// --- TEST ANALYZER API ---
export const analyzeTests = async (Data) => {
  try {
    const response = API.post("/results/analyze", Data);
    // console.log("response : " , (await response).data);
    
    return (await response).data;
  } catch (error) {
    console.error('Error Analyzing user results:', error);
    throw error.response?.data || error.message; // Better error handling
  }
}

export const prioritizeUsers = async (people, quotas, weights) => {
  try {
    const response = await API.post("/results/prioritize",  people, quotas, weights );
    return response.data; // This will be { job1: [...], job2: [...] }
  } catch (error) {
    console.error("Error prioritizing users:", error);
    throw error.response?.data || error.message;
  }
};

export default API;
