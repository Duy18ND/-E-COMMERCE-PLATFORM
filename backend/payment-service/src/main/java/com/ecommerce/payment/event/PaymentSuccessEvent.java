package com.ecommerce.payment.event;

import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class PaymentSuccessEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long orderId;
    private Long paymentId;
    private String transactionCode;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
