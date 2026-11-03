package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.request.UpdateReviewRequest;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.dto.response.ReviewSummaryResponse;
import com.ecommerce.product.exception.AccessDeniedException;
import com.ecommerce.product.exception.DuplicateResourceException;
import com.ecommerce.product.exception.GlobalExceptionHandler;
import com.ecommerce.product.service.ReviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ReviewControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private ReviewService reviewService;

    @InjectMocks
    private ReviewController reviewController;

    private ReviewResponse sampleReview;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(reviewController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();

        sampleReview = ReviewResponse.builder()
                .id(100L)
                .productId(1L)
                .userId(10L)
                .orderId(500L)
                .rating(5)
                .comment("Đánh giá sản phẩm cực tốt")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/products/{id}/reviews: Public lấy danh sách review -> Trả về 200 OK")
    void getReviews_Public_ShouldReturn200() throws Exception {
        ReviewSummaryResponse summary = ReviewSummaryResponse.builder()
                .productId(1L)
                .averageRating(4.8)
                .totalReviews(1L)
                .reviews(PagedResponse.fromPage(new PageImpl<>(List.of(sampleReview), PageRequest.of(0, 10), 1)))
                .build();

        when(reviewService.getReviewsByProduct(eq(1L), any(Pageable.class))).thenReturn(summary);

        mockMvc.perform(get("/api/v1/products/1/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.productId").value(1))
                .andExpect(jsonPath("$.data.averageRating").value(4.8))
                .andExpect(jsonPath("$.data.totalReviews").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/products/{id}/reviews/me: Không có header X-User-Id -> Trả về 403 Forbidden")
    void getMyReview_WithoutUserId_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/products/1/reviews/me"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        verifyNoInteractions(reviewService);
    }

    @Test
    @DisplayName("GET /api/v1/products/{id}/reviews/me: Có header X-User-Id -> Trả về 200 OK kèm review")
    void getMyReview_WithUserId_ShouldReturn200() throws Exception {
        when(reviewService.getMyReviewForProduct(1L, 10L)).thenReturn(sampleReview);

        mockMvc.perform(get("/api/v1/products/1/reviews/me")
                        .header("X-User-Id", 10L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(100))
                .andExpect(jsonPath("$.data.rating").value(5));
    }

    @Test
    @DisplayName("POST /api/v1/products/{id}/reviews: Thiếu X-User-Id -> Trả về 403 Forbidden")
    void createReview_WithoutUserId_ShouldReturn403() throws Exception {
        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(500L);
        req.setRating(5);
        req.setComment("Tốt");

        mockMvc.perform(post("/api/v1/products/1/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden());

        verifyNoInteractions(reviewService);
    }

    @Test
    @DisplayName("POST /api/v1/products/{id}/reviews: Hợp lệ -> Trả về 201 Created")
    void createReview_Valid_ShouldReturn201() throws Exception {
        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(500L);
        req.setRating(5);
        req.setComment("Rất tốt");

        when(reviewService.createReview(eq(1L), eq(10L), any(CreateReviewRequest.class))).thenReturn(sampleReview);

        mockMvc.perform(post("/api/v1/products/1/reviews")
                        .header("X-User-Id", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(100));
    }

    @Test
    @DisplayName("POST /api/v1/products/{id}/reviews: Đã review trước đó -> Trả về 409 Conflict")
    void createReview_Duplicate_ShouldReturn409() throws Exception {
        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(500L);
        req.setRating(5);

        when(reviewService.createReview(eq(1L), eq(10L), any(CreateReviewRequest.class)))
                .thenThrow(new DuplicateResourceException("Bạn đã đánh giá sản phẩm này rồi. Vui lòng chỉnh sửa đánh giá hiện có."));

        mockMvc.perform(post("/api/v1/products/1/reviews")
                        .header("X-User-Id", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Bạn đã đánh giá sản phẩm này rồi. Vui lòng chỉnh sửa đánh giá hiện có."));
    }

    @Test
    @DisplayName("PUT /api/v1/products/{id}/reviews/{reviewId}: Cập nhật bằng UpdateReviewRequest thành công -> Trả về 200 OK")
    void updateReview_Valid_ShouldReturn200() throws Exception {
        UpdateReviewRequest req = UpdateReviewRequest.builder()
                .rating(4)
                .comment("Đã cập nhật sau 2 tuần")
                .build();

        ReviewResponse updated = ReviewResponse.builder()
                .id(100L)
                .productId(1L)
                .userId(10L)
                .orderId(500L)
                .rating(4)
                .comment("Đã cập nhật sau 2 tuần")
                .build();

        when(reviewService.updateReview(eq(1L), eq(100L), eq(10L), any(UpdateReviewRequest.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/v1/products/1/reviews/100")
                        .header("X-User-Id", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.rating").value(4));
    }

    @Test
    @DisplayName("DELETE /api/v1/products/{id}/reviews/{reviewId}: Xoá review thành công -> Trả về 200 OK")
    void deleteReview_Valid_ShouldReturn200() throws Exception {
        doNothing().when(reviewService).deleteReview(1L, 100L, 10L, "ROLE_CUSTOMER");

        mockMvc.perform(delete("/api/v1/products/1/reviews/100")
                        .header("X-User-Id", 10L)
                        .header("X-User-Roles", "ROLE_CUSTOMER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xoá đánh giá thành công"));

        verify(reviewService, times(1)).deleteReview(1L, 100L, 10L, "ROLE_CUSTOMER");
    }
}

