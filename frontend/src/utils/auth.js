import { STORAGE_KEYS } from './constants';

export const getToken = () => {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
};

export const setToken = (token) => {
  if (token) {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  }
};

export const removeToken = () => {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
};

export const getRefreshToken = () => {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
};

export const setRefreshToken = (refreshToken) => {
  if (refreshToken) {
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
  }
};

export const removeRefreshToken = () => {
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
};

export const getUser = () => {
  const user = localStorage.getItem(STORAGE_KEYS.USER);
  try {
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};

export const setUser = (user) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }
};

export const removeUser = () => {
  localStorage.removeItem(STORAGE_KEYS.USER);
};

export const clearAuth = () => {
  removeToken();
  removeRefreshToken();
  removeUser();
};

/**
 * Giải mã payload của JWT Token (hỗ trợ chuẩn Base64Url)
 */
export const parseJwtPayload = (token) => {
  if (!token || typeof token !== 'string' || token.startsWith('mock-auth-token-')) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = typeof atob === 'function'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('binary');
    const jsonPayload = decodeURIComponent(
      binary
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

/**
 * Kiểm tra JWT Token đã hết hạn hay chưa
 */
export const isTokenExpired = (token) => {
  if (!token) return true;
  if (token.startsWith('mock-auth-token-')) return false;
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return false;
  return payload.exp * 1000 <= Date.now();
};

export const isAuthenticated = () => {
  const token = getToken();
  return Boolean(token) && !isTokenExpired(token);
};
