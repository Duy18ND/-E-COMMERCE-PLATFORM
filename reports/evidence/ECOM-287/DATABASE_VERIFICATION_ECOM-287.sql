-- =============================================================================
-- SHOPMART E-COMMERCE PLATFORM - ECOM-287 DATABASE VERIFICATION SCRIPT
-- EPIC: [BE] QUẢN LÝ TỒN KHO (ECOM-280 / ECOM-136)
-- DATABASE: product_db
-- =============================================================================

USE `product_db`;

-- 1. Kiểm tra cấu trúc bảng products và ràng buộc CHECK không âm
SELECT 
    TABLE_NAME, 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'product_db' AND TABLE_NAME = 'products' AND COLUMN_NAME IN ('stock_quantity', 'status', 'version');

-- 2. Kiểm tra ràng buộc CHECK (stock_quantity >= 0)
SELECT 
    CONSTRAINT_NAME, 
    CHECK_CLAUSE 
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
WHERE CONSTRAINT_SCHEMA = 'product_db';

-- 3. Truy vấn mẫu kiểm tra trạng thái sản phẩm và số lượng tồn kho trước/sau thao tác
SELECT 
    id, 
    name, 
    price, 
    stock_quantity, 
    status, 
    version, 
    created_at, 
    updated_at 
FROM products 
WHERE id IN (1, 2) 
ORDER BY id ASC;

-- 4. Giả lập kịch bản kiểm tra: cố tình UPDATE tồn kho âm (Phải bị chặn bởi MySQL CHECK Constraint)
-- UPDATE products SET stock_quantity = -5 WHERE id = 1;
-- KẾT QUẢ KỲ VỌNG: Error Code 3819: Check constraint 'chk_products_stock_quantity' is violated.

-- 5. Đối chiếu số lượng sản phẩm theo từng nhóm trạng thái
SELECT 
    status, 
    COUNT(*) AS total_products, 
    SUM(stock_quantity) AS total_stock 
FROM products 
GROUP BY status;
