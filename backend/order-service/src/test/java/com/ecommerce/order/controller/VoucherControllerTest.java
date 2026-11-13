package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.ApplyVoucherRequest;
import com.ecommerce.order.dto.request.VoucherRequest;
import com.ecommerce.order.dto.response.ApplyVoucherResponse;
import com.ecommerce.order.dto.response.VoucherResponse;
import com.ecommerce.order.enums.DiscountType;
import com.ecommerce.order.enums.VoucherStatus;
import com.ecommerce.order.exception.DuplicateResourceException;
import com.ecommerce.order.service.VoucherService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({AdminVoucherController.class, VoucherController.class})
class VoucherControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VoucherService voucherService;

    // =========================================================================
    // Admin Voucher Controller Tests
    // =========================================================================

    @Test
    @DisplayName("Admin: GET /api/v1/admin/vouchers không có ROLE_ADMIN -> Trả về 403 Forbidden")
    void getAllVouchers_WithoutAdminRole_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/vouchers")
                        .header("X-User-Roles", "ROLE_USER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(voucherService);
    }

    @Test
    @DisplayName("Admin: GET /api/v1/admin/vouchers có ROLE_ADMIN -> Trả về 200 OK")
    void getAllVouchers_WithAdminRole_ShouldReturn200() throws Exception {
        VoucherResponse v = VoucherResponse.builder()
                .id(1L)
                .code("GIAM50K")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000.00"))
                .build();
        when(voucherService.getAllVouchers()).thenReturn(List.of(v));

        mockMvc.perform(get("/api/v1/admin/vouchers")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("GIAM50K"));
    }

    @Test
    @DisplayName("Admin: GET /api/v1/admin/vouchers/{id} có ROLE_ADMIN -> Trả về 200 OK")
    void getVoucherById_WithAdminRole_ShouldReturn200() throws Exception {
        VoucherResponse v = VoucherResponse.builder()
                .id(1L)
                .code("GIAM50K")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("50000.00"))
                .build();
        when(voucherService.getVoucherById(1L)).thenReturn(v);

        mockMvc.perform(get("/api/v1/admin/vouchers/1")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1L))
                .andExpect(jsonPath("$.data.code").value("GIAM50K"));
    }

    @Test
    @DisplayName("Admin: POST /api/v1/admin/vouchers hợp lệ -> Trả về 201 Created")
    void createVoucher_Valid_ShouldReturn201() throws Exception {
        VoucherRequest request = VoucherRequest.builder()
                .code("GIAM30K")
                .name("Giảm 30K đơn đầu ngày")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("30000.00"))
                .minOrderValue(new BigDecimal("150000.00"))
                .quantity(100)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(10))
                .build();

        VoucherResponse response = VoucherResponse.builder()
                .id(10L)
                .code("GIAM30K")
                .name("Giảm 30K đơn đầu ngày")
                .build();

        when(voucherService.createVoucher(any(VoucherRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/admin/vouchers")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10L))
                .andExpect(jsonPath("$.data.code").value("GIAM30K"));
    }

    @Test
    @DisplayName("Admin: PUT /api/v1/admin/vouchers/{id} hợp lệ -> Trả về 200 OK")
    void updateVoucher_Valid_ShouldReturn200() throws Exception {
        VoucherRequest request = VoucherRequest.builder()
                .code("GIAM30K_EDIT")
                .name("Giảm 30K sửa đổi")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("30000.00"))
                .minOrderValue(new BigDecimal("200000.00"))
                .quantity(120)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(15))
                .build();

        VoucherResponse response = VoucherResponse.builder()
                .id(1L)
                .code("GIAM30K_EDIT")
                .name("Giảm 30K sửa đổi")
                .quantity(120)
                .build();

        when(voucherService.updateVoucher(eq(1L), any(VoucherRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/v1/admin/vouchers/1")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.code").value("GIAM30K_EDIT"));
    }

    @Test
    @DisplayName("Admin: POST /api/v1/admin/vouchers trùng mã voucher -> Trả về 409 Conflict")
    void createVoucher_DuplicateCode_ShouldReturn409() throws Exception {
        VoucherRequest request = VoucherRequest.builder()
                .code("GIAM30K")
                .name("Giảm 30K")
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("30000.00"))
                .quantity(100)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(10))
                .build();

        when(voucherService.createVoucher(any(VoucherRequest.class)))
                .thenThrow(new DuplicateResourceException("Mã voucher 'GIAM30K' đã tồn tại trong hệ thống"));

        mockMvc.perform(post("/api/v1/admin/vouchers")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Mã voucher 'GIAM30K' đã tồn tại trong hệ thống"));
    }

    @Test
    @DisplayName("Admin: POST /api/v1/admin/vouchers dữ liệu không hợp lệ (mã trống, giá trị giảm <= 0) -> Trả về 400 Bad Request")
    void createVoucher_InvalidValidation_ShouldReturn400() throws Exception {
        VoucherRequest request = VoucherRequest.builder()
                .code("") // blank
                .name("") // blank
                .discountType(DiscountType.FIXED)
                .discountValue(new BigDecimal("-1000")) // negative
                .quantity(0) // < 1
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().minusDays(1)) // end before start
                .build();

        mockMvc.perform(post("/api/v1/admin/vouchers")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(voucherService);
    }

    @Test
    @DisplayName("Admin: PATCH /api/v1/admin/vouchers/{id}/toggle-status -> Trả về 200 OK")
    void toggleVoucherStatus_ShouldReturn200() throws Exception {
        VoucherResponse response = VoucherResponse.builder()
                .id(1L)
                .code("GIAM50K")
                .status(VoucherStatus.INACTIVE)
                .build();
        when(voucherService.toggleVoucherStatus(1L)).thenReturn(response);

        mockMvc.perform(patch("/api/v1/admin/vouchers/1/toggle-status")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("INACTIVE"));
    }

    @Test
    @DisplayName("Admin: DELETE /api/v1/admin/vouchers/{id} -> Trả về 200 OK")
    void deleteVoucher_ShouldReturn200() throws Exception {
        doNothing().when(voucherService).deleteVoucher(1L);

        mockMvc.perform(delete("/api/v1/admin/vouchers/1")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa voucher thành công"));
    }

    // =========================================================================
    // Customer Voucher Controller Tests
    // =========================================================================

    @Test
    @DisplayName("Customer: GET /api/v1/vouchers/active -> Trả về 200 OK kèm danh sách voucher khả dụng")
    void getActiveVouchers_ShouldReturn200() throws Exception {
        VoucherResponse v = VoucherResponse.builder()
                .id(1L)
                .code("GIAM50K")
                .status(VoucherStatus.ACTIVE)
                .build();
        when(voucherService.getActiveVouchers()).thenReturn(List.of(v));

        mockMvc.perform(get("/api/v1/vouchers/active"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("GIAM50K"));
    }

    @Test
    @DisplayName("Customer: POST /api/v1/vouchers/apply hợp lệ -> Trả về 200 OK kèm số tiền giảm")
    void applyVoucher_Valid_ShouldReturn200() throws Exception {
        ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                .code("GIAM50K")
                .orderTotal(new BigDecimal("500000.00"))
                .build();

        ApplyVoucherResponse response = ApplyVoucherResponse.builder()
                .voucher(VoucherResponse.builder().id(1L).code("GIAM50K").build())
                .discountAmount(new BigDecimal("50000.00"))
                .finalAmount(new BigDecimal("450000.00"))
                .build();

        when(voucherService.applyVoucher(any(ApplyVoucherRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.discountAmount").value(50000.00))
                .andExpect(jsonPath("$.data.finalAmount").value(450000.00));
    }

    @Test
    @DisplayName("Customer: POST /api/v1/vouchers/apply thiếu mã giảm giá -> Trả về 400 Bad Request")
    void applyVoucher_MissingCode_ShouldReturn400() throws Exception {
        ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                .code("") // blank
                .orderTotal(new BigDecimal("500000.00"))
                .build();

        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(voucherService);
    }

    @Test
    @DisplayName("[Task ECOM-167] Customer: GET /api/v1/vouchers/active kèm X-User-Id -> Gọi getAvailableVouchersForUser")
    void getActiveVouchers_WithUserIdHeader_ShouldCallGetAvailableVouchersForUser() throws Exception {
        VoucherResponse v = VoucherResponse.builder()
                .id(2L)
                .code("SALE10")
                .status(VoucherStatus.ACTIVE)
                .build();
        when(voucherService.getAvailableVouchersForUser(15L)).thenReturn(List.of(v));

        mockMvc.perform(get("/api/v1/vouchers/active")
                        .header("X-User-Id", 15L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("SALE10"));

        verify(voucherService, times(1)).getAvailableVouchersForUser(15L);
    }

    @Test
    @DisplayName("[Fix-3] Security IDOR: GET /api/v1/vouchers/active?userId=25 không có X-User-Id -> Coi là khách vãng lai, KHÔNG gọi getAvailableVouchersForUser(25)")
    void getActiveVouchers_WithUserIdQueryParamWithoutHeader_ShouldIgnoreQueryParamAndTreatAsGuest() throws Exception {
        VoucherResponse v = VoucherResponse.builder()
                .id(3L)
                .code("FREESHIP")
                .status(VoucherStatus.ACTIVE)
                .build();
        when(voucherService.getActiveVouchers()).thenReturn(List.of(v));

        mockMvc.perform(get("/api/v1/vouchers/active")
                        .param("userId", "25"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("FREESHIP"));

        verify(voucherService, times(1)).getActiveVouchers();
        verify(voucherService, never()).getAvailableVouchersForUser(any());
    }

    @Test
    @DisplayName("[Task ECOM-167] Customer: GET /api/v1/vouchers/active?userId=25 khớp với X-User-Id=25 -> Gọi getAvailableVouchersForUser")
    void getActiveVouchers_WithMatchingHeaderAndQueryUserId_ShouldCallGetAvailableVouchersForUser() throws Exception {
        VoucherResponse v = VoucherResponse.builder()
                .id(3L)
                .code("FREESHIP")
                .status(VoucherStatus.ACTIVE)
                .build();
        when(voucherService.getAvailableVouchersForUser(25L)).thenReturn(List.of(v));

        mockMvc.perform(get("/api/v1/vouchers/active")
                        .header("X-User-Id", 25L)
                        .param("userId", "25"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("FREESHIP"));

        verify(voucherService, times(1)).getAvailableVouchersForUser(25L);
        verify(voucherService, never()).getActiveVouchers();
    }

    @Test
    @DisplayName("[Fix-3] Security IDOR: GET /api/v1/vouchers/active?userId=999 kèm X-User-Id=15 -> Chỉ dùng X-User-Id=15")
    void getActiveVouchers_WithHeaderAndSpoofedQueryParam_ShouldUseHeaderUserIdOnly() throws Exception {
        VoucherResponse v = VoucherResponse.builder()
                .id(2L)
                .code("SALE10")
                .status(VoucherStatus.ACTIVE)
                .build();
        when(voucherService.getAvailableVouchersForUser(15L)).thenReturn(List.of(v));

        mockMvc.perform(get("/api/v1/vouchers/active")
                        .header("X-User-Id", 15L)
                        .param("userId", "999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("SALE10"));

        verify(voucherService, times(1)).getAvailableVouchersForUser(15L);
        verify(voucherService, never()).getAvailableVouchersForUser(999L);
    }

    @Test
    @DisplayName("[Fix-3] Security: GET /api/v1/vouchers/active có Authorization header nhưng thiếu X-User-Id -> 403 Forbidden")
    void getActiveVouchers_WithAuthHeaderButNoUserId_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/vouchers/active")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(voucherService);
    }

    @Test
    @DisplayName("[Task ECOM-167] Security: POST /api/v1/vouchers/apply có X-User-Id luôn ghi đè userId giả mạo trong body")
    void applyVoucher_WithHeaderAndSpoofedBodyUserId_ShouldOverrideWithHeaderUserId() throws Exception {
        ApplyVoucherRequest spoofedRequest = ApplyVoucherRequest.builder()
                .code("SAVE10")
                .orderTotal(new BigDecimal("300000.00"))
                .userId(999L)
                .build();

        ApplyVoucherResponse response = ApplyVoucherResponse.builder()
                .voucher(VoucherResponse.builder().id(1L).code("SAVE10").build())
                .discountAmount(new BigDecimal("30000.00"))
                .finalAmount(new BigDecimal("270000.00"))
                .build();

        when(voucherService.applyVoucher(any(ApplyVoucherRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/vouchers/apply")
                        .header("X-User-Id", 10L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(spoofedRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(voucherService).applyVoucher(argThat(req -> Long.valueOf(10L).equals(req.getUserId())));
    }

    @Test
    @DisplayName("[Task ECOM-339] Admin: GET /api/v1/admin/vouchers với ROLE_ADMIN_VIEWER (substring bypass) -> Trả về 403 Forbidden")
    void getAllVouchers_WithRoleAdminViewer_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/vouchers")
                        .header("X-User-Roles", "ROLE_ADMIN_VIEWER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(voucherService);
    }
}

