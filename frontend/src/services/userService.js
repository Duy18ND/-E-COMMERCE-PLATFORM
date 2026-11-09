import api from './api.js';
import { getUser, setUser } from '../utils/auth.js';
import { MOCK_USERS } from '../mock/mockUsers';
import orderService from './orderService';

/**
 * Vietnamese phone number validation regex:
 * Starts with 0 or +84, followed by 3, 5, 7, 8, 9, and exactly 8 digits.
 */
export const VN_PHONE_REGEX = /^(0|\+84)[35789][0-9]{8}$/;

export const isValidVietnamesePhone = (phone) => {
  if (!phone) return true; // Optional field in some forms
  return VN_PHONE_REGEX.test(phone.trim());
};

const MOCK_USERS_STORAGE_KEY = 'shopmart_mock_users';

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';

/**
 * Chuẩn hóa đối tượng user để đảm bảo luôn có đủ các trường:
 * id, name, fullName, email, avatar, role ('USER' | 'ADMIN'), roles, status ('ACTIVE' | 'LOCKED'), createdAt, phone, address
 */
export const normalizeMockUser = (u, index = 0) => {
  if (!u || typeof u !== 'object') return null;

  const rawRoles = Array.isArray(u.roles) ? u.roles : [];
  const isRoleAdmin =
    u.role === 'ADMIN' ||
    rawRoles.some((r) => String(r).toUpperCase().includes('ADMIN'));

  const resolvedRole = isRoleAdmin ? 'ADMIN' : 'USER';
  const resolvedRoles = isRoleAdmin ? ['ROLE_ADMIN'] : ['ROLE_USER'];
  const resolvedName = u.name || u.fullName || 'Người dùng ShopMart';
  const resolvedStatus =
    u.status === 'LOCKED' || u.status === 'BLOCKED' ? 'LOCKED' : 'ACTIVE';

  return {
    ...u,
    id: u.id ?? index + 1,
    name: resolvedName,
    fullName: u.fullName || resolvedName,
    email: u.email || '',
    avatar: u.avatar || u.avatarUrl || DEFAULT_AVATAR,
    phone: u.phone || 'Chưa cập nhật',
    address: u.address || 'Chưa cập nhật',
    role: resolvedRole,
    roles: resolvedRoles,
    status: resolvedStatus,
    createdAt: u.createdAt || new Date(Date.now() - index * 86400000 * 3).toISOString()
  };
};

/**
 * Đọc danh sách tài khoản từ localStorage và hợp nhất với MOCK_USERS mặc định
 */
export const loadStoredUsers = () => {
  try {
    const raw = localStorage.getItem(MOCK_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingByEmail = new Map(
          parsed
            .filter((item) => item && item.email)
            .map((item) => [item.email.toLowerCase(), item])
        );

        const merged = [...parsed];
        for (const seedUser of MOCK_USERS) {
          const emailKey = seedUser.email.toLowerCase();
          if (!existingByEmail.has(emailKey)) {
            merged.push(seedUser);
          } else {
            const idx = merged.findIndex(
              (item) => item?.email?.toLowerCase() === emailKey
            );
            if (idx !== -1) {
              merged[idx] = {
                ...seedUser,
                ...merged[idx],
                name: merged[idx].name || merged[idx].fullName || seedUser.name,
                fullName: merged[idx].fullName || merged[idx].name || seedUser.fullName,
                avatar: merged[idx].avatar || merged[idx].avatarUrl || seedUser.avatar,
                role: merged[idx].role || seedUser.role,
                status: merged[idx].status || seedUser.status || 'ACTIVE',
                createdAt: merged[idx].createdAt || seedUser.createdAt
              };
            }
          }
        }

        const normalizedList = merged
          .map((item, idx) => normalizeMockUser(item, idx))
          .filter(Boolean);
        persistUsers(normalizedList);
        return normalizedList;
      }
    }
  } catch (err) {
    console.warn('Không thể đọc danh sách tài khoản từ localStorage:', err);
  }

  const initialList = MOCK_USERS.map((item, idx) => normalizeMockUser(item, idx)).filter(Boolean);
  persistUsers(initialList);
  return initialList;
};

