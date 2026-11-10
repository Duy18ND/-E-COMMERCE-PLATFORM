package com.ecommerce.order.service;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.ActiveFlashSaleDto;
import com.ecommerce.order.client.dto.FlashSaleReserveRequest;
import com.ecommerce.order.client.dto.ProductResponse;
import com.ecommerce.order.dto.request.ApplyVoucherRequest;
import com.ecommerce.order.dto.request.CheckoutItemRequest;
import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.request.VoucherRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.dto.response.ApplyVoucherResponse;
import com.ecommerce.order.dto.response.OrderResponse;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.Voucher;
import com.ecommerce.order.enums.DiscountType;
import com.ecommerce.order.enums.OrderStatus;
import com.ecommerce.order.enums.PaymentMethod;
import com.ecommerce.order.enums.VoucherStatus;
import com.ecommerce.order.producer.KafkaOrderProducer;
import com.ecommerce.order.repository.CartRepository;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.repository.OrderStatusHistoryRepository;
import com.ecommerce.order.repository.VoucherRepository;
import com.ecommerce.order.repository.VoucherUsageRepository;
import com.ecommerce.order.service.impl.OrderServiceImpl;
import com.ecommerce.order.service.impl.VoucherServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * [Task ECOM-170] Kiểm thử điều kiện giá trị đơn hàng tối thiểu, thời hạn Voucher và kết hợp Flash Sale.
 * PIC: Ngô Phương (QA)
 */
@ExtendWith(MockitoExtension.class)
class VoucherFlashSaleEcom170QATest {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate FIXED_TODAY = LocalDate.of(2026, 11, 10);

    @Mock
    private VoucherRepository voucherRepository;

    @Mock
    private VoucherUsageRepository voucherUsageRepository;

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private ProductClient productClient;

    @Mock
    private KafkaOrderProducer kafkaOrderProducer;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    private VoucherServiceImpl voucherService;
    private OrderServiceImpl orderService;

    private Voucher min500kFixedVoucher;
    private Voucher min500kPercentVoucher;

