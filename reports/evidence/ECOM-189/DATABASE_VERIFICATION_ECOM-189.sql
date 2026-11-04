-- =============================================================================
-- SHOPMART E-COMMERCE PLATFORM - EVIDENCE ECOM-189
-- DATABASE VERIFICATION QUERIES: TIMELINE & STATUS TRANSITION AUDIT
-- Database: order_db | Environment: Local / Test Sandbox
-- =============================================================================

-- 1. Kiểm tra cấu trúc bảng order_status_history
DESCRIBE `order_status_history`;
-- Kết quả: id (PK), order_id (FK), status (NOT NULL), previous_status, action, updated_by, actor_role, note (TEXT), created_at (NOT NULL)

-- 2. Kiểm tra chỉ mục phục vụ sắp xếp dòng thời gian chính xác
SHOW INDEX FROM `order_status_history`;
-- Kết quả:
-- - PRIMARY KEY (id)
-- - idx_status_history_order_id (order_id)
-- - idx_status_history_created_at (created_at)

-- 3. Kiểm tra tính tuần tự thời gian tăng dần của các mốc sự kiện đơn hàng
SELECT id, order_id, status, previous_status, action, updated_by, actor_role, note, created_at
FROM `order_status_history`
WHERE order_id = 1001
ORDER BY created_at ASC;

-- 4. Kiểm tra mốc khởi tạo đơn hàng ban đầu
SELECT id, order_id, status, previous_status, action, updated_by, actor_role, note, created_at
FROM `order_status_history`
WHERE order_id = 1001 AND action = 'ORDER_CREATED';
-- Kỳ vọng: status = 'PENDING', previous_status IS NULL, actor_role = 'ROLE_CUSTOMER'

-- 5. Kiểm tra tính bất biến của trạng thái kết thúc (CANCELLED / FAILED / REFUNDED)
-- Đảm bảo không có bản ghi nào chuyển đổi từ trạng thái kết thúc sang trạng thái đang xử lý
SELECT *
FROM `order_status_history`
WHERE previous_status IN ('CANCELLED', 'FAILED', 'REFUNDED')
  AND status NOT IN ('CANCELLED', 'FAILED', 'REFUNDED');
-- Kỳ vọng: 0 rows (Không có sự kiện chuyển lùi trạng thái trái phép)

-- 6. Kiểm tra tính đồng bộ giữa bảng orders và bản ghi mới nhất trong order_status_history
SELECT o.id, o.status AS current_order_status, h.status AS latest_history_status, h.action, h.created_at
FROM `orders` o
JOIN `order_status_history` h ON o.id = h.order_id
WHERE h.id = (
    SELECT MAX(id)
    FROM `order_status_history`
    WHERE order_id = o.id
)
LIMIT 20;
-- Kỳ vọng: current_order_status LUÔN LUÔN BẰNG latest_history_status (100% khớp dữ liệu)
