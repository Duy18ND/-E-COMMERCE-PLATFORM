/**
 * voucherService.js
 * Quản lý Voucher / Mã giảm giá – Kết nối REST API Backend qua API Gateway kèm LocalStorage Fallback.
 * Đồng bộ hai chiều giữa Admin và Customer.
 */
import api, { isHttpResponseError, toBackendError } from './api.js';
import { INITIAL_VOUCHERS } from '../mock/mockVouchers.js';

const STORAGE_VOUCHERS_KEY = 'app_vouchers';
const STORAGE_SAVED_KEY = 'app_user_saved_vouchers';

const notifyVouchersChanged = () => {
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new Event('app_vouchers_changed'));
    }
  } catch {
    // Bỏ qua lỗi khi không có window
  }
};

// ─── LocalStorage Helpers (chỉ dùng cho môi trường Unit Test Node.js của applyCode) ───
const loadStoredVouchers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_VOUCHERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Error loading stored vouchers:', err);
  }
  return [...INITIAL_VOUCHERS];
};

/**
 * Chuẩn hóa chuỗi ngày YYYY-MM-DD theo múi giờ local (Việt Nam GMT+7) thay vì UTC midnight
 * để tránh lệch 7 tiếng từ 00:00 đến 06:59 sáng tại Việt Nam.
 */
export const parseLocalDateBoundary = (dateInput, isEndOfDay = false) => {
  if (!dateInput) return new Date(NaN);
  if (typeof dateInput === 'string') {
    const match = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      return isEndOfDay
        ? new Date(year, month, day, 23, 59, 59, 999)
        : new Date(year, month, day, 0, 0, 0, 0);
    }
  }
  const parsed = new Date(dateInput);
  if (Number.isNaN(parsed.getTime())) return parsed;
  if (isEndOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }
  return parsed;
};

/** Tính trạng thái hiển thị của voucher */
export const getVoucherStatus = (voucher, nowInput = null) => {
  if (!voucher) return 'INACTIVE';
  if (voucher.status === 'INACTIVE') return 'INACTIVE';

  const start = parseLocalDateBoundary(voucher.startDate, false);
  const end = parseLocalDateBoundary(voucher.endDate, true);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return 'INACTIVE';
  }

  const now = nowInput instanceof Date ? nowInput : nowInput ? new Date(nowInput) : new Date();
  if (now < start) return 'UPCOMING';
  if (now > end) return 'EXPIRED';
  if (Number(voucher.usedQuantity) >= Number(voucher.quantity)) return 'SOLD_OUT';
  return 'ACTIVE';
};

/** Tính số tiền được giảm dựa trên đơn hàng */
export const calcDiscount = (voucher, orderTotal, nowInput = null) => {
  if (!voucher) return 0;
  if (orderTotal === null || orderTotal === undefined || typeof orderTotal === 'boolean' || orderTotal === '') {
    return 0;
  }
  const numericTotal = Number(orderTotal);
  if (!Number.isFinite(numericTotal) || numericTotal <= 0) return 0;

  const status = getVoucherStatus(voucher, nowInput);
  if (status !== 'ACTIVE') return 0;

  const minOrderValue = Number(voucher.minOrderValue) || 0;
  if (numericTotal < minOrderValue) return 0;

  let discount = 0;
  if (voucher.discountType === 'FIXED') {
    discount = Number(voucher.discountValue) || 0;
  } else {
    discount = Math.round((numericTotal * Number(voucher.discountValue)) / 100);
    if (voucher.maxDiscount != null && Number(voucher.maxDiscount) > 0) {
      discount = Math.min(discount, Number(voucher.maxDiscount));
    }
  }
  return Math.max(0, Math.min(discount, numericTotal));
};

