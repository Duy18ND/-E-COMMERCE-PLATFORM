package com.re.backend.cart;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CartItemResponse {

    private Long itemId;
    private Long productId;
    private String productName;
    private BigDecimal unitPrice;
    private String imageUrl;
    private Integer quantity;
    private BigDecimal subTotal;
}
