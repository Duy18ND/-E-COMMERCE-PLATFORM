package com.ecommerce.auth.controller;

import com.ecommerce.auth.dto.request.LoginRequest;
import com.ecommerce.auth.dto.request.RegisterRequest;
import com.ecommerce.auth.dto.request.TokenRefreshRequest;
import com.ecommerce.auth.dto.response.ApiResponse;
import com.ecommerce.auth.dto.response.AuthResponse;
import com.ecommerce.auth.security.JwtTokenProvider;
import com.ecommerce.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication Controller", description = "Quản lý đăng ký, đăng nhập, làm mới token và đăng xuất")
public class AuthController {

    private final AuthService authService;
    private final JwtTokenProvider jwtTokenProvider;

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản mới", description = "Tạo mới tài khoản và trả về Access Token, Refresh Token")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Đăng ký tài khoản thành công", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập hệ thống", description = "Xác thực email và mật khẩu, trả về cặp token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công", response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Làm mới Access Token", description = "Cấp lại Access Token mới dựa vào Refresh Token còn hiệu lực")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody TokenRefreshRequest request) {
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(ApiResponse.success("Cấp lại token thành công", response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất", description = "Thu hồi Access Token hiện tại bằng cách lưu vào Redis Blacklist")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "token", required = false) String queryToken) {

        String token = queryToken;
        if (!StringUtils.hasText(token) && StringUtils.hasText(authHeader)) {
            token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        }

        authService.logout(token);
        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công", null));
    }

    @GetMapping("/validate")
    @Operation(summary = "Kiểm tra tính hợp lệ của Token", description = "Dùng cho API Gateway hoặc service nội bộ kiểm tra token")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateToken(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestParam(value = "token", required = false) String queryToken) {

        String token = queryToken;
        if (!StringUtils.hasText(token) && StringUtils.hasText(authHeader)) {
            token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader;
        }

        boolean isValid = jwtTokenProvider.validateToken(token);
        if (!isValid) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Token không hợp lệ hoặc đã bị thu hồi"));
        }

        String email = jwtTokenProvider.getEmailFromToken(token);
        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        var roles = jwtTokenProvider.getRolesFromToken(token);

        Map<String, Object> data = Map.of(
                "valid", true,
                "email", email,
                "userId", userId != null ? userId : "",
                "roles", roles != null ? roles : java.util.List.of()
        );

        return ResponseEntity.ok(ApiResponse.success("Token hợp lệ", data));
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lấy thông tin tài khoản hiện tại", description = "Trả về thông tin user từ SecurityContext")
    public ResponseEntity<ApiResponse<Object>> getCurrentUser(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.success("Thông tin tài khoản", authentication.getPrincipal()));
    }
}
