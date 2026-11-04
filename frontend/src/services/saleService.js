import api from './api';
import { INITIAL_CAMPAIGNS, INITIAL_FLASH_PRODUCTS, FLASH_TIME_SLOTS } from '../mock/mockSales';

const STORAGE_KEYS = {
  CAMPAIGNS: 'shopmart_sale_campaigns',
  PRODUCTS: 'shopmart_sale_products',
  WISHLIST: 'shopmart_wishlist'
};

const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80';
const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80';

const getStoredData = (key, fallback) => {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed === null || parsed === undefined) return fallback;
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    return parsed;
  } catch (e) {
    console.warn(`Lỗi đọc localStorage cho key ${key}:`, e);
    return fallback;
  }
};

const setStoredData = (key, data) => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Lỗi lưu localStorage cho key ${key}:`, e);
  }
};

/**
 * Chuẩn hóa chuỗi ngày giờ sang định dạng ISO LocalDateTime (YYYY-MM-DDTHH:mm:ss) cho Spring Boot
 */
const toBackendLocalDateTime = (value) => {
  if (!value) return null;
  const str = String(value).trim();
  // Nếu từ input datetime-local dạng "2026-11-01T22:30"
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(str)) {
    return `${str}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str)) {
    return str.replace(/Z$/, '').slice(0, 19);
  }
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return str;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/**
 * Chuẩn hóa FlashSaleItemResponse từ Backend sang cấu trúc UI Product Card
 */
export const normalizeFlashSaleItemToProduct = (item, campaign = null) => {
  if (!item) return null;
  const originalPrice = Number(item.originalPrice ?? item.price ?? item.flashSalePrice ?? 0);
  const salePrice = Number(item.flashSalePrice ?? item.salePrice ?? originalPrice);
  const discountPercent =
    originalPrice > 0 && originalPrice > salePrice
      ? Math.round(((originalPrice - salePrice) / originalPrice) * 100)
      : 0;
  const quantity = Number(item.quantity ?? item.quota ?? item.stock ?? 1);
  const soldQuantity = Number(item.soldQuantity ?? item.sold ?? 0);
  const remainingStock = Number(item.remainingStock ?? Math.max(0, quantity - soldQuantity));

  return {
    id: item.productId ?? item.id,
    productId: item.productId ?? item.id,
    sku: item.sku || `SKU-${item.productId ?? item.id}`,
    name: item.productName || item.name || `Sản phẩm #${item.productId ?? item.id}`,
    shortName: item.productName || item.shortName || item.name || `Sản phẩm #${item.productId ?? item.id}`,
    category: item.category || 'Công nghệ',
    price: originalPrice,
    originalPrice,
    salePrice,
    flashSalePrice: salePrice,
    discountPercent,
    stock: quantity,
    stockQuantity: remainingStock,
    remainingStock,
    sold: soldQuantity,
    soldQuantity,
    userLimit: Number(item.userLimit ?? 2),
    imageUrl: item.imageUrl || DEFAULT_PRODUCT_IMAGE,
    isFlashSale: true,
    campaignId: campaign?.id ?? item.campaignId ?? null,
    campaignStatus: campaign?.status ?? item.campaignStatus ?? 'ACTIVE',
    startTime: campaign?.startTime ?? item.startTime ?? null,
    endTime: campaign?.endTime ?? item.endTime ?? null
  };
};

/**
 * Chuẩn hóa FlashSaleCampaignResponse từ Backend sang cấu trúc UI AdminSales & FlashSale
 */
