-- Migration 04: order_db tables (vouchers, orders, order_items, order_status_history, carts, cart_items)
-- Safe for existing data (CREATE TABLE IF NOT EXISTS)

USE order_db;

CREATE TABLE IF NOT EXISTS vouchers (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(50)    NOT NULL COMMENT 'Mã voucher (duy nhất, không phân biệt hoa thường)',
    name            VARCHAR(150)   NOT NULL COMMENT 'Tên chương trình khuyến mãi',
    description     VARCHAR(500)            COMMENT 'Mô tả chi tiết voucher',
    discount_type   VARCHAR(20)    NOT NULL COMMENT 'Loại giảm giá: FIXED (tiền cố định), PERCENT (%)',
    discount_value  DECIMAL(12, 2) NOT NULL COMMENT 'Giá trị giảm (VNĐ hoặc %)',
    max_discount    DECIMAL(12, 2)          COMMENT 'Mức giảm tối đa áp dụng cho PERCENT',
    min_order_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Giá trị đơn hàng tối thiểu để áp dụng mã',
    quantity        INT            NOT NULL COMMENT 'Tổng số lượt phát hành',
    used_quantity   INT            NOT NULL DEFAULT 0 COMMENT 'Số lượt đã sử dụng',
    start_date      DATE           NOT NULL COMMENT 'Ngày bắt đầu áp dụng',
    end_date        DATE           NOT NULL COMMENT 'Ngày kết thúc áp dụng',
    status          VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE' COMMENT 'Trạng thái: ACTIVE, INACTIVE',
    created_at      DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT uq_voucher_code UNIQUE (code),
    CONSTRAINT chk_vouchers_discount_value CHECK (discount_value > 0),
    CONSTRAINT chk_vouchers_quantity CHECK (quantity > 0 AND used_quantity >= 0 AND used_quantity <= quantity),
    CONSTRAINT chk_vouchers_dates CHECK (end_date >= start_date),
    INDEX idx_vouchers_code (code),
    INDEX idx_vouchers_status_dates (status, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng mã giảm giá voucher cho đơn hàng';

CREATE TABLE IF NOT EXISTS orders (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT         NOT NULL COMMENT 'ID người dùng đặt hàng',
    receiver_name    VARCHAR(100)   NOT NULL COMMENT 'Tên người nhận',
    receiver_phone   VARCHAR(20)    NOT NULL COMMENT 'Số điện thoại người nhận',
    shipping_address TEXT           NOT NULL COMMENT 'Địa chỉ nhận hàng chi tiết',
    subtotal_amount  DECIMAL(12, 2)          COMMENT 'Tổng tiền hàng trước giảm giá',
    voucher_code     VARCHAR(50)             COMMENT 'Mã voucher áp dụng',
    discount_amount  DECIMAL(12, 2) NOT NULL DEFAULT 0.00 COMMENT 'Số tiền giảm giá',
    total_amount     DECIMAL(12, 2) NOT NULL COMMENT 'Tổng số tiền thanh toán thực tế',
    status           VARCHAR(20)    NOT NULL DEFAULT 'PENDING' COMMENT 'Trạng thái đơn hàng: PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED, REFUNDED',
    payment_method   VARCHAR(30)    NOT NULL COMMENT 'Phương thức thanh toán: COD, MOCK_ONLINE, VNPAY',
    created_at       DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at       DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng quản lý đơn hàng';

CREATE TABLE IF NOT EXISTS order_items (
    id                BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id          BIGINT         NOT NULL COMMENT 'ID đơn hàng liên kết',
    product_id        BIGINT         NOT NULL COMMENT 'ID sản phẩm đã mua',
    product_name      VARCHAR(255)   NOT NULL COMMENT 'Tên sản phẩm tại thời điểm mua',
    quantity          INT            NOT NULL COMMENT 'Số lượng mua',
    price_at_purchase DECIMAL(12, 2) NOT NULL COMMENT 'Giá bán tại thời điểm đặt hàng',
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_item_order_id (order_id),
    INDEX idx_order_item_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng chi tiết các mặt hàng trong đơn hàng';

CREATE TABLE IF NOT EXISTS order_status_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id        BIGINT       NOT NULL COMMENT 'ID đơn hàng liên kết',
    status          VARCHAR(30)  NOT NULL COMMENT 'Trạng thái mới cập nhật',
    previous_status VARCHAR(30)           COMMENT 'Trạng thái trước khi cập nhật',
    action          VARCHAR(50)           COMMENT 'Hành động kích hoạt (ORDER_CREATED, STATUS_UPDATED, ...)',
    updated_by      VARCHAR(100)          COMMENT 'Người thực hiện cập nhật',
    actor_role      VARCHAR(50)           COMMENT 'Vai trò người cập nhật (ROLE_CUSTOMER, ROLE_ADMIN, SYSTEM)',
    note            TEXT                  COMMENT 'Ghi chú cập nhật trạng thái',
    created_at      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_status_history_order_id (order_id),
    INDEX idx_status_history_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Nhật ký lịch sử thay đổi trạng thái đơn hàng (Timeline)';

CREATE TABLE IF NOT EXISTS carts (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT      NOT NULL UNIQUE COMMENT 'ID người dùng sở hữu giỏ hàng',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)          DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_carts_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng giỏ hàng của người dùng';

CREATE TABLE IF NOT EXISTS cart_items (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    cart_id    BIGINT      NOT NULL COMMENT 'ID giỏ hàng',
    product_id BIGINT      NOT NULL COMMENT 'ID sản phẩm trong giỏ',
    quantity   INT         NOT NULL COMMENT 'Số lượng sản phẩm',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)          DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT uk_cart_item_cart_product UNIQUE (cart_id, product_id),
    INDEX idx_cart_items_cart_id (cart_id),
    INDEX idx_cart_items_product_id (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Bảng chi tiết các sản phẩm trong giỏ hàng';
