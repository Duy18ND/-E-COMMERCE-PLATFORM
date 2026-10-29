import api from './api';
import { INITIAL_PRODUCTS } from './mockData';
import { INITIAL_FLASH_PRODUCTS } from '../mock/mockSales';
import { CATEGORY_ALIAS_MAP, matchesCategoryFilter } from './categoryService';

const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80';

/**
 * Xác định categoryId chuẩn ('phones', 'laptops', 'accessories', 'smarthome') từ tên danh mục
 */
export const resolveCategorySlug = (categoryValue, explicitCategoryId = '') => {
  if (explicitCategoryId && CATEGORY_ALIAS_MAP[explicitCategoryId]) {
    return explicitCategoryId;
  }
  const raw = String(
    typeof categoryValue === 'object' ? categoryValue?.name || '' : categoryValue || ''
  )
    .trim()
    .toLowerCase();

  for (const [slug, aliases] of Object.entries(CATEGORY_ALIAS_MAP)) {
    if (slug === raw || aliases.includes(raw) || aliases.some((a) => raw.includes(a))) {
      return slug;
    }
  }
  return explicitCategoryId || raw || 'general';
};

/**
 * Chuẩn hóa đối tượng sản phẩm từ Backend ProductResponse hoặc dữ liệu Mock
 * Đảm bảo tương thích đồng thời cả `stock` lẫn `stockQuantity` và luôn có `imageUrl` hợp lệ
 */
export const normalizeProduct = (product) => {
  if (!product || typeof product !== 'object') return null;

  const categoryName =
    typeof product.category === 'object'
      ? product.category?.name || 'Chưa phân loại'
      : product.category || 'Chưa phân loại';

  const stockValue = Number(product.stockQuantity ?? product.stock ?? 0);
  const priceValue = Number(product.price ?? 0);

  return {
    ...product,
    id: product.id,
    name: product.name || 'Sản phẩm ShopMart',
    category: categoryName,
    categoryId: resolveCategorySlug(categoryName, product.categoryId),
    price: priceValue,
    stock: stockValue,
    stockQuantity: stockValue,
    imageUrl: product.imageUrl || product.image || DEFAULT_PRODUCT_IMAGE,
    description:
      product.description ||
      'Sản phẩm công nghệ chính hãng phân phối tại hệ thống ShopMart E-Commerce.'
  };
};

// Gộp danh sách sản phẩm khởi tạo không trùng ID và chuẩn hóa toàn bộ
const buildInitialLocalProducts = () => {
  const combined = [
    ...INITIAL_PRODUCTS,
    ...INITIAL_FLASH_PRODUCTS.filter(
      (fp) => !INITIAL_PRODUCTS.some((p) => String(p.id) === String(fp.id))
    )
  ];
  return combined.map(normalizeProduct).filter(Boolean);
};

let localProducts = buildInitialLocalProducts();

/**
 * Chuyển đổi tham số sắp xếp trên UI sang cú pháp Spring Data Pageable (`field,direction`)
 */
const mapSortParam = (sortOrder) => {
  switch (sortOrder) {
    case 'price_asc':
      return 'price,asc';
    case 'price_desc':
      return 'price,desc';
    case 'name_asc':
      return 'name,asc';
    case 'name_desc':
      return 'name,desc';
    default:
      return undefined;
  }
};

/**
 * Áp dụng lọc danh mục, tìm kiếm từ khóa và sắp xếp trên danh sách sản phẩm
 */
export const filterAndSortProducts = (items = [], params = {}) => {
  let result = [...items].map(normalizeProduct).filter(Boolean);

  const categoryParam = params?.category ?? params?.selectedCategory ?? '';
  if (categoryParam && categoryParam !== 'ALL') {
    result = result.filter((p) =>
      matchesCategoryFilter(p.category, categoryParam, p.categoryId)
    );
  }

  const keywordParam = (params?.keyword ?? params?.search ?? '').trim();
  if (keywordParam) {
    const q = keywordParam.toLowerCase();
    result = result.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        String(p.id).toLowerCase() === q
    );
  }

  const sortOrder = params?.sortOrder ?? params?.sort ?? '';
  if (sortOrder === 'price_asc' || sortOrder === 'price,asc') {
    result.sort(
      (a, b) => (a.salePrice || a.price || 0) - (b.salePrice || b.price || 0)
    );
  } else if (sortOrder === 'price_desc' || sortOrder === 'price,desc') {
    result.sort(
      (a, b) => (b.salePrice || b.price || 0) - (a.salePrice || a.price || 0)
    );
  } else if (sortOrder === 'name_asc' || sortOrder === 'name,asc') {
    result.sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
  } else if (sortOrder === 'name_desc' || sortOrder === 'name,desc') {
    result.sort((a, b) => String(b.name).localeCompare(String(a.name), 'vi'));
  }

  return result;
};

