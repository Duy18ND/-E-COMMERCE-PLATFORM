package com.ecommerce.order.dto.response;

import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartResponse implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long id;
    private Long userId;
    @Builder.Default
    private List<CartItemResponse> items = new ArrayList<>();
    private Integer totalItems;
    private BigDecimal totalAmount;
}
