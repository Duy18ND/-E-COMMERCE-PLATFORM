package com.ecommerce.product.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Response DTO trả về thông tin một đánh giá sản phẩm.
 */
@Getter
@Builder
public class ReviewResponse {

    private Long id;
    private Long productId;
    private Long userId;
    private Long orderId;
    private Integer rating;
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}