/**
 * Bóc tách dữ liệu từ phản hồi của Backend (`PagedResponse` hoặc `Array`)
 */
export const extractPagedProducts = (apiPayload, params = {}) => {
  const isPagedObject =
    apiPayload &&
    typeof apiPayload === 'object' &&
    !Array.isArray(apiPayload) &&
    Array.isArray(apiPayload.content);

  const rawItems = isPagedObject
    ? apiPayload.content
    : Array.isArray(apiPayload)
    ? apiPayload
    : [];

  const normalizedItems = rawItems.map(normalizeProduct).filter(Boolean);

  if (isPagedObject) {
    const pageSize = Number(apiPayload.pageSize ?? params?.size ?? 8) || 8;
    const pageNumber = Number(apiPayload.pageNumber ?? params?.page ?? 0) || 0;
    const totalElements = Number(apiPayload.totalElements ?? normalizedItems.length);
    const totalPages = Math.max(
      1,
      Number(apiPayload.totalPages ?? Math.ceil(totalElements / pageSize))
    );

    return {
      content: normalizedItems,
      pageNumber,
      pageSize,
      totalElements,
      totalPages,
      last: Boolean(apiPayload.last ?? pageNumber >= totalPages - 1),
      isFallback: false
    };
  }

  // Nếu API trả về mảng thuần, thực hiện lọc và phân trang phía client
  const filtered = filterAndSortProducts(normalizedItems, params);
  const pageSize = Number(params?.size ?? params?.itemsPerPage ?? (filtered.length || 8));
  const pageNumber = Math.max(
    0,
    params?.page !== undefined
      ? Number(params.page)
      : params?.currentPage
      ? Number(params.currentPage) - 1
      : 0
  );
  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
  const safePageNumber = Math.min(pageNumber, totalPages - 1);
  const start = safePageNumber * pageSize;
  const pagedContent =
    params?.page !== undefined || params?.currentPage !== undefined
      ? filtered.slice(start, start + pageSize)
      : filtered;

  return {
    content: pagedContent,
    pageNumber: safePageNumber,
    pageSize,
    totalElements,
    totalPages,
    last: safePageNumber >= totalPages - 1,
    isFallback: false
  };
};

