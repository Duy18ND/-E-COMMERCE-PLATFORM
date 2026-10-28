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
public class PaymentFailedEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long orderId;
    private String reason;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
