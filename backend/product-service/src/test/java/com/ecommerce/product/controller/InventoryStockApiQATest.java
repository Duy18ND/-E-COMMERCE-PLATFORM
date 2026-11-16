package com.ecommerce.product.controller;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.ecommerce.product.dto.request.StockAdjustmentRequest;
import com.ecommerce.product.dto.request.StockInboundRequest;
import com.ecommerce.product.dto.request.StockReservationItem;
import com.ecommerce.product.dto.response.ProductResponse;
import com.ecommerce.product.dto.response.ProductStockResponse;
import com.ecommerce.product.enums.ProductStatus;
import com.ecommerce.product.exception.GlobalExceptionHandler;
import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.service.ProductService;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * =============================================================================
 * TASK ECOM-287: [BE] QA Test - API, validation và quyền truy cập
 * Epic: [BE] Quản lý tồn kho (ECOM-280 / ECOM-136)
 * =============================================================================
 * Bộ kiểm thử toàn diện cho hệ thống API Quản lý tồn kho:
 * 1. Functional API Testing: Inbound, Adjust-Stock, Check Stock, Reserve, Restore.
 * 2. Validation & Negative Cases: Null, giá trị âm, rỗng, vượt độ dài 255 ký tự, 404, 409.
 * 3. Security & Access Control: Header X-User-Roles, RBAC ADMIN/USER, chống false-positive.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ECOM-287: QA Test Suite - Quản lý tồn kho (API, Validation & Phân quyền)")
class InventoryStockApiQATest {

    private MockMvc mockMvc;

    @Mock
    private ProductService productService;

    @InjectMocks
    private ProductController productController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private ProductResponse sampleActiveProduct;
    private ProductResponse sampleOutOfStockProduct;