export const normalizeCampaignResponse = (camp) => {
  if (!camp || typeof camp !== 'object') return null;

  const items = Array.isArray(camp.items) ? camp.items : [];
  const hasBackendItems = items.length > 0;

  const soldQuantity = hasBackendItems
    ? items.reduce((sum, i) => sum + Number(i.soldQuantity ?? 0), 0)
    : Number(camp.soldQuantity ?? 0);
  const targetQuantity = hasBackendItems
    ? items.reduce((sum, i) => sum + Number(i.quantity ?? 0), 0)
    : Number(camp.targetQuantity ?? 100);
  const percentSold =
    targetQuantity > 0
      ? Math.min(100, Math.round((soldQuantity / targetQuantity) * 100))
      : Number(camp.percentSold ?? 0);

  const revenue = hasBackendItems
    ? items.reduce((sum, i) => sum + Number(i.flashSalePrice ?? 0) * Number(i.soldQuantity ?? 0), 0)
    : Number(camp.revenue ?? 0);
  const targetRevenue = hasBackendItems
    ? items.reduce((sum, i) => sum + Number(i.flashSalePrice ?? 0) * Number(i.quantity ?? 0), 0)
    : Number(camp.targetRevenue ?? 100000000);

  let maxDiscount = 30;
  if (hasBackendItems) {
    const discounts = items.map((i) => {
      const orig = Number(i.originalPrice ?? 0);
      const sale = Number(i.flashSalePrice ?? 0);
      return orig > sale && orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;
    });
    const computedMax = Math.max(0, ...discounts);
    if (computedMax > 0) maxDiscount = computedMax;
  }

  const year = camp.startTime ? new Date(camp.startTime).getFullYear() : new Date().getFullYear();
  const code = camp.code || `FS-${Number.isNaN(year) ? 2026 : year}-${String(camp.id).padStart(4, '0')}`;

  const customProducts = hasBackendItems
    ? items.map((i) => ({
        productId: i.productId,
        name: i.productName || `Sản phẩm #${i.productId}`,
        sku: `SKU-${i.productId}`,
        originalPrice: Number(i.originalPrice ?? i.flashSalePrice ?? 0),
        salePrice: Number(i.flashSalePrice ?? 0),
        quota: Number(i.quantity ?? 1),
        soldQuantity: Number(i.soldQuantity ?? 0),
        userLimit: Number(i.userLimit ?? 2),
        imageUrl: i.imageUrl || DEFAULT_PRODUCT_IMAGE
      }))
    : camp.customProducts || [];

  return {
    ...camp,
    id: camp.id,
    code,
    name: camp.name || 'Chiến dịch Flash Sale',
    description:
      camp.description ||
      'Chương trình khuyến mãi Flash Sale giờ vàng với giá ưu đãi giới hạn số lượng.',
    bannerUrl: camp.bannerUrl || items[0]?.imageUrl || DEFAULT_BANNER,
    startTime: camp.startTime,
    endTime: camp.endTime,
    status: camp.status || 'UPCOMING',
    userLimit: Number(items[0]?.userLimit ?? camp.userLimit ?? 2),
    items,
    customProducts,
    productIds: hasBackendItems ? items.map((i) => i.productId) : camp.productIds || [],
    productCount: hasBackendItems ? items.length : Number(camp.productCount ?? 0),
    soldQuantity,
    targetQuantity,
    percentSold,
    revenue,
    targetRevenue,
    channel: camp.channel || 'Website + App Omnichannel',
    badgeText: camp.badgeText || `-${maxDiscount}%`,
    categoryTag: camp.categoryTag || items[0]?.category || 'Flash Sale Độc Quyền'
  };
};

/**
 * Xây dựng request body chuẩn CreateFlashSaleCampaignRequest gửi lên Backend
 */
const buildBackendCampaignRequest = (campaignData) => {
  const defaultLimit = Math.max(1, Number(campaignData.userLimit ?? 2));
  const rawItems = Array.isArray(campaignData.items)
    ? campaignData.items
    : Array.isArray(campaignData.customProducts)
      ? campaignData.customProducts
      : [];

  const items = rawItems
    .map((item) => ({
      productId: Number(item.productId ?? item.id),
      flashSalePrice: Number(item.flashSalePrice ?? item.salePrice ?? 0),
      quantity: Math.max(1, Number(item.quantity ?? item.quota ?? 1)),
      userLimit: Math.max(1, Number(item.userLimit ?? defaultLimit))
    }))
    .filter((item) => Number.isFinite(item.productId) && item.productId > 0);

  return {
    name: String(campaignData.name || '').trim(),
    startTime: toBackendLocalDateTime(campaignData.startTime),
    endTime: toBackendLocalDateTime(campaignData.endTime),
    items
  };
};

