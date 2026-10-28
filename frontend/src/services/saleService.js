import { INITIAL_CAMPAIGNS, INITIAL_FLASH_PRODUCTS, FLASH_TIME_SLOTS } from '../mock/mockSales';

const STORAGE_KEYS = {
  CAMPAIGNS: 'shopmart_sale_campaigns',
  PRODUCTS: 'shopmart_sale_products',
  WISHLIST: 'shopmart_wishlist'
};

const getStoredData = (key, fallback) => {
  try {
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
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Lỗi lưu localStorage cho key ${key}:`, e);
  }
};

export const saleService = {
  // 1. Lấy danh sách toàn bộ chiến dịch Sale
  getAllCampaigns: () => {
    const list = getStoredData(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
    return Array.isArray(list) ? list : INITIAL_CAMPAIGNS;
  },

  // 2. Lấy chi tiết chiến dịch theo ID
  getCampaignById: (id) => {
    const campaigns = saleService.getAllCampaigns();
    return campaigns.find((c) => String(c.id) === String(id) || String(c.code) === String(id));
  },

  // 3. Lấy chiến dịch đang hoạt động chính (ACTIVE)
  getActiveCampaign: () => {
    const campaigns = saleService.getAllCampaigns();
    return campaigns.find((c) => c.status === 'ACTIVE') || campaigns[0] || null;
  },

  // 4. Lấy danh sách sản phẩm Flash Sale
  getAllProducts: () => {
    const list = getStoredData(STORAGE_KEYS.PRODUCTS, INITIAL_FLASH_PRODUCTS);
    return Array.isArray(list) ? list : INITIAL_FLASH_PRODUCTS;
  },

  // 5. Lấy sản phẩm Flash Sale theo ID
  getProductById: (id) => {
    const products = saleService.getAllProducts();
    return products.find((p) => String(p.id) === String(id) || String(p.sku) === String(id));
  },

  // 6. Đồng bộ giá Flash Sale cho sản phẩm khi Admin cấu hình
  syncProductPrices: (customProducts) => {
    if (!customProducts || !Array.isArray(customProducts)) return;
    const products = saleService.getAllProducts();
    const updated = products.map((prod) => {
      const match = customProducts.find((cp) => String(cp.productId) === String(prod.id) || String(cp.id) === String(prod.id));
      if (match) {
        const salePrice = Number(match.salePrice) || prod.salePrice || prod.price;
        const discountPercent = prod.price > 0 ? Math.round(((prod.price - salePrice) / prod.price) * 100) : prod.discountPercent;
        return {
          ...prod,
          salePrice,
          discountPercent,
          isFlashSale: true
        };
      }
      return prod;
    });
    setStoredData(STORAGE_KEYS.PRODUCTS, updated);
  },

  // 7. Tạo chiến dịch mới
  createCampaign: (campaignData) => {
    const campaigns = saleService.getAllCampaigns();
    const newId = `camp-${Date.now()}`;
    const newCode = campaignData.code || `FS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCampaign = {
      id: newId,
      code: newCode,
      revenue: 0,
      targetRevenue: Number(campaignData.targetRevenue) || 100000000,
      soldQuantity: 0,
      targetQuantity: Number(campaignData.targetQuantity) || 500,
      percentSold: 0,
      channel: 'Website + App Omnichannel',
      badgeText: campaignData.badgeText || '-30%',
      categoryTag: campaignData.categoryTag || 'Flash Sale Độc Quyền',
      ...campaignData,
      productCount: campaignData.productIds ? campaignData.productIds.length : (campaignData.products?.length || 0)
    };

    let updated = [newCampaign, ...campaigns];
    if (newCampaign.status === 'ACTIVE') {
      updated = updated.map((c) => (c.id === newId ? c : { ...c, status: c.status === 'ACTIVE' ? 'UPCOMING' : c.status }));
    }
    setStoredData(STORAGE_KEYS.CAMPAIGNS, updated);

    if (campaignData.customProducts && campaignData.customProducts.length > 0) {
      saleService.syncProductPrices(campaignData.customProducts);
    }

    return newCampaign;
  },

  // 8. Cập nhật chiến dịch
  updateCampaign: (id, campaignData) => {
    const campaigns = saleService.getAllCampaigns();
    const updated = campaigns.map((c) => {
      if (String(c.id) === String(id)) {
        return {
          ...c,
          ...campaignData,
          productCount: campaignData.productIds ? campaignData.productIds.length : (campaignData.products?.length || c.productCount)
        };
      }
      if (campaignData.status === 'ACTIVE' && c.status === 'ACTIVE' && String(c.id) !== String(id)) {
        return { ...c, status: 'UPCOMING' };
      }
      return c;
    });
    setStoredData(STORAGE_KEYS.CAMPAIGNS, updated);

    if (campaignData.customProducts && campaignData.customProducts.length > 0) {
      saleService.syncProductPrices(campaignData.customProducts);
    }

    return updated.find((c) => String(c.id) === String(id));
  },

  // 9. Đổi trạng thái chiến dịch (Active <-> Inactive/Draft)
  toggleCampaignStatus: (id) => {
    const campaigns = saleService.getAllCampaigns();
    const target = campaigns.find((c) => String(c.id) === String(id));
    if (!target) return null;
    const nextStatus = target.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';

    const updated = campaigns.map((c) => {
      if (String(c.id) === String(id)) {
        return { ...c, status: nextStatus };
      }
      if (nextStatus === 'ACTIVE' && c.status === 'ACTIVE') {
        return { ...c, status: 'UPCOMING' };
      }
      return c;
    });
    setStoredData(STORAGE_KEYS.CAMPAIGNS, updated);
    return updated.find((c) => String(c.id) === String(id));
  },

  // 9. Xóa chiến dịch
  deleteCampaign: (id) => {
    const campaigns = saleService.getAllCampaigns();
    const updated = campaigns.filter((c) => String(c.id) !== String(id));
    setStoredData(STORAGE_KEYS.CAMPAIGNS, updated);
    return true;
  },

  // 10. Lấy danh sách khung giờ Flash Sale
  getTimeSlots: () => {
    return Array.isArray(FLASH_TIME_SLOTS) ? FLASH_TIME_SLOTS : [];
  },

  // 11. Wishlist helpers
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

  // 12. Reset to default initial mock data
  resetMockData: () => {
    setStoredData(STORAGE_KEYS.CAMPAIGNS, INITIAL_CAMPAIGNS);
    setStoredData(STORAGE_KEYS.PRODUCTS, INITIAL_FLASH_PRODUCTS);
    setStoredData(STORAGE_KEYS.WISHLIST, ['fs-1']);
  }
};

export default saleService;
