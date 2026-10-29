/**
 * voucherService.js
 * Quản lý Voucher / Mã giảm giá – LocalStorage sync + Mock API layer.
 * Đồng bộ hai chiều giữa Admin và Customer.
 */
import { INITIAL_VOUCHERS } from '../mock/mockVouchers';

const STORAGE_VOUCHERS_KEY = 'app_vouchers';
const STORAGE_SAVED_KEY = 'app_user_saved_vouchers';

// ─── LocalStorage Helpers ──────────────────────────────────────────────────────
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
  // Initialize default
  try {
    localStorage.setItem(STORAGE_VOUCHERS_KEY, JSON.stringify(INITIAL_VOUCHERS));
  } catch (err) {
    console.error('Error caching initial vouchers:', err);
  }
  return [...INITIAL_VOUCHERS];
};

const persistVouchers = (list) => {
  try {
    localStorage.setItem(STORAGE_VOUCHERS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('app_vouchers_changed'));
  } catch (err) {
    console.error('Error persisting vouchers:', err);
  }
};

const delay = (ms = 120) => new Promise((res) => setTimeout(res, ms));

/** Tính trạng thái hiển thị của voucher */
export const getVoucherStatus = (voucher) => {
  if (!voucher) return 'INACTIVE';
  const now = new Date();
  const start = new Date(voucher.startDate);
  const end = new Date(voucher.endDate);
  end.setHours(23, 59, 59, 999);

  if (voucher.status === 'INACTIVE') return 'INACTIVE';
  if (now < start) return 'UPCOMING';
  if (now > end) return 'EXPIRED';
  if (voucher.usedQuantity >= voucher.quantity) return 'SOLD_OUT';
  return 'ACTIVE';
};

/** Tính số tiền được giảm dựa trên đơn hàng */
export const calcDiscount = (voucher, orderTotal) => {
  if (!voucher) return 0;
  const status = getVoucherStatus(voucher);
  if (status !== 'ACTIVE') return 0;
  if (orderTotal < voucher.minOrderValue) return 0;

  let discount = 0;
  if (voucher.discountType === 'FIXED') {
    discount = voucher.discountValue;
  } else {
    discount = Math.round((orderTotal * voucher.discountValue) / 100);
    if (voucher.maxDiscount) {
      discount = Math.min(discount, voucher.maxDiscount);
    }
  }
  return Math.min(discount, orderTotal);
};

// ─── Service ──────────────────────────────────────────────────────────────────
const voucherService = {
  /** Lấy toàn bộ danh sách voucher hệ thống (Admin & Customer fallback) */
  async getAll() {
    await delay();
    return loadStoredVouchers();
  },

  /** Lấy voucher theo id */
  async getById(id) {
    await delay();
    const list = loadStoredVouchers();
    const v = list.find((x) => x.id === Number(id));
    if (!v) throw new Error('Không tìm thấy voucher');
    return { ...v };
  },

  /** Tạo voucher mới (Admin) */
  async create(data) {
    await delay();
    const list = loadStoredVouchers();
    const code = data.code.toUpperCase().trim();

    // Check duplicate code
    const exists = list.some((v) => v.code.toUpperCase() === code);
    if (exists) throw new Error(`Mã voucher "${code}" đã tồn tại trong hệ thống.`);

    const nextId = list.length > 0 ? Math.max(...list.map((v) => Number(v.id) || 0)) + 1 : 1;
    const newVoucher = {
      ...data,
      id: nextId,
      code,
      discountValue: Number(data.discountValue) || 0,
      maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
      minOrderValue: Number(data.minOrderValue) || 0,
      quantity: Number(data.quantity) || 0,
      usedQuantity: 0,
      status: data.status || 'ACTIVE'
    };

    list.unshift(newVoucher);
    persistVouchers(list);
    return { ...newVoucher };
  },

  /** Cập nhật voucher (Admin) */
  async update(id, data) {
    await delay();
    const list = loadStoredVouchers();
    const idx = list.findIndex((v) => v.id === Number(id));
    if (idx === -1) throw new Error('Không tìm thấy voucher');

    const code = data.code.toUpperCase().trim();
    const dupCode = list.some(
      (v) => v.id !== Number(id) && v.code.toUpperCase() === code
    );
    if (dupCode) throw new Error(`Mã voucher "${code}" đã tồn tại.`);

    list[idx] = {
      ...list[idx],
      ...data,
      id: Number(id),
      code,
      discountValue: Number(data.discountValue) || 0,
      maxDiscount: data.maxDiscount ? Number(data.maxDiscount) : null,
      minOrderValue: Number(data.minOrderValue) || 0,
      quantity: Number(data.quantity) || 0
    };

    persistVouchers(list);
    return { ...list[idx] };
  },

  /** Xóa voucher (Admin) */
  async delete(id) {
    await delay();
    const list = loadStoredVouchers();
    const idx = list.findIndex((v) => v.id === Number(id));
    if (idx === -1) throw new Error('Không tìm thấy voucher');

    list.splice(idx, 1);
    persistVouchers(list);

    // Đồng thời xóa khỏi danh sách đã lưu của user nếu có
    this.unsaveVoucher(Number(id));
    return true;
  },

  /** Bật / Tắt trạng thái voucher (Admin) */
  async toggleStatus(id) {
    await delay();
    const list = loadStoredVouchers();
    const idx = list.findIndex((v) => v.id === Number(id));
    if (idx === -1) throw new Error('Không tìm thấy voucher');

    list[idx].status = list[idx].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    persistVouchers(list);
    return { ...list[idx] };
  },

  // ─── User / Customer APIs ───────────────────────────────────────────────────

  /** Lấy toàn bộ voucher đang mở cho User (public browsing) */
  async getPublicVouchers() {
    await delay();
    const list = loadStoredVouchers();
    return list.filter((v) => v.status === 'ACTIVE');
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

  /** Lấy danh sách voucher đã lưu đầy đủ thông tin */
  async getSavedVouchers() {
    await delay(60);
    const list = loadStoredVouchers();
    const ids = this.getSavedIds();
    return list.filter((v) => ids.includes(v.id));
  },

  /** Áp dụng voucher theo mã tại Checkout */
  async applyCode(code, orderTotal) {
    await delay();
    const list = loadStoredVouchers();
    const v = list.find((x) => x.code.toUpperCase() === code.toUpperCase().trim());
    if (!v) throw new Error('Mã giảm giá không tồn tại hoặc không hợp lệ.');

    const status = getVoucherStatus(v);
    if (status === 'EXPIRED') throw new Error('Mã giảm giá đã hết hạn.');
    if (status === 'UPCOMING') throw new Error('Mã giảm giá chưa đến thời gian áp dụng.');
    if (status === 'SOLD_OUT') throw new Error('Mã giảm giá đã hết lượt sử dụng.');
    if (status === 'INACTIVE') throw new Error('Mã giảm giá không còn hiệu lực.');

    if (orderTotal < v.minOrderValue) {
      throw new Error(
        `Đơn hàng tối thiểu ${v.minOrderValue.toLocaleString('vi-VN')}đ để sử dụng mã này.`
      );
    }

    const discountAmount = calcDiscount(v, orderTotal);
    return { voucher: v, discountAmount };
  }
};

export default voucherService;
