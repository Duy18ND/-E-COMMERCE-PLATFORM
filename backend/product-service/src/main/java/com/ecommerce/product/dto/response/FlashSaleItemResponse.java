package com.ecommerce.product.dto.response;

import java.io.Serializable;
import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FlashSaleItemResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long productId;
    private String productName;
    private BigDecimal originalPrice;
    private String imageUrl;
    private String category;
    private BigDecimal flashSalePrice;
    private Integer quantity;
    private Integer soldQuantity;
    private Integer remainingStock;
    private Integer userLimit;
}

