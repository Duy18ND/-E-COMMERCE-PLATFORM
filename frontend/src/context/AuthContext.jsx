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
import userService, { formatCustomerAddress } from '../services/userService';

const isMockSessionToken = (tokenValue) =>
  Boolean(USE_MOCK_AUTH || (typeof tokenValue === 'string' && tokenValue.startsWith('mock-')));

const isSameSessionUser = (savedUser, freshUser) => {
  if (!savedUser || !freshUser) return false;
  const savedEmail = String(savedUser.email || '').trim().toLowerCase();
  const freshEmail = String(freshUser.email || '').trim().toLowerCase();
  if (savedEmail && freshEmail && savedEmail === freshEmail) return true;
  const savedId = savedUser.userId ?? savedUser.id;
  const freshId = freshUser.userId ?? freshUser.id;
  return savedId != null && freshId != null && String(savedId) === String(freshId);
};

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

      const isMockSession = isMockSessionToken(savedToken);

      setCurrentToken(savedToken);
      if (savedUser) {
        // Trong chế độ Backend thật, không giữ address cũ từ localStorage (tránh hiển thị địa chỉ mock cũ trước khi API tải xong)
        const sanitizedSeed = isMockSession
          ? savedUser
          : { ...savedUser, address: '', defaultAddress: null };
        const normalizedSaved = normalizeAuthPayload(
          sanitizedSeed,
          { accessToken: savedToken },
          { isMock: isMockSession }
        );
        setCurrentUser(normalizedSaved);
      }

      try {
        // Lấy thông tin tài khoản mới nhất từ Backend (GET /api/v1/auth/me)
        const freshUser = await authService.getCurrentUser();
        if (freshUser) {
          let freshProfile = null;
          if (!isMockSession) {
            try {
              freshProfile = await userService.getProfile();
            } catch (profileErr) {
              // Bỏ qua nếu /users/profile tạm lỗi, vẫn giữ dữ liệu từ /auth/me
            }
          }

          const sameUser = isSameSessionUser(savedUser, freshUser);
          const avatarRemoved = sameUser
            ? Boolean(savedUser?.avatarRemoved ?? freshUser.avatarRemoved ?? false)
            : Boolean(freshUser.avatarRemoved ?? false);
          const resolvedAvatar = avatarRemoved
            ? ''
            : freshProfile?.avatarUrl ||
              freshUser.avatarUrl ||
              freshUser.avatar ||
              (sameUser ? savedUser?.avatarUrl || savedUser?.avatar : '') ||
              '';

          const resolvedDefaultAddress = freshProfile?.defaultAddress ?? null;
          const formattedDefaultAddress = resolvedDefaultAddress
            ? formatCustomerAddress(resolvedDefaultAddress)
            : '';
          const resolvedRealAddress =
            formattedDefaultAddress && formattedDefaultAddress !== 'Chưa cập nhật'
              ? formattedDefaultAddress
              : '';

          const mergedUser = {
            id: freshProfile?.id ?? freshUser.userId ?? freshUser.id ?? (sameUser ? savedUser?.id : null),
            userId: freshProfile?.id ?? freshUser.userId ?? freshUser.id ?? (sameUser ? savedUser?.userId ?? savedUser?.id : null),
            email: freshProfile?.email || freshUser.email || (sameUser ? savedUser?.email : '') || '',
            fullName: freshProfile?.fullName || freshUser.fullName || (sameUser ? savedUser?.fullName : '') || 'Người dùng',
            phone: isMockSession
              ? freshUser.phone || savedUser?.phone || '0912345678'
              : freshProfile?.phone ?? freshUser.phone ?? '',
            address: isMockSession
              ? freshUser.address || savedUser?.address || '123 Đường Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội'
              : resolvedRealAddress,
            defaultAddress: resolvedDefaultAddress,
            avatarUrl: resolvedAvatar,
            avatar: resolvedAvatar,
            avatarRemoved,
            roles: normalizeRoles(freshProfile?.roles || freshUser.roles || (sameUser ? savedUser?.roles : []), freshUser.authorities)
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
      const normalized = normalizeAuthPayload(
        credentialsOrUser,
        { accessToken: maybeToken },
        { isMock: isMockSessionToken(maybeToken) }
      );
      setCurrentUser(normalized);
      setCurrentToken(maybeToken);
      setUser(normalized);
      setToken(maybeToken);
      return normalized;
    }

    const loginData = await authService.login(credentialsOrUser);
    const authToken = loginData.accessToken;
    const isMockSession = isMockSessionToken(authToken);

    setCurrentToken(authToken);
    setToken(authToken);
    if (loginData.refreshToken) {
      setRefreshToken(loginData.refreshToken);
    }

    const resolvedId = loginData.userId ?? loginData.id;
    let syncedProfile = null;
    let syncedMe = null;

    // Sau khi đăng nhập Backend thật thành công, đồng bộ thêm phone & địa chỉ mặc định từ API
    if (!isMockSession) {
      const [profileRes, meRes] = await Promise.allSettled([
        userService.getProfile(),
        authService.getCurrentUser()
      ]);
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        syncedProfile = profileRes.value;
      }
      if (meRes.status === 'fulfilled' && meRes.value) {
        syncedMe = meRes.value;
      }
    }

    const resolvedDefaultAddress = syncedProfile?.defaultAddress ?? null;
    const formattedDefaultAddress = resolvedDefaultAddress
      ? formatCustomerAddress(resolvedDefaultAddress)
      : '';
    const resolvedRealAddress =
      formattedDefaultAddress && formattedDefaultAddress !== 'Chưa cập nhật'
        ? formattedDefaultAddress
        : '';

    const safeUserProfile = {
      id: syncedProfile?.id ?? syncedMe?.id ?? resolvedId,
      userId: syncedProfile?.id ?? syncedMe?.userId ?? resolvedId,
      email: syncedProfile?.email || syncedMe?.email || loginData.email,
      fullName: syncedProfile?.fullName || syncedMe?.fullName || loginData.fullName,
      phone: isMockSession
        ? loginData.phone || '0912345678'
        : syncedProfile?.phone ?? syncedMe?.phone ?? loginData.phone ?? '',
      address: isMockSession
        ? loginData.address || '123 Đường Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội'
        : resolvedRealAddress,
      defaultAddress: resolvedDefaultAddress,
      avatarUrl: syncedProfile?.avatarUrl || loginData.avatarUrl || loginData.avatar || '',
      avatar: syncedProfile?.avatarUrl || loginData.avatar || loginData.avatarUrl || '',
      avatarRemoved: Boolean(loginData.avatarRemoved),
      roles: normalizeRoles(
        syncedProfile?.roles || syncedMe?.roles || loginData.roles,
        loginData.authorities
      )
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
   * Cập nhật thông tin profile ở Frontend (State + localStorage Mock Data)
   */
  const updateUser = useCallback((updatedData) => {
    setCurrentUser((prevUser) => {
      const newUser = { ...(prevUser || {}), ...updatedData };
      setUser(newUser);
      if (isMockSessionToken(token) && authService.updateMockUser) {
        authService.updateMockUser(newUser);
      }
      return newUser;
    });
  }, [token]);

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
