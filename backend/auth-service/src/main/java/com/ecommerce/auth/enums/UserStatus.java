package com.ecommerce.auth.enums;

/**
 * Trạng thái tài khoản người dùng.
 * ACTIVE  - Tài khoản hoạt động bình thường.
 * BLOCKED - Tài khoản bị khóa bởi Admin, không thể đăng nhập.
 */
public enum UserStatus {
    ACTIVE,
    BLOCKED
}
