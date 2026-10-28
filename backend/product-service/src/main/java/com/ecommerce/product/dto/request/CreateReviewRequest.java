package com.ecommerce.product.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Request DTO ð? t?o ho?c c?p nh?t m?t ðánh giá s?n ph?m.
 */
@Getter
@Setter
public class CreateReviewRequest {

    @NotNull(message = "orderId không ðý?c ð? tr?ng")
    private Long orderId;

    @NotNull(message = "rating không ðý?c ð? tr?ng")
    @Min(value = 1, message = "rating t?i thi?u là 1 sao")
    @Max(value = 5, message = "rating t?i ða là 5 sao")
    private Integer rating;

    @Size(max = 2000, message = "B?nh lu?n không ðý?c vý?t quá 2000 k? t?")
    private String comment;
}
