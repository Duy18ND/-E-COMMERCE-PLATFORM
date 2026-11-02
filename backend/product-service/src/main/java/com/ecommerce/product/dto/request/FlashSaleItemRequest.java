package com.ecommerce.product.dto.request;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

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
public class FlashSaleItemRequest {

    @NotNull(message = "ID sản phẩm không được để trống")
    private Long productId;

    @NotNull(message = "Giá Flash Sale không được để trống")
    @DecimalMin(value = "0.01", message = "Giá Flash Sale phải lớn hơn 0")
    private BigDecimal flashSalePrice;

    @NotNull(message = "Số lượng Flash Sale không được để trống")
    @Min(value = 1, message = "Số lượng Flash Sale tối thiểu là 1")
    private Integer quantity;

    @NotNull(message = "Giới hạn mua trên mỗi khách hàng không được để trống")
    @Min(value = 1, message = "Giới hạn mua tối thiểu là 1")
    private Integer userLimit;
}

