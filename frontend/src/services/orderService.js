import api, { isHttpResponseError } from './api.js';
import cartService from './cartService';
import { ORDER_STATUS, ORDER_STATUS_LABELS } from '../utils/constants';

const ORDERS_STORAGE_KEY = 'shopmart_orders_mock';
export const ORDER_STATUS_SYNC_EVENT = 'shopmart:order-status-updated';
const ORDER_SYNC_SIGNAL_KEY = 'shopmart_order_sync_signal';

// Описание mô tả trạng thái chuẩn đồng bộ với OrderStatusHistoryResponse.java (Backend)
const STATUS_DESCRIPTIONS = {
  [ORDER_STATUS.PENDING]: 'Đơn hàng đã được đặt thành công, đang chờ xác nhận',
  [ORDER_STATUS.PAID]: 'Đã thanh toán thành công qua cổng thanh toán',
  [ORDER_STATUS.CONFIRMED]: 'Đơn hàng đã được xác nhận bởi người bán / quản trị viên',
  [ORDER_STATUS.PROCESSING]: 'Đơn hàng đang được chuẩn bị và đóng gói',
  [ORDER_STATUS.SHIPPING]: 'Đơn hàng đang trên đường vận chuyển tới địa chỉ nhận hàng',
  [ORDER_STATUS.DELIVERED]: 'Đơn hàng đã giao thành công',
  [ORDER_STATUS.CANCELLED]: 'Đơn hàng đã bị hủy',
  [ORDER_STATUS.FAILED]: 'Đơn hàng xử lý thất bại',
  [ORDER_STATUS.REFUNDED]: 'Đơn hàng đã được hoàn tiền'
};

/**
 * [Task ECOM-313] Phát tín hiệu đồng bộ trạng thái đơn hàng giữa trang Admin và trang Customer
 * Hỗ trợ đồng bộ tức thời trong cùng tab (CustomEvent) và đa tab trình duyệt (localStorage storage event).
 */
const notifyOrderStatusSync = (payload) => {
  const syncDetail = {
    ...payload,
    timestamp: new Date().toISOString()
  };
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ORDER_SYNC_SIGNAL_KEY, JSON.stringify(syncDetail));
    }
  } catch (e) {
    // Ignore storage quota errors
  }
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent(ORDER_STATUS_SYNC_EVENT, { detail: syncDetail }));
  }
};

