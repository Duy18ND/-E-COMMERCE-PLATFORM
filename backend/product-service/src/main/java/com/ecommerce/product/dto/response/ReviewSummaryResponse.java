package com.ecommerce.product.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * Tóm t?t th?ng kê ðánh giá c?a m?t s?n ph?m (ði?m trung b?nh + t?ng s? ðánh giá).
 */
@Getter
@Builder
public class ReviewSummaryResponse {

    private Long productId;
    private Double averageRating;
    private Long totalReviews;
    private PagedResponse<ReviewResponse> reviews;
}
