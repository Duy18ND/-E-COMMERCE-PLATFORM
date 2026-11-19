-- ═══════════════════════════════════════════════════════════════
--  Master Migration Script — ShopMart Production Database
--  Executes Migrations 01 -> 05 Idempotently and Safely
--  DO NOT DROP TABLES, DO NOT TRUNCATE DATA
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- 1. Create databases if not exists
CREATE DATABASE IF NOT EXISTS auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS product_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS order_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS payment_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS chatbot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Privileges
CREATE USER IF NOT EXISTS 'ecommerce_user'@'%' IDENTIFIED BY 'ecommerce_pass';
GRANT ALL PRIVILEGES ON auth_db.*    TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON product_db.* TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON order_db.*   TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON payment_db.* TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON chatbot_db.* TO 'ecommerce_user'@'%';

CREATE USER IF NOT EXISTS 'ecommerce_prod_user'@'%' IDENTIFIED BY 'ecommerce_prod_pass';
GRANT ALL PRIVILEGES ON auth_db.*    TO 'ecommerce_prod_user'@'%';
GRANT ALL PRIVILEGES ON product_db.* TO 'ecommerce_prod_user'@'%';
GRANT ALL PRIVILEGES ON order_db.*   TO 'ecommerce_prod_user'@'%';
GRANT ALL PRIVILEGES ON payment_db.* TO 'ecommerce_prod_user'@'%';
GRANT ALL PRIVILEGES ON chatbot_db.* TO 'ecommerce_prod_user'@'%';

FLUSH PRIVILEGES;

