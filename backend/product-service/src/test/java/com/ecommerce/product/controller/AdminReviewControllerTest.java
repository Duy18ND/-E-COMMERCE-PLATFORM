package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.ModerateReviewRequest;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.enums.ReviewStatus;
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
class AdminReviewControllerTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private ReviewService reviewService;

    @InjectMocks
    private AdminReviewController adminReviewController;

    private ReviewResponse sampleReview;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminReviewController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();

        sampleReview = ReviewResponse.builder()
                .id(100L)
                .productId(1L)
                .userId(10L)
                .orderId(500L)
                .rating(1)
                .comment("Hàng giả, lừa đảo")
                .status(ReviewStatus.HIDDEN)
                .hiddenReason("Chứa từ ngữ vu khống, chưa có kiểm chứng")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/admin/reviews: Có ROLE_ADMIN -> Trả về 200 OK")
    void getAllReviews_WithAdminRole_ShouldReturn200() throws Exception {
        PagedResponse<ReviewResponse> pagedResponse = PagedResponse.fromPage(
                new PageImpl<>(List.of(sampleReview), PageRequest.of(0, 20), 1)
        );

        when(reviewService.getAllReviewsForAdmin(eq(ReviewStatus.HIDDEN), any(Pageable.class)))
                .thenReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN")
                        .param("status", "HIDDEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value(100))
                .andExpect(jsonPath("$.data.content[0].status").value("HIDDEN"));
    }

    @Test
    @DisplayName("GET /api/v1/admin/reviews: Chỉ có ROLE_USER (không có ROLE_ADMIN) -> Trả về 403 Forbidden")
    void getAllReviews_WithoutAdminRole_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "ROLE_USER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Chỉ tài khoản ADMIN mới có quyền kiểm duyệt đánh giá"));

        verifyNoInteractions(reviewService);
    }

    @Test
    @DisplayName("PATCH /api/v1/admin/reviews/{id}/moderate: Admin ẩn đánh giá kèm lý do hợp lệ -> Trả về 200 OK")
    void moderateReview_Valid_ShouldReturn200() throws Exception {
        ModerateReviewRequest req = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("Chứa từ ngữ vu khống, chưa có kiểm chứng")
                .build();

        when(reviewService.moderateReview(eq(100L), any(ModerateReviewRequest.class)))
                .thenReturn(sampleReview);

        mockMvc.perform(patch("/api/v1/admin/reviews/100/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("HIDDEN"))
                .andExpect(jsonPath("$.data.hiddenReason").value("Chứa từ ngữ vu khống, chưa có kiểm chứng"));

        verify(reviewService, times(1)).moderateReview(eq(100L), any(ModerateReviewRequest.class));
    }

    @Test
    @DisplayName("PATCH /api/v1/admin/reviews/{id}/moderate: Thiếu status -> Trả về 400 Bad Request")
    void moderateReview_MissingStatus_ShouldReturn400() throws Exception {
        ModerateReviewRequest req = ModerateReviewRequest.builder()
                .reason("Chỉ có lý do, không có status")
                .build();

        mockMvc.perform(patch("/api/v1/admin/reviews/100/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        verifyNoInteractions(reviewService);
    }

    @Test
    @DisplayName("PUT /api/v1/admin/reviews/{id}/status: Alias duyệt lại bài đánh giá -> Trả về 200 OK")
    void updateReviewStatus_Alias_ShouldReturn200() throws Exception {
        sampleReview.setStatus(ReviewStatus.APPROVED);
        sampleReview.setHiddenReason(null);

        ModerateReviewRequest req = ModerateReviewRequest.builder()
                .status(ReviewStatus.APPROVED)
                .build();

        when(reviewService.moderateReview(eq(100L), any(ModerateReviewRequest.class)))
                .thenReturn(sampleReview);

        mockMvc.perform(put("/api/v1/admin/reviews/100/status")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("APPROVED"));
    }

    @Test
    @DisplayName("[Task ECOM-193] GET /api/v1/admin/reviews: ROLE_ADMIN_VIEWER (substring bypass) -> Trả về 403 Forbidden")
    void getAllReviews_WithRoleAdminViewer_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "ROLE_ADMIN_VIEWER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        verifyNoInteractions(reviewService);
    }

    @Test
    @DisplayName("[Task ECOM-351] GET /api/v1/admin/reviews: Truyền status không hợp lệ (status=INVALID) -> Trả về 400 Bad Request")
    void getAllReviews_InvalidStatusEnum_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("status", "INVALID_STATUS"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        verifyNoInteractions(reviewService);
    }
}
