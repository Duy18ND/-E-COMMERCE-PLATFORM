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
  removeUser();
};

export const isAuthenticated = () => {
  return Boolean(getToken());
};
