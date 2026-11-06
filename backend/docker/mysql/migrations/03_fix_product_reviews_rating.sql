-- Migration 03: product_db schema validation and product_reviews.rating type fix
-- Safe conversion from TINYINT to INT without data loss

USE product_db;

-- Fix column rating type if product_reviews exists
-- Hibernate expects Types#INTEGER (INT), previously TINYINT caused schema validation failure
ALTER TABLE product_reviews MODIFY COLUMN rating INT NOT NULL COMMENT 'Điểm đánh giá từ 1 đến 5 (Khớp Hibernate Integer)';
