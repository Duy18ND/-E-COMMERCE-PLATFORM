package com.ecommerce.product.controller;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.ecommerce.product.dto.request.CreateFlashSaleCampaignRequest;
import com.ecommerce.product.dto.request.FlashSaleItemRequest;
import com.ecommerce.product.dto.request.FlashSaleReserveRequest;
import com.ecommerce.product.dto.response.FlashSaleCampaignResponse;
import com.ecommerce.product.dto.response.FlashSaleItemResponse;
import com.ecommerce.product.exception.GlobalExceptionHandler;
import com.ecommerce.product.exception.NotEnoughStockException;
import com.ecommerce.product.exception.ResourceNotFoundException;
import com.ecommerce.product.service.FlashSaleService;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * =============================================================================
 * TASK ECOM-307: [BE] QA Test - API, validation và quyền truy cập
 * Parent Task: ECOM-298 ([BE] Flash Sale)
 * Epic: GUEST / ECOM-157 (Flash Sale System / ECOM-158)
 * Sprint: SPRINT 2
 * PIC: NGÔ PHƯƠNG
 * =============================================================================
 * Bộ kiểm thử toàn diện cho hệ thống Flash Sale Backend APIs:
 * 1. Phân quyền và Bảo mật RBAC (Header X-User-Roles, Guest, User, Admin).
 * 2. API Khách hàng & Công khai (Tra cứu chiến dịch hiệu lực, Đặt chỗ tồn kho Redis Lua).
 * 3. Quản trị Chiến dịch Flash Sale CRUD (Xem danh sách, Chi tiết, Tạo mới, Sửa, Đổi trạng thái, Xóa, Khởi tạo).
 * 4. Validation Dữ liệu, Biên và Xử lý ngoại lệ (Tên, Thời gian, Giá, Tồn kho, Giới hạn mua, Trùng lặp).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ECOM-307: QA Test Suite - Flash Sale (API, Validation & Phân quyền)")
class FlashSaleApiQATest {

    private MockMvc mockMvc;

    @Mock
    private FlashSaleService flashSaleService;

    @InjectMocks
    private FlashSaleController flashSaleController;

    private ObjectMapper objectMapper;

    private FlashSaleCampaignResponse sampleCampaign;
    private FlashSaleCampaignResponse activeCampaign;
    private CreateFlashSaleCampaignRequest validCampaignRequest;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().findAndRegisterModules();

        jakarta.validation.Validator validator = jakarta.validation.Validation.buildDefaultValidatorFactory()
                .getValidator();
        org.springframework.aop.framework.ProxyFactory proxyFactory = new org.springframework.aop.framework.ProxyFactory(
                flashSaleController);
        proxyFactory.setProxyTargetClass(true);
        proxyFactory.addAdvice(new org.springframework.validation.beanvalidation.MethodValidationInterceptor(
                validator));
        FlashSaleController proxiedController = (FlashSaleController) proxyFactory.getProxy();

        mockMvc = MockMvcBuilders.standaloneSetup(proxiedController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        FlashSaleItemResponse itemResp = FlashSaleItemResponse.builder()
                .id(1L)
                .productId(101L)
                .productName("Điện thoại thông minh Pro Max")
                .originalPrice(new BigDecimal("20000000.00"))
                .flashSalePrice(new BigDecimal("15000000.00"))
                .quantity(50)
                .soldQuantity(10)
                .remainingStock(40)
                .userLimit(2)
                .category("Điện tử")
                .build();

        sampleCampaign = FlashSaleCampaignResponse.builder()
                .id(1L)
                .name("Flash Sale Công Nghệ Giờ Vàng")
                .startTime(LocalDateTime.now().minusHours(1))
                .endTime(LocalDateTime.now().plusHours(3))
                .status("UPCOMING")
                .items(List.of(itemResp))
                .build();

        activeCampaign = FlashSaleCampaignResponse.builder()
                .id(2L)
                .name("Flash Sale Đại Tiệc Cuối Tuần")
                .startTime(LocalDateTime.now().minusMinutes(30))
                .endTime(LocalDateTime.now().plusHours(2))
                .status("ACTIVE")
                .items(List.of(itemResp))
                .build();

        validCampaignRequest = CreateFlashSaleCampaignRequest.builder()
                .name("Flash Sale Mùa Hè 2026")
                .startTime(LocalDateTime.now().plusDays(1))
                .endTime(LocalDateTime.now().plusDays(1).plusHours(4))
                .items(List.of(FlashSaleItemRequest.builder()
                        .productId(101L)
                        .flashSalePrice(new BigDecimal("15000000.00"))
                        .quantity(50)
                        .userLimit(2)
                        .build()))
                .build();
    }

