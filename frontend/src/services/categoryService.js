import { MOCK_CATEGORIES } from '../mock/mockCategories';

const STORAGE_KEY = 'shopmart_admin_categories';

/**
 * Khởi tạo dữ liệu danh mục từ localStorage hoặc fallback về MOCK_CATEGORIES
 */
const getInitialCategories = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Lỗi khi đọc categories từ localStorage:', e);
  }
  return [...MOCK_CATEGORIES];
};

let localCategories = getInitialCategories();

const saveCategories = (categories) => {
  localCategories = categories;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {
    console.warn('Lỗi khi lưu categories vào localStorage:', e);
  }
};

export const categoryService = {
  /**
   * Lấy danh sách toàn bộ danh mục (Frontend Mock)
   */
  getAll: async () => {
    // Giả lập độ trễ mạng nhẹ cho trải nghiệm chân thực
    await new Promise((resolve) => setTimeout(resolve, 80));
    return [...localCategories];
  },

  /**
   * Lấy danh mục theo ID
   */
  getById: async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    const found = localCategories.find((c) => String(c.id).toLowerCase() === String(id).toLowerCase());
    if (!found) {
      throw new Error(`Không tìm thấy danh mục với mã '${id}'!`);
    }
    return { ...found };
  },

  /**
   * Thêm danh mục mới
   */
  create: async (categoryData) => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Sinh ID danh mục tự động CATxxx kế tiếp
    const maxNum = localCategories.reduce((max, cat) => {
      const match = String(cat.id).match(/^CAT(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);

    const nextId = `CAT${String(maxNum + 1).padStart(3, '0')}`;
    const today = new Date().toISOString().split('T')[0];

    const newCategory = {
      id: nextId,
      name: categoryData.name.trim(),
      image: categoryData.image?.trim() || 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80',
      description: categoryData.description?.trim() || 'Chưa có mô tả cho danh mục này.',
      productCount: 0,
      status: categoryData.status || 'ACTIVE',
      createdAt: today
    };

    const updated = [newCategory, ...localCategories];
    saveCategories(updated);
    return newCategory;
  },

  /**
   * Cập nhật danh mục
   */
  update: async (id, categoryData) => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    let updatedItem = null;
    const updated = localCategories.map((c) => {
      if (String(c.id).toLowerCase() === String(id).toLowerCase()) {
        updatedItem = {
          ...c,
          ...categoryData,
          id: c.id, // ID không được đổi
          name: categoryData.name ? categoryData.name.trim() : c.name,
          image: categoryData.image !== undefined ? categoryData.image.trim() : c.image,
          description: categoryData.description !== undefined ? categoryData.description.trim() : c.description,
          status: categoryData.status || c.status
        };
        return updatedItem;
      }
      return c;
    });

    if (!updatedItem) {
      throw new Error(`Không tìm thấy danh mục mã '${id}' để cập nhật!`);
    }

    saveCategories(updated);
    return updatedItem;
  },

  /**
   * Xóa danh mục
   */
  delete: async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const exists = localCategories.some((c) => String(c.id).toLowerCase() === String(id).toLowerCase());
    if (!exists) {
      throw new Error(`Danh mục mã '${id}' không tồn tại!`);
    }

    const updated = localCategories.filter((c) => String(c.id).toLowerCase() !== String(id).toLowerCase());
    saveCategories(updated);
    return { success: true, id };
  },

  /**
   * Khôi phục danh mục mẫu ban đầu
   */
  resetMockData: () => {
    saveCategories([...MOCK_CATEGORIES]);
    return [...MOCK_CATEGORIES];
  }
};

export default categoryService;
