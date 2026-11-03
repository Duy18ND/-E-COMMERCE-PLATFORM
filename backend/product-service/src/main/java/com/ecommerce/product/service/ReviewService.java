package com.ecommerce.product.service;

import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.request.ModerateReviewRequest;
import com.ecommerce.product.dto.request.UpdateReviewRequest;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.dto.response.ReviewSummaryResponse;
import com.ecommerce.product.enums.ReviewStatus;
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
     * Xác thực đánh giá phải thuộc đúng sản phẩm productId.
     *
     * @param productId  ID sản phẩm
     * @param reviewId   ID đánh giá
     * @param userId     ID người dùng đang thực hiện cập nhật
     * @param request    Dữ liệu cập nhật (rating, comment)
     * @return ReviewResponse
     */
    ReviewResponse updateReview(Long productId, Long reviewId, Long userId, UpdateReviewRequest request);

    /**
     * Xoá đánh giá.
     * Chỉ owner hoặc ADMIN mới được xoá.
     * Xác thực đánh giá phải thuộc đúng sản phẩm productId.
     *
     * @param productId  ID sản phẩm
     * @param reviewId   ID đánh giá
     * @param userId     ID người dùng đang thực hiện xoá
     * @param userRoles  Roles của người dùng (để kiểm tra ADMIN)
     */
    void deleteReview(Long productId, Long reviewId, Long userId, String userRoles);

    /**
     * Lấy toàn bộ đánh giá APPROVED của sản phẩm kèm thống kê (phân trang cho Public).
     *
     * @param productId  ID sản phẩm
     * @param pageable   Thông tin phân trang
     * @return ReviewSummaryResponse (avg rating, total, danh sách đánh giá đã duyệt)
     */
    ReviewSummaryResponse getReviewsByProduct(Long productId, Pageable pageable);

    /**
     * Lấy đánh giá của chính người dùng hiện tại đối với một sản phẩm (nếu có).
     *
     * @param productId  ID sản phẩm
     * @param userId     ID người dùng
     * @return ReviewResponse hoặc null nếu chưa đánh giá
     */
    ReviewResponse getMyReviewForProduct(Long productId, Long userId);

    /**
     * Admin kiểm duyệt: duyệt (APPROVED) hoặc ẩn (HIDDEN) đánh giá vi phạm quy chuẩn.
     *
     * @param reviewId  ID đánh giá cần kiểm duyệt
     * @param request   Trạng thái và lý do ẩn (nếu có)
     * @return ReviewResponse sau khi cập nhật
     */
    ReviewResponse moderateReview(Long reviewId, ModerateReviewRequest request);

    /**
     * Admin lấy danh sách toàn bộ đánh giá trong hệ thống để kiểm duyệt (phân trang và lọc theo trạng thái).
     *
     * @param status    Trạng thái kiểm duyệt cần lọc (tùy chọn)
     * @param pageable  Thông tin phân trang
     * @return PagedResponse chứa danh sách đánh giá
     */
    PagedResponse<ReviewResponse> getAllReviewsForAdmin(ReviewStatus status, Pageable pageable);
}
