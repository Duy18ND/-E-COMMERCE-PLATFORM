-- Migration 03: product_db schema validation, product_reviews moderation columns & flash_sale tables
-- Safe conversion from TINYINT to INT without data loss
-- Non-mutating read-only validation: aborts safely if invalid rating records exist

USE product_db;

-- 1. Ensure products table exists and products.version exists for Sprint 1 tables
CREATE TABLE IF NOT EXISTS products (
    id             BIGINT         NOT NULL AUTO_INCREMENT,
    name           VARCHAR(200)   NOT NULL,
    description    TEXT                    DEFAULT NULL,
    price          DECIMAL(12, 2) NOT NULL,
    stock_quantity INT            NOT NULL,
    category       VARCHAR(100)            DEFAULT NULL,
    image_url      VARCHAR(500)            DEFAULT NULL,
    status         VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE',
    version        BIGINT         NOT NULL DEFAULT 0,
    created_at     DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6)    NULL     DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

SET @col_p_ver := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'product_db' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'version'
);
SET @add_p_ver_sql := IF(
    @col_p_ver = 0,
    'ALTER TABLE product_db.products ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER status',
    'SELECT 1'
);
PREPARE stmt_p_ver FROM @add_p_ver_sql;
EXECUTE stmt_p_ver;
DEALLOCATE PREPARE stmt_p_ver;

-- 2. Ensure product_reviews table exists and validate rating data
CREATE TABLE IF NOT EXISTS product_reviews (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    product_id    BIGINT       NOT NULL,
    user_id       BIGINT       NOT NULL,
    order_id      BIGINT       NOT NULL,
    rating        INT          NOT NULL,
    comment       TEXT                  DEFAULT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'APPROVED',
    hidden_reason VARCHAR(255)          DEFAULT NULL,
    created_at    DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at    DATETIME(6)  NULL     DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_reviews_product_id (product_id),
    KEY idx_reviews_user_id (user_id),
    KEY idx_reviews_product_status (product_id, status),
    CONSTRAINT uq_review_product_user UNIQUE (product_id, user_id),
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Read-only data validation & safe type conversion for product_reviews.rating
-- NEVER silently mutate historical customer reviews. If invalid records exist, abort safely.
DROP PROCEDURE IF EXISTS sp_shopmart_validate_and_modify_rating;
DELIMITER $$
CREATE PROCEDURE sp_shopmart_validate_and_modify_rating()
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_reviews'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM product_db.product_reviews
            WHERE rating IS NULL OR rating NOT BETWEEN 1 AND 5
        ) THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Migration aborted: invalid rating records detected in product_reviews (NULL or out of range [1-5]). Historical data preserved; manual audit required.';
        END IF;

        ALTER TABLE product_db.product_reviews
            MODIFY COLUMN rating INT NOT NULL COMMENT 'Điểm đánh giá từ 1 đến 5 (Khớp Hibernate Integer)';
    END IF;
END$$
DELIMITER ;

CALL sp_shopmart_validate_and_modify_rating();
DROP PROCEDURE IF EXISTS sp_shopmart_validate_and_modify_rating;

-- 3. Ensure moderation columns exist on product_reviews
SET @col_pr_status := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'product_db' AND TABLE_NAME = 'product_reviews' AND COLUMN_NAME = 'status'
);
SET @add_pr_status_sql := IF(
    @col_pr_status = 0,
    'ALTER TABLE product_db.product_reviews ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''APPROVED'' AFTER comment',
    'SELECT 1'
);
PREPARE stmt_pr_status FROM @add_pr_status_sql;
EXECUTE stmt_pr_status;
DEALLOCATE PREPARE stmt_pr_status;

SET @col_pr_reason := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'product_db' AND TABLE_NAME = 'product_reviews' AND COLUMN_NAME = 'hidden_reason'
);
SET @add_pr_reason_sql := IF(
    @col_pr_reason = 0,
    'ALTER TABLE product_db.product_reviews ADD COLUMN hidden_reason VARCHAR(255) NULL AFTER comment',
    'SELECT 1'
);
PREPARE stmt_pr_reason FROM @add_pr_reason_sql;
EXECUTE stmt_pr_reason;
DEALLOCATE PREPARE stmt_pr_reason;

SET @idx_pr_status := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'product_db' AND TABLE_NAME = 'product_reviews' AND INDEX_NAME = 'idx_reviews_product_status'
);
SET @add_idx_pr_sql := IF(
    @idx_pr_status = 0,
    'ALTER TABLE product_db.product_reviews ADD INDEX idx_reviews_product_status (product_id, status)',
    'SELECT 1'
);
PREPARE stmt_idx_pr FROM @add_idx_pr_sql;
EXECUTE stmt_idx_pr;
DEALLOCATE PREPARE stmt_idx_pr;

-- 4. Create Flash Sale tables if not exist
CREATE TABLE IF NOT EXISTS flash_sale_campaigns (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    name       VARCHAR(200) NOT NULL,
    start_time DATETIME(6)  NOT NULL,
    end_time   DATETIME(6)  NOT NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'UPCOMING',
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_fs_status_time (status, start_time, end_time)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flash_sale_items (
    id               BIGINT         NOT NULL AUTO_INCREMENT,
    campaign_id      BIGINT         NOT NULL,
    product_id       BIGINT         NOT NULL,
    flash_sale_price DECIMAL(12, 2) NOT NULL,
    quantity         INT            NOT NULL,
    sold_quantity    INT            NOT NULL DEFAULT 0,
    user_limit       INT            NOT NULL DEFAULT 2,
    PRIMARY KEY (id),
    KEY idx_fs_item_product (product_id),
    CONSTRAINT uq_fs_campaign_product UNIQUE (campaign_id, product_id),
    CONSTRAINT chk_fs_price CHECK (flash_sale_price > 0),
    CONSTRAINT chk_fs_quantity CHECK (quantity > 0 AND sold_quantity >= 0 AND sold_quantity <= quantity),
    CONSTRAINT fk_fs_campaign FOREIGN KEY (campaign_id) REFERENCES flash_sale_campaigns (id) ON DELETE CASCADE,
    CONSTRAINT fk_fs_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
