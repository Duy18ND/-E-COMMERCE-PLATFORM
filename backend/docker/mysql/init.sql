-- ═══════════════════════════════════════════════════════════════
--  E-Commerce Platform — MySQL Initialization Script
--  Creates 4 isolated databases + grants permissions
-- ═══════════════════════════════════════════════════════════════

-- Auth Service database
CREATE DATABASE IF NOT EXISTS auth_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Product Service database
CREATE DATABASE IF NOT EXISTS product_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Order Service database
CREATE DATABASE IF NOT EXISTS order_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Payment Service database
CREATE DATABASE IF NOT EXISTS payment_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Grant full privileges on all 4 databases to the ecommerce_user
GRANT ALL PRIVILEGES ON auth_db.*    TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON product_db.* TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON order_db.*   TO 'ecommerce_user'@'%';
GRANT ALL PRIVILEGES ON payment_db.* TO 'ecommerce_user'@'%';

FLUSH PRIVILEGES;

-- ─────────────────────────────────────────────────────────────────────────────
--  Product Service: products table
--  Ràng buộc CHECK (stock_quantity >= 0): Đảm bảo tồn kho không bao giờ bị âm ở tầng CSDL.
--  Cột version phục vụ JPA Optimistic Locking (@Version) khi xử lý đồng thời.
-- ─────────────────────────────────────────────────────────────────────────────
USE product_db;

CREATE TABLE IF NOT EXISTS categories (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE COMMENT 'Tên danh mục sản phẩm',
    description VARCHAR(255)                 COMMENT 'Mô tả danh mục',
    image_url   VARCHAR(500)                 COMMENT 'Đường dẫn ảnh danh mục',
    created_at  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at  DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục phân loại sản phẩm';

CREATE TABLE IF NOT EXISTS products (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(200)   NOT NULL COMMENT 'Tên sản phẩm',
    description    TEXT                    COMMENT 'Mô tả chi tiết sản phẩm',
    price          DECIMAL(12, 2) NOT NULL COMMENT 'Giá bán sản phẩm',
    stock_quantity INT            NOT NULL COMMENT 'Số lượng tồn kho hiện tại (không âm)',
    category       VARCHAR(100)            COMMENT 'Tên danh mục sản phẩm',
    image_url      VARCHAR(500)            COMMENT 'Đường dẫn ảnh sản phẩm',
    status         VARCHAR(20)    NOT NULL DEFAULT 'ACTIVE' COMMENT 'Trạng thái: ACTIVE, INACTIVE, OUT_OF_STOCK',
    version        BIGINT         NOT NULL DEFAULT 0 COMMENT 'Optimistic Locking version chống race condition',
    created_at     DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at     DATETIME(6)             DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_products_stock_non_negative CHECK (stock_quantity >= 0),
    INDEX idx_products_name (name),
    INDEX idx_products_category (category),
    INDEX idx_products_status (status),
    INDEX idx_products_status_price (status, price),
    INDEX idx_products_status_category (status, category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Danh mục sản phẩm và quản lý tồn kho';

-- ─────────────────────────────────────────────────────────────────────────────
--  Product Service: product_reviews table
--  Điều kiện đánh giá: user phải có đơn DELIVERED chứa sản phẩm.
--  Ràng buộc UNIQUE (product_id, user_id): mỗi user chỉ đánh giá 1 lần.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_reviews (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT       NOT NULL COMMENT 'ID sản phẩm được đánh giá',
    user_id    BIGINT       NOT NULL COMMENT 'ID người dùng viết đánh giá',
    order_id   BIGINT       NOT NULL COMMENT 'ID đơn hàng DELIVERED — xác minh điều kiện đánh giá',
    rating     TINYINT      NOT NULL COMMENT 'Điểm đánh giá từ 1 đến 5',
    comment    TEXT                  COMMENT 'Nội dung bình luận (tuỳ chọn)',
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT uq_review_product_user UNIQUE (product_id, user_id),
    INDEX idx_reviews_product_id (product_id),
    INDEX idx_reviews_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Đánh giá sản phẩm từ khách hàng đã mua hàng';

-- ─────────────────────────────────────────────────────────────────────────────
--  Product Service: flash_sale_campaigns & flash_sale_items tables
--  Quản lý chương trình Flash Sale, giá ưu đãi, hạn mức mua và tồn kho phân bổ.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flash_sale_campaigns (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(200) NOT NULL COMMENT 'Tên chiến dịch Flash Sale',
    start_time DATETIME(6)  NOT NULL COMMENT 'Thời điểm bắt đầu',
    end_time   DATETIME(6)  NOT NULL COMMENT 'Thời điểm kết thúc',
    status     VARCHAR(20)  NOT NULL DEFAULT 'UPCOMING' COMMENT 'UPCOMING, ACTIVE, ENDED, CANCELLED',
    created_at DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6)           DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    INDEX idx_fs_status_time (status, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Chương trình chiến dịch Flash Sale';

CREATE TABLE IF NOT EXISTS flash_sale_items (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    campaign_id      BIGINT         NOT NULL COMMENT 'ID chiến dịch Flash Sale',
    product_id       BIGINT         NOT NULL COMMENT 'ID sản phẩm tham gia Flash Sale',
    flash_sale_price DECIMAL(12, 2) NOT NULL COMMENT 'Giá ưu đãi trong Flash Sale',
    quantity         INT            NOT NULL COMMENT 'Số lượng phân bổ cho Flash Sale',
    sold_quantity    INT            NOT NULL DEFAULT 0 COMMENT 'Số lượng đã bán',
    user_limit       INT            NOT NULL DEFAULT 2 COMMENT 'Số lượng tối đa 1 khách được mua',
    CONSTRAINT fk_fs_campaign FOREIGN KEY (campaign_id) REFERENCES flash_sale_campaigns(id) ON DELETE CASCADE,
    CONSTRAINT fk_fs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT uq_fs_campaign_product UNIQUE (campaign_id, product_id),
    CONSTRAINT chk_fs_price CHECK (flash_sale_price > 0),
    CONSTRAINT chk_fs_quantity CHECK (quantity > 0 AND sold_quantity >= 0 AND sold_quantity <= quantity),
    INDEX idx_fs_item_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Chi tiết sản phẩm và hạn mức trong chiến dịch Flash Sale';

-- ─────────────────────────────────────────────────────────────────────────────
--  Order Service: vouchers table
--  Quản lý mã giảm giá (Voucher / Coupon), hạn sử dụng và giới hạn lượt dùng
-- ─────────────────────────────────────────────────────────────────────────────
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


