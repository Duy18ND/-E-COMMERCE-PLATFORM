package com.ecommerce.product.client.dto;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO nh?n thông tin ðõn hàng t? Order Service qua Feign.
 * Ch? c?n status và danh sách items ð? ki?m tra ði?u ki?n ðánh giá.
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
