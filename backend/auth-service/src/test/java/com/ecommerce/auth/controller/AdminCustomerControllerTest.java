package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.request.UpdateUserStatusRequest;
import com.ecommerce.auth.dto.response.PagedResponse;
import com.ecommerce.auth.dto.response.UserProfileResponse;
import com.ecommerce.auth.dto.response.UserSummaryResponse;
import com.ecommerce.auth.enums.UserStatus;
import com.ecommerce.auth.exception.GlobalExceptionHandler;
import com.ecommerce.auth.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-145 / ECOM-325] Unit test kiểm thử controller quản lý khách hàng cho Admin.
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 */
@ExtendWith(MockitoExtension.class)
class AdminCustomerControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @InjectMocks
    private AdminCustomerController adminCustomerController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminCustomerController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // ==============================================================
    // RBAC & Authorization Tests
    // ==============================================================

    @Test
    @DisplayName("[ECOM-325] Admin Customer APIs: Thiếu header X-User-Roles -> Trả về 403 Forbidden")
    void adminCustomerApis_MissingXUserRoles_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/customers"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.BLOCKED);

        mockMvc.perform(put("/api/v1/admin/customers/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("[ECOM-325] Admin Customer APIs: Header X-User-Roles không chứa ROLE_ADMIN -> Trả về 403 Forbidden")
    void adminCustomerApis_NonAdminRole_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/customers")
                        .header("X-User-Roles", "ROLE_USER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.BLOCKED);

        mockMvc.perform(put("/api/v1/admin/customers/1/status")
                        .header("X-User-Roles", "ROLE_USER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    // ==============================================================
    // Functional Controller Tests with ROLE_ADMIN
    // ==============================================================

    @Test
    @DisplayName("[ECOM-145 / ECOM-325] GET /api/v1/admin/customers: Lấy danh sách khách hàng phân trang thành công")
    void getCustomers_AdminRole_Success() throws Exception {
        UserSummaryResponse customer = UserSummaryResponse.builder()
                .id(10L)
                .email("customer@shopmart.com")
                .fullName("Nguyễn Khách Hàng")
                .phone("0988776655")
                .status(UserStatus.ACTIVE)
                .roles(List.of("ROLE_USER"))
                .build();

        PagedResponse<UserSummaryResponse> pagedResponse = PagedResponse.<UserSummaryResponse>builder()
                .content(List.of(customer))
                .pageNumber(0)
                .pageSize(10)
                .totalElements(1L)
                .totalPages(1)
                .last(true)
                .build();

        when(userService.getCustomers(any(), any(), any(Pageable.class))).thenReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/admin/customers")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("keyword", "Nguyễn")
                        .param("status", "ACTIVE")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].email").value("customer@shopmart.com"))
                .andExpect(jsonPath("$.data.content[0].status").value("ACTIVE"));
    }

    @Test
    @DisplayName("[ECOM-145] PUT /api/v1/admin/customers/{id}/status: Khóa tài khoản khách hàng thành công")
    void updateCustomerStatus_AdminRole_Success() throws Exception {
        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.BLOCKED);

        UserSummaryResponse response = UserSummaryResponse.builder()
                .id(10L)
                .email("customer@shopmart.com")
                .status(UserStatus.BLOCKED)
                .roles(List.of("ROLE_USER"))
                .build();

        when(userService.updateUserStatus(eq(10L), any(UpdateUserStatusRequest.class))).thenReturn(response);

        mockMvc.perform(put("/api/v1/admin/customers/10/status")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("BLOCKED"));
    }

    @Test
    @DisplayName("[ECOM-145] GET /api/v1/admin/customers/{id}: Xem chi tiết hồ sơ khách hàng thành công")
    void getCustomerProfile_AdminRole_Success() throws Exception {
        UserProfileResponse profile = UserProfileResponse.builder()
                .id(10L)
                .email("customer@shopmart.com")
                .fullName("Nguyễn Khách Hàng")
                .status(UserStatus.ACTIVE)
                .build();

        when(userService.getProfile(10L)).thenReturn(profile);

        mockMvc.perform(get("/api/v1/admin/customers/10")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10L));
    }

    @Test
    @DisplayName("[ECOM-145] GET /api/v1/admin/customers/count: Đếm tổng số khách hàng thành công")
    void countCustomers_AdminRole_Success() throws Exception {
        when(userService.countCustomers()).thenReturn(150L);

        mockMvc.perform(get("/api/v1/admin/customers/count")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(150));
    }

    @Test
    @DisplayName("[ECOM-325] Chống leo thang đặc quyền: ROLE_ADMIN_VIEWER bị từ chối với 403 Forbidden")
    void getCustomers_SubstringRoleBypass_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/customers")
                        .header("X-User-Roles", "ROLE_ADMIN_VIEWER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("[ECOM-325] Đa vai trò hợp lệ (ROLE_USER, ROLE_ADMIN) và làm sạch tham số page/size/sortBy an toàn")
    void getCustomers_MultiRoleAndSanitizedParams_Success() throws Exception {
        PagedResponse<UserSummaryResponse> emptyPage = PagedResponse.<UserSummaryResponse>builder()
                .content(List.of())
                .pageNumber(0)
                .pageSize(100)
                .totalElements(0L)
                .totalPages(0)
                .last(true)
                .build();

        org.mockito.ArgumentCaptor<Pageable> pageableCaptor = org.mockito.ArgumentCaptor.forClass(Pageable.class);
        when(userService.getCustomers(any(), any(), pageableCaptor.capture())).thenReturn(emptyPage);

        mockMvc.perform(get("/api/v1/admin/customers")
                        .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN")
                        .param("page", "-5")
                        .param("size", "9999")
                        .param("sortBy", "password"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        Pageable captured = pageableCaptor.getValue();
        org.assertj.core.api.Assertions.assertThat(captured.getPageNumber()).isEqualTo(0);
        org.assertj.core.api.Assertions.assertThat(captured.getPageSize()).isEqualTo(100);
        org.assertj.core.api.Assertions.assertThat(captured.getSort().getOrderFor("id")).isNotNull();
    }

    @Test
    @DisplayName("[ECOM-145] Khóa tài khoản ROLE_ADMIN ném IllegalArgumentException -> Trả về 400 Bad Request")
    void updateCustomerStatus_BlockingAdminAccount_ShouldReturn400() throws Exception {
        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.BLOCKED);

        when(userService.updateUserStatus(eq(1L), any(UpdateUserStatusRequest.class)))
                .thenThrow(new IllegalArgumentException("Không thể khóa tài khoản có quyền Quản trị viên (ROLE_ADMIN)"));

        mockMvc.perform(put("/api/v1/admin/customers/1/status")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("[ECOM-325] Truyền tham số status sai kiểu Enum -> Trả về 400 Bad Request thay vì 500")
    void getCustomers_InvalidStatusEnum_ShouldReturn400() throws Exception {
        mockMvc.perform(get("/api/v1/admin/customers")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .param("status", "INVALID_STATUS"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("[ECOM-145] Cập nhật trạng thái với body thiếu trường status (@NotNull) -> Trả về 400 Bad Request")
    void updateCustomerStatus_NullStatusBody_ShouldReturn400() throws Exception {
        mockMvc.perform(put("/api/v1/admin/customers/10/status")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    @DisplayName("[ECOM-145] Xem chi tiết khách hàng không tồn tại -> Trả về 404 Not Found")
    void getCustomerProfile_NotFound_ShouldReturn404() throws Exception {
        when(userService.getProfile(9999L))
                .thenThrow(new com.ecommerce.auth.exception.ResourceNotFoundException("Không tìm thấy người dùng với ID: 9999"));

        mockMvc.perform(get("/api/v1/admin/customers/9999")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