export const persistUsers = (users) => {
  try {
    localStorage.setItem(MOCK_USERS_STORAGE_KEY, JSON.stringify(users));
    window.dispatchEvent(new Event('app_users_changed'));
  } catch (err) {
    console.warn('Không thể lưu danh sách tài khoản vào localStorage:', err);
  }
};

const delay = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

const userService = {
  /**
   * [Task ECOM-128 / ECOM-277 / ECOM-278]
   * Lấy thông tin hồ sơ cá nhân của người dùng hiện tại (GET /api/v1/users/profile)
   */
  getProfile: async () => {
    try {
      const data = await api.get('/users/profile');
      return data;
    } catch (err) {
      // Fallback: Nếu backend offline hoặc dùng mock
      const savedUser = getUser();
      if (savedUser) {
        return {
          id: savedUser.id || savedUser.userId,
          email: savedUser.email || '',
          fullName: savedUser.fullName || '',
          phone: savedUser.phone || '',
          avatarUrl: savedUser.avatarUrl || '',
          roles: savedUser.roles || ['ROLE_USER'],
          defaultAddress: savedUser.address ? { fullAddress: savedUser.address } : null
        };
      }
      throw err;
    }
  },

  /**
   * [Task ECOM-128 / ECOM-274 / ECOM-277 / ECOM-278]
   * Cập nhật thông tin hồ sơ cá nhân và địa chỉ (PUT /api/v1/users/profile)
   */
  updateProfile: async (profileData) => {
    const { fullName, phone, addressLine, city, district, ward, avatarUrl } = profileData;

    if (phone && !isValidVietnamesePhone(phone)) {
      throw new Error('Số điện thoại không đúng định dạng Việt Nam (VD: 0912345678 hoặc +84912345678)');
    }

    if (fullName && fullName.length > 150) {
      throw new Error('Họ tên không được vượt quá 150 ký tự');
    }

    const payload = {
      fullName: fullName ? fullName.trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      addressLine: addressLine ? addressLine.trim() : undefined,
      city: city ? city.trim() : undefined,
      district: district ? district.trim() : undefined,
      ward: ward ? ward.trim() : undefined
    };

    try {
      const data = await api.put('/users/profile', payload);
      // Đồng bộ thông tin mới vào session localStorage
      const savedUser = getUser();
      if (savedUser) {
        const updated = {
          ...savedUser,
          fullName: data?.fullName || fullName || savedUser.fullName,
          phone: data?.phone || phone || savedUser.phone,
          avatarUrl: avatarUrl || savedUser.avatarUrl
        };
        setUser(updated);
      }
      return data;
    } catch (err) {
      // Fallback update local session if backend unreachable
      const savedUser = getUser();
      if (savedUser) {
        const updated = {
          ...savedUser,
          fullName: fullName || savedUser.fullName,
          phone: phone || savedUser.phone,
          avatarUrl: avatarUrl || savedUser.avatarUrl
        };
        setUser(updated);
        return updated;
      }
      throw err;
    }
  },

  /**
   * Lấy danh sách địa chỉ nhận hàng (GET /api/v1/users/me/addresses)
   */
  getAddresses: async () => {
    try {
      return await api.get('/users/me/addresses');
    } catch (err) {
      return [];
    }
  },

  /**
   * Thêm địa chỉ mới vào sổ địa chỉ (POST /api/v1/users/me/addresses)
   */
  addAddress: async (addressData) => {
    return await api.post('/users/me/addresses', addressData);
  },

  /**
   * Cập nhật địa chỉ nhận hàng (PUT /api/v1/users/me/addresses/{id})
   */
  updateAddress: async (id, addressData) => {
    return await api.put(`/users/me/addresses/${id}`, addressData);
  },

  /**
   * Xóa địa chỉ khỏi sổ địa chỉ (DELETE /api/v1/users/me/addresses/{id})
   */
  deleteAddress: async (id) => {
    return await api.delete(`/users/me/addresses/${id}`);
  },

  /** Lấy toàn bộ danh sách tài khoản (ưu tiên gọi API Backend, fallback Mock Data) */
  async getAllUsers() {
    try {
      const response = await api.get('/admin/users', { params: { page: 0, size: 100 } });
      const rawList = Array.isArray(response?.content)
        ? response.content
        : Array.isArray(response)
          ? response
          : [];
      if (rawList.length > 0) {
        const normalized = rawList
          .map((item, idx) => normalizeMockUser(item, idx))
          .filter(Boolean);
        persistUsers(normalized);
        return normalized;
      }
    } catch {
      // Fallback sang localStorage + MOCK_USERS khi Backend chưa chạy
    }
    await delay();
    return loadStoredUsers();
  },

  /** Lấy thông tin chi tiết một tài khoản kèm thống kê đơn hàng từ Mock Orders */
  async getUserById(id) {
    await delay(60);
    const users = loadStoredUsers();
    const found = users.find((u) => String(u.id) === String(id));
    if (!found) {
      throw new Error(`Không tìm thấy tài khoản #${id}`);
    }

    const userOrders = await this.getUserOrders(found);
    const totalSpent = userOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    return {
      ...found,
      orders: userOrders,
      orderCount: userOrders.length,
      totalSpent
    };
  },

  /** Tìm danh sách đơn hàng của một tài khoản từ dữ liệu Order hiện tại */
  async getUserOrders(user) {
    if (!user) return [];
    try {
      const allOrdersRes = await orderService.getAllOrders();
      const allOrders = Array.isArray(allOrdersRes?.content)
        ? allOrdersRes.content
        : Array.isArray(allOrdersRes)
          ? allOrdersRes
          : [];
      if (!Array.isArray(allOrders)) return [];

      const cleanEmail = (user.email || '').trim().toLowerCase();
      const cleanPhone = (user.phone || '').replace(/\s+/g, '');

      return allOrders.filter((order) => {
        const orderEmail = (order.userEmail || '').trim().toLowerCase();
        const orderPhone = (order.receiverPhone || '').replace(/\s+/g, '');
        if (cleanEmail && orderEmail && cleanEmail === orderEmail) return true;
        if (cleanPhone && cleanPhone !== 'Chưacậpnhật' && orderPhone && cleanPhone === orderPhone) {
          return true;
        }
        return false;
      });
    } catch {
      return [];
    }
  },

  /**
   * Cập nhật trạng thái tài khoản (ACTIVE / LOCKED)
   */
  async updateUserStatus(id, nextStatus, currentAdminEmail = '') {
    await delay(100);
    const users = loadStoredUsers();
    const idx = users.findIndex((u) => String(u.id) === String(id));
    if (idx === -1) {
      throw new Error('Không tìm thấy tài khoản cần cập nhật.');
    }

    const target = users[idx];

    if (
      currentAdminEmail &&
      target.email.toLowerCase() === currentAdminEmail.trim().toLowerCase()
    ) {
      throw new Error('Không thể tự khóa hoặc thay đổi trạng thái tài khoản Admin đang đăng nhập.');
    }

    if (target.role === 'ADMIN') {
      throw new Error('Không được phép khóa tài khoản có vai trò Quản trị viên (ADMIN).');
    }

    const resolvedStatus = nextStatus === 'LOCKED' ? 'LOCKED' : 'ACTIVE';

    if (Number.isFinite(Number(id))) {
      try {
        await api.put(`/admin/users/${id}/status`, {
          status: resolvedStatus === 'LOCKED' ? 'BLOCKED' : 'ACTIVE'
        });
      } catch {
        // Fallback offline localStorage
      }
    }

    users[idx] = {
      ...target,
      status: resolvedStatus
    };

    persistUsers(users);
    return { ...users[idx] };
  },

  /** Khóa tài khoản USER (chuyển status -> LOCKED) */
  async lockUser(id, currentAdminEmail = '') {
    return this.updateUserStatus(id, 'LOCKED', currentAdminEmail);
  },

  /** Mở khóa tài khoản USER (chuyển status -> ACTIVE) */
  async unlockUser(id, currentAdminEmail = '') {
    return this.updateUserStatus(id, 'ACTIVE', currentAdminEmail);
  }
};

export default userService;
