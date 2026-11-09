package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.request.UpdateUserStatusRequest;
import com.ecommerce.auth.dto.response.ApiResponse;
import com.ecommerce.auth.dto.response.PagedResponse;
import com.ecommerce.auth.dto.response.UserProfileResponse;
import com.ecommerce.auth.dto.response.UserSummaryResponse;
import com.ecommerce.auth.enums.UserStatus;
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

import java.util.Arrays;

/**
 * [Task ECOM-145 / ECOM-325] Quản lý khách hàng toàn hệ thống cho Admin:
 * Phụ trách bởi: Đoàn Mạnh Duy - 28/07/2006
 *
 * - Task ECOM-145: Xây dựng API Quản lý khách hàng (danh sách, khóa/mở khóa tài khoản) cho Admin.
 * - Task ECOM-325: API danh sách khách hàng có phân quyền, lọc theo từ khóa và trạng thái tài khoản.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin/customers")
@RequiredArgsConstructor
@Tag(name = "Admin Customer Controller", description = "Quản lý khách hàng (danh sách, tìm kiếm, khóa/mở khóa tài khoản) cho Admin")
public class AdminCustomerController {

    private final UserService userService;

    @GetMapping
    @Operation(summary = "Lấy danh sách khách hàng có phân quyền [ADMIN]", description = "Có phân trang, tìm kiếm từ khóa và lọc trạng thái. Yêu cầu ROLE_ADMIN")
    public ResponseEntity<ApiResponse<PagedResponse<UserSummaryResponse>>> getCustomers(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) UserStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {

        requireAdminRole(roles);

        if (page < 0) {
            throw new IllegalArgumentException("Chỉ số trang (page) không được nhỏ hơn 0");
        }
        if (size <= 0) {
            throw new IllegalArgumentException("Kích thước trang (size) phải lớn hơn 0");
        }

        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));

        PagedResponse<UserSummaryResponse> response = userService.getCustomers(keyword, status, pageable);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách khách hàng thành công", response));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Khóa hoặc Mở khóa tài khoản khách hàng [ADMIN]", description = "Cập nhật status (ACTIVE / BLOCKED). Yêu cầu ROLE_ADMIN")
    public ResponseEntity<ApiResponse<UserSummaryResponse>> updateCustomerStatus(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request) {

        requireAdminRole(roles);

        UserSummaryResponse response = userService.updateUserStatus(id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật trạng thái khách hàng thành công", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết hồ sơ khách hàng [ADMIN]", description = "Lấy thông tin cá nhân và sổ địa chỉ của khách hàng. Yêu cầu ROLE_ADMIN")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getCustomerProfile(
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @PathVariable Long id) {

        requireAdminRole(roles);

        UserProfileResponse response = userService.getProfile(id);
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin khách hàng thành công", response));
    }

    @GetMapping("/count")
    @Operation(summary = "Đếm tổng số lượng khách hàng [ADMIN]", description = "Lấy tổng số khách hàng đăng ký trong hệ thống. Yêu cầu ROLE_ADMIN")
    public ResponseEntity<ApiResponse<Long>> countCustomers(
            @RequestHeader(value = "X-User-Roles", required = false) String roles) {

        requireAdminRole(roles);

        long count = userService.countCustomers();
        return ResponseEntity.ok(ApiResponse.success("Đếm tổng số khách hàng thành công", count));
    }

    private void requireAdminRole(String roles) {
        if (roles != null) {
            boolean hasAdmin = Arrays.stream(roles.split(","))
                    .map(String::trim)
                    .anyMatch("ROLE_ADMIN"::equals);
            if (hasAdmin) {
                return;
            }
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getAuthorities() != null &&
                auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()))) {
            return;
        }
        throw new AccessDeniedException("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này");
    }
}

