package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO để tạo hoặc cập nhật một đánh giá sản phẩm.
 */
@Getter
@Setter
public class CreateReviewRequest {

    @NotNull(message = "orderId không được để trống")
    private Long orderId;

    @NotNull(message = "rating không được để trống")
    @Min(value = 1, message = "rating tối thiểu là 1 sao")
    @Max(value = 5, message = "rating tối đa là 5 sao")
    private Integer rating;

    @Size(max = 2000, message = "Bình luận không được vượt quá 2000 ký tự")
    private String comment;
}