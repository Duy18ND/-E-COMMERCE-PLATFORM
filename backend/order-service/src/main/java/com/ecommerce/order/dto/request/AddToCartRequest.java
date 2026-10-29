package com.ecommerce.order.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.io.Serializable;

/**
 * [Task ECOM-118 / ECOM-119 / ECOM-258] DTO nhận dữ liệu khi khách hàng thêm sản phẩm vào giỏ.
 * Validate `productId` bắt buộc có và `quantity >= 1`.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AddToCartRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    @NotNull(message = "Product ID không được để trống")
    private Long productId;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải lớn hơn hoặc bằng 1")
    private Integer quantity;
}
