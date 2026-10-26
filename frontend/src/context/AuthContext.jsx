import { createContext, useState, useEffect, useCallback } from 'react';
import { getToken, getUser, setToken, setUser, clearAuth } from '../utils/auth';
import authService, { USE_MOCK_AUTH } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setCurrentUser] = useState(null);
  const [token, setCurrentToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khởi tạo và khôi phục trạng thái xác thực từ localStorage khi tải lại trang (F5)
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = getToken();
      const savedUser = getUser();

      if (savedToken && savedUser) {
        setCurrentToken(savedToken);
        setCurrentUser(savedUser);

        try {
          // Lấy thông tin tài khoản mới nhất (qua Mock session hoặc Backend /api/users/me)
          const freshUser = await authService.getCurrentUser();
          if (freshUser) {
            setCurrentUser(freshUser);
            setUser(freshUser);
          }
        } catch (error) {
          console.warn('Phiên xác thực không còn hiệu lực:', error.message);
          clearAuth();
          setCurrentToken(null);
          setCurrentUser(null);
        }
      } else if (savedToken) {
        // Có token nhưng chưa có savedUser
        try {
          const freshUser = await authService.getCurrentUser();
          if (freshUser) {
            setCurrentToken(savedToken);
            setCurrentUser(freshUser);
            setUser(freshUser);
          }
        } catch (error) {
          clearAuth();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Đăng nhập người dùng (hỗ trợ Mock Auth hoặc Backend Auth qua authService)
   */
  const login = useCallback(async (credentialsOrUser, maybeToken) => {
    // Trường hợp truyền trực tiếp (userData, token)
    if (maybeToken) {
      setCurrentUser(credentialsOrUser);
      setCurrentToken(maybeToken);
      setUser(credentialsOrUser);
      setToken(maybeToken);
      return credentialsOrUser;
    }

    // Gọi authService để xử lý đăng nhập (Mock hoặc Backend)
    const loginData = await authService.login(credentialsOrUser);
    const authToken = loginData.accessToken;

    setCurrentToken(authToken);
    setToken(authToken);

    // Lưu thông tin an toàn vào state và localStorage (KHÔNG LƯU PASSWORD)
    const safeUserProfile = {
      id: loginData.id,
      email: loginData.email,
      fullName: loginData.fullName,
      phone: loginData.phone || '',
      address: loginData.address || '',
      roles: Array.isArray(loginData.roles) ? [...loginData.roles] : ['ROLE_USER']
    };

    setCurrentUser(safeUserProfile);
    setUser(safeUserProfile);
    return safeUserProfile;
  }, []);

  /**
   * Đăng xuất người dùng và dọn sạch session
   */
  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentToken(null);
    clearAuth();
  }, []);

  /**
   * Cập nhật thông tin profile
   */
  const updateUser = useCallback((updatedData) => {
    setCurrentUser((prevUser) => {
      const newUser = { ...(prevUser || {}), ...updatedData };
      setUser(newUser);
      return newUser;
    });
  }, []);

  // Xác định quyền quản trị dựa trên mảng roles (ROLE_ADMIN)
  const roles = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
    ? [user.role]
    : [];

  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ADMIN');

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token),
    isAdmin,
    roles,
    loading,
    isMockAuth: USE_MOCK_AUTH,
    login,
    logout,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
