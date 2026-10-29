package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Request DTO for reserving stock during a Flash Sale event.
 *
 * @param productId the ID of the product to reserve
 * @param quantity  number of items to reserve; must be at least 1
 */
public record FlashSaleReserveRequest(

        @NotNull(message = "productId không được để trống")
        Long productId,

        @NotNull(message = "quantity không được để trống")
        @Min(value = 1, message = "quantity phải lớn hơn 0")
        Integer quantity
) {}

