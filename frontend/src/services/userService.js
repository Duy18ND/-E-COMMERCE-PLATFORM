/**
 * userService.js
 * Quản lý Tài khoản Người dùng (Admin User Management) – LocalStorage sync + Mock Data layer.
 * Đồng bộ trạng thái khóa/mở tài khoản (ACTIVE / LOCKED) trên Frontend.
 */
import { MOCK_USERS } from '../mock/mockUsers';
import orderService from './orderService';

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
  const resolvedStatus = u.status === 'LOCKED' ? 'LOCKED' : 'ACTIVE';

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
 * để đảm bảo có đầy đủ dữ liệu mẫu phong phú mà không làm mất tài khoản mới đăng ký hoặc trạng thái đã thay đổi.
 */
export const loadStoredUsers = () => {
  try {
    const raw = localStorage.getItem(MOCK_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Hợp nhất các tài khoản mẫu trong MOCK_USERS nếu chưa có trong localStorage
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
            // Bổ sung các trường mới (avatar, createdAt, name, role, status) cho bản ghi cũ nếu thiếu
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
  /** Lấy toàn bộ danh sách tài khoản */
  async getAllUsers() {
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

  /** Tìm danh sách đơn hàng của một tài khoản từ dữ liệu Mock Order hiện tại */
  async getUserOrders(user) {
    if (!user) return [];
    try {
      const allOrders = await orderService.getAllOrders();
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
   * - Chỉ thay đổi trường status của Mock User, không xóa dữ liệu tài khoản.
   * - Không cho phép khóa tài khoản ADMIN hoặc tự khóa chính mình.
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

