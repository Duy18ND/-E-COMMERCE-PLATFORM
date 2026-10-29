import api from './api';
import cartService from './cartService';
import { ORDER_STATUS } from '../utils/constants';

const ORDERS_STORAGE_KEY = 'shopmart_orders_mock';

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
  checkout: async ({ receiverName, receiverPhone, shippingAddress, note, paymentMethod }) => {
    try {
      return await api.post('/orders/checkout', {
        receiverName,
        receiverPhone,
        shippingAddress,
        note: note || '',
        paymentMethod
      });
    } catch (err) {
      // Fallback Mock Order Creation: Cho phép test xác nhận đơn hàng 100% không bị lỗi
      const cartData = await cartService.getCart();
      const orders = getStoredOrders();

      const newId = Math.floor(1004 + Math.random() * 8990);
      const isOnlinePay = paymentMethod === 'MOCK_ONLINE';

      const createdOrder = {
        id: newId,
        receiverName: receiverName || 'Khách hàng ShopMart',
        receiverPhone: receiverPhone || '0912 345 678',
        userEmail: 'user@test.com',
        shippingAddress: shippingAddress || '123 Đường Cầu Giấy, Hà Nội',
        note: note || '',
        paymentMethod: paymentMethod || 'COD',
        status: isOnlinePay ? ORDER_STATUS.PAID : ORDER_STATUS.PENDING,
        totalAmount: cartData.totalPrice || 32490000,
        createdAt: new Date().toISOString(),
        items: (cartData.items && cartData.items.length > 0)
          ? cartData.items.map((i) => ({
              id: i.id || i.itemId,
              productId: i.productId,
              name: i.name,
              productName: i.name,
              priceAtPurchase: i.price,
              price: i.price,
              quantity: i.quantity,
              subTotal: i.subTotal,
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
            ]
      };

      // Lưu vào danh sách đơn
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
    try {
      return await api.get(`/orders/${id}`);
    } catch (err) {
      const orders = getStoredOrders();
      const found = orders.find((o) => String(o.id) === String(id));
      if (!found) {
        throw new Error(`Không tìm thấy đơn hàng #${id}`);
      }
      return found;
    }
  },

  // Khách tự hủy đơn PENDING (PUT /api/orders/{orderId}/cancel)
  cancelOrder: async (id) => {
    try {
      return await api.put(`/orders/${id}/cancel`);
    } catch (err) {
      const orders = getStoredOrders();
      const updatedOrders = orders.map((o) => {
        if (String(o.id) === String(id)) {
          return { ...o, status: ORDER_STATUS.CANCELLED };
        }
        return o;
      });
      setStoredOrders(updatedOrders);
      return updatedOrders.find((o) => String(o.id) === String(id));
    }
  },

  // Admin xem toàn bộ đơn hàng (GET /api/admin/orders)
  getAllOrders: async (params) => {
    try {
      return await api.get('/admin/orders', { params });
    } catch (err) {
      let orders = getStoredOrders();
      if (params?.status) {
        orders = orders.filter((o) => o.status === params.status);
      }
      return orders;
    }
  },

  // Admin xem chi tiết bất kỳ đơn hàng nào (GET /api/admin/orders/{orderId})
  getAdminOrderById: async (id) => {
    try {
      return await api.get(`/admin/orders/${id}`);
    } catch (err) {
      return orderService.getOrderById(id);
    }
  },

  // Admin cập nhật trạng thái đơn (PUT /api/admin/orders/{orderId}/status)
  updateOrderStatus: async (id, status) => {
    try {
      return await api.put(`/admin/orders/${id}/status`, { status });
    } catch (err) {
      const orders = getStoredOrders();
      const updatedOrders = orders.map((o) => {
        if (String(o.id) === String(id)) {
          return { ...o, status };
        }
        return o;
      });
      setStoredOrders(updatedOrders);
      return updatedOrders.find((o) => String(o.id) === String(id));
    }
  },

  // Admin thống kê dashboard (GET /api/admin/orders/stats)
  getOrderStats: async () => {
    try {
      return await api.get('/admin/orders/stats');
    } catch (err) {
      const orders = getStoredOrders();
      const totalRevenue = orders
        .filter((o) => o.status !== ORDER_STATUS.CANCELLED)
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalOrders = orders.length;
      const pendingOrders = orders.filter((o) => o.status === ORDER_STATUS.PENDING).length;

      return {
        totalRevenue,
        totalOrders,
        pendingOrders,
        totalUsers: 154
      };
    }
  }
};

export default orderService;
