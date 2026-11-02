package com.ecommerce.payment.service;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.event.OrderCreatedEvent;

public interface PaymentService {

    /**
     * Xử lý thanh toán dựa trên sự kiện OrderCreated:
     * - Nếu paymentMethod là COD: Lưu Payment ở trạng thái PENDING (chờ thu tiền khi nhận hàng), không bắn event PAID.
     * - Nếu paymentMethod là MOCK_ONLINE:
     *   + Nếu amount > 50,000,000 VND -> Đổi trạng thái FAILED, bắn event payment-failed (Saga Rollback).
     *   + Ngược lại -> Sinh transactionCode, đổi trạng thái SUCCESS, bắn event payment-success.
     */
    PaymentResponse processOrderPayment(OrderCreatedEvent event);

    /**
     * Giả lập / Xác nhận thanh toán thủ công cho đơn hàng theo orderId:
     * - isSuccess = true: Cập nhật SUCCESS, sinh transactionCode và bắn event payment-success.
     * - isSuccess = false: Cập nhật FAILED và bắn event payment-failed để hoàn kho (Saga Rollback).
     */
    PaymentResponse mockPay(Long orderId, boolean isSuccess);

    /**
     * Tra cứu thông tin thanh toán theo orderId
     */
    PaymentResponse getPaymentByOrderId(Long orderId);

    /**
     * Tra cứu thông tin thanh toán theo paymentId
     */
    PaymentResponse getPaymentById(Long id);
}
