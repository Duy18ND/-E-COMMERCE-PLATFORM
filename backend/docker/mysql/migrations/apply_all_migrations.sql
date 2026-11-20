-- ═══════════════════════════════════════════════════════════════
--  Master Migration Script — ShopMart Production Database
--  Executes Migrations 01 -> 06 Idempotently and Safely
--  Upgrades Sprint 1 Schema to Current ShopMart Schema Without Data Loss
--  DO NOT DROP TABLES, DO NOT TRUNCATE DATA, DO NOT HARDCODE PROD PASSWORDS
-- ═══════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ─────────────────────────────────────────────────────────────
--  1. Create all 5 isolated databases if not exists
-- ─────────────────────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS auth_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS product_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS order_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS payment_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS chatbot_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────
--  2. Grant scoped privileges to CONFIG-SPECIFIED application database user
--     (Reads user from @app_user session variable, verifies existence, scoped least privilege)
-- ─────────────────────────────────────────────────────────────
USE mysql;
DROP PROCEDURE IF EXISTS sp_shopmart_grant_privileges;
DELIMITER $$
CREATE PROCEDURE sp_shopmart_grant_privileges(IN p_user VARCHAR(100))
BEGIN
    DECLARE v_host VARCHAR(100);
    DECLARE v_user_count INT DEFAULT 0;
    DECLARE done INT DEFAULT 0;
    DECLARE cur CURSOR FOR
        SELECT Host FROM mysql.user WHERE User = p_user;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    IF p_user IS NULL OR TRIM(p_user) = '' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migration aborted: MySQL application user name is empty or not provided (@app_user is null/empty)';
    END IF;

    SELECT COUNT(*) INTO v_user_count FROM mysql.user WHERE User = p_user;
    IF v_user_count = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migration aborted: Target MySQL application user does not exist in mysql.user';
    END IF;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_host;
        IF done = 1 THEN
            LEAVE read_loop;
        END IF;

        -- Scoped least privileges across all 5 ShopMart databases:
        -- Runtime services require DML (SELECT, INSERT, UPDATE, DELETE), EXECUTE, REFERENCES, INDEX, CREATE TEMPORARY TABLES, LOCK TABLES.
        -- DDL privileges (CREATE, DROP, ALTER) are granted ONLY at database-level for these 5 databases (no global privileges, no GRANT OPTION).
        SET @q1 = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON auth_db.* TO ', QUOTE(p_user), '@', QUOTE(v_host));
        PREPARE s1 FROM @q1; EXECUTE s1; DEALLOCATE PREPARE s1;

        SET @q2 = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON product_db.* TO ', QUOTE(p_user), '@', QUOTE(v_host));
        PREPARE s2 FROM @q2; EXECUTE s2; DEALLOCATE PREPARE s2;

        SET @q3 = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON order_db.* TO ', QUOTE(p_user), '@', QUOTE(v_host));
        PREPARE s3 FROM @q3; EXECUTE s3; DEALLOCATE PREPARE s3;

        SET @q4 = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON payment_db.* TO ', QUOTE(p_user), '@', QUOTE(v_host));
        PREPARE s4 FROM @q4; EXECUTE s4; DEALLOCATE PREPARE s4;

        SET @q5 = CONCAT('GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX, REFERENCES, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE ON chatbot_db.* TO ', QUOTE(p_user), '@', QUOTE(v_host));
        PREPARE s5 FROM @q5; EXECUTE s5; DEALLOCATE PREPARE s5;
    END LOOP;
    CLOSE cur;

    FLUSH PRIVILEGES;
END$$
DELIMITER ;

CALL mysql.sp_shopmart_grant_privileges(@app_user);
DROP PROCEDURE IF EXISTS mysql.sp_shopmart_grant_privileges;
FLUSH PRIVILEGES;

-- ─────────────────────────────────────────────────────────────
--  3. Helper Procedures for Idempotent Column & Index Additions
-- ─────────────────────────────────────────────────────────────
USE mysql;
DROP PROCEDURE IF EXISTS sp_shopmart_ensure_column;
DROP PROCEDURE IF EXISTS sp_shopmart_ensure_index;
DELIMITER $$
CREATE PROCEDURE sp_shopmart_ensure_column(
    IN p_schema VARCHAR(64),
    IN p_table  VARCHAR(64),
    IN p_column VARCHAR(64),
    IN p_ddl    TEXT
)
BEGIN
    IF (SELECT COUNT(*) FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = p_schema AND TABLE_NAME = p_table AND COLUMN_NAME = p_column) = 0 THEN
        SET @ddl_sql = p_ddl;
        PREPARE stmt FROM @ddl_sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

CREATE PROCEDURE sp_shopmart_ensure_index(
    IN p_schema VARCHAR(64),
    IN p_table  VARCHAR(64),
    IN p_index  VARCHAR(64),
    IN p_ddl    TEXT
)
BEGIN
    IF (SELECT COUNT(*) FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = p_schema AND TABLE_NAME = p_table AND INDEX_NAME = p_index) = 0 THEN
        SET @idx_sql = p_ddl;
        PREPARE stmt FROM @idx_sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

-- ─────────────────────────────────────────────────────────────
--  4. auth_db Schema
-- ─────────────────────────────────────────────────────────────
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

-- ─────────────────────────────────────────────────────────────
--  5. product_db Fixes & Schemas
-- ─────────────────────────────────────────────────────────────
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

