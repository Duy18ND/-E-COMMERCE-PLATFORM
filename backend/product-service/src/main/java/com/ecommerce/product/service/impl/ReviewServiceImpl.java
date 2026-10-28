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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tri?n khai nghi?p v? ðánh giá s?n ph?m v?i 3 l?p b?o v?:
 * 1. S?n ph?m ph?i t?n t?i.
 * 2. Ðõn hàng ph?i ? tr?ng thái DELIVERED và thu?c v? userId.
 * 3. Ðõn hàng ph?i ch?a productId.
 * 4. M?i user ch? ðý?c ðánh giá 1 l?n cho 1 s?n ph?m (unique constraint).
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

        // 1. Ki?m tra s?n ph?m t?n t?i
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Không t?m th?y s?n ph?m v?i ID: " + productId);
        }

        // 2. Ki?m tra user chýa ðánh giá s?n ph?m này
        if (reviewRepository.existsByProductIdAndUserId(productId, userId)) {
            throw new IllegalStateException("B?n ð? ðánh giá s?n ph?m này r?i. Vui l?ng ch?nh s?a ðánh giá hi?n có.");
        }

        // 3. Xác minh ðõn hàng qua Feign Client
        OrderDetailResponse order = fetchAndValidateOrder(request.getOrderId(), userId, productId);

        // 4. T?o và lýu ðánh giá
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
                .orElseThrow(() -> new ResourceNotFoundException("Không t?m th?y ðánh giá v?i ID: " + reviewId));

        // Ch? owner m?i ðý?c c?p nh?t
        if (!review.getUserId().equals(userId)) {
            throw new AccessDeniedException("B?n không có quy?n ch?nh s?a ðánh giá này");
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
                .orElseThrow(() -> new ResourceNotFoundException("Không t?m th?y ðánh giá v?i ID: " + reviewId));

        boolean isAdmin = userRoles != null && userRoles.contains("ROLE_ADMIN");
        boolean isOwner = review.getUserId().equals(userId);

        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("B?n không có quy?n xoá ðánh giá này");
        }

        reviewRepository.delete(review);
        log.info("Review id={} deleted successfully", reviewId);
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewSummaryResponse getReviewsByProduct(Long productId, Pageable pageable) {
        log.info("Fetching reviews for productId={}, page={}", productId, pageable.getPageNumber());

        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Không t?m th?y s?n ph?m v?i ID: " + productId);
        }

        Page<ProductReview> reviewPage = reviewRepository.findByProductId(productId, pageable);
        Double avgRating = reviewRepository.calculateAverageRatingByProductId(productId);
        long totalReviews = reviewRepository.countByProductId(productId);

        Page<ReviewResponse> responsePage = reviewPage.map(this::mapToReviewResponse);
        PagedResponse<ReviewResponse> pagedResponse = PagedResponse.fromPage(responsePage);

        return ReviewSummaryResponse.builder()
                .productId(productId)
                .averageRating(Math.round(avgRating * 10.0) / 10.0)   // làm tr?n 1 ch? s? th?p phân
                .totalReviews(totalReviews)
                .reviews(pagedResponse)
                .build();
    }

    // ??? Private Helpers ??????????????????????????????????????????????????????

    /**
     * G?i Feign sang Order Service ð? l?y ðõn hàng và xác minh:
     * 1. Ðõn hàng t?n t?i.
     * 2. Ðõn hàng thu?c v? userId.
     * 3. Ðõn hàng có tr?ng thái DELIVERED.
     * 4. Ðõn hàng ch?a productId.
     */
    private OrderDetailResponse fetchAndValidateOrder(Long orderId, Long userId, Long productId) {
        ApiResponse<OrderDetailResponse> orderApiResponse;
        try {
            orderApiResponse = orderClient.getOrderById(orderId);
        } catch (Exception e) {
            log.error("Failed to fetch order {} from order-service: {}", orderId, e.getMessage());
            throw new IllegalStateException("Không th? xác minh ðõn hàng. Vui l?ng th? l?i sau.");
        }

        if (orderApiResponse == null || orderApiResponse.getData() == null) {
            throw new ResourceNotFoundException("Không t?m th?y ðõn hàng v?i ID: " + orderId);
        }

        OrderDetailResponse order = orderApiResponse.getData();

        // Ki?m tra quy?n s? h?u
        if (!userId.equals(order.getUserId())) {
            throw new AccessDeniedException("Ðõn hàng không thu?c v? tài kho?n c?a b?n");
        }

        // Ki?m tra tr?ng thái DELIVERED
        if (!"DELIVERED".equalsIgnoreCase(order.getStatus())) {
            throw new IllegalStateException(
                "Ch? có th? ðánh giá s?n ph?m t? ðõn hàng ð? giao thành công (DELIVERED). " +
                "Tr?ng thái ðõn hàng hi?n t?i: " + order.getStatus()
            );
        }

        // Ki?m tra ðõn hàng ch?a s?n ph?m
        boolean containsProduct = order.getItems() != null &&
                order.getItems().stream()
                        .anyMatch(item -> productId.equals(item.getProductId()));

        if (!containsProduct) {
            throw new IllegalStateException("Ðõn hàng " + orderId + " không ch?a s?n ph?m " + productId);
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
