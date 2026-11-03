package com.ecommerce.product.service;

import com.ecommerce.product.client.OrderClient;
import com.ecommerce.product.client.dto.OrderDetailResponse;
import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.request.UpdateReviewRequest;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.dto.response.ReviewSummaryResponse;
import com.ecommerce.product.entity.ProductReview;
import com.ecommerce.product.exception.AccessDeniedException;
import com.ecommerce.product.exception.DuplicateResourceException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.repository.ProductReviewRepository;
import com.ecommerce.product.service.impl.ReviewServiceImpl;
import feign.FeignException;
import feign.Request;
import feign.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewServiceTest {

    @Mock
    private ProductReviewRepository reviewRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private OrderClient orderClient;

    @InjectMocks
    private ReviewServiceImpl reviewService;

    private CreateReviewRequest request;
    private UpdateReviewRequest updateRequest;
    private ProductReview sampleReview;

    @BeforeEach
    void setUp() {
        request = new CreateReviewRequest();
        request.setOrderId(500L);
        request.setRating(5);
        request.setComment("Sản phẩm rất tốt");

        updateRequest = UpdateReviewRequest.builder()
                .rating(4)
                .comment("Đã dùng 1 tuần, tạm ổn")
                .build();

        sampleReview = ProductReview.builder()
                .id(99L)
                .productId(1L)
                .userId(10L)
                .orderId(500L)
                .rating(5)
                .comment("Sản phẩm rất tốt")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private OrderDetailResponse deliveredOrder(Long ownerId, Long productId) {
        OrderDetailResponse.OrderItemDetail item = new OrderDetailResponse.OrderItemDetail();
        item.setProductId(productId);
        item.setQuantity(1);

        OrderDetailResponse order = new OrderDetailResponse();
        order.setId(500L);
        order.setUserId(ownerId);
        order.setStatus("DELIVERED");
        order.setItems(List.of(item));
        return order;
    }

    private FeignException feignError(int status) {
        Request req = Request.create(Request.HttpMethod.GET, "/api/v1/orders/500",
                Map.of(), null, StandardCharsets.UTF_8, null);
        Response response = Response.builder()
                .status(status)
                .reason("error")
                .request(req)
                .headers(Map.of())
                .build();
        return FeignException.errorStatus("OrderClient#getOrderById", response);
    }

    // =========================================================================
    // Create Review Tests
    // =========================================================================

    @Test
    @DisplayName("createReview: propagate userId sang OrderClient và tạo review thành công")
    void createReview_ShouldPropagateUserIdToOrderClient() {
        when(productRepository.existsById(1L)).thenReturn(true);
        when(reviewRepository.existsByProductIdAndUserId(1L, 10L)).thenReturn(false);
        when(orderClient.getOrderById(500L, 10L)).thenReturn(ApiResponse.success("ok", deliveredOrder(10L, 1L)));
        when(reviewRepository.save(any(ProductReview.class))).thenAnswer(inv -> {
            ProductReview r = inv.getArgument(0);
            r.setId(99L);
            return r;
        });

        ReviewResponse response = reviewService.createReview(1L, 10L, request);

        assertThat(response.getId()).isEqualTo(99L);
        assertThat(response.getUserId()).isEqualTo(10L);
        verify(orderClient, times(1)).getOrderById(500L, 10L);
    }

    @Test
    @DisplayName("createReview: user đã đánh giá sản phẩm trước đó -> Ném DuplicateResourceException (409)")
    void createReview_WhenAlreadyReviewed_ShouldThrowDuplicateResourceException() {
        when(productRepository.existsById(1L)).thenReturn(true);
        when(reviewRepository.existsByProductIdAndUserId(1L, 10L)).thenReturn(true);

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class,
                () -> reviewService.createReview(1L, 10L, request));

        assertThat(ex.getMessage()).contains("Bạn đã đánh giá sản phẩm này rồi");
        verify(reviewRepository, never()).save(any());
        verifyNoInteractions(orderClient);
    }

    @Test
    @DisplayName("createReview: order-service trả 403 (đơn không thuộc user) -> AccessDeniedException")
    void createReview_WhenOrderServiceReturns403_ShouldThrowAccessDenied() {
        when(productRepository.existsById(1L)).thenReturn(true);
        when(reviewRepository.existsByProductIdAndUserId(1L, 10L)).thenReturn(false);
        when(orderClient.getOrderById(500L, 10L)).thenThrow(feignError(403));

        assertThrows(AccessDeniedException.class, () -> reviewService.createReview(1L, 10L, request));
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("createReview: order-service trả 404 -> ResourceNotFoundException")
    void createReview_WhenOrderServiceReturns404_ShouldThrowNotFound() {
        when(productRepository.existsById(1L)).thenReturn(true);
        when(reviewRepository.existsByProductIdAndUserId(1L, 10L)).thenReturn(false);
        when(orderClient.getOrderById(500L, 10L)).thenThrow(feignError(404));

        assertThrows(ResourceNotFoundException.class, () -> reviewService.createReview(1L, 10L, request));
        verify(reviewRepository, never()).save(any());
    }

    // =========================================================================
    // Update Review Tests & Cross-Resource Protection
    // =========================================================================

    @Test
    @DisplayName("updateReview: productId trên URL không khớp với review -> Ném IllegalArgumentException")
    void updateReview_WhenProductIdMismatch_ShouldThrowIllegalArgumentException() {
        when(reviewRepository.findById(99L)).thenReturn(Optional.of(sampleReview)); // sampleReview has productId=1L

        // Client gọi với productId=2L
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> reviewService.updateReview(2L, 99L, 10L, updateRequest));

        assertThat(ex.getMessage()).contains("Đánh giá này không thuộc về sản phẩm có ID: 2");
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateReview: người dùng không phải owner -> Ném AccessDeniedException")
    void updateReview_WhenNotOwner_ShouldThrowAccessDeniedException() {
        when(reviewRepository.findById(99L)).thenReturn(Optional.of(sampleReview)); // owner userId=10L

        assertThrows(AccessDeniedException.class,
                () -> reviewService.updateReview(1L, 99L, 999L, updateRequest));
        verify(reviewRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateReview: hợp lệ -> Cập nhật rating, comment thành công")
    void updateReview_Success() {
        when(reviewRepository.findById(99L)).thenReturn(Optional.of(sampleReview));
        when(reviewRepository.save(any(ProductReview.class))).thenAnswer(inv -> inv.getArgument(0));

        ReviewResponse response = reviewService.updateReview(1L, 99L, 10L, updateRequest);

        assertThat(response).isNotNull();
        assertThat(response.getRating()).isEqualTo(4);
        assertThat(response.getComment()).isEqualTo("Đã dùng 1 tuần, tạm ổn");
        verify(reviewRepository, times(1)).save(sampleReview);
    }

    // =========================================================================
    // Delete Review Tests & Cross-Resource Protection
    // =========================================================================

    @Test
    @DisplayName("deleteReview: productId trên URL không khớp với review -> Ném IllegalArgumentException")
    void deleteReview_WhenProductIdMismatch_ShouldThrowIllegalArgumentException() {
        when(reviewRepository.findById(99L)).thenReturn(Optional.of(sampleReview));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> reviewService.deleteReview(999L, 99L, 10L, "ROLE_CUSTOMER"));

        assertThat(ex.getMessage()).contains("Đánh giá này không thuộc về sản phẩm có ID: 999");
        verify(reviewRepository, never()).delete(any());
    }

    @Test
    @DisplayName("deleteReview: Admin có quyền xoá review của người khác")
    void deleteReview_WhenAdmin_Success() {
        when(reviewRepository.findById(99L)).thenReturn(Optional.of(sampleReview));

        reviewService.deleteReview(1L, 99L, 999L, "ROLE_USER, ROLE_ADMIN");

        verify(reviewRepository, times(1)).delete(sampleReview);
    }

    @Test
    @DisplayName("deleteReview: Người dùng không phải owner và không phải admin -> Ném AccessDeniedException")
    void deleteReview_WhenNotOwnerAndNotAdmin_ShouldThrowAccessDenied() {
        when(reviewRepository.findById(99L)).thenReturn(Optional.of(sampleReview));

        assertThrows(AccessDeniedException.class,
                () -> reviewService.deleteReview(1L, 99L, 999L, "ROLE_CUSTOMER"));
        verify(reviewRepository, never()).delete(any());
    }

    // =========================================================================
    // Get My Review & Summary Tests
    // =========================================================================

    @Test
    @DisplayName("getMyReviewForProduct: Trả về review của chính user")
    void getMyReviewForProduct_ShouldReturnReview() {
        when(reviewRepository.findByProductIdAndUserId(1L, 10L)).thenReturn(Optional.of(sampleReview));

        ReviewResponse response = reviewService.getMyReviewForProduct(1L, 10L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(99L);
        assertThat(response.getProductId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getMyReviewForProduct: User chưa review -> Trả về null")
    void getMyReviewForProduct_WhenNotReviewed_ShouldReturnNull() {
        when(reviewRepository.findByProductIdAndUserId(1L, 10L)).thenReturn(Optional.empty());

        ReviewResponse response = reviewService.getMyReviewForProduct(1L, 10L);

        assertThat(response).isNull();
    }

    @Test
    @DisplayName("getReviewsByProduct: Tính điểm trung bình và phân trang thành công")
    void getReviewsByProduct_Success() {
        when(productRepository.existsById(1L)).thenReturn(true);
        when(reviewRepository.findByProductId(eq(1L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(sampleReview)));
        when(reviewRepository.calculateAverageRatingByProductId(1L)).thenReturn(4.55);
        when(reviewRepository.countByProductId(1L)).thenReturn(1L);

        ReviewSummaryResponse summary = reviewService.getReviewsByProduct(1L, PageRequest.of(0, 10));

        assertThat(summary).isNotNull();
        assertThat(summary.getAverageRating()).isEqualTo(4.6);
        assertThat(summary.getTotalReviews()).isEqualTo(1L);
        assertThat(summary.getReviews().getContent()).hasSize(1);
    }
}
