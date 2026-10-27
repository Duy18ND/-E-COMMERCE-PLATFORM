package com.ecommerce.order.enums;

/**
 * Phương thức thanh toán được hỗ trợ.
 */
public enum PaymentMethod {
    MOCK_ONLINE,    // Thanh toán trực tuyến giả lập (qua Payment Service)
    COD             // Thanh toán khi nhận hàng (Cash On Delivery)
}
