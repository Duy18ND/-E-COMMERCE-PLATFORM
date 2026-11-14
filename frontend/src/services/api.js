import axios from 'axios';
import { getToken, setToken, getRefreshToken, setRefreshToken, clearAuth } from '../utils/auth.js';

const BASE_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:8080/api/v1';

const api = axios.create({
  baseURL: BASE_API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: tự động đính kèm JWT Bearer Token vào mọi request cần xác thực
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Hàm giải nén chuẩn cấu trúc ApiResponse của Backend:
 * Hỗ trợ cả { success, message, data, timestamp } và { status, message, data }
 */
export const unwrapApiResponse = (payload) => {
  // Support either full Axios response object or raw response.data payload
  if (
    payload &&
    typeof payload === 'object' &&
    payload.data &&
    typeof payload.data === 'object' &&
    !('success' in payload) &&
    ('success' in payload.data || 'status' in payload.data || 'data' in payload.data)
  ) {
    payload = payload.data;
  }

  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    ('success' in payload || 'status' in payload)
  ) {
    if (payload.success === false) {
      const err = new Error(payload.message || 'Yêu cầu thất bại');
      err.response = { data: payload };
      throw err;
    }
    return payload.data;
  }
  return payload;
};

// Response interceptor: tự động mở bọc ApiResponse và xử lý 401 / Refresh Token / Validation Errors
api.interceptors.response.use(
  (response) => {
    return unwrapApiResponse(response.data);
  },
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const responseData = error.response?.data;
    const requestUrl = originalRequest.url || '';

    const isAuthPublicEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh');

    // Xử lý 401 Unauthorized & tự động làm mới Access Token nếu có Refresh Token hợp lệ
    if (status === 401 && !isAuthPublicEndpoint) {
      const savedRefreshToken = getRefreshToken();

      if (
        savedRefreshToken &&
        !savedRefreshToken.startsWith('mock-') &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;
        try {
          const refreshRes = await axios.post(
            `${BASE_API_URL}/auth/refresh`,
            { refreshToken: savedRefreshToken },
            { headers: { 'Content-Type': 'application/json' } }
          );
          const refreshedData = unwrapApiResponse(refreshRes.data);
          if (refreshedData?.accessToken) {
            setToken(refreshedData.accessToken);
            if (refreshedData.refreshToken) {
              setRefreshToken(refreshedData.refreshToken);
            }
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${refreshedData.accessToken}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          // Refresh token hết hạn hoặc không hợp lệ -> đăng xuất
        }
      }

      clearAuth();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('auth:unauthorized', {
            detail: { message: responseData?.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' }
          })
        );
      }
    }

    // Trích xuất lỗi chi tiết từng trường (Field Errors) từ Backend GlobalExceptionHandler (HTTP 400)
    const fieldErrors =
      responseData?.errors && typeof responseData.errors === 'object'
        ? responseData.errors
        : null;

    const firstFieldError = fieldErrors ? Object.values(fieldErrors)[0] : null;
    const isTimeout =
      error.code === 'ECONNABORTED' ||
      String(error.message || '').toLowerCase().includes('timeout');
    const isNetworkError = !error.response && !isTimeout;

    let statusFallbackMessage = null;
    if (isTimeout) {
      statusFallbackMessage =
        'Yêu cầu quá thời gian phản hồi (Timeout). Vui lòng kiểm tra kết nối và thử lại.';
    } else if (isNetworkError) {
      statusFallbackMessage =
        'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra kết nối mạng hoặc dịch vụ.';
    } else if (status === 400) {
      statusFallbackMessage = 'Dữ liệu yêu cầu không hợp lệ (HTTP 400).';
    } else if (status === 401) {
      statusFallbackMessage = 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn (HTTP 401).';
    } else if (status === 403) {
      statusFallbackMessage = 'Bạn không có quyền truy cập tài nguyên này (HTTP 403).';
    } else if (status === 404) {
      statusFallbackMessage = 'Không tìm thấy dữ liệu hoặc tài nguyên yêu cầu (HTTP 404).';
    } else if (status >= 500) {
      statusFallbackMessage = 'Máy chủ đang gặp sự cố nội bộ (HTTP 500). Vui lòng thử lại sau.';
    }

    const message =
      firstFieldError ||
      responseData?.message ||
      (typeof responseData === 'string' && responseData.trim() ? responseData : null) ||
      statusFallbackMessage ||
      error.message ||
      'Đã xảy ra lỗi khi kết nối với máy chủ!';

    const customError = new Error(message);
    customError.status = status || (isTimeout ? 408 : isNetworkError ? 0 : undefined);
    customError.fieldErrors = fieldErrors;
    customError.response = error.response;
    customError.code = error.code;
    return Promise.reject(customError);
  }
);

export const isHttpResponseError = (err) =>
  Boolean(err?.response && (typeof err.response.status === 'number' || err.response.data?.success === false));

export const toBackendError = (err, fallbackMessage = 'Lỗi từ hệ thống') => {
  const mapped = new Error(err?.response?.data?.message || err?.message || fallbackMessage);
  mapped.response = err?.response;
  return mapped;
};

export default api;
