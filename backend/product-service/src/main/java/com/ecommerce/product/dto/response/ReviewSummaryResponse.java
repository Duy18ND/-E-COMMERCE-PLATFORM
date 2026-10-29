package com.ecommerce.product.dto.response;

import lombok.Builder;
import lombok.Getter;

/**
 * Tóm tắt thống kê đánh giá của một sản phẩm (điểm trung bình + tổng số đánh giá).
 */
@Getter
@Builder
public class ReviewSummaryResponse {

    private Long productId;
    private Double averageRating;
    private Long totalReviews;
    private PagedResponse<ReviewResponse> reviews;
}