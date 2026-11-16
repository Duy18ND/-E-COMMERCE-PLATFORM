-- Migration 03: product_db schema validation, product_reviews moderation columns & flash_sale tables
-- Safe conversion from TINYINT to INT without data loss

USE product_db;

-- Fix column rating type if product_reviews exists
-- Hibernate expects Types#INTEGER (INT), previously TINYINT caused schema validation failure
ALTER TABLE product_reviews MODIFY COLUMN rating INT NOT NULL COMMENT 'Điểm đánh giá từ 1 đến 5 (Khớp Hibernate Integer)';

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
