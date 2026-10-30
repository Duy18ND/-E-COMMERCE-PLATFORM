package com.ecommerce.order.service;

import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.response.DashboardResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.PagedResponse;
import com.ecommerce.order.enums.OrderStatus;
import org.springframework.data.domain.Pageable;

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
     * [Task ECOM-267] Xây dựng API tạo đơn hàng từ giỏ (Checkout from Cart):
     * 1. Đọc danh sách sản phẩm trong giỏ hàng hiện tại của khách hàng.
     * 2. Kiểm tra và bảo lưu tồn kho tự động qua ProductClient (@Transactional).
     * 3. Tạo Order PENDING và xóa sạch giỏ hàng (clear cart).
     * 4. Bắn sự kiện order-created qua Kafka sang payment-service.
     */
    OrderResponse createOrderFromCart(Long userId, CheckoutRequest request);

    /**
     * Hủy đơn hàng:
     * Chỉ cho phép hủy khi trạng thái là PENDING.
     * Chuyển trạng thái sang CANCELLED và gọi ProductClient restore-stock để hoàn kho.
     */
    OrderResponse cancelOrder(Long orderId);

    /**
     * Hủy đơn hàng kèm xác thực người dùng sở hữu:
     * Kiểm tra quyền sở hữu đơn hàng (chống IDOR).
     */
    OrderResponse cancelOrder(Long orderId, Long userId);

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

    // ==========================================
    // Admin Operations (Task 10 & 11)
    // ==========================================

    /**
     * Lấy toàn bộ danh sách đơn hàng toàn hệ thống có phân trang và tùy chọn lọc theo trạng thái.
     */
    PagedResponse<OrderResponse> getAllOrders(OrderStatus status, Pageable pageable);

    /**
     * Cập nhật trạng thái đơn hàng theo State Machine:
     * - Kiểm tra các chuyển trạng thái hợp lệ.
     * - Nếu chuyển sang CANCELLED, bắt buộc gọi FeignClient ProductClient.restoreStock để hoàn lại tồn kho.
     */
    OrderResponse updateOrderStatus(Long orderId, OrderStatus newStatus);

    /**
     * Lấy thống kê tổng quan (Dashboard) cho Admin:
     * - Tổng số đơn hàng.
     * - Tổng doanh thu (chỉ tính đơn có trạng thái PAID, DELIVERED hoặc hoàn thành).
     * - Số lượng đơn hàng phân theo từng trạng thái.
     */
    DashboardResponse getOrderStatistics();
}
