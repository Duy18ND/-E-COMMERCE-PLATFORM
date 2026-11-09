-- =============================================================================
-- SHOPMART E-COMMERCE PLATFORM - EVIDENCE ECOM-175
-- DATABASE VERIFICATION QUERIES: ORDER UPDATE, CANCELLATION & ACCESS CONTROL
-- Database: order_db | Environment: Local / Test Sandbox
-- =============================================================================

-- 1. Kiểm tra cấu trúc bảng orders và các trường phân quyền, trạng thái
DESCRIBE `orders`;
-- Kết quả kỳ vọng: id, user_id (NOT NULL), total_amount, status (VARCHAR(30)), payment_method, created_at, updated_at

-- 2. Kiểm tra chỉ mục (Indexes) phục vụ truy vấn tối ưu và chống full table scan
SHOW INDEX FROM `orders`;
-- Kết quả kỳ vọng:
-- - PRIMARY KEY (id)
-- - idx_orders_user_id (user_id) -> Tăng tốc my-orders và chống IDOR
-- - idx_orders_status (status) -> Tăng tốc bộ lọc quản trị Admin
-- - idx_orders_created_at (created_at) -> Tăng tốc sắp xếp ngày đặt hàng

-- 3. Truy vấn xác minh đơn hàng thử nghiệm của User A (user_id = 10)
SELECT id, user_id, receiver_name, receiver_phone, total_amount, status, payment_method, created_at
FROM `orders`
WHERE id = 1001;

-- 4. Truy vấn danh sách sản phẩm thuộc đơn hàng 1001 (order_items)
SELECT id, order_id, product_id, product_name, price_at_purchase, quantity
FROM `order_items`
WHERE order_id = 1001;

-- 5. Xác minh lịch sử trạng thái (order_status_history) sau khi Admin cập nhật sang CONFIRMED
SELECT id, order_id, status, previous_status, action, updated_by, actor_role, note, created_at
FROM `order_status_history`
WHERE order_id = 1001
ORDER BY created_at ASC;

-- 6. Xác minh trạng thái sau khi đơn hàng bị hủy (CANCELLED)
SELECT id, status, updated_at
FROM `orders`
WHERE id = 1001;

-- 7. Xác minh bản ghi hủy đơn trong lịch sử trạng thái
SELECT id, order_id, status, previous_status, action, updated_by, actor_role, note, created_at
FROM `order_status_history`
WHERE order_id = 1001 AND status = 'CANCELLED'
ORDER BY created_at DESC
LIMIT 1;

-- 8. Kiểm tra tính toàn vẹn: Không cho phép tồn tại bản ghi orphan trong order_items
SELECT oi.id, oi.order_id
FROM `order_items` oi
LEFT JOIN `orders` o ON oi.order_id = o.id
WHERE o.id IS NULL;
-- Kết quả kỳ vọng: 0 rows (Không có dữ liệu rác)
