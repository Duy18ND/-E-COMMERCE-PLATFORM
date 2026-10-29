package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.dto.response.ReviewSummaryResponse;
import org.springframework.data.domain.Pageable;

public interface ReviewService {

    /**
     * Tạo đánh giá mới cho sản phẩm.
     * Điều kiện: userId phải có đơn hàng DELIVERED chứa productId.
     * Mỗi user chỉ được đánh giá 1 lần cho mỗi sản phẩm.
     *
     * @param productId  ID sản phẩm cần đánh giá
     * @param userId     ID người dùng (lấy từ header X-User-Id)
     * @param request    Dữ liệu đánh giá (rating, comment, orderId)
     * @return ReviewResponse
     */
    ReviewResponse createReview(Long productId, Long userId, CreateReviewRequest request);

    /**
     * Cập nhật đánh giá hiện có.
     * Chỉ owner của đánh giá mới được phép cập nhật.
     *
     * @param reviewId   ID đánh giá
     * @param userId     ID người dùng đang thực hiện cập nhật
     * @param request    Dữ liệu cập nhật
     * @return ReviewResponse
     */
    ReviewResponse updateReview(Long reviewId, Long userId, CreateReviewRequest request);

    /**
     * Xoá đánh giá.
     * Chỉ owner hoặc ADMIN mới được xoá.
     *
     * @param reviewId   ID đánh giá
     * @param userId     ID người dùng đang thực hiện xoá
     * @param userRoles  Roles của người dùng (để kiểm tra ADMIN)
     */
    void deleteReview(Long reviewId, Long userId, String userRoles);

    /**
     * Lấy toàn bộ đánh giá của sản phẩm kèm thống kê (phân trang).
     *
     * @param productId  ID sản phẩm
     * @param pageable   Thông tin phân trang
     * @return ReviewSummaryResponse (avg rating, total, danh sách)
     */
    ReviewSummaryResponse getReviewsByProduct(Long productId, Pageable pageable);
}