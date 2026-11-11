package com.ecommerce.order.service;

import com.ecommerce.order.client.AuthClient;
import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.ProductResponse;
import com.ecommerce.order.dto.request.ApplyVoucherRequest;
import com.ecommerce.order.dto.request.CheckoutItemRequest;
import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.request.VoucherRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.ApplyVoucherResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.dto.response.VoucherResponse;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.Voucher;
import com.ecommerce.order.entity.VoucherUsage;
import com.ecommerce.order.enums.DiscountType;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.enums.PaymentMethod;
import com.ecommerce.order.enums.VoucherStatus;
import com.ecommerce.order.enums.VoucherUsageStatus;
import com.ecommerce.order.event.PaymentFailedEvent;
import com.ecommerce.order.exception.NotEnoughStockException;
import com.ecommerce.order.producer.KafkaOrderProducer;
import com.ecommerce.order.repository.CartRepository;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.repository.OrderStatusHistoryRepository;
import com.ecommerce.order.repository.VoucherRepository;
import com.ecommerce.order.repository.VoucherUsageRepository;
import com.ecommerce.order.service.impl.VoucherServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-185] Automated Integration & Concurrency QA Test Suite
 * Phạm vi:
 *  - Nhóm A (E185-01 -> E185-06): Giới hạn tổng lượt sử dụng (quantity / usedQuantity)
 *  - Nhóm B (E185-07 -> E185-12): Giới hạn lượt sử dụng theo người dùng (voucher_usages) & xác thực/IDOR
 *  - Nhóm C (Concurrency & Transaction Rollback): Đa luồng thực sự (ExecutorService + CountDownLatch) trên H2 Database thật
 *  - Nhóm D (E185-13 -> E185-18): Xử lý hoàn lượt sử dụng Voucher khi đơn hàng bị hủy / lỗi giữa chừng / hủy lặp
 *
 * PIC: Ngô Phương (QA)
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:ecom185db;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.datasource.driverClassName=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "eureka.client.enabled=false",
        "spring.cloud.OpenFeign.CircuitBreaker.enabled=false"
})
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class VoucherConcurrencyEcom185IntegrationTest {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate FIXED_TODAY = LocalDate.of(2026, 11, 10);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private Validator validator;

    @Autowired
    private VoucherServiceImpl voucherService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private VoucherRepository voucherRepository;

    @Autowired
    private VoucherUsageRepository voucherUsageRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    @Autowired
    private CartRepository cartRepository;

    @MockBean
    private ProductClient productClient;

    @MockBean
    private AuthClient authClient;

    @MockBean
    private KafkaOrderProducer kafkaOrderProducer;

    private ProductResponse standardProduct;

    @BeforeEach
    void setUp() {
        voucherService.setClock(Clock.fixed(Instant.parse("2026-11-10T03:00:00Z"), VIETNAM_ZONE));

        orderStatusHistoryRepository.deleteAll();
        voucherUsageRepository.deleteAll();
        orderRepository.deleteAll();
        cartRepository.deleteAll();
        voucherRepository.deleteAll();

        clearInvocations(productClient, authClient, kafkaOrderProducer);

        standardProduct = ProductResponse.builder()
                .id(501L)
                .name("Bàn phím cơ không dây Keychron K8 Pro")
                .price(new BigDecimal("600000.00"))
                .stockQuantity(500)
                .build();

        when(productClient.getProductById(501L)).thenReturn(ApiResponse.success(standardProduct));
        when(productClient.reserveStock(any())).thenReturn(ApiResponse.success("Reserved", null));
        when(productClient.restoreStock(any())).thenReturn(ApiResponse.success("Restored", null));
        doNothing().when(kafkaOrderProducer).sendOrderCreatedEvent(any());
    }

    private Voucher createAndSaveVoucher(String code, int quantity, int usedQuantity) {
        Voucher v = Voucher.builder()
                .code(code)
                .name("Voucher QA " + code)
                .description("Test ECOM-185 " + code)
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000.00"))
                .minOrderValue(new BigDecimal("500000.00"))
                .quantity(quantity)
                .usedQuantity(usedQuantity)
                .startDate(FIXED_TODAY.minusDays(5))
                .endDate(FIXED_TODAY.plusDays(10))
                .status(VoucherStatus.ACTIVE)
                .build();
        return voucherRepository.saveAndFlush(v);
    }

    private CheckoutRequest buildCheckoutRequest(Long userId, String voucherCode) {
        return CheckoutRequest.builder()
                .userId(userId)
                .receiverName("Khách hàng #" + userId)
                .receiverPhone("0912345678")
                .shippingAddress("123 Nguyễn Trãi, Hà Nội")
                .paymentMethod(PaymentMethod.COD)
                .voucherCode(voucherCode)
                .items(List.of(CheckoutItemRequest.builder()
                        .productId(501L)
                        .productName("Bàn phím cơ")
                        .quantity(1)
                        .priceAtPurchase(new BigDecimal("600000.00"))
                        .build()))
                .build();
    }

    // =========================================================================
    // 3. TEST CASE A – GIỚI HẠN TỔNG LƯỢT SỬ DỤNG (E185-01 -> E185-06)
    // =========================================================================

    @Test
    @org.junit.jupiter.api.Order(1)
    @DisplayName("E185-01: Voucher chưa được sử dụng (usedQuantity = 0/5) -> Được sử dụng và cập nhật DB chính xác")
    void e185_01_unusedVoucher_ShouldSucceedAndIncrementDatabaseCount() {
        Voucher saved = createAndSaveVoucher("E185_UNUSED", 5, 0);

        // Xác minh DB trước khi test
        Voucher before = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(before.getUsedQuantity()).isEqualTo(0);
        assertThat(voucherUsageRepository.count()).isEqualTo(0);

        // Thực hiện đặt hàng kèm Voucher
        OrderResponse order = orderService.checkout(buildCheckoutRequest(101L, "E185_UNUSED"));

        assertThat(order.getVoucherCode()).isEqualTo("E185_UNUSED");
        assertThat(order.getDiscountAmount()).isEqualByComparingTo("50000.00");
        assertThat(order.getTotalAmount()).isEqualByComparingTo("550000.00");

        // Xác minh DB sau khi test
        Voucher after = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isEqualTo(1);

        List<VoucherUsage> usages = voucherUsageRepository.findAll();
        assertThat(usages).hasSize(1);
        assertThat(usages.get(0).getUserId()).isEqualTo(101L);
        assertThat(usages.get(0).getOrderId()).isEqualTo(order.getId());
        assertThat(usages.get(0).getStatus()).isEqualTo(VoucherUsageStatus.APPLIED);
    }

    @Test
    @org.junit.jupiter.api.Order(2)
    @DisplayName("E185-02: Voucher còn đúng 1 lượt (usedQuantity = 4/5) -> Yêu cầu hợp lệ cuối cùng được chấp nhận (5/5)")
    void e185_02_oneSlotRemaining_LastValidRequestShouldBeAccepted() {
        Voucher saved = createAndSaveVoucher("E185_LAST_ONE", 5, 4);

        // DB trước khi test: 4/5
        Voucher before = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(before.getUsedQuantity()).isEqualTo(4);

        OrderResponse order = orderService.checkout(buildCheckoutRequest(102L, "E185_LAST_ONE"));

        assertThat(order.getId()).isNotNull();
        assertThat(order.getDiscountAmount()).isEqualByComparingTo("50000.00");

        // DB sau khi test: chạm đúng trần 5/5
        Voucher after = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isEqualTo(5);
        assertThat(after.getUsedQuantity()).isEqualTo(after.getQuantity());
        assertThat(voucherUsageRepository.existsByVoucherCodeIgnoreCaseAndUserIdAndStatus(
                "E185_LAST_ONE", 102L, VoucherUsageStatus.APPLIED)).isTrue();
    }

    @Test
    @org.junit.jupiter.api.Order(3)
    @DisplayName("E185-03: Voucher đã đạt giới hạn tổng (usedQuantity = 5/5) -> Từ chối sử dụng ở cả applyVoucher và checkout")
    void e185_03_reachedTotalLimit_ShouldRejectBothApplyAndCheckout() {
        Voucher saved = createAndSaveVoucher("E185_EXHAUSTED", 5, 5);

        // 1. Kiểm tra bước applyVoucher
        ApplyVoucherRequest applyReq = new ApplyVoucherRequest("E185_EXHAUSTED", new BigDecimal("600000.00"), 103L);
        IllegalStateException applyEx = assertThrows(IllegalStateException.class,
                () -> voucherService.applyVoucher(applyReq));
        assertThat(applyEx.getMessage()).isEqualTo("Mã giảm giá đã hết lượt sử dụng.");

        // 2. Kiểm tra bước checkout
        IllegalStateException checkoutEx = assertThrows(IllegalStateException.class,
                () -> orderService.checkout(buildCheckoutRequest(103L, "E185_EXHAUSTED")));
        assertThat(checkoutEx.getMessage()).contains("hết lượt sử dụng");

        // DB sau khi test: usedQuantity vẫn là 5, không có đơn hàng hay voucher_usages nào được tạo
        Voucher after = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isEqualTo(5);
        assertThat(voucherUsageRepository.count()).isZero();
        assertThat(orderRepository.count()).isZero();
    }

    @Test
    @org.junit.jupiter.api.Order(4)
    @DisplayName("E185-04: Hai yêu cầu đồng thời cùng tranh lượt sử dụng cuối (4/5) -> Đúng 1 thành công, 1 thất bại, không vượt giới hạn")
    void e185_04_twoConcurrentRequestsForLastSlot_OnlyOneSucceedsOnRealDatabase() throws InterruptedException {
        Voucher saved = createAndSaveVoucher("E185_RACE_LAST", 5, 4);

        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            final long userId = 200L + i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    orderService.checkout(buildCheckoutRequest(userId, "E185_RACE_LAST"));
                    successCount.incrementAndGet();
                } catch (IllegalStateException ex) {
                    failCount.incrementAndGet();
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
        assertThat(failCount.get()).isEqualTo(1);

        // Xác minh DB: usedQuantity == 5 (không bao giờ lên 6), đúng 1 bản ghi APPLIED mới và đúng 1 Order
        Voucher after = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isEqualTo(5);
        assertThat(voucherUsageRepository.findAll()).hasSize(1);
        assertThat(orderRepository.findAll()).hasSize(1);
    }

    @Test
    @org.junit.jupiter.api.Order(5)
    @DisplayName("E185-05: 12 người dùng đồng thời cùng đặt hàng với Voucher chỉ có 3 lượt (0/3) -> Đúng 3 thành công, 9 bị chặn, DB usedQuantity = 3")
    void e185_05_twelveConcurrentUsersForThreeSlots_NeverExceedsTotalLimit() throws InterruptedException {
        Voucher saved = createAndSaveVoucher("E185_LIMIT_3", 3, 0);

        int threads = 12;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger rejectedCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            final long userId = 300L + i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    orderService.checkout(buildCheckoutRequest(userId, "E185_LIMIT_3"));
                    successCount.incrementAndGet();
                } catch (IllegalStateException ex) {
                    rejectedCount.incrementAndGet();
                } catch (Throwable t) {
                    unexpectedErrors.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        assertThat(readyLatch.await(5, TimeUnit.SECONDS)).isTrue();
        startLatch.countDown();
        assertThat(doneLatch.await(15, TimeUnit.SECONDS)).isTrue();
        executor.shutdownNow();

        assertThat(unexpectedErrors).isEmpty();
        assertThat(successCount.get()).isEqualTo(3);
        assertThat(rejectedCount.get()).isEqualTo(9);

        // Kiểm tra dữ liệu thực tế trong DB: không vượt quá 3, không có lost update
        Voucher after = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isEqualTo(3);

        List<VoucherUsage> usages = voucherUsageRepository.findAll();
        assertThat(usages).hasSize(3);
        assertThat(usages).allMatch(u -> u.getStatus() == VoucherUsageStatus.APPLIED);
        assertThat(orderRepository.count()).isEqualTo(3);
    }

    @Test
    @org.junit.jupiter.api.Order(6)
    @DisplayName("E185-06: Chính sách cấu hình giới hạn tổng -> Bắt buộc quantity >= 1 (từ chối null/0/âm) và hỗ trợ cấu hình hạn mức trần lớn")
    void e185_06_noUnlimitedFlagPolicy_RequiresPositiveQuantityAndSupportsHighCeiling() {
        // 1. Cấu hình không truyền quantity (null) hoặc quantity = 0 -> bị từ chối theo thiết kế hiện tại (@NotNull, @Min(1))
        VoucherRequest nullQuantityReq = VoucherRequest.builder()
                .code("NO_LIMIT_NULL")
                .name("Thiếu quantity")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("30000.00"))
                .quantity(null)
                .startDate(FIXED_TODAY)
                .endDate(FIXED_TODAY.plusDays(10))
                .build();
        Set<ConstraintViolation<VoucherRequest>> nullViolations = validator.validate(nullQuantityReq);
        assertThat(nullViolations).isNotEmpty();

        VoucherRequest zeroQuantityReq = VoucherRequest.builder()
                .code("NO_LIMIT_ZERO")
                .name("Quantity bằng 0")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("30000.00"))
                .quantity(0)
                .startDate(FIXED_TODAY)
                .endDate(FIXED_TODAY.plusDays(10))
                .build();
        Set<ConstraintViolation<VoucherRequest>> zeroViolations = validator.validate(zeroQuantityReq);
        assertThat(zeroViolations).isNotEmpty();

        // 2. Cấu hình hạn mức trần lớn (high-ceiling campaign, ví dụ 1.000.000 lượt) -> Tạo và áp dụng thành công
        VoucherRequest highCeilingReq = VoucherRequest.builder()
                .code("MEGA_CAMPAIGN")
                .name("Chiến dịch 1 triệu lượt")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000.00"))
                .minOrderValue(new BigDecimal("500000.00"))
                .quantity(1_000_000)
                .startDate(FIXED_TODAY)
                .endDate(FIXED_TODAY.plusDays(30))
                .status(VoucherStatus.ACTIVE)
                .build();
        VoucherResponse created = voucherService.createVoucher(highCeilingReq);
        assertThat(created.getQuantity()).isEqualTo(1_000_000);
        assertThat(created.getUsedQuantity()).isEqualTo(0);

        OrderResponse order = orderService.checkout(buildCheckoutRequest(106L, "MEGA_CAMPAIGN"));
        assertThat(order.getDiscountAmount()).isEqualByComparingTo("50000.00");

        Voucher after = voucherRepository.findById(created.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isEqualTo(1);
    }

    // =========================================================================
    // 4. TEST CASE B – GIỚI HẠN THEO NGƯỜI DÙNG (E185-07 -> E185-12)
    // =========================================================================

    @Test
    @org.junit.jupiter.api.Order(7)
    @DisplayName("E185-07: User chưa sử dụng Voucher -> Được phép kiểm tra áp mã và đặt hàng thành công")
    void e185_07_userHasNotUsedVoucher_ShouldBeAllowed() {
        createAndSaveVoucher("E185_USER_FIRST", 10, 0);

        // Kiểm tra trước qua applyVoucher
        ApplyVoucherResponse preview = voucherService.applyVoucher(
                new ApplyVoucherRequest("E185_USER_FIRST", new BigDecimal("600000.00"), 501L));
        assertThat(preview.getDiscountAmount()).isEqualByComparingTo("50000.00");

        // Đặt hàng thật
        OrderResponse order = orderService.checkout(buildCheckoutRequest(501L, "E185_USER_FIRST"));
        assertThat(order.getVoucherCode()).isEqualTo("E185_USER_FIRST");

        assertThat(voucherUsageRepository.existsByVoucherCodeIgnoreCaseAndUserIdAndStatus(
                "E185_USER_FIRST", 501L, VoucherUsageStatus.APPLIED)).isTrue();
    }

    @Test
    @org.junit.jupiter.api.Order(8)
    @DisplayName("E185-08: User đã sử dụng đủ giới hạn cá nhân (1 lượt APPLIED) -> Bị từ chối ở cả applyVoucher, checkout và lọc khỏi danh sách khả dụng")
    void e185_08_userAlreadyUsedVoucher_ShouldBeRejectedAndFilteredOut() {
        Voucher saved = createAndSaveVoucher("E185_USER_USED", 10, 0);

        // Lần 1: User 502 đặt hàng thành công
        orderService.checkout(buildCheckoutRequest(502L, "E185_USER_USED"));
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(1);

        // Lần 2: Cùng User 502 gọi applyVoucher -> Bị từ chối
        IllegalStateException applyEx = assertThrows(IllegalStateException.class,
                () -> voucherService.applyVoucher(
                        new ApplyVoucherRequest("E185_USER_USED", new BigDecimal("600000.00"), 502L)));
        assertThat(applyEx.getMessage()).isEqualTo("Bạn đã sử dụng mã giảm giá này rồi.");

        // Lần 2: Cùng User 502 gọi checkout -> Bị từ chối
        IllegalStateException checkoutEx = assertThrows(IllegalStateException.class,
                () -> orderService.checkout(buildCheckoutRequest(502L, "E185_USER_USED")));
        assertThat(checkoutEx.getMessage()).isEqualTo("Bạn đã sử dụng mã giảm giá này rồi.");

        // Danh sách voucher khả dụng cho User 502 không còn chứa mã E185_USER_USED
        List<VoucherResponse> availableFor502 = voucherService.getAvailableVouchersForUser(502L);
        assertThat(availableFor502).noneMatch(v -> "E185_USER_USED".equals(v.getCode()));

        // DB: usedQuantity vẫn giữ nguyên 1, chỉ có 1 bản ghi APPLIED
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(1);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(502L, VoucherUsageStatus.APPLIED)).hasSize(1);
    }

    @Test
    @org.junit.jupiter.api.Order(9)
    @DisplayName("E185-09: User khác chưa sử dụng Voucher (khi vẫn còn tổng lượt) -> Được sử dụng bình thường")
    void e185_09_differentUserWhoHasNotUsedVoucher_ShouldBeAllowed() {
        Voucher saved = createAndSaveVoucher("E185_DIFF_USER", 10, 0);

        // User 601 đã dùng
        orderService.checkout(buildCheckoutRequest(601L, "E185_DIFF_USER"));

        // User 602 chưa dùng -> Vẫn thấy trong danh sách khả dụng và đặt hàng thành công
        List<VoucherResponse> availableFor602 = voucherService.getAvailableVouchersForUser(602L);
        assertThat(availableFor602).anyMatch(v -> "E185_DIFF_USER".equals(v.getCode()));

        OrderResponse order602 = orderService.checkout(buildCheckoutRequest(602L, "E185_DIFF_USER"));
        assertThat(order602.getDiscountAmount()).isEqualByComparingTo("50000.00");

        Voucher after = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isEqualTo(2);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(601L, VoucherUsageStatus.APPLIED)).hasSize(1);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(602L, VoucherUsageStatus.APPLIED)).hasSize(1);
    }

    @Test
    @org.junit.jupiter.api.Order(10)
    @DisplayName("E185-10: Cùng một User gửi 8 request đặt hàng đồng thời -> Chỉ đúng 1 request thành công, không vượt giới hạn cá nhân")
    void e185_10_sameUserSendsMultipleConcurrentRequests_OnlyOneSucceeds() throws InterruptedException {
        Voucher saved = createAndSaveVoucher("E185_SAME_USER_CONC", 20, 0);
        final Long sameUserId = 777L;

        int threads = 8;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger duplicateBlockedCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    orderService.checkout(buildCheckoutRequest(sameUserId, "E185_SAME_USER_CONC"));
                    successCount.incrementAndGet();
                } catch (IllegalStateException ex) {
                    if (ex.getMessage() != null && ex.getMessage().contains("đã sử dụng mã giảm giá này rồi")) {
                        duplicateBlockedCount.incrementAndGet();
                    } else {
                        unexpectedErrors.add(ex);
                    }
                } catch (Throwable t) {
                    unexpectedErrors.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        assertThat(readyLatch.await(5, TimeUnit.SECONDS)).isTrue();
        startLatch.countDown();
        assertThat(doneLatch.await(15, TimeUnit.SECONDS)).isTrue();
        executor.shutdownNow();

        assertThat(unexpectedErrors).isEmpty();
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(duplicateBlockedCount.get()).isEqualTo(7);

        // Xác minh DB: usedQuantity chỉ tăng 1 (không tăng 8), chỉ có đúng 1 bản ghi APPLIED cho user 777L
        Voucher after = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isEqualTo(1);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(sameUserId, VoucherUsageStatus.APPLIED)).hasSize(1);
        assertThat(orderRepository.findAll()).hasSize(1);
    }

    @Test
    @org.junit.jupiter.api.Order(11)
    @DisplayName("E185-11: User gửi token không hợp lệ (Authorization Bearer giả mạo không qua Gateway hoặc X-User-Id <= 0) -> Bị từ chối 403 Forbidden")
    void e185_11_invalidTokenOrInvalidHeaderUserId_ShouldBeRejected403() throws Exception {
        Voucher saved = createAndSaveVoucher("E185_AUTH_CHECK", 10, 0);

        ApplyVoucherRequest applyReq = new ApplyVoucherRequest("E185_AUTH_CHECK", new BigDecimal("600000.00"), 800L);

        // 1. Gửi Authorization: Bearer invalid-jwt-token trực tiếp mà không có X-User-Id hợp lệ từ Gateway
        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .header("Authorization", "Bearer invalid.forged.token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(applyReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        // 2. Gửi X-User-Id không hợp lệ (<= 0) vào /api/v1/vouchers/apply
        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .header("X-User-Id", -5L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(applyReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        // 3. Gửi Authorization: Bearer invalid-jwt-token vào /api/v1/orders/checkout (dù cố truyền userId trong body)
        CheckoutRequest checkoutReq = buildCheckoutRequest(800L, "E185_AUTH_CHECK");
        mockMvc.perform(post("/api/v1/orders/checkout")
                        .header("Authorization", "Bearer invalid.forged.token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkoutReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        // DB: Không có bất kỳ lượt sử dụng nào bị trừ
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isZero();
        assertThat(voucherUsageRepository.count()).isZero();
    }

    @Test
    @org.junit.jupiter.api.Order(12)
    @DisplayName("E185-12: User cố mạo danh userId của người khác trong body hoặc hủy đơn của người khác (IDOR) -> Backend ghi đè theo X-User-Id và từ chối")
    void e185_12_userAttemptsToSpoofAnotherUsersIdentityOrCancelOthersOrder_ShouldBeRejected() throws Exception {
        Voucher saved = createAndSaveVoucher("E185_ANTI_SPOOF", 10, 0);

        // User 801 đặt hàng hợp lệ lần 1 -> Đã hết lượt cá nhân của User 801
        OrderResponse orderOf801 = orderService.checkout(buildCheckoutRequest(801L, "E185_ANTI_SPOOF"));
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(1);

        // 1. User 801 cố tình gửi userId = 802 (người chưa dùng mã) trong body của POST /api/v1/vouchers/apply
        //    nhưng header xác thực là X-User-Id: 801 -> Backend phải kiểm tra theo 801 và từ chối!
        ApplyVoucherRequest spoofedApply = new ApplyVoucherRequest("E185_ANTI_SPOOF", new BigDecimal("600000.00"), 802L);
        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .header("X-User-Id", 801L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(spoofedApply)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Bạn đã sử dụng mã giảm giá này rồi."));

        // 2. User 801 cố tình gửi userId = 802 trong body của POST /api/v1/orders/checkout
        //    nhưng header xác thực là X-User-Id: 801 -> Backend ghi đè bằng 801 và chặn dùng trùng!
        CheckoutRequest spoofedCheckout = buildCheckoutRequest(802L, "E185_ANTI_SPOOF");
        mockMvc.perform(post("/api/v1/orders/checkout")
                        .header("X-User-Id", 801L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(spoofedCheckout)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Bạn đã sử dụng mã giảm giá này rồi."));

        // 3. User 802 cố tình gọi PUT /api/v1/orders/{id}/cancel để hủy đơn hàng của User 801 trái phép (IDOR) -> 403 Forbidden
        mockMvc.perform(put("/api/v1/orders/" + orderOf801.getId() + "/cancel")
                        .header("X-User-Id", 802L))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Bạn không có quyền hủy đơn hàng này"));

        // DB vẫn bảo toàn: usedQuantity = 1, đơn hàng của 801 vẫn PENDING
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(1);
        assertThat(orderRepository.findById(orderOf801.getId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.PENDING);
    }

    // =========================================================================
    // 5. TEST CASE C – CONCURRENCY TỔNG HỢP & TRANSACTION ROLLBACK
    // =========================================================================

    @Test
    @org.junit.jupiter.api.Order(13)
    @DisplayName("E185-C1: Concurrency hỗn hợp (6 user x 2 request đồng thời = 12 luồng tranh Voucher 4 lượt) -> Đảm bảo cả tổng lượt lẫn lượt cá nhân và nhất quán DB")
    void e185_c1_mixedMultiUserAndDuplicateUserConcurrency_DatabaseRemainsConsistent() throws InterruptedException {
        Voucher saved = createAndSaveVoucher("E185_MIXED_CONC", 4, 0);

        int distinctUsers = 6;
        int requestsPerUser = 2;
        int totalThreads = distinctUsers * requestsPerUser;

        ExecutorService executor = Executors.newFixedThreadPool(totalThreads);
        CountDownLatch readyLatch = new CountDownLatch(totalThreads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(totalThreads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        for (int u = 0; u < distinctUsers; u++) {
            final long userId = 900L + u;
            for (int r = 0; r < requestsPerUser; r++) {
                executor.submit(() -> {
                    readyLatch.countDown();
                    try {
                        startLatch.await();
                        orderService.checkout(buildCheckoutRequest(userId, "E185_MIXED_CONC"));
                        successCount.incrementAndGet();
                    } catch (IllegalStateException ex) {
                        failureCount.incrementAndGet();
                    } catch (Throwable t) {
                        unexpectedErrors.add(t);
                    } finally {
                        doneLatch.countDown();
                    }
                });
            }
        }

        assertThat(readyLatch.await(5, TimeUnit.SECONDS)).isTrue();
        startLatch.countDown();
        assertThat(doneLatch.await(15, TimeUnit.SECONDS)).isTrue();
        executor.shutdownNow();

        assertThat(unexpectedErrors).isEmpty();
        // Đúng 4 đơn thành công, 8 request bị từ chối (do trùng user hoặc hết lượt)
        assertThat(successCount.get()).isEqualTo(4);
        assertThat(failureCount.get()).isEqualTo(8);

        // Xác minh 7 tiêu chí Concurrency trong DB:
        Voucher after = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isEqualTo(4); // 1. Không vượt usageLimit = 4

        List<VoucherUsage> usages = voucherUsageRepository.findAll();
        assertThat(usages).hasSize(4); // 4 & 5. Không lost update, khớp đúng usedQuantity

        long distinctSuccessfulUsers = usages.stream().map(VoucherUsage::getUserId).distinct().count();
        assertThat(distinctSuccessfulUsers).isEqualTo(4); // 2 & 3. Mỗi user tối đa 1 bản ghi APPLIED, không trùng
        assertThat(orderRepository.count()).isEqualTo(4); // 7. Số Order khớp tuyệt đối với VoucherUsage và usedQuantity
    }

    @Test
    @org.junit.jupiter.api.Order(14)
    @DisplayName("E185-C2: Transaction Rollback khi đặt hàng thất bại ở bước trừ kho -> Lượt sử dụng Voucher vừa tăng nguyên tử được rollback về 0")
    void e185_c2_checkoutFailsAtStockReservation_ShouldRollbackVoucherUsedQuantity() {
        Voucher saved = createAndSaveVoucher("E185_TX_ROLLBACK", 5, 0);

        // Giả lập ProductService ném lỗi hết hàng SAU KHI voucherService.redeemVoucherForOrder đã chạy
        when(productClient.reserveStock(any()))
                .thenThrow(new NotEnoughStockException("Sản phẩm tạm hết hàng trong kho"));

        assertThrows(NotEnoughStockException.class,
                () -> orderService.checkout(buildCheckoutRequest(950L, "E185_TX_ROLLBACK")));

        // Xác minh Transaction Rollback: usedQuantity vẫn bằng 0, không có bản ghi voucher_usages, không lưu Order
        Voucher after = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isZero();
        assertThat(voucherUsageRepository.count()).isZero();
        assertThat(orderRepository.count()).isZero();
    }

    // =========================================================================
    // 6. TEST CASE D – ĐƠN HÀNG BỊ HỦY (E185-13 -> E185-18)
    // =========================================================================

    @Test
    @org.junit.jupiter.api.Order(15)
    @DisplayName("E185-13: Đơn hàng chưa thanh toán (PENDING) bị khách hủy -> Hoàn lại usedQuantity (1 -> 0), chuyển VoucherUsage sang RESTORED và cho phép user dùng lại mã")
    void e185_13_unpaidOrderCancelledByCustomer_RestoresVoucherAndAllowsReuse() {
        Voucher saved = createAndSaveVoucher("E185_CANCEL_REUSE", 1, 0);

        // 1. User 1001 đặt hàng dùng lượt duy nhất (0/1 -> 1/1)
        OrderResponse firstOrder = orderService.checkout(buildCheckoutRequest(1001L, "E185_CANCEL_REUSE"));
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(1);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1001L, VoucherUsageStatus.APPLIED)).hasSize(1);

        // 2. Khách hàng hủy đơn PENDING
        OrderResponse cancelled = orderService.cancelOrder(firstOrder.getId(), 1001L);
        assertThat(cancelled.getStatus()).isEqualTo(OrderStatus.CANCELLED);

        // 3. Kiểm tra DB sau khi hủy: usedQuantity về 0/1, bản ghi cũ chuyển sang RESTORED
        Voucher afterCancel = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(afterCancel.getUsedQuantity()).isZero();
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1001L, VoucherUsageStatus.APPLIED)).isEmpty();
        List<VoucherUsage> restoredList = voucherUsageRepository.findByUserIdAndStatus(1001L, VoucherUsageStatus.RESTORED);
        assertThat(restoredList).hasSize(1);
        assertThat(restoredList.get(0).getOrderId()).isEqualTo(firstOrder.getId());

        // 4. User 1001 đặt lại đơn hàng mới với cùng mã E185_CANCEL_REUSE -> Thành công!
        OrderResponse secondOrder = orderService.checkout(buildCheckoutRequest(1001L, "E185_CANCEL_REUSE"));
        assertThat(secondOrder.getId()).isNotEqualTo(firstOrder.getId());
        assertThat(secondOrder.getDiscountAmount()).isEqualByComparingTo("50000.00");
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(1);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1001L, VoucherUsageStatus.APPLIED)).hasSize(1);
    }

    @Test
    @org.junit.jupiter.api.Order(16)
    @DisplayName("E185-14: Đơn hàng bị hủy sau khi ghi nhận lượt sử dụng (do lỗi thanh toán Saga hoặc Admin hủy đơn) -> Đều hoàn lại đúng lượt Voucher")
    void e185_14_orderCancelledByPaymentFailureOrAdmin_RestoresVoucherUsageCorrectly() {
        Voucher saved = createAndSaveVoucher("E185_ADMIN_SAGA", 5, 0);

        // Tạo 2 đơn hàng của User 1002 và User 1003 -> usedQuantity = 2
        OrderResponse orderSaga = orderService.checkout(buildCheckoutRequest(1002L, "E185_ADMIN_SAGA"));
        OrderResponse orderAdmin = orderService.checkout(buildCheckoutRequest(1003L, "E185_ADMIN_SAGA"));
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(2);

        // Trường hợp 1: Cổng thanh toán báo lỗi (handlePaymentFailed) cho orderSaga
        orderService.handlePaymentFailed(PaymentFailedEvent.builder()
                .orderId(orderSaga.getId())
                .reason("Giao dịch hết hạn thanh toán")
                .timestamp(LocalDateTime.now())
                .build());

        assertThat(orderRepository.findById(orderSaga.getId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.FAILED);
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(1);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1002L, VoucherUsageStatus.RESTORED)).hasSize(1);

        // Trường hợp 2: Admin duyệt đơn sang CONFIRMED rồi chuyển sang CANCELLED cho orderAdmin
        orderService.updateOrderStatus(orderAdmin.getId(), OrderStatus.CONFIRMED, "ADMIN:1", "ROLE_ADMIN", "Duyệt đơn");
        orderService.updateOrderStatus(orderAdmin.getId(), OrderStatus.CANCELLED, "ADMIN:1", "ROLE_ADMIN", "Khách báo hủy");

        assertThat(orderRepository.findById(orderAdmin.getId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.CANCELLED);
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isZero();
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1003L, VoucherUsageStatus.RESTORED)).hasSize(1);
    }

    @Test
    @org.junit.jupiter.api.Order(17)
    @DisplayName("E185-15: Hủy cùng một đơn hàng nhiều lần liên tiếp -> Từ chối từ lần thứ 2, không cộng hoàn lượt sử dụng nhiều lần")
    void e185_15_cancelSameOrderMultipleTimesSequentially_NeverRestoresMultipleTimes() {
        Voucher saved = createAndSaveVoucher("E185_MULTI_CANCEL", 5, 0);

        // Hai người dùng 1004 và 1005 cùng đặt đơn -> usedQuantity = 2
        OrderResponse order1 = orderService.checkout(buildCheckoutRequest(1004L, "E185_MULTI_CANCEL"));
        OrderResponse order2 = orderService.checkout(buildCheckoutRequest(1005L, "E185_MULTI_CANCEL"));
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(2);

        // Hủy order1 lần 1 -> Thành công, usedQuantity giảm từ 2 xuống 1
        orderService.cancelOrder(order1.getId(), 1004L);
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(1);

        // Hủy order1 lần 2 và lần 3 -> Phải ném IllegalStateException
        assertThrows(IllegalStateException.class, () -> orderService.cancelOrder(order1.getId(), 1004L));
        assertThrows(IllegalStateException.class, () -> orderService.cancelOrder(order1.getId()));

        // Kể cả nhận thêm sự kiện handlePaymentFailed trùng lặp cho order1 đã CANCELLED -> Bỏ qua an toàn
        orderService.handlePaymentFailed(PaymentFailedEvent.builder()
                .orderId(order1.getId())
                .reason("Duplicate Kafka event")
                .timestamp(LocalDateTime.now())
                .build());

        // DB: usedQuantity vẫn giữ nguyên là 1 (của order2), bản ghi APPLIED của order2 không bị ảnh hưởng
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(1);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1005L, VoucherUsageStatus.APPLIED)).hasSize(1);
        assertThat(orderRepository.findById(order2.getId()).orElseThrow().getStatus()).isEqualTo(OrderStatus.PENDING);
    }

    @Test
    @org.junit.jupiter.api.Order(18)
    @DisplayName("E185-16: Nhiều request hủy cùng một đơn hàng đồng thời -> Chỉ 1 request thành công, không hoàn lượt hoặc hoàn kho trùng")
    void e185_16_concurrentRequestsCancellingSameOrder_OnlyOneSucceedsAndRestoresOnce() throws InterruptedException {
        Voucher saved = createAndSaveVoucher("E185_CONC_CANCEL", 5, 0);

        // Tạo 2 đơn hàng của User 1006 và 1007 -> usedQuantity = 2
        OrderResponse order1 = orderService.checkout(buildCheckoutRequest(1006L, "E185_CONC_CANCEL"));
        orderService.checkout(buildCheckoutRequest(1007L, "E185_CONC_CANCEL"));
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(2);

        clearInvocations(productClient);

        // 4 luồng đồng thời cùng gọi cancelOrder cho order1
        int threads = 4;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch readyLatch = new CountDownLatch(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger cancelSuccess = new AtomicInteger(0);
        AtomicInteger cancelRejected = new AtomicInteger(0);
        List<Throwable> unexpectedErrors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    orderService.cancelOrder(order1.getId(), 1006L);
                    cancelSuccess.incrementAndGet();
                } catch (IllegalStateException ex) {
                    cancelRejected.incrementAndGet();
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
        assertThat(cancelSuccess.get()).isEqualTo(1);
        assertThat(cancelRejected.get()).isEqualTo(3);

        // Xác minh DB: usedQuantity chỉ giảm đúng 1 lần (từ 2 về 1, không bị giảm kép về 0!)
        Voucher after = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(after.getUsedQuantity()).isEqualTo(1);
        verify(productClient, times(1)).restoreStock(any());
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1006L, VoucherUsageStatus.RESTORED)).hasSize(1);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1007L, VoucherUsageStatus.APPLIED)).hasSize(1);
    }

    @Test
    @org.junit.jupiter.api.Order(19)
    @DisplayName("E185-17: Quá trình hủy đơn lỗi giữa chừng (restoreStock ném ngoại lệ) -> Rollback toàn bộ, không làm sai lệch trạng thái đơn và lượt sử dụng Voucher")
    void e185_17_orderCancellationFailsMidTransaction_ShouldRollbackAndKeepVoucherApplied() {
        Voucher saved = createAndSaveVoucher("E185_CANCEL_FAIL", 5, 0);

        OrderResponse order = orderService.checkout(buildCheckoutRequest(1008L, "E185_CANCEL_FAIL"));
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(1);

        // Giả lập ProductService gặp lỗi khi hoàn kho trong lúc hủy đơn
        doThrow(new RuntimeException("Product service timeout during restoreStock"))
                .when(productClient).restoreStock(any());

        assertThrows(RuntimeException.class, () -> orderService.cancelOrder(order.getId(), 1008L));

        // Xác minh DB sau lỗi: Đơn hàng vẫn ở trạng thái PENDING, usedQuantity vẫn là 1, VoucherUsage vẫn là APPLIED
        Order orderAfter = orderRepository.findById(order.getId()).orElseThrow();
        assertThat(orderAfter.getStatus()).isEqualTo(OrderStatus.PENDING);

        Voucher voucherAfter = voucherRepository.findById(saved.getId()).orElseThrow();
        assertThat(voucherAfter.getUsedQuantity()).isEqualTo(1);

        assertThat(voucherUsageRepository.findByUserIdAndStatus(1008L, VoucherUsageStatus.APPLIED)).hasSize(1);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1008L, VoucherUsageStatus.RESTORED)).isEmpty();
    }

    @Test
    @org.junit.jupiter.api.Order(20)
    @DisplayName("E185-18: Đơn hàng đã hoàn tất (DELIVERED) hoặc đã thanh toán (PAID) bị yêu cầu hủy trái quy trình -> Từ chối và không hoàn lượt Voucher")
    void e185_18_completedOrPaidOrderCancelledOutOfProcess_ShouldBeRejectedAndKeepVoucherUsed() {
        Voucher saved = createAndSaveVoucher("E185_DELIVERED_LOCK", 5, 0);

        // Tạo 2 đơn hàng: orderPaid (PAID) và orderDelivered (DELIVERED)
        OrderResponse orderPaid = orderService.checkout(buildCheckoutRequest(1009L, "E185_DELIVERED_LOCK"));
        OrderResponse orderDelivered = orderService.checkout(buildCheckoutRequest(1010L, "E185_DELIVERED_LOCK"));
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(2);

        // Chuyển trạng thái hợp lệ cho 2 đơn
        orderService.updateOrderStatus(orderPaid.getId(), OrderStatus.PAID, "SYSTEM", "SYSTEM", "Đã thanh toán");

        orderService.updateOrderStatus(orderDelivered.getId(), OrderStatus.CONFIRMED, "ADMIN:1", "ROLE_ADMIN", "Duyệt");
        orderService.updateOrderStatus(orderDelivered.getId(), OrderStatus.SHIPPING, "ADMIN:1", "ROLE_ADMIN", "Giao");
        orderService.updateOrderStatus(orderDelivered.getId(), OrderStatus.DELIVERED, "ADMIN:1", "ROLE_ADMIN", "Hoàn tất");

        clearInvocations(productClient);

        // 1. Khách hàng cố tự hủy đơn đã PAID -> Bị từ chối
        IllegalStateException paidCancelEx = assertThrows(IllegalStateException.class,
                () -> orderService.cancelOrder(orderPaid.getId(), 1009L));
        assertThat(paidCancelEx.getMessage()).contains("Chỉ có thể hủy đơn hàng ở trạng thái PENDING");

        // 2. Khách hàng cố tự hủy đơn đã DELIVERED -> Bị từ chối
        assertThrows(IllegalStateException.class,
                () -> orderService.cancelOrder(orderDelivered.getId(), 1010L));

        // 3. Admin cố chuyển đơn đã DELIVERED sang CANCELLED trái State Machine -> Bị từ chối
        IllegalStateException adminCancelEx = assertThrows(IllegalStateException.class,
                () -> orderService.updateOrderStatus(orderDelivered.getId(), OrderStatus.CANCELLED, "ADMIN:1", "ROLE_ADMIN", "Hủy sai quy trình"));
        assertThat(adminCancelEx.getMessage()).contains("Không thể chuyển trạng thái đơn hàng từ DELIVERED sang CANCELLED");

        // DB: usedQuantity vẫn giữ nguyên 2, cả 2 bản ghi VoucherUsage vẫn là APPLIED, không gọi restoreStock
        assertThat(voucherRepository.findById(saved.getId()).orElseThrow().getUsedQuantity()).isEqualTo(2);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1009L, VoucherUsageStatus.APPLIED)).hasSize(1);
        assertThat(voucherUsageRepository.findByUserIdAndStatus(1010L, VoucherUsageStatus.APPLIED)).hasSize(1);
        verify(productClient, never()).restoreStock(any());
    }
}
