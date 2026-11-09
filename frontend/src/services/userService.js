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
  }
};

export default userService;
