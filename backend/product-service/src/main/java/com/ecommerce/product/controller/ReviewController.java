package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.dto.response.ReviewSummaryResponse;
import com.ecommerce.product.exception.AccessDeniedException;
import com.ecommerce.product.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller quản lý đánh giá sản phẩm.
 * Tất cả API yêu cầu user đã xác thực (X-User-Id từ API Gateway).
 * API xem đánh giá là public, API tạo/sửa/xoá yêu cầu userId.
 */
@RestController
@RequestMapping("/api/v1/products/{productId}/reviews")
@RequiredArgsConstructor
@Tag(name = "Review Controller", description = "Quản lý đánh giá và xếp hạng sản phẩm")
public class ReviewController {

    private final ReviewService reviewService;

    /**
     * GET /api/v1/products/{productId}/reviews
     * Xem tất cả đánh giá của sản phẩm (public, không cần đăng nhập).
     */
    @GetMapping
    @Operation(
        summary = "Xem đánh giá sản phẩm",
        description = "Lấy danh sách đánh giá của sản phẩm kèm điểm trung bình và tổng số đánh giá (phân trang). Endpoint public."
    )
    public ResponseEntity<ApiResponse<ReviewSummaryResponse>> getReviews(
            @PathVariable Long productId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        ReviewSummaryResponse response = reviewService.getReviewsByProduct(productId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá thành công", response));
    }

    /**
     * POST /api/v1/products/{productId}/reviews
     * Tạo đánh giá mới - user phải có đơn hàng DELIVERED chứa sản phẩm.
     */
    @PostMapping
    @Operation(
        summary = "Tạo đánh giá sản phẩm [USER]",
        description = "Tạo đánh giá mới. Yêu cầu: có đơn hàng DELIVERED chứa sản phẩm. Mỗi user chỉ được đánh giá 1 lần."
    )
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable Long productId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @Valid @RequestBody CreateReviewRequest request) {

        requireAuthenticated(userId);
        ReviewResponse response = reviewService.createReview(productId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đánh giá sản phẩm thành công", response));
    }

    /**
     * PUT /api/v1/products/{productId}/reviews/{reviewId}
     * Cập nhật đánh giá - chỉ owner mới được sửa.
     */
    @PutMapping("/{reviewId}")
    @Operation(
        summary = "Cập nhật đánh giá [OWNER]",
        description = "Chỉnh sửa rating và comment của đánh giá. Chỉ người viết đánh giá mới được sửa."
    )
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @Valid @RequestBody CreateReviewRequest request) {

        requireAuthenticated(userId);
        ReviewResponse response = reviewService.updateReview(reviewId, userId, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật đánh giá thành công", response));
    }

    /**
     * DELETE /api/v1/products/{productId}/reviews/{reviewId}
     * Xoá đánh giá - owner hoặc ADMIN.
     */
    @DeleteMapping("/{reviewId}")
    @Operation(
        summary = "Xoá đánh giá [OWNER / ADMIN]",
        description = "Xoá đánh giá sản phẩm. Người viết hoặc Admin mới có quyền xoá."
    )
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles) {

        requireAuthenticated(userId);
        reviewService.deleteReview(reviewId, userId, userRoles);
        return ResponseEntity.ok(ApiResponse.success("Xoá đánh giá thành công", null));
    }

    // --- Helper -------------------------------------------------------------

    private void requireAuthenticated(Long userId) {
        if (userId == null) {
            throw new AccessDeniedException("Bạn cần đăng nhập để thực hiện thao tác này (thiếu X-User-Id)");
        }
    }
}