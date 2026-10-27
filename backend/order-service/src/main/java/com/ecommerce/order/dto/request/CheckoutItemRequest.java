package com.ecommerce.order.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.io.Serializable;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckoutItemRequest implements Serializable {

    private static final long serialVersionUID = 1L;

    @NotNull(message = "Product ID không được để trống")
    private Long productId;

    @NotBlank(message = "Tên sản phẩm không được để trống")
    private String productName;

    @NotNull(message = "Số lượng không được để trống")
    @Min(value = 1, message = "Số lượng phải lớn hơn hoặc bằng 1")
    private Integer quantity;

    @NotNull(message = "Giá tại thời điểm mua không được để trống")
    @DecimalMin(value = "0.0", inclusive = false, message = "Giá mua phải lớn hơn 0")
    private BigDecimal priceAtPurchase;
}
