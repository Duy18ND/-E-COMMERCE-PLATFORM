package com.ecommerce.order.controller;

import com.ecommerce.order.client.ProductClient;
import com.ecommerce.order.client.dto.ActiveFlashSaleDto;
import com.ecommerce.order.client.dto.ProductResponse;
import com.ecommerce.order.dto.request.ApplyVoucherRequest;
import com.ecommerce.order.dto.request.CheckoutItemRequest;
import com.ecommerce.order.dto.request.CheckoutRequest;
import com.ecommerce.order.dto.request.VoucherRequest;
import com.ecommerce.order.dto.response.ApiResponse;
import com.ecommerce.order.entity.Order;
import com.ecommerce.order.entity.Voucher;
import com.ecommerce.order.enums.DiscountType;
import com.ecommerce.order.enums.PaymentMethod;
import com.ecommerce.order.enums.VoucherStatus;
import com.ecommerce.order.exception.GlobalExceptionHandler;
import com.ecommerce.order.producer.KafkaOrderProducer;
import com.ecommerce.order.repository.CartRepository;
import com.ecommerce.order.repository.OrderRepository;
import com.ecommerce.order.repository.OrderStatusHistoryRepository;
import com.ecommerce.order.repository.VoucherRepository;
import com.ecommerce.order.repository.VoucherUsageRepository;
import com.ecommerce.order.service.impl.OrderServiceImpl;
import com.ecommerce.order.service.impl.VoucherServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-170] API Integration Test (Controller -> Service -> ExceptionHandler)
 * Kiểm tra HTTP status, validation và JSON response body thực tế cho Voucher & Flash Sale.
 */
@WebMvcTest({VoucherController.class, AdminVoucherController.class, OrderController.class})
@Import({VoucherServiceImpl.class, OrderServiceImpl.class, GlobalExceptionHandler.class})
class VoucherFlashSaleEcom170ApiQATest {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate FIXED_TODAY = LocalDate.of(2026, 11, 10);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private VoucherServiceImpl voucherService;

    @MockBean
    private VoucherRepository voucherRepository;

    @MockBean
    private VoucherUsageRepository voucherUsageRepository;

    @MockBean
    private OrderRepository orderRepository;

    @MockBean
    private ProductClient productClient;

    @MockBean
    private com.ecommerce.order.client.AuthClient authClient;

    @MockBean
    private KafkaOrderProducer kafkaOrderProducer;

    @MockBean
    private CartRepository cartRepository;

    @MockBean
    private OrderStatusHistoryRepository orderStatusHistoryRepository;

    private Voucher voucherMin500k;

    @BeforeEach
    void setUp() {
        voucherService.setClock(Clock.fixed(Instant.parse("2026-11-10T03:00:00Z"), VIETNAM_ZONE));

        voucherMin500k = Voucher.builder()
                .id(10L)
                .code("GIAM50K")
                .name("Giảm 50K đơn từ 500K")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000.00"))
                .minOrderValue(new BigDecimal("500000.00"))
                .quantity(100)
                .usedQuantity(10)
                .startDate(LocalDate.of(2026, 11, 1))
                .endDate(LocalDate.of(2026, 11, 30))
                .status(VoucherStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("API E170-01: POST /api/v1/vouchers/apply với đơn hàng dưới 500.000đ -> HTTP 400 Bad Request")
    void api_e170_01_orderBelow500k_ShouldReturn400() throws Exception {
        when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(voucherMin500k));

        ApplyVoucherRequest req = new ApplyVoucherRequest("GIAM50K", new BigDecimal("450000.00"));

        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Đơn hàng tối thiểu 500000.00đ để sử dụng mã này."));
    }

    @Test
    @DisplayName("API E170-02 & E170-03: POST /api/v1/vouchers/apply với đơn hàng 500.000đ -> HTTP 200 OK và trả đúng số liệu")
    void api_e170_02_orderExactly500k_ShouldReturn200WithExactAmounts() throws Exception {
        when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(voucherMin500k));

        ApplyVoucherRequest req = new ApplyVoucherRequest("GIAM50K", new BigDecimal("500000.00"));

        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.voucher.code").value("GIAM50K"))
                .andExpect(jsonPath("$.data.discountAmount").value(50000.00))
                .andExpect(jsonPath("$.data.finalAmount").value(450000.00));
    }

