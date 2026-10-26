import api from './api';
import { INITIAL_CATEGORIES } from './mockData';

let localCategories = [...INITIAL_CATEGORIES];

export const categoryService = {
  getAll: async () => {
    try {
      return await api.get('/categories');
    } catch (err) {
      // Backend Blocker: Backend chưa triển khai CategoryController
      return [...localCategories];
    }
  },

  getById: async (id) => {
    try {
      return await api.get(`/categories/${id}`);
    } catch (err) {
      const found = localCategories.find((c) => String(c.id) === String(id));
      if (!found) {
        throw new Error('Không tìm thấy danh mục!');
      }
      return found;
    }
  },

  create: async (categoryData) => {
    try {
      return await api.post('/categories', categoryData);
    } catch (err) {
      const newCat = {
        id: `cat-${Date.now()}`,
        count: 0,
        ...categoryData
      };
      localCategories.unshift(newCat);
      return newCat;
    }
  },

  update: async (id, categoryData) => {
    try {
      return await api.put(`/categories/${id}`, categoryData);
    } catch (err) {
      localCategories = localCategories.map((c) =>
        String(c.id) === String(id) ? { ...c, ...categoryData } : c
      );
      return { id, ...categoryData };
    }
  },

  delete: async (id) => {
    try {
      return await api.delete(`/categories/${id}`);
    } catch (err) {
      localCategories = localCategories.filter((c) => String(c.id) !== String(id));
      return { success: true, id };
    }
  }
};

export default categoryService;
