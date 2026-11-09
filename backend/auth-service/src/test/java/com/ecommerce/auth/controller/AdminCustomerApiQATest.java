package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.request.UpdateUserStatusRequest;
import com.ecommerce.auth.dto.response.AddressResponse;
import com.ecommerce.auth.dto.response.PagedResponse;
import com.ecommerce.auth.dto.response.UserProfileResponse;
import com.ecommerce.auth.dto.response.UserSummaryResponse;
import com.ecommerce.auth.enums.UserStatus;
import com.ecommerce.auth.exception.GlobalExceptionHandler;
import com.ecommerce.auth.exception.ResourceNotFoundException;
import com.ecommerce.auth.service.UserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [Task ECOM-327] QA Test - Quản lý khách hàng: API, validation và quyền truy cập (ECOM-325)
 * Sprint: SPRINT 3
 * Feature cha: ECOM-320 (Quản lý khách hàng & Thống kê)
 * Scope kiểm thử: ECOM-325 (API danh sách khách hàng có phân quyền)
 * QA Lead: NGÔ PHƯƠNG / Phối hợp Backend: TRẦN NGỌC LINH
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("[ECOM-327] QA Test - Quản lý khách hàng: API, validation và quyền truy cập (ECOM-325)")
public class AdminCustomerApiQATest {

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

    // =========================================================================
    // 1. Phân quyền và Bảo mật (RBAC & Authorization Tests)
    // =========================================================================
    @Nested
    @DisplayName("1. Kiểm tra Quyền truy cập & RBAC (ADMIN / USER / GUEST)")
    class AuthorizationAndRbacTests {

