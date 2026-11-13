import api from './api.js';
import { getUser, setUser } from '../utils/auth.js';

/**
 * Vietnamese phone number validation regex:
 * Starts with 0 or +84, followed by 3, 5, 7, 8, 9, and exactly 8 digits.
 */
export const VN_PHONE_REGEX = /^(0|\+84)[35789][0-9]{8}$/;

export const isValidVietnamesePhone = (phone) => {
  if (!phone) return true; // Optional field in some forms
  return VN_PHONE_REGEX.test(phone.trim());
};

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';

/**
 * Chuẩn hóa giá trị thời gian từ Backend (chuỗi ISO hoặc mảng LocalDateTime [yyyy, MM, dd, HH, mm, ss])
 */
export const normalizeUserDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value;
    const d = new Date(
      Number(year),
      Math.max(0, Number(month || 1) - 1),
      Number(day || 1),
      Number(hour || 0),
      Number(minute || 0),
      Number(second || 0),
      Math.floor(Number(nano || 0) / 1e6)
    );
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'number') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  return null;
};

/**
 * Định dạng đối tượng AddressResponse từ Backend thành chuỗi địa chỉ hiển thị
 */
export const formatCustomerAddress = (addr) => {
  if (!addr) return 'Chưa cập nhật';
  if (typeof addr === 'string') {
    return addr.trim() || 'Chưa cập nhật';
  }
  if (addr.fullAddress && String(addr.fullAddress).trim()) {
    return String(addr.fullAddress).trim();
  }
  const streetPart = addr.addressLine || addr.street || addr.detailAddress || '';
  const parts = [streetPart, addr.ward, addr.district, addr.city]
    .map((part) => (part ? String(part).trim() : ''))
    .filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'Chưa cập nhật';
};

/**
 * Chuẩn hóa đối tượng user/customer từ Backend DTO (UserSummaryResponse / UserProfileResponse)
 */
export const normalizeUser = (u) => {
  if (!u || typeof u !== 'object') return null;

  const rawRoles = Array.isArray(u.roles)
    ? u.roles
    : u.roles instanceof Set
      ? Array.from(u.roles)
      : [];

  const normalizedRoleList = rawRoles
    .map((r) => {
      if (typeof r === 'string') return r.trim().toUpperCase();
      if (r && typeof r.name === 'string') return r.name.trim().toUpperCase();
      if (r && typeof r.authority === 'string') return r.authority.trim().toUpperCase();
      return '';
    })
    .filter(Boolean);

  const uRoleUpper = typeof u.role === 'string' ? u.role.trim().toUpperCase() : '';
  const isRoleAdmin =
    uRoleUpper === 'ADMIN' ||
    uRoleUpper === 'ROLE_ADMIN' ||
    normalizedRoleList.some((r) => r === 'ROLE_ADMIN' || r === 'ADMIN');

  const resolvedRole = isRoleAdmin ? 'ADMIN' : 'USER';
  const resolvedRoles =
    normalizedRoleList.length > 0
      ? normalizedRoleList.map((r) => (r.startsWith('ROLE_') ? r : `ROLE_${r}`))
      : isRoleAdmin
        ? ['ROLE_ADMIN']
        : ['ROLE_USER'];

  const resolvedName = String(u.fullName ?? u.name ?? '').trim() || 'Khách hàng';
  const rawStatusUpper = String(u.status || '').trim().toUpperCase();
  const resolvedStatus =
    rawStatusUpper === 'LOCKED' || rawStatusUpper === 'BLOCKED' ? 'LOCKED' : 'ACTIVE';

  const rawAddresses = Array.isArray(u.addresses) ? u.addresses : [];
  const primaryAddressObj =
    u.defaultAddress ||
    (u.address && typeof u.address === 'object' ? u.address : null) ||
    rawAddresses.find((a) => a && a.isDefault) ||
    rawAddresses[0] ||
    null;

  const resolvedAddress =
    primaryAddressObj
      ? formatCustomerAddress(primaryAddressObj)
      : typeof u.address === 'string' && u.address.trim() && u.address !== 'Chưa cập nhật'
        ? u.address.trim()
        : 'Chưa cập nhật';

  return {
    ...u,
    id: u.id ?? u.userId ?? null,
    name: resolvedName,
    fullName: resolvedName,
    email: u.email ? String(u.email).trim() : '',
    avatar: u.avatar || u.avatarUrl || DEFAULT_AVATAR,
    phone: u.phone && String(u.phone).trim() ? String(u.phone).trim() : 'Chưa cập nhật',
    address: resolvedAddress,
    defaultAddress: primaryAddressObj,
    addresses: rawAddresses,
    role: resolvedRole,
    roles: resolvedRoles,
    status: resolvedStatus,
    rawStatus: rawStatusUpper || (resolvedStatus === 'LOCKED' ? 'BLOCKED' : 'ACTIVE'),
    createdAt: normalizeUserDate(u.createdAt),
    updatedAt: normalizeUserDate(u.updatedAt)
  };
};

