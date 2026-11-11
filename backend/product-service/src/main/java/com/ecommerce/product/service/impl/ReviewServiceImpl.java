package com.ecommerce.product.service.impl;

import com.ecommerce.product.client.OrderClient;
import com.ecommerce.product.client.dto.OrderDetailResponse;
import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.request.ModerateReviewRequest;
import com.ecommerce.product.dto.request.UpdateReviewRequest;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.dto.response.ReviewSummaryResponse;
import com.ecommerce.product.entity.ProductReview;
import com.ecommerce.product.enums.ReviewStatus;
import com.ecommerce.product.exception.AccessDeniedException;
import com.ecommerce.product.exception.DuplicateResourceException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.repository.ProductReviewRepository;
import com.ecommerce.product.service.ReviewService;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Arrays;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * [Task ECOM-177] Triển khai nghiệp vụ đánh giá sản phẩm và kiểm duyệt:
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 * 1. Sản phẩm phải tồn tại.
 * 2. Đơn hàng phải ở trạng thái DELIVERED và thuộc về userId.
 * 3. Đơn hàng phải chứa productId.
 * 4. Mỗi user chỉ được đánh giá 1 lần cho 1 sản phẩm (unique constraint, chống review lặp).
 * 5. Xác thực tính toàn vẹn quan hệ cha-con (reviewId phải thuộc đúng productId).
 * 6. Lọc đánh giá công khai (chỉ hiển thị và tính rating cho trạng thái APPROVED).
 * 7. Hỗ trợ Admin duyệt/ẩn đánh giá vi phạm quy chuẩn.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ProductReviewRepository reviewRepository;
    private final ProductRepository productRepository;
    private final OrderClient orderClient;

    /**
     * [Task ECOM-181] Khóa đồng bộ theo cặp (productId, userId) và tập giao dịch đang xử lý (in-flight)
     * nhằm ngăn chặn TOCTOU race condition khi người dùng gửi nhiều request tạo đánh giá đồng thời.
     */
    private final ConcurrentHashMap<String, ReentrantLock> reviewLocks = new ConcurrentHashMap<>();
    private final Set<String> inFlightReviews = ConcurrentHashMap.newKeySet();

    @Override
    @Transactional
    public ReviewResponse createReview(Long productId, Long userId, CreateReviewRequest request) {
        log.info("Creating review for productId={}, userId={}, orderId={}", productId, userId, request.getOrderId());

        if (userId == null || userId <= 0) {
            throw new AccessDeniedException("Thông tin người dùng xác thực không hợp lệ");
        }

        // 1. Kiểm tra sản phẩm tồn tại
        if (productId == null || productId <= 0 || !productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + productId);
        }

        String lockKey = productId + "#" + userId;
        ReentrantLock lock = reviewLocks.computeIfAbsent(lockKey, k -> new ReentrantLock());
        lock.lock();
        boolean syncRegistered = false;
        try {
            // 2. Kiểm tra user chưa đánh giá sản phẩm này (trả về 409 Conflict)
            if (inFlightReviews.contains(lockKey) || reviewRepository.existsByProductIdAndUserId(productId, userId)) {
                throw new DuplicateResourceException("Bạn đã đánh giá sản phẩm này rồi. Vui lòng chỉnh sửa đánh giá hiện có.");
            }

            // 3. Xác minh đơn hàng và order item qua Feign Client
            OrderDetailResponse order = fetchAndValidateOrder(
                    request.getOrderId(), request.getOrderItemId(), userId, productId);

            if (TransactionSynchronizationManager.isSynchronizationActive()) {
                inFlightReviews.add(lockKey);
                TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                    @Override
                    public void afterCompletion(int status) {
                        try {
                            inFlightReviews.remove(lockKey);
                        } finally {
                            while (lock.isHeldByCurrentThread()) {
                                lock.unlock();
                            }
                        }
                    }
                });
                syncRegistered = true;
            }

            // 4. Tạo và lưu đánh giá (mặc định APPROVED)
            String sanitizedComment = request.getComment() != null ? request.getComment().trim() : null;
            ProductReview review = ProductReview.builder()
                    .productId(productId)
                    .userId(userId)
                    .orderId(order.getId())
                    .rating(request.getRating())
                    .comment(sanitizedComment)
                    .status(ReviewStatus.APPROVED)
                    .build();

            try {
                ProductReview saved = reviewRepository.save(review);
                log.info("Review created successfully with id={}", saved.getId());
                return mapToReviewResponse(saved);
            } catch (DataIntegrityViolationException ex) {
                log.warn("Duplicate review blocked by DB unique constraint for productId={}, userId={}", productId, userId);
                throw new DuplicateResourceException("Bạn đã đánh giá sản phẩm này rồi. Vui lòng chỉnh sửa đánh giá hiện có.");
            }
        } finally {
            if (!syncRegistered && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    @Override
    @Transactional
    public ReviewResponse updateReview(Long productId, Long reviewId, Long userId, UpdateReviewRequest request) {
        log.info("Updating review id={} on productId={} by userId={}", reviewId, productId, userId);

        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với ID: " + reviewId));

        // Kiểm tra tính toàn vẹn tài nguyên cha-con: review phải thuộc đúng productId
        if (!review.getProductId().equals(productId)) {
            throw new IllegalArgumentException("Đánh giá này không thuộc về sản phẩm có ID: " + productId);
        }

        // Chỉ owner mới được cập nhật
        if (!review.getUserId().equals(userId)) {
            throw new AccessDeniedException("Bạn không có quyền chỉnh sửa đánh giá này");
        }

        review.setRating(request.getRating());
        review.setComment(request.getComment() != null ? request.getComment().trim() : null);

        ProductReview updated = reviewRepository.save(review);
        log.info("Review id={} updated successfully", reviewId);

        return mapToReviewResponse(updated);
    }

    @Override
    @Transactional
    public void deleteReview(Long productId, Long reviewId, Long userId, String userRoles) {
        log.info("Deleting review id={} on productId={} by userId={}, roles={}", reviewId, productId, userId, userRoles);

        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với ID: " + reviewId));

        // Kiểm tra tính toàn vẹn tài nguyên cha-con: review phải thuộc đúng productId
        if (!review.getProductId().equals(productId)) {
            throw new IllegalArgumentException("Đánh giá này không thuộc về sản phẩm có ID: " + productId);
        }

        boolean isAdmin = userRoles != null && Arrays.stream(userRoles.split(","))
                .map(String::trim)
                .anyMatch("ROLE_ADMIN"::equals);
        boolean isOwner = userId != null && review.getUserId().equals(userId);

        if (!isAdmin && !isOwner) {
            throw new AccessDeniedException("Bạn không có quyền xoá đánh giá này");
        }

        reviewRepository.delete(review);
        log.info("Review id={} deleted successfully", reviewId);
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewSummaryResponse getReviewsByProduct(Long productId, Pageable pageable) {
        log.info("Fetching approved reviews for productId={}, page={}", productId, pageable.getPageNumber());

        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: " + productId);
        }

        // CHỈ LẤY CÁC ĐÁNH GIÁ APPROVED (hiển thị công khai)
        Page<ProductReview> reviewPage = reviewRepository.findByProductIdAndStatus(productId, ReviewStatus.APPROVED, pageable);
        Double avgRating = reviewRepository.calculateAverageRatingByProductId(productId);
        long totalReviews = reviewRepository.countByProductIdAndStatus(productId, ReviewStatus.APPROVED);
        double safeAverageRating = avgRating != null ? Math.round(avgRating * 10.0) / 10.0 : 0.0;

        Page<ReviewResponse> responsePage = reviewPage.map(this::mapToReviewResponse);
        PagedResponse<ReviewResponse> pagedResponse = PagedResponse.fromPage(responsePage);

        return ReviewSummaryResponse.builder()
                .productId(productId)
                .averageRating(safeAverageRating)
                .totalReviews(totalReviews)
                .reviews(pagedResponse)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ReviewResponse getMyReviewForProduct(Long productId, Long userId) {
        log.info("Fetching my review for productId={}, userId={}", productId, userId);

        return reviewRepository.findByProductIdAndUserId(productId, userId)
                .map(this::mapToReviewResponse)
                .orElse(null);
    }

    @Override
    @Transactional
    public ReviewResponse moderateReview(Long reviewId, ModerateReviewRequest request) {
        log.info("Admin moderating review id={} to status={}, reason={}", reviewId, request.getStatus(), request.getReason());

        if (reviewId == null || reviewId <= 0) {
            throw new ResourceNotFoundException("Không tìm thấy đánh giá với ID: " + reviewId);
        }

        ProductReview review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đánh giá với ID: " + reviewId));

        review.setStatus(request.getStatus());
        if (request.getStatus() == ReviewStatus.HIDDEN) {
            String sanitizedReason = request.getReason() != null ? request.getReason().trim() : null;
            review.setHiddenReason(sanitizedReason);
        } else {
            review.setHiddenReason(null);
        }

        ProductReview updated = reviewRepository.save(review);
        log.info("Review id={} moderated successfully: status={}", reviewId, updated.getStatus());

        return mapToReviewResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<ReviewResponse> getAllReviewsForAdmin(ReviewStatus status, Pageable pageable) {
        log.info("Admin fetching all reviews: status={}, page={}", status, pageable.getPageNumber());

        Page<ProductReview> reviewPage = (status != null)
                ? reviewRepository.findByStatus(status, pageable)
                : reviewRepository.findAll(pageable);

        Page<ReviewResponse> responsePage = reviewPage.map(this::mapToReviewResponse);
        return PagedResponse.fromPage(responsePage);
    }

    // --- Private Helpers -----------------------------------------------------

    /**
     * Gọi Feign sang Order Service để lấy đơn hàng và xác minh:
     * 1. Đơn hàng tồn tại.
     * 2. Đơn hàng thuộc về userId.
     * 3. Đơn hàng có trạng thái DELIVERED.
     * 4. Đơn hàng chứa productId (và khớp orderItemId nếu client gửi kèm).
     */
    private OrderDetailResponse fetchAndValidateOrder(Long orderId, Long orderItemId, Long userId, Long productId) {
        if (orderId == null || orderId <= 0) {
            throw new ResourceNotFoundException("Không tìm thấy đơn hàng với ID: " + orderId);
        }

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

        // Kiểm tra orderItemId nếu được truyền lên trong request
        if (orderItemId != null) {
            if (orderItemId <= 0 || order.getItems() == null) {
                throw new ResourceNotFoundException("Không tìm thấy order item với ID: " + orderItemId);
            }
            OrderDetailResponse.OrderItemDetail matchedItem = order.getItems().stream()
                    .filter(item -> item != null && orderItemId.equals(item.getId()))
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Không tìm thấy order item với ID: " + orderItemId + " trong đơn hàng " + orderId));

            if (!productId.equals(matchedItem.getProductId())) {
                throw new IllegalStateException(
                        "Order item " + orderItemId + " trong đơn hàng " + orderId + " không thuộc sản phẩm " + productId);
            }
        }

        // Kiểm tra đơn hàng chứa sản phẩm
        boolean containsProduct = order.getItems() != null &&
                order.getItems().stream()
                        .anyMatch(item -> item != null && productId.equals(item.getProductId()));

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
                .status(review.getStatus())
                .hiddenReason(review.getHiddenReason())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }
}
