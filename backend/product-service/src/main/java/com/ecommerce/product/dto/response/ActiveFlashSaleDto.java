package com.ecommerce.product.dto.response;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;

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
public class ActiveFlashSaleDto implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long campaignId;
    private BigDecimal flashSalePrice;
    private Integer quantity;
    private Integer soldQuantity;
    private Integer remainingStock;
    private Integer userLimit;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
}

