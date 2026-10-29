package com.ecommerce.product.client.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO nhận thông tin đơn hàng từ Order Service qua Feign.
 * Dùng để kiểm tra điều kiện đánh giá (status DELIVERED và chứa sản phẩm).
 */
@Getter
@Setter
public class OrderDetailResponse {

    private Long id;
    private Long userId;
    private String status;        // "DELIVERED", "PAID", v.v.
    private List<OrderItemDetail> items;

    @Getter
    @Setter
    public static class OrderItemDetail {
        private Long productId;
        private Integer quantity;
        private BigDecimal priceAtPurchase;
        private LocalDateTime createdAt;
    }
}