const isNetworkUnavailableError = (err) => !err?.response;

export const saleService = {
  // Đọc đồng bộ từ cache localStorage (hỗ trợ khởi tạo state tức thì trước khi API trả về)
  getAllCampaignsSync: () => {
    const list = getStoredData(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
    return Array.isArray(list) ? list : INITIAL_CAMPAIGNS;
  },

  getActiveCampaignSync: () => {
    const campaigns = saleService.getAllCampaignsSync();
    return campaigns.find((c) => c.status === 'ACTIVE') || campaigns[0] || null;
  },

  getAllProductsSync: () => {
    const list = getStoredData(STORAGE_KEYS.PRODUCTS, INITIAL_FLASH_PRODUCTS);
    return Array.isArray(list) ? list : INITIAL_FLASH_PRODUCTS;
  },

  // 1. [ADMIN] Lấy danh sách toàn bộ chiến dịch Flash Sale từ Backend
  getAllCampaigns: async () => {
    try {
      const data = await api.get('/admin/flash-sales/campaigns');
      const list = Array.isArray(data)
        ? data.map(normalizeCampaignResponse).filter(Boolean)
        : [];
      setStoredData(STORAGE_KEYS.CAMPAIGNS, list);
      return list;
    } catch (err) {
      console.warn('[saleService] Fallback getAllCampaigns từ cache/mock:', err?.message);
      return saleService.getAllCampaignsSync();
    }
  },

  // 2. [ADMIN] Lấy chi tiết chiến dịch theo ID từ Backend
  getCampaignById: async (id) => {
    try {
      const data = await api.get(`/admin/flash-sales/campaigns/${id}`);
      return normalizeCampaignResponse(data);
    } catch (err) {
      const campaigns = saleService.getAllCampaignsSync();
      return (
        campaigns.find((c) => String(c.id) === String(id) || String(c.code) === String(id)) || null
      );
    }
  },

  // 3. [PUBLIC] Lấy danh sách các chiến dịch Flash Sale đang hiệu lực từ Backend
  getActiveCampaigns: async () => {
    try {
      const data = await api.get('/flash-sales/active');
      return Array.isArray(data) ? data.map(normalizeCampaignResponse).filter(Boolean) : [];
    } catch (err) {
      console.warn('[saleService] Fallback getActiveCampaigns từ cache/mock:', err?.message);
      return saleService.getAllCampaignsSync().filter((c) => c.status === 'ACTIVE');
    }
  },

  // 4. [PUBLIC] Lấy chiến dịch đang hoạt động chính (ACTIVE)
  getActiveCampaign: async () => {
    try {
      const activeList = await saleService.getActiveCampaigns();
      if (activeList.length > 0) {
        return activeList[0];
      }
      return null;
    } catch {
      return saleService.getActiveCampaignSync();
    }
  },

  // 5. [PUBLIC] Lấy danh sách sản phẩm Flash Sale đang hiệu lực (hoặc danh mục sản phẩm cho Admin chọn)
  getActiveFlashProducts: async () => {
    try {
      const activeCampaigns = await saleService.getActiveCampaigns();
      const seen = new Set();
      const flashProducts = [];
      for (const camp of activeCampaigns) {
        for (const item of camp.items || []) {
          const normalized = normalizeFlashSaleItemToProduct(item, camp);
          if (normalized && !seen.has(String(normalized.id))) {
            seen.add(String(normalized.id));
            flashProducts.push(normalized);
          }
        }
      }
      if (flashProducts.length > 0) {
        setStoredData(STORAGE_KEYS.PRODUCTS, flashProducts);
      }
      return flashProducts;
    } catch (err) {
      console.warn('[saleService] Fallback getActiveFlashProducts:', err?.message);
      return saleService.getAllProductsSync();
    }
  },

  // Lấy toàn bộ sản phẩm thực tế từ Product Service để Admin cấu hình chiến dịch Flash Sale
  getCatalogProductsForAdmin: async () => {
    try {
      const pageData = await api.get('/products', { params: { page: 0, size: 100 } });
      const rawList = Array.isArray(pageData?.content)
        ? pageData.content
        : Array.isArray(pageData)
          ? pageData
          : [];
      if (rawList.length > 0) {
        return rawList.map((p) => ({
          id: p.id,
          productId: p.id,
          sku: `SKU-${p.id}`,
          name: p.name,
          shortName: p.name,
          category: p.category || 'Công nghệ',
          price: Number(p.price ?? 0),
          salePrice: p.activeFlashSale
            ? Number(p.activeFlashSale.flashSalePrice)
            : Math.max(1, Math.round(Number(p.price ?? 0) * 0.8)),
          stock: Number(p.stockQuantity ?? 0),
          stockQuantity: Number(p.stockQuantity ?? 0),
          imageUrl: p.imageUrl || DEFAULT_PRODUCT_IMAGE
        }));
      }
      return saleService.getAllProductsSync();
    } catch {
      return saleService.getAllProductsSync();
    }
  },

  getAllProducts: async () => {
    return saleService.getActiveFlashProducts();
  },

  // 6. Lấy sản phẩm Flash Sale theo ID
  getProductById: (id) => {
    const products = saleService.getAllProductsSync();
    const found = products.find((p) => String(p.id) === String(id) || String(p.sku) === String(id));
    if (!found) return null;
    const totalQuota = Number(found.stock ?? found.quantity ?? found.quota ?? 0);
    const soldQty = Number(found.sold ?? found.soldQuantity ?? 0);
    const remaining =
      found.remainingStock !== undefined
        ? Number(found.remainingStock)
        : Math.max(0, totalQuota - soldQty);
    return {
      ...found,
      isFlashSale: true,
      stock: totalQuota,
      sold: soldQty,
      remainingStock: remaining,
      stockQuantity: remaining
    };
  },

  // 7. [ADMIN] Tạo chiến dịch Flash Sale mới qua REST API
  createCampaign: async (campaignData) => {
    const requestPayload = buildBackendCampaignRequest(campaignData);
    if (requestPayload.items.length > 0) {
      try {
        let created = await api.post('/admin/flash-sales/campaigns', requestPayload);
        // Nếu Admin chủ động chọn trạng thái ACTIVE hoặc ENDED khác trạng thái mặc định theo giờ
        if (
          campaignData.status &&
          ['ACTIVE', 'ENDED', 'CANCELLED'].includes(campaignData.status) &&
          created?.id &&
          created.status !== campaignData.status
        ) {
          created = await api.put(`/admin/flash-sales/campaigns/${created.id}/status`, null, {
            params: { status: campaignData.status }
          });
        }
        return normalizeCampaignResponse(created);
      } catch (err) {
        if (!isNetworkUnavailableError(err)) {
          throw err;
        }
      }
    }

    // Fallback offline demo khi Backend không chạy
    const campaigns = saleService.getAllCampaignsSync();
    const newId = `camp-${Date.now()}`;
    const newCode =
      campaignData.code ||
      `FS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCampaign = normalizeCampaignResponse({
      id: newId,
      code: newCode,
      ...campaignData
    });
    setStoredData(STORAGE_KEYS.CAMPAIGNS, [newCampaign, ...campaigns]);
    return newCampaign;
  },

  // 8. [ADMIN] Cập nhật chiến dịch Flash Sale qua REST API
  updateCampaign: async (id, campaignData) => {
    const requestPayload = buildBackendCampaignRequest(campaignData);
    if (Number.isFinite(Number(id)) && requestPayload.items.length > 0) {
      try {
        let updated = await api.put(`/admin/flash-sales/campaigns/${id}`, requestPayload);
        if (
          campaignData.status &&
          ['UPCOMING', 'ACTIVE', 'ENDED', 'CANCELLED'].includes(campaignData.status) &&
          updated?.status !== campaignData.status
        ) {
          updated = await api.put(`/admin/flash-sales/campaigns/${id}/status`, null, {
            params: { status: campaignData.status }
          });
        }
        return normalizeCampaignResponse(updated);
      } catch (err) {
        if (!isNetworkUnavailableError(err)) {
          throw err;
        }
      }
    }

    // Fallback offline
    const campaigns = saleService.getAllCampaignsSync();
    const updatedList = campaigns.map((c) =>
      String(c.id) === String(id) ? normalizeCampaignResponse({ ...c, ...campaignData }) : c
    );
    setStoredData(STORAGE_KEYS.CAMPAIGNS, updatedList);
    return updatedList.find((c) => String(c.id) === String(id));
  },

  // 9. [ADMIN] Kích hoạt / Tạm dừng / Kết thúc trạng thái chiến dịch qua REST API
  updateCampaignStatus: async (id, status) => {
    if (Number.isFinite(Number(id))) {
      try {
        const backendStatus = status === 'PAUSED' ? 'CANCELLED' : status;
        const updated = await api.put(`/admin/flash-sales/campaigns/${id}/status`, null, {
          params: { status: backendStatus }
        });
        const normalized = normalizeCampaignResponse(updated);
        return status === 'PAUSED' ? { ...normalized, status: 'PAUSED' } : normalized;
      } catch (err) {
        if (!isNetworkUnavailableError(err)) {
          throw err;
        }
      }
    }

    const campaigns = saleService.getAllCampaignsSync();
    const updatedList = campaigns.map((c) =>
      String(c.id) === String(id) ? { ...c, status } : c
    );
    setStoredData(STORAGE_KEYS.CAMPAIGNS, updatedList);
    return updatedList.find((c) => String(c.id) === String(id));
  },

  toggleCampaignStatus: async (id, currentStatus = null) => {
    let statusNow = currentStatus;
    if (!statusNow) {
      const existing = saleService
        .getAllCampaignsSync()
        .find((c) => String(c.id) === String(id));
      statusNow = existing?.status;
    }
    const nextStatus = statusNow === 'ACTIVE' ? 'ENDED' : 'ACTIVE';
    return saleService.updateCampaignStatus(id, nextStatus);
  },

  // 10. [ADMIN] Xóa chiến dịch Flash Sale qua REST API
  deleteCampaign: async (id) => {
    if (Number.isFinite(Number(id))) {
      try {
        await api.delete(`/admin/flash-sales/campaigns/${id}`);
        return true;
      } catch (err) {
        if (!isNetworkUnavailableError(err)) {
          throw err;
        }
      }
    }

    const campaigns = saleService.getAllCampaignsSync();
    const updated = campaigns.filter((c) => String(c.id) !== String(id));
    setStoredData(STORAGE_KEYS.CAMPAIGNS, updated);
    return true;
  },

  // 11. Lấy danh sách khung giờ Flash Sale
  getTimeSlots: () => {
    return Array.isArray(FLASH_TIME_SLOTS) ? FLASH_TIME_SLOTS : [];
  },

  // 12. Wishlist helpers
  getWishlist: () => {
    const list = getStoredData(STORAGE_KEYS.WISHLIST, ['fs-1']);
    return Array.isArray(list) ? list : ['fs-1'];
  },

  toggleWishlist: (productId) => {
    const current = saleService.getWishlist();
    const exists = current.includes(productId);
    const updated = exists ? current.filter((id) => id !== productId) : [...current, productId];
    setStoredData(STORAGE_KEYS.WISHLIST, updated);
    return !exists;
  },

  // 13. Reset to default initial mock data
  resetMockData: () => {
    setStoredData(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
    setStoredData(STORAGE_KEYS.PRODUCTS, INITIAL_FLASH_PRODUCTS);
    setStoredData(STORAGE_KEYS.WISHLIST, ['fs-1']);
  }
};

export default saleService;
