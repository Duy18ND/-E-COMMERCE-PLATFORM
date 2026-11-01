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

