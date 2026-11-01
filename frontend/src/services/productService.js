import api from './api';
import { INITIAL_PRODUCTS } from './mockData';
import { INITIAL_FLASH_PRODUCTS } from '../mock/mockSales';
import { CATEGORY_ALIAS_MAP, matchesCategoryFilter } from './categoryService';

const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80';

/**
 * Chuẩn hóa từ khóa tìm kiếm: cắt khoảng trắng đầu/cuối và gộp khoảng trắng thừa ở giữa
 */
export const normalizeKeyword = (raw = '') =>
  String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();

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
export const mapSortParam = (sortOrder) => {
  switch (sortOrder) {
    case 'price_asc':
    case 'price,asc':
      return 'price,asc';
    case 'price_desc':
    case 'price,desc':
      return 'price,desc';
    case 'name_asc':
    case 'name,asc':
      return 'name,asc';
    case 'name_desc':
    case 'name,desc':
      return 'name,desc';
    case 'newest':
    case 'createdAt,desc':
      return 'createdAt,desc';
    default:
      return undefined;
  }
};

/**
 * Kiểm tra tính hợp lệ của tham số bộ lọc trước khi gửi lên Backend ProductFilterRequest
 */
export const validateProductFilterParams = (params = {}) => {
  const minRaw = params?.minPrice;
  const maxRaw = params?.maxPrice;

  const hasMin = minRaw !== undefined && minRaw !== null && String(minRaw).trim() !== '';
  const hasMax = maxRaw !== undefined && maxRaw !== null && String(maxRaw).trim() !== '';

  const minPrice = hasMin ? Number(minRaw) : null;
  const maxPrice = hasMax ? Number(maxRaw) : null;

  if (hasMin && (Number.isNaN(minPrice) || minPrice < 0)) {
    throw new Error('Giá tối thiểu (minPrice) không được nhỏ hơn 0');
  }

  if (hasMax && (Number.isNaN(maxPrice) || maxPrice < 0)) {
    throw new Error('Giá tối đa (maxPrice) không được nhỏ hơn 0');
  }

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    throw new Error('Giá tối thiểu (minPrice) không được lớn hơn giá tối đa (maxPrice)');
  }

  return { minPrice, maxPrice };
};

/**
 * Áp dụng lọc danh mục, từ khóa, khoảng giá, tồn kho và sắp xếp trên danh sách sản phẩm
 */
export const filterAndSortProducts = (items = [], params = {}) => {
  const { minPrice, maxPrice } = validateProductFilterParams(params);
  let result = [...items].map(normalizeProduct).filter(Boolean);

  // 1. Lọc theo danh mục (category / categoryId)
  const categoryParam = String(
    params?.category ?? params?.selectedCategory ?? params?.categoryId ?? ''
  ).trim();
  if (categoryParam && categoryParam !== 'ALL') {
    result = result.filter((p) =>
      matchesCategoryFilter(p.category, categoryParam, p.categoryId)
    );
  }

  // 2. Tìm kiếm theo từ khóa (tên sản phẩm, danh mục, mô tả)
  const keywordParam = normalizeKeyword(params?.keyword ?? params?.search ?? '');
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

  // 3. Lọc theo khoảng giá (minPrice, maxPrice)
  if (minPrice !== null) {
    result = result.filter((p) => Number(p.salePrice ?? p.price ?? 0) >= minPrice);
  }
  if (maxPrice !== null) {
    result = result.filter((p) => Number(p.salePrice ?? p.price ?? 0) <= maxPrice);
  }

  // 4. Lọc theo tình trạng còn hàng (inStock = true => stockQuantity > 0)
  const inStockParam =
    params?.inStock === true || String(params?.inStock).toLowerCase() === 'true';
  if (inStockParam) {
    result = result.filter((p) => Number(p.stockQuantity ?? p.stock ?? 0) > 0);
  }

  // 5. Sắp xếp toàn bộ tập dữ liệu trước khi cắt trang
  const sortOrder = params?.sortOrder ?? params?.sort ?? '';
  if (sortOrder === 'price_asc' || sortOrder === 'price,asc') {
    result.sort(
      (a, b) => Number(a.salePrice ?? a.price ?? 0) - Number(b.salePrice ?? b.price ?? 0)
    );
  } else if (sortOrder === 'price_desc' || sortOrder === 'price,desc') {
    result.sort(
      (a, b) => Number(b.salePrice ?? b.price ?? 0) - Number(a.salePrice ?? a.price ?? 0)
    );
  } else if (sortOrder === 'name_asc' || sortOrder === 'name,asc') {
    result.sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi'));
  } else if (sortOrder === 'name_desc' || sortOrder === 'name,desc') {
    result.sort((a, b) => String(b.name).localeCompare(String(a.name), 'vi'));
  }

  return result;
};

