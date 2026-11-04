import api from './api';
import { MOCK_USERS } from '../mock/mockUsers';
import { getToken, getRefreshToken, getUser, parseJwtPayload } from '../utils/auth';

// Cấu hình chế độ chỉ dùng Mock Authentication (mặc định false để ưu tiên gọi Backend thật qua API Gateway)
export const USE_MOCK_AUTH =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_USE_MOCK_AUTH === 'true';

const MOCK_USERS_STORAGE_KEY = 'shopmart_mock_users';

const loadMockUsers = () => {
  try {
    const saved = localStorage.getItem(MOCK_USERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // Bỏ qua lỗi parse
  }
  return [...MOCK_USERS];
};

const saveMockUsers = (users) => {
  try {
    localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    // Bỏ qua lỗi lưu trữ
  }
};

let mockUsersList = loadMockUsers();

/**
 * Chuẩn hóa danh sách vai trò (roles) từ Backend (AuthResponse hoặc UserPrincipal authorities)
 */
export const normalizeRoles = (rawRoles, rawAuthorities) => {
  const source =
    Array.isArray(rawRoles) && rawRoles.length > 0
      ? rawRoles
      : Array.isArray(rawAuthorities) && rawAuthorities.length > 0
      ? rawAuthorities
      : [];

  const normalized = source
    .map((item) => {
      if (typeof item === 'string') return item.trim().toUpperCase();
      if (item && typeof item.authority === 'string') return item.authority.trim().toUpperCase();
      if (item && typeof item.name === 'string') return item.name.trim().toUpperCase();
      return '';
    })
    .filter(Boolean)
    .map((role) => (role.startsWith('ROLE_') ? role : `ROLE_${role}`));

  return normalized.length > 0 ? Array.from(new Set(normalized)) : ['ROLE_USER'];
};

/**
 * Chuẩn hóa đối tượng phản hồi đăng nhập/đăng ký để tương thích đồng nhất giữa Backend AuthResponse và Frontend
 */
export const normalizeAuthPayload = (data, fallbackInfo = {}) => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const resolvedId = data.userId ?? data.id ?? fallbackInfo.userId ?? fallbackInfo.id ?? null;
  const resolvedEmail = data.email || data.username || fallbackInfo.email || '';
  const roles = normalizeRoles(data.roles || fallbackInfo.roles, data.authorities);

  // Tìm dữ liệu mock tương ứng để bổ sung phone, address, avatar nếu API không trả về
  const mockMatch =
    loadMockUsers().find(
      (u) =>
        (resolvedEmail && String(u.email || '').toLowerCase() === String(resolvedEmail).toLowerCase()) ||
        (resolvedId !== null && String(u.id) === String(resolvedId))
    ) || null;

  const avatarRemoved = Boolean(data.avatarRemoved ?? fallbackInfo.avatarRemoved ?? false);
  const resolvedAvatar = avatarRemoved
    ? ''
    : data.avatarUrl ??
      data.avatar ??
      fallbackInfo.avatarUrl ??
      fallbackInfo.avatar ??
      mockMatch?.avatarUrl ??
      mockMatch?.avatar ??
      '';

  return {
    accessToken: data.accessToken || fallbackInfo.accessToken || null,
    refreshToken: data.refreshToken || fallbackInfo.refreshToken || null,
    tokenType: data.tokenType || 'Bearer',
    expiresIn: data.expiresIn || 86400000,
    id: resolvedId,
    userId: resolvedId,
    email: resolvedEmail,
    fullName: data.fullName || fallbackInfo.fullName || mockMatch?.fullName || 'Người dùng',
    phone: data.phone || fallbackInfo.phone || mockMatch?.phone || '0912345678',
    address:
      data.address ||
      fallbackInfo.address ||
      mockMatch?.address ||
      '123 Đường Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội',
    avatarUrl: resolvedAvatar,
    avatar: resolvedAvatar,
    avatarRemoved,
    roles
  };
};

/**
 * Kiểm tra xem lỗi có phải lỗi mất kết nối tới máy chủ Backend hay không (để hỗ trợ fallback khi demo độc lập)
 */
