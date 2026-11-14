import api from './api';
import { ORDER_STATUS } from '../utils/constants';
import { ORDER_STATUS_SYNC_EVENT } from './orderService';

const ORDER_SYNC_SIGNAL_KEY = 'shopmart_order_sync_signal';

/**
 * Chuẩn hóa phản hồi thanh toán từ Backend.
 * Phân biệt rõ 3 trạng thái thực tế từ Backend:
 * - Thanh toán thành công (SUCCESS / ORDER_STATUS.PAID)
 * - Đang xử lý / chờ thanh toán (PENDING / PROCESSING)
 * - Thanh toán thất bại (FAILED)
 */
export const normalizePaymentResponse = (rawPayment, fallbackOrderId = null) => {
  if (!rawPayment || typeof rawPayment !== 'object') return null;

  const rawStatus = String(rawPayment.status || 'PENDING').trim().toUpperCase();
  const isPaid = rawStatus === 'SUCCESS' || rawStatus === ORDER_STATUS.PAID;
  const isFailed = rawStatus === 'FAILED' || rawStatus === ORDER_STATUS.FAILED;
  const isPending = !isPaid && !isFailed;

  const resolvedOrderStatus = isPaid
    ? ORDER_STATUS.PAID
    : isFailed
      ? ORDER_STATUS.FAILED
      : ORDER_STATUS.PENDING;

  return {
    ...rawPayment,
    orderId: rawPayment.orderId ?? fallbackOrderId,
    status: rawStatus,
    orderStatus: resolvedOrderStatus,
    isPaid,
    isPending,
    isFailed
  };
};

const emitPaymentStatusSyncSignal = (orderId, normalizedPayment) => {
  if (typeof window === 'undefined' || !normalizedPayment) return;
  if (!normalizedPayment.isPaid && !normalizedPayment.isFailed) return;

  try {
    const syncDetail = {
      orderId,
      status: normalizedPayment.orderStatus,
      actorRole: 'SYSTEM',
      action: normalizedPayment.isPaid ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
      timestamp: new Date().toISOString()
    };
    if (window.localStorage) {
      window.localStorage.setItem(ORDER_SYNC_SIGNAL_KEY, JSON.stringify(syncDetail));
    }
    if (typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(
        new CustomEvent(ORDER_STATUS_SYNC_EVENT || 'shopmart:order-status-updated', {
          detail: syncDetail
        })
      );
    }
  } catch {
    // Bỏ qua lỗi phát tín hiệu đồng bộ tab
  }
};

export const paymentService = {
  /**
   * Thực hiện / xác nhận thanh toán mô phỏng (POST /api/v1/payments/mock-pay/{orderId})
   * Body: { success, note }
   *  - success = true  → Payment SUCCESS, Kafka payment-success → đơn hàng chuyển PAID
   *  - success = false → Payment FAILED,  Kafka payment-failed  → Saga Rollback (hoàn kho + hoàn lượt Voucher)
   *
   * Tuyệt đối KHÔNG trả về status: 'PAID' trong catch khi API thất bại.
   */
  mockPay: async (orderId, success = true, note = '') => {
    const isSuccess = Boolean(success);
    try {
      const response = await api.post(`/payments/mock-pay/${orderId}`, {
        success: isSuccess,
        note: note ? String(note).slice(0, 255) : undefined
      });
      const normalized = normalizePaymentResponse(response, orderId);
      emitPaymentStatusSyncSignal(orderId, normalized);
      return normalized || response;
    } catch (err) {
      const error = new Error(
        err?.response?.data?.message ||
          err?.message ||
          'Không thể thực hiện thanh toán. Máy chủ thanh toán hiện không phản hồi, vui lòng thử lại.'
      );
      error.status = err?.status || err?.response?.status;
      error.response = err?.response;
      error.orderId = orderId;
      throw error;
    }
  },

  /**
   * Xem thông tin thanh toán của đơn (GET /api/v1/payments/order/{orderId})
   * Tuyệt đối KHÔNG nuốt lỗi API và KHÔNG trả về status: 'PAID' giả khi API lỗi.
   */
  getPaymentByOrder: async (orderId) => {
    try {
      const response = await api.get(`/payments/order/${orderId}`);
      return normalizePaymentResponse(response, orderId) || response;
    } catch (err) {
      const error = new Error(
        err?.response?.data?.message ||
          err?.message ||
          `Không thể tải thông tin thanh toán của đơn hàng #${orderId}.`
      );
      error.status = err?.status || err?.response?.status;
      error.response = err?.response;
      error.orderId = orderId;
      throw error;
    }
  }
};

export default paymentService;