        @Test
        @DisplayName("[E327-01] ADMIN có header X-User-Roles chứa ROLE_ADMIN -> Cho phép truy cập (200 OK)")
        void getCustomers_AdminRole_Allowed() throws Exception {
            PagedResponse<UserSummaryResponse> pagedResponse = PagedResponse.<UserSummaryResponse>builder()
                    .content(Collections.emptyList())
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(0L)
                    .totalPages(0)
                    .last(true)
                    .build();

            when(userService.getCustomers(any(), any(), any(Pageable.class))).thenReturn(pagedResponse);

            mockMvc.perform(get("/api/v1/admin/customers")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("[E327-02] USER thường (chỉ có ROLE_USER) -> Bị từ chối (403 Forbidden)")
        void getCustomers_UserRole_Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/customers")
                            .header("X-User-Roles", "ROLE_USER"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.error").value("Forbidden"))
                    .andExpect(jsonPath("$.message").value(containsString("Chỉ tài khoản ADMIN mới có quyền")));
        }

        @Test
        @DisplayName("[E327-03] GUEST không truyền header X-User-Roles (không có token) -> Bị từ chối (403 Forbidden)")
        void getCustomers_GuestNoToken_Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/customers"))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403))
                    .andExpect(jsonPath("$.error").value("Forbidden"));
        }

        @Test
        @DisplayName("[E327-04] Header X-User-Roles rỗng hoặc khoảng trắng -> Bị từ chối (403 Forbidden)")
        void getCustomers_EmptyRoles_Forbidden() throws Exception {
            mockMvc.perform(get("/api/v1/admin/customers")
                            .header("X-User-Roles", "   "))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }

        @Test
        @DisplayName("[E327-05] Multiple roles chứa ROLE_ADMIN (e.g. ROLE_USER,ROLE_ADMIN) -> Cho phép truy cập (200 OK)")
        void getCustomers_MultipleRolesContainingAdmin_Allowed() throws Exception {
            PagedResponse<UserSummaryResponse> pagedResponse = PagedResponse.<UserSummaryResponse>builder()
                    .content(Collections.emptyList())
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(0L)
                    .totalPages(0)
                    .last(true)
                    .build();

            when(userService.getCustomers(any(), any(), any(Pageable.class))).thenReturn(pagedResponse);

            mockMvc.perform(get("/api/v1/admin/customers")
                            .header("X-User-Roles", "ROLE_USER, ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }
    }

    // =========================================================================
    // 2. Kiểm thử API Danh sách Khách hàng & Tham số truy vấn (ECOM-325)
    // =========================================================================
    @Nested
    @DisplayName("2. Kiểm thử API Danh sách Khách hàng & Validation (ECOM-325)")
    class CustomerListApiTests {

        @Test
        @DisplayName("[E327-06] Query params hợp lệ (keyword, status, page, size, sortBy, sortDir) -> Trả về danh sách phân trang chuẩn")
        void getCustomers_ValidQueryParams_Success() throws Exception {
            UserSummaryResponse customer1 = UserSummaryResponse.builder()
                    .id(101L)
                    .email("nguyenvana@gmail.com")
                    .fullName("Nguyễn Văn A")
                    .phone("0912345678")
                    .status(UserStatus.ACTIVE)
                    .roles(List.of("ROLE_USER"))
                    .createdAt(LocalDateTime.of(2026, 1, 15, 10, 0))
                    .updatedAt(LocalDateTime.of(2026, 1, 15, 10, 0))
                    .build();

            PagedResponse<UserSummaryResponse> pagedResponse = PagedResponse.<UserSummaryResponse>builder()
                    .content(List.of(customer1))
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(1L)
                    .totalPages(1)
                    .last(true)
                    .build();

            when(userService.getCustomers(eq("Nguyễn"), eq(UserStatus.ACTIVE), any(Pageable.class)))
                    .thenReturn(pagedResponse);

            mockMvc.perform(get("/api/v1/admin/customers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("keyword", "Nguyễn")
                            .param("status", "ACTIVE")
                            .param("page", "0")
                            .param("size", "10")
                            .param("sortBy", "fullName")
                            .param("sortDir", "asc"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.content", hasSize(1)))
                    .andExpect(jsonPath("$.data.content[0].id").value(101))
                    .andExpect(jsonPath("$.data.content[0].email").value("nguyenvana@gmail.com"))
                    .andExpect(jsonPath("$.data.content[0].fullName").value("Nguyễn Văn A"))
                    .andExpect(jsonPath("$.data.content[0].phone").value("0912345678"))
                    .andExpect(jsonPath("$.data.content[0].status").value("ACTIVE"))
                    .andExpect(jsonPath("$.data.pageNumber").value(0))
                    .andExpect(jsonPath("$.data.pageSize").value(10))
                    .andExpect(jsonPath("$.data.totalElements").value(1))
                    .andExpect(jsonPath("$.data.totalPages").value(1));
        }

        @Test
        @DisplayName("[E327-07] Tìm kiếm với từ khóa rỗng hoặc chỉ có khoảng trắng -> Xử lý thành công không bị lỗi")
        void getCustomers_EmptyOrWhitespaceKeyword_Success() throws Exception {
            PagedResponse<UserSummaryResponse> pagedResponse = PagedResponse.<UserSummaryResponse>builder()
                    .content(Collections.emptyList())
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(0L)
                    .totalPages(0)
                    .last(true)
                    .build();

            when(userService.getCustomers(eq(""), any(), any(Pageable.class))).thenReturn(pagedResponse);

            mockMvc.perform(get("/api/v1/admin/customers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("keyword", ""))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("[E327-08] Tìm kiếm với ký tự đặc biệt (SQL injection, XSS characters: '%', ''', '<script>') -> Xử lý an toàn")
        void getCustomers_SpecialCharsKeyword_HandledSafely() throws Exception {
            PagedResponse<UserSummaryResponse> pagedResponse = PagedResponse.<UserSummaryResponse>builder()
                    .content(Collections.emptyList())
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(0L)
                    .totalPages(0)
                    .last(true)
                    .build();

            when(userService.getCustomers(any(), any(), any(Pageable.class))).thenReturn(pagedResponse);

            mockMvc.perform(get("/api/v1/admin/customers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("keyword", "' OR 1=1 -- <script>"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("[E327-09] Danh sách khách hàng rỗng -> Trả về mảng rỗng, totalElements=0, không phát sinh lỗi 500")
        void getCustomers_EmptyList_Returns200WithEmptyContent() throws Exception {
            PagedResponse<UserSummaryResponse> pagedResponse = PagedResponse.<UserSummaryResponse>builder()
                    .content(Collections.emptyList())
                    .pageNumber(0)
                    .pageSize(10)
                    .totalElements(0L)
                    .totalPages(0)
                    .last(true)
                    .build();

            when(userService.getCustomers(any(), any(), any(Pageable.class))).thenReturn(pagedResponse);

            mockMvc.perform(get("/api/v1/admin/customers")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content", hasSize(0)))
                    .andExpect(jsonPath("$.data.totalElements").value(0))
                    .andExpect(jsonPath("$.data.totalPages").value(0));
        }

        @Test
        @DisplayName("[E327-10] Phân trang lỗi: Page âm (page=-1) -> Bị từ chối với 400 Bad Request (không trả về 500)")
        void getCustomers_NegativePage_Returns400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/customers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("page", "-1"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.message").value(containsString("Chỉ số trang (page) không được nhỏ hơn 0")));
        }

        @Test
        @DisplayName("[E327-11] Phân trang lỗi: Size không hợp lệ (size=0 hoặc size=-5) -> Bị từ chối với 400 Bad Request (không trả về 500)")
        void getCustomers_InvalidSize_Returns400() throws Exception {
            mockMvc.perform(get("/api/v1/admin/customers")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .param("size", "0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400))
                    .andExpect(jsonPath("$.error").value("Bad Request"))
                    .andExpect(jsonPath("$.message").value(containsString("Kích thước trang (size) phải lớn hơn 0")));
        }

        @Test
        @DisplayName("[E327-12] Bảo vệ thông tin nhạy cảm: Không được trả về password, passwordHash hoặc JWT trong UserSummaryResponse")
        void getCustomers_SensitiveDataProtection_NoPasswordOrTokensExposed() throws Exception {
            UserSummaryResponse customer = UserSummaryResponse.builder()
                    .id(200L)
                    .email("secure_user@shopmart.com")
                    .fullName("Người Dùng An Toàn")
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
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.content[0].password").doesNotExist())
                    .andExpect(jsonPath("$.data.content[0].passwordHash").doesNotExist())
                    .andExpect(jsonPath("$.data.content[0].token").doesNotExist())
                    .andExpect(jsonPath("$.data.content[0].jwt").doesNotExist());
        }
    }

    // =========================================================================
    // 3. Kiểm thử Cập nhật Trạng thái Khách hàng & Hồ sơ chi tiết
    // =========================================================================
    @Nested
    @DisplayName("3. Cập nhật Trạng thái & Hồ sơ Khách hàng (Status & Profile)")
    class CustomerStatusAndProfileTests {

        @Test
        @DisplayName("[E327-13] PUT /status: ADMIN cập nhật trạng thái sang BLOCKED -> Thành công (200 OK)")
        void updateCustomerStatus_AdminRole_Success() throws Exception {
            UpdateUserStatusRequest request = new UpdateUserStatusRequest();
            request.setStatus(UserStatus.BLOCKED);

            UserSummaryResponse response = UserSummaryResponse.builder()
                    .id(105L)
                    .email("blocked_user@shopmart.com")
                    .fullName("Khách Hàng Vi Phạm")
                    .status(UserStatus.BLOCKED)
                    .roles(List.of("ROLE_USER"))
                    .build();

            when(userService.updateUserStatus(eq(105L), any(UpdateUserStatusRequest.class))).thenReturn(response);

            mockMvc.perform(put("/api/v1/admin/customers/105/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.status").value("BLOCKED"));
        }

        @Test
        @DisplayName("[E327-14] PUT /status: USER thường cố gắng cập nhật trạng thái khách hàng -> 403 Forbidden")
        void updateCustomerStatus_UserRole_Forbidden() throws Exception {
            UpdateUserStatusRequest request = new UpdateUserStatusRequest();
            request.setStatus(UserStatus.BLOCKED);

            mockMvc.perform(put("/api/v1/admin/customers/105/status")
                            .header("X-User-Roles", "ROLE_USER")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.status").value(403));
        }

        @Test
        @DisplayName("[E327-15] PUT /status: Khách hàng không tồn tại -> Trả về 404 Not Found")
        void updateCustomerStatus_NotFound_Returns404() throws Exception {
            UpdateUserStatusRequest request = new UpdateUserStatusRequest();
            request.setStatus(UserStatus.BLOCKED);

            when(userService.updateUserStatus(eq(999L), any(UpdateUserStatusRequest.class)))
                    .thenThrow(new ResourceNotFoundException("Không tìm thấy người dùng với ID: 999"));

            mockMvc.perform(put("/api/v1/admin/customers/999/status")
                            .header("X-User-Roles", "ROLE_ADMIN")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.status").value(404))
                    .andExpect(jsonPath("$.error").value("Not Found"))
                    .andExpect(jsonPath("$.message").value(containsString("Không tìm thấy người dùng với ID: 999")));
        }

        @Test
        @DisplayName("[E327-16] GET /{id}: ADMIN xem chi tiết hồ sơ khách hàng -> Thành công (200 OK)")
        void getCustomerProfile_AdminRole_Success() throws Exception {
            AddressResponse address = AddressResponse.builder()
                    .id(1L)
                    .userId(101L)
                    .receiverName("Nguyễn Văn A")
                    .phone("0912345678")
                    .addressLine("123 Cầu Giấy")
                    .city("Hà Nội")
                    .district("Cầu Giấy")
                    .ward("Dịch Vọng")
                    .isDefault(true)
                    .build();

            UserProfileResponse profile = UserProfileResponse.builder()
                    .id(101L)
                    .email("nguyenvana@gmail.com")
                    .fullName("Nguyễn Văn A")
                    .phone("0912345678")
                    .status(UserStatus.ACTIVE)
                    .roles(Set.of("ROLE_USER"))
                    .defaultAddress(address)
                    .addresses(List.of(address))
                    .build();

            when(userService.getProfile(101L)).thenReturn(profile);

            mockMvc.perform(get("/api/v1/admin/customers/101")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(101))
                    .andExpect(jsonPath("$.data.email").value("nguyenvana@gmail.com"))
                    .andExpect(jsonPath("$.data.defaultAddress.city").value("Hà Nội"))
                    .andExpect(jsonPath("$.data.password").doesNotExist());
        }

        @Test
        @DisplayName("[E327-17] GET /count: ADMIN lấy tổng số khách hàng -> Thành công (200 OK)")
        void countCustomers_AdminRole_Success() throws Exception {
            when(userService.countCustomers()).thenReturn(250L);

            mockMvc.perform(get("/api/v1/admin/customers/count")
                            .header("X-User-Roles", "ROLE_ADMIN"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").value(250));
        }
    }
}
