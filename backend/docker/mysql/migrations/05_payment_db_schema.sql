-- Migration 05: payment_db tables (payments)
-- Safe for existing data (CREATE TABLE IF NOT EXISTS)

USE payment_db;

CREATE TABLE IF NOT EXISTS payments (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id         BIGINT         NOT NULL COMMENT 'ID đơn hàng liên kết',
    amount           DECIMAL(15, 2) NOT NULL COMMENT 'Số tiền thanh toán',
    payment_method   VARCHAR(50)    NOT NULL COMMENT 'Phương thức: COD, MOCK_ONLINE, VNPAY',
    status           VARCHAR(20)    NOT NULL COMMENT 'Trạng thái thanh toán: PENDING, SUCCESS, FAILED',
    transaction_code VARCHAR(100)            COMMENT 'Mã giao dịch đối soát duy nhất',
    created_at       DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_payment_order_id (order_id),
    INDEX idx_payment_transaction_code (transaction_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng lịch sử giao dịch thanh toán';
