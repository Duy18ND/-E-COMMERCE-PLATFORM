-- Migration 02: auth_db tables (roles, users, user_roles, user_addresses)
-- Safe for existing data (CREATE TABLE IF NOT EXISTS, INSERT IGNORE)

USE auth_db;

CREATE TABLE IF NOT EXISTS roles (
    id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE COMMENT 'Tên vai trò (ROLE_USER, ROLE_ADMIN)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng vai trò người dùng';

INSERT IGNORE INTO roles (id, name) VALUES (1, 'ROLE_USER'), (2, 'ROLE_ADMIN');

CREATE TABLE IF NOT EXISTS users (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(120) NOT NULL UNIQUE COMMENT 'Email đăng nhập duy nhất',
    password   VARCHAR(255) NOT NULL        COMMENT 'Mật khẩu băm BCrypt',
    full_name  VARCHAR(150) NOT NULL        COMMENT 'Họ và tên người dùng',
    phone      VARCHAR(20)                  COMMENT 'Số điện thoại',
    status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' COMMENT 'Trạng thái: ACTIVE, BLOCKED',
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng tài khoản người dùng';

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng liên kết người dùng và vai trò';

CREATE TABLE IF NOT EXISTS user_addresses (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL COMMENT 'ID người dùng',
    receiver_name VARCHAR(150) NOT NULL COMMENT 'Tên người nhận hàng',
    phone         VARCHAR(20)  NOT NULL COMMENT 'Số điện thoại người nhận',
    address_line  VARCHAR(255) NOT NULL COMMENT 'Địa chỉ chi tiết (số nhà, tên đường)',
    city          VARCHAR(100) NOT NULL COMMENT 'Tỉnh/Thành phố',
    district      VARCHAR(100)          COMMENT 'Quận/Huyện',
    ward          VARCHAR(100)          COMMENT 'Phường/Xã',
    is_default    BOOLEAN      NOT NULL DEFAULT FALSE COMMENT 'Địa chỉ mặc định',
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_address_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Sổ địa chỉ nhận hàng của người dùng';
