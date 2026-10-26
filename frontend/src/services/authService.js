import api from './api';
import { MOCK_USERS } from '../mock/mockUsers';
import { getUser } from '../utils/auth';

// Cấu hình chế độ Mock Authentication (mặc định bật true qua biến môi trường VITE_USE_MOCK_AUTH)
export const USE_MOCK_AUTH = import.meta.env.VITE_USE_MOCK_AUTH !== 'false';

// Mảng người dùng test trong bộ nhớ cho chế độ Mock
let mockUsersList = [...MOCK_USERS];

export const authService = {
  /**
   * Đăng nhập
   * Chế độ Mock: Kiểm tra trong MOCK_USERS
   * Chế độ Backend: Gọi POST /api/auth/login
   */
  login: async ({ email, password }) => {
    if (USE_MOCK_AUTH) {
      const cleanEmail = (email || '').trim().toLowerCase();
      const user = mockUsersList.find(
        (u) => u.email.toLowerCase() === cleanEmail
      );

      if (!user || user.password !== password) {
        throw new Error('Email hoặc mật khẩu không chính xác.');
      }

      // Trả về định dạng tương thích hoàn toàn với LoginResponse của Backend
      return {
        accessToken: `mock-auth-token-${user.id}-${Date.now()}`,
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || '',
        address: user.address || '',
        roles: Array.isArray(user.roles) ? [...user.roles] : ['ROLE_USER']
      };
    }

    // Khi Backend hoàn thiện API thật
    return await api.post('/auth/login', { email, password });
  },

  /**
   * Đăng ký tài khoản mới
   */
  register: async ({ email, password, fullName, phone, address }) => {
    if (USE_MOCK_AUTH) {
      const cleanEmail = (email || '').trim().toLowerCase();
      if (mockUsersList.some((u) => u.email.toLowerCase() === cleanEmail)) {
        throw new Error(`Email '${email}' đã được sử dụng.`);
      }

      const newUser = {
        id: Date.now(),
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phone: phone || '',
        address: address || '',
        roles: ['ROLE_USER']
      };

      mockUsersList.push(newUser);
      return { message: 'Đăng ký tài khoản thành công', email: newUser.email };
    }

    // Khi Backend hoàn thiện API thật
    return await api.post('/auth/register', {
      email,
      password,
      fullName,
      phone: phone || '',
      address: address || ''
    });
  },

  /**
   * Lấy thông tin tài khoản hiện tại
   * Chế độ Mock: Lấy từ session lưu trữ
   * Chế độ Backend: Gọi GET /api/users/me
   */
  getCurrentUser: async () => {
    if (USE_MOCK_AUTH) {
      const saved = getUser();
      if (!saved || !saved.email) {
        throw new Error('Phiên đăng nhập không tồn tại');
      }

      const user = mockUsersList.find(
        (u) => u.email.toLowerCase() === saved.email.toLowerCase()
      );

      if (user) {
        return {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone || '',
          address: user.address || '',
          roles: Array.isArray(user.roles) ? [...user.roles] : ['ROLE_USER']
        };
      }

      // Trả về thông tin session đã lưu nếu không tìm thấy trong mock list
      return {
        id: saved.id || 1,
        email: saved.email,
        fullName: saved.fullName || 'Người dùng',
        phone: saved.phone || '',
        address: saved.address || '',
        roles: Array.isArray(saved.roles) ? saved.roles : ['ROLE_USER']
      };
    }

    // Khi Backend hoàn thiện: GET /api/users/me
    return await api.get('/users/me');
  }
};

export default authService;
