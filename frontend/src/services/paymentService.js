import api from './api';
import { ORDER_STATUS } from '../utils/constants';

export const paymentService = {
  // Thực hiện thanh toán mô phỏng (POST /api/v1/payments/mock-pay/{orderId})
  mockPay: async (orderId, success = true, provider = null) => {
    try {
      return await api.post(`/payments/mock-pay/${orderId}`, { success, provider });
    } catch (err) {
      console.warn(`Lỗi gọi API mock-pay cho đơn hàng #${orderId}:`, err);
      // Tuyệt đối không gọi API admin (/api/v1/admin/orders/**) từ context của khách hàng thường để tránh lỗi 403 Forbidden
      if (!err.response && success) {
        try {
          const raw = localStorage.getItem('shopmart_orders_mock');
          if (raw) {
            const orders = JSON.parse(raw).map((o) =>
              String(o.id) === String(orderId) ? { ...o, status: ORDER_STATUS.PAID } : o
            );
            localStorage.setItem('shopmart_orders_mock', JSON.stringify(orders));
          }
        } catch (_) {
          // ignore localStorage error
        }
      }
      return {
        success: false,
        orderId,
        status: success ? ORDER_STATUS.PAID : ORDER_STATUS.PENDING,
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
        status: ORDER_STATUS.PAID,
        paidAt: new Date().toISOString()
      };
    }
  }
};

export default paymentService;
