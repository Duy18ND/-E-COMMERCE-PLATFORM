package com.ecommerce.auth.dto.response;

import com.ecommerce.auth.enums.UserStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO tóm t?t thông tin User — dùng cho Admin dashboard.
 */
@Getter
@Builder
public class UserSummaryResponse {
    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private UserStatus status;
    private List<String> roles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
