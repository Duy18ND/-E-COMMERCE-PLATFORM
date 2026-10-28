package com.ecommerce.order.event;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
@JsonIgnoreProperties(ignoreUnknown = true)
public class PaymentSuccessEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long orderId;
    private Long paymentId;
    private String transactionCode;
    private LocalDateTime timestamp;
}
