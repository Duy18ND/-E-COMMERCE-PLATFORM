package com.ecommerce.payment.dto.response;

import com.ecommerce.payment.enums.PaymentStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {

    private Long id;
    private Long orderId;
    private BigDecimal amount;
    private String paymentMethod;
    private PaymentStatus status;
    private String transactionCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
