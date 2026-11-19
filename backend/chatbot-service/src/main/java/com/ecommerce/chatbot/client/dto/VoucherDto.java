package com.ecommerce.chatbot.client.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class VoucherDto {
    private Long id;
    private String code;
    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal minOrderValue;
    @JsonAlias({"maxDiscount", "maxDiscountAmount"})
    private BigDecimal maxDiscountAmount;
    private BigDecimal maxDiscount;
    private String startDate;
    private String endDate;
    @JsonAlias({"quantity", "usageLimit"})
    private Integer usageLimit;
    @JsonAlias({"usedQuantity", "usedCount"})
    private Integer usedCount;
    private Integer remainingUsage;
    private String status;

    public BigDecimal getMaxDiscountAmount() {
        return maxDiscountAmount != null ? maxDiscountAmount : maxDiscount;
    }
}

