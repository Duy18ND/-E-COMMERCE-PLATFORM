package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Request DTO dành riêng cho thao tác chỉnh sửa đánh giá sản phẩm (không yêu cầu orderId).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UpdateReviewRequest {

    @NotNull(message = "rating không được để trống")
    @Min(value = 1, message = "rating tối thiểu là 1 sao")
    @Max(value = 5, message = "rating tối đa là 5 sao")
    private Integer rating;

    @Size(max = 2000, message = "Bình luận không được vượt quá 2000 ký tự")
    private String comment;
}

