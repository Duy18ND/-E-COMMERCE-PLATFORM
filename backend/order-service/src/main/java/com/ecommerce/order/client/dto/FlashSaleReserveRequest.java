package com.ecommerce.order.client.dto;

import java.io.Serializable;

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
public class FlashSaleReserveRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long productId;
    private Integer quantity;
}

