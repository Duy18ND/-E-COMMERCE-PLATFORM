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
 * Controller qu?n l? ðánh giá s?n ph?m.
 * T?t c? API yêu c?u user ð? xác th?c (X-User-Id t? API Gateway).
 * API xem ðánh giá là public, API t?o/s?a/xoá yêu c?u userId.
 */
@RestController
@RequestMapping("/api/v1/products/{productId}/reviews")
@RequiredArgsConstructor
@Tag(name = "Review Controller", description = "Qu?n l? ðánh giá và x?p h?ng s?n ph?m")
public class ReviewController {

    private final ReviewService reviewService;

    /**
     * GET /api/v1/products/{productId}/reviews
     * Xem t?t c? ðánh giá c?a s?n ph?m (public, không c?n ðãng nh?p).
     */
    @GetMapping
    @Operation(
        summary = "Xem ðánh giá s?n ph?m",
        description = "L?y danh sách ðánh giá c?a s?n ph?m kèm ði?m trung b?nh và t?ng s? ðánh giá (phân trang). Endpoint public."
    )
    public ResponseEntity<ApiResponse<ReviewSummaryResponse>> getReviews(
            @PathVariable Long productId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        ReviewSummaryResponse response = reviewService.getReviewsByProduct(productId, pageable);
        return ResponseEntity.ok(ApiResponse.success("L?y danh sách ðánh giá thành công", response));
    }

    /**
     * POST /api/v1/products/{productId}/reviews
     * T?o ðánh giá m?i — user ph?i có ðõn hàng DELIVERED ch?a s?n ph?m.
     */
    @PostMapping
    @Operation(
        summary = "T?o ðánh giá s?n ph?m [USER]",
        description = "T?o ðánh giá m?i. Yêu c?u: có ðõn hàng DELIVERED ch?a s?n ph?m. M?i user ch? ðý?c ðánh giá 1 l?n."
    )
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @PathVariable Long productId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @Valid @RequestBody CreateReviewRequest request) {

        requireAuthenticated(userId);
        ReviewResponse response = reviewService.createReview(productId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Ðánh giá s?n ph?m thành công", response));
    }

    /**
     * PUT /api/v1/products/{productId}/reviews/{reviewId}
     * C?p nh?t ðánh giá — ch? owner m?i ðý?c s?a.
     */
    @PutMapping("/{reviewId}")
    @Operation(
        summary = "C?p nh?t ðánh giá [OWNER]",
        description = "Ch?nh s?a rating và comment c?a ðánh giá. Ch? ngý?i vi?t ðánh giá m?i ðý?c s?a."
    )
    public ResponseEntity<ApiResponse<ReviewResponse>> updateReview(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @Valid @RequestBody CreateReviewRequest request) {

        requireAuthenticated(userId);
        ReviewResponse response = reviewService.updateReview(reviewId, userId, request);
        return ResponseEntity.ok(ApiResponse.success("C?p nh?t ðánh giá thành công", response));
    }

    /**
     * DELETE /api/v1/products/{productId}/reviews/{reviewId}
     * Xoá ðánh giá — owner ho?c ADMIN.
     */
    @DeleteMapping("/{reviewId}")
    @Operation(
        summary = "Xoá ðánh giá [OWNER / ADMIN]",
        description = "Xoá ðánh giá s?n ph?m. Ngý?i vi?t ho?c Admin m?i có quy?n xoá."
    )
    public ResponseEntity<ApiResponse<Void>> deleteReview(
            @PathVariable Long productId,
            @PathVariable Long reviewId,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestHeader(value = "X-User-Roles", required = false) String userRoles) {

        requireAuthenticated(userId);
        reviewService.deleteReview(reviewId, userId, userRoles);
        return ResponseEntity.ok(ApiResponse.success("Xoá ðánh giá thành công", null));
    }

    // ??? Helper ??????????????????????????????????????????????????????????????

    private void requireAuthenticated(Long userId) {
        if (userId == null) {
            throw new AccessDeniedException("B?n c?n ðãng nh?p ð? th?c hi?n thao tác này (thi?u X-User-Id)");
        }
    }
}