const INITIAL_MOCK_ORDERS = [
  {
    id: 1001,
    receiverName: 'Nguyễn Văn A',
    receiverPhone: '0912345678',
    userEmail: 'user@test.com',
    shippingAddress: '123 Đường Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội',
    note: 'Giao giờ hành chính, gọi trước khi đến 15 phút',
    paymentMethod: 'COD',
    status: ORDER_STATUS.PENDING,
    totalAmount: 32490000,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    items: [
      {
        id: 'item-1',
        productId: 'fs-1',
        name: 'MacBook Pro 14 M3 Pro (18GB / 512GB SSD)',
        productName: 'MacBook Pro 14 M3 Pro (18GB / 512GB SSD)',
        priceAtPurchase: 32490000,
        price: 32490000,
        quantity: 1,
        subTotal: 32490000,
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 1002,
    receiverName: 'Trần Thị B',
    receiverPhone: '0987654321',
    userEmail: 'tranthib@gmail.com',
    shippingAddress: 'Tòa nhà Landmark 81, Phường 22, Bình Thạnh, TP.HCM',
    note: 'Để tại quầy lễ tân tầng 1',
    paymentMethod: 'MOCK_ONLINE',
    status: ORDER_STATUS.PAID,
    totalAmount: 11980000,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    items: [
      {
        id: 'item-2',
        productId: 'fs-3',
        name: 'Tai nghe Sony WH-1000XM5 Chống Ồn Cao Cấp',
        productName: 'Tai nghe Sony WH-1000XM5 Chống Ồn Cao Cấp',
        priceAtPurchase: 5990000,
        price: 5990000,
        quantity: 2,
        subTotal: 11980000,
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 1003,
    receiverName: 'Lê Hoàng Nam',
    receiverPhone: '0909123456',
    userEmail: 'lehoangnam@gmail.com',
    shippingAddress: '45 Lê Duẩn, Bến Nghé, Quận 1, TP.HCM',
    note: '',
    paymentMethod: 'COD',
    status: ORDER_STATUS.SHIPPING,
    totalAmount: 27990000,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    items: [
      {
        id: 'item-3',
        productId: 'fs-2',
        name: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
        productName: 'iPhone 15 Pro Max 256GB Titan Tự Nhiên',
        priceAtPurchase: 27990000,
        price: 27990000,
        quantity: 1,
        subTotal: 27990000,
        imageUrl: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=400&q=80'
      }
    ]
  },
  {
    id: 1004,
    receiverName: 'Phạm Minh Tuấn',
    receiverPhone: '0934567890',
    userEmail: 'minhtuan@gmail.com',
    shippingAddress: '78 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    note: 'Giao buổi chiều sau 14h',
    paymentMethod: 'COD',
    status: ORDER_STATUS.COMPLETED,
    totalAmount: 18990000,
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    items: [{ id: 'item-4', productName: 'Robot Hút Bụi Deebot X2 OMNI', price: 18990000, quantity: 1, subTotal: 18990000 }]
  },
  {
    id: 1005,
    receiverName: 'Đỗ Thị Hương',
    receiverPhone: '0945678901',
    userEmail: 'dohuong@gmail.com',
    shippingAddress: '12 Kim Mã, Ba Đình, Hà Nội',
    note: '',
    paymentMethod: 'MOCK_ONLINE',
    status: ORDER_STATUS.PENDING,
    totalAmount: 24500000,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    items: [{ id: 'item-5', productName: 'MacBook Air M2 13 inch', price: 24500000, quantity: 1, subTotal: 24500000 }]
  },
  {
    id: 1006,
    receiverName: 'Vũ Quốc Bảo',
    receiverPhone: '0956789012',
    userEmail: 'quocbao@gmail.com',
    shippingAddress: '88 Hai Bà Trưng, Quận 3, TP.HCM',
    note: 'Kiểm tra hàng trước khi nhận',
    paymentMethod: 'COD',
    status: ORDER_STATUS.PAID,
    totalAmount: 1850000,
    createdAt: new Date(Date.now() - 3600000 * 15).toISOString(),
    items: [{ id: 'item-6', productName: 'Bàn phím cơ không dây', price: 1850000, quantity: 1, subTotal: 1850000 }]
  },
  {
    id: 1007,
    receiverName: 'Bùi Thị Lan',
    receiverPhone: '0967890123',
    userEmail: 'lanbui@gmail.com',
    shippingAddress: '15 Trần Phú, Hải Châu, Đà Nẵng',
    note: '',
    paymentMethod: 'COD',
    status: ORDER_STATUS.COMPLETED,
    totalAmount: 4690000,
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString(),
    items: [{ id: 'item-7', productName: 'SSD Samsung 990 Pro 2TB', price: 4690000, quantity: 1, subTotal: 4690000 }]
  },
  {
    id: 1008,
    receiverName: 'Hoàng Văn Dũng',
    receiverPhone: '0978901234',
    userEmail: 'dung.hoang@gmail.com',
    shippingAddress: '99 Hùng Vương, Nha Trang, Khánh Hòa',
    note: '',
    paymentMethod: 'COD',
    status: ORDER_STATUS.CANCELLED,
    totalAmount: 21990000,
    createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    items: [{ id: 'item-8', productName: 'Samsung Galaxy S24', price: 21990000, quantity: 1, subTotal: 21990000 }]
  },
  {
    id: 1009,
    receiverName: 'Ngô Mỹ Linh',
    receiverPhone: '0989012345',
    userEmail: 'mylinh@gmail.com',
    shippingAddress: '56 Hoàng Diệu, Hồng Bàng, Hải Phòng',
    note: 'Gọi điện trước khi giao hàng',
    paymentMethod: 'MOCK_ONLINE',
    status: ORDER_STATUS.SHIPPING,
    totalAmount: 9890000,
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString(),
    items: [{ id: 'item-9', productName: 'Apple Watch Series 9 GPS', price: 9890000, quantity: 1, subTotal: 9890000 }]
  },
  {
    id: 1010,
    receiverName: 'Lý Quốc Huy',
    receiverPhone: '0990123456',
    userEmail: 'huy.ly@gmail.com',
    shippingAddress: '23 Quang Trung, TP.Vinh, Nghệ An',
    note: '',
    paymentMethod: 'COD',
    status: ORDER_STATUS.PENDING,
    totalAmount: 13490000,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    items: [{ id: 'item-10', productName: 'Màn hình Dell UltraSharp 27 4K', price: 13490000, quantity: 1, subTotal: 13490000 }]
  },
  {
    id: 1011,
    receiverName: 'Đinh Tiến Dũng',
    receiverPhone: '0911223344',
    userEmail: 'tiendung@gmail.com',
    shippingAddress: '34 Lê Lợi, TP.Huế, Thừa Thiên Huế',
    note: '',
    paymentMethod: 'COD',
    status: ORDER_STATUS.COMPLETED,
    totalAmount: 2490000,
    createdAt: new Date(Date.now() - 3600000 * 140).toISOString(),
    items: [{ id: 'item-11', productName: 'Chuột Logitech MX Master 3S', price: 2490000, quantity: 1, subTotal: 2490000 }]
  },
  {
    id: 1012,
    receiverName: 'Phan Tuyết Mai',
    receiverPhone: '0922334455',
    userEmail: 'tuyetmai@gmail.com',
    shippingAddress: '89 Hùng Vương, Long Xuyên, An Giang',
    note: 'Giao tại cơ quan',
    paymentMethod: 'MOCK_ONLINE',
    status: ORDER_STATUS.PAID,
    totalAmount: 3290000,
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    items: [{ id: 'item-12', productName: 'Máy lọc không khí Xiaomi 4', price: 3290000, quantity: 1, subTotal: 3290000 }]
  },
  {
    id: 1013,
    receiverName: 'Trịnh Gia Huy',
    receiverPhone: '0933445566',
    userEmail: 'giahuy@gmail.com',
    shippingAddress: '102 Nguyễn Huệ, TP.Quy Nhơn, Bình Định',
    note: '',
    paymentMethod: 'COD',
    status: ORDER_STATUS.SHIPPING,
    totalAmount: 36990000,
    createdAt: new Date(Date.now() - 3600000 * 40).toISOString(),
    items: [{ id: 'item-13', productName: 'Card màn hình ASUS ROG RTX 4080', price: 36990000, quantity: 1, subTotal: 36990000 }]
  },
  {
    id: 1014,
    receiverName: 'Dương Thu Trang',
    receiverPhone: '0944556677',
    userEmail: 'thutrang@gmail.com',
    shippingAddress: '67 Điện Biên Phủ, Thanh Khê, Đà Nẵng',
    note: '',
    paymentMethod: 'COD',
    status: ORDER_STATUS.COMPLETED,
    totalAmount: 8990000,
    createdAt: new Date(Date.now() - 3600000 * 160).toISOString(),
    items: [{ id: 'item-14', productName: 'Loa Marshall Stanmore III', price: 8990000, quantity: 1, subTotal: 8990000 }]
  },
  {
    id: 1015,
    receiverName: 'Lâm Khánh Toàn',
    receiverPhone: '0955667788',
    userEmail: 'khanhtoan@gmail.com',
    shippingAddress: '18 CMT8, Ninh Kiều, Cần Thơ',
    note: '',
    paymentMethod: 'MOCK_ONLINE',
    status: ORDER_STATUS.PENDING,
    totalAmount: 29500000,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    items: [{ id: 'item-15', productName: 'Ghế công thái học Ergonomic', price: 29500000, quantity: 1, subTotal: 29500000 }]
  },
  {
    id: 1016,
    receiverName: 'Mai Đức Anh',
    receiverPhone: '0966778899',
    userEmail: 'ducanh@gmail.com',
    shippingAddress: '144 Hoàng Hoa Thám, Ba Đình, Hà Nội',
    note: '',
    paymentMethod: 'COD',
    status: ORDER_STATUS.PAID,
    totalAmount: 2890000,
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    items: [{ id: 'item-16', productName: 'Pin dự phòng Anker 737', price: 2890000, quantity: 1, subTotal: 2890000 }]
  },
  {
    id: 1017,
    receiverName: 'Thái Ngọc Yến',
    receiverPhone: '0977889900',
    userEmail: 'ngocyen@gmail.com',
    shippingAddress: '55 Nguyễn Văn Cừ, Long Biên, Hà Nội',
    note: '',
    paymentMethod: 'COD',
    status: ORDER_STATUS.CANCELLED,
    totalAmount: 11990000,
    createdAt: new Date(Date.now() - 3600000 * 180).toISOString(),
    items: [{ id: 'item-17', productName: 'Router Wi-Fi 7 ASUS ROG', price: 11990000, quantity: 1, subTotal: 11990000 }]
  },
  {
    id: 1018,
    receiverName: 'Hà Văn Tùng',
    receiverPhone: '0988990011',
    userEmail: 'vantung@gmail.com',
    shippingAddress: '72 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    note: 'Giao giờ hành chính',
    paymentMethod: 'MOCK_ONLINE',
    status: ORDER_STATUS.COMPLETED,
    totalAmount: 19990000,
    createdAt: new Date(Date.now() - 3600000 * 200).toISOString(),
    items: [{ id: 'item-18', productName: 'iPad Pro 11 M2 Wi-Fi', price: 19990000, quantity: 1, subTotal: 19990000 }]
  }
];

const getStoredOrders = () => {
  try {
    const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (!raw) {
      setStoredOrders(INITIAL_MOCK_ORDERS);
      return INITIAL_MOCK_ORDERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_MOCK_ORDERS;
  }
};

const setStoredOrders = (orders) => {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.warn('Lỗi lưu orders vào localStorage:', e);
  }
};

const toFiniteNumber = (value, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeOrderDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (Array.isArray(value) && value.length >= 3) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value;
    const dateObj = new Date(
      Number(year),
      Math.max(0, Number(month || 1) - 1),
      Number(day || 1),
      Number(hour || 0),
      Number(minute || 0),
      Number(second || 0),
      Math.floor(Number(nano || 0) / 1e6)
    );
    return Number.isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
  }
  if (typeof value === 'number') {
    const dateObj = new Date(value);
    return Number.isNaN(dateObj.getTime()) ? null : dateObj.toISOString();
  }
  const str = String(value).trim();
  return str || null;
};

const normalizeOrderStatus = (status) => {
  if (status === null || status === undefined) return '';
  const upper = String(status).trim().toUpperCase();
  if (!upper) return '';
  if (upper === 'COMPLETED') return ORDER_STATUS.DELIVERED;
  return upper;
};

const normalizeOrderItemFromBackend = (item) => {
  if (!item || typeof item !== 'object') return null;
  const quantity = Math.max(1, Math.trunc(toFiniteNumber(item.quantity, 1)));
  const priceAtPurchase = toFiniteNumber(item.priceAtPurchase ?? item.unitPrice ?? item.price, 0);
  const price = toFiniteNumber(item.price ?? item.priceAtPurchase ?? item.unitPrice, priceAtPurchase);
  const computedSubTotal = priceAtPurchase * quantity;
  const subTotal =
    item.subTotal !== null && item.subTotal !== undefined
      ? toFiniteNumber(item.subTotal, computedSubTotal)
      : computedSubTotal;

  return {
    ...item,
    id: item.id ?? null,
    productId: item.productId ?? null,
    productName: item.productName || item.name || '',
    name: item.name || item.productName || '',
    quantity,
    priceAtPurchase,
    price,
    subTotal
  };
};

const normalizeStatusHistoryFromBackend = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  return {
    ...entry,
    id: entry.id ?? null,
    orderId: entry.orderId ?? null,
    status: normalizeOrderStatus(entry.status),
    previousStatus: entry.previousStatus ? normalizeOrderStatus(entry.previousStatus) : null,
    createdAt: normalizeOrderDate(entry.createdAt)
  };
};

/**
 * Chuẩn hóa đối tượng đơn hàng trả về từ Backend OrderResponse
 */
export const normalizeOrderFromBackend = (rawOrder) => {
  if (!rawOrder || typeof rawOrder !== 'object') return null;

  const totalAmount = toFiniteNumber(rawOrder.totalAmount ?? rawOrder.finalAmount, 0);
  const discountAmount = Math.max(0, toFiniteNumber(rawOrder.discountAmount, 0));
  const subtotalAmount =
    rawOrder.subtotalAmount !== null && rawOrder.subtotalAmount !== undefined
      ? toFiniteNumber(rawOrder.subtotalAmount, totalAmount)
      : rawOrder.subtotal !== null && rawOrder.subtotal !== undefined
        ? toFiniteNumber(rawOrder.subtotal, totalAmount)
        : totalAmount;
  const shippingFee = Math.max(0, toFiniteNumber(rawOrder.shippingFee, 0));
  const voucherCode = rawOrder.voucherCode ?? rawOrder.couponCode ?? null;

  const rawItems = Array.isArray(rawOrder.items)
    ? rawOrder.items
    : Array.isArray(rawOrder.orderItems)
      ? rawOrder.orderItems
      : [];
  const items = rawItems.map(normalizeOrderItemFromBackend).filter(Boolean);

  const rawHistories = Array.isArray(rawOrder.statusHistories) ? rawOrder.statusHistories : [];
  const statusHistories = rawHistories.map(normalizeStatusHistoryFromBackend).filter(Boolean);

  return {
    ...rawOrder,
    id: rawOrder.id ?? null,
    userId: rawOrder.userId ?? null,
    receiverName: rawOrder.receiverName ?? rawOrder.customerName ?? '',
    receiverPhone: rawOrder.receiverPhone ?? rawOrder.customerPhone ?? '',
    userEmail: rawOrder.userEmail ?? rawOrder.customerEmail ?? '',
    shippingAddress: rawOrder.shippingAddress ?? '',
    subtotal: subtotalAmount,
    subtotalAmount,
    voucherCode,
    couponCode: rawOrder.couponCode ?? voucherCode,
    discountAmount,
    shippingFee,
    totalAmount,
    status: normalizeOrderStatus(rawOrder.status),
    paymentMethod: rawOrder.paymentMethod ? String(rawOrder.paymentMethod).trim().toUpperCase() : '',
    createdAt: normalizeOrderDate(rawOrder.createdAt),
    updatedAt: normalizeOrderDate(rawOrder.updatedAt),
    items,
    statusHistories
  };
};

export const orderService = {
  // Tạo đơn hàng từ giỏ hàng hiện tại (POST /api/orders/checkout)
  checkout: async ({
    receiverName,
    receiverPhone,
    shippingAddress,
    note,
    paymentMethod,
    onlinePaymentProvider = null,
    onlinePaymentProviderLabel = null,
    couponCode = null,
    voucherCode = null,
    voucherId = null,
    subtotal = null,
    subtotalAmount = null,
    originalAmount = null,
    productDiscountAmount = 0,
    discountAmount = 0,
    shippingFee = 0,
    totalAmount = null,
    finalTotal = null
  } = {}) => {
    const rawCouponCode = couponCode || voucherCode || null;
    const normalizedVoucherCode =
      typeof rawCouponCode === 'string' && rawCouponCode.trim() ? rawCouponCode.trim().toUpperCase() : null;
    const isOnlinePay = paymentMethod === 'MOCK_ONLINE';

    try {
      const apiOrder = await api.post('/orders/checkout', {
        receiverName,
        receiverPhone,
        shippingAddress,
        note: note || '',
        paymentMethod,
        voucherCode: normalizedVoucherCode
      });

      // Chỉ xóa giỏ hàng sau khi Backend xác nhận tạo đơn hàng thành công
      if (apiOrder && apiOrder.id !== undefined && apiOrder.id !== null) {
        await cartService.clearCart().catch(() => {});
      }

      // Ưu tiên dữ liệu tài chính thực tế từ Backend trả về
      if (apiOrder && typeof apiOrder === 'object') {
        const backendSubtotal =
          apiOrder.subtotalAmount !== null && apiOrder.subtotalAmount !== undefined
            ? Number(apiOrder.subtotalAmount)
            : null;
        const effectiveSubtotal =
          backendSubtotal !== null && backendSubtotal > 0
            ? backendSubtotal
            : (subtotalAmount !== null && subtotalAmount !== undefined && Number(subtotalAmount) > 0
                ? Number(subtotalAmount)
                : (subtotal !== null && subtotal !== undefined && Number(subtotal) > 0
                    ? Number(subtotal)
                    : Number(apiOrder.totalAmount ?? 0)));
        const backendDiscount =
          apiOrder.discountAmount !== null && apiOrder.discountAmount !== undefined
            ? Number(apiOrder.discountAmount)
            : null;
        const effectiveDiscount =
          backendDiscount !== null
            ? Math.min(effectiveSubtotal, Math.max(0, backendDiscount))
            : Math.min(effectiveSubtotal, Math.max(0, Number(discountAmount) || 0));
        const effectiveShipping = Math.max(0, Number(apiOrder.shippingFee ?? shippingFee ?? 0) || 0);
        const effectiveProductDiscount =
          apiOrder.productDiscountAmount !== null && apiOrder.productDiscountAmount !== undefined
            ? Math.max(0, Number(apiOrder.productDiscountAmount))
            : Math.max(0, Number(productDiscountAmount) || 0);
        const backendTotal =
          apiOrder.totalAmount !== null && apiOrder.totalAmount !== undefined
            ? Number(apiOrder.totalAmount)
            : null;
        const computedFinal =
          finalTotal !== null && finalTotal !== undefined && Number(finalTotal) >= 0 && effectiveSubtotal > 0
            ? Math.min(Number(finalTotal), Math.max(0, effectiveSubtotal - effectiveDiscount)) + effectiveShipping
            : totalAmount !== null && totalAmount !== undefined && Number(totalAmount) >= 0 && effectiveSubtotal > 0
              ? Math.min(Number(totalAmount), Math.max(0, effectiveSubtotal - effectiveDiscount) + effectiveShipping)
              : Math.max(0, effectiveSubtotal - effectiveDiscount) + effectiveShipping;
        const resolvedTotal = backendTotal !== null ? backendTotal : computedFinal;
        const resolvedOriginal =
          apiOrder.originalAmount !== null && apiOrder.originalAmount !== undefined
            ? Number(apiOrder.originalAmount)
            : Math.max(
                Number(originalAmount ?? 0),
                effectiveSubtotal + effectiveProductDiscount,
                Number(apiOrder.subtotalAmount ?? resolvedTotal)
              );

        return {
          ...apiOrder,
          onlinePaymentProvider: apiOrder.onlinePaymentProvider ?? (isOnlinePay ? onlinePaymentProvider : null),
          onlinePaymentProviderLabel:
            apiOrder.onlinePaymentProviderLabel ?? (isOnlinePay ? onlinePaymentProviderLabel : null),
          paidAt: apiOrder.paidAt ?? (apiOrder.status === ORDER_STATUS.PAID ? new Date().toISOString() : null),
          couponCode: apiOrder.couponCode ?? normalizedVoucherCode,
          voucherCode: apiOrder.voucherCode ?? normalizedVoucherCode,
          voucherId: voucherId ?? apiOrder.voucherId ?? null,
          originalAmount: resolvedOriginal,
          subtotal: effectiveSubtotal,
          subtotalAmount: effectiveSubtotal,
          productDiscountAmount: effectiveProductDiscount,
          discountAmount: effectiveDiscount,
          shippingFee: effectiveShipping,
          totalAmount: resolvedTotal
        };
      }
      return apiOrder;
    } catch (err) {
      // Tuyệt đối không tạo đơn hàng giả trong localStorage và không xóa giỏ hàng khi Backend thất bại (400, 403, 409, 500 hoặc lỗi kết nối)
      const backendMessage = err?.response?.data?.message || err?.message;
      const checkoutError = new Error(
        backendMessage || 'Đặt hàng thất bại. Không thể kết nối tới máy chủ, vui lòng thử lại.'
      );
      checkoutError.status = err?.status || err?.response?.status;
      checkoutError.response = err?.response;
      throw checkoutError;
    }
  },

  // Alias tương thích với createOrder
  createOrder: async (orderData) => {
    return await orderService.checkout(orderData);
  },

  // Lịch sử đơn hàng của user đang đăng nhập (GET /api/v1/orders/my-orders)
  getMyOrders: async () => {
    const list = await api.get('/orders/my-orders');
    const arr = Array.isArray(list) ? list : Array.isArray(list?.content) ? list.content : [];
    return arr.map((order) => normalizeOrderFromBackend(order) || order);
  },

  // Chi tiết đơn hàng của user (GET /api/orders/{orderId})
  getOrderById: async (id) => {
    const data = await api.get(`/orders/${id}`);
    return normalizeOrderFromBackend(data) || data;
  },

  // Khách tự hủy đơn PENDING (PUT /api/orders/{orderId}/cancel)
  cancelOrder: async (id) => {
    try {
      const response = await api.put(`/orders/${id}/cancel`);
      notifyOrderStatusSync({
        orderId: id,
        status: ORDER_STATUS.CANCELLED,
        actorRole: 'ROLE_USER',
        action: 'ORDER_CANCELLED'
      });
      return normalizeOrderFromBackend(response) || response;
    } catch (err) {
      // Không tự động chuyển trạng thái đơn hàng thành CANCELLED ở Frontend khi API thất bại
      const backendMessage = err?.response?.data?.message || err?.message;
      const cancelError = new Error(
        backendMessage || `Không thể hủy đơn hàng #${id}. Vui lòng thử lại.`
      );
      cancelError.status = err?.status || err?.response?.status;
      cancelError.response = err?.response;
      throw cancelError;
    }
  },

  // Admin xem toàn bộ đơn hàng có phân trang & lọc trạng thái (GET /api/v1/admin/orders)
  // Không tự thay thế lỗi API bằng dữ liệu mock để UI hiển thị chính xác Error State & nút Thử lại.
  getAllOrders: async (params = {}) => {
    const response = await api.get('/admin/orders', { params });

    // Nếu Backend trả về PagedResponse { content, pageNumber, pageSize, totalElements, totalPages, last }
    if (response && Array.isArray(response.content)) {
      const normalizedContent = response.content
        .map((item) => normalizeOrderFromBackend(item))
        .filter(Boolean);
      return {
        content: normalizedContent,
        totalElements: response.totalElements ?? normalizedContent.length,
        totalPages: response.totalPages ?? 1,
        pageNumber: response.pageNumber ?? (params?.page || 0),
        pageSize: response.pageSize ?? (params?.size || 10),
        last: response.last ?? true
      };
    }

    // Nếu Backend trả về mảng trực tiếp
    if (Array.isArray(response)) {
      const page = params?.page || 0;
      const size = params?.size || 10;
      const normalizedContent = response
        .map((item) => normalizeOrderFromBackend(item))
        .filter(Boolean);
      return {
        content: normalizedContent,
        totalElements: normalizedContent.length,
        totalPages: Math.max(1, Math.ceil(normalizedContent.length / size)),
        pageNumber: page,
        pageSize: size,
        last: true
      };
    }

    // Xử lý an toàn khi response rỗng hoặc null
    return {
      content: [],
      totalElements: 0,
      totalPages: 1,
      pageNumber: params?.page || 0,
      pageSize: params?.size || 10,
      last: true
    };
  },

  // Admin xem chi tiết đơn hàng (GET /api/v1/orders/{orderId})
  getAdminOrderById: async (id) => {
    const data = await api.get(`/orders/${id}`);
    const normalized = normalizeOrderFromBackend(data);
    if (!normalized) {
      throw new Error('Dữ liệu chi tiết đơn hàng từ máy chủ không hợp lệ.');
    }
    return normalized;
  },

  // [Task ECOM-315 / ECOM-311] Lấy lịch sử dòng thời gian trạng thái đơn hàng (Timeline)
  // Endpoint: GET /api/v1/orders/{orderId}/history
  getOrderStatusHistory: async (id) => {
    try {
      const response = await api.get(`/orders/${id}/history`);
      const list = Array.isArray(response)
        ? response
        : response && Array.isArray(response.data)
          ? response.data
          : [];
      return list.map(normalizeStatusHistoryFromBackend).filter(Boolean);
    } catch (err) {
      // Nếu là lỗi bảo mật 403 (IDOR) thì ném lỗi để UI hiển thị thông báo phân quyền
      if (err.response?.status === 403) {
        throw err;
      }

      // Thử gọi qua endpoint admin nếu người dùng có vai trò Admin
      try {
        const adminRes = await api.get(`/admin/orders/${id}/history`);
        const adminList = Array.isArray(adminRes)
          ? adminRes
          : adminRes && Array.isArray(adminRes.data)
            ? adminRes.data
            : [];
        return adminList.map(normalizeStatusHistoryFromBackend).filter(Boolean);
      } catch (adminErr) {
        if (adminErr?.response?.status) {
          throw adminErr;
        }
        // Tiếp tục xử lý fallback chỉ khi mất kết nối với máy chủ
      }

      // Fallback Mock History khi chạy offline trên dữ liệu mock localStorage
      const orders = getStoredOrders();
      const order = orders.find((o) => String(o.id) === String(id));
      if (!order) {
        throw err;
      }

      const baseTime = new Date(order.createdAt || Date.now()).getTime();
      const initialPendingRecord = {
        id: 1,
        orderId: order.id,
        status: ORDER_STATUS.PENDING,
        statusDescription: 'Đơn hàng đã được đặt thành công, đang chờ xác nhận',
        previousStatus: null,
        action: 'CREATE_ORDER',
        updatedBy: order.userEmail || 'Khách hàng',
        actorRole: 'ROLE_USER',
        note: order.note || 'Đơn hàng được khởi tạo thành công',
        createdAt: new Date(baseTime).toISOString()
      };

      // Nếu đơn hàng đã có nhật ký thực tế (order.statusHistories), trả về trực tiếp để không trộn lẫn các bước giả lập
      if (Array.isArray(order.statusHistories) && order.statusHistories.length > 0) {
        const hasPending = order.statusHistories.some((h) => h.status === ORDER_STATUS.PENDING);
        const realHistories = hasPending
          ? [...order.statusHistories]
          : [initialPendingRecord, ...order.statusHistories];
        return realHistories.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      }

      const mockHistories = [initialPendingRecord];
      const status = order.status;

      if (
        order.paymentMethod === 'MOCK_ONLINE' &&
        (status === ORDER_STATUS.PAID ||
          status === ORDER_STATUS.CONFIRMED ||
          status === ORDER_STATUS.PROCESSING ||
          status === ORDER_STATUS.SHIPPING ||
          status === ORDER_STATUS.DELIVERED ||
          status === ORDER_STATUS.COMPLETED)
      ) {
        mockHistories.push({
          id: 15,
          orderId: order.id,
          status: ORDER_STATUS.PAID,
          statusDescription: 'Đã thanh toán thành công qua cổng thanh toán',
          previousStatus: ORDER_STATUS.PENDING,
          action: 'PAYMENT_SUCCESS',
          updatedBy: 'PAYMENT_SERVICE',
          actorRole: 'SYSTEM',
          note: 'Khách hàng xác nhận đã quét mã QR thành công',
          createdAt: new Date(baseTime + 2 * 60000).toISOString()
        });
      }

      // Chỉ tạo mốc CONFIRMED khi đơn thực sự đã được Admin xác nhận (từ CONFIRMED trở đi, KHÔNG tự gán khi mới PAID)
      if (
        status === ORDER_STATUS.CONFIRMED ||
        status === ORDER_STATUS.PROCESSING ||
        status === ORDER_STATUS.SHIPPING ||
        status === ORDER_STATUS.DELIVERED ||
        status === ORDER_STATUS.COMPLETED
      ) {
        mockHistories.push({
          id: 2,
          orderId: order.id,
          status: ORDER_STATUS.CONFIRMED,
          statusDescription: 'Đơn hàng đã được xác nhận bởi người bán / quản trị viên',
          previousStatus: order.paymentMethod === 'MOCK_ONLINE' ? ORDER_STATUS.PAID : ORDER_STATUS.PENDING,
          action: 'CONFIRM_ORDER',
          updatedBy: 'ADMIN:1',
          actorRole: 'ROLE_ADMIN',
          note: 'Xác nhận thông tin đơn hàng và địa chỉ giao hàng hợp lệ',
          createdAt: new Date(baseTime + 15 * 60000).toISOString()
        });
      }

      if (status === ORDER_STATUS.PROCESSING || status === ORDER_STATUS.SHIPPING || status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.COMPLETED) {
        mockHistories.push({
          id: 3,
          orderId: order.id,
          status: ORDER_STATUS.PROCESSING,
          statusDescription: 'Đơn hàng đang được chuẩn bị và đóng gói',
          previousStatus: ORDER_STATUS.CONFIRMED,
          action: 'PROCESS_ORDER',
          updatedBy: 'ADMIN:1',
          actorRole: 'ROLE_ADMIN',
          note: 'Hàng đã kiểm tra chất lượng và niêm phong trong hộp đóng gói',
          createdAt: new Date(baseTime + 45 * 60000).toISOString()
        });
      }

      if (status === ORDER_STATUS.SHIPPING || status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.COMPLETED) {
        mockHistories.push({
          id: 4,
          orderId: order.id,
          status: ORDER_STATUS.SHIPPING,
          statusDescription: 'Đơn hàng đang trên đường vận chuyển tới địa chỉ nhận hàng',
          previousStatus: ORDER_STATUS.PROCESSING,
          action: 'SHIP_ORDER',
          updatedBy: 'SHIPPER:SP01',
          actorRole: 'SYSTEM',
          note: 'Đã bàn giao đơn hàng cho đơn vị vận chuyển Viettel Post',
          createdAt: new Date(baseTime + 120 * 60000).toISOString()
        });
      }

      if (status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.COMPLETED) {
        mockHistories.push({
          id: 5,
          orderId: order.id,
          status: ORDER_STATUS.DELIVERED,
          statusDescription: 'Đơn hàng đã giao thành công',
          previousStatus: ORDER_STATUS.SHIPPING,
          action: 'DELIVER_ORDER',
          updatedBy: 'SHIPPER:SP01',
          actorRole: 'SYSTEM',
          note: 'Giao hàng thành công tới tay người nhận. Khách hàng đã ký xác nhận',
          createdAt: new Date(baseTime + 240 * 60000).toISOString()
        });
      }

      if (status === ORDER_STATUS.CANCELLED) {
        mockHistories.push({
          id: 6,
          orderId: order.id,
          status: ORDER_STATUS.CANCELLED,
          statusDescription: 'Đơn hàng đã bị hủy',
          previousStatus: ORDER_STATUS.PENDING,
          action: 'CANCEL_ORDER',
          updatedBy: order.cancelledBy || 'ADMIN:1',
          actorRole: 'ROLE_ADMIN',
          note: order.statusNote || 'Đơn hàng đã bị hủy theo yêu cầu',
          createdAt: new Date(baseTime + 20 * 60000).toISOString()
        });
      } else if (order.statusNote && mockHistories.length > 0) {
        const lastIdx = mockHistories.length - 1;
        mockHistories[lastIdx] = {
          ...mockHistories[lastIdx],
          note: order.statusNote,
          createdAt: order.statusUpdatedAt || mockHistories[lastIdx].createdAt
        };
      }

      // [Task ECOM-313] Đồng bộ các bản ghi cập nhật trạng thái thực tế từ Admin / Customer đã lưu trong order.statusHistories
      if (Array.isArray(order.statusHistories) && order.statusHistories.length > 0) {
        order.statusHistories.forEach((recorded) => {
          const existingIdx = mockHistories.findIndex((m) => m.status === recorded.status);
          if (existingIdx !== -1) {
            mockHistories[existingIdx] = { ...mockHistories[existingIdx], ...recorded };
          } else {
            mockHistories.push(recorded);
          }
        });
      }

      return mockHistories.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }
  },

  // Alias tương thích ngược cho getOrderStatusHistory
  getOrderHistory: async (id) => {
    return await orderService.getOrderStatusHistory(id);
  },

  // [Task ECOM-313 / ECOM-317] Admin cập nhật trạng thái đơn (PUT /api/v1/admin/orders/{orderId}/status)
  // Đồng bộ tức thời giữa AdminOrders và các trang Customer (Orders, OrderDetail, OrderTracking, OrderTimeline)
  updateOrderStatus: async (id, status, note = '') => {
    note = typeof note === 'string' ? note.trim() : '';
    try {
      const response = await api.put(`/admin/orders/${id}/status`, { status, note });
      const normalized = normalizeOrderFromBackend(response) || response;
      notifyOrderStatusSync({
        orderId: id,
        status: normalized?.status || status,
        note,
        actorRole: 'ROLE_ADMIN',
        action: 'ADMIN_STATUS_UPDATE'
      });
      return normalized;
    } catch (err) {
      if (err.response?.status) {
        throw err;
      }
      if (isHttpResponseError(err)) {
        throw err;
      }
      const nowIso = new Date().toISOString();
      const orders = getStoredOrders();
      const targetExists = orders.some((o) => String(o.id) === String(id));
      if (!targetExists) {
        throw err;
      }
      const updatedOrders = orders.map((o) => {
        if (String(o.id) === String(id)) {
          const prevStatus = o.status || ORDER_STATUS.PENDING;
          const existingHistories = Array.isArray(o.statusHistories) ? o.statusHistories : [];
          const logNote =
            note ||
            `Admin cập nhật trạng thái đơn hàng từ ${ORDER_STATUS_LABELS[prevStatus] || prevStatus} sang ${ORDER_STATUS_LABELS[status] || status}`;
          const historyRecord = {
            id: Date.now(),
            orderId: o.id,
            status,
            statusDescription: STATUS_DESCRIPTIONS[status] || `Chuyển trạng thái sang ${ORDER_STATUS_LABELS[status] || status}`,
            previousStatus: prevStatus,
            action: 'ADMIN_STATUS_UPDATE',
            updatedBy: 'ADMIN:1',
            actorRole: 'ROLE_ADMIN',
            note: logNote,
            createdAt: nowIso
          };
          return {
            ...o,
            status,
            updatedAt: nowIso,
            statusHistories: [...existingHistories, historyRecord]

          };
        }
        return o;
      });
      setStoredOrders(updatedOrders);
      const updatedOrder = updatedOrders.find((o) => String(o.id) === String(id));
      notifyOrderStatusSync({
        orderId: id,
        status,
        note,
        actorRole: 'ROLE_ADMIN',
        action: 'ADMIN_STATUS_UPDATE'
      });
      return updatedOrder;
    }
  },

  /**
   * [Task ECOM-313] Đăng ký lắng nghe sự kiện đồng bộ cập nhật trạng thái đơn hàng từ Admin
   * Hỗ trợ 3 kênh: CustomEvent cùng tab, StorageEvent đa tab trình duyệt, và Window Focus.
   */
  subscribeOrderStatusSync: (onSync, targetOrderId = null) => {
    if (typeof window === 'undefined' || typeof onSync !== 'function') {
      return () => { };
    }

    const handleCustomSync = (event) => {
      const detail = event?.detail || {};
      if (!targetOrderId || !detail.orderId || String(detail.orderId) === String(targetOrderId)) {
        onSync(detail);
      }
    };

    const handleStorageSync = (event) => {
      if (event.key === ORDERS_STORAGE_KEY || event.key === ORDER_SYNC_SIGNAL_KEY) {
        if (event.key === ORDER_SYNC_SIGNAL_KEY && event.newValue) {
          try {
            const parsed = JSON.parse(event.newValue);
            if (!targetOrderId || !parsed.orderId || String(parsed.orderId) === String(targetOrderId)) {
              onSync(parsed);
            }
            return;
          } catch (e) {
            // Fallback call
          }
        }
        onSync({ source: 'storage' });
      }
    };

    const handleWindowFocus = () => {
      onSync({ source: 'focus' });
    };

    window.addEventListener(ORDER_STATUS_SYNC_EVENT, handleCustomSync);
    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener(ORDER_STATUS_SYNC_EVENT, handleCustomSync);
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('focus', handleWindowFocus);
    };
  },

  /**
   * [Task ECOM-145 / ECOM-326]
   * Lấy báo cáo thống kê doanh thu & đơn hàng từ Backend:
   * - Ưu tiên gọi GET /api/v1/admin/statistics (hỗ trợ startDate, endDate định dạng YYYY-MM-DD)
   * - Fallback sang GET /api/v1/admin/orders/stats nếu không truyền bộ lọc ngày
   * Tuyệt đối không sử dụng dữ liệu giả hoặc hardcode khi API thất bại.
   */
  getOrderStats: async (params = {}) => {
    const queryParams = {};
    if (params.startDate && String(params.startDate).trim()) {
      queryParams.startDate = String(params.startDate).trim();
    }
    if (params.endDate && String(params.endDate).trim()) {
      queryParams.endDate = String(params.endDate).trim();
    }

    let rawStats;
    try {
      rawStats = await api.get('/admin/statistics', { params: queryParams });
    } catch (primaryErr) {
      if (!queryParams.startDate && !queryParams.endDate) {
        rawStats = await api.get('/admin/orders/stats');
      } else {
        throw primaryErr;
      }
    }

    const statusMap =
      rawStats?.ordersByStatus && typeof rawStats.ordersByStatus === 'object'
        ? rawStats.ordersByStatus
        : {};

    const getCount = (key) => Math.max(0, toFiniteNumber(statusMap[key], 0));

    const pendingOrders = Math.max(0, toFiniteNumber(rawStats?.pendingOrders, getCount('PENDING')));
    const completedOrders = Math.max(0, toFiniteNumber(rawStats?.completedOrders, getCount('DELIVERED')));
    const cancelledOrders = Math.max(0, toFiniteNumber(rawStats?.cancelledOrders, getCount('CANCELLED')));
    const processingOrders = Math.max(
      0,
      toFiniteNumber(
        rawStats?.processingOrders,
        getCount('PAID') +
          getCount('CONFIRMED') +
          getCount('PROCESSING') +
          getCount('SHIPPING')
      )
    );

    let totalUsers = Math.max(0, toFiniteNumber(rawStats?.totalUsers, 0));
    if (totalUsers === 0) {
      try {
        const countRes = await api.get('/admin/customers/count');
        const parsedCount = toFiniteNumber(countRes, 0);
        if (parsedCount > 0) {
          totalUsers = parsedCount;
        }
      } catch {
        // Giữ nguyên giá trị 0 từ DashboardResponse nếu endpoint count không phản hồi
      }
    }

    const sanitizedStatusMap = {};
    for (const [k, v] of Object.entries(statusMap)) {
      sanitizedStatusMap[k] = Math.max(0, toFiniteNumber(v, 0));
    }

    return {
      totalOrders: Math.max(0, toFiniteNumber(rawStats?.totalOrders, 0)),
      totalRevenue: Math.max(0, toFiniteNumber(rawStats?.totalRevenue, 0)),
      ordersByStatus: {
        ...sanitizedStatusMap,
        PENDING: getCount('PENDING'),
        PAID: getCount('PAID'),
        CONFIRMED: getCount('CONFIRMED'),
        PROCESSING: getCount('PROCESSING'),
        SHIPPING: getCount('SHIPPING'),
        DELIVERED: getCount('DELIVERED'),
        CANCELLED: getCount('CANCELLED'),
        FAILED: getCount('FAILED'),
        REFUNDED: getCount('REFUNDED')
      },
      pendingOrders,
      completedOrders,
      cancelledOrders,
      processingOrders,
      lowStockProductsCount: Math.max(0, toFiniteNumber(rawStats?.lowStockProductsCount, 0)),
      totalUsers
    };
  },

  /**
   * Lấy danh sách đơn hàng thực tế từ Backend cho Dashboard (GET /api/v1/admin/orders)
   * Không dùng localStorage fallback để đảm bảo tính chính xác của số liệu thống kê.
   */
  getRealOrdersForDashboard: async (size = 100) => {
    const response = await api.get('/admin/orders', {
      params: { page: 0, size, sortBy: 'id', sortDir: 'desc' }
    });
    const content = Array.isArray(response?.content)
      ? response.content
      : Array.isArray(response)
        ? response
        : [];
    return content.map((item) => normalizeOrderFromBackend(item)).filter(Boolean);
  }
};

export default orderService;
