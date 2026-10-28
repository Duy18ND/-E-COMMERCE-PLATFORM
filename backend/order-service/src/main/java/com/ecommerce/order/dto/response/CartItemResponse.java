package com.ecommerce.order.dto.response;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItemResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long productId;
    private String productName;
    private BigDecimal price;
    private Integer quantity;
    private BigDecimal subTotal;
    private String imageUrl;
    private Integer stockAvailable;
}
