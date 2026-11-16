package com.ecommerce.product.controller;

import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.request.ModerateReviewRequest;
import com.ecommerce.product.dto.request.UpdateReviewRequest;
import com.ecommerce.product.dto.response.PagedResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.dto.response.ReviewSummaryResponse;
import com.ecommerce.product.enums.ReviewStatus;
import com.ecommerce.product.exception.AccessDeniedException;
import com.ecommerce.product.exception.DuplicateResourceException;
import com.ecommerce.product.exception.GlobalExceptionHandler;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.service.ReviewService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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

/**
 * [ECOM-351] Backend QA Test Suite:
 * Kiểm thử toàn diện API, Validation dữ liệu và Quyền truy cập cho Module Đánh giá (Review / Rating).
 * Phụ trách bởi: Ngô Phương (DevOps/QA) - Sprint 3.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ECOM-351: [BE] QA Test - API, Validation & Quyền truy cập Review")
class ReviewApiValidationAccessQATest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private ReviewService reviewService;

    @InjectMocks
    private ReviewController reviewController;

    @InjectMocks
    private AdminReviewController adminReviewController;

    private ReviewResponse sampleReview;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(reviewController, adminReviewController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();

        sampleReview = ReviewResponse.builder()
                .id(100L)
                .productId(1L)
                .userId(10L)
                .orderId(500L)
                .rating(5)
                .comment("Sản phẩm dùng rất êm, đóng gói cẩn thận!")
                .status(ReviewStatus.APPROVED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // =========================================================================
    // 1. NHÓM ACCESS CONTROL / RBAC / XÁC THỰC
    // =========================================================================
    @Nested
    @DisplayName("1. Access Control & Phân quyền RBAC")
    class AccessControlTests {

        @Test
        @DisplayName("Admin API: Từ chối khi thiếu header X-User-Roles (HTTP 403)")
        void testAdminEndpoint_RejectMissingRolesHeader() throws Exception {
            mockMvc.perform(get("/api/v1/admin/reviews"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.message").value("Chỉ tài khoản ADMIN mới có quyền kiểm duyệt đánh giá"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("Admin API: Từ chối khi header X-User-Roles rỗng hoặc chỉ có khoảng trắng (HTTP 403)")
        void testAdminEndpoint_RejectEmptyRolesHeader() throws Exception {
            mockMvc.perform(get("/api/v1/admin/reviews").header("X-User-Roles", "   "))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("Admin API: Từ chối khi role chỉ là ROLE_USER hoặc ROLE_CUSTOMER (HTTP 403)")
        void testAdminEndpoint_RejectWhenRoleIsUserOnly() throws Exception {
            mockMvc.perform(get("/api/v1/admin/reviews").header("X-User-Roles", "ROLE_USER,ROLE_CUSTOMER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            verifyNoInteractions(reviewService);
        }

        @ParameterizedTest(name = "Chặn substring role bypass: {0}")
        @ValueSource(strings = {"ROLE_ADMIN_VIEWER", "ROLE_MODERATOR", "ADMIN", "ROLE_SUPER_ADMIN_VIEWER", "ADMIN_READONLY"})
        @DisplayName("Admin API: Chặn tuyệt đối substring attack giả mạo ROLE_ADMIN (HTTP 403)")
        void testAdminEndpoint_RejectSubstringRoleBypass(String fakeRole) throws Exception {
            mockMvc.perform(get("/api/v1/admin/reviews").header("X-User-Roles", fakeRole))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("Admin API: Chấp nhận khi header chứa chính xác ROLE_ADMIN (HTTP 200)")
        void testAdminEndpoint_AllowWhenRoleAdminPresent() throws Exception {
            PagedResponse<ReviewResponse> pagedResponse = PagedResponse.fromPage(
                    new PageImpl<>(List.of(sampleReview), PageRequest.of(0, 20), 1)
            );
            when(reviewService.getAllReviewsForAdmin(any(), any(Pageable.class))).thenReturn(pagedResponse);

            mockMvc.perform(get("/api/v1/admin/reviews")
                            .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("Customer API: GET /reviews/me từ chối khi thiếu X-User-Id (HTTP 403)")
        void testCustomerGetMyReview_RejectMissingUserId() throws Exception {
            mockMvc.perform(get("/api/v1/products/1/reviews/me"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.message").value("Bạn cần đăng nhập để thực hiện thao tác này (thiếu X-User-Id)"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("Customer API: POST /reviews từ chối khi X-User-Id <= 0 (HTTP 403)")
        void testCustomerCreateReview_RejectInvalidUserId() throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setOrderId(100L);
            req.setRating(5);
            req.setComment("Rất tốt");

            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "0")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.message").value("Thông tin người dùng xác thực (X-User-Id) không hợp lệ"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("Customer API: PUT /reviews/{id} từ chối khi người sửa không phải owner (HTTP 403 IDOR Protection)")
        void testCustomerUpdateReview_RejectNonOwnerIdor() throws Exception {
            UpdateReviewRequest req = new UpdateReviewRequest();
            req.setRating(4);
            req.setComment("Sửa đánh giá");

            doThrow(new AccessDeniedException("Bạn không có quyền chỉnh sửa đánh giá này"))
                    .when(reviewService).updateReview(eq(1L), eq(100L), eq(999L), any(UpdateReviewRequest.class));

            mockMvc.perform(put("/api/v1/products/1/reviews/100")
                            .header("X-User-Id", "999")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.message").value("Bạn không có quyền chỉnh sửa đánh giá này"));
        }

        @Test
        @DisplayName("Customer API: DELETE /reviews/{id} cho phép ROLE_ADMIN xóa bài vi phạm (HTTP 200)")
        void testDeleteReview_AllowAdminRole() throws Exception {
            doNothing().when(reviewService).deleteReview(eq(1L), eq(100L), any(), eq("ROLE_ADMIN"));

            mockMvc.perform(delete("/api/v1/products/1/reviews/100")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Xoá đánh giá thành công"));
        }

        @Test
        @DisplayName("Customer API: DELETE /reviews/{id} từ chối người dùng khác không phải owner hoặc admin (HTTP 403)")
        void testDeleteReview_RejectNonOwnerAndNonAdmin() throws Exception {
            doThrow(new AccessDeniedException("Bạn không có quyền xoá đánh giá này"))
                    .when(reviewService).deleteReview(eq(1L), eq(100L), eq(999L), eq("ROLE_USER"));

            mockMvc.perform(delete("/api/v1/products/1/reviews/100")
                            .header("X-User-Id", "999")
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.message").value("Bạn không có quyền xoá đánh giá này"));
        }
    }

    // =========================================================================
    // 2. NHÓM INPUT VALIDATION & CASE DỮ LIỆU SAI
    // =========================================================================
    @Nested
    @DisplayName("2. Input Validation & Case Dữ Liệu Sai")
    class InputValidationTests {

        @Test
        @DisplayName("POST /reviews: Từ chối khi thiếu orderId (HTTP 400 Bad Request)")
        void testCreateReview_RejectNullOrderId() throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setRating(5);
            req.setComment("Đẹp");

            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.orderId").value("orderId không được để trống"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("POST /reviews: Từ chối khi thiếu rating (HTTP 400 Bad Request)")
        void testCreateReview_RejectNullRating() throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setOrderId(500L);
            req.setComment("Đẹp");

            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.rating").value("rating không được để trống"));

            verifyNoInteractions(reviewService);
        }

        @ParameterizedTest(name = "Rating dưới biên: {0}")
        @ValueSource(ints = {0, -1, -5})
        @DisplayName("POST /reviews: Từ chối khi rating < 1 sao (HTTP 400 Bad Request)")
        void testCreateReview_RejectRatingLessThanOne(int invalidRating) throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setOrderId(500L);
            req.setRating(invalidRating);

            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.rating").value("rating tối thiểu là 1 sao"));

            verifyNoInteractions(reviewService);
        }

        @ParameterizedTest(name = "Rating trên biên: {0}")
        @ValueSource(ints = {6, 10, 100})
        @DisplayName("POST /reviews: Từ chối khi rating > 5 sao (HTTP 400 Bad Request)")
        void testCreateReview_RejectRatingGreaterThanFive(int invalidRating) throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setOrderId(500L);
            req.setRating(invalidRating);

            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.rating").value("rating tối đa là 5 sao"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("POST /reviews: Từ chối khi comment vượt quá 2000 ký tự (HTTP 400 Bad Request)")
        void testCreateReview_RejectCommentOver2000Chars() throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setOrderId(500L);
            req.setRating(5);
            req.setComment("a".repeat(2001));

            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.comment").value("Bình luận không được vượt quá 2000 ký tự"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("PUT /reviews/{id}: Từ chối khi rating null hoặc ngoài biên 1..5 (HTTP 400 Bad Request)")
        void testUpdateReview_RejectInvalidRating() throws Exception {
            UpdateReviewRequest req = new UpdateReviewRequest();
            req.setRating(7);
            req.setComment("Sửa nhận xét");

            mockMvc.perform(put("/api/v1/products/1/reviews/100")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.rating").value("rating tối đa là 5 sao"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("PATCH /admin/reviews/{id}/moderate: Từ chối khi thiếu status (HTTP 400 Bad Request)")
        void testModerateReview_RejectNullStatus() throws Exception {
            ModerateReviewRequest req = new ModerateReviewRequest();
            req.setReason("Lý do ẩn");

            mockMvc.perform(patch("/api/v1/admin/reviews/100/moderate")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.status").value("Trạng thái kiểm duyệt không được để trống"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("PATCH /admin/reviews/{id}/moderate: Từ chối khi lý do ẩn vượt quá 255 ký tự (HTTP 400 Bad Request)")
        void testModerateReview_RejectReasonOver255Chars() throws Exception {
            ModerateReviewRequest req = ModerateReviewRequest.builder()
                    .status(ReviewStatus.HIDDEN)
                    .reason("x".repeat(256))
                    .build();

            mockMvc.perform(patch("/api/v1/admin/reviews/100/moderate")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.reason").value("Lý do ẩn không được vượt quá 255 ký tự"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("URL Path Variable: Từ chối khi productId không phải số (HTTP 400 Bad Request)")
        void testPathVariables_RejectNonNumericProductId() throws Exception {
            mockMvc.perform(get("/api/v1/products/not-a-number/reviews"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value("Tham số hoặc định dạng dữ liệu gửi lên không hợp lệ"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("URL Path Variable: Từ chối khi reviewId không phải số (HTTP 400 Bad Request)")
        void testPathVariables_RejectNonNumericReviewId() throws Exception {
            mockMvc.perform(patch("/api/v1/admin/reviews/invalid-id/moderate")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"status\": \"APPROVED\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value("Tham số hoặc định dạng dữ liệu gửi lên không hợp lệ"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("JSON Body Payload: Xử lý khi body JSON sai cú pháp (HTTP 400 Bad Request)")
        void testJsonBody_MalformedSyntax() throws Exception {
            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"orderId\": 10, \"rating\": }"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value("Tham số hoặc định dạng dữ liệu gửi lên không hợp lệ"));

            verifyNoInteractions(reviewService);
        }

        @Test
        @DisplayName("JSON Body Payload: Xử lý khi rating sai kiểu dữ liệu chữ (HTTP 400 Bad Request)")
        void testJsonBody_TypeMismatch() throws Exception {
            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"orderId\": 10, \"rating\": \"five\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value("Tham số hoặc định dạng dữ liệu gửi lên không hợp lệ"));

            verifyNoInteractions(reviewService);
        }
    }

    // =========================================================================
    // 3. NHÓM XỬ LÝ NGOẠI LỆ & NGHIỆP VỤ (BUSINESS RULES & EXCEPTIONS)
    // =========================================================================
    @Nested
    @DisplayName("3. Nghiệp vụ & Xử lý Ngoại lệ")
    class BusinessErrorHandlingTests {

        @Test
        @DisplayName("POST /reviews: Sản phẩm không tồn tại -> Trả về HTTP 404 Not Found")
        void testCreateReview_ProductNotFound() throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setOrderId(500L);
            req.setRating(5);

            when(reviewService.createReview(eq(999999L), eq(10L), any(CreateReviewRequest.class)))
                    .thenThrow(new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: 999999"));

            mockMvc.perform(post("/api/v1/products/999999/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.message").value("Không tìm thấy sản phẩm với ID: 999999"));
        }

        @Test
        @DisplayName("POST /reviews: Đánh giá trùng sản phẩm (Duplicate) -> Trả về HTTP 409 Conflict")
        void testCreateReview_DuplicateReviewConflict() throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setOrderId(500L);
            req.setRating(5);

            when(reviewService.createReview(eq(1L), eq(10L), any(CreateReviewRequest.class)))
                    .thenThrow(new DuplicateResourceException("Bạn đã đánh giá sản phẩm này rồi"));

            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.status").value(409))
                    .andExpect(jsonPath("$.message").value("Bạn đã đánh giá sản phẩm này rồi"));
        }

        @Test
        @DisplayName("POST /reviews: Đơn hàng chưa giao thành công (PENDING/SHIPPING) -> Trả về HTTP 422 Unprocessable")
        void testCreateReview_OrderNotDeliveredUnprocessable() throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setOrderId(500L);
            req.setRating(5);

            when(reviewService.createReview(eq(1L), eq(10L), any(CreateReviewRequest.class)))
                    .thenThrow(new IllegalStateException("Chỉ được đánh giá sản phẩm khi đơn hàng đã giao thành công (DELIVERED). Trạng thái hiện tại: SHIPPING"));

            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.status").value(422))
                    .andExpect(jsonPath("$.message").value("Chỉ được đánh giá sản phẩm khi đơn hàng đã giao thành công (DELIVERED). Trạng thái hiện tại: SHIPPING"));
        }

        @Test
        @DisplayName("POST /reviews: Đơn hàng không chứa sản phẩm đang đánh giá -> Trả về HTTP 422 Unprocessable")
        void testCreateReview_ProductNotPurchasedInOrder() throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setOrderId(500L);
            req.setRating(5);

            when(reviewService.createReview(eq(1L), eq(10L), any(CreateReviewRequest.class)))
                    .thenThrow(new IllegalStateException("Đơn hàng 500 không chứa sản phẩm ID: 1"));

            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isUnprocessableEntity())
                    .andExpect(jsonPath("$.status").value(422))
                    .andExpect(jsonPath("$.message").value("Đơn hàng 500 không chứa sản phẩm ID: 1"));
        }

        @Test
        @DisplayName("DELETE /reviews/{id}: Xóa chéo sản phẩm (reviewId không thuộc productId) -> Trả về HTTP 400 Bad Request")
        void testDeleteReview_CrossProductMismatch() throws Exception {
            doThrow(new IllegalArgumentException("Đánh giá ID 100 không thuộc sản phẩm ID 999"))
                    .when(reviewService).deleteReview(eq(999L), eq(100L), any(), eq("ROLE_ADMIN"));

            mockMvc.perform(delete("/api/v1/products/999/reviews/100")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value("Đánh giá ID 100 không thuộc sản phẩm ID 999"));
        }

        @Test
        @DisplayName("PATCH /admin/reviews/{id}/moderate: Không tìm thấy reviewId -> Trả về HTTP 404 Not Found")
        void testModerateReview_NotFound() throws Exception {
            ModerateReviewRequest req = ModerateReviewRequest.builder()
                    .status(ReviewStatus.APPROVED)
                    .build();

            when(reviewService.moderateReview(eq(888888L), any(ModerateReviewRequest.class)))
                    .thenThrow(new ResourceNotFoundException("Không tìm thấy đánh giá với ID: 888888"));

            mockMvc.perform(patch("/api/v1/admin/reviews/888888/moderate")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.message").value("Không tìm thấy đánh giá với ID: 888888"));
        }

        @Test
        @DisplayName("Hệ thống phát sinh lỗi bất ngờ -> Trả về HTTP 500 Internal Server Error chuẩn hóa")
        void testGenericException_ShouldReturn500() throws Exception {
            when(reviewService.getReviewsByProduct(eq(1L), any(Pageable.class)))
                    .thenThrow(new RuntimeException("Database connection timeout"));

            mockMvc.perform(get("/api/v1/products/1/reviews"))
                    .andExpect(status().isInternalServerError())
                    .andExpect(jsonPath("$.status").value(500))
                    .andExpect(jsonPath("$.message").value("Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau."));
        }
    }

    // =========================================================================
    // 4. NHÓM HAPPY PATH (LUỒNG THÀNH CÔNG ĐẦY ĐỦ)
    // =========================================================================
    @Nested
    @DisplayName("4. Happy Path Luồng Nghiệp Vụ Chính")
    class HappyPathTests {

        @Test
        @DisplayName("GET /reviews: Xem danh sách đánh giá công khai kèm điểm sao trung bình -> HTTP 200 OK")
        void testGetReviewsPublic_Success() throws Exception {
            ReviewSummaryResponse summary = ReviewSummaryResponse.builder()
                    .productId(1L)
                    .averageRating(4.9)
                    .totalReviews(25L)
                    .reviews(PagedResponse.fromPage(new PageImpl<>(List.of(sampleReview), PageRequest.of(0, 10), 25)))
                    .build();

            when(reviewService.getReviewsByProduct(eq(1L), any(Pageable.class))).thenReturn(summary);

            mockMvc.perform(get("/api/v1/products/1/reviews"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.averageRating").value(4.9))
                    .andExpect(jsonPath("$.data.totalReviews").value(25))
                    .andExpect(jsonPath("$.data.reviews.content[0].id").value(100));
        }

        @Test
        @DisplayName("GET /reviews/me: Lấy bài đánh giá cá nhân của user -> HTTP 200 OK")
        void testGetMyReview_Success() throws Exception {
            when(reviewService.getMyReviewForProduct(eq(1L), eq(10L))).thenReturn(sampleReview);

            mockMvc.perform(get("/api/v1/products/1/reviews/me")
                            .header("X-User-Id", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(100))
                    .andExpect(jsonPath("$.data.rating").value(5));
        }

        @Test
        @DisplayName("POST /reviews: Tạo đánh giá mới sau khi mua hàng -> HTTP 201 Created")
        void testCreateReview_Success() throws Exception {
            CreateReviewRequest req = new CreateReviewRequest();
            req.setOrderId(500L);
            req.setRating(5);
            req.setComment("Sản phẩm dùng rất êm, đóng gói cẩn thận!");

            when(reviewService.createReview(eq(1L), eq(10L), any(CreateReviewRequest.class))).thenReturn(sampleReview);

            mockMvc.perform(post("/api/v1/products/1/reviews")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Đánh giá sản phẩm thành công"))
                    .andExpect(jsonPath("$.data.id").value(100));
        }

        @Test
        @DisplayName("PUT /reviews/{id}: Cập nhật đánh giá bởi chính chủ -> HTTP 200 OK")
        void testUpdateReview_Success() throws Exception {
            UpdateReviewRequest req = new UpdateReviewRequest();
            req.setRating(4);
            req.setComment("Đã dùng 1 tuần, khá ổn");

            ReviewResponse updated = ReviewResponse.builder()
                    .id(100L)
                    .productId(1L)
                    .userId(10L)
                    .orderId(500L)
                    .rating(4)
                    .comment("Đã dùng 1 tuần, khá ổn")
                    .status(ReviewStatus.APPROVED)
                    .build();

            when(reviewService.updateReview(eq(1L), eq(100L), eq(10L), any(UpdateReviewRequest.class))).thenReturn(updated);

            mockMvc.perform(put("/api/v1/products/1/reviews/100")
                            .header("X-User-Id", "10")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.rating").value(4))
                    .andExpect(jsonPath("$.data.comment").value("Đã dùng 1 tuần, khá ổn"));
        }

        @Test
        @DisplayName("PATCH /admin/reviews/{id}/moderate: Admin ẩn đánh giá vi phạm quy chuẩn -> HTTP 200 OK")
        void testModerateReview_HideViolation_Success() throws Exception {
            ModerateReviewRequest req = ModerateReviewRequest.builder()
                    .status(ReviewStatus.HIDDEN)
                    .reason("Chứa từ ngữ thô tục, quảng cáo sai sự thật")
                    .build();

            ReviewResponse hidden = ReviewResponse.builder()
                    .id(100L)
                    .productId(1L)
                    .userId(10L)
                    .status(ReviewStatus.HIDDEN)
                    .hiddenReason("Chứa từ ngữ thô tục, quảng cáo sai sự thật")
                    .build();

            when(reviewService.moderateReview(eq(100L), any(ModerateReviewRequest.class))).thenReturn(hidden);

            mockMvc.perform(patch("/api/v1/admin/reviews/100/moderate")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("HIDDEN"))
                    .andExpect(jsonPath("$.data.hiddenReason").value("Chứa từ ngữ thô tục, quảng cáo sai sự thật"));
        }

        @Test
        @DisplayName("PUT /admin/reviews/{id}/status: Admin duyệt lại đánh giá (Alias endpoint) -> HTTP 200 OK")
        void testUpdateReviewStatusAlias_Success() throws Exception {
            ModerateReviewRequest req = ModerateReviewRequest.builder()
                    .status(ReviewStatus.APPROVED)
                    .build();

            when(reviewService.moderateReview(eq(100L), any(ModerateReviewRequest.class))).thenReturn(sampleReview);

            mockMvc.perform(put("/api/v1/admin/reviews/100/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("APPROVED"));
        }
    }
}
