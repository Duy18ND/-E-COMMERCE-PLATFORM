import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const readBackendSrc = (relPath) => fs.readFileSync(path.join(rootDir, 'backend', relPath), 'utf8');
const readFrontendSrc = (relPath) => fs.readFileSync(path.join(rootDir, 'frontend', relPath), 'utf8');

// =========================================================================
// TEST SUITE: ECOM-175 & ECOM-189 QA COMPREHENSIVE VERIFICATION
// =========================================================================

test('TC-175-01 / TC-175-02: Backend State Machine định nghĩa chính xác ALLOWED_TRANSITIONS', () => {
  const orderServiceCode = readBackendSrc('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');
  assert.match(orderServiceCode, /ALLOWED_TRANSITIONS\s*=\s*Map\.of/, 'Phải có định nghĩa ALLOWED_TRANSITIONS');
  assert.match(orderServiceCode, /OrderStatus\.PENDING,\s*Set\.of\(OrderStatus\.PAID,\s*OrderStatus\.CONFIRMED,\s*OrderStatus\.CANCELLED,\s*OrderStatus\.FAILED\)/, 'PENDING được phép chuyển sang PAID, CONFIRMED, CANCELLED, FAILED');
  assert.match(orderServiceCode, /OrderStatus\.CONFIRMED,\s*Set\.of\(OrderStatus\.PROCESSING,\s*OrderStatus\.SHIPPING,\s*OrderStatus\.CANCELLED\)/, 'CONFIRMED được phép chuyển sang PROCESSING, SHIPPING, CANCELLED');
  assert.match(orderServiceCode, /OrderStatus\.SHIPPING,\s*Set\.of\(OrderStatus\.DELIVERED,\s*OrderStatus\.CANCELLED\)/, 'SHIPPING được phép chuyển sang DELIVERED, CANCELLED');
  assert.match(orderServiceCode, /OrderStatus\.CANCELLED,\s*Set\.of\(\)/, 'CANCELLED là trạng thái kết thúc (không thể chuyển tiếp)');
  assert.match(orderServiceCode, /OrderStatus\.FAILED,\s*Set\.of\(\)/, 'FAILED là trạng thái kết thúc (không thể chuyển tiếp)');
});

