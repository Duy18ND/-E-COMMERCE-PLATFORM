import { createContext, useState, useEffect, useCallback } from 'react';
import {
  getToken,
  getRefreshToken,
  getUser,
  setToken,
  setRefreshToken,
  setUser,
  clearAuth,
  isTokenExpired
} from '../utils/auth';
import authService, { USE_MOCK_AUTH, normalizeAuthPayload, normalizeRoles } from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setCurrentUser] = useState(null);
  const [token, setCurrentToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lắng nghe sự kiện 401 Unauthorized từ Axios Response Interceptor để đồng bộ xóa state ngay lập tức
  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuth();
      setCurrentToken(null);
      setCurrentUser(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:unauthorized', handleUnauthorized);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('auth:unauthorized', handleUnauthorized);
      }
    };
  }, []);

  // Khởi tạo và khôi phục trạng thái xác thực từ localStorage khi tải lại trang (F5)
  useEffect(() => {
    const initAuth = async () => {
      let savedToken = getToken();
      const savedRefreshToken = getRefreshToken();
      const savedUser = getUser();

      if (!savedToken) {
        setLoading(false);
        return;
      }

      // Kiểm tra nếu JWT token đã hết hạn
      if (isTokenExpired(savedToken)) {
        if (savedRefreshToken) {
          try {
            const refreshed = await authService.refreshToken(savedRefreshToken);
            if (refreshed?.accessToken) {
              savedToken = refreshed.accessToken;
              setToken(savedToken);
              if (refreshed.refreshToken) {
                setRefreshToken(refreshed.refreshToken);
              }
            } else {
              clearAuth();
              setLoading(false);
              return;
            }
          } catch (err) {
            clearAuth();
            setLoading(false);
            return;
          }
        } else {
          clearAuth();
          setLoading(false);
          return;
        }
      }

      setCurrentToken(savedToken);
      if (savedUser) {
        const normalizedSaved = normalizeAuthPayload(savedUser, { accessToken: savedToken });
        setCurrentUser(normalizedSaved);
      }

      try {
        // Lấy thông tin tài khoản mới nhất (qua Backend GET /api/v1/auth/me hoặc session)
        const freshUser = await authService.getCurrentUser();
        if (freshUser) {
          const mergedUser = {
            id: freshUser.userId ?? freshUser.id ?? savedUser?.id,
            userId: freshUser.userId ?? freshUser.id ?? savedUser?.userId ?? savedUser?.id,
            email: freshUser.email || savedUser?.email || '',
            fullName: freshUser.fullName || savedUser?.fullName || 'Người dùng',
            phone: freshUser.phone || savedUser?.phone || '',
            address: freshUser.address || savedUser?.address || '',
            roles: normalizeRoles(freshUser.roles || savedUser?.roles, freshUser.authorities)
          };
          setCurrentUser(mergedUser);
          setUser(mergedUser);
        }
      } catch (error) {
        console.warn('Phiên xác thực không còn hiệu lực:', error.message);
        clearAuth();
        setCurrentToken(null);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Đăng nhập người dùng (hỗ trợ Backend Auth /api/v1/auth/login và Mock Auth)
   */
  const login = useCallback(async (credentialsOrUser, maybeToken) => {
    if (maybeToken) {
      const normalized = normalizeAuthPayload(credentialsOrUser, { accessToken: maybeToken });
      setCurrentUser(normalized);
      setCurrentToken(maybeToken);
      setUser(normalized);
      setToken(maybeToken);
      return normalized;
    }

    const loginData = await authService.login(credentialsOrUser);
    const authToken = loginData.accessToken;

    setCurrentToken(authToken);
    setToken(authToken);
    if (loginData.refreshToken) {
      setRefreshToken(loginData.refreshToken);
    }

    const resolvedId = loginData.userId ?? loginData.id;
    const safeUserProfile = {
      id: resolvedId,
      userId: resolvedId,
      email: loginData.email,
      fullName: loginData.fullName,
      phone: loginData.phone || '',
      address: loginData.address || '',
      roles: normalizeRoles(loginData.roles, loginData.authorities)
    };

    setCurrentUser(safeUserProfile);
    setUser(safeUserProfile);
    return safeUserProfile;
  }, []);

  /**
   * Đăng ký người dùng mới qua authService
   */
  const register = useCallback(async (registerData) => {
    return await authService.register(registerData);
  }, []);

  /**
   * Đăng xuất người dùng, gọi API thu hồi token trên Redis và dọn sạch session ở client
   */
  const logout = useCallback(async () => {
    setCurrentUser(null);
    setCurrentToken(null);
    try {
      await authService.logout();
    } finally {
      clearAuth();
    }
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

  // Xác định quyền quản trị dựa trên mảng roles (ROLE_ADMIN / ADMIN)
  const roles = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
    ? [user.role]
    : [];

  const isAdmin = roles.includes('ROLE_ADMIN') || roles.includes('ADMIN');
  const isAuthenticated = Boolean(token) && !isTokenExpired(token);

  const value = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    roles,
    loading,
    isMockAuth: USE_MOCK_AUTH,
    login,
    register,
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