    @Test
    @DisplayName("API E170-04: POST /api/v1/vouchers/apply với orderTotal = 0 -> HTTP 400 Bad Request")
    void api_e170_04_orderZero_ShouldReturn400() throws Exception {
        ApplyVoucherRequest req = new ApplyVoucherRequest("GIAM50K", BigDecimal.ZERO);

        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API E170-05: POST /api/v1/vouchers/apply với orderTotal âm (-100000) -> HTTP 400 Bad Request")
    void api_e170_05_orderNegative_ShouldReturn400() throws Exception {
        ApplyVoucherRequest req = new ApplyVoucherRequest("GIAM50K", new BigDecimal("-100000.00"));

        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API E170-06: POST /api/v1/vouchers/apply thiếu orderTotal (null) -> HTTP 400 Bad Request")
    void api_e170_06_orderNull_ShouldReturn400() throws Exception {
        ApplyVoucherRequest req = new ApplyVoucherRequest("GIAM50K", null);

        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API E170-07 & E170-09: POST /api/v1/vouchers/apply khi voucher chưa bắt đầu hoặc đã hết hạn -> HTTP 400 Bad Request")
    void api_e170_07_09_upcomingAndExpiredVoucher_ShouldReturn400() throws Exception {
        // Trường hợp 1: Chưa đến ngày bắt đầu
        voucherMin500k.setStartDate(FIXED_TODAY.plusDays(2));
        when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(voucherMin500k));

        ApplyVoucherRequest req = new ApplyVoucherRequest("GIAM50K", new BigDecimal("600000.00"));

        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Mã giảm giá chưa đến thời gian áp dụng."));

        // Trường hợp 2: Đã hết hạn
        voucherMin500k.setStartDate(FIXED_TODAY.minusDays(10));
        voucherMin500k.setEndDate(FIXED_TODAY.minusDays(1));

        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Mã giảm giá đã hết hạn."));
    }

    @Test
    @DisplayName("API E170-12: POST /api/v1/admin/vouchers với startDate > endDate -> HTTP 400 Bad Request")
    void api_e170_12_adminCreateVoucherInvalidDateRange_ShouldReturn400() throws Exception {
        VoucherRequest invalidReq = VoucherRequest.builder()
                .code("BADDATE")
                .name("Sai ngày kết thúc")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000.00"))
                .minOrderValue(new BigDecimal("200000.00"))
                .quantity(50)
                .startDate(LocalDate.of(2026, 11, 25))
                .endDate(LocalDate.of(2026, 11, 10))
                .build();

        mockMvc.perform(post("/api/v1/admin/vouchers")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidReq)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("API E170-13 & E170-15 & Section D: POST /api/v1/orders/checkout kết hợp sản phẩm Flash Sale + sản phẩm thường + Voucher -> HTTP 201 Created, Backend tự tính lại toàn bộ giá")
    void api_e170_13_15_checkoutWithFlashSaleAndVoucher_ShouldReturn201WithRecalculatedPrices() throws Exception {
        ProductResponse fsItem = ProductResponse.builder()
                .id(701L)
                .name("Màn hình Gaming 27 inch")
                .price(new BigDecimal("5000000.00"))
                .stockQuantity(10)
                .activeFlashSale(ActiveFlashSaleDto.builder()
                        .campaignId(1L)
                        .flashSalePrice(new BigDecimal("3500000.00"))
                        .remainingStock(5)
                        .userLimit(2)
                        .build())
                .build();

        ProductResponse normalItem = ProductResponse.builder()
                .id(702L)
                .name("Cáp DisplayPort 1.4")
                .price(new BigDecimal("200000.00"))
                .stockQuantity(30)
                .build();

        when(productClient.getProductById(701L)).thenReturn(ApiResponse.success(fsItem));
        when(productClient.getProductById(702L)).thenReturn(ApiResponse.success(normalItem));
        when(voucherRepository.findByCodeIgnoreCase("GIAM50K")).thenReturn(Optional.of(voucherMin500k));
        when(voucherRepository.incrementUsedQuantityAtomically(eq(10L), eq(FIXED_TODAY))).thenReturn(1);
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(888L);
            o.setCreatedAt(LocalDateTime.now());
            return o;
        });

        CheckoutRequest checkoutReq = CheckoutRequest.builder()
                .receiverName("Ngô Phương")
                .receiverPhone("0912345678")
                .shippingAddress("123 Cầu Giấy, Hà Nội")
                .paymentMethod(PaymentMethod.COD)
                .voucherCode("GIAM50K")
                .items(List.of(
                        CheckoutItemRequest.builder().productId(701L).quantity(1).priceAtPurchase(new BigDecimal("1000.00")).build(),
                        CheckoutItemRequest.builder().productId(702L).quantity(1).priceAtPurchase(new BigDecimal("1000.00")).build()
                ))
                .build();

        // Subtotal thực tế = 3.500.000 + 200.000 = 3.700.000đ; giảm 50.000đ = 3.650.000đ
        mockMvc.perform(post("/api/v1/orders/checkout")
                        .header("X-User-Id", 99L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(checkoutReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(888))
                .andExpect(jsonPath("$.data.subtotalAmount").value(3700000.00))
                .andExpect(jsonPath("$.data.voucherCode").value("GIAM50K"))
                .andExpect(jsonPath("$.data.discountAmount").value(50000.00))
                .andExpect(jsonPath("$.data.totalAmount").value(3650000.00))
                .andExpect(jsonPath("$.data.items[0].priceAtPurchase").value(3500000.00))
                .andExpect(jsonPath("$.data.items[1].priceAtPurchase").value(200000.00));
    }
}
