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
     * - Chỉ chủ sở hữu đơn hàng hoặc ROLE_ADMIN mới được phép thao tác.
     * - Chỉ cho phép đối với giao dịch online đang ở trạng thái PENDING (chặn COD, chưa tồn tại, SUCCESS, FAILED).
     * - isSuccess = true: Cập nhật SUCCESS, sinh transactionCode và bắn event payment-success.
     * - isSuccess = false: Cập nhật FAILED và bắn event payment-failed để hoàn kho (Saga Rollback).
     */
    PaymentResponse mockPay(Long orderId, boolean isSuccess, Long userId, String userRoles);

    /**
     * Tra cứu thông tin thanh toán theo orderId (chỉ chủ sở hữu hoặc ROLE_ADMIN)
     */
    PaymentResponse getPaymentByOrderId(Long orderId, Long userId, String userRoles);

    /**
     * Tra cứu thông tin thanh toán theo paymentId (chỉ chủ sở hữu hoặc ROLE_ADMIN)
     */
    PaymentResponse getPaymentById(Long id, Long userId, String userRoles);
}