export const productService = {
  /**
   * Lấy danh mục sản phẩm có phân trang chuẩn `PagedResponse` phục vụ trang `/products` (ECOM-106 / ECOM-209)
   * Gọi `GET /api/v1/products` với đầy đủ tham số `keyword`, `category`, `page`, `size`, `sort`
   */
  getCatalog: async (params = {}) => {
    if (params?.simulateError) {
      throw new Error(
        typeof params.simulateError === 'string'
          ? params.simulateError
          : 'Không thể kết nối tới máy chủ sản phẩm. Vui lòng thử lại!'
      );
    }

    const pageSize = Number(params?.size ?? params?.itemsPerPage ?? 8) || 8;
    const pageNumber = Math.max(
      0,
      params?.page !== undefined
        ? Number(params.page)
        : params?.currentPage
        ? Number(params.currentPage) - 1
        : 0
    );
    const keyword = (params?.keyword ?? params?.search ?? '').trim();
    const category = (params?.category ?? params?.selectedCategory ?? '').trim();
    const sortOrder = params?.sortOrder ?? params?.sort ?? '';

    const queryParams = {
      page: pageNumber,
      size: pageSize
    };
    if (keyword) queryParams.keyword = keyword;
    if (category && category !== 'ALL') queryParams.category = category;
    const mappedSort = mapSortParam(sortOrder);
    if (mappedSort) queryParams.sort = mappedSort;

    try {
      const response = await api.get('/products', { params: queryParams });
      const extracted = extractPagedProducts(response, {
        ...params,
        page: pageNumber,
        size: pageSize
      });

      // Nếu người dùng có chọn bộ lọc/sắp xếp mà Backend trả về danh sách thô cần hậu kiểm
      if (category || sortOrder) {
        const refinedContent = filterAndSortProducts(extracted.content, {
          category,
          keyword,
          sortOrder
        });
        return {
          ...extracted,
          content: refinedContent
        };
      }

      return extracted;
    } catch (err) {
      if (params?.rejectOnError) {
        throw new Error(
          err?.message || 'Máy chủ sản phẩm hiện không phản hồi. Vui lòng thử lại sau!'
        );
      }

      // Fallback thông minh về dữ liệu cục bộ để Guest vẫn trải nghiệm được lọc + tìm kiếm + phân trang
      const filtered = filterAndSortProducts(localProducts, {
        category,
        keyword,
        sortOrder
      });
      const totalElements = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalElements / pageSize));
      const safePageNumber = Math.min(pageNumber, totalPages - 1);
      const start = safePageNumber * pageSize;
      const content = filtered.slice(start, start + pageSize);

      return {
        content,
        pageNumber: safePageNumber,
        pageSize,
        totalElements,
        totalPages,
        last: safePageNumber >= totalPages - 1,
        isFallback: true,
        fallbackMessage:
          err?.message || 'Đang hiển thị dữ liệu danh mục dự phòng do máy chủ Backend tạm ngưng.'
      };
    }
  },

  /**
   * Lấy danh sách sản phẩm dạng mảng chuẩn hóa (`Array`) để tương thích an toàn với `<ProductGrid />`,
   * `Home.jsx`, `AdminProducts.jsx` và không bao giờ gây lỗi `products.map is not a function`
   * khi Backend trả về `PagedResponse`.
   */
  getAll: async (params = {}) => {
    if (params?.simulateError) {
      throw new Error(
        typeof params.simulateError === 'string'
          ? params.simulateError
          : 'Không thể tải danh sách sản phẩm từ máy chủ.'
      );
    }

    const keyword = (params?.keyword ?? params?.search ?? '').trim();
    const category = (params?.category ?? params?.selectedCategory ?? '').trim();
    const sortOrder = params?.sortOrder ?? params?.sort ?? '';

    const queryParams = {};
    if (keyword) queryParams.keyword = keyword;
    if (category && category !== 'ALL') queryParams.category = category;
    if (params?.page !== undefined) queryParams.page = Number(params.page);
    if (params?.size !== undefined) queryParams.size = Number(params.size);
    const mappedSort = mapSortParam(sortOrder);
    if (mappedSort) queryParams.sort = mappedSort;

    try {
      const response = await api.get('/products', { params: queryParams });
      const extracted = extractPagedProducts(response, params);
      const list = filterAndSortProducts(extracted.content, {
        category,
        keyword,
        sortOrder
      });
      Object.defineProperty(list, 'pagination', {
        value: {
          pageNumber: extracted.pageNumber,
          pageSize: extracted.pageSize,
          totalElements: extracted.totalElements,
          totalPages: extracted.totalPages,
          last: extracted.last
        },
        enumerable: false
      });
      return list;
    } catch (err) {
      if (params?.rejectOnError) {
        throw err;
      }
      const filtered = filterAndSortProducts(localProducts, {
        category,
        keyword,
        sortOrder
      });
      if (params?.page !== undefined || params?.size !== undefined) {
        const size = Number(params.size ?? 8) || 8;
        const page = Math.max(0, Number(params.page ?? 0));
        const paged = filtered.slice(page * size, (page + 1) * size);
        Object.defineProperty(paged, 'pagination', {
          value: {
            pageNumber: page,
            pageSize: size,
            totalElements: filtered.length,
            totalPages: Math.max(1, Math.ceil(filtered.length / size)),
            last: (page + 1) * size >= filtered.length,
            isFallback: true
          },
          enumerable: false
        });
        return paged;
      }
      return filtered;
    }
  },

  getById: async (id) => {
    try {
      const data = await api.get(`/products/${id}`);
      return normalizeProduct(data);
    } catch {
      const found = localProducts.find(
        (p) => String(p.id) === String(id) || (p.sku && String(p.sku) === String(id))
      );
      if (!found) {
        throw new Error('Không tìm thấy sản phẩm!');
      }
      return normalizeProduct(found);
    }
  },

  create: async (productData) => {
    try {
      const created = await api.post('/products', productData);
      return normalizeProduct(created);
    } catch {
      const newProd = normalizeProduct({
        id: Date.now(),
        ...productData,
        price: Number(productData.price) || 0,
        stock: Number(productData.stock ?? productData.stockQuantity) || 0
      });
      localProducts.unshift(newProd);
      return newProd;
    }
  },

  update: async (id, productData) => {
    try {
      const updated = await api.put(`/products/${id}`, productData);
      return normalizeProduct(updated);
    } catch {
      let updatedItem = null;
      localProducts = localProducts.map((p) => {
        if (String(p.id) === String(id)) {
          updatedItem = normalizeProduct({ ...p, ...productData });
          return updatedItem;
        }
        return p;
      });
      return updatedItem || normalizeProduct({ id, ...productData });
    }
  },

  delete: async (id) => {
    try {
      return await api.delete(`/products/${id}`);
    } catch {
      localProducts = localProducts.filter((p) => String(p.id) !== String(id));
      return { success: true, id };
    }
  }
};

export default productService;
