import api from './api';
import { INITIAL_CATEGORIES } from './mockData';
import { MOCK_CATEGORIES } from '../mock/mockCategories';

const STORAGE_KEY = 'shopmart_admin_categories';

/**
 * Bản đồ ánh xạ danh mục chuẩn giữa slug/ID trên URL và các biến thể tên danh mục
 * giữa Frontend (Home, Products, Mock) và Backend (DataInitializer.java)
 */
export const CATEGORY_ALIAS_MAP = {
  phones: [
    'phones',
    '1',
    'điện thoại',
    'điện thoại & tablet',
    'smartphone & tablet',
    'smartphone'
  ],
  laptops: [
    'laptops',
    '2',
    'laptop',
    'laptop & workstation',
    'laptop & mac',
    'macbook'
  ],
  accessories: [
    'accessories',
    '3',
    'phụ kiện',
    'phụ kiện & âm thanh',
    'thời trang & phụ kiện',
    'âm thanh'
  ],
  smarthome: [
    'smarthome',
    '4',
    'nhà thông minh',
    'nhà thông minh & gia dụng',
    'smart living',
    'gia dụng'
  ]
};

/**
 * Chuẩn hóa thông tin danh mục từ Backend CategoryResponse ({ id, name, description, imageUrl })
 * sang định dạng thống nhất cho cả Home.jsx, Products.jsx, Header.jsx và Admin
 */
export const normalizeCategory = (cat, index = 0) => {
  if (!cat) return null;
  if (typeof cat === 'string') {
    const matched = INITIAL_CATEGORIES.find(
      (c) =>
        c.id.toLowerCase() === cat.toLowerCase() ||
        c.name.toLowerCase() === cat.toLowerCase() ||
        c.aliases?.includes(cat.toLowerCase())
    );
    return (
      matched || {
        id: cat,
        slug: cat.toLowerCase().replace(/\s+/g, '-'),
        name: cat,
        description: `Danh mục ${cat}`,
        desc: `Danh mục ${cat}`,
        count: '100+ SP',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        badgeBg: '#eff6ff',
        badgeColor: '#2563eb',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80'
      }
    );
  }

  const rawName = (cat.name || '').trim();
  const rawId = String(cat.id ?? index + 1).trim();

  // Tìm preset giao diện tương ứng trong INITIAL_CATEGORIES
  const preset =
    INITIAL_CATEGORIES.find(
      (c) =>
        c.id.toLowerCase() === rawId.toLowerCase() ||
        c.name.toLowerCase() === rawName.toLowerCase() ||
        c.aliases?.some((a) => rawName.toLowerCase().includes(a))
    ) || INITIAL_CATEGORIES[index % INITIAL_CATEGORIES.length];

  const image = cat.imageUrl || cat.image || preset.image;
  const description = cat.description || cat.desc || preset.description;

  return {
    ...preset,
    ...cat,
    id: preset?.id || rawId,
    backendId: cat.id ?? preset?.id,
    slug: preset?.slug || rawId.toLowerCase(),
    name: rawName || preset.name,
    description,
    desc: cat.desc || description,
    image,
    imageUrl: image,
    count: cat.count || (cat.productCount ? `${cat.productCount} SP` : preset.count),
    status: cat.status || 'ACTIVE'
  };
};

/**
 * Kiểm tra sản phẩm có thuộc danh mục đang chọn hay không (hỗ trợ cả slug 'phones', ID hoặc tên tiếng Việt)
 */
export const matchesCategoryFilter = (productCategory, selectedCategory, productCategoryId = '') => {
  if (!selectedCategory || selectedCategory === 'ALL') return true;

  const target = String(selectedCategory).trim().toLowerCase();
  const prodCatName = String(
    typeof productCategory === 'object' ? productCategory?.name || '' : productCategory || ''
  )
    .trim()
    .toLowerCase();
  const prodCatId = String(
    typeof productCategory === 'object' ? productCategory?.id || '' : productCategoryId || ''
  )
    .trim()
    .toLowerCase();

  if (prodCatName === target || prodCatId === target) return true;

  // Kiểm tra qua bảng alias chuẩn
  for (const [slug, aliases] of Object.entries(CATEGORY_ALIAS_MAP)) {
    const isTargetInGroup = slug === target || aliases.includes(target);
    if (isTargetInGroup) {
      if (
        prodCatId === slug ||
        aliases.includes(prodCatName) ||
        aliases.some((alias) => alias.length > 2 && prodCatName.includes(alias))
      ) {
        return true;
      }
    }
  }

  return prodCatName.includes(target) || target.includes(prodCatName);
};

