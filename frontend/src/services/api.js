import axios from 'axios';
import { getToken, clearAuth } from '../utils/auth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: automatically unwrap Backend ApiResponse envelope
api.interceptors.response.use(
  (response) => {
    // If backend returns ApiResponse envelope: { status, message, data }
    if (
      response.data &&
      typeof response.data === 'object' &&
      'data' in response.data &&
      'status' in response.data
    ) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const responseData = error.response?.data;
    const message =
      responseData?.message ||
      (typeof responseData === 'string' ? responseData : null) ||
      error.message ||
      'Đã xảy ra lỗi khi kết nối với máy chủ!';

    if (status === 401) {
      // If token expired or unauthorized (and not currently on login endpoint)
      if (!error.config?.url?.includes('/auth/login')) {
        clearAuth();
      }
    }

    const customError = new Error(message);
    customError.status = status;
    customError.response = error.response;
    return Promise.reject(customError);
  }
);

export default api;
