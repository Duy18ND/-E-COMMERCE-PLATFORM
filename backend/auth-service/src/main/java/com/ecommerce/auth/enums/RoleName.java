package com.ecommerce.auth.enums;

/**
 * User roles in the e-commerce system.
 * ROLE_GUEST - Người dùng chưa đăng nhập (anonymous), chỉ xem được nội dung công khai.
 * ROLE_USER  - Người dùng đã đăng nhập, có thể mua hàng và quản lý tài khoản cá nhân.
 * ROLE_ADMIN - Quản trị viên hệ thống, có toàn quyền quản lý.
 */
public enum RoleName {
    ROLE_GUEST,
    ROLE_USER,
    ROLE_ADMIN
}
