package com.ecommerce.product.dto.response;

import com.ecommerce.product.enums.ReviewStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Response DTO trả về thông tin một đánh giá sản phẩm.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewResponse {

    private Long id;
    private Long productId;
    private Long userId;
    private Long orderId;
    private Integer rating;
    private String comment;
    private ReviewStatus status;
    private String hiddenReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
