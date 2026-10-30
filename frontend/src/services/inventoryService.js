import api from './api';
import productService from './productService';
import { INITIAL_INVENTORY } from './mockData';

let localInventory = [...INITIAL_INVENTORY];

/**
 * Chuẩn hóa thông tin tồn kho từ sản phẩm (ProductResponse) hoặc dữ liệu tồn kho
 */
const normalizeInventoryItem = (item, index = 0) => {
  if (!item) return null;
  const stockQuantity = Math.max(0, Number(item.stockQuantity ?? item.stock ?? 0));
  const minThreshold = Number(item.minThreshold ?? 5);
  const sku = item.sku || `SKU-SP-${String(item.id ?? index + 1).padStart(3, '0')}`;

  return {
    ...item,
    id: String(item.id ?? index + 1),
    name: item.name || 'Sản phẩm ShopMart',
    sku,
    stock: stockQuantity,
    stockQuantity,
    minThreshold,
    inStock: stockQuantity > 0
  };
};

export const inventoryService = {
  /**
   * Lấy danh sách tồn kho sản phẩm (kết nối với Product API `/products/admin` hoặc `/products`)
   */
  getInventory: async (params = {}) => {
    try {
      const adminItems = await productService.getAdminProducts(params);
      if (Array.isArray(adminItems) && adminItems.length > 0) {
        localInventory = adminItems.map(normalizeInventoryItem).filter(Boolean);
        return [...localInventory];
      }
    } catch {
      // Fallback sang localInventory
    }
    return localInventory.map(normalizeInventoryItem).filter(Boolean);
  },

  /**
   * Kiểm tra tồn kho của 1 sản phẩm theo ID (`GET /api/v1/products/{id}/stock`)
   */
  checkProductStock: async (productId, quantity = 1) => {
    return productService.checkStock(productId, quantity);
  },

  /**
   * Cập nhật số lượng tồn kho sản phẩm (`PUT /api/v1/products/{id}`)
   */
  updateStock: async (productId, quantity) => {
    const nextQty = Math.max(0, Number(quantity) || 0);
    try {
      const currentProduct = await productService.getById(productId);
      const updated = await productService.update(productId, {
        ...currentProduct,
        stock: nextQty,
        stockQuantity: nextQty
      });
      localInventory = localInventory.map((item) =>
        String(item.id) === String(productId)
          ? { ...item, stock: nextQty, stockQuantity: nextQty }
          : item
      );
      return updated;
    } catch {
      localInventory = localInventory.map((item) =>
        String(item.id) === String(productId)
          ? { ...item, stock: nextQty, stockQuantity: nextQty }
          : item
      );
      return { productId, stock: nextQty, stockQuantity: nextQty };
    }
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