// Giữ alias tương thích ngược nếu có module khác import
export const normalizeMockUser = normalizeUser;

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

  /**
   * [Task ECOM-145 / ECOM-325]
   * Lấy danh sách khách hàng có phân trang, tìm kiếm và lọc trạng thái từ Backend
   * (GET /api/v1/admin/customers)
   */
  async getCustomers(params = {}) {
    const safePage = Number.isFinite(Number(params.page)) ? Math.max(0, Number(params.page)) : 0;
    const safeSize = Number.isFinite(Number(params.size))
      ? Math.min(Math.max(1, Number(params.size)), 100)
      : 100;

    const queryParams = {
      page: safePage,
      size: safeSize,
      sortBy: params.sortBy || 'id',
      sortDir: params.sortDir || 'desc'
    };

    if (params.keyword !== undefined && params.keyword !== null) {
      const trimmedKeyword = String(params.keyword).trim();
      if (trimmedKeyword) {
        queryParams.keyword = trimmedKeyword;
      }
    }

    if (params.status && params.status !== 'ALL') {
      const upperStatus = String(params.status).trim().toUpperCase();
      queryParams.status =
        upperStatus === 'LOCKED' || upperStatus === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE';
    }

    const response = await api.get('/admin/customers', { params: queryParams });
    const rawList = Array.isArray(response?.content)
      ? response.content
      : Array.isArray(response)
        ? response
        : [];

    const seenIds = new Set();
    const normalizedList = [];
    for (const item of rawList) {
      const normalized = normalizeUser(item);
      if (normalized && normalized.id != null) {
        const key = String(normalized.id);
        if (!seenIds.has(key)) {
          seenIds.add(key);
          normalizedList.push(normalized);
        }
      }
    }

    const resolvedPage = Number(response?.pageNumber ?? response?.page ?? queryParams.page);
    const resolvedSize = Number(response?.pageSize ?? response?.size ?? queryParams.size);
    const resolvedTotalElements = Number(response?.totalElements ?? normalizedList.length);
    const resolvedTotalPages = Number(
      response?.totalPages ?? (resolvedTotalElements > 0 ? Math.ceil(resolvedTotalElements / resolvedSize) : 0)
    );

    return {
      content: normalizedList,
      totalElements: Number.isFinite(resolvedTotalElements) ? resolvedTotalElements : normalizedList.length,
      totalPages: Number.isFinite(resolvedTotalPages) ? resolvedTotalPages : 1,
      pageNumber: Number.isFinite(resolvedPage) ? resolvedPage : queryParams.page,
      pageSize: Number.isFinite(resolvedSize) ? resolvedSize : queryParams.size,
      page: Number.isFinite(resolvedPage) ? resolvedPage : queryParams.page,
      size: Number.isFinite(resolvedSize) ? resolvedSize : queryParams.size,
      last: Boolean(response?.last ?? true)
    };
  },

  /**
   * Lấy danh sách tài khoản hệ thống từ API thật của Backend:
   * - Gọi GET /api/v1/admin/customers (kèm keyword, status, sortBy, sortDir) để lấy danh sách khách hàng
   * - Kết hợp GET /api/v1/admin/users để bổ sung các tài khoản ADMIN phục vụ bộ lọc vai trò
   * Tuyệt đối không sử dụng localStorage hay MOCK_USERS.
   */
  async getAllUsers(params = {}) {
    const [customersResult, usersResult] = await Promise.allSettled([
      this.getCustomers({ page: 0, size: 100, ...params }),
      api.get('/admin/users', { params: { page: 0, size: 100, sortBy: 'id', sortDir: 'desc' } })
    ]);

    // Nếu endpoint chính GET /api/v1/admin/customers bị lỗi (400/401/403/500/Network), phải báo lỗi ngay
    if (customersResult.status === 'rejected') {
      throw (
        customersResult.reason ||
        new Error('Không thể tải danh sách khách hàng từ máy chủ.')
      );
    }

    const mergedMap = new Map();

    if (Array.isArray(customersResult.value?.content)) {
      for (const customer of customersResult.value.content) {
        if (customer && customer.id != null) {
          mergedMap.set(String(customer.id), customer);
        }
      }
    }

    // Bổ sung các tài khoản ROLE_ADMIN từ /admin/users (nếu phản hồi thành công) và khớp bộ lọc hiện tại
    if (usersResult.status === 'fulfilled') {
      const rawUsers = Array.isArray(usersResult.value?.content)
        ? usersResult.value.content
        : Array.isArray(usersResult.value)
          ? usersResult.value
          : [];

      const filterKeyword = params.keyword ? String(params.keyword).trim().toLowerCase() : '';
      const filterStatus =
        params.status && params.status !== 'ALL'
          ? String(params.status).trim().toUpperCase() === 'BLOCKED' ||
            String(params.status).trim().toUpperCase() === 'LOCKED'
            ? 'LOCKED'
            : 'ACTIVE'
          : 'ALL';

      for (const rawUser of rawUsers) {
        const normalized = normalizeUser(rawUser);
        if (!normalized || normalized.id == null) continue;
        // Chỉ bổ sung tài khoản ADMIN để không ghi đè kết quả lọc khách hàng (ROLE_USER) của /admin/customers
        if (normalized.role !== 'ADMIN') continue;
        if (filterStatus !== 'ALL' && normalized.status !== filterStatus) continue;
        if (filterKeyword) {
          const matchAdminKeyword =
            String(normalized.name || '').toLowerCase().includes(filterKeyword) ||
            String(normalized.email || '').toLowerCase().includes(filterKeyword) ||
            String(normalized.phone || '').toLowerCase().includes(filterKeyword);
          if (!matchAdminKeyword) continue;
        }
        if (!mergedMap.has(String(normalized.id))) {
          mergedMap.set(String(normalized.id), normalized);
        }
      }
    }

    return Array.from(mergedMap.values()).sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
  },

  /**
   * [Task ECOM-145]
   * Xem chi tiết hồ sơ khách hàng kèm địa chỉ thực tế và lịch sử mua hàng từ Backend:
   * - GET /api/v1/admin/customers/{id}
   * - GET /api/v1/admin/orders/customer/{userId}
   */
  async getUserById(id) {
    if (id == null || id === '') {
      throw new Error('Mã khách hàng không hợp lệ.');
    }

    const [profileRes, userOrders] = await Promise.all([
      api.get(`/admin/customers/${id}`),
      this.getUserOrders(id)
    ]);

    const normalizedProfile = normalizeUser(profileRes);
    if (!normalizedProfile) {
      throw new Error(`Không tìm thấy thông tin khách hàng #${id}`);
    }

    // Đồng bộ đúng quy tắc REVENUE_STATUSES của Backend OrderServiceImpl:
    // Chỉ cộng các đơn PAID, CONFIRMED, PROCESSING, SHIPPING, DELIVERED (không cộng đơn PENDING, CANCELLED, FAILED, REFUNDED)
    const VALID_REVENUE_STATUSES = new Set([
      'PAID',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPING',
      'DELIVERED'
    ]);
    const totalSpent = userOrders
      .filter((o) => VALID_REVENUE_STATUSES.has(String(o.status || '').toUpperCase()))
      .reduce((sum, o) => {
        const val = Number(o.totalAmount ?? o.finalAmount ?? 0);
        return sum + (Number.isFinite(val) ? val : 0);
      }, 0);

    const completedOrderCount = userOrders.filter(
      (o) => String(o.status || '').toUpperCase() === 'DELIVERED'
    ).length;

    const cancelledOrderCount = userOrders.filter(
      (o) => String(o.status || '').toUpperCase() === 'CANCELLED'
    ).length;

    return {
      ...normalizedProfile,
      orders: userOrders,
      orderCount: userOrders.length,
      completedOrderCount,
      cancelledOrderCount,
      totalSpent
    };
  },

  /**
   * [Task ECOM-143 / ECOM-145]
   * Lấy danh sách lịch sử đơn hàng thực tế của một khách hàng từ Backend:
   * GET /api/v1/admin/orders/customer/{userId}
   */
  async getUserOrders(userOrId) {
    const userId =
      userOrId && typeof userOrId === 'object' ? userOrId.id : userOrId;
    if (userId == null || userId === '') return [];

    const response = await api.get(`/admin/orders/customer/${userId}`);
    const rawOrders = Array.isArray(response?.content)
      ? response.content
      : Array.isArray(response)
        ? response
        : [];

    return [...rawOrders].sort((a, b) => {
      const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  },

  /**
   * [Task ECOM-145]
   * Đếm tổng số lượng khách hàng từ Backend (GET /api/v1/admin/customers/count)
   */
  async countCustomers() {
    const count = await api.get('/admin/customers/count');
    const parsed = Number(count ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  },

  /**
   * [Task ECOM-145]
   * Cập nhật trạng thái tài khoản khách hàng (PUT /api/v1/admin/customers/{id}/status)
   */
  async updateUserStatus(id, nextStatus) {
    if (id == null || id === '') {
      throw new Error('Mã khách hàng không hợp lệ.');
    }

    const upperNext = String(nextStatus || '').trim().toUpperCase();
    const resolvedFrontendStatus =
      upperNext === 'LOCKED' || upperNext === 'BLOCKED' ? 'LOCKED' : 'ACTIVE';
    const backendStatus = resolvedFrontendStatus === 'LOCKED' ? 'BLOCKED' : 'ACTIVE';

    const response = await api.put(`/admin/customers/${id}/status`, {
      status: backendStatus
    });

    const normalized = normalizeUser(response);
    return (
      normalized || {
        id,
        status: resolvedFrontendStatus,
        rawStatus: backendStatus
      }
    );
  },

  /** Khóa tài khoản khách hàng (chuyển status -> BLOCKED / LOCKED) */
  async lockUser(id) {
    return this.updateUserStatus(id, 'LOCKED');
  },

  /** Mở khóa tài khoản khách hàng (chuyển status -> ACTIVE) */
  async unlockUser(id) {
    return this.updateUserStatus(id, 'ACTIVE');
  }
};

export default userService;
