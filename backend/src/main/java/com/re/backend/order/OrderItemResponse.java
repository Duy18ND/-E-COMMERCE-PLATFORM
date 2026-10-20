package com.re.backend.order;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderItemResponse {

    private Long itemId;
    private Long productId;
    private String productName;
    private String imageUrl;
    private Integer quantity;
    private BigDecimal priceAtPurchase;
    private BigDecimal subTotal;
}
