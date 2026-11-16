package com.ecommerce.product.controller;

import com.ecommerce.product.client.OrderClient;
import com.ecommerce.product.client.dto.OrderDetailResponse;
import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.request.ModerateReviewRequest;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.entity.ProductReview;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.enums.ReviewStatus;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.repository.ProductReviewRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-193] Bộ kiểm thử tự động QA (Integration Test trên H2 Database thật):
 * Tên task: [QA] Test duyệt/ẩn đánh giá, phân quyền và điểm sao hiển thị
 * Nhóm cha: ECOM-343 – Đánh giá sau mua
 * Người phụ trách: Ngô Phương
 *
 * Phạm vi kiểm thử:
 * - Nhóm A (E193-01 -> E193-06): Quyền truy cập quản trị (RBAC Admin vs User vs Guest, chống giả mạo role/status)
 * - Nhóm B (E193-07 -> E193-15): Kiểm duyệt đánh giá (Duyệt APPROVED, ẩn HIDDEN, lọc trạng thái, idempotency, lỗi biên)
 * - Nhóm C (E193-16 -> E193-20): Hiển thị công khai, tính điểm sao trung bình (averageRating, totalReviews) & tính nhất quán dữ liệu
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:ecom193db;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.cache.type=none",
        "eureka.client.enabled=false",
        "spring.cloud.discovery.enabled=false"
})
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@DisplayName("ECOM-193: QA Integration Test - Quản trị kiểm duyệt đánh giá, phân quyền và điểm sao hiển thị")
class AdminReviewModerationEcom193IntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductReviewRepository reviewRepository;

    @MockBean
    private OrderClient orderClient;

    private Product productA;
    private Product productB;
    private ProductReview approvedReview1;
    private ProductReview approvedReview2;
    private ProductReview violatingReview;

    @BeforeEach
    void setUp() {
        clearInvocations(orderClient);
        reviewRepository.deleteAll();
        productRepository.deleteAll();

        productA = productRepository.save(Product.builder()
                .name("Apple Watch Ultra 2")
                .description("Đồng hồ thông minh cao cấp")
                .price(new BigDecimal("21990000.00"))
                .stockQuantity(15)
                .category("Smartwatch")
                .status(ProductStatus.ACTIVE)
                .build());

        productB = productRepository.save(Product.builder()
                .name("AirPods Pro 2 USB-C")
                .description("Tai nghe chống ồn chủ động")
                .price(new BigDecimal("5990000.00"))
                .stockQuantity(40)
                .category("Audio")
                .status(ProductStatus.ACTIVE)
                .build());

        approvedReview1 = reviewRepository.save(ProductReview.builder()
                .productId(productA.getId())
                .userId(1001L)
                .orderId(5001L)
                .rating(5)
                .comment("Đồng hồ pin rất trâu, màn hình sáng rõ")
                .status(ReviewStatus.APPROVED)
                .build());

        approvedReview2 = reviewRepository.save(ProductReview.builder()
                .productId(productA.getId())
                .userId(1002L)
                .orderId(5002L)
                .rating(4)
                .comment("Giao hàng đúng hẹn, đóng gói cẩn thận")
                .status(ReviewStatus.APPROVED)
                .build());

        violatingReview = reviewRepository.save(ProductReview.builder()
                .productId(productA.getId())
                .userId(1003L)
                .orderId(5003L)
                .rating(1)
                .comment("Spam link quảng cáo cờ bạc vi phạm tiêu chuẩn cộng đồng")
                .status(ReviewStatus.APPROVED)
                .build());
    }

    // =========================================================================
    // NHÓM A: QUYỀN TRUY CẬP QUẢN TRỊ (RBAC & CHỐNG GIẢ MẠO QUYỀN)
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("E193-01: Admin (ROLE_ADMIN) có quyền truy cập đầy đủ API danh sách và kiểm duyệt đánh giá -> 200 OK")
    void e193_01_adminCanAccessAllReviewModerationApis_ShouldReturn200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalElements").value(3));

        ModerateReviewRequest hideReq = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("Vi phạm quy chuẩn cộng đồng")
                .build();

        mockMvc.perform(patch("/api/v1/admin/reviews/" + violatingReview.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hideReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("HIDDEN"));
    }

    @Test
    @Order(2)
    @DisplayName("E193-02: User thông thường (ROLE_USER / ROLE_CUSTOMER) không thể gọi các API quản trị đánh giá -> 403 Forbidden")
    void e193_02_regularUserCannotAccessAdminReviewApis_ShouldReturn403() throws Exception {
        // 1. GET danh sách Admin
        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Id", 1001L)
                        .header("X-User-Roles", "ROLE_CUSTOMER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Chỉ tài khoản ADMIN mới có quyền kiểm duyệt đánh giá"));

        // 2. PATCH moderate
        ModerateReviewRequest req = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("User thường cố ẩn đánh giá của người khác")
                .build();

        mockMvc.perform(patch("/api/v1/admin/reviews/" + approvedReview1.getId() + "/moderate")
                        .header("X-User-Id", 1002L)
                        .header("X-User-Roles", "ROLE_USER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // 3. PUT status alias
        mockMvc.perform(put("/api/v1/admin/reviews/" + approvedReview1.getId() + "/status")
                        .header("X-User-Id", 1002L)
                        .header("X-User-Roles", "ROLE_CUSTOMER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // Xác minh DB không bị thay đổi
        ProductReview unchanged = reviewRepository.findById(approvedReview1.getId()).orElseThrow();
        assertThat(unchanged.getStatus()).isEqualTo(ReviewStatus.APPROVED);
        assertThat(unchanged.getHiddenReason()).isNull();
    }

    @Test
    @Order(3)
    @DisplayName("E193-03: Guest (không có X-User-Roles hoặc header rỗng) bị từ chối truy cập chức năng quản trị -> 403 Forbidden")
    void e193_03_guestCannotAccessAdminReviewApis_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/reviews"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "   "))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        ModerateReviewRequest req = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("Guest ẩn đánh giá")
                .build();

        mockMvc.perform(patch("/api/v1/admin/reviews/" + violatingReview.getId() + "/moderate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @ParameterizedTest(name = "E193-04: Role giả mạo '{0}' không khớp chính xác ROLE_ADMIN -> 403 Forbidden")
    @ValueSource(strings = {"ROLE_ADMIN_VIEWER", "ROLE_SUPER_ADMIN", "ADMIN", "ROLE_MODERATOR"})
    @Order(4)
    @DisplayName("E193-04: Chặn bypass phân quyền qua tên role chứa chuỗi con ADMIN -> 403 Forbidden")
    void e193_04_spoofedOrSubstringAdminRoles_ShouldReturn403(String fakeRole) throws Exception {
        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", fakeRole))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @Order(5)
    @DisplayName("E193-05: Phân quyền xóa đánh giá (DELETE): Chỉ Owner hoặc ROLE_ADMIN được xóa; người khác bị chặn 403")
    void e193_05_deleteReviewAuthorization_OwnerOrAdminAllowed_OthersRejected403() throws Exception {
        // 1. Người dùng khác (userId=9999) cố xóa đánh giá của userId=1001 -> 403 Forbidden
        mockMvc.perform(delete("/api/v1/products/" + productA.getId() + "/reviews/" + approvedReview1.getId())
                        .header("X-User-Id", 9999L)
                        .header("X-User-Roles", "ROLE_CUSTOMER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Bạn không có quyền xoá đánh giá này"));

        // 2. Guest không đăng nhập cố xóa -> 403 Forbidden
        mockMvc.perform(delete("/api/v1/products/" + productA.getId() + "/reviews/" + approvedReview1.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        assertThat(reviewRepository.existsById(approvedReview1.getId())).isTrue();

        // 3. Admin xóa đánh giá vi phạm của user 1003 -> 200 OK
        mockMvc.perform(delete("/api/v1/products/" + productA.getId() + "/reviews/" + violatingReview.getId())
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        assertThat(reviewRepository.existsById(violatingReview.getId())).isFalse();
    }

    @Test
    @Order(6)
    @DisplayName("E193-06: Người dùng thông thường không thể tự mở khóa trạng thái HIDDEN qua API cập nhật PUT")
    void e193_06_regularUserCannotSelfApproveHiddenReviewViaUpdateApi() throws Exception {
        // Admin ẩn đánh giá vi phạm của user 1003
        violatingReview.setStatus(ReviewStatus.HIDDEN);
        violatingReview.setHiddenReason("Ngôn từ không phù hợp");
        reviewRepository.saveAndFlush(violatingReview);

        // User 1003 gửi PUT kèm các trường status=APPROVED, hiddenReason=null trong body để cố tự duyệt lại
        String maliciousUpdateJson = """
                {
                    "rating": 5,
                    "comment": "Đã sửa nội dung và cố tự chuyển sang APPROVED",
                    "status": "APPROVED",
                    "hiddenReason": null
                }
                """;

        mockMvc.perform(put("/api/v1/products/" + productA.getId() + "/reviews/" + violatingReview.getId())
                        .header("X-User-Id", 1003L)
                        .header("X-User-Roles", "ROLE_CUSTOMER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(maliciousUpdateJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("HIDDEN"))
                .andExpect(jsonPath("$.data.hiddenReason").value("Ngôn từ không phù hợp"));

        ProductReview inDb = reviewRepository.findById(violatingReview.getId()).orElseThrow();
        assertThat(inDb.getStatus()).isEqualTo(ReviewStatus.HIDDEN);
        assertThat(inDb.getHiddenReason()).isEqualTo("Ngôn từ không phù hợp");
    }

    // =========================================================================
    // NHÓM B: KIỂM DUYỆT ĐÁNH GIÁ (MODERATION OPERATIONS & VALIDATION)
    // =========================================================================

    @Test
    @Order(7)
    @DisplayName("E193-07 & E193-08: Admin lấy danh sách toàn bộ đánh giá và lọc chính xác theo trạng thái APPROVED / HIDDEN")
    void e193_07_08_adminListAllAndFilterByStatus_ShouldMatchDatabaseRecords() throws Exception {
        // Ẩn violatingReview trước
        violatingReview.setStatus(ReviewStatus.HIDDEN);
        violatingReview.setHiddenReason("Spam link");
        reviewRepository.saveAndFlush(violatingReview);

        // 1. Lấy tất cả (không truyền status) -> 3 đánh giá
        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(3))
                .andExpect(jsonPath("$.data.content", hasSize(3)));

        // 2. Lọc status=APPROVED -> 2 đánh giá
        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("status", "APPROVED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.content", hasSize(2)))
                .andExpect(jsonPath("$.data.content[0].status").value("APPROVED"))
                .andExpect(jsonPath("$.data.content[1].status").value("APPROVED"));

        // 3. Lọc status=HIDDEN -> 1 đánh giá kèm hiddenReason
        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("status", "HIDDEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(violatingReview.getId()))
                .andExpect(jsonPath("$.data.content[0].status").value("HIDDEN"))
                .andExpect(jsonPath("$.data.content[0].hiddenReason").value("Spam link"));
    }

    @Test
    @Order(8)
    @DisplayName("E193-09 & E193-10: Admin ẩn đánh giá vi phạm (HIDDEN) và duyệt lại (APPROVED) -> Cập nhật DB chính xác")
    void e193_09_10_hideAndReApproveReview_ShouldPersistAndClearHiddenReasonInDatabase() throws Exception {
        // Bước 1: Ẩn đánh giá vi phạm qua PATCH /moderate
        ModerateReviewRequest hideReq = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("  Chứa ngôn từ quảng cáo sai sự thật  ")
                .build();

        mockMvc.perform(patch("/api/v1/admin/reviews/" + violatingReview.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hideReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(violatingReview.getId()))
                .andExpect(jsonPath("$.data.status").value("HIDDEN"))
                .andExpect(jsonPath("$.data.hiddenReason").value("Chứa ngôn từ quảng cáo sai sự thật"));

        ProductReview hiddenInDb = reviewRepository.findById(violatingReview.getId()).orElseThrow();
        assertThat(hiddenInDb.getStatus()).isEqualTo(ReviewStatus.HIDDEN);
        assertThat(hiddenInDb.getHiddenReason()).isEqualTo("Chứa ngôn từ quảng cáo sai sự thật");

        // Bước 2: Duyệt lại đánh giá qua PUT /status (alias) -> status=APPROVED, hiddenReason=null
        ModerateReviewRequest approveReq = ModerateReviewRequest.builder()
                .status(ReviewStatus.APPROVED)
                .reason("Lý do này phải bị xóa khi APPROVED")
                .build();

        mockMvc.perform(put("/api/v1/admin/reviews/" + violatingReview.getId() + "/status")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(violatingReview.getId()))
                .andExpect(jsonPath("$.data.status").value("APPROVED"))
                .andExpect(jsonPath("$.data.hiddenReason").value(nullValue()));

        ProductReview approvedInDb = reviewRepository.findById(violatingReview.getId()).orElseThrow();
        assertThat(approvedInDb.getStatus()).isEqualTo(ReviewStatus.APPROVED);
        assertThat(approvedInDb.getHiddenReason()).isNull();
    }

    @Test
    @Order(9)
    @DisplayName("E193-11: Kiểm tra thao tác kiểm duyệt lặp lại (Idempotency) cho đánh giá đã APPROVED hoặc đã HIDDEN")
    void e193_11_repeatedModerationOperations_ShouldBeIdempotentAndConsistent() throws Exception {
        // 1. Duyệt lại một đánh giá vốn đã APPROVED
        ModerateReviewRequest approveAgain = ModerateReviewRequest.builder()
                .status(ReviewStatus.APPROVED)
                .build();

        mockMvc.perform(patch("/api/v1/admin/reviews/" + approvedReview1.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveAgain)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("APPROVED"))
                .andExpect(jsonPath("$.data.hiddenReason").value(nullValue()));

        // 2. Ẩn 2 lần liên tiếp cùng 1 đánh giá với lý do cập nhật
        ModerateReviewRequest hideFirst = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("Lý do ẩn lần 1")
                .build();
        ModerateReviewRequest hideSecond = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("Lý do ẩn cập nhật lần 2")
                .build();

        mockMvc.perform(patch("/api/v1/admin/reviews/" + violatingReview.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hideFirst)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("HIDDEN"))
                .andExpect(jsonPath("$.data.hiddenReason").value("Lý do ẩn lần 1"));

        mockMvc.perform(patch("/api/v1/admin/reviews/" + violatingReview.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hideSecond)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("HIDDEN"))
                .andExpect(jsonPath("$.data.hiddenReason").value("Lý do ẩn cập nhật lần 2"));

        ProductReview inDb = reviewRepository.findById(violatingReview.getId()).orElseThrow();
        assertThat(inDb.getStatus()).isEqualTo(ReviewStatus.HIDDEN);
        assertThat(inDb.getHiddenReason()).isEqualTo("Lý do ẩn cập nhật lần 2");
    }

    @Test
    @Order(10)
    @DisplayName("E193-12, E193-13 & E193-14: Kiểm tra ID không tồn tại (404), ID/status sai định dạng và reason quá dài (400)")
    void e193_12_to_14_invalidIdsAndInvalidModerationPayloads_ShouldReturn404Or400() throws Exception {
        ModerateReviewRequest validReq = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("Vi phạm")
                .build();

        // 1. E193-12: ID không tồn tại -> 404 Not Found
        mockMvc.perform(patch("/api/v1/admin/reviews/999999/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Không tìm thấy đánh giá với ID: 999999"));

        // ID <= 0 -> 404 Not Found
        mockMvc.perform(patch("/api/v1/admin/reviews/0/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        // 2. E193-13: ID sai định dạng kiểu dữ liệu hoặc query param status không hợp lệ -> 400 Bad Request
        mockMvc.perform(patch("/api/v1/admin/reviews/not-a-number/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("status", "PENDING"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        // 3. E193-14: Thiếu status, status sai enum, hoặc reason > 255 ký tự -> 400 Bad Request
        mockMvc.perform(patch("/api/v1/admin/reviews/" + violatingReview.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\": \"Thiếu trường status\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.status").value("Trạng thái kiểm duyệt không được để trống"));

        mockMvc.perform(patch("/api/v1/admin/reviews/" + violatingReview.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"REJECTED\", \"reason\": \"Trạng thái không định nghĩa\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        ModerateReviewRequest tooLongReason = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("R".repeat(256))
                .build();

        mockMvc.perform(patch("/api/v1/admin/reviews/" + violatingReview.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooLongReason)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.reason").value("Lý do ẩn không được vượt quá 255 ký tự"));
    }

    @Test
    @Order(11)
    @DisplayName("E193-15: User có đánh giá đang bị Admin ẩn (HIDDEN) không thể tạo đánh giá mới để lách kiểm duyệt -> 409 Conflict")
    void e193_15_userWithHiddenReviewCannotCreateNewReviewToBypassModeration() throws Exception {
        // Ẩn đánh giá của user 1003
        violatingReview.setStatus(ReviewStatus.HIDDEN);
        violatingReview.setHiddenReason("Vi phạm quy chuẩn");
        reviewRepository.saveAndFlush(violatingReview);

        CreateReviewRequest newAttempt = new CreateReviewRequest();
        newAttempt.setOrderId(5003L);
        newAttempt.setRating(5);
        newAttempt.setComment("Cố tạo review mới khi review cũ đã bị Admin ẩn");

        mockMvc.perform(post("/api/v1/products/" + productA.getId() + "/reviews")
                        .header("X-User-Id", 1003L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newAttempt)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        assertThat(reviewRepository.countByProductId(productA.getId())).isEqualTo(3L);
    }

    // =========================================================================
    // NHÓM C: HIỂN THỊ CÔNG KHAI, ĐIỂM SAO TRUNG BÌNH & TÍNH NHẤT QUÁN DỮ LIỆU
    // =========================================================================

    @Test
    @Order(12)
    @DisplayName("E193-16, E193-17 & E193-19: Ẩn/Duyệt đánh giá cập nhật chính xác danh sách công khai, totalReviews và averageRating")
    void e193_16_17_19_moderationUpdatesPublicVisibilityAndAverageRatingAccurately() throws Exception {
        // Ban đầu cả 3 đánh giá đều APPROVED (5, 4, 1 sao) -> totalReviews = 3, averageRating = (5+4+1)/3 = 3.3
        mockMvc.perform(get("/api/v1/products/" + productA.getId() + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productId").value(productA.getId()))
                .andExpect(jsonPath("$.data.totalReviews").value(3))
                .andExpect(jsonPath("$.data.averageRating").value(3.3))
                .andExpect(jsonPath("$.data.reviews.content", hasSize(3)));

        // Bước 1: Admin ẩn violatingReview (1 sao) -> Chỉ còn 2 đánh giá APPROVED (5, 4 sao), averageRating = 4.5
        ModerateReviewRequest hideReq = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("Đánh giá spam")
                .build();

        mockMvc.perform(patch("/api/v1/admin/reviews/" + violatingReview.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hideReq)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/products/" + productA.getId() + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalReviews").value(2))
                .andExpect(jsonPath("$.data.averageRating").value(4.5))
                .andExpect(jsonPath("$.data.reviews.content", hasSize(2)));

        // Bước 2: Admin duyệt lại violatingReview (HIDDEN -> APPROVED) -> Khôi phục totalReviews = 3, averageRating = 3.3
        ModerateReviewRequest approveReq = ModerateReviewRequest.builder()
                .status(ReviewStatus.APPROVED)
                .build();

        mockMvc.perform(patch("/api/v1/admin/reviews/" + violatingReview.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveReq)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/products/" + productA.getId() + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalReviews").value(3))
                .andExpect(jsonPath("$.data.averageRating").value(3.3))
                .andExpect(jsonPath("$.data.reviews.content", hasSize(3)));
    }

    @Test
    @Order(13)
    @DisplayName("E193-18: Khi tất cả đánh giá của sản phẩm đều bị ẩn (HIDDEN) -> Public trả về totalReviews=0, averageRating=0.0")
    void e193_18_whenAllReviewsHidden_PublicEndpointReturnsZeroAverageAndEmptyList() throws Exception {
        for (ProductReview r : List.of(approvedReview1, approvedReview2, violatingReview)) {
            r.setStatus(ReviewStatus.HIDDEN);
            r.setHiddenReason("Ẩn toàn bộ để kiểm tra biên");
            reviewRepository.save(r);
        }
        reviewRepository.flush();

        mockMvc.perform(get("/api/v1/products/" + productA.getId() + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.productId").value(productA.getId()))
                .andExpect(jsonPath("$.data.totalReviews").value(0))
                .andExpect(jsonPath("$.data.averageRating").value(0.0))
                .andExpect(jsonPath("$.data.reviews.content", hasSize(0)));

        // Trong khi đó Admin vẫn thấy đủ 3 đánh giá HIDDEN
        mockMvc.perform(get("/api/v1/admin/reviews")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("status", "HIDDEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(3));
    }

    @Test
    @Order(14)
    @DisplayName("E193-20: Tính nhất quán dữ liệu giữa các sản phẩm và bảo vệ quan hệ cha-con (productId - reviewId)")
    void e193_20_crossProductDataConsistencyAndParentChildIntegrity() throws Exception {
        // Tạo 1 đánh giá 5 sao cho productB
        OrderDetailResponse.OrderItemDetail itemB = new OrderDetailResponse.OrderItemDetail();
        itemB.setId(9901L);
        itemB.setProductId(productB.getId());
        itemB.setQuantity(1);

        OrderDetailResponse orderB = new OrderDetailResponse();
        orderB.setId(6601L);
        orderB.setUserId(2001L);
        orderB.setStatus("DELIVERED");
        orderB.setItems(List.of(itemB));

        when(orderClient.getOrderById(6601L, 2001L)).thenReturn(ApiResponse.success("OK", orderB));

        CreateReviewRequest reqB = new CreateReviewRequest();
        reqB.setOrderId(6601L);
        reqB.setOrderItemId(9901L);
        reqB.setRating(5);
        reqB.setComment("Tai nghe chống ồn tuyệt vời");

        mockMvc.perform(post("/api/v1/products/" + productB.getId() + "/reviews")
                        .header("X-User-Id", 2001L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reqB)))
                .andExpect(status().isCreated());

        // Ẩn đánh giá trên productA không làm ảnh hưởng tới điểm sao của productB
        ModerateReviewRequest hideReq = ModerateReviewRequest.builder()
                .status(ReviewStatus.HIDDEN)
                .reason("Ẩn trên productA")
                .build();
        mockMvc.perform(patch("/api/v1/admin/reviews/" + approvedReview1.getId() + "/moderate")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hideReq)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/products/" + productB.getId() + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalReviews").value(1))
                .andExpect(jsonPath("$.data.averageRating").value(5.0))
                .andExpect(jsonPath("$.data.reviews.content[0].comment").value("Tai nghe chống ồn tuyệt vời"));

        // Gọi DELETE với review của productA nhưng truyền URL của productB -> 400 Bad Request
        mockMvc.perform(delete("/api/v1/products/" + productB.getId() + "/reviews/" + approvedReview1.getId())
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value(
                        "Đánh giá này không thuộc về sản phẩm có ID: " + productB.getId()));
    }
}
