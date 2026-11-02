package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
public class StockInboundRequest {

    @NotNull(message = "Số lượng nhập kho không được để trống")
    @Min(value = 1, message = "Số lượng nhập kho phải lớn hơn hoặc bằng 1")
    private Integer quantity;

    @Size(max = 255, message = "Ghi chú không được vượt quá 255 ký tự")
    private String note;
}

