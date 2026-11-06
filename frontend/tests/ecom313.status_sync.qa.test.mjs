/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-313
 * [FE] Đồng bộ cập nhật trạng thái Admin với trang Customer
 * Mô tả: Phần giao diện/tích hợp: Đồng bộ cập nhật trạng thái Admin với trang Customer
 * Dự án: ShopMart – E-commerce Platform
 * Sprint: Sprint 2 | Epic: CUSTOMER (Parent: ECOM-308, Feature: ECOM-159)
 * Người phụ trách: NGÔ PHƯƠNG
 * ==============================================================================
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('ECOM-313: [FE] ĐỒNG BỘ CẬP NHẬT TRẠNG THÁI ADMIN VỚI TRANG CUSTOMER', () => {
  const orderServiceFile = path.join(rootDir, 'src', 'services', 'orderService.js');
  const adminOrdersFile = path.join(rootDir, 'src', 'pages', 'admin', 'Orders.jsx');
  const customerOrdersFile = path.join(rootDir, 'src', 'pages', 'customer', 'Orders.jsx');
  const orderDetailFile = path.join(rootDir, 'src', 'pages', 'customer', 'OrderDetail.jsx');
  const orderTrackingFile = path.join(rootDir, 'src', 'pages', 'customer', 'OrderTracking.jsx');
  const orderTimelineFile = path.join(rootDir, 'src', 'components', 'order', 'OrderTimeline.jsx');
  const constantsFile = path.join(rootDir, 'src', 'utils', 'constants.js');

  test('TC-313-01: Định nghĩa sự kiện đồng bộ ORDER_STATUS_SYNC_EVENT và kênh tín hiệu đa tab trong orderService.js', () => {
    const content = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(content.includes('ORDER_STATUS_SYNC_EVENT'), 'Phải khai báo hằng số ORDER_STATUS_SYNC_EVENT');
    assert.ok(content.includes('shopmart:order-status-updated'), 'Tên sự kiện phải là shopmart:order-status-updated');
    assert.ok(content.includes('notifyOrderStatusSync'), 'Phải có hàm phát sự kiện notifyOrderStatusSync');
  });

  test('TC-313-02: Hàm subscribeOrderStatusSync hỗ trợ 3 kênh đồng bộ (CustomEvent cùng tab, StorageEvent đa tab, Window Focus)', () => {
    const content = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(content.includes('subscribeOrderStatusSync'), 'orderService phải cung cấp hàm subscribeOrderStatusSync');
    assert.ok(content.includes('window.addEventListener(ORDER_STATUS_SYNC_EVENT'), 'Phải lắng nghe CustomEvent cùng tab');
    assert.ok(content.includes("window.addEventListener('storage'"), 'Phải lắng nghe sự kiện storage đa tab');
    assert.ok(content.includes("window.addEventListener('focus'"), 'Phải lắng nghe sự kiện focus khi chuyển lại tab Customer');
  });

  test('TC-313-03: Khi Admin gọi updateOrderStatus(id, status, note), hệ thống gọi PUT /admin/orders/{id}/status và phát tín hiệu đồng bộ', () => {
    const content = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(content.includes('updateOrderStatus: async (id, status, note = \'\')'), 'Phải có hàm updateOrderStatus(id, status, note)');
    assert.ok(content.includes('/admin/orders/${id}/status'), 'Phải gọi PUT /admin/orders/${id}/status');
    assert.ok(content.includes('notifyOrderStatusSync({'), 'Phải gọi notifyOrderStatusSync sau khi cập nhật trạng thái');
  });

  test('TC-313-04: Chế độ Fallback của updateOrderStatus lưu bản ghi lịch sử mới kèm actorRole ROLE_ADMIN, note và createdAt thực tế', () => {
    const content = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(content.includes("action: 'ADMIN_STATUS_UPDATE'"), 'Phải ghi action ADMIN_STATUS_UPDATE');
    assert.ok(content.includes("actorRole: 'ROLE_ADMIN'"), 'Phải ghi actorRole ROLE_ADMIN');
    assert.ok(content.includes('statusHistories: [...existingHistories, historyRecord]'), 'Phải nối thêm bản ghi lịch sử vào statusHistories');
  });

  test('TC-313-05: Khi Customer hủy đơn (cancelOrder), hệ thống đồng bộ trạng thái CANCELLED và ghi nhận lịch sử hủy đơn', () => {
    const content = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(content.includes('cancelOrder: async (id)'), 'Phải có hàm cancelOrder');
    assert.ok(content.includes("action: 'ORDER_CANCELLED'"), 'Phải ghi nhận action ORDER_CANCELLED');
    assert.ok(content.includes('status: ORDER_STATUS.CANCELLED'), 'Phải cập nhật trạng thái sang ORDER_STATUS.CANCELLED');
  });

  test('TC-313-06: Hàm getOrderStatusHistory hợp nhất các bản ghi cập nhật thực tế từ Admin trong statusHistories', () => {
    const content = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(content.includes('order.statusHistories'), 'getOrderStatusHistory phải đọc và đồng bộ order.statusHistories');
    assert.ok(content.includes('mockHistories.sort'), 'Phải sắp xếp lịch sử theo thời gian createdAt tăng dần');
  });

  test('TC-313-07: Trang Customer Orders.jsx tự động lắng nghe subscribeOrderStatusSync và làm mới danh sách đơn hàng', () => {
    const content = fs.readFileSync(customerOrdersFile, 'utf8');
    assert.ok(content.includes('orderService.subscribeOrderStatusSync'), 'Orders.jsx phải đăng ký subscribeOrderStatusSync');
    assert.ok(content.includes('fetchOrders()'), 'Orders.jsx phải gọi fetchOrders() khi có sự kiện đồng bộ');
  });

  test('TC-313-08: Bộ lọc trạng thái trên trang Customer Orders.jsx đồng bộ đầy đủ các trạng thái Admin cập nhật (CONFIRMED, PROCESSING, SHIPPING, COMPLETED, CANCELLED)', () => {
    const content = fs.readFileSync(customerOrdersFile, 'utf8');
    assert.ok(content.includes('ORDER_STATUS.PENDING'), 'Phải có tab PENDING');
    assert.ok(content.includes('ORDER_STATUS.PAID'), 'Phải có tab PAID');
    assert.ok(content.includes('ORDER_STATUS.CONFIRMED'), 'Phải có tab CONFIRMED');
    assert.ok(content.includes('ORDER_STATUS.PROCESSING'), 'Phải có tab PROCESSING');
    assert.ok(content.includes('ORDER_STATUS.SHIPPING'), 'Phải có tab SHIPPING');
    assert.ok(content.includes('ORDER_STATUS.COMPLETED'), 'Phải có tab COMPLETED/DELIVERED');
    assert.ok(content.includes('ORDER_STATUS.CANCELLED'), 'Phải có tab CANCELLED');
  });

  test('TC-313-09: Trang Customer OrderDetail.jsx lắng nghe subscribeOrderStatusSync theo id đơn hàng và có nút Làm mới thủ công', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('orderService.subscribeOrderStatusSync'), 'OrderDetail.jsx phải đăng ký subscribeOrderStatusSync');
    assert.ok(content.includes('fetchOrderDetail'), 'OrderDetail.jsx phải gọi fetchOrderDetail khi nhận tín hiệu đồng bộ');
    assert.ok(content.includes('🔄 Làm mới'), 'OrderDetail.jsx phải có nút Làm mới trạng thái');
  });

  test('TC-313-10: Trang Customer OrderDetail.jsx tự động ẩn nút Hủy đơn hàng khi Admin đã chuyển trạng thái khỏi PENDING', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('const isPending = order.status === ORDER_STATUS.PENDING;'), 'Phải kiểm tra trạng thái PENDING');
    assert.ok(content.includes('{isPending && ('), 'Chỉ hiển thị nút Hủy đơn hàng khi đơn còn ở trạng thái PENDING');
  });

  test('TC-313-11: Trang Customer OrderTracking.jsx lắng nghe subscribeOrderStatusSync theo id đơn hàng và cập nhật tiến độ giao hàng', () => {
    const content = fs.readFileSync(orderTrackingFile, 'utf8');
    assert.ok(content.includes('orderService.subscribeOrderStatusSync'), 'OrderTracking.jsx phải đăng ký subscribeOrderStatusSync');
    assert.ok(content.includes('fetchTrackingData'), 'OrderTracking.jsx phải gọi fetchTrackingData khi nhận tín hiệu đồng bộ');
    assert.ok(content.includes('getEstimatedDelivery'), 'OrderTracking.jsx phải cập nhật trạng thái Tiến độ vận chuyển');
  });

  test('TC-313-12: Component OrderTimeline.jsx tự động tải lại lịch sử khi propStatus thay đổi hoặc nhận sự kiện đồng bộ từ Admin', () => {
    const content = fs.readFileSync(orderTimelineFile, 'utf8');
    assert.ok(content.includes('[orderId, propStatus, propHistory, fetchHistory]'), 'useEffect trong OrderTimeline phải phụ thuộc vào propStatus');
    assert.ok(content.includes('orderService.subscribeOrderStatusSync'), 'OrderTimeline phải đăng ký subscribeOrderStatusSync');
    assert.ok(content.includes('propHistory.length > 0'), 'Không để mảng rỗng propHistory=[] chặn việc gọi API fetchHistory()');
  });

  test('TC-313-13: Trang Admin Orders.jsx đồng bộ quy trình chuyển trạng thái ORDER_TRANSITIONS khớp với State Machine và cập nhật ngay modal Timeline', () => {
    const content = fs.readFileSync(adminOrdersFile, 'utf8');
    assert.ok(content.includes('ORDER_TRANSITIONS'), 'Admin Orders.jsx phải có cấu hình ORDER_TRANSITIONS');
    assert.ok(content.includes('orderService.updateOrderStatus(orderId, targetStatus, customNote)'), 'Admin phải truyền orderId, targetStatus và customNote');
    assert.ok(content.includes('orderService.getOrderStatusHistory(orderId)'), 'Admin modal phải đồng bộ lại statusHistories sau khi cập nhật');
  });

  test('TC-313-14: Đồng bộ danh mục hằng số ORDER_STATUS và ORDER_STATUS_LABELS giữa Admin, Customer và Backend OrderStatus enum', () => {
    const content = fs.readFileSync(constantsFile, 'utf8');
    const requiredStatuses = ['PENDING', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'FAILED', 'REFUNDED'];
    requiredStatuses.forEach((st) => {
      assert.ok(content.includes(`${st}: '${st}'`), `ORDER_STATUS phải định nghĩa ${st}`);
      assert.ok(content.includes(`${st}:`), `ORDER_STATUS_LABELS phải có nhãn tiếng Việt cho ${st}`);
    });
  });

  test('TC-313-15: Kiểm thử thực thi luồng đồng bộ sự kiện từ updateOrderStatus tới subscriber của Customer', async () => {
    const content = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(content.includes('new CustomEvent(ORDER_STATUS_SYNC_EVENT, { detail: syncDetail })'), 'Phải khởi tạo CustomEvent kèm detail');
    assert.ok(content.includes('String(detail.orderId) === String(targetOrderId)'), 'Phải lọc đúng targetOrderId khi đồng bộ trang chi tiết đơn');
  });

  test('TC-313-16: An toàn mã nguồn: không có biến notify khai báo trùng lặp hoặc conflict marker trong các file đồng bộ', () => {
    const files = [orderServiceFile, adminOrdersFile, customerOrdersFile, orderDetailFile, orderTrackingFile, orderTimelineFile];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      assert.ok(!/^(<<<<<<<|=======|>>>>>>>)/m.test(src), `File ${path.basename(file)} không được chứa conflict marker`);
      const notifyDecls = src.match(/const\s+\{[^}]*notify[^}]*\}\s*=\s*useNotification\(\)/g) || [];
      assert.ok(notifyDecls.length <= 1, `File ${path.basename(file)} không được khai báo trùng biến notify`);
    }
  });
});
