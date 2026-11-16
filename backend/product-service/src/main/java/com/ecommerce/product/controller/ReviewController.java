package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.request.UpdateReviewRequest;
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

import java.util.Arrays;

/**
 * [Task ECOM-177] Controller API tạo, sửa đánh giá, lấy danh sách đánh giá sản phẩm.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 * - API xem danh sách đánh giá là public.
 * - API xem đánh giá cá nhân (/me), tạo, sửa, xoá yêu cầu user đã xác thực (X-User-Id từ API Gateway).
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
     * GET /api/v1/products/{productId}/reviews/me
     * Lấy đánh giá của chính người dùng hiện tại (nếu có). Yêu cầu đăng nhập.
     */
    @GetMapping("/me")
    @Operation(
        summary = "Lấy đánh giá của tôi [USER]",
        description = "Trả về bài đánh giá của user hiện tại cho sản phẩm này (null nếu chưa đánh giá)."
    )
    public ResponseEntity<ApiResponse<ReviewResponse>> getMyReview(
            @PathVariable Long productId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {

        requireAuthenticated(userId);
        ReviewResponse response = reviewService.getMyReviewForProduct(productId, userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin đánh giá thành công", response));
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
            @Valid @RequestBody UpdateReviewRequest request) {

        requireAuthenticated(userId);
        ReviewResponse response = reviewService.updateReview(productId, reviewId, userId, request);
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

        if (!hasAdminRole(userRoles)) {
            requireAuthenticated(userId);
        }
        reviewService.deleteReview(productId, reviewId, userId, userRoles);
        return ResponseEntity.ok(ApiResponse.success("Xoá đánh giá thành công", null));
    }

    // --- Helper -------------------------------------------------------------

    private void requireAuthenticated(Long userId) {
        if (userId == null) {
            throw new AccessDeniedException("Bạn cần đăng nhập để thực hiện thao tác này (thiếu X-User-Id)");
        }
        if (userId <= 0) {
            throw new AccessDeniedException("Thông tin người dùng xác thực (X-User-Id) không hợp lệ");
        }
    }

    private boolean hasAdminRole(String roles) {
        return roles != null && Arrays.stream(roles.split(","))
                .map(String::trim)
                .anyMatch("ROLE_ADMIN"::equals);
    }
}
