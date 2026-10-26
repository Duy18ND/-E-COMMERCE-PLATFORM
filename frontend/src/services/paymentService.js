import api from './api';

export const paymentService = {
  // Thực hiện thanh toán mô phỏng (POST /api/payments/mock-pay/{orderId})
  mockPay: async (orderId, success = true) => {
    return await api.post(`/payments/mock-pay/${orderId}`, { success });
  },

  // Xem thông tin thanh toán của đơn (GET /api/payments/order/{orderId})
  getPaymentByOrder: async (orderId) => {
    return await api.get(`/payments/order/${orderId}`);
  }
};

export default paymentService;