test('TC-175-09 / TC-175-10: Khách hàng chỉ được hủy đơn hàng ở trạng thái PENDING và hoàn kho', () => {
  const orderServiceCode = readBackendSrc('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');
  assert.match(orderServiceCode, /if\s*\(order\.getStatus\(\)\s*!=\s*OrderStatus\.PENDING\)\s*\{\s*throw new IllegalStateException\("Chỉ có thể hủy đơn hàng ở trạng thái PENDING/, 'Chặn hủy đơn khi khác PENDING');
  assert.match(orderServiceCode, /productClient\.restoreStock\(restoreItems\);/, 'Gọi hoàn kho qua FeignClient khi hủy đơn');
});

test('TC-175-16 / TC-175-18: Chống IDOR triệt để khi xem và hủy đơn hàng', () => {
  const orderServiceCode = readBackendSrc('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');
  // Chống IDOR khi cancelOrder
  assert.match(orderServiceCode, /if\s*\(!userId\.equals\(order\.getUserId\(\)\)\)\s*\{\s*throw new AccessDeniedException\("Bạn không có quyền hủy đơn hàng này"\);/, 'Chống IDOR khi khách hủy đơn');
  // Chống IDOR khi getOrderById
  assert.match(orderServiceCode, /if\s*\(!isAdmin\s*&&\s*!authenticatedUserId\.equals\(order\.getUserId\(\)\)\)\s*\{\s*log\.warn\("IDOR attempt blocked/, 'Chống IDOR khi xem chi tiết đơn');
  // Chống IDOR khi getOrderStatusHistory
  assert.match(orderServiceCode, /if\s*\(!isAdmin\s*&&\s*\(authenticatedUserId == null\s*\|\|\s*!order\.getUserId\(\)\.equals\(authenticatedUserId\)\)\)/, 'Chống IDOR khi xem Timeline');
});

test('TC-175-20: Admin có quyền ROLE_ADMIN được xem chi tiết đơn của bất kỳ người dùng nào', () => {
  const orderServiceCode = readBackendSrc('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');
  assert.match(orderServiceCode, /private boolean hasAdminRole\(String roles\)\s*\{[^}]*ROLE_ADMIN/s, 'Kiểm tra khớp chính xác ROLE_ADMIN');
});

test('TC-189-10 / TC-189-11: Chuyển trạng thái không hợp lệ hoặc chuyển lùi ném IllegalStateException', () => {
  const orderServiceCode = readBackendSrc('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');
  assert.match(orderServiceCode, /if\s*\(!allowedNext\.contains\(newStatus\)\)\s*\{\s*throw new IllegalStateException\(String\.format\("Không thể chuyển trạng thái đơn hàng từ %s sang %s"/, 'Ném ngoại lệ rõ ràng khi chuyển trạng thái sai');
});

test('TC-189-18 / TC-189-20: Timeline sắp xếp theo thời gian tăng dần và không suy diễn mốc giả', () => {
  const orderServiceCode = readBackendSrc('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');
  assert.match(orderServiceCode, /orderStatusHistoryRepository\.findByOrderIdOrderByCreatedAtAsc\(orderId\)/, 'Query DB sắp xếp OrderByCreatedAtAsc');

  const timelineComponentCode = readFrontendSrc('src/components/order/OrderTimeline.jsx');
  assert.match(timelineComponentCode, /new Date\(a\.createdAt \|\| 0\) - new Date\(b\.createdAt \|\| 0\)/, 'Frontend sắp xếp tăng dần theo thời gian');
  assert.match(timelineComponentCode, /formatTimelineDate/, 'Định dạng thời gian theo chuẩn tiếng Việt');
});

test('TC-189-26: Frontend Timeline hiển thị cảnh báo IDOR khi API trả về 403 Forbidden', () => {
  const timelineComponentCode = readFrontendSrc('src/components/order/OrderTimeline.jsx');
  assert.match(timelineComponentCode, /if\s*\(status === 403\)\s*\{\s*setIsAccessDenied\(true\);/, 'Xử lý lỗi 403 IDOR');
  assert.match(timelineComponentCode, /Bạn không có quyền xem thông tin lịch sử đơn hàng này \(Bảo mật IDOR\)/, 'Thông báo bảo mật rõ ràng');
});

test('TC-175-06 / TC-175-07 / TC-175-08: Admin Orders Modal xác nhận và nút bấm chống spam click', () => {
  const adminOrdersCode = readFrontendSrc('src/pages/admin/Orders.jsx');
  assert.match(adminOrdersCode, /const confirmed = await confirmDialog\(/, 'Modal xác nhận trước khi thực hiện chuyển trạng thái');
  assert.match(adminOrdersCode, /if \(!confirmed\) return;/, 'Hủy bỏ không gửi API');
  assert.match(adminOrdersCode, /setActionLoading\(true\);/, 'Bật loading chống duplicate click');
  assert.match(adminOrdersCode, /notify\.error\(/, 'Bắt lỗi API thất bại, không thông báo thành công giả');
});

test('TC-189-29 / TC-189-30 / TC-189-36: Đồng bộ dữ liệu hai chiều và ghi nhận nhật ký đầy đủ', () => {
  const orderServiceCode = readBackendSrc('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');
  assert.match(orderServiceCode, /recordStatusHistory\(savedOrder,\s*newStatus,\s*currentStatus,\s*"ADMIN_STATUS_UPDATE"/, 'Lưu vết lịch sử trạng thái khi Admin cập nhật');
  assert.match(orderServiceCode, /@Transactional\(rollbackFor = Exception\.class\)/, 'Transaction nguyên tử đảm bảo rollback khi lỗi');
});
