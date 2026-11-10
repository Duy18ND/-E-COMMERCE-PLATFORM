import api from './api';
import { ORDER_STATUS } from '../utils/constants';
import { ORDER_STATUS_SYNC_EVENT } from './orderService';

// Đồng bộ chính xác với ORDERS_STORAGE_KEY trong orderService.js
const ORDERS_STORAGE_KEY = 'shopmart_orders_mock';
const ORDER_SYNC_SIGNAL_KEY = 'shopmart_order_sync_signal';
export const QR_PAYMENT_OVERRIDES_KEY = 'shopmart_qr_payment_overrides';

const syncOfflineOrderPaymentStatus = (orderId, isSuccess, note) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const nowIso = new Date().toISOString();
    const nextStatus = isSuccess ? ORDER_STATUS.PAID : 'FAILED';
    const nextDesc = isSuccess
      ? 'Đã thanh toán thành công qua cổng thanh toán'
      : 'Đơn hàng xử lý thất bại';
    const historyEntry = {
      id: Date.now(),
      orderId: Number(orderId) || orderId,
      status: nextStatus,
      statusDescription: nextDesc,
      previousStatus: 'PENDING',
      action: isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
      updatedBy: 'PAYMENT_SERVICE',
      actorRole: 'SYSTEM',
      note: note || (isSuccess ? 'Đã thanh toán thành công qua cổng thanh toán QR' : 'Thanh toán thất bại — đã hoàn kho & hoàn Voucher'),
      createdAt: nowIso
    };

    // Lưu trạng thái vừa xác nhận QR để đồng bộ tức thì kể cả khi Kafka đang trễ
    if (window.sessionStorage) {
      const rawOverrides = window.sessionStorage.getItem(QR_PAYMENT_OVERRIDES_KEY);
      const overrides = rawOverrides ? JSON.parse(rawOverrides) : {};
      overrides[String(orderId)] = { status: nextStatus, historyEntry, updatedAt: nowIso };
      window.sessionStorage.setItem(QR_PAYMENT_OVERRIDES_KEY, JSON.stringify(overrides));
    }

    const raw = window.localStorage.getItem(ORDERS_STORAGE_KEY);
    if (raw) {
      const orders = JSON.parse(raw);
      if (Array.isArray(orders)) {
        const updated = orders.map((o) => {
          if (String(o.id) !== String(orderId)) return o;
          const prevStatus = o.status || 'PENDING';
          const existingHistories = Array.isArray(o.statusHistories) && o.statusHistories.length > 0
            ? o.statusHistories
            : [
                {
                  id: Date.now() - 1000,
                  orderId: o.id,
                  status: 'PENDING',
                  statusDescription: 'Đơn hàng đã được đặt thành công, đang chờ xác nhận',
                  previousStatus: null,
                  action: 'ORDER_CREATED',
                  updatedBy: o.userEmail || 'CUSTOMER',
                  actorRole: 'ROLE_USER',
                  note: 'Đơn hàng được khởi tạo thành công',
                  createdAt: o.createdAt || nowIso
                }
              ];
          return {
            ...o,
            status: nextStatus,
            updatedAt: nowIso,
            statusHistories: [...existingHistories, { ...historyEntry, orderId: o.id, previousStatus: prevStatus }]
          };
        });
        window.localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updated));
      }
    }

    // Phát tín hiệu đồng bộ trạng thái đơn hàng cho OrderDetail / Orders
    const syncDetail = {
      orderId,
      status: nextStatus,
      actorRole: 'SYSTEM',
      action: isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
      timestamp: nowIso
    };
    window.localStorage.setItem(ORDER_SYNC_SIGNAL_KEY, JSON.stringify(syncDetail));
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(ORDER_STATUS_SYNC_EVENT || 'shopmart:order-status-updated', { detail: syncDetail }));
    }
  } catch (e) {
    console.warn('Không thể đồng bộ trạng thái thanh toán offline:', e);
  }
};

export const paymentService = {
  /**
   * Thực hiện / xác nhận thanh toán mô phỏng (POST /api/v1/payments/mock-pay/{orderId})
   * Body: { success, note }
   *  - success = true  → Payment SUCCESS, Kafka payment-success → đơn hàng chuyển PAID
   *  - success = false → Payment FAILED,  Kafka payment-failed  → Saga Rollback (hoàn kho + hoàn lượt Voucher)
   */
  mockPay: async (orderId, success = true, note = '') => {
    const isSuccess = Boolean(success);
    try {
      const response = await api.post(`/payments/mock-pay/${orderId}`, {
        success: isSuccess,
        note: note ? String(note).slice(0, 255) : undefined
      });
      syncOfflineOrderPaymentStatus(orderId, isSuccess, note);
      return response;
    } catch (err) {
      console.warn(`Lỗi gọi API mock-pay cho đơn hàng #${orderId}:`, err);
      // Tuyệt đối không gọi API admin (/api/v1/admin/orders/**) từ context của khách hàng thường để tránh lỗi 403 Forbidden
      if (err.response) {
        const error = new Error(
          err.response?.data?.message || err.message || 'Không thể thực hiện thanh toán mô phỏng'
        );
        error.status = err.status || err.response?.status;
        error.orderId = orderId;
        throw error;
      }
      // Fallback khi chạy Demo Frontend độc lập (không bật Backend)
      syncOfflineOrderPaymentStatus(orderId, isSuccess, note);
      return {
        orderId,
        paymentMethod: 'MOCK_ONLINE',
        status: isSuccess ? ORDER_STATUS.PAID : 'FAILED',
        transactionCode: isSuccess ? `TXN-${Date.now()}` : null,
        note: note || null,
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
