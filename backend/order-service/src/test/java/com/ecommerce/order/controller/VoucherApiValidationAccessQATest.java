package com.ecommerce.order.controller;

import com.ecommerce.order.dto.request.ApplyVoucherRequest;
import com.ecommerce.order.dto.request.VoucherRequest;
import com.ecommerce.order.dto.response.ApplyVoucherResponse;
import com.ecommerce.order.dto.response.VoucherResponse;
import com.ecommerce.order.enums.DiscountType;
import com.ecommerce.order.enums.VoucherStatus;
import com.ecommerce.order.exception.AccessDeniedException;
import com.ecommerce.order.exception.DuplicateResourceException;
import com.ecommerce.order.exception.GlobalExceptionHandler;
import com.ecommerce.order.exception.ResourceNotFoundException;
import com.ecommerce.order.service.VoucherService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-340] [BE] QA Test - API, validation và quyền truy cập (Voucher & mã giảm giá)
 * Sprint: Sprint 3
 * Parent Task: ECOM-331 ([BE] Voucher & mã giảm giá)
 * Epic: CUSTOMER (Feature: ECOM-158 Voucher & mã giảm giá)
 * PIC: NGÔ PHƯƠNG (devops-phuong)
 */
@WebMvcTest({AdminVoucherController.class, VoucherController.class})
@Import(GlobalExceptionHandler.class)
@DisplayName("[ECOM-340] QA Test - Voucher API: Validation, Phân quyền RBAC & Xử lý lỗi nghiệp vụ")
class VoucherApiValidationAccessQATest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VoucherService voucherService;

    // =========================================================================
    // NHÓM 1: PHÂN QUYỀN TRUY CẬP (ACCESS CONTROL & RBAC AUTHORIZATION)
    // =========================================================================
    @Nested
    @DisplayName("Nhóm 1: Kiểm thử Phân quyền truy cập & Bảo vệ bảo mật RBAC")
    class AccessControlTests {

        @Test
        @DisplayName("TC-340-01: Admin GET /api/v1/admin/vouchers không có header X-User-Roles -> Trả về 403 Forbidden")
        void getAllVouchers_WithoutRolesHeader_ShouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/vouchers"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Chỉ tài khoản ADMIN mới có quyền")));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-02: Admin GET /api/v1/admin/vouchers có header X-User-Roles = ROLE_USER -> Trả về 403 Forbidden")
        void getAllVouchers_WithUserRole_ShouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-03: Admin GET /api/v1/admin/vouchers với ROLE_ADMIN_VIEWER (chống substring bypass) -> Trả về 403 Forbidden")
        void getAllVouchers_WithSubstringRoleBypass_ShouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN_VIEWER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-04: Admin GET /api/v1/admin/vouchers có danh sách role chứa ROLE_ADMIN hợp lệ -> Trả về 200 OK")
        void getAllVouchers_WithMultiRolesIncludingAdmin_ShouldReturn200() throws Exception {
            VoucherResponse v = VoucherResponse.builder()
                    .id(1L)
                    .code("ECOM340")
                    .discountType(DiscountType.FIXED)
                    .discountValue(new BigDecimal("50000.00"))
                    .build();
            when(voucherService.getAllVouchers()).thenReturn(List.of(v));

            mockMvc.perform(get("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data[0].code").value("ECOM340"));

            verify(voucherService, times(1)).getAllVouchers();
        }

        @Test
        @DisplayName("TC-340-05: Customer GET /api/v1/vouchers/active với X-User-Id <= 0 (giá trị âm hoặc 0) -> Trả về 403 Forbidden")
        void getActiveVouchers_WithNegativeUserId_ShouldReturn403() throws Exception {
            mockMvc.perform(get("/api/v1/vouchers/active")
                            .header("X-User-Id", -5L))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("X-User-Id")));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-06: Customer POST /api/v1/vouchers/apply có Authorization header nhưng X-User-Id bị rỗng -> Trả về 403 Forbidden")
        void applyVoucher_WithAuthHeaderButNoUserId_ShouldReturn403() throws Exception {
            ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                    .code("GIAM50K")
                    .orderTotal(new BigDecimal("500000.00"))
                    .build();

            mockMvc.perform(post("/api/v1/vouchers/apply")
                            .header("Authorization", "Bearer mock-expired-token")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Token xác thực không hợp lệ hoặc đã hết hạn")));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-07: Security IDOR: POST /api/v1/vouchers/apply có X-User-Id=10 luôn ghi đè body userId=999")
        void applyVoucher_WithHeaderUserId_ShouldOverrideSpoofedBodyUserId() throws Exception {
            ApplyVoucherRequest request = ApplyVoucherRequest.builder()
                    .code("SAVE50")
                    .orderTotal(new BigDecimal("400000.00"))
                    .userId(999L) // Giả mạo userId khác
                    .build();

            ApplyVoucherResponse response = ApplyVoucherResponse.builder()
                    .voucher(VoucherResponse.builder().id(1L).code("SAVE50").build())
                    .discountAmount(new BigDecimal("50000.00"))
                    .finalAmount(new BigDecimal("350000.00"))
                    .build();

            when(voucherService.applyVoucher(any(ApplyVoucherRequest.class))).thenReturn(response);

            mockMvc.perform(post("/api/v1/vouchers/apply")
                            .header("X-User-Id", 10L)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));

            // Xác minh service nhận đúng userId = 10L từ Gateway, không tin body
            verify(voucherService).applyVoucher(argThat(r -> Long.valueOf(10L).equals(r.getUserId())));
        }
    }

    // =========================================================================
    // NHÓM 2: VALIDATION DỮ LIỆU ĐẦU VÀO (INPUT VALIDATION & EDGE CASES)
    // =========================================================================
    @Nested
    @DisplayName("Nhóm 2: Kiểm thử Validation dữ liệu đầu vào & Trường hợp biên")
    class InputValidationTests {

        private VoucherRequest.VoucherRequestBuilder validRequestBuilder() {
            return VoucherRequest.builder()
                    .code("GIAM50K")
                    .name("Giảm 50K cho đơn từ 300K")
                    .description("Voucher mô tả")
                    .discountType(DiscountType.FIXED)
                    .discountValue(new BigDecimal("50000.00"))
                    .minOrderValue(new BigDecimal("300000.00"))
                    .quantity(100)
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusDays(10))
                    .status(VoucherStatus.ACTIVE);
        }

        @Test
        @DisplayName("TC-340-08: Admin POST /api/v1/admin/vouchers mã voucher blank -> Trả về 400 Bad Request")
        void createVoucher_BlankCode_ShouldReturn400() throws Exception {
            VoucherRequest req = validRequestBuilder().code("   ").build();

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-09: Admin POST /api/v1/admin/vouchers mã voucher quá ngắn (< 3 ký tự) -> Trả về 400 Bad Request")
        void createVoucher_ShortCode_ShouldReturn400() throws Exception {
            VoucherRequest req = validRequestBuilder().code("AB").build();

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-10: Admin POST /api/v1/admin/vouchers mã chứa ký tự đặc biệt không hợp lệ -> Trả về 400 Bad Request")
        void createVoucher_InvalidPatternCode_ShouldReturn400() throws Exception {
            VoucherRequest req = validRequestBuilder().code("GIAM@50K!").build();

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-11: Admin POST /api/v1/admin/vouchers tên chương trình blank -> Trả về 400 Bad Request")
        void createVoucher_BlankName_ShouldReturn400() throws Exception {
            VoucherRequest req = validRequestBuilder().name("").build();

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-12: Admin POST /api/v1/admin/vouchers discountType = null -> Trả về 400 Bad Request")
        void createVoucher_NullDiscountType_ShouldReturn400() throws Exception {
            VoucherRequest req = validRequestBuilder().discountType(null).build();

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-13: Admin POST /api/v1/admin/vouchers discountValue <= 0 (giá trị âm) -> Trả về 400 Bad Request")
        void createVoucher_NegativeDiscountValue_ShouldReturn400() throws Exception {
            VoucherRequest req = validRequestBuilder().discountValue(new BigDecimal("-10000")).build();

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-14: Admin POST /api/v1/admin/vouchers PERCENT nhưng discountValue > 100% -> Trả về 400 Bad Request")
        void createVoucher_PercentExceeds100_ShouldReturn400() throws Exception {
            VoucherRequest req = validRequestBuilder()
                    .discountType(DiscountType.PERCENT)
                    .discountValue(new BigDecimal("120.00")) // Vượt quá 100%
                    .build();

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-15: Admin POST /api/v1/admin/vouchers minOrderValue âm -> Trả về 400 Bad Request")
        void createVoucher_NegativeMinOrderValue_ShouldReturn400() throws Exception {
            VoucherRequest req = validRequestBuilder().minOrderValue(new BigDecimal("-50000")).build();

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-16: Admin POST /api/v1/admin/vouchers quantity <= 0 -> Trả về 400 Bad Request")
        void createVoucher_ZeroQuantity_ShouldReturn400() throws Exception {
            VoucherRequest req = validRequestBuilder().quantity(0).build();

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-17: Admin POST /api/v1/admin/vouchers endDate < startDate -> Trả về 400 Bad Request")
        void createVoucher_EndDateBeforeStartDate_ShouldReturn400() throws Exception {
            VoucherRequest req = validRequestBuilder()
                    .startDate(LocalDate.now().plusDays(5))
                    .endDate(LocalDate.now().plusDays(2)) // Kết thúc trước bắt đầu
                    .build();

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-18: Customer POST /api/v1/vouchers/apply orderTotal null hoặc <= 0 -> Trả về 400 Bad Request")
        void applyVoucher_InvalidOrderTotal_ShouldReturn400() throws Exception {
            ApplyVoucherRequest req = ApplyVoucherRequest.builder()
                    .code("GIAM50K")
                    .orderTotal(BigDecimal.ZERO) // 0đ không hợp lệ
                    .build();

            mockMvc.perform(post("/api/v1/vouchers/apply")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }

        @Test
        @DisplayName("TC-340-19: Malformed JSON body gửi lên API -> Trả về 400 Bad Request đồng bộ")
        void createVoucher_MalformedJson_ShouldReturn400() throws Exception {
            String malformedJson = "{ \"code\": \"SALE\", \"discountValue\": \"not-a-number\" ";

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(malformedJson))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false));

            verifyNoInteractions(voucherService);
        }
    }

    // =========================================================================
    // NHÓM 3: NGHIỆP VỤ XỬ LÝ LỖI & MÃ HTTP STATUS CHUẨN
    // =========================================================================
    @Nested
    @DisplayName("Nhóm 3: Kiểm thử Mã trạng thái HTTP & Error Handling chuẩn RESTful")
    class ErrorHandlingTests {

        @Test
        @DisplayName("TC-340-20: Admin POST /api/v1/admin/vouchers trùng mã voucher -> Trả về 409 Conflict")
        void createVoucher_DuplicateCode_ShouldReturn409() throws Exception {
            VoucherRequest req = VoucherRequest.builder()
                    .code("DUPCODE")
                    .name("Voucher Trùng")
                    .discountType(DiscountType.FIXED)
                    .discountValue(new BigDecimal("30000.00"))
                    .quantity(100)
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusDays(10))
                    .build();

            when(voucherService.createVoucher(any(VoucherRequest.class)))
                    .thenThrow(new DuplicateResourceException("Mã voucher 'DUPCODE' đã tồn tại trong hệ thống"));

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isConflict())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("đã tồn tại trong hệ thống")));
        }

        @Test
        @DisplayName("TC-340-21: Admin PUT /api/v1/admin/vouchers/{id} sửa quantity < usedQuantity -> Trả về 400 Bad Request")
        void updateVoucher_QuantityLessThanUsed_ShouldReturn400() throws Exception {
            VoucherRequest req = VoucherRequest.builder()
                    .code("USEDCODE")
                    .name("Voucher Đang Dùng")
                    .discountType(DiscountType.FIXED)
                    .discountValue(new BigDecimal("30000.00"))
                    .quantity(5) // nhỏ hơn số lượt đã dùng (10)
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusDays(10))
                    .build();

            when(voucherService.updateVoucher(eq(1L), any(VoucherRequest.class)))
                    .thenThrow(new IllegalStateException("Số lượng mã (5) không được nhỏ hơn số lượt đã sử dụng (10)"));

            mockMvc.perform(put("/api/v1/admin/vouchers/1")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("không được nhỏ hơn số lượt đã sử dụng")));
        }

        @Test
        @DisplayName("TC-340-22: Admin GET /api/v1/admin/vouchers/{id} không tồn tại -> Trả về 404 Not Found")
        void getVoucherById_NotFound_ShouldReturn404() throws Exception {
            when(voucherService.getVoucherById(999L))
                    .thenThrow(new ResourceNotFoundException("Không tìm thấy voucher với ID: 999"));

            mockMvc.perform(get("/api/v1/admin/vouchers/999")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Không tìm thấy voucher với ID: 999")));
        }

        @Test
        @DisplayName("TC-340-23: Customer POST /api/v1/vouchers/apply mã không tồn tại -> Trả về 404 Not Found")
        void applyVoucher_CodeNotFound_ShouldReturn404() throws Exception {
            ApplyVoucherRequest req = ApplyVoucherRequest.builder()
                    .code("NOTEXIST")
                    .orderTotal(new BigDecimal("500000.00"))
                    .build();

            when(voucherService.applyVoucher(any(ApplyVoucherRequest.class)))
                    .thenThrow(new ResourceNotFoundException("Mã giảm giá không tồn tại: NOTEXIST"));

            mockMvc.perform(post("/api/v1/vouchers/apply")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Mã giảm giá không tồn tại")));
        }

        @Test
        @DisplayName("TC-340-24: Customer POST /api/v1/vouchers/apply mã đã hết hạn -> Trả về 400 Bad Request")
        void applyVoucher_Expired_ShouldReturn400() throws Exception {
            ApplyVoucherRequest req = ApplyVoucherRequest.builder()
                    .code("EXPIRED")
                    .orderTotal(new BigDecimal("500000.00"))
                    .build();

            when(voucherService.applyVoucher(any(ApplyVoucherRequest.class)))
                    .thenThrow(new IllegalStateException("Mã giảm giá đã hết hạn."));

            mockMvc.perform(post("/api/v1/vouchers/apply")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Mã giảm giá đã hết hạn."));
        }

        @Test
        @DisplayName("TC-340-25: Customer POST /api/v1/vouchers/apply đơn < minOrderValue -> Trả về 400 Bad Request")
        void applyVoucher_BelowMinOrderValue_ShouldReturn400() throws Exception {
            ApplyVoucherRequest req = ApplyVoucherRequest.builder()
                    .code("MIN500K")
                    .orderTotal(new BigDecimal("300000.00"))
                    .build();

            when(voucherService.applyVoucher(any(ApplyVoucherRequest.class)))
                    .thenThrow(new IllegalStateException("Đơn hàng tối thiểu 500000.00đ để sử dụng mã này."));

            mockMvc.perform(post("/api/v1/vouchers/apply")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value(containsString("Đơn hàng tối thiểu")));
        }

        @Test
        @DisplayName("TC-340-26: Customer POST /api/v1/vouchers/apply người dùng đã dùng mã -> Trả về 400 Bad Request")
        void applyVoucher_UserAlreadyUsed_ShouldReturn400() throws Exception {
            ApplyVoucherRequest req = ApplyVoucherRequest.builder()
                    .code("ONCEONLY")
                    .orderTotal(new BigDecimal("500000.00"))
                    .userId(10L)
                    .build();

            when(voucherService.applyVoucher(any(ApplyVoucherRequest.class)))
                    .thenThrow(new IllegalStateException("Bạn đã sử dụng mã giảm giá này rồi."));

            mockMvc.perform(post("/api/v1/vouchers/apply")
                            .header("X-User-Id", 10L)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Bạn đã sử dụng mã giảm giá này rồi."));
        }
    }

    // =========================================================================
    // NHÓM 4: NGHIỆP VỤ THÀNH CÔNG (HAPPY PATHS & TOÀN VẸN DỮ LIỆU)
    // =========================================================================
    @Nested
    @DisplayName("Nhóm 4: Kiểm thử Luồng nghiệp vụ thành công (Happy Paths)")
    class HappyPathTests {

        @Test
        @DisplayName("TC-340-27: Admin POST /api/v1/admin/vouchers hợp lệ -> Trả về 201 Created kèm thông tin voucher")
        void createVoucher_Success_ShouldReturn201() throws Exception {
            VoucherRequest req = VoucherRequest.builder()
                    .code("PROMO100K")
                    .name("Chương trình chào bạn mới")
                    .discountType(DiscountType.FIXED)
                    .discountValue(new BigDecimal("100000.00"))
                    .minOrderValue(new BigDecimal("500000.00"))
                    .quantity(50)
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusDays(15))
                    .status(VoucherStatus.ACTIVE)
                    .build();

            VoucherResponse resp = VoucherResponse.builder()
                    .id(20L)
                    .code("PROMO100K")
                    .name("Chương trình chào bạn mới")
                    .discountType(DiscountType.FIXED)
                    .discountValue(new BigDecimal("100000.00"))
                    .status(VoucherStatus.ACTIVE)
                    .build();

            when(voucherService.createVoucher(any(VoucherRequest.class))).thenReturn(resp);

            mockMvc.perform(post("/api/v1/admin/vouchers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(20L))
                    .andExpect(jsonPath("$.data.code").value("PROMO100K"));
        }

        @Test
        @DisplayName("TC-340-28: Admin PUT /api/v1/admin/vouchers/{id} thành công -> Trả về 200 OK")
        void updateVoucher_Success_ShouldReturn200() throws Exception {
            VoucherRequest req = VoucherRequest.builder()
                    .code("PROMO100K")
                    .name("Tên đã cập nhật")
                    .discountType(DiscountType.FIXED)
                    .discountValue(new BigDecimal("100000.00"))
                    .quantity(150)
                    .startDate(LocalDate.now())
                    .endDate(LocalDate.now().plusDays(20))
                    .build();

            VoucherResponse resp = VoucherResponse.builder()
                    .id(20L)
                    .code("PROMO100K")
                    .name("Tên đã cập nhật")
                    .quantity(150)
                    .build();

            when(voucherService.updateVoucher(eq(20L), any(VoucherRequest.class))).thenReturn(resp);

            mockMvc.perform(put("/api/v1/admin/vouchers/20")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.name").value("Tên đã cập nhật"));
        }

        @Test
        @DisplayName("TC-340-29: Admin PATCH /api/v1/admin/vouchers/{id}/toggle-status thành công -> Trả về 200 OK")
        void toggleVoucherStatus_Success_ShouldReturn200() throws Exception {
            VoucherResponse resp = VoucherResponse.builder()
                    .id(20L)
                    .code("PROMO100K")
                    .status(VoucherStatus.INACTIVE)
                    .build();

            when(voucherService.toggleVoucherStatus(20L)).thenReturn(resp);

            mockMvc.perform(patch("/api/v1/admin/vouchers/20/toggle-status")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("INACTIVE"));
        }

        @Test
        @DisplayName("TC-340-30: Admin DELETE /api/v1/admin/vouchers/{id} thành công -> Trả về 200 OK")
        void deleteVoucher_Success_ShouldReturn200() throws Exception {
            doNothing().when(voucherService).deleteVoucher(20L);

            mockMvc.perform(delete("/api/v1/admin/vouchers/20")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Xóa voucher thành công"));
        }

        @Test
        @DisplayName("TC-340-31: Customer POST /api/v1/vouchers/apply FIXED thành công -> Trả về 200 OK kèm mức giảm và finalAmount")
        void applyVoucher_FixedSuccess_ShouldReturn200() throws Exception {
            ApplyVoucherRequest req = ApplyVoucherRequest.builder()
                    .code("GIAM50K")
                    .orderTotal(new BigDecimal("500000.00"))
                    .build();

            ApplyVoucherResponse resp = ApplyVoucherResponse.builder()
                    .voucher(VoucherResponse.builder().id(1L).code("GIAM50K").build())
                    .discountAmount(new BigDecimal("50000.00"))
                    .finalAmount(new BigDecimal("450000.00"))
                    .build();

            when(voucherService.applyVoucher(any(ApplyVoucherRequest.class))).thenReturn(resp);

            mockMvc.perform(post("/api/v1/vouchers/apply")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.discountAmount").value(50000.00))
                    .andExpect(jsonPath("$.data.finalAmount").value(450000.00));
        }

        @Test
        @DisplayName("TC-340-32: Customer POST /api/v1/vouchers/apply PERCENT có trần maxDiscount thành công -> Trả về 200 OK")
        void applyVoucher_PercentWithMaxDiscount_ShouldReturn200() throws Exception {
            ApplyVoucherRequest req = ApplyVoucherRequest.builder()
                    .code("GIAM20PCT")
                    .orderTotal(new BigDecimal("1000000.00"))
                    .build();

            ApplyVoucherResponse resp = ApplyVoucherResponse.builder()
                    .voucher(VoucherResponse.builder().id(2L).code("GIAM20PCT").build())
                    .discountAmount(new BigDecimal("100000.00")) // chạm trần 100K thay vì 200K
                    .finalAmount(new BigDecimal("900000.00"))
                    .build();

            when(voucherService.applyVoucher(any(ApplyVoucherRequest.class))).thenReturn(resp);

            mockMvc.perform(post("/api/v1/vouchers/apply")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(req)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.discountAmount").value(100000.00))
                    .andExpect(jsonPath("$.data.finalAmount").value(900000.00));
        }
    }
}
