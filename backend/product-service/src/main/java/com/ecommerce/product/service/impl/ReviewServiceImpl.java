package com.ecommerce.product.service.impl;

import com.ecommerce.product.client.OrderClient;
import com.ecommerce.product.client.dto.OrderDetailResponse;
import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.dto.response.ReviewSummaryResponse;
import com.ecommerce.product.entity.ProductReview;
import com.ecommerce.product.exception.AccessDeniedException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.repository.ProductReviewRepository;
import com.ecommerce.product.service.ReviewService;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Triển khai nghiệp vụ đánh giá sản phẩm với 3 lớp bảo vệ:
 * 1. Sản phẩm phải tồn tại.
 * 2. Đơn hàng phải ở trạng thái DELIVERED và thuộc về userId.
 * 3. Đơn hàng phải chứa productId.
 * 4. Mỗi user chỉ được đánh giá 1 lần cho 1 sản phẩm (unique constraint).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ProductReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final OrderClient orderClient;

    @Override
    @Transactional
    public ReviewResponse createReview(Long productId, Long userId, CreateReviewRequest request) {
        log.info("Creating review for productId={}, userId={}, orderId={}", productId, userId, request.getOrderId());

        // 1. Kiểm tra sản phẩm tồn tại
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + productId);
        }

        // 2. Kiểm tra user chưa đánh giá sản phẩm này
        if (reviewRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new IllegalStateException("Bạn đã đánh giá sản phẩm này rồi. Vui lòng chỉnh sửa đánh giá hiện có.");
        }

        // 3. Xác minh đơn hàng qua Feign Client
        OrderDetailResponse order = fetchAndValidateOrder(request.getOrderId(), userId, productId);

        // 4. Tạo và lưu đánh giá
        ProductReview review = ProductReview.builder()
                .productId(productId)
                .userId(userId)
                .orderId(order.getId())
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        ProductReview saved = reviewRepository.save(review);
        log.info("Review created successfully with id={}", saved.getId());

        return mapToReviewResponse(saved);
    }

    @Override
    @Transactional
    public ReviewResponse updateReview(Long reviewId, Long userId, CreateReviewRequest request) {
        log.info("Updating review id={} by userId={}", reviewId, userId);

        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với ID: " + reviewId));

        // Chỉ owner mới được cập nhật
        if (!review.getUserId().equals(userId)) {
            throw new AccessDeniedException("Bạn không có quyền chỉnh sửa đánh giá này");
        }

        review.setRating(request.getRating());
        review.setComment(request.getComment());

        ProductReview updated = reviewRepository.save(review);
        log.info("Review id={} updated successfully", reviewId);

        return mapToReviewResponse(updated);
    }

    @Override
    @Transactional
    public void deleteReview(Long reviewId, Long userId, String userRoles) {
        log.info("Deleting review id={} by userId={}, roles={}", reviewId, userId, userRoles);

        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với ID: " + reviewId));

        boolean isAdmin = userRoles != null && userRoles.contains("ROLE_ADMIN");
        boolean isOwner = review.getUserId().equals(userId);

        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("Bạn không có quyền xoá đánh giá này");
        }

        reviewRepository.delete(review);
        log.info("Review id={} deleted successfully", reviewId);
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewSummaryResponse getReviewsByProduct(Long productId, Pageable pageable) {
        log.info("Fetching reviews for productId={}, page={}", productId, pageable.getPageNumber());

        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + productId);
        }

        Page<ProductReview> reviewPage = reviewRepository.findByProductId(productId, pageable);
        Double avgRating = reviewRepository.calculateAverageRatingByProductId(productId);
        long totalReviews = reviewRepository.countByProductId(productId);

        Page<ReviewResponse> responsePage = reviewPage.map(this::mapToReviewResponse);
        PagedResponse<ReviewResponse> pagedResponse = PagedResponse.fromPage(responsePage);

        return ReviewSummaryResponse.builder()
                .productId(productId)
                .averageRating(Math.round(avgRating * 10.0) / 10.0)
                .totalReviews(totalReviews)
                .reviews(pagedResponse)
                .build();
    }

    // --- Private Helpers -----------------------------------------------------

    /**
     * Gọi Feign sang Order Service để lấy đơn hàng và xác minh:
     * 1. Đơn hàng tồn tại.
     * 2. Đơn hàng thuộc về userId.
     * 3. Đơn hàng có trạng thái DELIVERED.
     * 4. Đơn hàng chứa productId.
     */
    private OrderDetailResponse fetchAndValidateOrder(Long orderId, Long userId, Long productId) {
        ApiResponse<OrderDetailResponse> orderApiResponse;
        try {
            orderApiResponse = orderClient.getOrderById(orderId, userId);
        } catch (FeignException.Forbidden e) {
            log.warn("Order-service denied access to order {} for userId {}", orderId, userId);
            throw new AccessDeniedException("Đơn hàng không thuộc về tài khoản của bạn");
        } catch (FeignException.NotFound e) {
            throw new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId);
        } catch (Exception e) {
            log.error("Failed to fetch order {} from order-service: {}", orderId, e.getMessage());
            throw new IllegalStateException("Không thể xác minh đơn hàng. Vui lòng thử lại sau.");
        }

        if (orderApiResponse == null || orderApiResponse.getData() == null) {
            throw new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId);
        }

        OrderDetailResponse order = orderApiResponse.getData();

        // Kiểm tra quyền sở hữu
        if (!userId.equals(order.getUserId())) {
            throw new AccessDeniedException("Đơn hàng không thuộc về tài khoản của bạn");
        }

        // Kiểm tra trạng thái DELIVERED
        if (!"DELIVERED".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalStateException(
                "Chỉ có thể đánh giá sản phẩm từ đơn hàng đã giao thành công (DELIVERED). " +
                "Trạng thái đơn hàng hiện tại: " + order.getStatus()
            );
        }

        // Kiểm tra đơn hàng chứa sản phẩm
        boolean containsProduct = order.getItems() != null &&
                order.getItems().stream()
                        .anyMatch(item -> productId.equals(item.getProductId()));

        if (!containsProduct) {
            throw new IllegalStateException("Đơn hàng " + orderId + " không chứa sản phẩm " + productId);
        }

        return order;
    }

    private ReviewResponse mapToReviewResponse(ProductReview review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .productId(review.getProductId())
                .userId(review.getUserId())
                .orderId(review.getOrderId())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}