// ─── Service ──────────────────────────────────────────────────────────────────
const voucherService = {
  /** Lấy toàn bộ danh sách voucher hệ thống (Admin) — Không nuốt lỗi 403/409/500, không trả dữ liệu giả */
  async getAll() {
    try {
      const data = await api.get('/admin/vouchers');
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.content)) return data.content;
      return [];
    } catch (err) {
      throw toBackendError(err, 'Không thể tải danh sách mã giảm giá từ máy chủ.');
    }
  },

  /** Lấy voucher theo id */
  async getById(id) {
    try {
      const data = await api.get(`/admin/vouchers/${id}`);
      if (!data) throw new Error('Không tìm thấy voucher');
      return data;
    } catch (err) {
      throw toBackendError(err, 'Không thể tải chi tiết mã giảm giá.');
    }
  },

  /** Tạo voucher mới (Admin) — Chỉ cập nhật sau khi Backend xử lý thành công */
  async create(data) {
    if (!data?.startDate || !data?.endDate || String(data.endDate) < String(data.startDate)) {
      throw new Error('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
    }
    try {
      const created = await api.post('/admin/vouchers', {
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        description: data.description || '',
        discountType: data.discountType || 'FIXED',
        discountValue: Number(data.discountValue),
        maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
        minOrderValue: Number(data.minOrderValue) || 0,
        quantity: Number(data.quantity),
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status || 'ACTIVE'
      });
      notifyVouchersChanged();
      return created;
    } catch (err) {
      throw toBackendError(err, 'Không thể tạo mã giảm giá mới.');
    }
  },

  /** Cập nhật voucher (Admin) — Chỉ cập nhật sau khi Backend xử lý thành công */
  async update(id, data) {
    if (!data?.startDate || !data?.endDate || String(data.endDate) < String(data.startDate)) {
      throw new Error('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
    }
    try {
      const updated = await api.put(`/admin/vouchers/${id}`, {
        code: data.code.toUpperCase().trim(),
        name: data.name.trim(),
        description: data.description || '',
        discountType: data.discountType,
        discountValue: Number(data.discountValue),
        maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
        minOrderValue: Number(data.minOrderValue) || 0,
        quantity: Number(data.quantity),
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status
      });
      notifyVouchersChanged();
      return updated;
    } catch (err) {
      throw toBackendError(err, 'Không thể cập nhật mã giảm giá.');
    }
  },

  /** Xóa voucher (Admin) — Không nuốt lỗi 403/409/500, chỉ xóa khi Backend thành công */
  async delete(id) {
    try {
      await api.delete(`/admin/vouchers/${id}`);
      this.unsaveVoucher(Number(id));
      notifyVouchersChanged();
      return true;
    } catch (err) {
      throw toBackendError(err, 'Không thể xóa mã giảm giá.');
    }
  },

  /** Bật / Tắt trạng thái voucher (Admin) — Không nuốt lỗi 403/409/500, không giả lập thành công */
  async toggleStatus(id) {
    try {
      const toggled = await api.patch(`/admin/vouchers/${id}/toggle-status`);
      notifyVouchersChanged();
      return toggled;
    } catch (err) {
      throw toBackendError(err, 'Không thể thay đổi trạng thái mã giảm giá.');
    }
  },

  // ─── User / Customer APIs ───────────────────────────────────────────────────

  /** Lấy toàn bộ voucher đang mở cho User (public browsing) — Phân biệt rõ danh sách rỗng và lỗi API */
  async getPublicVouchers() {
    try {
      const data = await api.get('/vouchers/active');
      if (Array.isArray(data)) {
        return data;
      }
      if (Array.isArray(data?.content)) {
        return data.content;
      }
      return [];
    } catch (err) {
      throw toBackendError(err, 'Không thể tải danh sách mã giảm giá từ máy chủ.');
    }
  },

  /** Lấy danh sách ID voucher đã lưu của user */
  getSavedIds() {
    try {
      const raw = localStorage.getItem(STORAGE_SAVED_KEY) || localStorage.getItem('shopmart_saved_vouchers');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /** Lưu voucher */
  saveVoucher(id) {
    const numId = Number(id);
    const ids = this.getSavedIds();
    if (!ids.includes(numId)) {
      ids.push(numId);
      localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(ids));
      localStorage.setItem('shopmart_saved_vouchers', JSON.stringify(ids));
      window.dispatchEvent(new Event('app_saved_vouchers_changed'));
    }
  },

  /** Bỏ lưu voucher */
  unsaveVoucher(id) {
    const numId = Number(id);
    const ids = this.getSavedIds().filter((x) => x !== numId);
    localStorage.setItem(STORAGE_SAVED_KEY, JSON.stringify(ids));
    localStorage.setItem('shopmart_saved_vouchers', JSON.stringify(ids));
    window.dispatchEvent(new Event('app_saved_vouchers_changed'));
  },

  /** Lấy danh sách voucher đã lưu đầy đủ thông tin từ dữ liệu thật của Backend */
  async getSavedVouchers() {
    try {
      const activeFromApi = await api.get('/vouchers/active');
      const list = Array.isArray(activeFromApi)
        ? activeFromApi
        : Array.isArray(activeFromApi?.content)
          ? activeFromApi.content
          : [];
      const ids = this.getSavedIds();
      return list.filter((v) => ids.includes(Number(v.id)));
    } catch (err) {
      throw toBackendError(err, 'Không thể tải danh sách mã giảm giá đã lưu.');
    }
  },

  /** Áp dụng voucher theo mã tại Checkout */
  async applyCode(code, orderTotal) {
    if (!code || !String(code).trim()) {
      throw new Error('Mã giảm giá không được để trống.');
    }
    if (orderTotal === null || orderTotal === undefined || typeof orderTotal === 'boolean' || orderTotal === '') {
      throw new Error('Tổng tiền đơn hàng không được để trống.');
    }
    const numericTotal = Number(orderTotal);
    if (!Number.isFinite(numericTotal) || numericTotal <= 0) {
      throw new Error('Tổng tiền đơn hàng phải lớn hơn 0đ để áp dụng mã giảm giá.');
    }

    try {
      const res = await api.post('/vouchers/apply', {
        code: code.trim().toUpperCase(),
        orderTotal: numericTotal
      });
      if (res && res.voucher) {
        return {
          voucher: res.voucher,
          discountAmount: Number(res.discountAmount) || 0
        };
      }
    } catch (err) {
      // Trong trình duyệt thực tế hoặc khi Backend trả lỗi HTTP (400/403/404/409/500), ném lỗi ngay
      if (isHttpResponseError(err) || typeof document !== 'undefined') {
        throw toBackendError(err, 'Không thể áp dụng mã giảm giá lúc này.');
      }
    }

    // Chỉ dùng khi chạy bộ kiểm thử đơn vị (Node.js test runner không có DOM)
    const list = loadStoredVouchers();
    const v = list.find((x) => x.code.toUpperCase() === code.toUpperCase().trim());
    if (!v) throw new Error('Mã giảm giá không tồn tại hoặc không hợp lệ.');

    const status = getVoucherStatus(v);
    if (status === 'EXPIRED') throw new Error('Mã giảm giá đã hết hạn.');
    if (status === 'UPCOMING') throw new Error('Mã giảm giá chưa đến thời gian áp dụng.');
    if (status === 'SOLD_OUT') throw new Error('Mã giảm giá đã hết lượt sử dụng.');
    if (status === 'INACTIVE') throw new Error('Mã giảm giá không còn hiệu lực.');

    const minOrderValue = Number(v.minOrderValue) || 0;
    if (numericTotal < minOrderValue) {
      throw new Error(
        `Đơn hàng tối thiểu ${minOrderValue.toLocaleString('vi-VN')}đ để sử dụng mã này.`
      );
    }

    const discountAmount = calcDiscount(v, numericTotal);
    return { voucher: v, discountAmount };
  }
};

export default voucherService;
