-- =============================================================================
-- SHOPMART E-COMMERCE PLATFORM — ECOM-165 DATABASE VERIFICATION SCRIPT
-- =============================================================================
-- Các câu lệnh SQL kiểm tra cấu trúc bảng, ràng buộc toàn vẹn dữ liệu,
-- chỉ mục hiệu năng và trạng thái dữ liệu của tính năng Flash Sale.
-- =============================================================================

USE product_db;

-- 1. Kiểm tra cấu trúc bảng chiến dịch Flash Sale
DESCRIBE flash_sale_campaigns;

-- 2. Kiểm tra cấu trúc bảng chi tiết sản phẩm Flash Sale
DESCRIBE flash_sale_items;

-- 3. Kiểm tra các chỉ mục (Indexes) phục vụ truy vấn thời gian thực
SHOW INDEX FROM flash_sale_campaigns;
SHOW INDEX FROM flash_sale_items;

-- 4. Truy vấn các chiến dịch Flash Sale đang có hiệu lực trong khung giờ hiện tại
SELECT 
    c.id AS campaign_id,
    c.name AS campaign_name,
    c.start_time,
    c.end_time,
    c.status,
    COUNT(i.id) AS total_items,
    SUM(i.quantity) AS total_quota,
    SUM(i.sold_quantity) AS total_sold
FROM flash_sale_campaigns c
LEFT JOIN flash_sale_items i ON c.id = i.campaign_id
WHERE c.status = 'ACTIVE'
  AND c.start_time <= NOW()
  AND c.end_time >= NOW()
GROUP BY c.id, c.name, c.start_time, c.end_time, c.status
ORDER BY c.start_time DESC;

-- 5. Truy vấn chi tiết sản phẩm Flash Sale kèm so sánh giá gốc và phần trăm giảm
SELECT 
    i.id AS item_id,
    c.name AS campaign_name,
    p.id AS product_id,
    p.name AS product_name,
    p.price AS original_price,
    i.flash_sale_price,
    ROUND(((p.price - i.flash_sale_price) / p.price) * 100) AS discount_percentage,
    i.quantity AS total_flash_stock,
    i.sold_quantity,
    (i.quantity - i.sold_quantity) AS remaining_flash_stock,
    p.stock_quantity AS physical_warehouse_stock,
    i.user_limit
FROM flash_sale_items i
JOIN flash_sale_campaigns c ON i.campaign_id = c.id
JOIN products p ON i.product_id = p.id
WHERE c.status = 'ACTIVE'
ORDER BY i.flash_sale_price ASC;

-- 6. Truy vấn kiểm tra tính toàn vẹn (Integrity Check):
-- Đảm bảo không có dòng nào vi phạm: flash_sale_price >= original_price
SELECT i.id, i.product_id, p.price, i.flash_sale_price
FROM flash_sale_items i
JOIN products p ON i.product_id = p.id
WHERE i.flash_sale_price >= p.price;

-- 7. Truy vấn kiểm tra tồn kho vật lý đủ để phân bổ Flash Sale:
SELECT i.id, i.product_id, p.stock_quantity AS warehouse_stock, i.quantity AS flash_quota
FROM flash_sale_items i
JOIN products p ON i.product_id = p.id
WHERE i.quantity > p.stock_quantity;

-- 8. Truy vấn kiểm tra ràng buộc không âm và không bán quá số lượng phân bổ:
SELECT id, campaign_id, product_id, quantity, sold_quantity
FROM flash_sale_items
WHERE sold_quantity < 0 OR sold_quantity > quantity;
