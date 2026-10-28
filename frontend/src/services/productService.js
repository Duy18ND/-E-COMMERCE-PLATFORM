import api from './api';
import { INITIAL_PRODUCTS } from './mockData';
import { INITIAL_FLASH_PRODUCTS } from '../mock/mockSales';

let localProducts = [
  ...INITIAL_FLASH_PRODUCTS,
  ...INITIAL_PRODUCTS.filter((p) => !INITIAL_FLASH_PRODUCTS.some((fp) => String(fp.id) === String(p.id)))
];

export const productService = {
  // Chuẩn bị kết nối GET /api/products, fallback về mockData nếu Backend chưa có Controller
  getAll: async (params) => {
    try {
      return await api.get('/products', { params });
    } catch (err) {
      // Backend Blocker: Backend chưa triển khai ProductController
      let result = [...localProducts];
      if (params?.category) {
        result = result.filter(
          (p) => p.category?.toLowerCase() === params.category.toLowerCase()
        );
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        result = result.filter(
          (p) => p.name.toLowerCase().includes(q) || String(p.id) === q
        );
      }
      return result;
    }
  },

  getById: async (id) => {
    try {
      return await api.get(`/products/${id}`);
    } catch (err) {
      const found = localProducts.find(
        (p) => String(p.id) === String(id) || (p.sku && String(p.sku) === String(id))
      );
      if (!found) {
        throw new Error('Không tìm thấy sản phẩm!');
      }
      return found;
    }
  },

  create: async (productData) => {
    try {
      return await api.post('/products', productData);
    } catch (err) {
      const newProd = {
        id: Date.now(),
        ...productData,
        price: Number(productData.price) || 0,
        stock: Number(productData.stock) || 0
      };
      localProducts.unshift(newProd);
      return newProd;
    }
  },

  update: async (id, productData) => {
    try {
      return await api.put(`/products/${id}`, productData);
    } catch (err) {
      localProducts = localProducts.map((p) =>
        String(p.id) === String(id) ? { ...p, ...productData } : p
      );
      return { id, ...productData };
    }
  },

  delete: async (id) => {
    try {
      return await api.delete(`/products/${id}`);
    } catch (err) {
      localProducts = localProducts.filter((p) => String(p.id) !== String(id));
      return { success: true, id };
    }
  }
};

export default productService;
