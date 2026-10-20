package com.re.backend.user;

import com.re.backend.common.ApiResponse;
import com.re.backend.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    /**
     * GET /api/users/me
     * Lấy thông tin cá nhân của user đang đăng nhập (từ JWT token)
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thông tin người dùng"));

        UserResponse response = UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .address(user.getAddress())
                .createdAt(user.getCreatedAt())
                .roles(user.getRoles().stream()
                        .map(Role::getName)
                        .collect(Collectors.toList()))
                .build();

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
