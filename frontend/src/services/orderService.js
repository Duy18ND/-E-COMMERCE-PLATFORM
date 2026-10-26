import api from './api';

export const orderService = {
  // Tạo đơn hàng từ giỏ hàng hiện tại (POST /api/orders/checkout)
  checkout: async ({ receiverName, receiverPhone, shippingAddress, note, paymentMethod }) => {
    return await api.post('/orders/checkout', {
      receiverName,
      receiverPhone,
      shippingAddress,
      note: note || '',
      paymentMethod
    });
  },

  // Alias tương thích với createOrder
  createOrder: async (orderData) => {
    return await orderService.checkout(orderData);
  },

  // Lịch sử đơn hàng của user đang đăng nhập (GET /api/orders/my-orders)
  getMyOrders: async () => {
    return await api.get('/orders/my-orders');
  },

  // Chi tiết đơn hàng của user (GET /api/orders/{orderId})
  getOrderById: async (id) => {
    return await api.get(`/orders/${id}`);
  },

  // Khách tự hủy đơn PENDING (PUT /api/orders/{orderId}/cancel)
  cancelOrder: async (id) => {
    return await api.put(`/orders/${id}/cancel`);
  },

  // Admin xem toàn bộ đơn hàng (GET /api/admin/orders)
  getAllOrders: async (params) => {
    return await api.get('/admin/orders', { params });
  },

  // Admin xem chi tiết bất kỳ đơn hàng nào (GET /api/admin/orders/{orderId})
  getAdminOrderById: async (id) => {
    return await api.get(`/admin/orders/${id}`);
  },

  // Admin cập nhật trạng thái đơn (PUT /api/admin/orders/{orderId}/status)
  updateOrderStatus: async (id, status) => {
    return await api.put(`/admin/orders/${id}/status`, { status });
  },

  // Admin thống kê dashboard (GET /api/admin/orders/stats)
  getOrderStats: async () => {
    return await api.get('/admin/orders/stats');
  }
};

export default orderService;