    @BeforeEach
    void setUp() {
        voucherService = new VoucherServiceImpl(voucherRepository);
        voucherService.setVoucherUsageRepository(voucherUsageRepository);
        // Cố định thời gian tại 2026-11-10 10:00:00 giờ Việt Nam (GMT+7) = 2026-11-10T03:00:00Z
        voucherService.setClock(Clock.fixed(Instant.parse("2026-11-10T03:00:00Z"), VIETNAM_ZONE));

        // Tích hợp trực tiếp VoucherServiceImpl thật vào OrderServiceImpl (không mock nghiệp vụ Voucher)
        orderService = new OrderServiceImpl(
                orderRepository,
                productClient,
                kafkaOrderProducer,
                cartRepository,
                orderStatusHistoryRepository,
                voucherService
        );

        min500kFixedVoucher = Voucher.builder()
                .id(101L)
                .code("GIAM50K")
                .name("Giảm 50.000đ cho đơn từ 500.000đ")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000.00"))
                .minOrderValue(new BigDecimal("500000.00"))
                .quantity(100)
                .usedQuantity(10)
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 11, 30))
                .status(VoucherStatus.ACTIVE)
                .build();

        min500kPercentVoucher = Voucher.builder()
                .id(102L)
                .code("FLASH10")
                .name("Giảm 10% tối đa 80.000đ cho đơn từ 500.000đ")
                .discountType(DiscountType.PERCENT)
                .discountValue(new BigDecimal("10.00"))
                .maxDiscount(new BigDecimal("80000.00"))
                .minOrderValue(new BigDecimal("500000.00"))
                .quantity(100)
                .usedQuantity(5)
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 11, 30))
                .status(VoucherStatus.ACTIVE)
                .build();
    }

    // =========================================================================
    // A. KIỂM TRA GIÁ TRỊ ĐƠN HÀNG TỐI THIỂU (E170-01 -> E170-06)
    // =========================================================================

    @Nested
    @DisplayName("A. Kiểm tra điều kiện giá trị đơn hàng tối thiểu (minOrderValue = 500.000đ)")
    class MinOrderValueTests {

        @Test
        @DisplayName("E170-01: Đơn hàng dưới 500.000đ (499.999đ) -> Không được áp dụng")
        void e170_01_orderBelow500k_ShouldBeRejected() {
            // Arrange
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));
            ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                    .code("GIAM50K")
                    .orderTotal(new BigDecimal("499999.00"))
                    .build();

            // Act & Assert
            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> voucherService.applyVoucher(request));
            assertThat(ex.getMessage()).contains("Đơn hàng tối thiểu 500000.00đ");
        }

        @Test
        @DisplayName("E170-02: Đơn hàng đúng bằng 500.000đ (biên dưới hợp lệ) -> Được áp dụng")
        void e170_02_orderExactly500k_ShouldBeApplied() {
            // Arrange
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));
            ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                    .code("GIAM50K")
                    .orderTotal(new BigDecimal("500000.00"))
                    .build();

            // Act
            ApplyVoucherResponse response = voucherService.applyVoucher(request);

            // Assert
            assertThat(response.getDiscountAmount()).isEqualByComparingTo("50000.00");
            assertThat(response.getFinalAmount()).isEqualByComparingTo("450000.00");
            assertThat(response.getVoucher().getCode()).isEqualTo("GIAM50K");
        }

        @Test
        @DisplayName("E170-03: Đơn hàng trên 500.000đ (750.000đ) -> Được áp dụng chính xác")
        void e170_03_orderAbove500k_ShouldBeApplied() {
            // Arrange
            when(voucherRepository.findByCodeIgnoreCase("FLASH10")).thenReturn(Optional.of(min500kPercentVoucher));
            ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                    .code("FLASH10")
                    .orderTotal(new BigDecimal("750000.00"))
                    .build();

            // Act
            ApplyVoucherResponse response = voucherService.applyVoucher(request);

            // Assert: 10% của 750.000đ = 75.000đ (<= maxDiscount 80.000đ) -> còn 675.000đ
            assertThat(response.getDiscountAmount()).isEqualByComparingTo("75000.00");
            assertThat(response.getFinalAmount()).isEqualByComparingTo("675000.00");
        }

        @Test
        @DisplayName("E170-04: Đơn hàng bằng 0 (kể cả khi voucher có minOrderValue = 0) -> Không được áp dụng")
        void e170_04_orderEqualZero_EvenWithZeroMinOrder_ShouldBeRejected() {
            // Arrange
            Voucher zeroMinVoucher = Voucher.builder()
                    .id(103L)
                    .code("FREESHIP0D")
                    .name("Giảm 15K đơn từ 0đ")
                    .discountType(DiscountType.FIXED)
                    .discountValue(new BigDecimal("15000.00"))
                    .minOrderValue(BigDecimal.ZERO)
                    .quantity(50)
                    .usedQuantity(0)
                    .startDate(LocalDate.of(2026, 11, 1))
                    .endDate(LocalDate.of(2026, 11, 30))
                    .status(VoucherStatus.ACTIVE)
                    .build();
            when(voucherRepository.findByCodeIgnoreCase("FREESHIP0D")).thenReturn(Optional.of(zeroMinVoucher));

            ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                    .code("FREESHIP0D")
                    .orderTotal(BigDecimal.ZERO)
                    .build();

            // Act & Assert
            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> voucherService.applyVoucher(request));
            assertThat(ex.getMessage()).contains("lớn hơn 0đ");
        }

        @Test
        @DisplayName("E170-05: Đơn hàng có giá trị âm không hợp lệ (-150.000đ) -> Backend từ chối")
        void e170_05_orderNegativeValue_ShouldBeRejected() {
            // Arrange
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));
            ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                    .code("GIAM50K")
                    .orderTotal(new BigDecimal("-150000.00"))
                    .build();

            // Act & Assert
            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> voucherService.applyVoucher(request));
            assertThat(ex.getMessage()).contains("lớn hơn 0đ");
        }

        @Test
        @DisplayName("E170-06: Giá trị đơn hàng thiếu hoặc null -> Xử lý validation từ chối đúng")
        void e170_06_orderTotalNull_ShouldBeRejected() {
            // Arrange
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));
            ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                    .code("GIAM50K")
                    .orderTotal(null)
                    .build();

            // Act & Assert
            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> voucherService.applyVoucher(request));
            assertThat(ex.getMessage()).contains("lớn hơn 0đ");
        }
    }

    // =========================================================================
    // B. KIỂM TRA THỜI HẠN VOUCHER & TIMEZONE (E170-07 -> E170-12)
    // =========================================================================

    @Nested
    @DisplayName("B. Kiểm tra thời hạn sử dụng Voucher & đồng bộ múi giờ Việt Nam (GMT+7)")
    class VoucherExpirationAndTimezoneTests {

        @Test
        @DisplayName("E170-07: Voucher chưa đến thời gian bắt đầu (today < startDate) -> Không được áp dụng")
        void e170_07_voucherBeforeStartDate_ShouldBeRejected() {
            // Arrange: today là 2026-11-10, voucher bắt đầu từ 2026-11-11
            min500kFixedVoucher.setStartDate(FIXED_TODAY.plusDays(1));
            min500kFixedVoucher.setEndDate(FIXED_TODAY.plusDays(10));
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));

            ApplyVoucherRequest request = new ApplyVoucherRequest("GIAM50K", new BigDecimal("600000.00"));

            // Act & Assert
            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> voucherService.applyVoucher(request));
            assertThat(ex.getMessage()).contains("chưa đến thời gian áp dụng");
        }

        @Test
        @DisplayName("E170-08: Voucher đang trong thời hạn (startDate < today < endDate) -> Được áp dụng")
        void e170_08_voucherWithinValidPeriod_ShouldBeApplied() {
            // Arrange: today là 2026-11-10, voucher từ 2026-11-01 đến 2026-11-30
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));

            ApplyVoucherRequest request = new ApplyVoucherRequest("GIAM50K", new BigDecimal("600000.00"));

            // Act
            ApplyVoucherResponse response = voucherService.applyVoucher(request);

            // Assert
            assertThat(response.getDiscountAmount()).isEqualByComparingTo("50000.00");
            assertThat(response.getFinalAmount()).isEqualByComparingTo("550000.00");
        }

        @Test
        @DisplayName("E170-09: Voucher đã hết hạn (today > endDate) -> Không được áp dụng")
        void e170_09_voucherAfterEndDate_ShouldBeRejected() {
            // Arrange: today là 2026-11-10, voucher kết thúc ngày 2026-11-09
            min500kFixedVoucher.setStartDate(FIXED_TODAY.minusDays(10));
            min500kFixedVoucher.setEndDate(FIXED_TODAY.minusDays(1));
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));

            ApplyVoucherRequest request = new ApplyVoucherRequest("GIAM50K", new BigDecimal("600000.00"));

            // Act & Assert
            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> voucherService.applyVoucher(request));
            assertThat(ex.getMessage()).contains("đã hết hạn");
        }

        @Test
        @DisplayName("E170-10: Thời điểm đúng bằng ngày bắt đầu lúc 00:30 sáng giờ Việt Nam (UTC vẫn là ngày hôm trước) -> Được áp dụng đúng biên")
        void e170_10_exactStartDateBoundaryInVietnamTimezone_ShouldBeApplied() {
            // Arrange:
            // Instant 2026-11-09T17:30:00Z tương đương 2026-11-10 00:30:00 tại Việt Nam (Asia/Ho_Chi_Minh).
            // Nếu tính sai theo UTC thì ngày vẫn là 2026-11-09 và bị từ chối.
            voucherService.setClock(Clock.fixed(Instant.parse("2026-11-09T17:30:00Z"), VIETNAM_ZONE));
            min500kFixedVoucher.setStartDate(LocalDate.of(2026, 11, 10));
            min500kFixedVoucher.setEndDate(LocalDate.of(2026, 11, 15));
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));

            ApplyVoucherRequest request = new ApplyVoucherRequest("GIAM50K", new BigDecimal("500000.00"));

            // Act
            ApplyVoucherResponse response = voucherService.applyVoucher(request);

            // Assert
            assertThat(response.getDiscountAmount()).isEqualByComparingTo("50000.00");
            assertThat(response.getFinalAmount()).isEqualByComparingTo("450000.00");
        }

        @Test
        @DisplayName("E170-11: Thời điểm đúng bằng ngày kết thúc lúc 23:59:59 giờ Việt Nam -> Được áp dụng đúng biên")
        void e170_11_exactEndDateBoundaryInVietnamTimezone_ShouldBeApplied() {
            // Arrange:
            // Instant 2026-11-10T16:59:59Z tương đương 2026-11-10 23:59:59 tại Việt Nam (Asia/Ho_Chi_Minh).
            voucherService.setClock(Clock.fixed(Instant.parse("2026-11-10T16:59:59Z"), VIETNAM_ZONE));
            min500kFixedVoucher.setStartDate(LocalDate.of(2026, 11, 1));
            min500kFixedVoucher.setEndDate(LocalDate.of(2026, 11, 10));
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));

            ApplyVoucherRequest request = new ApplyVoucherRequest("GIAM50K", new BigDecimal("500000.00"));

            // Act
            ApplyVoucherResponse response = voucherService.applyVoucher(request);

            // Assert
            assertThat(response.getDiscountAmount()).isEqualByComparingTo("50000.00");
            assertThat(response.getFinalAmount()).isEqualByComparingTo("450000.00");
        }

        @Test
        @DisplayName("E170-12: Thời gian bắt đầu lớn hơn thời gian kết thúc (startDate > endDate) -> Validation từ chối cấu hình sai")
        void e170_12_startDateAfterEndDate_ShouldBeRejectedAtDtoAndService() {
            // Arrange
            VoucherRequest invalidRequest = VoucherRequest.builder()
                    .code("INVALID_DATE")
                    .name("Voucher sai ngày")
                    .discountType(DiscountType.FIXED)
                    .discountValue(new BigDecimal("50000.00"))
                    .minOrderValue(new BigDecimal("200000.00"))
                    .quantity(50)
                    .startDate(LocalDate.of(2026, 11, 20))
                    .endDate(LocalDate.of(2026, 11, 10))
                    .build();

            // Act & Assert 1: DTO @AssertTrue isValidDateRange() trả về false
            assertThat(invalidRequest.isValidDateRange()).isFalse();

            // Act & Assert 2: Service createVoucher từ chối ngay cả khi gọi trực tiếp
            IllegalArgumentException createEx = assertThrows(IllegalArgumentException.class,
                    () -> voucherService.createVoucher(invalidRequest));
            assertThat(createEx.getMessage()).contains("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu");

            // Act & Assert 3: Service updateVoucher từ chối ngay cả khi gọi trực tiếp
            IllegalArgumentException updateEx = assertThrows(IllegalArgumentException.class,
                    () -> voucherService.updateVoucher(101L, invalidRequest));
            assertThat(updateEx.getMessage()).contains("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu");

            verify(voucherRepository, never()).save(any());
        }
    }

    // =========================================================================
    // C & D. KẾT HỢP VOUCHER VỚI FLASH SALE & ĐỘ CHÍNH XÁC TÍNH GIÁ (E170-13 -> E170-18)
    // =========================================================================

    @Nested
    @DisplayName("C & D. Kiểm tra kết hợp Voucher với Flash Sale và tính chính xác số tiền")
    class VoucherFlashSaleCombinationAndAccuracyTests {

        private ProductResponse flashSaleProduct;
        private ProductResponse regularProduct;

        @BeforeEach
        void setUpProducts() {
            // Sản phẩm Flash Sale: Giá gốc 800.000đ, giá Flash Sale 550.000đ, giới hạn mua userLimit = 2
            flashSaleProduct = ProductResponse.builder()
                    .id(501L)
                    .name("Tai nghe Gaming Không Dây Pro")
                    .price(new BigDecimal("800000.00"))
                    .stockQuantity(30)
                    .activeFlashSale(ActiveFlashSaleDto.builder()
                            .campaignId(10L)
                            .flashSalePrice(new BigDecimal("550000.00"))
                            .remainingStock(15)
                            .userLimit(2)
                            .build())
                    .build();

            // Sản phẩm thường (không Flash Sale): Giá gốc 250.000đ
            regularProduct = ProductResponse.builder()
                    .id(502L)
                    .name("Chuột Không Dây Silent")
                    .price(new BigDecimal("250000.00"))
                    .stockQuantity(50)
                    .activeFlashSale(null)
                    .build();
        }

        @Test
        @DisplayName("E170-13: Sản phẩm Flash Sale + Voucher đủ điều kiện sau giảm Flash Sale -> Áp dụng đúng quy tắc và trừ kho chuẩn")
        void e170_13_flashSaleProductWithEligibleVoucher_ShouldApplyOnPostFlashSaleSubtotal() {
            // Arrange:
            // 1 sản phẩm Flash Sale: giá gốc 800.000đ -> giá sau Flash Sale = 550.000đ (>= minOrderValue 500.000đ)
            // Áp dụng mã GIAM50K (giảm 50.000đ) -> Tổng thanh toán cuối = 500.000đ
            when(productClient.getProductById(501L)).thenReturn(ApiResponse.success(flashSaleProduct));
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));
            when(voucherRepository.incrementUsedQuantityAtomically(eq(101L), eq(FIXED_TODAY))).thenReturn(1);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
                Order o = inv.getArgument(0);
                o.setId(9001L);
                o.setCreatedAt(LocalDateTime.now());
                return o;
            });

            CheckoutRequest checkoutReq = CheckoutRequest.builder()
                    .userId(15L)
                    .receiverName("Ngô Phương")
                    .receiverPhone("0912345678")
                    .shippingAddress("123 Cầu Giấy, Hà Nội")
                    .paymentMethod(PaymentMethod.COD)
                    .voucherCode("GIAM50K")
                    .items(List.of(CheckoutItemRequest.builder()
                            .productId(501L)
                            .quantity(1)
                            .priceAtPurchase(new BigDecimal("800000.00"))
                            .build()))
                    .build();

            // Act
            OrderResponse response = orderService.checkout(checkoutReq);

            // Assert: Kiểm tra đầy đủ giá sau Flash Sale, giảm Voucher và tổng tiền cuối
            assertThat(response.getItems()).hasSize(1);
            assertThat(response.getItems().get(0).getPriceAtPurchase()).isEqualByComparingTo("550000.00");
            assertThat(response.getSubtotalAmount()).isEqualByComparingTo("550000.00");
            assertThat(response.getVoucherCode()).isEqualTo("GIAM50K");
            assertThat(response.getDiscountAmount()).isEqualByComparingTo("50000.00");
            assertThat(response.getTotalAmount()).isEqualByComparingTo("500000.00");

            verify(productClient, times(1)).reserveFlashSaleStock(any(FlashSaleReserveRequest.class));
            verify(productClient, times(1)).reserveStock(any());
            verify(voucherUsageRepository, times(1)).save(any());
        }

        @Test
        @DisplayName("E170-14: Sản phẩm Flash Sale làm tổng tiền sau giảm (400.000đ) thấp hơn minOrderValue (500.000đ) dù giá gốc là 600.000đ -> Backend từ chối")
        void e170_14_flashSaleReducesSubtotalBelowVoucherMinOrder_ShouldRejectAndNotReserveStock() {
            // Arrange:
            // Sản phẩm có giá gốc 600.000đ (>= 500.000đ), nhưng đang Flash Sale còn 400.000đ (< 500.000đ).
            // Nghiệp vụ chuẩn: điều kiện tối thiểu của Voucher phải kiểm tra trên subtotalAmount SAU Flash Sale (400.000đ).
            ProductResponse fsProduct400k = ProductResponse.builder()
                    .id(503L)
                    .name("Bàn phím Cơ Compact")
                    .price(new BigDecimal("600000.00"))
                    .stockQuantity(20)
                    .activeFlashSale(ActiveFlashSaleDto.builder()
                            .campaignId(10L)
                            .flashSalePrice(new BigDecimal("400000.00"))
                            .remainingStock(10)
                            .userLimit(2)
                            .build())
                    .build();

            when(productClient.getProductById(503L)).thenReturn(ApiResponse.success(fsProduct400k));
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));

            CheckoutRequest checkoutReq = CheckoutRequest.builder()
                    .userId(15L)
                    .receiverName("Ngô Phương")
                    .receiverPhone("0912345678")
                    .shippingAddress("123 Cầu Giấy, Hà Nội")
                    .paymentMethod(PaymentMethod.COD)
                    .voucherCode("GIAM50K")
                    .items(List.of(CheckoutItemRequest.builder()
                            .productId(503L)
                            .quantity(1)
                            .priceAtPurchase(new BigDecimal("600000.00"))
                            .build()))
                    .build();

            // Act & Assert
            IllegalStateException ex = assertThrows(IllegalStateException.class,
                    () -> orderService.checkout(checkoutReq));
            assertThat(ex.getMessage()).contains("Đơn hàng tối thiểu 500000.00đ");

            // Không được trừ kho Flash Sale hay lưu đơn hàng khi Voucher bị từ chối
            verify(productClient, never()).reserveFlashSaleStock(any());
            verify(productClient, never()).reserveStock(any());
            verify(orderRepository, never()).save(any());
        }

        @Test
        @DisplayName("E170-15: Giỏ hàng hỗn hợp có cả sản phẩm Flash Sale và sản phẩm thường -> Tính giảm giá đúng phạm vi từng loại")
        void e170_15_mixedCartFlashSaleAndRegularProduct_ShouldCalculateAccurateSubtotalAndDiscount() {
            // Arrange:
            // - Item 1 (Flash Sale): giá gốc 800.000đ -> lấy giá Flash Sale 550.000đ x 1 = 550.000đ
            // - Item 2 (Thường): giá gốc 250.000đ x 1 = 250.000đ
            // => Subtotal = 800.000đ
            // - Voucher FLASH10: 10% của 800.000đ = 80.000đ (bằng đúng trần maxDiscount 80.000đ)
            // => Final Total = 720.000đ
            when(productClient.getProductById(501L)).thenReturn(ApiResponse.success(flashSaleProduct));
            when(productClient.getProductById(502L)).thenReturn(ApiResponse.success(regularProduct));
            when(voucherRepository.findByCodeIgnoreCase("FLASH10")).thenReturn(Optional.of(min500kPercentVoucher));
            when(voucherRepository.incrementUsedQuantityAtomically(eq(102L), eq(FIXED_TODAY))).thenReturn(1);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
                Order o = inv.getArgument(0);
                o.setId(9002L);
                o.setCreatedAt(LocalDateTime.now());
                return o;
            });

            CheckoutRequest checkoutReq = CheckoutRequest.builder()
                    .userId(15L)
                    .receiverName("Ngô Phương")
                    .receiverPhone("0912345678")
                    .shippingAddress("123 Cầu Giấy, Hà Nội")
                    .paymentMethod(PaymentMethod.MOCK_ONLINE)
                    .voucherCode("FLASH10")
                    .items(List.of(
                            CheckoutItemRequest.builder().productId(501L).quantity(1).priceAtPurchase(new BigDecimal("800000.00")).build(),
                            CheckoutItemRequest.builder().productId(502L).quantity(1).priceAtPurchase(new BigDecimal("250000.00")).build()
                    ))
                    .build();

            // Act
            OrderResponse response = orderService.checkout(checkoutReq);

            // Assert
            assertThat(response.getItems()).hasSize(2);
            assertThat(response.getItems().get(0).getPriceAtPurchase()).isEqualByComparingTo("550000.00");
            assertThat(response.getItems().get(1).getPriceAtPurchase()).isEqualByComparingTo("250000.00");
            assertThat(response.getSubtotalAmount()).isEqualByComparingTo("800000.00");
            assertThat(response.getDiscountAmount()).isEqualByComparingTo("80000.00");
            assertThat(response.getTotalAmount()).isEqualByComparingTo("720000.00");

            // Chỉ gọi reserveFlashSaleStock cho đúng sản phẩm Flash Sale (501L), không gọi cho sản phẩm thường (502L)
            verify(productClient, times(1)).reserveFlashSaleStock(argThat(
                    req -> req.getProductId().equals(501L) && req.getQuantity().equals(1)));
        }

        @Test
        @DisplayName("E170-16: Áp dụng đồng thời nhiều mã giảm giá không hợp lệ hoặc giả mạo giá Flash Sale -> Không được giảm trùng")
        void e170_16_multipleVoucherCodesOrTamperedPrice_ShouldPreventDoubleDiscount() {
            // Arrange 1: Client cố tình truyền chuỗi nhiều mã voucher ghép nhau "GIAM50K,FLASH10" -> Từ chối vì không tồn tại mã ghép
            when(productClient.getProductById(501L)).thenReturn(ApiResponse.success(flashSaleProduct));
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K,FLASH10")).thenReturn(Optional.empty());

            CheckoutRequest multiCodeReq = CheckoutRequest.builder()
                    .userId(15L)
                    .receiverName("Ngô Phương")
                    .receiverPhone("0912345678")
                    .shippingAddress("123 Cầu Giấy, Hà Nội")
                    .paymentMethod(PaymentMethod.COD)
                    .voucherCode("GIAM50K,FLASH10")
                    .items(List.of(CheckoutItemRequest.builder()
                            .productId(501L)
                            .quantity(1)
                            .priceAtPurchase(new BigDecimal("100000.00")) // Giả mạo giá thấp hơn cả Flash Sale
                            .build()))
                    .build();

            assertThrows(com.ecommerce.order.exception.ResourceNotFoundException.class,
                    () -> orderService.checkout(multiCodeReq));

            // Arrange 2: Client giả mạo priceAtPurchase = 100.000đ kèm mã hợp lệ GIAM50K ->
            // Backend phải tự lấy giá Flash Sale 550.000đ từ ProductService và chỉ giảm 1 lần 50.000đ = 500.000đ
            when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(min500kFixedVoucher));
            when(voucherRepository.incrementUsedQuantityAtomically(eq(101L), eq(FIXED_TODAY))).thenReturn(1);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
                Order o = inv.getArgument(0);
                o.setId(9003L);
                o.setCreatedAt(LocalDateTime.now());
                return o;
            });

            CheckoutRequest tamperedPriceReq = CheckoutRequest.builder()
                    .userId(15L)
                    .receiverName("Ngô Phương")
                    .receiverPhone("0912345678")
                    .shippingAddress("123 Cầu Giấy, Hà Nội")
                    .paymentMethod(PaymentMethod.COD)
                    .voucherCode("GIAM50K")
                    .items(List.of(CheckoutItemRequest.builder()
                            .productId(501L)
                            .quantity(1)
                            .priceAtPurchase(new BigDecimal("100000.00")) // Client cố tình gửi giá đã trừ trùng
                            .build()))
                    .build();

            OrderResponse response = orderService.checkout(tamperedPriceReq);

            assertThat(response.getSubtotalAmount()).isEqualByComparingTo("550000.00");
            assertThat(response.getDiscountAmount()).isEqualByComparingTo("50000.00");
            assertThat(response.getTotalAmount()).isEqualByComparingTo("500000.00");
        }

        @Test
        @DisplayName("E170-17: Giá trị giảm của Voucher vượt tổng tiền hàng -> Không tạo tổng tiền âm (finalAmount = 0)")
        void e170_17_discountExceedsOrderTotal_ShouldCapDiscountAndNeverProduceNegativeTotal() {
            // Arrange: Voucher giảm cố định 500.000đ cho đơn từ 100.000đ, áp dụng cho đơn hàng 250.000đ
            Voucher hugeFixedVoucher = Voucher.builder()
                    .id(105L)
                    .code("MEGA500K")
                    .name("Siêu Voucher 500K")
                    .discountType(DiscountType.FIXED)
                    .discountValue(new BigDecimal("500000.00"))
                    .minOrderValue(new BigDecimal("100000.00"))
                    .quantity(20)
                    .usedQuantity(0)
                    .startDate(LocalDate.of(2026, 11, 1))
                    .endDate(LocalDate.of(2026, 11, 30))
                    .status(VoucherStatus.ACTIVE)
                    .build();

            when(productClient.getProductById(502L)).thenReturn(ApiResponse.success(regularProduct));
            when(voucherRepository.findByCodeIgnoreCase("MEGA500K")).thenReturn(Optional.of(hugeFixedVoucher));
            when(voucherRepository.incrementUsedQuantityAtomically(eq(105L), eq(FIXED_TODAY))).thenReturn(1);
            when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
                Order o = inv.getArgument(0);
                o.setId(9004L);
                o.setCreatedAt(LocalDateTime.now());
                return o;
            });

            // Act 1: Kiểm tra qua applyVoucher API
            ApplyVoucherResponse applyRes = voucherService.applyVoucher(
                    new ApplyVoucherRequest("MEGA500K", new BigDecimal("250000.00")));
            assertThat(applyRes.getDiscountAmount()).isEqualByComparingTo("250000.00");
            assertThat(applyRes.getFinalAmount()).isEqualByComparingTo("0.00");

            // Act 2: Kiểm tra qua luồng Checkout
            CheckoutRequest checkoutReq = CheckoutRequest.builder()
                    .userId(15L)
                    .receiverName("Ngô Phương")
                    .receiverPhone("0912345678")
                    .shippingAddress("123 Cầu Giấy, Hà Nội")
                    .paymentMethod(PaymentMethod.COD)
                    .voucherCode("MEGA500K")
                    .items(List.of(CheckoutItemRequest.builder()
                            .productId(502L)
                            .quantity(1)
                            .priceAtPurchase(new BigDecimal("250000.00"))
                            .build()))
                    .build();

            OrderResponse orderRes = orderService.checkout(checkoutReq);
            assertThat(orderRes.getSubtotalAmount()).isEqualByComparingTo("250000.00");
            assertThat(orderRes.getDiscountAmount()).isEqualByComparingTo("250000.00");
            assertThat(orderRes.getTotalAmount()).isEqualByComparingTo("0.00");
        }

        @Test
        @DisplayName("E170-18: Thay đổi số lượng sản phẩm sau khi áp Voucher -> Tính toán lại chính xác theo số lượng mới và chặn nếu vượt userLimit hoặc tụt dưới minOrderValue")
        void e170_18_quantityChangedAfterApplyingVoucher_ShouldRecalculateAccuratelyAndValidateLimits() {
            when(voucherRepository.findByCodeIgnoreCase("FLASH10")).thenReturn(Optional.of(min500kPercentVoucher));
            when(productClient.getProductById(501L)).thenReturn(ApiResponse.success(flashSaleProduct));

            // Bước 1: Ban đầu giỏ có 2 sản phẩm thường (2 x 250.000đ = 500.000đ) -> Giảm 10% = 50.000đ, còn 450.000đ
            ApplyVoucherResponse initialApply = voucherService.applyVoucher(
                    new ApplyVoucherRequest("FLASH10", new BigDecimal("500000.00")));
            assertThat(initialApply.getDiscountAmount()).isEqualByComparingTo("50000.00");
            assertThat(initialApply.getFinalAmount()).isEqualByComparingTo("450000.00");

            // Bước 2: Tăng số lượng lên 3 sản phẩm thường (3 x 250.000đ = 750.000đ) -> Giảm 10% = 75.000đ, còn 675.000đ
            ApplyVoucherResponse increasedQtyApply = voucherService.applyVoucher(
                    new ApplyVoucherRequest("FLASH10", new BigDecimal("750000.00")));
            assertThat(increasedQtyApply.getDiscountAmount()).isEqualByComparingTo("75000.00");
            assertThat(increasedQtyApply.getFinalAmount()).isEqualByComparingTo("675000.00");

            // Bước 3: Giảm số lượng xuống 1 sản phẩm thường (1 x 250.000đ = 250.000đ < 500.000đ) -> Từ chối áp dụng
            assertThrows(IllegalStateException.class, () -> voucherService.applyVoucher(
                    new ApplyVoucherRequest("FLASH10", new BigDecimal("250000.00"))));

            // Bước 4: Tăng số lượng sản phẩm Flash Sale lên 3 (> userLimit = 2) khi Checkout -> Backend chặn ngay
            CheckoutRequest exceedFlashSaleLimitReq = CheckoutRequest.builder()
                    .userId(15L)
                    .receiverName("Ngô Phương")
                    .receiverPhone("0912345678")
                    .shippingAddress("123 Cầu Giấy, Hà Nội")
                    .paymentMethod(PaymentMethod.COD)
                    .voucherCode("FLASH10")
                    .items(List.of(CheckoutItemRequest.builder()
                            .productId(501L)
                            .quantity(3)
                            .priceAtPurchase(new BigDecimal("550000.00"))
                            .build()))
                    .build();

            IllegalArgumentException fsLimitEx = assertThrows(IllegalArgumentException.class,
                    () -> orderService.checkout(exceedFlashSaleLimitReq));
            assertThat(fsLimitEx.getMessage()).contains("chỉ cho phép mua tối đa 2 sản phẩm với giá Flash Sale");
        }

        @Test
        @DisplayName("Section D: Kiểm tra phép làm tròn tiền HALF_UP khi tính % giảm giá lẻ")
        void sectionD_percentDiscountRoundingHalfUp_ShouldRoundToTwoDecimalPlaces() {
            // Arrange: Voucher giảm 15% không giới hạn trần cho đơn từ 100.000đ
            Voucher percent15Voucher = Voucher.builder()
                    .id(106L)
                    .code("SALE15")
                    .name("Giảm 15%")
                    .discountType(DiscountType.PERCENT)
                    .discountValue(new BigDecimal("15.00"))
                    .maxDiscount(null)
                    .minOrderValue(new BigDecimal("100000.00"))
                    .quantity(50)
                    .usedQuantity(0)
                    .startDate(LocalDate.of(2026, 11, 1))
                    .endDate(LocalDate.of(2026, 11, 30))
                    .status(VoucherStatus.ACTIVE)
                    .build();
            when(voucherRepository.findByCodeIgnoreCase("SALE15")).thenReturn(Optional.of(percent15Voucher));

            // Đơn hàng 333.333,35đ * 15 / 100 = 50.000,0025 -> HALF_UP = 50.000,00
            // Đơn hàng 123.456,70đ * 15 / 100 = 18.518,505 -> HALF_UP = 18.518,51
            ApplyVoucherResponse response = voucherService.applyVoucher(
                    new ApplyVoucherRequest("SALE15", new BigDecimal("123456.70")));

            assertThat(response.getDiscountAmount()).isEqualByComparingTo("18518.51");
            assertThat(response.getFinalAmount()).isEqualByComparingTo("104938.19");
        }
    }
}
