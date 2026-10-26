package com.ecommerce.payment.service;

import com.ecommerce.payment.dto.response.PaymentResponse;
import com.ecommerce.payment.event.OrderCreatedEvent;

public interface PaymentService {

    /**
     * Xử lý mock thanh toán dựa trên sự kiện OrderCreated:
     * - Lưu thông tin Payment với trạng thái PENDING
     * - Nếu amount > 50,000,000 VND -> Đổi trạng thái FAILED, bắn event payment-failed
     * - Ngược lại -> Sinh transactionCode, đổi trạng thái SUCCESS, bắn event payment-success
     */
    PaymentResponse processOrderPayment(OrderCreatedEvent event);

    /**
     * Tra cứu thông tin thanh toán theo orderId
     */
    PaymentResponse getPaymentByOrderId(Long orderId);

    /**
     * Tra cứu thông tin thanh toán theo paymentId
     */
    PaymentResponse getPaymentById(Long id);
}
