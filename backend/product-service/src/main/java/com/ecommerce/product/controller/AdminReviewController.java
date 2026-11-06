package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.ModerateReviewRequest;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.enums.ReviewStatus;
import com.ecommerce.product.exception.AccessDeniedException;
import com.ecommerce.product.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

/**
 * Controller dành riêng cho Quản trị viên (Admin) kiểm duyệt đánh giá:
 * - Tra cứu toàn bộ đánh giá hệ thống (lọc theo APPROVED/HIDDEN).
 * - Duyệt hoặc ẩn đánh giá vi phạm quy chuẩn cộng đồng/spam.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/reviews")
@RequiredArgsConstructor
@Tag(name = "Admin Review Controller", description = "Quản lý kiểm duyệt, duyệt và ẩn đánh giá vi phạm cho Admin")
public class AdminReviewController {

    private final ReviewService reviewService;

    /**
     * GET /api/v1/admin/reviews
     * Lấy danh sách toàn bộ đánh giá hệ thống (phân trang và lọc theo trạng thái).
     */
    @GetMapping
    @Operation(summary = "Lấy danh sách đánh giá toàn hệ thống để kiểm duyệt [ADMIN]")
    public ResponseEntity<ApiResponse<PagedResponse<ReviewResponse>>> getAllReviews(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestParam(required = false) ReviewStatus status,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        requireAdminRole(roles);
        PagedResponse<ReviewResponse> response = reviewService.getAllReviewsForAdmin(status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách đánh giá thành công", response));
    }

    /**
     * PATCH /api/v1/admin/reviews/{reviewId}/moderate
     * Duyệt hoặc ẩn đánh giá vi phạm quy chuẩn. Hỗ trợ thêm alias PUT /{reviewId}/status.
     */
    @PatchMapping("/{reviewId}/moderate")
    @Operation(summary = "Duyệt hoặc ẩn đánh giá vi phạm [ADMIN]")
    public ResponseEntity<ApiResponse<ReviewResponse>> moderateReview(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long reviewId,
            @Valid @RequestBody ModerateReviewRequest request) {

        requireAdminRole(roles);
        ReviewResponse response = reviewService.moderateReview(reviewId, request);
        return ResponseEntity.ok(ApiResponse.success("Kiểm duyệt đánh giá thành công", response));
    }

    @PutMapping("/{reviewId}/status")
    @Operation(summary = "Cập nhật trạng thái đánh giá vi phạm [ADMIN] (Alias)")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReviewStatus(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long reviewId,
            @Valid @RequestBody ModerateReviewRequest request) {

        return moderateReview(roles, reviewId, request);
    }

    private void requireAdminRole(String roles) {
        boolean isAdmin = roles != null && Arrays.stream(roles.split(","))
                .map(String::trim)
                .anyMatch("ROLE_ADMIN"::equals);
        if (!isAdmin) {
            throw new AccessDeniedException("Chỉ tài khoản ADMIN mới có quyền kiểm duyệt đánh giá");
        }
    }
}

