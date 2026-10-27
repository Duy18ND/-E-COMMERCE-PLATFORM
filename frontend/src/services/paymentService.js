import api from './api';
import orderService from './orderService';
import { ORDER_STATUS } from '../utils/constants';

export const paymentService = {
  // Thực hiện thanh toán mô phỏng (POST /api/payments/mock-pay/{orderId})
  mockPay: async (orderId, success = true) => {
    try {
      return await api.post(`/payments/mock-pay/${orderId}`, { success });
    } catch (err) {
      if (success) {
        return await orderService.updateOrderStatus(orderId, ORDER_STATUS.PAID);
      }
      return { success: false };
    }
  },

  // Xem thông tin thanh toán của đơn (GET /api/payments/order/{orderId})
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