    // =========================================================================
    // 1. KIỂM THỬ PHÂN QUYỀN TRUY CẬP (RBAC & SECURITY DEFENSE-IN-DEPTH)
    // =========================================================================

    @Nested
    @DisplayName("1. Phân quyền và Bảo mật (RBAC & Header X-User-Roles)")
    class RbacAndSecurityTests {

        @Test
        @DisplayName("TC-307-SEC-01: Guest truy cập GET /api/v1/admin/flash-sales/campaigns không có header -> 403 Forbidden")
        void getAllCampaigns_GuestWithoutHeader_ShouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/flash-sales/campaigns"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.error").value("Forbidden"))
                    .andExpect(jsonPath("$.message").value(containsString("ROLE_ADMIN")));

            verify(flashSaleService, never()).getAllCampaigns();
        }

        @Test
        @DisplayName("TC-307-SEC-02: Guest truy cập GET /api/v1/admin/flash-sales/campaigns/{id} không có header -> 403 Forbidden")
        void getCampaignById_GuestWithoutHeader_ShouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/flash-sales/campaigns/1"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.error").value("Forbidden"));

            verify(flashSaleService, never()).getCampaignById(anyLong());
        }

        @Test
        @DisplayName("TC-307-SEC-03: Guest truy cập POST /api/v1/admin/flash-sales/campaigns không có header -> 403 Forbidden")
        void createCampaign_GuestWithoutHeader_ShouldReturn403() throws Exception {
            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validCampaignRequest)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.message").value(containsString("ROLE_ADMIN")));

            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-SEC-04: Guest truy cập PUT /api/v1/admin/flash-sales/campaigns/{id} không có header -> 403 Forbidden")
        void updateCampaign_GuestWithoutHeader_ShouldReturn403() throws Exception {
            mockMvc.perform(put("/api/v1/admin/flash-sales/campaigns/1")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validCampaignRequest)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            verify(flashSaleService, never()).updateCampaign(anyLong(), any());
        }

        @Test
        @DisplayName("TC-307-SEC-05: Guest truy cập PUT /api/v1/admin/flash-sales/campaigns/{id}/status không có header -> 403 Forbidden")
        void updateCampaignStatus_GuestWithoutHeader_ShouldReturn403() throws Exception {
            mockMvc.perform(put("/api/v1/admin/flash-sales/campaigns/1/status")
                            .param("status", "ACTIVE"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            verify(flashSaleService, never()).updateCampaignStatus(anyLong(), any());
        }

        @Test
        @DisplayName("TC-307-SEC-06: Guest truy cập DELETE /api/v1/admin/flash-sales/campaigns/{id} không có header -> 403 Forbidden")
        void deleteCampaign_GuestWithoutHeader_ShouldReturn403() throws Exception {
            mockMvc.perform(delete("/api/v1/admin/flash-sales/campaigns/1"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            verify(flashSaleService, never()).deleteCampaign(anyLong());
        }

        @Test
        @DisplayName("TC-307-SEC-07: Guest truy cập POST /api/v1/admin/flash-sales/products/{productId} không có header -> 403 Forbidden")
        void initFlashSaleStock_GuestWithoutHeader_ShouldReturn403() throws Exception {
            mockMvc.perform(post("/api/v1/admin/flash-sales/products/101")
                            .param("stock", "50"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.message").value(containsString("ROLE_ADMIN")));

            verify(flashSaleService, never()).initFlashSaleStock(anyLong(), anyInt());
        }

        @Test
        @DisplayName("TC-307-SEC-08: Người dùng thông thường (ROLE_USER) truy cập các Admin APIs -> 403 Forbidden")
        void adminApis_UserRoleOnly_ShouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_USER")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validCampaignRequest)))
                    .andExpect(status().isForbidden());

            mockMvc.perform(put("/api/v1/admin/flash-sales/campaigns/1/status")
                            .header("X-User-Roles", "ROLE_USER")
                            .param("status", "ACTIVE"))
                    .andExpect(status().isForbidden());

            verify(flashSaleService, never()).getAllCampaigns();
            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-SEC-09: Tài khoản có quyền ROLE_ADMIN hoặc multi-roles hợp lệ -> Được phép truy cập (200 / 201)")
        void adminApis_WithValidAdminRole_ShouldSucceed() throws Exception {
            when(flashSaleService.getAllCampaigns()).thenReturn(List.of(sampleCampaign));

            mockMvc.perform(get("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data[0].id").value(1));

            verify(flashSaleService).getAllCampaigns();
        }
    }

    // =========================================================================
    // 2. KIỂM THỬ API PUBLIC & KHÁCH HÀNG (DISCOVERY & RESERVATION)
    // =========================================================================

    @Nested
    @DisplayName("2. API Khách hàng và Công khai (Public Discovery & Stock Reservation)")
    class PublicAndCustomerApiTests {

        @Test
        @DisplayName("TC-307-PUB-01: Guest tra cứu chiến dịch Flash Sale hiệu lực GET /api/v1/flash-sales/active -> 200 OK")
        void getActiveFlashSales_Guest_ShouldReturn200() throws Exception {
            when(flashSaleService.getActiveCampaigns()).thenReturn(List.of(activeCampaign));

            mockMvc.perform(get("/api/v1/flash-sales/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value(containsString("thành công")))
                    .andExpect(jsonPath("$.data[0].name").value("Flash Sale Đại Tiệc Cuối Tuần"))
                    .andExpect(jsonPath("$.data[0].status").value("ACTIVE"))
                    .andExpect(jsonPath("$.data[0].items[0].productId").value(101L))
                    .andExpect(jsonPath("$.data[0].items[0].flashSalePrice").value(15000000.00));

            verify(flashSaleService).getActiveCampaigns();
        }

        @Test
        @DisplayName("TC-307-PUB-02: Guest tra cứu khi không có chiến dịch nào hiệu lực -> 200 OK và data mảng rỗng")
        void getActiveFlashSales_Empty_ShouldReturn200WithEmptyList() throws Exception {
            when(flashSaleService.getActiveCampaigns()).thenReturn(Collections.emptyList());

            mockMvc.perform(get("/api/v1/flash-sales/active"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data").isEmpty());

            verify(flashSaleService).getActiveCampaigns();
        }

        @Test
        @DisplayName("TC-307-PUB-03: Khách hàng đặt chỗ tồn kho Flash Sale POST /api/v1/flash-sales/reserve thành công -> 200 OK")
        void reserveFlashSaleStock_Success_ShouldReturn200() throws Exception {
            FlashSaleReserveRequest req = new FlashSaleReserveRequest(101L, 2);
            doNothing().when(flashSaleService).reserveFlashSaleStock(101L, 2);

            mockMvc.perform(post("/api/v1/flash-sales/reserve")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value(containsString("Đặt chỗ Flash Sale thành công!")));

            verify(flashSaleService).reserveFlashSaleStock(101L, 2);
        }

        @Test
        @DisplayName("TC-307-PUB-04: Đặt chỗ thất bại khi sản phẩm hết hàng Flash Sale (NotEnoughStockException) -> 409 Conflict")
        void reserveFlashSaleStock_OutOfStock_ShouldReturn409() throws Exception {
            FlashSaleReserveRequest req = new FlashSaleReserveRequest(101L, 1);
            doThrow(new NotEnoughStockException("Đã cháy hàng Flash Sale!"))
                    .when(flashSaleService).reserveFlashSaleStock(101L, 1);

            mockMvc.perform(post("/api/v1/flash-sales/reserve")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.status").value(409))
                    .andExpect(jsonPath("$.error").value("Conflict"))
                    .andExpect(jsonPath("$.message").value(containsString("cháy hàng")));

            verify(flashSaleService).reserveFlashSaleStock(101L, 1);
        }

        @Test
        @DisplayName("TC-307-PUB-05: Đặt chỗ thất bại khi sản phẩm không thuộc Flash Sale (ResourceNotFoundException) -> 404 Not Found")
        void reserveFlashSaleStock_NotInFlashSale_ShouldReturn404() throws Exception {
            FlashSaleReserveRequest req = new FlashSaleReserveRequest(999L, 1);
            doThrow(new ResourceNotFoundException("Sản phẩm không nằm trong chương trình Flash Sale"))
                    .when(flashSaleService).reserveFlashSaleStock(999L, 1);

            mockMvc.perform(post("/api/v1/flash-sales/reserve")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.error").value("Not Found"))
                    .andExpect(jsonPath("$.message").value(containsString("không nằm trong chương trình Flash Sale")));

            verify(flashSaleService).reserveFlashSaleStock(999L, 1);
        }

        @Test
        @DisplayName("TC-307-PUB-06: Đặt chỗ với quantity <= 0 hoặc null -> 400 Bad Request")
        void reserveFlashSaleStock_InvalidQuantity_ShouldReturn400() throws Exception {
            FlashSaleReserveRequest invalidZero = new FlashSaleReserveRequest(101L, 0);

            mockMvc.perform(post("/api/v1/flash-sales/reserve")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidZero)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.quantity").value(containsString("lớn hơn 0")));

            FlashSaleReserveRequest invalidNull = new FlashSaleReserveRequest(101L, null);

            mockMvc.perform(post("/api/v1/flash-sales/reserve")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidNull)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));

            verify(flashSaleService, never()).reserveFlashSaleStock(anyLong(), anyInt());
        }

        @Test
        @DisplayName("TC-307-PUB-07: Đặt chỗ với productId == null -> 400 Bad Request")
        void reserveFlashSaleStock_NullProductId_ShouldReturn400() throws Exception {
            FlashSaleReserveRequest invalidReq = new FlashSaleReserveRequest(null, 2);

            mockMvc.perform(post("/api/v1/flash-sales/reserve")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidReq)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.productId").value(containsString("không được để trống")));

            verify(flashSaleService, never()).reserveFlashSaleStock(any(), anyInt());
        }
    }

    // =========================================================================
    // 3. KIỂM THỬ QUẢN TRỊ CHIẾN DỊCH FLASH SALE (ADMIN CRUD)
    // =========================================================================

    @Nested
    @DisplayName("3. API Quản trị Chiến dịch Flash Sale (CRUD Flow)")
    class AdminCampaignCrudTests {

        @Test
        @DisplayName("TC-307-CRUD-01: Admin xem toàn bộ danh sách chiến dịch GET /api/v1/admin/flash-sales/campaigns -> 200 OK")
        void getAllCampaigns_AsAdmin_ShouldReturn200() throws Exception {
            when(flashSaleService.getAllCampaigns()).thenReturn(List.of(sampleCampaign, activeCampaign));

            mockMvc.perform(get("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.length()").value(2))
                    .andExpect(jsonPath("$.data[0].id").value(1))
                    .andExpect(jsonPath("$.data[1].id").value(2));

            verify(flashSaleService).getAllCampaigns();
        }

        @Test
        @DisplayName("TC-307-CRUD-02: Admin xem chi tiết chiến dịch tồn tại GET /api/v1/admin/flash-sales/campaigns/1 -> 200 OK")
        void getCampaignById_Exists_ShouldReturn200() throws Exception {
            when(flashSaleService.getCampaignById(1L)).thenReturn(sampleCampaign);

            mockMvc.perform(get("/api/v1/admin/flash-sales/campaigns/1")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(1))
                    .andExpect(jsonPath("$.data.name").value("Flash Sale Công Nghệ Giờ Vàng"));

            verify(flashSaleService).getCampaignById(1L);
        }

        @Test
        @DisplayName("TC-307-CRUD-03: Admin xem chi tiết chiến dịch không tồn tại -> 404 Not Found")
        void getCampaignById_NotFound_ShouldReturn404() throws Exception {
            when(flashSaleService.getCampaignById(999L))
                    .thenThrow(new ResourceNotFoundException("Không tìm thấy chiến dịch Flash Sale với ID: 999"));

            mockMvc.perform(get("/api/v1/admin/flash-sales/campaigns/999")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.message").value(containsString("Không tìm thấy chiến dịch Flash Sale")));

            verify(flashSaleService).getCampaignById(999L);
        }

        @Test
        @DisplayName("TC-307-CRUD-04: Admin tạo mới chiến dịch thành công POST /api/v1/admin/flash-sales/campaigns -> 201 Created")
        void createCampaign_Success_ShouldReturn201() throws Exception {
            FlashSaleCampaignResponse createdResponse = FlashSaleCampaignResponse.builder()
                    .id(10L)
                    .name("Flash Sale Mùa Hè 2026")
                    .status("UPCOMING")
                    .build();

            when(flashSaleService.createCampaign(any())).thenReturn(createdResponse);

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validCampaignRequest)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value(containsString("Tạo chiến dịch Flash Sale thành công")))
                    .andExpect(jsonPath("$.data.id").value(10))
                    .andExpect(jsonPath("$.data.status").value("UPCOMING"));

            verify(flashSaleService).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-CRUD-05: Admin cập nhật chiến dịch thành công PUT /api/v1/admin/flash-sales/campaigns/1 -> 200 OK")
        void updateCampaign_Success_ShouldReturn200() throws Exception {
            FlashSaleCampaignResponse updatedResponse = FlashSaleCampaignResponse.builder()
                    .id(1L)
                    .name("Flash Sale Mùa Hè 2026 Đã Cập Nhật")
                    .status("UPCOMING")
                    .build();

            when(flashSaleService.updateCampaign(eq(1L), any())).thenReturn(updatedResponse);

            mockMvc.perform(put("/api/v1/admin/flash-sales/campaigns/1")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validCampaignRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(1))
                    .andExpect(jsonPath("$.data.name").value("Flash Sale Mùa Hè 2026 Đã Cập Nhật"));

            verify(flashSaleService).updateCampaign(eq(1L), any());
        }

        @Test
        @DisplayName("TC-307-CRUD-06: Admin cập nhật trạng thái hợp lệ (ENDED, ACTIVE, CANCELLED) -> 200 OK")
        void updateCampaignStatus_Success_ShouldReturn200() throws Exception {
            FlashSaleCampaignResponse endedResponse = FlashSaleCampaignResponse.builder()
                    .id(1L)
                    .status("ENDED")
                    .build();

            when(flashSaleService.updateCampaignStatus(eq(1L), eq("ENDED"))).thenReturn(endedResponse);

            mockMvc.perform(put("/api/v1/admin/flash-sales/campaigns/1/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("status", "ENDED"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("ENDED"));

            verify(flashSaleService).updateCampaignStatus(eq(1L), eq("ENDED"));
        }

        @Test
        @DisplayName("TC-307-CRUD-07: Admin xóa chiến dịch DELETE /api/v1/admin/flash-sales/campaigns/1 -> 200 OK")
        void deleteCampaign_Success_ShouldReturn200() throws Exception {
            doNothing().when(flashSaleService).deleteCampaign(1L);

            mockMvc.perform(delete("/api/v1/admin/flash-sales/campaigns/1")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value(containsString("Xóa chiến dịch Flash Sale thành công")));

            verify(flashSaleService).deleteCampaign(1L);
        }

        @Test
        @DisplayName("TC-307-CRUD-08: Admin khởi tạo trực tiếp tồn kho Flash Sale cho 1 sản phẩm lên Redis -> 200 OK")
        void initFlashSaleStock_Success_ShouldReturn200() throws Exception {
            doNothing().when(flashSaleService).initFlashSaleStock(101L, 100);

            mockMvc.perform(post("/api/v1/admin/flash-sales/products/101")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("stock", "100"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value(containsString("Flash Sale đã được kích hoạt cho sản phẩm 101 với 100 sản phẩm")));

            verify(flashSaleService).initFlashSaleStock(101L, 100);
        }
    }

    // =========================================================================
    // 4. KIỂM THỬ VALIDATION, DỮ LIỆU SAI & BIÊN (VALIDATION & EDGE CASES)
    // =========================================================================

    @Nested
    @DisplayName("4. Kiểm thử Validation, Dữ liệu không hợp lệ & Biên (Edge Cases)")
    class ValidationAndBoundaryTests {

        @Test
        @DisplayName("TC-307-VAL-01: Tên chiến dịch để trống hoặc toàn khoảng trắng -> 400 Bad Request")
        void createCampaign_BlankName_ShouldReturn400() throws Exception {
            CreateFlashSaleCampaignRequest req = CreateFlashSaleCampaignRequest.builder()
                    .name("   ")
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(1).plusHours(2))
                    .items(validCampaignRequest.getItems())
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.name").value(containsString("Tên chiến dịch Flash Sale không được để trống")));

            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-02: Tên chiến dịch vượt quá 200 ký tự -> 400 Bad Request")
        void createCampaign_NameExceeds200Chars_ShouldReturn400() throws Exception {
            String longName = "A".repeat(201);
            CreateFlashSaleCampaignRequest req = CreateFlashSaleCampaignRequest.builder()
                    .name(longName)
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(1).plusHours(2))
                    .items(validCampaignRequest.getItems())
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.name").value(containsString("không được vượt quá 200 ký tự")));

            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-03: Thời gian bắt đầu hoặc kết thúc bị null -> 400 Bad Request")
        void createCampaign_NullDates_ShouldReturn400() throws Exception {
            CreateFlashSaleCampaignRequest nullStart = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Test")
                    .startTime(null)
                    .endTime(LocalDateTime.now().plusHours(2))
                    .items(validCampaignRequest.getItems())
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(nullStart)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.startTime").value(containsString("không được để trống")));

            CreateFlashSaleCampaignRequest nullEnd = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Test")
                    .startTime(LocalDateTime.now().plusHours(1))
                    .endTime(null)
                    .items(validCampaignRequest.getItems())
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(nullEnd)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.endTime").value(containsString("không được để trống")));

            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-04: Thời gian kết thúc trước hoặc bằng thời gian bắt đầu (endTime <= startTime) -> 400 Bad Request")
        void createCampaign_InvalidTimeRange_ShouldReturn400() throws Exception {
            LocalDateTime start = LocalDateTime.now().plusDays(2);
            CreateFlashSaleCampaignRequest reversedTime = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Đảo Giờ")
                    .startTime(start)
                    .endTime(start.minusHours(1))
                    .items(validCampaignRequest.getItems())
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(reversedTime)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));

            CreateFlashSaleCampaignRequest equalTime = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Trùng Giờ")
                    .startTime(start)
                    .endTime(start)
                    .items(validCampaignRequest.getItems())
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(equalTime)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));

            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-05: Danh sách items rỗng hoặc null -> 400 Bad Request")
        void createCampaign_EmptyOrNullItems_ShouldReturn400() throws Exception {
            CreateFlashSaleCampaignRequest emptyItems = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Không Sản Phẩm")
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(1).plusHours(2))
                    .items(Collections.emptyList())
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(emptyItems)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.errors.items").value(containsString("ít nhất 1 sản phẩm")));

            CreateFlashSaleCampaignRequest nullItems = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Null Items")
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(1).plusHours(2))
                    .items(null)
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(nullItems)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));

            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-06: Item thiếu productId -> 400 Bad Request")
        void createCampaign_ItemMissingProductId_ShouldReturn400() throws Exception {
            FlashSaleItemRequest invalidItem = FlashSaleItemRequest.builder()
                    .productId(null)
                    .flashSalePrice(new BigDecimal("100000.00"))
                    .quantity(10)
                    .userLimit(1)
                    .build();

            CreateFlashSaleCampaignRequest req = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Lỗi ID")
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(1).plusHours(2))
                    .items(List.of(invalidItem))
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));

            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-07: Item có flashSalePrice <= 0 hoặc null -> 400 Bad Request")
        void createCampaign_ItemInvalidPrice_ShouldReturn400() throws Exception {
            FlashSaleItemRequest zeroPrice = FlashSaleItemRequest.builder()
                    .productId(101L)
                    .flashSalePrice(BigDecimal.ZERO)
                    .quantity(10)
                    .userLimit(1)
                    .build();

            CreateFlashSaleCampaignRequest reqZero = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Giá 0")
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(1).plusHours(2))
                    .items(List.of(zeroPrice))
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(reqZero)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));

            FlashSaleItemRequest nullPrice = FlashSaleItemRequest.builder()
                    .productId(101L)
                    .flashSalePrice(null)
                    .quantity(10)
                    .userLimit(1)
                    .build();

            CreateFlashSaleCampaignRequest reqNull = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Giá Null")
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(1).plusHours(2))
                    .items(List.of(nullPrice))
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(reqNull)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));

            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-08: Item có quantity < 1 hoặc null -> 400 Bad Request")
        void createCampaign_ItemInvalidQuantity_ShouldReturn400() throws Exception {
            FlashSaleItemRequest zeroQty = FlashSaleItemRequest.builder()
                    .productId(101L)
                    .flashSalePrice(new BigDecimal("100000.00"))
                    .quantity(0)
                    .userLimit(1)
                    .build();

            CreateFlashSaleCampaignRequest reqZero = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale SL 0")
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(1).plusHours(2))
                    .items(List.of(zeroQty))
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(reqZero)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));

            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-09: Item có userLimit < 1 hoặc null -> 400 Bad Request")
        void createCampaign_ItemInvalidUserLimit_ShouldReturn400() throws Exception {
            FlashSaleItemRequest zeroLimit = FlashSaleItemRequest.builder()
                    .productId(101L)
                    .flashSalePrice(new BigDecimal("100000.00"))
                    .quantity(10)
                    .userLimit(0)
                    .build();

            CreateFlashSaleCampaignRequest reqZero = CreateFlashSaleCampaignRequest.builder()
                    .name("Sale Limit 0")
                    .startTime(LocalDateTime.now().plusDays(1))
                    .endTime(LocalDateTime.now().plusDays(1).plusHours(2))
                    .items(List.of(zeroLimit))
                    .build();

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(reqZero)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));

            verify(flashSaleService, never()).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-10: Giá Flash Sale lớn hơn hoặc bằng giá gốc niêm yết -> 400 Bad Request (Business Validation)")
        void createCampaign_PriceNotLowerThanOriginalPrice_ShouldReturn400() throws Exception {
            when(flashSaleService.createCampaign(any()))
                    .thenThrow(new IllegalArgumentException("Giá Flash Sale phải nhỏ hơn giá gốc niêm yết"));

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validCampaignRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value(containsString("nhỏ hơn giá gốc")));

            verify(flashSaleService).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-11: Số lượng Flash Sale vượt quá tồn kho thực tế của sản phẩm -> 400 Bad Request")
        void createCampaign_QuantityExceedsProductStock_ShouldReturn400() throws Exception {
            when(flashSaleService.createCampaign(any()))
                    .thenThrow(new IllegalArgumentException("Số lượng Flash Sale vượt quá tồn kho thực tế của sản phẩm"));

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validCampaignRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value(containsString("vượt quá tồn kho thực tế")));

            verify(flashSaleService).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-12: Sản phẩm bị trùng lặp trong cùng một chiến dịch Flash Sale -> 400 Bad Request")
        void createCampaign_DuplicateProductInCampaign_ShouldReturn400() throws Exception {
            when(flashSaleService.createCampaign(any()))
                    .thenThrow(new IllegalArgumentException("Sản phẩm ID 101 bị trùng lặp trong cùng một chiến dịch"));

            mockMvc.perform(post("/api/v1/admin/flash-sales/campaigns")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validCampaignRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value(containsString("bị trùng lặp")));

            verify(flashSaleService).createCampaign(any());
        }

        @Test
        @DisplayName("TC-307-VAL-13: Cập nhật trạng thái chiến dịch không hợp lệ -> 400 Bad Request")
        void updateCampaignStatus_InvalidStatusString_ShouldReturn400() throws Exception {
            when(flashSaleService.updateCampaignStatus(eq(1L), eq("INVALID_STATUS")))
                    .thenThrow(new IllegalArgumentException("Trạng thái chiến dịch không hợp lệ: 'INVALID_STATUS'"));

            mockMvc.perform(put("/api/v1/admin/flash-sales/campaigns/1/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("status", "INVALID_STATUS"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value(containsString("Trạng thái chiến dịch không hợp lệ")));

            verify(flashSaleService).updateCampaignStatus(eq(1L), eq("INVALID_STATUS"));
        }

        @Test
        @DisplayName("TC-307-VAL-14: Cập nhật số lượng mới nhỏ hơn số lượng đã bán -> 400 Bad Request")
        void updateCampaign_QuantityLessThanSoldQuantity_ShouldReturn400() throws Exception {
            when(flashSaleService.updateCampaign(eq(1L), any()))
                    .thenThrow(new IllegalArgumentException("Số lượng Flash Sale mới (5) không được nhỏ hơn số lượng đã bán (10)"));

            mockMvc.perform(put("/api/v1/admin/flash-sales/campaigns/1")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(validCampaignRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value(containsString("không được nhỏ hơn số lượng đã bán")));

            verify(flashSaleService).updateCampaign(eq(1L), any());
        }

        @Test
        @DisplayName("TC-307-VAL-15: Kích hoạt chiến dịch đã quá thời gian kết thúc -> 400 Bad Request")
        void updateCampaignStatus_ActivateExpiredCampaign_ShouldReturn400() throws Exception {
            when(flashSaleService.updateCampaignStatus(eq(1L), eq("ACTIVE")))
                    .thenThrow(new IllegalArgumentException("Không thể kích hoạt chiến dịch đã quá thời gian kết thúc"));

            mockMvc.perform(put("/api/v1/admin/flash-sales/campaigns/1/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("status", "ACTIVE"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.message").value(containsString("Không thể kích hoạt chiến dịch đã quá thời gian kết thúc")));

            verify(flashSaleService).updateCampaignStatus(eq(1L), eq("ACTIVE"));
        }

        @Test
        @DisplayName("TC-307-VAL-16: Xóa hoặc cập nhật chiến dịch với ID không tồn tại -> 404 Not Found")
        void campaignCrud_NotFoundId_ShouldReturn404() throws Exception {
            doThrow(new ResourceNotFoundException("Không tìm thấy chiến dịch Flash Sale với ID: 999999"))
                    .when(flashSaleService).deleteCampaign(999999L);

            mockMvc.perform(delete("/api/v1/admin/flash-sales/campaigns/999999")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.message").value(containsString("Không tìm thấy chiến dịch Flash Sale")));

            verify(flashSaleService).deleteCampaign(999999L);
        }
    }
}
