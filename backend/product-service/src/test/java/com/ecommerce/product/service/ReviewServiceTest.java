package com.ecommerce.product.service;

import com.ecommerce.product.client.OrderClient;
import com.ecommerce.product.client.dto.OrderDetailResponse;
import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.entity.ProductReview;
import com.ecommerce.product.exception.AccessDeniedException;
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

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Kiểm tra tương thích liên dịch vụ product-service -> order-service sau khi vá IDOR:
 * Order Service bắt buộc X-User-Id, nên OrderClient phải propagate userId của người tạo review.
 */
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

    @BeforeEach
    void setUp() {
        request = new CreateReviewRequest();
        request.setOrderId(500L);
        request.setRating(5);
        request.setComment("Sản phẩm tốt");
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

    @Test
    @DisplayName("createReview: propagate userId sang OrderClient (header X-User-Id) và tạo review thành công")
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
}

