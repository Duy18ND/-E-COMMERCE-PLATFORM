package com.ecommerce.order.enums;

/**
 * Trạng thái của đơn hàng trong hệ thống.
 */
public enum OrderStatus {
    PENDING,     // Đơn hàng vừa tạo, đang chờ thanh toán / xác nhận
    PAID,        // Đơn hàng đã được thanh toán thành công
    CONFIRMED,   // Đơn hàng đã được xác nhận bởi seller / admin
    PROCESSING,  // Đơn hàng đang được chuẩn bị / đóng gói
    SHIPPING,    // Đơn hàng đang vận chuyển
    DELIVERED,   // Đơn hàng đã giao thành công — đủ điều kiện để đánh giá
    CANCELLED,   // Đơn hàng bị hủy (khách hủy hoặc thanh toán thất bại)
    FAILED,      // Đơn hàng thất bại do lỗi hệ thống / trừ kho thất bại
    REFUNDED     // Đơn hàng đã được hoàn tiền
}
