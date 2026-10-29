package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.request.AddressRequest;
import com.ecommerce.auth.dto.response.AddressResponse;
import com.ecommerce.auth.dto.response.ApiResponse;
import com.ecommerce.auth.exception.AccessDeniedException;
import com.ecommerce.auth.security.UserPrincipal;
import com.ecommerce.auth.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "User Controller", description = "Quản lý Profile & Sổ địa chỉ người dùng")
public class UserController {

    private final UserService userService;

    @GetMapping("/me/addresses")
    @Operation(summary = "Lấy danh sách địa chỉ giao hàng của User", description = "Trích xuất userId từ header X-User-Id hoặc SecurityContext")
    public ResponseEntity<ApiResponse<List<AddressResponse>>> getMyAddresses(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {
        Long userId = resolveUserId(headerUserId);
        List<AddressResponse> responses = userService.getAddressesByUser(userId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách địa chỉ thành công", responses));
    }

    @PostMapping("/me/addresses")
    @Operation(summary = "Thêm địa chỉ mới vào sổ địa chỉ", description = "Nếu isDefault = true thì các địa chỉ cũ sẽ được cập nhật isDefault = false")
    public ResponseEntity<ApiResponse<AddressResponse>> addAddress(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @Valid @RequestBody AddressRequest request) {
        Long userId = resolveUserId(headerUserId);
        AddressResponse response = userService.addAddress(userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Thêm địa chỉ thành công", response));
    }

    @PutMapping("/me/addresses/{id}")
    @Operation(summary = "Cập nhật địa chỉ", description = "Cập nhật thông tin địa chỉ theo ID thuộc về user hiện tại")
    public ResponseEntity<ApiResponse<AddressResponse>> updateAddress(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @PathVariable Long id,
            @Valid @RequestBody AddressRequest request) {
        Long userId = resolveUserId(headerUserId);
        AddressResponse response = userService.updateAddress(userId, id, request);
        return ResponseEntity.ok(ApiResponse.success("Cập nhật địa chỉ thành công", response));
    }

    @DeleteMapping("/me/addresses/{id}")
    @Operation(summary = "Xóa địa chỉ", description = "Xóa địa chỉ theo ID thuộc về user hiện tại")
    public ResponseEntity<ApiResponse<Void>> deleteAddress(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @PathVariable Long id) {
        Long userId = resolveUserId(headerUserId);
        userService.deleteAddress(userId, id);
        return ResponseEntity.ok(ApiResponse.success("Xóa địa chỉ thành công", null));
    }

    private Long resolveUserId(Long headerUserId) {
        if (headerUserId != null) {
            return headerUserId;
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getId();
        }
        throw new AccessDeniedException("Thiếu thông tin người dùng xác thực (X-User-Id)");
    }
}