const isBackendUnreachable = (err) => {
  return !err?.response && (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network Error') || err?.message?.includes('ECONNREFUSED') || !err?.status);
};

export const authService = {
  /**
   * Đăng nhập: Gọi POST /api/v1/auth/login
   * Request Body: { email, password }
   * Response Body (Backend AuthResponse): { accessToken, refreshToken, tokenType, expiresIn, userId, email, fullName, roles }
   */
  login: async ({ email, password }) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!USE_MOCK_AUTH) {
      try {
        const responseData = await api.post('/auth/login', {
          email: cleanEmail,
          password
        });
        return normalizeAuthPayload(responseData, { email: cleanEmail });
      } catch (err) {
        // Nếu Backend đang chạy và trả về lỗi xác thực (400, 401, 403...), ném đúng lỗi của Backend
        if (!isBackendUnreachable(err)) {
          throw err;
        }
        console.warn('Backend Auth Service chưa bật, chuyển sang xác thực trên dữ liệu local:', err.message);
      }
    }

    mockUsersList = loadMockUsers();
    const user = mockUsersList.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user || user.password !== password) {
      throw new Error('Email hoặc mật khẩu không chính xác.');
    }

    return normalizeAuthPayload({
      accessToken: `mock-auth-token-${user.id}-${Date.now()}`,
      refreshToken: `mock-refresh-token-${user.id}-${Date.now()}`,
      userId: user.id,
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || '0912345678',
      address: user.address || '123 Đường Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội',
      avatarUrl: user.avatarUrl || user.avatar || '',
      avatar: user.avatar || user.avatarUrl || '',
      roles: Array.isArray(user.roles) ? [...user.roles] : ['ROLE_USER']
    });
  },

  /**
   * Đăng ký tài khoản mới: Gọi POST /api/v1/auth/register
   * Request Body (Backend RegisterRequest): { email, password, fullName, phone }
   * Response Body (Backend AuthResponse): { accessToken, refreshToken, tokenType, expiresIn, userId, email, fullName, roles }
   */
  register: async ({ email, password, fullName, phone, address }) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanFullName = (fullName || '').trim();
    const cleanPhone = (phone || '').replace(/\s+/g, '');
    const cleanAddress = (address || '').trim() || '123 Đường Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội';

    if (!USE_MOCK_AUTH) {
      try {
        const registerPayload = {
          email: cleanEmail,
          password,
          fullName: cleanFullName,
          ...(cleanPhone ? { phone: cleanPhone } : {})
        };
        const responseData = await api.post('/auth/register', registerPayload);

        // Đồng bộ lưu phone & address vào local mock users để hiển thị đầy đủ trên giao diện FE
        mockUsersList = loadMockUsers();
        if (!mockUsersList.some((u) => u.email.toLowerCase() === cleanEmail)) {
          mockUsersList.push({
            id: responseData?.userId ?? responseData?.id ?? Date.now(),
            email: cleanEmail,
            password,
            fullName: cleanFullName,
            name: cleanFullName,
            phone: cleanPhone || '0912345678',
            address: cleanAddress,
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
            avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
            role: 'USER',
            roles: ['ROLE_USER'],
            status: 'ACTIVE',
            createdAt: new Date().toISOString()
          });
          saveMockUsers(mockUsersList);
        }

        return normalizeAuthPayload(responseData, {
          email: cleanEmail,
          fullName: cleanFullName,
          phone: cleanPhone,
          address: cleanAddress
        });
      } catch (err) {
        // Nếu Backend đang chạy và trả về lỗi (400 Validation, 409 Conflict trùng email...), ném đúng lỗi của Backend
        if (!isBackendUnreachable(err)) {
          throw err;
        }
        console.warn('Backend Auth Service chưa bật, chuyển sang đăng ký trên dữ liệu local:', err.message);
      }
    }

    mockUsersList = loadMockUsers();
    if (mockUsersList.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error(`Email '${cleanEmail}' đã tồn tại trong hệ thống`);
    }

    const newUser = {
      id: Date.now(),
      email: cleanEmail,
      password,
      fullName: cleanFullName,
      name: cleanFullName,
      phone: cleanPhone || '0912345678',
      address: cleanAddress,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80',
      role: 'USER',
      roles: ['ROLE_USER'],
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };

    mockUsersList.push(newUser);
    saveMockUsers(mockUsersList);

    return normalizeAuthPayload({
      accessToken: `mock-auth-token-${newUser.id}-${Date.now()}`,
      refreshToken: `mock-refresh-token-${newUser.id}-${Date.now()}`,
      userId: newUser.id,
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      phone: newUser.phone,
      address: newUser.address,
      avatarUrl: newUser.avatarUrl,
      avatar: newUser.avatar,
      roles: newUser.roles
    });
  },

  /**
   * Làm mới Access Token: Gọi POST /api/v1/auth/refresh
   */
  refreshToken: async (refreshTokenValue) => {
    const tokenToUse = refreshTokenValue || getRefreshToken();
    if (!tokenToUse) {
      throw new Error('Không tìm thấy Refresh Token');
    }
    if (USE_MOCK_AUTH || tokenToUse.startsWith('mock-')) {
      const saved = getUser();
      return normalizeAuthPayload({
        accessToken: `mock-auth-token-${saved?.id || 1}-${Date.now()}`,
        refreshToken: tokenToUse,
        ...saved
      });
    }
    const responseData = await api.post('/auth/refresh', { refreshToken: tokenToUse });
    return normalizeAuthPayload(responseData, getUser() || {});
  },

  /**
   * Đăng xuất: Gọi POST /api/v1/auth/logout để thu hồi token vào Redis Blacklist
   */
  logout: async () => {
    const token = getToken();
    if (!token || USE_MOCK_AUTH || token.startsWith('mock-')) {
      return { success: true };
    }
    try {
      await api.post('/auth/logout');
    } catch (err) {
      // Ngay cả khi mạng lỗi hoặc token đã hết hạn, vẫn cho phép xóa session ở client
    }
    return { success: true };
  },

  /**
   * Lấy thông tin tài khoản hiện tại: Gọi GET /api/v1/auth/me
   */
  getCurrentUser: async () => {
    const saved = getUser();
    const token = getToken();

    if (!token) {
      throw new Error('Phiên đăng nhập không tồn tại');
    }

    if (!USE_MOCK_AUTH && !token.startsWith('mock-')) {
      try {
        const responseData = await api.get('/auth/me');
        const jwtClaims = parseJwtPayload(token) || {};
        return normalizeAuthPayload(responseData, {
          ...saved,
          userId: jwtClaims.userId ?? saved?.id,
          email: jwtClaims.sub ?? saved?.email,
          fullName: jwtClaims.fullName ?? saved?.fullName,
          roles: jwtClaims.roles ?? saved?.roles
        });
      } catch (err) {
        if (!isBackendUnreachable(err)) {
          throw err;
        }
      }
    }

    if (!saved || !saved.email) {
      const jwtClaims = parseJwtPayload(token);
      if (jwtClaims && jwtClaims.sub) {
        return normalizeAuthPayload({
          userId: jwtClaims.userId || 1,
          email: jwtClaims.sub,
          fullName: jwtClaims.fullName || 'Người dùng',
          roles: jwtClaims.roles || ['ROLE_USER']
        });
      }
      throw new Error('Phiên đăng nhập không tồn tại');
    }

    mockUsersList = loadMockUsers();
    const user = mockUsersList.find(
      (u) => u.email.toLowerCase() === saved.email.toLowerCase()
    );

    if (user) {
      return normalizeAuthPayload(user, saved);
    }

    return normalizeAuthPayload(saved);
  },

  /**
   * Đồng bộ cập nhật thông tin tài khoản ở Frontend Mock Data (localStorage)
   */
  updateMockUser: (updatedProfile = {}) => {
    try {
      const list = loadMockUsers();
      const targetId = updatedProfile.id ?? updatedProfile.userId;
      const targetEmail = String(updatedProfile.email || '').trim().toLowerCase();

      const updatedList = list.map((u) => {
        const isMatch =
          (targetId !== undefined && targetId !== null && String(u.id) === String(targetId)) ||
          (targetEmail && String(u.email || '').toLowerCase() === targetEmail);

        if (!isMatch) return u;

        const nextAvatar = updatedProfile.avatarRemoved
          ? ''
          : updatedProfile.avatarUrl ?? updatedProfile.avatar ?? u.avatarUrl ?? u.avatar;

        return {
          ...u,
          fullName: updatedProfile.fullName ?? u.fullName,
          name: updatedProfile.fullName ?? u.name,
          email: updatedProfile.email ?? u.email,
          phone: updatedProfile.phone ?? u.phone,
          address: updatedProfile.address ?? u.address,
          avatar: nextAvatar,
          avatarUrl: nextAvatar,
          avatarRemoved: Boolean(updatedProfile.avatarRemoved)
        };
      });

      mockUsersList = updatedList;
      saveMockUsers(updatedList);
    } catch (e) {
      // Bỏ qua lỗi lưu trữ
    }
  }
};

export default authService;
