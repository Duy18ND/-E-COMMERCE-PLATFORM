package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.request.UpdateUserStatusRequest;
import com.ecommerce.auth.dto.response.PagedResponse;
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

@ExtendWith(MockitoExtension.class)
class AdminUserControllerTest {

    private MockMvc mockMvc;

    @Mock
    private UserService userService;

    @InjectMocks
    private AdminUserController adminUserController;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(adminUserController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // ==============================================================
    // RBAC & Authorization Tests
    // ==============================================================

    @Test
    @DisplayName("Admin User APIs: Thiếu header X-User-Roles -> Trả về 403 Forbidden")
    void adminApis_MissingXUserRoles_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.BLOCKED);

        mockMvc.perform(put("/api/v1/admin/users/1/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    @DisplayName("Admin User APIs: Header X-User-Roles không chứa ROLE_ADMIN -> Trả về 403 Forbidden")
    void adminApis_NonAdminRole_ShouldReturn403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .header("X-User-Roles", "ROLE_USER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.BLOCKED);

        mockMvc.perform(put("/api/v1/admin/users/1/status")
                        .header("X-User-Roles", "ROLE_USER")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));
    }

    // ==============================================================
    // Functional Tests with ROLE_ADMIN
    // ==============================================================

    @Test
    @DisplayName("GET /api/v1/admin/users: Có quyền ROLE_ADMIN -> Trả về danh sách user phân trang 200 OK")
    void getAllUsers_AdminRole_Success() throws Exception {
        UserSummaryResponse summary = UserSummaryResponse.builder()
                .id(1L)
                .email("admin_managed@example.com")
                .fullName("Admin Managed User")
                .status(UserStatus.ACTIVE)
                .roles(List.of("ROLE_USER"))
                .build();

        PagedResponse<UserSummaryResponse> pagedResponse = PagedResponse.<UserSummaryResponse>builder()
                .content(List.of(summary))
                .pageNumber(0)
                .pageSize(10)
                .totalElements(1L)
                .totalPages(1)
                .last(true)
                .build();

        when(userService.getAllUsers(any(Pageable.class))).thenReturn(pagedResponse);

        mockMvc.perform(get("/api/v1/admin/users")
                        .header("X-User-Roles", "ROLE_ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].email").value("admin_managed@example.com"))
                .andExpect(jsonPath("$.data.content[0].status").value("ACTIVE"));
    }

    @Test
    @DisplayName("PUT /api/v1/admin/users/{id}/status: Có quyền ROLE_ADMIN -> Cập nhật trạng thái thành công 200 OK")
    void updateUserStatus_AdminRole_Success() throws Exception {
        UpdateUserStatusRequest request = new UpdateUserStatusRequest();
        request.setStatus(UserStatus.BLOCKED);

        UserSummaryResponse summary = UserSummaryResponse.builder()
                .id(1L)
                .email("blocked_user@example.com")
                .fullName("Blocked User")
                .status(UserStatus.BLOCKED)
                .roles(List.of("ROLE_USER"))
                .build();

        when(userService.updateUserStatus(eq(1L), any(UpdateUserStatusRequest.class))).thenReturn(summary);

        mockMvc.perform(put("/api/v1/admin/users/1/status")
                        .header("X-User-Roles", "ROLE_ADMIN")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("BLOCKED"));
    }
}
