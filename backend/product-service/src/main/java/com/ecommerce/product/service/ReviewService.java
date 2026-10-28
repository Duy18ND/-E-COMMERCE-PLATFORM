package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.dto.response.ReviewSummaryResponse;
import org.springframework.data.domain.Pageable;

public interface ReviewService {

    /**
     * T?o ðánh giá m?i cho s?n ph?m.
     * Ði?u ki?n: userId ph?i có ðõn hàng DELIVERED ch?a productId.
     * M?i user ch? ðý?c ðánh giá 1 l?n cho m?i s?n ph?m.
     *
     * @param productId  ID s?n ph?m c?n ðánh giá
     * @param userId     ID ngý?i dùng (l?y t? header X-User-Id)
     * @param request    D? li?u ðánh giá (rating, comment, orderId)
     * @return ReviewResponse
     */
    ReviewResponse createReview(Long productId, Long userId, CreateReviewRequest request);

    /**
     * C?p nh?t ðánh giá hi?n có.
     * Ch? owner c?a ðánh giá m?i ðý?c phép c?p nh?t.
     *
     * @param reviewId   ID ðánh giá
     * @param userId     ID ngý?i dùng ðang th?c hi?n c?p nh?t
     * @param request    D? li?u c?p nh?t
     * @return ReviewResponse
     */
    ReviewResponse updateReview(Long reviewId, Long userId, CreateReviewRequest request);

    /**
     * Xoá ðánh giá.
     * Ch? owner ho?c ADMIN m?i ðý?c xoá.
     *
     * @param reviewId   ID ðánh giá
     * @param userId     ID ngý?i dùng ðang th?c hi?n xoá
     * @param userRoles  Roles c?a ngý?i dùng (ð? ki?m tra ADMIN)
     */
    void deleteReview(Long reviewId, Long userId, String userRoles);

    /**
     * L?y toàn b? ðánh giá c?a s?n ph?m kèm th?ng kê (phân trang).
     *
     * @param productId  ID s?n ph?m
     * @param pageable   Thông tin phân trang
     * @return ReviewSummaryResponse (avg rating, total, danh sách)
     */
    ReviewSummaryResponse getReviewsByProduct(Long productId, Pageable pageable);
}
