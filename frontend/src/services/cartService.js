import api from './api';

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

/**
 * Chuẩn hóa dữ liệu giỏ hàng từ Backend trả về.
 * Tuyệt đối KHÔNG dùng localStorage ('shopmart_cart_price_hints') để tạo giá Flash Sale giả
 * khi Backend không xác nhận giá khuyến mãi. Giá và số lượng luôn lấy từ dữ liệu thực của Backend.
 */
const enrichServerCart = (cartData) => {
  if (!cartData || !Array.isArray(cartData.items)) return cartData;
  const enrichedItems = cartData.items.map((item) => {
    const serverPrice = Number(item.price ?? item.unitPrice ?? 0);
    const serverOriginal = Number(item.originalPrice ?? serverPrice);
    const serverSale = item.salePrice != null ? Number(item.salePrice) : null;
    const qty = Math.max(1, Number(item.quantity || 1));

    // Chỉ ghi nhận giá Flash Sale khi chính Backend xác nhận salePrice hợp lệ nhỏ hơn originalPrice
    if (serverSale != null && serverSale > 0 && serverSale < serverOriginal) {
      return {
        ...item,
        quantity: qty,
        originalPrice: serverOriginal,
        salePrice: serverSale,
        price: serverSale,
        unitPrice: serverSale,
        subTotal: Number(item.subTotal ?? serverSale * qty),
        originalSubTotal: Number(item.originalSubTotal ?? serverOriginal * qty),
        isFlashSale: true
      };
    }

    return {
      ...item,
      quantity: qty,
      originalPrice: serverOriginal,
      salePrice: null,
      price: serverPrice,
      unitPrice: serverPrice,
      subTotal: Number(item.subTotal ?? serverPrice * qty),
      originalSubTotal: Number(item.originalSubTotal ?? serverOriginal * qty),
      isFlashSale: Boolean(item.isFlashSale && serverOriginal > serverPrice && serverPrice > 0)
    };
  });

  const totalPrice = Number(
    cartData.totalPrice ??
      cartData.totalAmount ??
      enrichedItems.reduce(
        (sum, i) => sum + Number(i.subTotal ?? Number(i.price || 0) * Number(i.quantity || 1)),
        0
      )
  );
  const totalOriginalPrice = Number(
    cartData.totalOriginalPrice ??
      enrichedItems.reduce(
        (sum, i) =>
          sum + Number(i.originalSubTotal ?? Number(i.originalPrice || i.price || 0) * Number(i.quantity || 1)),
        0
      )
  );
  const totalDiscount = Math.max(0, totalOriginalPrice - totalPrice);

  return {
    ...cartData,
    items: enrichedItems,
    totalPrice,
    totalAmount: totalPrice,
    totalOriginalPrice,
    totalDiscount
  };
};

/**
 * Chuẩn hóa lỗi từ Backend (đặc biệt là lỗi 409 NotEnoughStockException khi vượt quá tồn kho).
 * Không nuốt lỗi, không tự cập nhật giỏ hàng giả khi Backend từ chối.
 */
const buildCartApiError = (err, fallbackMessage) => {
  const status = err?.status || err?.response?.status;
  const rawMessage = String(err?.response?.data?.message || err?.message || '').trim();
  const isOutOfStockError =
    status === 409 ||
    /NotEnoughStock|out of stock|not enough stock|vượt quá tồn kho|không đủ tồn kho|hết hàng/i.test(rawMessage);

  const friendlyMessage = isOutOfStockError
    ? rawMessage && !/^Request failed with status code/i.test(rawMessage)
      ? rawMessage
      : 'Số lượng sản phẩm yêu cầu vượt quá số lượng tồn kho hiện có. Vui lòng giảm số lượng.'
    : rawMessage || fallbackMessage;

  const cartError = new Error(friendlyMessage);
  cartError.status = status;
  cartError.response = err?.response;
  cartError.isOutOfStock = isOutOfStockError;
  return cartError;
};

export { getLocalCart, setLocalCart, calculateCartResponse };

export const cartService = {
  getCart: async () => {
    try {
      const data = await api.get('/cart');
      return enrichServerCart(data);
    } catch (err) {
      throw buildCartApiError(err, 'Không thể tải thông tin giỏ hàng từ máy chủ.');
    }
  },

  addItem: async (productId, quantity = 1, customProduct = null) => {
    const requestedQty = Number(quantity);
    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
      throw new Error('Số lượng sản phẩm thêm vào giỏ phải lớn hơn 0.');
    }

    const availableStock =
      customProduct?.stockQuantity !== undefined && customProduct?.stockQuantity !== null
        ? Number(customProduct.stockQuantity)
        : customProduct?.stock !== undefined && customProduct?.stock !== null
          ? Number(customProduct.stock)
          : null;

    if (availableStock !== null && Number.isFinite(availableStock)) {
      if (availableStock <= 0) {
        const outErr = new Error('Sản phẩm này hiện đã hết hàng trong kho.');
        outErr.status = 409;
        outErr.isOutOfStock = true;
        throw outErr;
      }
      if (requestedQty > availableStock) {
        const stockErr = new Error(
          `Số lượng yêu cầu (${requestedQty}) vượt quá tồn kho hiện có (${availableStock} sản phẩm).`
        );
        stockErr.status = 409;
        stockErr.isOutOfStock = true;
        throw stockErr;
      }
    }

    try {
      const data = await api.post('/cart/items', {
        productId: Number(productId),
        quantity: requestedQty
      });
      return enrichServerCart(data);
    } catch (err) {
      throw buildCartApiError(err, 'Không thể thêm sản phẩm vào giỏ hàng.');
    }
  },

  updateItem: async (itemId, quantity) => {
    try {
      const data = await api.put(`/cart/items/${itemId}`, {
        quantity: Number(quantity)
      });
      return enrichServerCart(data);
    } catch (err) {
      throw buildCartApiError(err, 'Không thể cập nhật số lượng sản phẩm trong giỏ hàng.');
    }
  },

  removeItem: async (itemId) => {
    try {
      const data = await api.delete(`/cart/items/${itemId}`);
      return enrichServerCart(data);
    } catch (err) {
      throw buildCartApiError(err, 'Không thể xóa sản phẩm khỏi giỏ hàng.');
    }
  },

  clearCart: async () => {
    try {
      return await api.delete('/cart/clear');
    } catch (err) {
      throw buildCartApiError(err, 'Không thể làm trống giỏ hàng.');
    }
  }
};

export default cartService;
