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
   * Tìm kiếm danh mục theo từ khóa (gọi API GET /api/v1/products/categories/search?keyword=...)
   */
  search: async (keyword = '') => {
    const cleanKeyword = String(keyword ?? '').trim();
    try {
      const response = await api.get('/products/categories/search', {
        params: cleanKeyword ? { keyword: cleanKeyword } : {}
      });
      const rawList = Array.isArray(response)
        ? response
        : Array.isArray(response?.content)
        ? response.content
        : Array.isArray(response?.data)
        ? response.data
        : [];
      if (rawList.length > 0 || cleanKeyword) {
        return rawList.map((item, idx) => normalizeCategory(item, idx)).filter(Boolean);
      }
    } catch {
      // Fallback tìm kiếm trên localCategories khi offline
    }
    if (!cleanKeyword) return [...localCategories];
    const q = cleanKeyword.toLowerCase();
    return localCategories.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        String(c.id).toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
    );
  },

  /**
   * Lấy danh mục theo ID hoặc Slug (gọi API GET /api/v1/products/categories/{id})
   */
  getById: async (id) => {
    try {
      const numId = Number(id);
      if (Number.isInteger(numId) && numId > 0) {
        const apiCat = await api.get(`/products/categories/${numId}`);
        if (apiCat) return normalizeCategory(apiCat);
      }
    } catch {
      // Fallback sang dữ liệu cục bộ nếu không kết nối được Backend
    }

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
   * Thêm danh mục mới [ADMIN] (gọi API POST /api/v1/products/categories)
   */
  create: async (categoryData) => {
    const trimmedName = String(categoryData?.name ?? '').trim();
    if (!trimmedName) {
      throw new Error('Tên danh mục không được để trống');
    }

    const imageUrl =
      (categoryData.imageUrl ?? categoryData.image ?? '').trim() ||
      'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80';
    const description =
      (categoryData.description ?? '').trim() || 'Chưa có mô tả cho danh mục này.';

    const payload = {
      name: trimmedName,
      description,
      imageUrl
    };

    try {
      const createdFromApi = await api.post('/products/categories', payload);
      const normalized = {
        ...normalizeCategory(createdFromApi),
        id: String(createdFromApi?.id ?? `CAT${String(localCategories.length + 1).padStart(3, '0')}`),
        name: createdFromApi?.name || trimmedName,
        image: createdFromApi?.imageUrl || imageUrl,
        imageUrl: createdFromApi?.imageUrl || imageUrl,
        description: createdFromApi?.description || description,
        productCount: Number(createdFromApi?.productCount ?? 0),
        status: categoryData.status || 'ACTIVE',
        createdAt: new Date().toISOString().split('T')[0]
      };
      saveCategories([normalized, ...localCategories.filter((c) => String(c.id) !== String(normalized.id))]);
      return normalized;
    } catch (err) {
      if (categoryData?.rejectOnError) {
        throw err;
      }
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
        name: trimmedName,
        image: imageUrl,
        imageUrl,
        description,
        productCount: 0,
        status: categoryData.status || 'ACTIVE',
        createdAt: today
      };

      const updated = [newCategory, ...localCategories];
      saveCategories(updated);
      return newCategory;
    }
  },

  /**
   * Cập nhật danh mục [ADMIN] (gọi API PUT /api/v1/products/categories/{id})
   */
  update: async (id, categoryData) => {
    const trimmedName = categoryData.name ? categoryData.name.trim() : '';
    const imageUrl =
      categoryData.imageUrl !== undefined
        ? categoryData.imageUrl.trim()
        : categoryData.image !== undefined
        ? categoryData.image.trim()
        : undefined;
    const description =
      categoryData.description !== undefined ? categoryData.description.trim() : undefined;

    const payload = {
      name: trimmedName,
      description,
      imageUrl
    };

    try {
      const updatedFromApi = await api.put(`/products/categories/${id}`, payload);
      if (updatedFromApi) {
        const synced = localCategories.map((c) =>
          String(c.id).toLowerCase() === String(id).toLowerCase()
            ? {
                ...c,
                ...updatedFromApi,
                id: c.id,
                name: updatedFromApi.name || trimmedName || c.name,
                image: updatedFromApi.imageUrl || imageUrl || c.image,
                imageUrl: updatedFromApi.imageUrl || imageUrl || c.imageUrl,
                description: updatedFromApi.description ?? description ?? c.description,
                status: categoryData.status || c.status
              }
            : c
        );
        saveCategories(synced);
        return normalizeCategory(updatedFromApi);
      }
    } catch (err) {
      if (categoryData?.rejectOnError) {
        throw err;
      }
    }

    let updatedItem = null;
    const updated = localCategories.map((c) => {
      if (String(c.id).toLowerCase() === String(id).toLowerCase()) {
        updatedItem = {
          ...c,
          ...categoryData,
          id: c.id,
          name: trimmedName || c.name,
          image: imageUrl !== undefined ? imageUrl : c.image,
          imageUrl: imageUrl !== undefined ? imageUrl : c.imageUrl || c.image,
          description: description !== undefined ? description : c.description,
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
   * Xóa danh mục [ADMIN] (gọi API DELETE /api/v1/products/categories/{id})
   */
  delete: async (id) => {
    try {
      await api.delete(`/products/categories/${id}`);
    } catch {
      // Fallback xóa trên localCategories khi chạy offline
    }

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
