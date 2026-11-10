import api from './api';
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
    subtotal,
    discountAmount = 0,
    shippingFee = 0,
    totalAmount
  } = {}) => {
    const resolvedCouponCode = couponCode || voucherCode || null;
    const isOnlinePay = paymentMethod === 'MOCK_ONLINE';

    try {
      const apiOrder = await api.post('/orders/checkout', {
        receiverName,
        receiverPhone,
        shippingAddress,
        note: note || '',
        paymentMethod,
        onlinePaymentProvider: isOnlinePay ? onlinePaymentProvider : null,
        onlinePaymentProviderLabel: isOnlinePay ? onlinePaymentProviderLabel : null,
        couponCode: resolvedCouponCode,
        voucherCode: resolvedCouponCode,
        voucherId,
        subtotal,
        discountAmount,
        shippingFee,
        totalAmount
      });

      // Nếu Backend chưa lưu thông tin giảm giá thì chuẩn hóa theo giá trị tại thời điểm checkout
      if (apiOrder && typeof apiOrder === 'object') {
        const orderSubtotal = Number(subtotal ?? apiOrder.subtotal ?? apiOrder.totalAmount ?? 0);
        const orderDiscount = Math.max(0, Number(discountAmount ?? apiOrder.discountAmount ?? 0) || 0);
        const orderShipping = Math.max(0, Number(shippingFee ?? apiOrder.shippingFee ?? 0) || 0);
        const orderTotal = Math.max(0, orderSubtotal - orderDiscount) + orderShipping;

        return {
          ...apiOrder,
          onlinePaymentProvider: apiOrder.onlinePaymentProvider ?? (isOnlinePay ? onlinePaymentProvider : null),
          onlinePaymentProviderLabel: apiOrder.onlinePaymentProviderLabel ?? (isOnlinePay ? onlinePaymentProviderLabel : null),
          paidAt: apiOrder.paidAt ?? (isOnlinePay ? new Date().toISOString() : null),
          couponCode: apiOrder.couponCode ?? resolvedCouponCode,
          voucherCode: apiOrder.voucherCode ?? resolvedCouponCode,
          voucherId: apiOrder.voucherId ?? voucherId,
          subtotal: orderSubtotal,
          discountAmount: orderDiscount,
          shippingFee: orderShipping,
          totalAmount: orderTotal
        };
      }
      return apiOrder;
    } catch (err) {
      // Fallback Mock Order Creation: Cho phép test xác nhận đơn hàng 100% không bị lỗi
      const cartData = await cartService.getCart();
      const orders = getStoredOrders();

      const newId = Math.floor(1004 + Math.random() * 8990);
      const isOnlinePay = paymentMethod === 'MOCK_ONLINE';

      const createdAtIso = new Date().toISOString();
      const orderItems =
        cartData.items && cartData.items.length > 0
          ? cartData.items.map((i) => ({
            id: i.id || i.itemId,
            productId: i.productId,
            name: i.name,
            productName: i.name,
            priceAtPurchase: i.price,
            price: i.price,
            quantity: i.quantity,
            subTotal: i.subTotal ?? Number(i.price || 0) * Number(i.quantity || 1),
            imageUrl: i.imageUrl
          }))
          : [
            {
              id: 'item-demo',
              productId: 'fs-1',
              name: 'MacBook Pro 14 M3 Pro (18GB / 512GB SSD)',
              productName: 'MacBook Pro 14 M3 Pro (18GB / 512GB SSD)',
              priceAtPurchase: 32490000,
              price: 32490000,
              quantity: 1,
              subTotal: 32490000,
              imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80'
            }
          ];

      const itemsSubtotal = orderItems.reduce(
        (sum, item) => sum + Number(item.subTotal ?? Number(item.price || 0) * Number(item.quantity || 1)),
        0
      );

      // Tính đúng công thức: totalAmount = subtotal - discountAmount + shippingFee
      const resolvedSubtotal =
        subtotal !== undefined && subtotal !== null
          ? Math.max(0, Number(subtotal) || 0)
          : Math.max(0, Number(cartData.totalPrice || itemsSubtotal || 0));
      const resolvedDiscountAmount = Math.max(0, Number(discountAmount ?? 0) || 0);
      const resolvedShippingFee = Math.max(0, Number(shippingFee ?? 0) || 0);
      const resolvedTotalAmount = Math.max(0, resolvedSubtotal - resolvedDiscountAmount) + resolvedShippingFee;

      const createdOrder = {
        id: newId,
        receiverName: receiverName || 'Khách hàng ShopMart',
        receiverPhone: receiverPhone || '0912 345 678',
        userEmail: 'user@test.com',
        shippingAddress: shippingAddress || '123 Đường Cầu Giấy, Hà Nội',
        note: note || '',
        paymentMethod: paymentMethod || 'COD',
        onlinePaymentProvider: isOnlinePay ? (onlinePaymentProvider || 'MOMO') : null,
        onlinePaymentProviderLabel: isOnlinePay ? (onlinePaymentProviderLabel || 'Ví điện tử MoMo') : null,
        status: ORDER_STATUS.PENDING,
        paidAt: null,
        couponCode: resolvedCouponCode,
        voucherCode: resolvedCouponCode,
        voucherId: voucherId ?? null,
        subtotal: resolvedSubtotal,
        discountAmount: resolvedDiscountAmount,
        shippingFee: resolvedShippingFee,
        totalAmount: resolvedTotalAmount,
        createdAt: createdAtIso,
        statusHistories: [
          {
            id: Date.now(),
            orderId: newId,
            status: ORDER_STATUS.PENDING,
            statusDescription: STATUS_DESCRIPTIONS[ORDER_STATUS.PENDING] || 'Đơn hàng đã được đặt thành công, đang chờ xác nhận',
            previousStatus: null,
            action: 'CREATE_ORDER',
            updatedBy: 'Khách hàng',
            actorRole: 'ROLE_USER',
            note: note || 'Đơn hàng được khởi tạo thành công',
            createdAt: createdAtIso
          }
        ],
        items: orderItems
      };

      // Lưu vào danh sách đơn (localStorage key: shopmart_orders_mock)
      orders.unshift(createdOrder);
      setStoredOrders(orders);

      // Dọn sạch giỏ sau khi đặt hàng thành công
      await cartService.clearCart();

      return createdOrder;
    }
  },

  // Alias tương thích với createOrder
  createOrder: async (orderData) => {
    return await orderService.checkout(orderData);
  },

  // Lịch sử đơn hàng của user đang đăng nhập (GET /api/orders/my-orders)
  getMyOrders: async () => {
    try {
      return await api.get('/orders/my-orders');
    } catch (err) {
      return getStoredOrders();
    }
  },

  // Chi tiết đơn hàng của user (GET /api/orders/{orderId})
  getOrderById: async (id) => {
    const applyQrOverrideIfNeeded = (orderObj) => {
      if (!orderObj || orderObj.status !== ORDER_STATUS.PENDING) return orderObj;
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const raw = window.sessionStorage.getItem('shopmart_qr_payment_overrides');
          const overrides = raw ? JSON.parse(raw) : null;
          const ov = overrides?.[String(orderObj.id ?? id)];
          if (ov && ov.status) {
            const histories = Array.isArray(orderObj.statusHistories) ? orderObj.statusHistories : [];
            const hasEntry = histories.some((h) => h.status === ov.status);
            return {
              ...orderObj,
              status: ov.status,
              updatedAt: ov.updatedAt || orderObj.updatedAt,
              statusHistories: hasEntry || !ov.historyEntry ? histories : [...histories, ov.historyEntry]
            };
          }
        }
      } catch (e) {
        // Bỏ qua lỗi đọc sessionStorage
      }
      return orderObj;
    };

    try {
      const data = await api.get(`/orders/${id}`);
      return applyQrOverrideIfNeeded(data);
    } catch (err) {
      if (err.response?.status === 403) {
        throw err;
      }
      const orders = getStoredOrders();
      const found = orders.find((o) => String(o.id) === String(id));
      if (!found) {
        throw new Error(`Không tìm thấy đơn hàng #${id}`);
      }
      return applyQrOverrideIfNeeded(found);
    }
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
      return response;
    } catch (err) {
      if (err.response?.status === 403) {
        throw err;
      }
      const nowIso = new Date().toISOString();
      const orders = getStoredOrders();
      const updatedOrders = orders.map((o) => {
        if (String(o.id) === String(id)) {
          const prevStatus = o.status || ORDER_STATUS.PENDING;
          const existingHistories = Array.isArray(o.statusHistories) ? o.statusHistories : [];
          const cancelEntry = {
            id: Date.now(),
            orderId: o.id,
            status: ORDER_STATUS.CANCELLED,
            statusDescription: STATUS_DESCRIPTIONS[ORDER_STATUS.CANCELLED],
            previousStatus: prevStatus,
            action: 'ORDER_CANCELLED',
            updatedBy: o.userEmail || 'CUSTOMER',
            actorRole: 'ROLE_USER',
            note: 'Khách hàng hủy đơn hàng',
            createdAt: nowIso
          };
          return {
            ...o,
            status: ORDER_STATUS.CANCELLED,
            updatedAt: nowIso,
            statusHistories: [...existingHistories, cancelEntry]
          };
        }
        return o;
      });
      setStoredOrders(updatedOrders);
      const updatedOrder = updatedOrders.find((o) => String(o.id) === String(id));
      notifyOrderStatusSync({
        orderId: id,
        status: ORDER_STATUS.CANCELLED,
        actorRole: 'ROLE_USER',
        action: 'ORDER_CANCELLED'
      });
      return updatedOrder;
    }
  },

  // Admin xem toàn bộ đơn hàng có phân trang & lọc trạng thái (GET /api/v1/admin/orders)
  // Không tự thay thế lỗi API bằng dữ liệu mock để UI hiển thị chính xác Error State & nút Thử lại.
  getAllOrders: async (params = {}) => {
    const response = await api.get('/admin/orders', { params });

    // Nếu Backend trả về PagedResponse { content, pageNumber, pageSize, totalElements, totalPages, last }
    if (response && Array.isArray(response.content)) {
      const normalizedContent = response.content
        .map((item) => normalizeOrderFromBackend(item) || item)
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
        .map((item) => normalizeOrderFromBackend(item) || item)
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

  // Admin xem chi tiết đơn hàng (GET /api/v1/orders/{orderId} hoặc /api/v1/admin/orders/{orderId})
  getAdminOrderById: async (id) => {
    try {
      return await api.get(`/orders/${id}`);
    } catch (err) {
      try {
        return await api.get(`/admin/orders/${id}`);
      } catch (adminErr) {
        return orderService.getOrderById(id);
      }
    }
  },

  // [Task ECOM-315 / ECOM-311] Lấy lịch sử dòng thời gian trạng thái đơn hàng (Timeline)
  // Endpoint: GET /api/v1/orders/{orderId}/history
  getOrderStatusHistory: async (id) => {
    try {
      const response = await api.get(`/orders/${id}/history`);
      if (Array.isArray(response)) {
        return response;
      }
      if (response && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (err) {
      // Nếu là lỗi bảo mật 403 (IDOR) thì ném lỗi để UI hiển thị thông báo phân quyền
      if (err.response?.status === 403) {
        throw err;
      }

      // Thử gọi qua endpoint admin nếu người dùng có vai trò Admin
      try {
        const adminRes = await api.get(`/admin/orders/${id}/history`);
        if (Array.isArray(adminRes)) return adminRes;
        if (adminRes && Array.isArray(adminRes.data)) return adminRes.data;
      } catch (adminErr) {
        // Tiếp tục xử lý fallback
      }

      // Fallback Mock History khi chạy offline hoặc Backend chưa có dữ liệu DB
      const orders = getStoredOrders();
      const order = orders.find((o) => String(o.id) === String(id));
      if (!order) {
        return [];
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
      notifyOrderStatusSync({
        orderId: id,
        status,
        note,
        actorRole: 'ROLE_ADMIN',
        action: 'ADMIN_STATUS_UPDATE'
      });
      return response;
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 403 || err.response?.status === 404) {
        throw err;
      }
      const nowIso = new Date().toISOString();
      const orders = getStoredOrders();
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

    const getCount = (key) => Number(statusMap[key] ?? 0);

    const pendingOrders = Number(rawStats?.pendingOrders ?? getCount('PENDING'));
    const completedOrders = Number(rawStats?.completedOrders ?? getCount('DELIVERED'));
    const cancelledOrders = Number(rawStats?.cancelledOrders ?? getCount('CANCELLED'));
    const processingOrders =
      getCount('PAID') +
      getCount('CONFIRMED') +
      getCount('PROCESSING') +
      getCount('SHIPPING');

    let totalUsers = Number(rawStats?.totalUsers ?? 0);
    if (totalUsers === 0) {
      try {
        const countRes = await api.get('/admin/customers/count');
        const parsedCount = Number(countRes ?? 0);
        if (Number.isFinite(parsedCount) && parsedCount > 0) {
          totalUsers = parsedCount;
        }
      } catch {
        // Giữ nguyên giá trị 0 từ DashboardResponse nếu endpoint count không phản hồi
      }
    }

    return {
      totalOrders: Number(rawStats?.totalOrders ?? 0),
      totalRevenue: Number(rawStats?.totalRevenue ?? 0),
      ordersByStatus: {
        PENDING: getCount('PENDING'),
        PAID: getCount('PAID'),
        CONFIRMED: getCount('CONFIRMED'),
        PROCESSING: getCount('PROCESSING'),
        SHIPPING: getCount('SHIPPING'),
        DELIVERED: getCount('DELIVERED'),
        CANCELLED: getCount('CANCELLED'),
        FAILED: getCount('FAILED'),
        REFUNDED: getCount('REFUNDED'),
        ...statusMap
      },
      pendingOrders,
      completedOrders,
      cancelledOrders,
      processingOrders,
      lowStockProductsCount: Number(rawStats?.lowStockProductsCount ?? 0),
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
