import api from './api';
import { INITIAL_FLASH_PRODUCTS } from '../mock/mockSales';

const CART_STORAGE_KEY = 'shopmart_cart_mock';

// Dữ liệu mẫu khởi đầu giỏ hàng Flash Sale để demo tức thì như trong hình ảnh tham khảo
const DEFAULT_CART_ITEMS = [
  {
    id: 'item-fs-1',
    itemId: 'item-fs-1',
    productId: 'fs-1',
    name: 'MacBook Pro 14 M3 Pro (18GB / 512GB SSD)',
    productName: 'MacBook Pro 14 M3 Pro (18GB / 512GB SSD)',
    resellerTag: 'APPLE AUTHORIZED RESELLER',
    originalPrice: 49990000,
    price: 32490000,
    unitPrice: 32490000,
    salePrice: 32490000,
    discountPercent: 35,
    savedPerUnit: 17500000,
    stockNotice: 'Chỉ còn 3 suất giá sốc',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
    quantity: 1,
    subTotal: 32490000,
    isFlashSale: true
  },
  {
    id: 'item-fs-3',
    itemId: 'item-fs-3',
    productId: 'fs-3',
    name: 'Tai nghe Sony WH-1000XM5 Chống Ồn Cao Cấp',
    productName: 'Tai nghe Sony WH-1000XM5 Chống Ồn Cao Cấp',
    resellerTag: 'SONY OFFICIAL FLAGSHIP',
    originalPrice: 7990000,
    price: 5990000,
    unitPrice: 5990000,
    salePrice: 5990000,
    discountPercent: 25,
    savedPerUnit: 2000000,
    stockNotice: 'Bảo hành chính hãng 12 tháng',
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    quantity: 2,
    subTotal: 11980000,
    isFlashSale: true
  }
];

const getLocalCart = () => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      setLocalCart(DEFAULT_CART_ITEMS);
      return DEFAULT_CART_ITEMS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return DEFAULT_CART_ITEMS;
  }
};

const setLocalCart = (items) => {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Lỗi lưu mock cart vào localStorage:', e);
  }
};

const calculateCartResponse = (items) => {
  const normalized = items.map((item) => {
    const isSale = Boolean(item.salePrice || item.isFlashSale);
    const effectiveUnitPrice = Number(isSale && item.salePrice ? item.salePrice : item.price || item.unitPrice || 0);
    const originalUnitPrice = Number(item.originalPrice || item.price || effectiveUnitPrice);
    const qty = Number(item.quantity || 1);
    const subTotal = effectiveUnitPrice * qty;
    const originalSubTotal = originalUnitPrice * qty;
    const savedAmount = Math.max(0, originalSubTotal - subTotal);

    return {
      ...item,
      id: item.id || item.itemId || `item-${Date.now()}`,
      itemId: item.itemId || item.id || `item-${Date.now()}`,
      unitPrice: effectiveUnitPrice,
      price: effectiveUnitPrice,
      originalPrice: originalUnitPrice,
      salePrice: isSale ? effectiveUnitPrice : null,
      subTotal,
      originalSubTotal,
      savedAmount,
      isFlashSale: isSale
    };
  });

  const totalPrice = normalized.reduce((sum, item) => sum + item.subTotal, 0);
  const totalOriginalPrice = normalized.reduce((sum, item) => sum + item.originalSubTotal, 0);
  const totalDiscount = Math.max(0, totalOriginalPrice - totalPrice);

  return {
    items: normalized,
    totalPrice,
    totalOriginalPrice,
    totalDiscount,
    totalItems: normalized.reduce((sum, item) => sum + item.quantity, 0)
  };
};

export const cartService = {
  getCart: async () => {
    try {
      const data = await api.get('/cart');
      return data;
    } catch (err) {
      // Fallback về local mock cart
      const items = getLocalCart();
      return calculateCartResponse(items);
    }
  },

  addItem: async (productId, quantity = 1, customProduct = null) => {
    try {
      return await api.post('/cart/items', {
        productId: Number(productId),
        quantity: Number(quantity)
      });
    } catch (err) {
      // Mock fallback: Thêm vào local cart
      const items = getLocalCart();
      const existingIndex = items.findIndex((i) => String(i.productId) === String(productId));

      // Tìm thông tin sản phẩm từ Flash Sale hoặc custom
      const matched = customProduct || INITIAL_FLASH_PRODUCTS.find((p) => String(p.id) === String(productId));

      if (existingIndex > -1) {
        items[existingIndex].quantity += Number(quantity);
        items[existingIndex].subTotal = (items[existingIndex].salePrice || items[existingIndex].price) * items[existingIndex].quantity;
      } else {
        const newItem = {
          id: `item-${Date.now()}`,
          itemId: `item-${Date.now()}`,
          productId: matched?.id || productId,
          name: matched?.shortName || matched?.name || 'Sản phẩm mới',
          productName: matched?.name || 'Sản phẩm mới',
          resellerTag: matched?.storeName ? `${matched.storeName.toUpperCase()}` : 'CHÍNH HÃNG UỶ QUYỀN',
          originalPrice: matched?.price || 1000000,
          price: matched?.salePrice || matched?.price || 1000000,
          unitPrice: matched?.salePrice || matched?.price || 1000000,
          salePrice: matched?.salePrice || null,
          discountPercent: matched?.discountPercent || 0,
          stockNotice: matched?.statusText || 'Bảo hành chính hãng 12 tháng',
          imageUrl: matched?.imageUrl || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80',
          quantity: Number(quantity),
          subTotal: (matched?.salePrice || matched?.price || 1000000) * Number(quantity),
          isFlashSale: Boolean(matched?.salePrice)
        };
        items.push(newItem);
      }

      setLocalCart(items);
      return calculateCartResponse(items);
    }
  },

  updateItem: async (itemId, quantity) => {
    try {
      return await api.put(`/cart/items/${itemId}`, {
        quantity: Number(quantity)
      });
    } catch (err) {
      let items = getLocalCart();
      const qty = Number(quantity);
      if (qty <= 0) {
        items = items.filter((i) => String(i.id) !== String(itemId) && String(i.itemId) !== String(itemId));
      } else {
        items = items.map((i) => {
          if (String(i.id) === String(itemId) || String(i.itemId) === String(itemId)) {
            const unit = i.salePrice || i.price;
            return {
              ...i,
              quantity: qty,
              subTotal: unit * qty
            };
          }
          return i;
        });
      }
      setLocalCart(items);
      return calculateCartResponse(items);
    }
  },

  removeItem: async (itemId) => {
    try {
      return await api.delete(`/cart/items/${itemId}`);
    } catch (err) {
      let items = getLocalCart();
      items = items.filter((i) => String(i.id) !== String(itemId) && String(i.itemId) !== String(itemId));
      setLocalCart(items);
      return calculateCartResponse(items);
    }
  },

  clearCart: async () => {
    try {
      return await api.delete('/cart/clear');
    } catch (err) {
      setLocalCart([]);
      return calculateCartResponse([]);
    }
  }
};

export default cartService;