-- 3. auth_db Schema
USE auth_db;
CREATE TABLE IF NOT EXISTS roles (
    id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(20) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO roles (id, name) VALUES (1, 'ROLE_USER'), (2, 'ROLE_ADMIN');

CREATE TABLE IF NOT EXISTS users (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    email      VARCHAR(120) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    full_name  VARCHAR(150) NOT NULL,
    phone      VARCHAR(20),
    status     VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_addresses (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT       NOT NULL,
    receiver_name VARCHAR(150) NOT NULL,
    phone         VARCHAR(20)  NOT NULL,
    address_line  VARCHAR(255) NOT NULL,
    city          VARCHAR(100) NOT NULL,
    district      VARCHAR(100),
    ward          VARCHAR(100),
    is_default    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_address_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. product_db Fixes & Schemas
USE product_db;
CREATE TABLE IF NOT EXISTS categories (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    image_url   VARCHAR(500),
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at  DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(200)   NOT NULL,
    description    TEXT,
    price          DECIMAL(12, 2) NOT NULL,
    stock_quantity INT            NOT NULL,
    category       VARCHAR(100),
    image_url      VARCHAR(500),
    status         VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    version        BIGINT         NOT NULL DEFAULT 0,
    created_at     DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_products_stock_non_negative CHECK (stock_quantity >= 0),
    INDEX idx_products_name (name),
    INDEX idx_products_category (category),
    INDEX idx_products_status (status),
    INDEX idx_products_status_price (status, price),
    INDEX idx_products_status_category (status, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_reviews (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id    BIGINT       NOT NULL,
    user_id       BIGINT       NOT NULL,
    order_id      BIGINT       NOT NULL,
    rating        INT          NOT NULL,
    comment       TEXT,
    status        VARCHAR(20)  NOT NULL DEFAULT 'APPROVED',
    hidden_reason VARCHAR(255),
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT uq_review_product_user UNIQUE (product_id, user_id),
    INDEX idx_reviews_product_id (product_id),
    INDEX idx_reviews_user_id (user_id),
    INDEX idx_reviews_product_status (product_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- In case table already exists with TINYINT rating, alter to INT:
ALTER TABLE product_reviews MODIFY COLUMN rating INT NOT NULL;

CREATE TABLE IF NOT EXISTS flash_sale_campaigns (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(200) NOT NULL,
    start_time DATETIME(6)  NOT NULL,
    end_time   DATETIME(6)  NOT NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'UPCOMING',
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_fs_status_time (status, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flash_sale_items (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    campaign_id      BIGINT         NOT NULL,
    product_id       BIGINT         NOT NULL,
    flash_sale_price DECIMAL(12, 2) NOT NULL,
    quantity         INT            NOT NULL,
    sold_quantity    INT            NOT NULL DEFAULT 0,
    user_limit       INT            NOT NULL DEFAULT 2,
    CONSTRAINT fk_fs_campaign FOREIGN KEY (campaign_id) REFERENCES flash_sale_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_fs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uq_fs_campaign_product UNIQUE (campaign_id, product_id),
    CONSTRAINT chk_fs_price CHECK (flash_sale_price > 0),
    CONSTRAINT chk_fs_quantity CHECK (quantity > 0 AND sold_quantity >= 0 AND sold_quantity <= quantity),
    INDEX idx_fs_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. order_db Schemas
USE order_db;
CREATE TABLE IF NOT EXISTS vouchers (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(50)    NOT NULL,
    name            VARCHAR(150)   NOT NULL,
    description     VARCHAR(500),
    discount_type   VARCHAR(20)    NOT NULL,
    discount_value  DECIMAL(12, 2) NOT NULL,
    max_discount    DECIMAL(12, 2),
    min_order_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    quantity        INT            NOT NULL,
    used_quantity   INT            NOT NULL DEFAULT 0,
    start_date      DATE           NOT NULL,
    end_date        DATE           NOT NULL,
    status          VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    created_at      DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_voucher_code UNIQUE (code),
    INDEX idx_vouchers_code (code),
    INDEX idx_vouchers_status_dates (status, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS voucher_usages (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    voucher_id      BIGINT         NOT NULL,
    voucher_code    VARCHAR(50)    NOT NULL,
    user_id         BIGINT         NOT NULL,
    order_id        BIGINT,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status          VARCHAR(20)    NOT NULL DEFAULT 'APPLIED',
    used_at         DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_voucher_usage_voucher FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE,
    INDEX idx_voucher_usage_voucher_user (voucher_id, user_id, status),
    INDEX idx_voucher_usage_code_user (voucher_code, user_id, status),
    INDEX idx_voucher_usage_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT         NOT NULL,
    receiver_name    VARCHAR(100)   NOT NULL,
    receiver_phone   VARCHAR(20)    NOT NULL,
    shipping_address TEXT           NOT NULL,
    subtotal_amount  DECIMAL(12, 2),
    voucher_code     VARCHAR(50),
    discount_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_amount     DECIMAL(12, 2) NOT NULL,
    status           VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    payment_method   VARCHAR(30)    NOT NULL,
    created_at       DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id          BIGINT         NOT NULL,
    product_id        BIGINT         NOT NULL,
    product_name      VARCHAR(255)   NOT NULL,
    quantity          INT            NOT NULL,
    price_at_purchase DECIMAL(12, 2) NOT NULL,
    is_flash_sale     BOOLEAN        NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_item_order_id (order_id),
    INDEX idx_order_item_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_status_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT       NOT NULL,
    status          VARCHAR(30)  NOT NULL,
    previous_status VARCHAR(30),
    action          VARCHAR(50),
    updated_by      VARCHAR(100),
    actor_role      VARCHAR(50),
    note            TEXT,
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_status_history_order_id (order_id),
    INDEX idx_status_history_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS carts (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT      NOT NULL UNIQUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)          DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_carts_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    cart_id    BIGINT      NOT NULL,
    product_id BIGINT      NOT NULL,
    quantity   INT         NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)          DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT uk_cart_item_cart_product UNIQUE (cart_id, product_id),
    INDEX idx_cart_items_cart_id (cart_id),
    INDEX idx_cart_items_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. payment_db Schemas
USE payment_db;
CREATE TABLE IF NOT EXISTS payments (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id         BIGINT         NOT NULL,
    user_id          BIGINT,
    amount           DECIMAL(15, 2) NOT NULL,
    payment_method   VARCHAR(50)    NOT NULL,
    status           VARCHAR(20)    NOT NULL,
    transaction_code VARCHAR(100),
    created_at       DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_payment_order_id (order_id),
    INDEX idx_payment_user_id (user_id),
    INDEX idx_payment_transaction_code (transaction_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. chatbot_db Schemas
USE chatbot_db;
CREATE TABLE IF NOT EXISTS chat_conversations (
    id               VARCHAR(36)  NOT NULL PRIMARY KEY,
    user_id          BIGINT       NULL,
    guest_session_id VARCHAR(64)  NULL,
    title            VARCHAR(200) NOT NULL DEFAULT 'Cuộc trò chuyện mới',
    status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_chat_conv_user_updated (user_id, status, updated_at),
    INDEX idx_chat_conv_guest (guest_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS chat_messages (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL,
    role            VARCHAR(20) NOT NULL,
    content         TEXT        NOT NULL,
    metadata_json   TEXT        NULL,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_chat_msg_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE,
    INDEX idx_chat_msg_conv_created (conversation_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
