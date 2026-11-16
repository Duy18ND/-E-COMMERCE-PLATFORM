package com.ecommerce.product.service;

import com.ecommerce.product.client.OrderClient;
import com.ecommerce.product.client.dto.OrderDetailResponse;
import com.ecommerce.product.dto.request.CreateReviewRequest;
import com.ecommerce.product.dto.request.UpdateReviewRequest;
import com.ecommerce.product.dto.response.ApiResponse;
import com.ecommerce.product.dto.response.ReviewResponse;
import com.ecommerce.product.entity.Product;
import com.ecommerce.product.entity.ProductReview;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.enums.ReviewStatus;
import com.ecommerce.product.exception.AccessDeniedException;
import com.ecommerce.product.exception.DuplicateResourceException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.repository.ProductRepository;
import com.ecommerce.product.repository.ProductReviewRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import feign.FeignException;
import feign.Request;
import feign.Response;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-181] Bộ kiểm thử tự động QA (Integration & Concurrency Test trên H2 Database thật):
 * Tên task: [QA] Kiểm thử chống đánh giá khi chưa mua và đánh giá trùng
 * Nhóm cha: ECOM-343 – Đánh giá sau mua
 * Người phụ trách: Ngô Phương
 *
 * Phạm vi kiểm thử:
 * - Nhóm A (E181-01 -> E181-06): Chống đánh giá khi chưa mua hàng & xác minh quyền sở hữu đơn hàng/order item
 * - Nhóm B (E181-07 -> E181-12): Chống đánh giá khi đơn hàng chưa đủ điều kiện trạng thái (chỉ cho phép DELIVERED)
 * - Nhóm C (E181-13 -> E181-18): Chống đánh giá trùng, Concurrency đa luồng & Unique Constraint ở tầng Database
 * - Nhóm D (E181-19 -> E181-23): Kiểm thử dữ liệu đầu vào (rating, comment, kiểu dữ liệu, xác thực X-User-Id)
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:ecom181db;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
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
@DisplayName("ECOM-181: QA Integration & Concurrency Test - Chống đánh giá khi chưa mua và đánh giá trùng")
class ReviewEligibilityDuplicateEcom181IntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductReviewRepository reviewRepository;

    @MockBean
    private OrderClient orderClient;

    private Product purchasedProduct;
    private Product unpurchasedProduct;

    @BeforeEach
    void setUp() {
        clearInvocations(orderClient);
        reviewRepository.deleteAll();
        productRepository.deleteAll();

        purchasedProduct = productRepository.save(Product.builder()
                .name("MacBook Pro 14 M3 Pro")
                .description("Laptop chính hãng Apple VN")
                .price(new BigDecimal("49990000.00"))
                .stockQuantity(20)
                .category("Laptop")
                .status(ProductStatus.ACTIVE)
                .build());

        unpurchasedProduct = productRepository.save(Product.builder()
                .name("iPhone 16 Pro Max 256GB")
                .description("Điện thoại chính hãng VNA")
                .price(new BigDecimal("34990000.00"))
                .stockQuantity(30)
                .category("Smartphone")
                .status(ProductStatus.ACTIVE)
                .build());
    }

    private OrderDetailResponse buildOrder(Long orderId, Long ownerUserId, String status, Long itemId, Long productId) {
        OrderDetailResponse.OrderItemDetail item = new OrderDetailResponse.OrderItemDetail();
        item.setId(itemId);
        item.setProductId(productId);
        item.setQuantity(1);
        item.setPriceAtPurchase(new BigDecimal("49990000.00"));

        OrderDetailResponse order = new OrderDetailResponse();
        order.setId(orderId);
        order.setUserId(ownerUserId);
        order.setStatus(status);
        order.setItems(List.of(item));
        return order;
    }

    private FeignException buildFeignError(int httpStatus, Long orderId) {
        Request req = Request.create(Request.HttpMethod.GET, "/api/v1/orders/" + orderId,
                Map.of(), null, StandardCharsets.UTF_8, null);
        Response response = Response.builder()
                .status(httpStatus)
                .reason("Feign Error " + httpStatus)
                .request(req)
                .headers(Map.of())
                .build();
        return FeignException.errorStatus("OrderClient#getOrderById", response);
    }

    // =========================================================================
    // NHÓM A: CHỐNG ĐÁNH GIÁ KHI CHƯA MUA HÀNG & XÁC MINH QUYỀN SỞ HỮU
    // =========================================================================

    @Test
    @Order(1)
    @DisplayName("E181-01: Người dùng chưa từng mua sản phẩm không được phép đánh giá -> 404 Not Found, DB = 0")
    void e181_01_userNeverPurchasedProduct_ShouldBeRejected() throws Exception {
        Long userId = 101L;
        Long fakeOrderId = 9001L;
        when(orderClient.getOrderById(fakeOrderId, userId)).thenThrow(buildFeignError(404, fakeOrderId));

        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(fakeOrderId);
        req.setRating(5);
        req.setComment("Chưa mua nhưng cố đánh giá");

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Không tìm thấy đơn hàng với ID: " + fakeOrderId));

        assertThat(reviewRepository.count()).isZero();
    }

    @Test
    @Order(2)
    @DisplayName("E181-02: Người dùng đã mua sản phẩm khác nhưng chưa mua sản phẩm đang đánh giá -> 422 Unprocessable Entity")
    void e181_02_userPurchasedAnotherProductButNotTargetProduct_ShouldBeRejected() throws Exception {
        Long userId = 102L;
        Long orderId = 5002L;
        // Đơn hàng 5002 đã DELIVERED nhưng chỉ chứa purchasedProduct, KHÔNG chứa unpurchasedProduct
        OrderDetailResponse orderWithOtherProduct = buildOrder(
                orderId, userId, "DELIVERED", 7001L, purchasedProduct.getId());
        when(orderClient.getOrderById(orderId, userId))
                .thenReturn(ApiResponse.success("OK", orderWithOtherProduct));

        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(orderId);
        req.setRating(4);
        req.setComment("Đánh giá sản phẩm chưa từng mua bằng đơn hàng của sản phẩm khác");

        mockMvc.perform(post("/api/v1/products/" + unpurchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message").value(
                        "Đơn hàng " + orderId + " không chứa sản phẩm " + unpurchasedProduct.getId()));

        assertThat(reviewRepository.count()).isZero();
    }

    @Test
    @Order(3)
    @DisplayName("E181-03: Người dùng gửi productId không tồn tại hoặc đơn hàng rỗng items -> Từ chối 404 / 422")
    void e181_03_nonExistentProductIdOrEmptyOrderItems_ShouldBeRejected() throws Exception {
        Long userId = 103L;
        Long orderId = 5003L;
        Long nonExistentProductId = 999999L;

        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(orderId);
        req.setRating(5);
        req.setComment("Sản phẩm không tồn tại");

        // 1. Product ID không tồn tại trong DB
        mockMvc.perform(post("/api/v1/products/" + nonExistentProductId + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Không tìm thấy sản phẩm với ID: " + nonExistentProductId));

        verify(orderClient, never()).getOrderById(anyLong(), anyLong());

        // 2. Đơn hàng của user nhưng danh sách items rỗng
        OrderDetailResponse emptyOrder = new OrderDetailResponse();
        emptyOrder.setId(orderId);
        emptyOrder.setUserId(userId);
        emptyOrder.setStatus("DELIVERED");
        emptyOrder.setItems(Collections.emptyList());
        when(orderClient.getOrderById(orderId, userId)).thenReturn(ApiResponse.success("OK", emptyOrder));

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422));

        assertThat(reviewRepository.count()).isZero();
    }

    @Test
    @Order(4)
    @DisplayName("E181-04: Người dùng tự sửa userId / customerId trong request body không thể đánh giá thay người khác -> 403 Forbidden")
    void e181_04_userSpoofsCustomerIdOrUserIdInRequestBody_ShouldBeRejected403() throws Exception {
        Long attackerUserId = 104L;
        Long victimUserId = 204L;
        Long victimOrderId = 5004L;

        // Kể cả khi OrderClient trả về đơn hàng của victimUserId = 204, ReviewService vẫn đối chiếu với X-User-Id = 104
        OrderDetailResponse victimOrder = buildOrder(
                victimOrderId, victimUserId, "DELIVERED", 7004L, purchasedProduct.getId());
        when(orderClient.getOrderById(victimOrderId, attackerUserId))
                .thenReturn(ApiResponse.success("OK", victimOrder));

        String spoofedPayload = """
                {
                    "orderId": %d,
                    "orderItemId": 7004,
                    "userId": %d,
                    "customerId": %d,
                    "rating": 1,
                    "comment": "Cố tình giả mạo userId và customerId trong body"
                }
                """.formatted(victimOrderId, victimUserId, victimUserId);

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", attackerUserId)
                        .param("userId", String.valueOf(victimUserId))
                        .param("customerId", String.valueOf(victimUserId))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(spoofedPayload))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Đơn hàng không thuộc về tài khoản của bạn"));

        assertThat(reviewRepository.count()).isZero();
    }

    @Test
    @Order(5)
    @DisplayName("E181-05: Người dùng gửi orderId hoặc orderItemId không tồn tại -> Bị từ chối 404 Not Found")
    void e181_05_nonExistentOrderIdOrOrderItemId_ShouldBeRejected404() throws Exception {
        Long userId = 105L;
        Long validOrderId = 5005L;
        Long realOrderItemId = 7005L;
        Long nonExistentOrderItemId = 99999L;

        OrderDetailResponse deliveredOrder = buildOrder(
                validOrderId, userId, "DELIVERED", realOrderItemId, purchasedProduct.getId());
        when(orderClient.getOrderById(validOrderId, userId))
                .thenReturn(ApiResponse.success("OK", deliveredOrder));

        // 1. Gửi orderItemId không tồn tại trong đơn hàng
        CreateReviewRequest badItemReq = new CreateReviewRequest();
        badItemReq.setOrderId(validOrderId);
        badItemReq.setOrderItemId(nonExistentOrderItemId);
        badItemReq.setRating(5);
        badItemReq.setComment("OrderItemId không tồn tại");

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badItemReq)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value(
                        "Không tìm thấy order item với ID: " + nonExistentOrderItemId + " trong đơn hàng " + validOrderId));

        // 2. Gửi orderId <= 0
        CreateReviewRequest negativeOrderReq = new CreateReviewRequest();
        negativeOrderReq.setOrderId(-10L);
        negativeOrderReq.setRating(5);

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(negativeOrderReq)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        assertThat(reviewRepository.count()).isZero();
    }

    @Test
    @Order(6)
    @DisplayName("E181-06: Người dùng gửi đơn hàng / order item thuộc tài khoản khác (IDOR) -> Bị từ chối 403 Forbidden")
    void e181_06_orderItemBelongsToAnotherUser_ShouldBeRejected403() throws Exception {
        Long userId = 106L;
        Long otherUserOrderId = 5006L;
        when(orderClient.getOrderById(otherUserOrderId, userId)).thenThrow(buildFeignError(403, otherUserOrderId));

        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(otherUserOrderId);
        req.setOrderItemId(7006L);
        req.setRating(5);
        req.setComment("Dùng đơn hàng của tài khoản khác");

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Đơn hàng không thuộc về tài khoản của bạn"));

        assertThat(reviewRepository.count()).isZero();
    }

    // =========================================================================
    // NHÓM B: CHỐNG ĐÁNH GIÁ KHI ĐƠN HÀNG CHƯA ĐỦ ĐIỀU KIỆN TRẠNG THÁI
    // =========================================================================

    @ParameterizedTest(name = "E181-07..11: Đơn hàng ở trạng thái {0} phải bị từ chối đánh giá (422 Unprocessable Entity)")
    @ValueSource(strings = {"PENDING", "PAID", "CONFIRMED", "PROCESSING", "SHIPPING", "CANCELLED", "FAILED", "REFUNDED"})
    @Order(7)
    @DisplayName("E181-07..11: Kiểm thử toàn bộ trạng thái đơn hàng chưa giao hoặc đã hủy -> Bị từ chối 422")
    void e181_07_to_11_nonDeliveredOrderStatuses_ShouldBeRejected(String ineligibleStatus) throws Exception {
        Long userId = 200L;
        Long orderId = 6000L;
        OrderDetailResponse order = buildOrder(
                orderId, userId, ineligibleStatus, 8000L, purchasedProduct.getId());
        when(orderClient.getOrderById(orderId, userId)).thenReturn(ApiResponse.success("OK", order));

        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(orderId);
        req.setOrderItemId(8000L);
        req.setRating(5);
        req.setComment("Đánh giá khi đơn hàng đang ở trạng thái " + ineligibleStatus);

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message").value(
                        "Chỉ có thể đánh giá sản phẩm từ đơn hàng đã giao thành công (DELIVERED). Trạng thái đơn hàng hiện tại: "
                                + ineligibleStatus));

        assertThat(reviewRepository.count()).isZero();
    }

    @Test
    @Order(8)
    @DisplayName("E181-12: Đơn hàng đã giao thành công (DELIVERED) đủ điều kiện -> Tạo đánh giá thành công (201 Created)")
    void e181_12_deliveredOrder_ShouldAllowReviewAndPersistInDatabase() throws Exception {
        Long userId = 212L;
        Long orderId = 6012L;
        Long orderItemId = 8012L;
        OrderDetailResponse deliveredOrder = buildOrder(
                orderId, userId, "DELIVERED", orderItemId, purchasedProduct.getId());
        when(orderClient.getOrderById(orderId, userId)).thenReturn(ApiResponse.success("OK", deliveredOrder));

        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(orderId);
        req.setOrderItemId(orderItemId);
        req.setRating(5);
        req.setComment("  Sản phẩm đóng gói kỹ, giao hàng nhanh!  ");

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.productId").value(purchasedProduct.getId()))
                .andExpect(jsonPath("$.data.userId").value(userId))
                .andExpect(jsonPath("$.data.orderId").value(orderId))
                .andExpect(jsonPath("$.data.rating").value(5))
                .andExpect(jsonPath("$.data.comment").value("Sản phẩm đóng gói kỹ, giao hàng nhanh!"))
                .andExpect(jsonPath("$.data.status").value("APPROVED"));

        List<ProductReview> reviewsInDb = reviewRepository.findAll();
        assertThat(reviewsInDb).hasSize(1);
        ProductReview saved = reviewsInDb.get(0);
        assertThat(saved.getProductId()).isEqualTo(purchasedProduct.getId());
        assertThat(saved.getUserId()).isEqualTo(userId);
        assertThat(saved.getOrderId()).isEqualTo(orderId);
        assertThat(saved.getRating()).isEqualTo(5);
        assertThat(saved.getComment()).isEqualTo("Sản phẩm đóng gói kỹ, giao hàng nhanh!");
        assertThat(saved.getStatus()).isEqualTo(ReviewStatus.APPROVED);
    }

    // =========================================================================
    // NHÓM C: CHỐNG ĐÁNH GIÁ TRÙNG & CONCURRENCY ĐA LUỒNG THỰC TẾ
    // =========================================================================

    @Test
    @Order(9)
    @DisplayName("E181-13: Một order item chỉ được tạo 1 review; gửi lại lần thứ hai bị từ chối 409 Conflict")
    void e181_13_duplicateSequentialReviewRequest_ShouldBeRejected409() throws Exception {
        Long userId = 301L;
        Long orderId = 7001L;
        OrderDetailResponse deliveredOrder = buildOrder(
                orderId, userId, "DELIVERED", 9001L, purchasedProduct.getId());
        when(orderClient.getOrderById(orderId, userId)).thenReturn(ApiResponse.success("OK", deliveredOrder));

        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(orderId);
        req.setOrderItemId(9001L);
        req.setRating(5);
        req.setComment("Đánh giá lần 1 hợp lệ");

        // Lần 1: 201 Created
        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated());

        // Lần 2: 409 Conflict
        req.setRating(1);
        req.setComment("Cố gửi đánh giá lần 2");
        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value(
                        "Bạn đã đánh giá sản phẩm này rồi. Vui lòng chỉnh sửa đánh giá hiện có."));

        assertThat(reviewRepository.count()).isEqualTo(1L);
        ProductReview onlyReview = reviewRepository.findByProductIdAndUserId(purchasedProduct.getId(), userId).orElseThrow();
        assertThat(onlyReview.getRating()).isEqualTo(5);
        assertThat(onlyReview.getComment()).isEqualTo("Đánh giá lần 1 hợp lệ");
    }

    @Test
    @Order(10)
    @DisplayName("E181-14: Cập nhật đánh giá hiện có theo đúng quy tắc PUT updateReview và chặn người khác sửa hộ")
    void e181_14_updateExistingReviewByOwnerAndBlockNonOwner() throws Exception {
        Long ownerId = 302L;
        Long otherUserId = 999L;
        Long orderId = 7002L;
        OrderDetailResponse deliveredOrder = buildOrder(
                orderId, ownerId, "DELIVERED", 9002L, purchasedProduct.getId());
        when(orderClient.getOrderById(orderId, ownerId)).thenReturn(ApiResponse.success("OK", deliveredOrder));

        CreateReviewRequest createReq = new CreateReviewRequest();
        createReq.setOrderId(orderId);
        createReq.setRating(5);
        createReq.setComment("Đánh giá ban đầu");

        ReviewResponse created = reviewService.createReview(purchasedProduct.getId(), ownerId, createReq);

        // Người khác cố sửa đánh giá của ownerId -> 403 Forbidden
        UpdateReviewRequest hijackUpdate = UpdateReviewRequest.builder()
                .rating(1)
                .comment("Người lạ sửa trái phép")
                .build();

        mockMvc.perform(put("/api/v1/products/" + purchasedProduct.getId() + "/reviews/" + created.getId())
                        .header("X-User-Id", otherUserId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(hijackUpdate)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // Chính chủ cập nhật -> 200 OK, vẫn chỉ có 1 bản ghi trong DB
        UpdateReviewRequest ownerUpdate = UpdateReviewRequest.builder()
                .rating(4)
                .comment("  Cập nhật sau 1 tuần sử dụng  ")
                .build();

        mockMvc.perform(put("/api/v1/products/" + purchasedProduct.getId() + "/reviews/" + created.getId())
                        .header("X-User-Id", ownerId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ownerUpdate)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(created.getId()))
                .andExpect(jsonPath("$.data.rating").value(4))
                .andExpect(jsonPath("$.data.comment").value("Cập nhật sau 1 tuần sử dụng"));

        assertThat(reviewRepository.count()).isEqualTo(1L);
    }

    @Test
    @Order(11)
    @DisplayName("E181-15: Hai request đồng thời (2 luồng) tạo review cho cùng order item -> Chỉ đúng 1 bản ghi trong DB")
    void e181_15_twoConcurrentRequestsForSameOrderItem_OnlyOneReviewCreated() throws Exception {
        Long userId = 303L;
        Long orderId = 7003L;
        Long orderItemId = 9003L;
        OrderDetailResponse deliveredOrder = buildOrder(
                orderId, userId, "DELIVERED", orderItemId, purchasedProduct.getId());
        when(orderClient.getOrderById(orderId, userId)).thenReturn(ApiResponse.success("OK", deliveredOrder));

        int threadCount = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger duplicateCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            final int idx = i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    CreateReviewRequest req = new CreateReviewRequest();
                    req.setOrderId(orderId);
                    req.setOrderItemId(orderItemId);
                    req.setRating(5 - idx);
                    req.setComment("Concurrent review thread #" + idx);

                    reviewService.createReview(purchasedProduct.getId(), userId, req);
                    successCount.incrementAndGet();
                } catch (DuplicateResourceException ex) {
                    duplicateCount.incrementAndGet();
                } catch (Throwable t) {
                    unexpectedErrors.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        assertThat(readyLatch.await(5, TimeUnit.SECONDS)).isTrue();
        startLatch.countDown();
        assertThat(doneLatch.await(10, TimeUnit.SECONDS)).isTrue();
        executor.shutdownNow();

        assertThat(unexpectedErrors).isEmpty();
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(duplicateCount.get()).isEqualTo(1);
        assertThat(reviewRepository.count()).isEqualTo(1L);
    }

    @Test
    @Order(12)
    @DisplayName("E181-16: Mười request HTTP đồng thời (10 luồng) bắn trực tiếp qua API bỏ qua FE -> 1 thành công (201), 9 bị chặn (409)")
    void e181_16_tenConcurrentDirectApiRequestsBypassingFrontend_OnlyOneSucceedsWith201AndNineGet409() throws Exception {
        Long userId = 304L;
        Long orderId = 7004L;
        Long orderItemId = 9004L;
        OrderDetailResponse deliveredOrder = buildOrder(
                orderId, userId, "DELIVERED", orderItemId, purchasedProduct.getId());
        when(orderClient.getOrderById(orderId, userId)).thenReturn(ApiResponse.success("OK", deliveredOrder));

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger created201Count = new AtomicInteger(0);
        AtomicInteger conflict409Count = new AtomicInteger(0);
        List<Integer> otherStatuses = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            final int idx = i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    CreateReviewRequest req = new CreateReviewRequest();
                    req.setOrderId(orderId);
                    req.setOrderItemId(orderItemId);
                    req.setRating(5);
                    req.setComment("Direct API concurrent request #" + idx);

                    MvcResult result = mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                                    .header("X-User-Id", userId)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(req)))
                            .andReturn();

                    int status = result.getResponse().getStatus();
                    if (status == 201) {
                        created201Count.incrementAndGet();
                    } else if (status == 409) {
                        conflict409Count.incrementAndGet();
                    } else {
                        otherStatuses.add(status);
                    }
                } catch (Exception e) {
                    otherStatuses.add(-1);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        assertThat(readyLatch.await(5, TimeUnit.SECONDS)).isTrue();
        startLatch.countDown();
        assertThat(doneLatch.await(15, TimeUnit.SECONDS)).isTrue();
        executor.shutdownNow();

        assertThat(otherStatuses).isEmpty();
        assertThat(created201Count.get()).isEqualTo(1);
        assertThat(conflict409Count.get()).isEqualTo(9);
        assertThat(reviewRepository.count()).isEqualTo(1L);
    }

    @Test
    @Order(13)
    @DisplayName("E181-17: Người dùng thay đổi orderId hoặc orderItemId để lách giới hạn đánh giá -> Bị chặn 409 / 422")
    void e181_17_userChangesOrderIdOrOrderItemIdToBypassReviewLimit_ShouldBeRejected() throws Exception {
        Long userId = 305L;
        Long firstOrderId = 7005L;
        Long secondOrderId = 7006L;

        // Đơn 1 chứa cả purchasedProduct (orderItemId=9005) và unpurchasedProduct (orderItemId=9006)
        OrderDetailResponse.OrderItemDetail item1 = new OrderDetailResponse.OrderItemDetail();
        item1.setId(9005L);
        item1.setProductId(purchasedProduct.getId());
        item1.setQuantity(1);

        OrderDetailResponse.OrderItemDetail item2 = new OrderDetailResponse.OrderItemDetail();
        item2.setId(9006L);
        item2.setProductId(unpurchasedProduct.getId());
        item2.setQuantity(1);

        OrderDetailResponse order1 = new OrderDetailResponse();
        order1.setId(firstOrderId);
        order1.setUserId(userId);
        order1.setStatus("DELIVERED");
        order1.setItems(List.of(item1, item2));

        OrderDetailResponse order2 = buildOrder(
                secondOrderId, userId, "DELIVERED", 9007L, purchasedProduct.getId());

        when(orderClient.getOrderById(firstOrderId, userId)).thenReturn(ApiResponse.success("OK", order1));
        when(orderClient.getOrderById(secondOrderId, userId)).thenReturn(ApiResponse.success("OK", order2));

        // 1. User gửi orderItemId=9006 (thuộc unpurchasedProduct) nhưng URL là purchasedProduct -> 422 Unprocessable Entity
        CreateReviewRequest mismatchedItemReq = new CreateReviewRequest();
        mismatchedItemReq.setOrderId(firstOrderId);
        mismatchedItemReq.setOrderItemId(9006L);
        mismatchedItemReq.setRating(5);
        mismatchedItemReq.setComment("Gửi orderItemId của sản phẩm khác");

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(mismatchedItemReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422));

        // 2. Tạo đánh giá hợp lệ với orderItemId=9005 -> 201 Created
        CreateReviewRequest validReq = new CreateReviewRequest();
        validReq.setOrderId(firstOrderId);
        validReq.setOrderItemId(9005L);
        validReq.setRating(5);
        validReq.setComment("Đánh giá hợp lệ lần 1");

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated());

        // 3. Cố tình đổi sang secondOrderId và orderItemId=9007 để tạo review thứ 2 cho cùng purchasedProduct -> 409 Conflict
        CreateReviewRequest bypassAttempt = new CreateReviewRequest();
        bypassAttempt.setOrderId(secondOrderId);
        bypassAttempt.setOrderItemId(9007L);
        bypassAttempt.setRating(4);
        bypassAttempt.setComment("Đổi orderId và orderItemId để lách giới hạn");

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(bypassAttempt)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        assertThat(reviewRepository.count()).isEqualTo(1L);
    }

    @Test
    @Order(14)
    @DisplayName("E181-18: Kiểm tra trực tiếp Unique Constraint uq_review_product_user ở tầng Database")
    void e181_18_databaseUniqueConstraint_ShouldBlockDuplicateProductUserInsert() {
        Long userId = 306L;

        ProductReview first = ProductReview.builder()
                .productId(purchasedProduct.getId())
                .userId(userId)
                .orderId(7010L)
                .rating(5)
                .comment("Bản ghi thứ nhất")
                .status(ReviewStatus.APPROVED)
                .build();
        reviewRepository.saveAndFlush(first);

        ProductReview duplicate = ProductReview.builder()
                .productId(purchasedProduct.getId())
                .userId(userId)
                .orderId(7011L)
                .rating(3)
                .comment("Bản ghi trùng (product_id, user_id)")
                .status(ReviewStatus.APPROVED)
                .build();

        assertThrows(DataIntegrityViolationException.class, () -> reviewRepository.saveAndFlush(duplicate));
    }

    // =========================================================================
    // NHÓM D: KIỂM THỬ DỮ LIỆU ĐẦU VÀO & XÁC THỰC
    // =========================================================================

    @Test
    @Order(15)
    @DisplayName("E181-19: Thiếu orderId trong body hoặc productId trên URL sai kiểu -> 400 Bad Request")
    void e181_19_missingOrderIdOrInvalidProductIdPath_ShouldReturn400() throws Exception {
        // 1. Thiếu orderId (orderId = null)
        CreateReviewRequest missingOrderReq = new CreateReviewRequest();
        missingOrderReq.setRating(5);
        missingOrderReq.setComment("Không có orderId");

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", 401L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(missingOrderReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors.orderId").value("orderId không được để trống"));

        // 2. productId trên URL không phải số
        mockMvc.perform(post("/api/v1/products/not-a-number/reviews")
                        .header("X-User-Id", 401L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderId\": 500, \"rating\": 5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertThat(reviewRepository.count()).isZero();
    }

    @ParameterizedTest(name = "E181-20: Rating không hợp lệ ({0}) -> 400 Bad Request")
    @ValueSource(ints = {-5, 0, 6, 10})
    @Order(16)
    @DisplayName("E181-20: Rating nhỏ hơn 1 hoặc lớn hơn 5 hoặc null -> 400 Bad Request")
    void e181_20_invalidRatingOutOfRangeOrNull_ShouldReturn400(int invalidRating) throws Exception {
        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(500L);
        req.setRating(invalidRating);
        req.setComment("Rating ngoài biên");

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", 402L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors.rating").exists());

        // Rating = null
        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", 402L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderId\": 500, \"comment\": \"Thiếu rating\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.rating").value("rating không được để trống"));

        assertThat(reviewRepository.count()).isZero();
    }

    @Test
    @Order(17)
    @DisplayName("E181-21: Nội dung comment vượt quá 2000 ký tự bị chặn 400; comment rỗng được chấp nhận theo thiết kế")
    void e181_21_commentExceeding2000CharsRejectedAndEmptyCommentAllowed() throws Exception {
        Long userId = 403L;
        Long orderId = 8003L;

        // 1. Comment 2001 ký tự -> 400 Bad Request
        CreateReviewRequest tooLongReq = new CreateReviewRequest();
        tooLongReq.setOrderId(orderId);
        tooLongReq.setRating(5);
        tooLongReq.setComment("A".repeat(2001));

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(tooLongReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.errors.comment").value("Bình luận không được vượt quá 2000 ký tự"));

        assertThat(reviewRepository.count()).isZero();

        // 2. Comment null/rỗng hợp lệ theo nghiệp vụ (chỉ chấm sao) -> 201 Created
        OrderDetailResponse deliveredOrder = buildOrder(
                orderId, userId, "DELIVERED", 9503L, purchasedProduct.getId());
        when(orderClient.getOrderById(orderId, userId)).thenReturn(ApiResponse.success("OK", deliveredOrder));

        CreateReviewRequest ratingOnlyReq = new CreateReviewRequest();
        ratingOnlyReq.setOrderId(orderId);
        ratingOnlyReq.setRating(5);
        ratingOnlyReq.setComment(null);

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", userId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ratingOnlyReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.rating").value(5))
                .andExpect(jsonPath("$.data.comment").isEmpty());

        assertThat(reviewRepository.count()).isEqualTo(1L);
    }

    @Test
    @Order(18)
    @DisplayName("E181-22: Dữ liệu sai kiểu hoặc JSON sai cú pháp -> 400 Bad Request")
    void e181_22_wrongDataTypesOrMalformedJson_ShouldReturn400() throws Exception {
        // 1. Sai kiểu dữ liệu trong JSON
        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", 404L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderId\": \"abc\", \"rating\": \"five\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Tham số hoặc định dạng dữ liệu gửi lên không hợp lệ"));

        // 2. Sai kiểu dữ liệu ở header X-User-Id
        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", "invalid-user-id")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderId\": 500, \"rating\": 5}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        assertThat(reviewRepository.count()).isZero();
    }

    @Test
    @Order(19)
    @DisplayName("E181-23: Request không có X-User-Id hoặc X-User-Id <= 0 -> 403 Forbidden")
    void e181_23_missingOrNonPositiveUserIdHeader_ShouldReturn403() throws Exception {
        CreateReviewRequest req = new CreateReviewRequest();
        req.setOrderId(500L);
        req.setRating(5);
        req.setComment("Không có xác thực");

        // 1. Không có header X-User-Id
        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // 2. X-User-Id = 0 hoặc âm
        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", 0L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        mockMvc.perform(post("/api/v1/products/" + purchasedProduct.getId() + "/reviews")
                        .header("X-User-Id", -5L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        assertThrows(AccessDeniedException.class,
                () -> reviewService.createReview(purchasedProduct.getId(), 0L, req));

        assertThat(reviewRepository.count()).isZero();
    }
}
