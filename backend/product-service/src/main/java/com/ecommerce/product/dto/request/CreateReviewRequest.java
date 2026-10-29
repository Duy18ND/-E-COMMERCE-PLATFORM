package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO �? t?o ho?c c?p nh?t m?t ��nh gi� s?n ph?m.
 */
@Getter
@Setter
public class CreateReviewRequest {

    @NotNull(message = "orderId không để trống")
    private Long orderId;

    @NotNull(message = "rating không để trống")
    @Min(value = 1, message = "rating tối thiểu là 1 sao")
    @Max(value = 5, message = "rating tối thiểu là 5 sao")
    private Integer rating;

    @Size(max = 2000, message = "bình luận không được vượt quá 2000 ký tự!")
    private String comment;
}