    @BeforeEach
    void setUp() {
        jakarta.validation.Validator validator = jakarta.validation.Validation.buildDefaultValidatorFactory()
                .getValidator();
        org.springframework.aop.framework.ProxyFactory proxyFactory = new org.springframework.aop.framework.ProxyFactory(
                productController);
        proxyFactory.setProxyTargetClass(true);
        proxyFactory.addAdvice(new org.springframework.validation.beanvalidation.MethodValidationInterceptor(
                validator));
        ProductController proxiedController = (ProductController) proxyFactory.getProxy();

        mockMvc = MockMvcBuilders.standaloneSetup(proxiedController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        sampleActiveProduct = ProductResponse.builder()
                .id(1L)
                .name("iPhone 15 Pro Max")
                .price(BigDecimal.valueOf(1299.99))
                .stockQuantity(30)
                .status(ProductStatus.ACTIVE)
                .category("Điện thoại")
                .build();

        sampleOutOfStockProduct = ProductResponse.builder()
                .id(2L)
                .name("MacBook Pro M3 Max")
                .price(BigDecimal.valueOf(3199.99))
                .stockQuantity(0)
                .status(ProductStatus.OUT_OF_STOCK)
                .category("Laptop")
                .build();
    }

    // =========================================================================
    // NHÓM 1: FUNCTIONAL API TESTS (CHỨC NĂNG HỢP LỆ)
    // =========================================================================
    @Nested
    @DisplayName("1. Functional API Tests - Nghiệp vụ kho hợp lệ")
    class FunctionalApiTests {

        @Test
        @DisplayName("TC-ECOM-287-01: [Inbound] Admin nhập thêm hàng thành công, cập nhật tồn kho")
        void testInboundStockSuccess_ActiveProduct() throws Exception {
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(20)
                    .note("Nhập lô hàng chính hãng đợt 2")
                    .build();

            ProductResponse updated = ProductResponse.builder()
                    .id(1L)
                    .name("iPhone 15 Pro Max")
                    .stockQuantity(50)
                    .status(ProductStatus.ACTIVE)
                    .build();

            when(productService.inboundStock(eq(1L), any(StockInboundRequest.class))).thenReturn(updated);

            mockMvc.perform(post("/api/v1/products/1/inbound")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Nhập kho thành công"))
                    .andExpect(jsonPath("$.data.id").value(1))
                    .andExpect(jsonPath("$.data.stockQuantity").value(50))
                    .andExpect(jsonPath("$.data.status").value("ACTIVE"));

            verify(productService, times(1)).inboundStock(eq(1L), any(StockInboundRequest.class));
        }

        @Test
        @DisplayName("TC-ECOM-287-02: [Inbound] Sản phẩm OUT_OF_STOCK nhập hàng tự chuyển sang ACTIVE")
        void testInboundStockSuccess_RestoreActiveFromOutOfStock() throws Exception {
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(15)
                    .note("Bổ sung hàng sau khi hết hàng")
                    .build();

            ProductResponse updated = ProductResponse.builder()
                    .id(2L)
                    .name("MacBook Pro M3 Max")
                    .stockQuantity(15)
                    .status(ProductStatus.ACTIVE)
                    .build();

            when(productService.inboundStock(eq(2L), any(StockInboundRequest.class))).thenReturn(updated);

            mockMvc.perform(post("/api/v1/products/2/inbound")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.stockQuantity").value(15))
                    .andExpect(jsonPath("$.data.status").value("ACTIVE"));
        }

        @Test
        @DisplayName("TC-ECOM-287-03: [Inbound] Nhập kho không truyền ghi chú (note = null) vẫn hợp lệ")
        void testInboundStockSuccess_WithoutNote() throws Exception {
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(10)
                    .build();

            when(productService.inboundStock(eq(1L), any(StockInboundRequest.class))).thenReturn(sampleActiveProduct);

            mockMvc.perform(post("/api/v1/products/1/inbound")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("TC-ECOM-287-04: [AdjustStock] Admin điều chỉnh tồn kho kiểm kê thành công (> 0)")
        void testAdjustStockSuccess_PositiveStock() throws Exception {
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(45)
                    .reason("Biên bản kiểm kê kho định kỳ quý 4")
                    .build();

            ProductResponse updated = ProductResponse.builder()
                    .id(1L)
                    .name("iPhone 15 Pro Max")
                    .stockQuantity(45)
                    .status(ProductStatus.ACTIVE)
                    .build();

            when(productService.adjustStock(eq(1L), any(StockAdjustmentRequest.class))).thenReturn(updated);

            mockMvc.perform(post("/api/v1/products/1/adjust-stock")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Điều chỉnh tồn kho thành công"))
                    .andExpect(jsonPath("$.data.stockQuantity").value(45))
                    .andExpect(jsonPath("$.data.status").value("ACTIVE"));

            verify(productService, times(1)).adjustStock(eq(1L), any(StockAdjustmentRequest.class));
        }

        @Test
        @DisplayName("TC-ECOM-287-05: [AdjustStock] Điều chỉnh actualStock = 0 tự động chuyển sang OUT_OF_STOCK")
        void testAdjustStockSuccess_ZeroStockSetsOutOfStock() throws Exception {
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(0)
                    .reason("Hàng trưng bày bị hư hỏng, kho về 0")
                    .build();

            ProductResponse updated = ProductResponse.builder()
                    .id(1L)
                    .name("iPhone 15 Pro Max")
                    .stockQuantity(0)
                    .status(ProductStatus.OUT_OF_STOCK)
                    .build();

            when(productService.adjustStock(eq(1L), any(StockAdjustmentRequest.class))).thenReturn(updated);

            mockMvc.perform(post("/api/v1/products/1/adjust-stock")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.stockQuantity").value(0))
                    .andExpect(jsonPath("$.data.status").value("OUT_OF_STOCK"));
        }

        @Test
        @DisplayName("TC-ECOM-287-06: [AdjustStock] Điều chỉnh từ 0 lên > 0 tự động khôi phục ACTIVE")
        void testAdjustStockSuccess_RestoreActiveFromZero() throws Exception {
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(12)
                    .reason("Tìm thấy hàng lưu kho bổ sung")
                    .build();

            ProductResponse updated = ProductResponse.builder()
                    .id(2L)
                    .name("MacBook Pro M3 Max")
                    .stockQuantity(12)
                    .status(ProductStatus.ACTIVE)
                    .build();

            when(productService.adjustStock(eq(2L), any(StockAdjustmentRequest.class))).thenReturn(updated);

            mockMvc.perform(post("/api/v1/products/2/adjust-stock")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.stockQuantity").value(12))
                    .andExpect(jsonPath("$.data.status").value("ACTIVE"));
        }

        @Test
        @DisplayName("TC-ECOM-287-07: [StockCheck] Public API kiểm tra tồn kho khi còn đủ hàng")
        void testCheckStock_Sufficient() throws Exception {
            ProductStockResponse response = ProductStockResponse.builder()
                    .productId(1L)
                    .productName("iPhone 15 Pro Max")
                    .stockQuantity(30)
                    .requestedQuantity(5)
                    .inStock(true)
                    .sufficientStock(true)
                    .stockStatusMessage("Còn hàng (30 sản phẩm có sẵn)")
                    .build();

            when(productService.checkProductStock(1L, 5)).thenReturn(response);

            mockMvc.perform(get("/api/v1/products/1/stock").param("quantity", "5"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.inStock").value(true))
                    .andExpect(jsonPath("$.data.sufficientStock").value(true))
                    .andExpect(jsonPath("$.data.stockQuantity").value(30));
        }

        @Test
        @DisplayName("TC-ECOM-287-08: [StockCheck] Public API kiểm tra tồn kho khi thiếu hàng (insufficient)")
        void testCheckStock_Insufficient() throws Exception {
            ProductStockResponse response = ProductStockResponse.builder()
                    .productId(1L)
                    .productName("iPhone 15 Pro Max")
                    .stockQuantity(2)
                    .requestedQuantity(10)
                    .inStock(true)
                    .sufficientStock(false)
                    .stockStatusMessage("Không đủ số lượng yêu cầu (Chỉ còn 2 sản phẩm)")
                    .build();

            when(productService.checkProductStock(1L, 10)).thenReturn(response);

            mockMvc.perform(get("/api/v1/products/1/stock").param("quantity", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.inStock").value(true))
                    .andExpect(jsonPath("$.data.sufficientStock").value(false));
        }

        @Test
        @DisplayName("TC-ECOM-287-09: [StockCheck] Public API kiểm tra tồn kho khi sản phẩm đã hết hàng")
        void testCheckStock_OutOfStock() throws Exception {
            ProductStockResponse response = ProductStockResponse.builder()
                    .productId(2L)
                    .productName("MacBook Pro M3 Max")
                    .stockQuantity(0)
                    .requestedQuantity(1)
                    .inStock(false)
                    .sufficientStock(false)
                    .stockStatusMessage("Sản phẩm đã hết hàng")
                    .build();

            when(productService.checkProductStock(2L, 1)).thenReturn(response);

            mockMvc.perform(get("/api/v1/products/2/stock"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.inStock").value(false))
                    .andExpect(jsonPath("$.data.sufficientStock").value(false))
                    .andExpect(jsonPath("$.data.stockQuantity").value(0));
        }

        @Test
        @DisplayName("TC-ECOM-287-10: [Reserve & Restore] Đặt trước và khôi phục tồn kho thành công")
        void testReserveAndRestoreStockSuccess() throws Exception {
            List<StockReservationItem> items = List.of(
                    StockReservationItem.builder().productId(1L).quantity(3).build());

            doNothing().when(productService).reserveStock(any());
            doNothing().when(productService).restoreStock(any());

            // Reserve
            mockMvc.perform(post("/api/v1/products/reserve-stock")
                    .header("X-Internal-Service-Key", "ecommerce-internal-service-secret-2026")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(items)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Đặt trước tồn kho thành công"));

            // Restore
            mockMvc.perform(post("/api/v1/products/restore-stock")
                    .header("X-Internal-Service-Key", "ecommerce-internal-service-secret-2026")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(items)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message").value("Khôi phục tồn kho thành công"));
        }
    }

    // =========================================================================
    // NHÓM 2: VALIDATION & NEGATIVE TEST CASES (DỮ LIỆU SAI & BIÊN)
    // =========================================================================
    @Nested
    @DisplayName("2. Validation & Negative Test Cases - Dữ liệu sai & Xử lý ngoại lệ")
    class ValidationNegativeTests {

        @Test
        @DisplayName("TC-ECOM-287-11: [Inbound] Chặn khi body rỗng {} (400 Bad Request)")
        void testInboundStock_EmptyBody() throws Exception {
            mockMvc.perform(post("/api/v1/products/1/inbound")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Validation Failed"))
                    .andExpect(jsonPath("$.errors.quantity").value("Số lượng nhập kho không được để trống"));
        }

        @Test
        @DisplayName("TC-ECOM-287-12: [Inbound] Chặn số lượng nhập bằng 0 (quantity = 0)")
        void testInboundStock_ZeroQuantity() throws Exception {
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(0)
                    .note("Nhập thử 0")
                    .build();

            mockMvc.perform(post("/api/v1/products/1/inbound")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.quantity").value("Số lượng nhập kho phải lớn hơn hoặc bằng 1"));
        }

        @Test
        @DisplayName("TC-ECOM-287-13: [Inbound] Chặn số lượng nhập âm (quantity < 0)")
        void testInboundStock_NegativeQuantity() throws Exception {
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(-25)
                    .note("Nhập số âm")
                    .build();

            mockMvc.perform(post("/api/v1/products/1/inbound")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.quantity").value("Số lượng nhập kho phải lớn hơn hoặc bằng 1"));
        }

        @Test
        @DisplayName("TC-ECOM-287-14: [Inbound] Chặn ghi chú vượt quá 255 ký tự")
        void testInboundStock_NoteExceedsMaxLength() throws Exception {
            String longNote = "A".repeat(256);
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(10)
                    .note(longNote)
                    .build();

            mockMvc.perform(post("/api/v1/products/1/inbound")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.note").value("Ghi chú không được vượt quá 255 ký tự"));
        }

        @Test
        @DisplayName("TC-ECOM-287-15: [Inbound] Trả về 404 khi ID sản phẩm không tồn tại")
        void testInboundStock_ProductNotFound() throws Exception {
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(10)
                    .note("Hàng về")
                    .build();

            when(productService.inboundStock(eq(9999L), any(StockInboundRequest.class)))
                    .thenThrow(new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: 9999"));

            mockMvc.perform(post("/api/v1/products/9999/inbound")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.error").value("Not Found"))
                    .andExpect(jsonPath("$.message").value("Không tìm thấy sản phẩm với ID: 9999"));
        }

        @Test
        @DisplayName("TC-ECOM-287-16: [AdjustStock] Chặn khi body rỗng {} (400 Bad Request)")
        void testAdjustStock_EmptyBody() throws Exception {
            mockMvc.perform(post("/api/v1/products/1/adjust-stock")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Validation Failed"))
                    .andExpect(jsonPath("$.errors.actualStock").value("Số lượng tồn kho thực tế không được để trống"))
                    .andExpect(jsonPath("$.errors.reason").value("Lý do điều chỉnh kho không được để trống"));
        }

        @Test
        @DisplayName("TC-ECOM-287-17: [AdjustStock] Chặn tồn kho thực tế âm (actualStock < 0)")
        void testAdjustStock_NegativeActualStock() throws Exception {
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(-1)
                    .reason("Kiểm kê âm")
                    .build();

            mockMvc.perform(post("/api/v1/products/1/adjust-stock")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.actualStock").value("Số lượng tồn kho sau điều chỉnh không được nhỏ hơn 0"));
        }

        @Test
        @DisplayName("TC-ECOM-287-18: [AdjustStock] Chặn khi lý do điều chỉnh để trống hoặc toàn khoảng trắng")
        void testAdjustStock_BlankReason() throws Exception {
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(10)
                    .reason("     ")
                    .build();

            mockMvc.perform(post("/api/v1/products/1/adjust-stock")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.reason").value("Lý do điều chỉnh kho không được để trống"));
        }

        @Test
        @DisplayName("TC-ECOM-287-19: [AdjustStock] Chặn lý do điều chỉnh vượt quá 255 ký tự")
        void testAdjustStock_ReasonExceedsMaxLength() throws Exception {
            String longReason = "R".repeat(256);
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(10)
                    .reason(longReason)
                    .build();

            mockMvc.perform(post("/api/v1/products/1/adjust-stock")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.errors.reason").value("Lý do không được vượt quá 255 ký tự"));
        }

        @Test
        @DisplayName("TC-ECOM-287-20: [AdjustStock] Trả về 404 khi ID sản phẩm không tồn tại")
        void testAdjustStock_ProductNotFound() throws Exception {
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(5)
                    .reason("Kiểm kê")
                    .build();

            when(productService.adjustStock(eq(8888L), any(StockAdjustmentRequest.class)))
                    .thenThrow(new ResourceNotFoundException("Không tìm thấy sản phẩm với ID: 8888"));

            mockMvc.perform(post("/api/v1/products/8888/adjust-stock")
                    .header("X-User-Roles", "ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.message").value("Không tìm thấy sản phẩm với ID: 8888"));
        }

        @Test
        @DisplayName("TC-ECOM-287-21: [ReserveStock] Trả về 409 Conflict khi tồn kho không đủ")
        void testReserveStock_InsufficientStockConflict() throws Exception {
            List<StockReservationItem> items = List.of(
                    StockReservationItem.builder().productId(1L).quantity(999).build());

            doThrow(new NotEnoughStockException("Sản phẩm 'iPhone 15 Pro Max' không đủ số lượng tồn kho (Còn lại: 30, yêu cầu: 999)"))
                    .when(productService).reserveStock(any());

            mockMvc.perform(post("/api/v1/products/reserve-stock")
                    .header("X-Internal-Service-Key", "ecommerce-internal-service-secret-2026")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(items)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.error").value("Conflict"))
                    .andExpect(jsonPath("$.message").value("Sản phẩm 'iPhone 15 Pro Max' không đủ số lượng tồn kho (Còn lại: 30, yêu cầu: 999)"));
        }

        @Test
        @DisplayName("TC-ECOM-287-22: [ReserveStock] Chặn danh sách đặt trước rỗng (400 Bad Request)")
        void testReserveStock_EmptyList() throws Exception {
            mockMvc.perform(post("/api/v1/products/reserve-stock")
                    .header("X-Internal-Service-Key", "ecommerce-internal-service-secret-2026")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("[]"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error").value("Validation Failed"));
        }
    }

    // =========================================================================
    // NHÓM 3: AUTHORIZATION & ACCESS CONTROL (PHÂN QUYỀN & TRUY CẬP)
    // =========================================================================
    @Nested
    @DisplayName("3. Authorization & Access Control - Phân quyền & Kiểm soát truy cập")
    class AuthorizationAccessControlTests {

        @Test
        @DisplayName("TC-ECOM-287-23: [Inbound] Trả về 403 Forbidden khi thiếu header X-User-Roles")
        void testInboundStock_MissingRolesHeader() throws Exception {
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(10)
                    .note("Không gửi header role")
                    .build();

            mockMvc.perform(post("/api/v1/products/1/inbound")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error").value("Forbidden"))
                    .andExpect(jsonPath("$.message").value("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này"));

            verify(productService, never()).inboundStock(any(), any());
        }

        @Test
        @DisplayName("TC-ECOM-287-24: [Inbound] Trả về 403 Forbidden khi người gọi chỉ có role ROLE_USER")
        void testInboundStock_CustomerRoleForbidden() throws Exception {
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(10)
                    .note("User thường cố tình nhập kho")
                    .build();

            mockMvc.perform(post("/api/v1/products/1/inbound")
                    .header("X-User-Roles", "ROLE_USER")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error").value("Forbidden"))
                    .andExpect(jsonPath("$.message").value("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này"));

            verify(productService, never()).inboundStock(any(), any());
        }

        @Test
        @DisplayName("TC-ECOM-287-25: [Inbound] Chống giả mạo quyền: ROLE_ADMIN_VIEWER bị chặn 403")
        void testInboundStock_FakeAdminRoleForbidden() throws Exception {
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(10)
                    .build();

            mockMvc.perform(post("/api/v1/products/1/inbound")
                    .header("X-User-Roles", "ROLE_ADMIN_VIEWER")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error").value("Forbidden"));

            verify(productService, never()).inboundStock(any(), any());
        }

        @Test
        @DisplayName("TC-ECOM-287-26: [Inbound] Chấp nhận khi tài khoản có nhiều role chứa ROLE_ADMIN")
        void testInboundStock_MultiRolesAllowed() throws Exception {
            StockInboundRequest request = StockInboundRequest.builder()
                    .quantity(5)
                    .build();

            when(productService.inboundStock(eq(1L), any())).thenReturn(sampleActiveProduct);

            mockMvc.perform(post("/api/v1/products/1/inbound")
                    .header("X-User-Roles", "ROLE_USER,ROLE_ADMIN,ROLE_STAFF")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("TC-ECOM-287-27: [AdjustStock] Trả về 403 Forbidden khi thiếu header X-User-Roles")
        void testAdjustStock_MissingRolesHeader() throws Exception {
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(10)
                    .reason("Không header")
                    .build();

            mockMvc.perform(post("/api/v1/products/1/adjust-stock")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error").value("Forbidden"))
                    .andExpect(jsonPath("$.message").value("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này"));

            verify(productService, never()).adjustStock(any(), any());
        }

        @Test
        @DisplayName("TC-ECOM-287-28: [AdjustStock] Trả về 403 Forbidden khi người gọi là ROLE_USER")
        void testAdjustStock_UserRoleForbidden() throws Exception {
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(10)
                    .reason("User điều chỉnh")
                    .build();

            mockMvc.perform(post("/api/v1/products/1/adjust-stock")
                    .header("X-User-Roles", "ROLE_USER")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error").value("Forbidden"));

            verify(productService, never()).adjustStock(any(), any());
        }

        @Test
        @DisplayName("TC-ECOM-287-29: [AdjustStock] Chống giả mạo: ROLE_SUPERADMIN bị chặn nếu không có ROLE_ADMIN chính xác")
        void testAdjustStock_SubstringMatchPrevented() throws Exception {
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(10)
                    .reason("Fake role")
                    .build();

            mockMvc.perform(post("/api/v1/products/1/adjust-stock")
                    .header("X-User-Roles", "ROLE_ADMINISTRATOR")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.error").value("Forbidden"));
        }

        @Test
        @DisplayName("TC-ECOM-287-30: [AdjustStock] Chấp nhận header có dấu cách: 'ROLE_USER, ROLE_ADMIN'")
        void testAdjustStock_WhitespaceInRolesAllowed() throws Exception {
            StockAdjustmentRequest request = StockAdjustmentRequest.builder()
                    .actualStock(20)
                    .reason("Đúng quyền")
                    .build();

            when(productService.adjustStock(eq(1L), any())).thenReturn(sampleActiveProduct);

            mockMvc.perform(post("/api/v1/products/1/adjust-stock")
                    .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("TC-ECOM-287-31: [StockCheck] Public Endpoint không yêu cầu bất kỳ header xác thực nào")
        void testStockCheck_PublicAccessNoAuthRequired() throws Exception {
            ProductStockResponse response = ProductStockResponse.builder()
                    .productId(1L)
                    .inStock(true)
                    .sufficientStock(true)
                    .stockQuantity(30)
                    .build();

            when(productService.checkProductStock(1L, 1)).thenReturn(response);

            // Gọi hoàn toàn không có header Authorization hay X-User-Roles
            mockMvc.perform(get("/api/v1/products/1/stock"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }
}
