package com.ecommerce.order.enums;

/**
 * Trạng thái của đơn hàng trong hệ thống.
 */
public enum OrderStatus {
    PENDING,    // Đơn hàng vừa tạo, đang chờ thanh toán / xác nhận
    PAID,       // Đơn hàng đã được thanh toán thành công
    CANCELLED,  // Đơn hàng bị hủy (khách hủy hoặc thanh toán thất bại)
    FAILED      // Đơn hàng thất bại do lỗi hệ thống / trừ kho thất bại
}
