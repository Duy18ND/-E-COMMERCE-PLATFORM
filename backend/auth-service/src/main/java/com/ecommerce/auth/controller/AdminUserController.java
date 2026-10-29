package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.request.UpdateUserStatusRequest;
import com.ecommerce.auth.dto.response.ApiResponse;
import com.ecommerce.auth.dto.response.PagedResponse;
import com.ecommerce.auth.dto.response.UserSummaryResponse;
import com.ecommerce.auth.exception.AccessDeniedException;
import com.ecommerce.auth.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@Tag(name = "Admin User Controller", description = "Quản trị danh sách người dùng và trạng thái tài khoản")
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Lấy danh sách người dùng toàn hệ thống (phân trang) [ADMIN]", description = "Yêu cầu header X-User-Roles chứa ROLE_ADMIN")
    public ResponseEntity<ApiResponse<PagedResponse<UserSummaryResponse>>> getAllUsers(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        requireAdminRole(roles);

        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        PagedResponse<UserSummaryResponse> response = userService.getAllUsers(pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách người dùng thành công", response));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Khóa hoặc Mở khóa tài khoản người dùng [ADMIN]", description = "Cập nhật status (ACTIVE / BLOCKED). Yêu cầu header X-User-Roles chứa ROLE_ADMIN")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> updateUserStatus(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request) {

        requireAdminRole(roles);

        UserSummaryResponse response = userService.updateUserStatus(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái người dùng thành công", response));
    }

    private void requireAdminRole(String roles) {
        if (roles != null && roles.contains("ROLE_ADMIN")) {
            return;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null &&
                auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()))) {
            return;
        }
        throw new AccessDeniedException("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này");
    }
}
