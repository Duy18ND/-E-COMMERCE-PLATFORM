package com.ecommerce.order.dto.response;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplyVoucherResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private VoucherResponse voucher;
    private BigDecimal discountAmount;
    private BigDecimal finalAmount;
}