/**
 * Xây dựng queryParams chuẩn khớp với Backend `ProductController.getProducts(ProductFilterRequest, Pageable)`
 */
export const buildProductQueryParams = (params = {}) => {
  const { minPrice, maxPrice } = validateProductFilterParams(params);

  const pageSize = Number(params?.size ?? params?.itemsPerPage ?? 8) || 8;
  const pageNumber = Math.max(
    0,
    params?.page !== undefined
      ? Number(params.page)
      : params?.currentPage
      ? Number(params.currentPage) - 1
      : 0
  );
  const keyword = normalizeKeyword(params?.keyword ?? params?.search ?? '');
  const category = String(params?.category ?? params?.selectedCategory ?? '').trim();
  const explicitCategoryId = params?.categoryId;
  const sortOrder = params?.sortOrder ?? params?.sort ?? '';
  const inStock =
    params?.inStock === true || String(params?.inStock).toLowerCase() === 'true';

  const queryParams = {
    page: pageNumber,
    size: pageSize
  };

  if (keyword) {
    queryParams.keyword = keyword;
  }

  if (explicitCategoryId !== undefined && explicitCategoryId !== null && String(explicitCategoryId).trim() !== '') {
    const numId = Number(explicitCategoryId);
    if (Number.isInteger(numId) && numId > 0) {
      queryParams.categoryId = numId;
    } else {
      queryParams.category = String(explicitCategoryId).trim();
    }
  } else if (category && category !== 'ALL') {
    const numId = Number(category);
    if (Number.isInteger(numId) && numId > 0) {
      queryParams.categoryId = numId;
    }
    queryParams.category = category;
  }

  if (minPrice !== null) {
    queryParams.minPrice = minPrice;
  }
  if (maxPrice !== null) {
    queryParams.maxPrice = maxPrice;
  }
  if (inStock) {
    queryParams.inStock = true;
  }

  const mappedSort = mapSortParam(sortOrder);
  if (mappedSort) {
    queryParams.sort = mappedSort;
  }

  return {
    queryParams,
    pageNumber,
    pageSize,
    keyword,
    category,
    minPrice,
    maxPrice,
    inStock,
    sortOrder
  };
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

  // Nếu API trả về mảng thuần, thực hiện lọc, sắp xếp trên toàn bộ tập dữ liệu rồi mới phân trang
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
   * Lấy danh mục sản phẩm có phân trang chuẩn `PagedResponse` phục vụ trang `/products`
   * (ECOM-106 / ECOM-209 / ECOM-226 / ECOM-227)
   * Gọi `GET /api/v1/products` với đầy đủ tham số `keyword`, `category`, `categoryId`, `minPrice`, `maxPrice`, `inStock`, `page`, `size`, `sort`
   */
  getCatalog: async (params = {}) => {
    if (params?.simulateError) {
      throw new Error(
        typeof params.simulateError === 'string'
          ? params.simulateError
          : 'Không thể kết nối tới máy chủ sản phẩm. Vui lòng thử lại!'
      );
    }

    // Kiểm tra hợp lệ tham số lọc trước khi gọi API (không gửi tham số không hợp lệ lên Backend)
    const {
      queryParams,
      pageNumber,
      pageSize,
      keyword,
      category,
      minPrice,
      maxPrice,
      inStock,
      sortOrder
    } = buildProductQueryParams(params);

    try {
      const response = await api.get('/products', { params: queryParams });
      const extracted = extractPagedProducts(response, {
        ...params,
        page: pageNumber,
        size: pageSize
      });

      return extracted;
    } catch (err) {
      const strictApiMode =
        params?.rejectOnError === true ||
        params?.allowMockFallback === false ||
        (typeof import.meta !== 'undefined' &&
          import.meta.env &&
          import.meta.env.VITE_STRICT_API === 'true');

      if (strictApiMode) {
        throw new Error(
          err?.message || 'Máy chủ sản phẩm hiện không phản hồi. Vui lòng thử lại sau!'
        );
      }

      // Chế độ dự phòng cục bộ khi chạy Frontend độc lập (opt-in demo mode)
      const filtered = filterAndSortProducts(localProducts, {
        category,
        keyword,
        minPrice,
        maxPrice,
        inStock,
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

    const {
      queryParams,
      keyword,
      category,
      minPrice,
      maxPrice,
      inStock,
      sortOrder
    } = buildProductQueryParams(params);

    if (params?.page === undefined && params?.currentPage === undefined) {
      delete queryParams.page;
    }
    if (params?.size === undefined && params?.itemsPerPage === undefined) {
      delete queryParams.size;
    }

    try {
      const response = await api.get('/products', { params: queryParams });
      const extracted = extractPagedProducts(response, params);
      const list = [...extracted.content];
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
      if (params?.rejectOnError || params?.allowMockFallback === false) {
        throw err;
      }
      const filtered = filterAndSortProducts(localProducts, {
        category,
        keyword,
        minPrice,
        maxPrice,
        inStock,
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

  /**
   * Kiểm tra tồn kho sản phẩm theo ID và số lượng yêu cầu (ECOM-111 / ECOM-219 / ECOM-221)
   * Gọi API: GET /api/v1/products/{id}/stock?quantity=1
   */
  checkStock: async (id, quantity = 1) => {
    const requestedQty = Math.max(1, Number(quantity) || 1);
    try {
      const stockData = await api.get(`/products/${id}/stock`, {
        params: { quantity: requestedQty }
      });
      if (stockData && typeof stockData === 'object') {
        const stockQuantity = Number(stockData.stockQuantity ?? 0);
        const isActive = (stockData.status || 'ACTIVE') === 'ACTIVE';
        const inStock = Boolean(stockData.inStock ?? (isActive && stockQuantity > 0));
        const sufficientStock = Boolean(
          stockData.sufficientStock ?? (inStock && stockQuantity >= requestedQty)
        );
        return {
          productId: stockData.productId ?? id,
          productName: stockData.productName ?? '',
          stockQuantity,
          requestedQuantity: Number(stockData.requestedQuantity ?? requestedQty),
          status: stockData.status || 'ACTIVE',
          inStock,
          sufficientStock,
          stockStatusMessage:
            stockData.stockStatusMessage ||
            (inStock
              ? sufficientStock
                ? `Còn hàng (${stockQuantity} sản phẩm có sẵn)`
                : `Không đủ số lượng tồn kho (Chỉ còn ${stockQuantity} sản phẩm)`
              : 'Hết hàng')
        };
      }
    } catch {
      // Fallback tính toán từ dữ liệu sản phẩm hiện có khi offline
    }

    const found = localProducts.find(
      (p) => String(p.id) === String(id) || (p.sku && String(p.sku) === String(id))
    );
    if (!found) {
      throw new Error('Không tìm thấy sản phẩm để kiểm tra tồn kho!');
    }
    const stockQuantity = Math.max(0, Number(found.stockQuantity ?? found.stock ?? 0));
    const isActive = (found.status || 'ACTIVE') === 'ACTIVE';
    const inStock = isActive && stockQuantity > 0;
    const sufficientStock = inStock && stockQuantity >= requestedQty;

    return {
      productId: found.id,
      productName: found.name,
      stockQuantity,
      requestedQuantity: requestedQty,
      status: found.status || 'ACTIVE',
      inStock,
      sufficientStock,
      stockStatusMessage: !isActive
        ? 'Sản phẩm đã ngừng kinh doanh'
        : !inStock
        ? 'Hết hàng'
        : !sufficientStock
        ? `Không đủ số lượng tồn kho (Chỉ còn ${stockQuantity} sản phẩm)`
        : `Còn hàng (${stockQuantity} sản phẩm có sẵn)`
    };
  },

  /**
   * Lấy danh sách sản phẩm phân trang dành cho Admin (ECOM-133 / ECOM-246)
   * Gọi API: GET /api/v1/products/admin
   */
  getAdminProducts: async (params = {}) => {
    const queryParams = {};
    if (params?.keyword) queryParams.keyword = normalizeKeyword(params.keyword);
    if (params?.status && params.status !== 'ALL') queryParams.status = params.status;
    if (params?.page !== undefined) queryParams.page = Math.max(0, Number(params.page) || 0);
    if (params?.size !== undefined) queryParams.size = Number(params.size) || 20;

    try {
      const response = await api.get('/products/admin', { params: queryParams });
      const extracted = extractPagedProducts(response, params);
      return extracted.content;
    } catch {
      return [...localProducts];
    }
  },

  create: async (productData) => {
    const name = String(productData?.name ?? '').trim();
    const price = Number(productData?.price);
    const stockQuantity = Number(productData?.stockQuantity ?? productData?.stock ?? 0);

    if (!name) {
      throw new Error('Tên sản phẩm không được để trống');
    }
    if (Number.isNaN(price) || price <= 0) {
      throw new Error('Giá sản phẩm phải lớn hơn 0');
    }
    if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
      throw new Error('Số lượng tồn kho không được nhỏ hơn 0');
    }

    const payload = {
      name,
      category: String(productData?.category ?? 'Chưa phân loại').trim(),
      price,
      stockQuantity,
      description: String(productData?.description ?? '').trim(),
      imageUrl: String(productData?.imageUrl ?? productData?.image ?? '').trim() || DEFAULT_PRODUCT_IMAGE
    };

    try {
      const created = await api.post('/products', payload);
      const normalized = normalizeProduct(created);
      localProducts = [normalized, ...localProducts.filter((p) => String(p.id) !== String(normalized.id))];
      return normalized;
    } catch {
      const newProd = normalizeProduct({
        id: Date.now(),
        ...payload,
        stock: stockQuantity,
        status: 'ACTIVE'
      });
      localProducts.unshift(newProd);
      return newProd;
    }
  },

  update: async (id, productData) => {
    const existing = localProducts.find((p) => String(p.id) === String(id)) || {};
    const name = String(productData?.name ?? existing.name ?? '').trim();
    const price = Number(productData?.price ?? existing.price ?? 0);
    const stockQuantity = Number(
      productData?.stockQuantity ?? productData?.stock ?? existing.stockQuantity ?? existing.stock ?? 0
    );

    if (!name) {
      throw new Error('Tên sản phẩm không được để trống');
    }
    if (Number.isNaN(price) || price <= 0) {
      throw new Error('Giá sản phẩm phải lớn hơn 0');
    }
    if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
      throw new Error('Số lượng tồn kho không được nhỏ hơn 0');
    }

    const payload = {
      name,
      category: String(productData?.category ?? existing.category ?? 'Chưa phân loại').trim(),
      price,
      stockQuantity,
      description: String(productData?.description ?? existing.description ?? '').trim(),
      imageUrl:
        String(productData?.imageUrl ?? productData?.image ?? existing.imageUrl ?? '').trim() ||
        DEFAULT_PRODUCT_IMAGE,
      status: productData?.status || existing.status || 'ACTIVE'
    };

    try {
      const updated = await api.put(`/products/${id}`, payload);
      const normalized = normalizeProduct(updated);
      localProducts = localProducts.map((p) => (String(p.id) === String(id) ? normalized : p));
      return normalized;
    } catch {
      let updatedItem = null;
      localProducts = localProducts.map((p) => {
        if (String(p.id) === String(id)) {
          updatedItem = normalizeProduct({ ...p, ...payload, stock: stockQuantity });
          return updatedItem;
        }
        return p;
      });
      return updatedItem || normalizeProduct({ id, ...payload, stock: stockQuantity });
    }
  },

  delete: async (id) => {
    try {
      await api.delete(`/products/${id}`);
    } catch {
      // Fallback xóa mềm / xóa khỏi danh sách cục bộ khi offline
    }
    localProducts = localProducts.filter((p) => String(p.id) !== String(id));
    return { success: true, id };
  }
};

export default productService;