/**
 * Khởi tạo dữ liệu danh mục từ localStorage hoặc fallback về MOCK_CATEGORIES
 */
const getInitialCategories = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
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
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    }
  } catch (e) {
    console.warn('Lỗi khi lưu categories vào localStorage:', e);
  }
};

export const categoryService = {
  /**
   * Lấy danh sách danh mục công khai cho Guest / Customer (gọi API GET /api/v1/products/categories)
   */
  getPublicCategories: async (options = {}) => {
    if (options?.simulateError) {
      throw new Error('Không thể tải danh mục sản phẩm từ máy chủ.');
    }
    try {
      const response = await api.get('/products/categories');
      const rawList = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
        ? response.content
        : Array.isArray(response?.data)
        ? response.data
        : [];

      if (rawList.length > 0) {
        return rawList.map((item, idx) => normalizeCategory(item, idx)).filter(Boolean);
      }
      return INITIAL_CATEGORIES.map((item, idx) => normalizeCategory(item, idx));
    } catch (err) {
      if (options?.rejectOnError) {
        throw err;
      }
      return INITIAL_CATEGORIES.map((item, idx) => normalizeCategory(item, idx));
    }
  },

  /**
   * Lấy danh sách danh mục: thử gọi API GET /api/v1/products/categories trước,
   * nếu gọi cho storefront (`{ publicOnly: true }`) thì trả về danh mục chuẩn cho Guest,
   * nếu ở trang Admin hoặc offline thì fallback về localCategories.
   */
  getAll: async (options = {}) => {
    if (options?.publicOnly) {
      return categoryService.getPublicCategories(options);
    }
    try {
      const response = await api.get('/products/categories');
      const rawList = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
        ? response.content
        : [];
      if (rawList.length > 0) {
        return rawList.map((item, idx) => normalizeCategory(item, idx));
      }
    } catch {
      if (options?.rejectOnError) {
        throw new Error('Không thể kết nối máy chủ danh mục sản phẩm.');
      }
    }
    return [...localCategories];
  },

  /**
   * Lấy danh mục theo ID hoặc Slug
   */
  getById: async (id) => {
    const publicMatch = INITIAL_CATEGORIES.find(
      (c) => String(c.id).toLowerCase() === String(id).toLowerCase()
    );
    if (publicMatch) return normalizeCategory(publicMatch);

    const found = localCategories.find(
      (c) => String(c.id).toLowerCase() === String(id).toLowerCase()
    );
    if (!found) {
      throw new Error(`Không tìm thấy danh mục với mã '${id}'!`);
    }
    return { ...found };
  },

  /**
   * Thêm danh mục mới
   */
  create: async (categoryData) => {
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
      image:
        categoryData.image?.trim() ||
        'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80',
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
    let updatedItem = null;
    const updated = localCategories.map((c) => {
      if (String(c.id).toLowerCase() === String(id).toLowerCase()) {
        updatedItem = {
          ...c,
          ...categoryData,
          id: c.id,
          name: categoryData.name ? categoryData.name.trim() : c.name,
          image: categoryData.image !== undefined ? categoryData.image.trim() : c.image,
          description:
            categoryData.description !== undefined ? categoryData.description.trim() : c.description,
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
    const exists = localCategories.some(
      (c) => String(c.id).toLowerCase() === String(id).toLowerCase()
    );
    if (!exists) {
      throw new Error(`Danh mục mã '${id}' không tồn tại!`);
    }

    const updated = localCategories.filter(
      (c) => String(c.id).toLowerCase() !== String(id).toLowerCase()
    );
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
