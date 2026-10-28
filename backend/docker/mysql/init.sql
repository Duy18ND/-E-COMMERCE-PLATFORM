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
--  Product Service: product_reviews table
--  Điều kiện đánh giá: user phải có đơn DELIVERED chứa sản phẩm.
--  Ràng buộc UNIQUE (product_id, user_id): mỗi user chỉ đánh giá 1 lần.
-- ─────────────────────────────────────────────────────────────────────────────
USE product_db;

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

