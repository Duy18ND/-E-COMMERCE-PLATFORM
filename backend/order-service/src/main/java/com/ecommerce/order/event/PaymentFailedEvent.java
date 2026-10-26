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
public class PaymentFailedEvent implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long orderId;
    private String reason;
    private LocalDateTime timestamp;
}
