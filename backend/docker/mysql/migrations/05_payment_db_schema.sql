-- Migration 05: payment_db tables (payments)
-- Safe for existing data (CREATE TABLE IF NOT EXISTS & idempotent ALTER TABLE)

USE payment_db;

CREATE TABLE IF NOT EXISTS payments (
    id               BIGINT         NOT NULL AUTO_INCREMENT,
    order_id         BIGINT         NOT NULL,
    user_id          BIGINT                  DEFAULT NULL,
    amount           DECIMAL(15, 2) NOT NULL,
    payment_method   VARCHAR(50)    NOT NULL,
    status           VARCHAR(20)    NOT NULL,
    transaction_code VARCHAR(100)            DEFAULT NULL,
    version          BIGINT         NOT NULL DEFAULT 0,
    created_at       DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_payment_order_id (order_id),
    KEY idx_payment_user_id (user_id),
    KEY idx_payment_transaction_code (transaction_code)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Idempotent upgrade for existing payment_db.payments tables created in Sprint 1
SET @col_pay_user := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'payment_db' AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'user_id'
);
SET @add_pay_user_sql := IF(
    @col_pay_user = 0,
    'ALTER TABLE payment_db.payments ADD COLUMN user_id BIGINT NULL AFTER order_id',
    'SELECT 1'
);
PREPARE stmt_add_pay_user FROM @add_pay_user_sql;
EXECUTE stmt_add_pay_user;
DEALLOCATE PREPARE stmt_add_pay_user;

SET @idx_pay_user := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = 'payment_db' AND TABLE_NAME = 'payments' AND INDEX_NAME = 'idx_payment_user_id'
);
SET @add_idx_pay_user_sql := IF(
    @idx_pay_user = 0,
    'ALTER TABLE payment_db.payments ADD INDEX idx_payment_user_id (user_id)',
    'SELECT 1'
);
PREPARE stmt_add_idx_pay_user FROM @add_idx_pay_user_sql;
EXECUTE stmt_add_idx_pay_user;
DEALLOCATE PREPARE stmt_add_idx_pay_user;

SET @col_pay_ver := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'payment_db' AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'version'
);
SET @add_pay_ver_sql := IF(
    @col_pay_ver = 0,
    'ALTER TABLE payment_db.payments ADD COLUMN version BIGINT NOT NULL DEFAULT 0 AFTER transaction_code',
    'SELECT 1'
);
PREPARE stmt_add_pay_ver FROM @add_pay_ver_sql;
EXECUTE stmt_add_pay_ver;
DEALLOCATE PREPARE stmt_add_pay_ver;
