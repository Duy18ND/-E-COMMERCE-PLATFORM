import api from './api';
import productService from './productService';

const THRESHOLD_STORAGE_KEY = 'shopmart_inventory_thresholds';

/**
 * Đọc cấu hình ngưỡng cảnh báo từ LocalStorage
 */
export const getStoredThresholds = () => {
  try {
    const raw = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/**
 * Lưu ngưỡng cảnh báo của 1 sản phẩm
 */
export const setStoredThreshold = (productId, threshold) => {
  try {
    const current = getStoredThresholds();
    const val = Math.max(1, Math.floor(Number(threshold) || 5));
    current[String(productId)] = val;
    localStorage.setItem(THRESHOLD_STORAGE_KEY, JSON.stringify(current));
    return val;
  } catch {
    return 5;
  }
};

/**
 * Lấy ngưỡng cảnh báo của 1 sản phẩm (mặc định 5)
 */
export const getThreshold = (productId, defaultVal = 5) => {
  const map = getStoredThresholds();
  const stored = map[String(productId)];
  if (stored !== undefined && Number.isInteger(Number(stored)) && Number(stored) > 0) {
    return Number(stored);
  }
  return defaultVal;
};

/**
 * Xác định trạng thái tồn kho dựa trên số lượng và ngưỡng cảnh báo
 * Quy tắc:
 * - OUT_OF_STOCK: stock <= 0 (Đã hết hàng, màu đỏ, icon ⛔)
 * - LOW_STOCK: 0 < stock <= minThreshold (Sắp hết hàng, màu cam vàng, icon ⚠️)
 * - IN_STOCK: stock > minThreshold (Đủ hàng, màu xanh lá, icon ✅)
 */
export const getInventoryStatus = (stock, minThreshold = 5) => {
  const stockNum = Number(stock) || 0;
  const thresholdNum = Number(minThreshold) || 5;

  if (stockNum <= 0) {
    return {
      status: 'OUT_OF_STOCK',
      label: 'Hết hàng',
      color: '#dc2626',
      bgLight: '#fef2f2',
      border: '#fecaca',
      badgeClass: 'badge-danger',
      icon: '⛔'
    };
  }
  if (stockNum <= thresholdNum) {
    return {
      status: 'LOW_STOCK',
      label: 'Sắp hết hàng',
      color: '#d97706',
      bgLight: '#fffbeb',
      border: '#fde68a',
      badgeClass: 'badge-warning',
      icon: '⚠️'
    };
  }
  return {
    status: 'IN_STOCK',
    label: 'Còn hàng',
    color: '#16a34a',
    bgLight: '#f0fdf4',
    border: '#bbf7d0',
    badgeClass: 'badge-success',
    icon: '✅'
  };
};

let localInventory = [];

/**
 * Chuẩn hóa thông tin tồn kho từ sản phẩm (ProductResponse) hoặc dữ liệu tồn kho
 */
const normalizeInventoryItem = (item, index = 0) => {
  if (!item) return null;
  const idStr = String(item.id ?? index + 1);
  const stockQuantity = Math.max(0, Math.floor(Number(item.stockQuantity ?? item.stock ?? 0)));
  const minThreshold = getThreshold(idStr, Number(item.minThreshold ?? 5));
  const sku = item.sku || `SKU-SP-${idStr.padStart(3, '0')}`;
  const statusInfo = getInventoryStatus(stockQuantity, minThreshold);

  return {
    ...item,
    id: idStr,
    name: item.name || 'Sản phẩm ShopMart',
    sku,
    stock: stockQuantity,
    stockQuantity,
    minThreshold,
    inStock: stockQuantity > 0,
    statusInfo
  };
};

export const inventoryService = {
  getStoredThresholds,
  setStoredThreshold,
  getThreshold,
  getInventoryStatus,

  /**
   * Lấy danh sách tồn kho sản phẩm thực tế từ Backend API (`/products/admin`)
   * Không hiển thị Mock Data khi Database rỗng hoặc khi API gặp lỗi.
   */
  getInventory: async (params = {}) => {
    const adminItems = await productService.getAdminProducts(params);
    if (Array.isArray(adminItems)) {
      localInventory = adminItems.map(normalizeInventoryItem).filter(Boolean);
      return [...localInventory];
    }
    localInventory = [];
    return [];
  },

  /**
   * Kiểm tra tồn kho của 1 sản phẩm theo ID (`GET /api/v1/products/{id}/stock`)
   */
  checkProductStock: async (productId, quantity = 1) => {
    return productService.checkStock(productId, quantity);
  },

  /**
   * [Task ECOM-283] Nhập thêm hàng vào kho (`POST /api/v1/products/{id}/inbound`)
   * @param {number|string} productId - ID sản phẩm
   * @param {Object} data - { quantity, note }
   */
  inboundStock: async (productId, { quantity, note = '' }) => {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Số lượng nhập kho phải là số nguyên dương lớn hơn 0');
    }

    const updated = await productService.inboundStock(productId, { quantity: qty, note });
    const newStock = Number(updated?.stockQuantity ?? updated?.stock ?? 0);

    localInventory = localInventory.map((item) =>
      String(item.id) === String(productId)
        ? normalizeInventoryItem({ ...item, ...updated, stock: newStock, stockQuantity: newStock })
        : item
    );

    return updated;
  },

  /**
   * [Task ECOM-283] Điều chỉnh tồn kho thực tế kiểm kê (`POST /api/v1/products/{id}/adjust-stock`)
   * @param {number|string} productId - ID sản phẩm
   * @param {Object} data - { actualStock, reason }
   */
  adjustStock: async (productId, { actualStock, reason = '' }) => {
    const stockVal = Number(actualStock);
    if (!Number.isInteger(stockVal) || stockVal < 0) {
      throw new Error('Số lượng tồn kho thực tế phải là số nguyên không âm (>= 0)');
    }
    const cleanReason = String(reason ?? '').trim();
    if (!cleanReason) {
      throw new Error('Lý do điều chỉnh kho không được để trống');
    }

    const updated = await productService.adjustStock(productId, { actualStock: stockVal, reason: cleanReason });
    const newStock = Number(updated?.stockQuantity ?? updated?.stock ?? 0);

    localInventory = localInventory.map((item) =>
      String(item.id) === String(productId)
        ? normalizeInventoryItem({ ...item, ...updated, stock: newStock, stockQuantity: newStock })
        : item
    );

    return updated;
  },

  /**
   * [Task ECOM-283] Giảm tồn kho (xuất kho / hao hụt)
   * Sử dụng endpoint Backend `/adjust-stock` với `actualStock = currentStock - quantity`
   * @param {number|string} productId - ID sản phẩm
   * @param {Object} data - { currentStock, quantity, reason }
   */
  decreaseStock: async (productId, { currentStock, quantity, reason = '' }) => {
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw new Error('Số lượng giảm phải là số nguyên dương lớn hơn 0');
    }
    const curr = Number(currentStock);
    if (qty > curr) {
      throw new Error(`Số lượng giảm (${qty}) không được vượt quá tồn kho hiện tại (${curr})`);
    }
    const cleanReason = String(reason ?? '').trim();
    if (!cleanReason) {
      throw new Error('Lý do xuất kho/giảm tồn kho không được để trống');
    }

    const targetStock = curr - qty;
    return inventoryService.adjustStock(productId, {
      actualStock: targetStock,
      reason: cleanReason
    });
  },

  /**
   * Cập nhật số lượng tồn kho sản phẩm (dành cho inline update)
   */
  updateStock: async (productId, quantity, reason = 'Cập nhật trực tiếp số lượng tồn kho') => {
    return inventoryService.adjustStock(productId, {
      actualStock: Math.max(0, Number(quantity) || 0),
      reason
    });
  },

  /**
   * Đặt trước tồn kho (`POST /api/v1/products/reserve-stock`)
   */
  reserveStock: async (items = []) => {
    return api.post('/products/reserve-stock', items);
  },

  /**
   * Khôi phục tồn kho (`POST /api/v1/products/restore-stock`)
   */
  restoreStock: async (items = []) => {
    return api.post('/products/restore-stock', items);
  }
};

export default inventoryService;
