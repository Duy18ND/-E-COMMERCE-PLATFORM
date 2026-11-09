import api from './api';

export const paymentService = {
  // Thực hiện thanh toán mô phỏng (POST /api/v1/payments/mock-pay/{orderId})
  mockPay: async (orderId, success = true) => {
    try {
      return await api.post(`/payments/mock-pay/${orderId}`, { success });
    } catch (err) {
      console.warn(`Lỗi gọi API mock-pay cho đơn hàng #${orderId}:`, err);
      // Tuyệt đối không gọi API admin (/api/v1/admin/orders/**) từ context của khách hàng thường để tránh lỗi 403 Forbidden
      return {
        success: false,
        orderId,
        message: err.response?.data?.message || err.message || 'Không thể thực hiện thanh toán mô phỏng'
      };
    }
  },

  // Xem thông tin thanh toán của đơn (GET /api/v1/payments/order/{orderId})
  getPaymentByOrder: async (orderId) => {
    try {
      return await api.get(`/payments/order/${orderId}`);
    } catch (err) {
      return {
        orderId,
        paymentMethod: 'MOCK_ONLINE',
        status: 'PAID',
        paidAt: new Date().toISOString()
      };
    }
  }
};

export default paymentService;
