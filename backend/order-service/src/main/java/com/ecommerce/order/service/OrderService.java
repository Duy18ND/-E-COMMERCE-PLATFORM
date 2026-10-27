package com.ecommerce.order.service;

import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.response.OrderResponse;

import java.util.List;

public interface OrderService {

    /**
     * Thực hiện checkout đơn hàng:
     * 1. Gọi ProductClient reserve-stock để trừ số lượng trong kho
     * 2. Lưu Order ở trạng thái PENDING và các OrderItem liên quan
     * 3. Bắn event order-created qua Kafka cho payment-service
     */
    OrderResponse checkout(CheckoutRequest request);

    /**
     * Hủy đơn hàng:
     * Chỉ cho phép hủy khi trạng thái là PENDING.
     * Chuyển trạng thái sang CANCELLED và gọi ProductClient restore-stock để hoàn kho.
     */
    OrderResponse cancelOrder(Long orderId);

    /**
     * Lấy chi tiết đơn hàng theo ID (sử dụng fetch join để chống N+1).
     */
    OrderResponse getOrderById(Long id);

    /**
     * Lấy danh sách lịch sử đơn hàng của người dùng.
     */
    List<OrderResponse> getOrdersByUserId(Long userId);

    /**
     * Saga Step: Xử lý sự kiện thanh toán thành công từ payment-service.
     * Cập nhật trạng thái Order sang PAID.
     */
    void handlePaymentSuccess(com.ecommerce.order.event.PaymentSuccessEvent event);

    /**
     * Saga Compensating Transaction: Xử lý sự kiện thanh toán thất bại từ payment-service.
     * 1. Cập nhật trạng thái Order sang FAILED.
     * 2. Gọi ProductClient restoreStock để hoàn lại tồn kho cho Product Service (Saga Rollback).
     */
    void handlePaymentFailed(com.ecommerce.order.event.PaymentFailedEvent event);
}