-- Ensure products.version exists for Sprint 1 tables
CALL mysql.sp_shopmart_ensure_column(
    'product_db', 'products', 'version',
    'ALTER TABLE product_db.products ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER status'
);

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

-- Read-only data validation & safe type conversion for product_reviews.rating
-- NEVER silently mutate historical customer reviews. If invalid records exist, abort safely.
DROP PROCEDURE IF EXISTS sp_shopmart_validate_and_modify_rating;
DELIMITER $$
CREATE PROCEDURE sp_shopmart_validate_and_modify_rating()
BEGIN
    DECLARE v_invalid_count INT DEFAULT 0;

    IF (SELECT COUNT(*) FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = 'product_db' AND TABLE_NAME = 'product_reviews') > 0 THEN

        SELECT COUNT(*) INTO v_invalid_count
        FROM product_reviews
        WHERE rating IS NULL OR rating < 1 OR rating > 5;

        IF v_invalid_count > 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Migration aborted: invalid rating records detected in product_reviews (NULL or out of range [1-5]). Historical data preserved; manual audit required.';
        END IF;

        ALTER TABLE product_reviews MODIFY COLUMN rating INT NOT NULL COMMENT 'Điểm đánh giá từ 1 đến 5 (Khớp Hibernate Integer)';
    END IF;
END$$
DELIMITER ;

CALL sp_shopmart_validate_and_modify_rating();
DROP PROCEDURE IF EXISTS sp_shopmart_validate_and_modify_rating;
CALL mysql.sp_shopmart_ensure_column(
    'product_db', 'product_reviews', 'status',
    'ALTER TABLE product_db.product_reviews ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''APPROVED'' AFTER comment'
);
CALL mysql.sp_shopmart_ensure_column(
    'product_db', 'product_reviews', 'hidden_reason',
    'ALTER TABLE product_db.product_reviews ADD COLUMN hidden_reason VARCHAR(255) NULL AFTER comment'
);
CALL mysql.sp_shopmart_ensure_index(
    'product_db', 'product_reviews', 'idx_reviews_product_status',
    'ALTER TABLE product_db.product_reviews ADD INDEX idx_reviews_product_status (product_id, status)'
);

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

-- ─────────────────────────────────────────────────────────────
--  6. order_db Schemas & Sprint 1 Column Upgrades
-- ─────────────────────────────────────────────────────────────
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

-- Ensure Sprint 2/3 voucher & subtotal columns exist on existing Sprint 1 orders table
CALL mysql.sp_shopmart_ensure_column(
    'order_db', 'orders', 'subtotal_amount',
    'ALTER TABLE order_db.orders ADD COLUMN subtotal_amount DECIMAL(12, 2) NULL AFTER shipping_address'
);
CALL mysql.sp_shopmart_ensure_column(
    'order_db', 'orders', 'voucher_code',
    'ALTER TABLE order_db.orders ADD COLUMN voucher_code VARCHAR(50) NULL AFTER shipping_address'
);
CALL mysql.sp_shopmart_ensure_column(
    'order_db', 'orders', 'discount_amount',
    'ALTER TABLE order_db.orders ADD COLUMN discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER shipping_address'
);

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

-- Ensure order_items.is_flash_sale exists on existing Sprint 1 order_items table
CALL mysql.sp_shopmart_ensure_column(
    'order_db', 'order_items', 'is_flash_sale',
    'ALTER TABLE order_db.order_items ADD COLUMN is_flash_sale BOOLEAN NOT NULL DEFAULT FALSE AFTER price_at_purchase'
);

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

-- ─────────────────────────────────────────────────────────────
--  7. payment_db Schemas & Sprint 1 Column Upgrades
-- ─────────────────────────────────────────────────────────────
USE payment_db;
CREATE TABLE IF NOT EXISTS payments (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id         BIGINT         NOT NULL,
    user_id          BIGINT,
    amount           DECIMAL(15, 2) NOT NULL,
    payment_method   VARCHAR(50)    NOT NULL,
    status           VARCHAR(20)    NOT NULL,
    transaction_code VARCHAR(100),
    version          BIGINT         NOT NULL DEFAULT 0,
    created_at       DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_payment_order_id (order_id),
    INDEX idx_payment_user_id (user_id),
    INDEX idx_payment_transaction_code (transaction_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ensure payments.user_id and idx_payment_user_id exist on existing Sprint 1 payments table
CALL mysql.sp_shopmart_ensure_column(
    'payment_db', 'payments', 'user_id',
    'ALTER TABLE payment_db.payments ADD COLUMN user_id BIGINT NULL AFTER order_id'
);
CALL mysql.sp_shopmart_ensure_index(
    'payment_db', 'payments', 'idx_payment_user_id',
    'ALTER TABLE payment_db.payments ADD INDEX idx_payment_user_id (user_id)'
);

-- Ensure payments.version exists on existing Sprint 1 payments table
CALL mysql.sp_shopmart_ensure_column(
    'payment_db', 'payments', 'version',
    'ALTER TABLE payment_db.payments ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER transaction_code'
);

-- ─────────────────────────────────────────────────────────────
--  8. chatbot_db Schemas (New in Current Release)
-- ─────────────────────────────────────────────────────────────
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

-- Clean up helper procedures
DROP PROCEDURE IF EXISTS mysql.sp_shopmart_ensure_column;
DROP PROCEDURE IF EXISTS mysql.sp_shopmart_ensure_index;
