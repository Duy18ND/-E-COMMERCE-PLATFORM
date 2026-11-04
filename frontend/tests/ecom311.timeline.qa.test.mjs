/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-311: TIMELINE THEO DÕI TRẠNG THÁI ĐƠN HÀNG
 * Dự án: ShopMart – E-commerce Platform
 * Sprint: Sprint 2 | Epic: [FE] Theo dõi đơn hàng chi tiết
 * Người phụ trách: Ngô Thị Hoài Phương (Frontend), Đoàn Mạnh Duy (Backend ECOM-315)
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

describe('ECOM-311: TIMELINE THEO DÕI TRẠNG THÁI ĐƠN HÀNG', () => {

  const timelineFile = path.join(rootDir, 'src', 'components', 'order', 'OrderTimeline.jsx');
  const orderDetailFile = path.join(rootDir, 'src', 'pages', 'customer', 'OrderDetail.jsx');
  const adminOrdersFile = path.join(rootDir, 'src', 'pages', 'admin', 'Orders.jsx');
  const orderServiceFile = path.join(rootDir, 'src', 'services', 'orderService.js');
  const constantsFile = path.join(rootDir, 'src', 'utils', 'constants.js');

  test('TC-311-01: Tồn tại component OrderTimeline với Stepper 5 bước chuẩn', () => {
    assert.ok(fs.existsSync(timelineFile), 'File OrderTimeline.jsx phải tồn tại');
    const content = fs.readFileSync(timelineFile, 'utf8');

    assert.ok(content.includes('STANDARD_STEPS'), 'Phải định nghĩa STANDARD_STEPS');
    assert.ok(content.includes('PENDING'), 'Phải có bước PENDING');
    assert.ok(content.includes('CONFIRMED'), 'Phải có bước CONFIRMED');
    assert.ok(content.includes('PROCESSING'), 'Phải có bước PROCESSING');
    assert.ok(content.includes('SHIPPING'), 'Phải có bước SHIPPING');
    assert.ok(content.includes('DELIVERED'), 'Phải có bước DELIVERED');
  });

  test('TC-311-02: Phân loại 4 nhóm trạng thái màu sắc và biểu tượng', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    // Nhóm 1: Completed (xanh lá)
    assert.ok(content.includes('#10b981') || content.includes('#059669'), 'Phải có màu xanh lá cho bước đã hoàn thành');
    // Nhóm 2: Active / Current (xanh dương highlight)
    assert.ok(content.includes('#2563eb') || content.includes('#1d4ed8'), 'Phải có màu xanh dương cho bước hiện tại');
    // Nhóm 3: Future (xám)
    assert.ok(content.includes('#cbd5e1') || content.includes('#e2e8f0'), 'Phải có màu xám cho bước chưa diễn ra');
    // Nhóm 4: Terminated / Error / Cancelled (đỏ / cảnh báo)
    assert.ok(content.includes('#ef4444') || content.includes('#dc2626'), 'Phải có màu đỏ cảnh báo cho bước hủy/thất bại');
  });

  test('TC-311-03: Định dạng ngày giờ chuẩn tiếng Việt (vi-VN)', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('toLocaleString(\'vi-VN\'') || content.includes('formatTimelineDate'), 'Phải có hàm format thời gian vi-VN');
    assert.ok(content.includes('vi-VN'), 'Phải sử dụng locale vi-VN');
  });

  test('TC-311-04: Hiển thị đầy đủ thông tin mô tả, người thực hiện, ghi chú', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('statusDescription'), 'Phải hiển thị statusDescription từ Backend ECOM-315');
    assert.ok(content.includes('actorRole'), 'Phải hiển thị actorRole (ROLE_ADMIN, ROLE_USER, SYSTEM)');
    assert.ok(content.includes('note'), 'Phải hiển thị ghi chú note nếu có');
  });

  test('TC-311-05: Xử lý đơn hàng bị HỦY (CANCELLED) cảnh báo màu đỏ và ngắt chuỗi bước tiếp theo', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('isCancelled'), 'Phải có biến nhận diện trạng thái CANCELLED');
    assert.ok(content.includes('Đơn hàng đã hủy') || content.includes('Đơn hàng đã được hủy'), 'Phải có thông báo trạng thái đơn hàng đã hủy');
    assert.ok(content.includes('isErrorStep'), 'Phải đánh dấu isErrorStep để đổi giao diện thành màu đỏ');
  });

  test('TC-311-06: Xử lý trạng thái FAILED và REFUNDED', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('FAILED'), 'Phải xử lý trạng thái FAILED');
    assert.ok(content.includes('REFUNDED'), 'Phải xử lý trạng thái REFUNDED');
  });

  test('TC-311-07: Xử lý Loading state dạng Skeleton / Spinner', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('order-timeline-loading'), 'Phải có khối hiển thị skeleton khi loading');
    assert.ok(content.includes('pulse'), 'Phải có hiệu ứng animation mượt mà khi loading');
  });

  test('TC-311-08: Xử lý Empty state khi không có dữ liệu lịch sử', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('Chưa có dữ liệu lịch sử trạng thái'), 'Phải có thông báo khi lịch sử rỗng');
  });

  test('TC-311-09: Xử lý Error state và nút Thử lại (Retry)', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('order-timeline-error'), 'Phải có khối hiển thị lỗi');
    assert.ok(content.includes('Thử lại'), 'Phải có nút Thử lại khi tải thất bại');
  });

  test('TC-311-10: Tích hợp API Backend ECOM-315 GET /api/v1/orders/{id}/history trong orderService', () => {
    const content = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(content.includes('getOrderStatusHistory'), 'Phải có hàm getOrderStatusHistory');
    assert.ok(content.includes('/orders/${id}/history') || content.includes('/orders/'), 'Phải gọi endpoint /orders/{id}/history');
    assert.ok(content.includes('getOrderHistory'), 'Phải có alias getOrderHistory');
  });

  test('TC-311-11: Chống IDOR và bảo vệ phân quyền (Xử lý HTTP 403 Forbidden)', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('403') || content.includes('isAccessDenied'), 'Phải bắt mã lỗi 403 Forbidden');
    assert.ok(content.includes('IDOR') || content.includes('quyền xem'), 'Phải có thông báo phân quyền bảo mật');
  });

  test('TC-311-12: Hỗ trợ Responsive đa thiết bị (375px, 768px, 1366px, 1920px)', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('@media (max-width: 640px)'), 'Phải có media query tối ưu cho màn hình mobile');
    assert.ok(content.includes('flex-direction: column'), 'Trên mobile chuyển stepper sang dạng dọc tiện lợi');
    assert.ok(content.includes('flexWrap: \'wrap\'') || content.includes('flex-wrap'), 'Phải hỗ trợ flex wrap chống tràn');
  });

  test('TC-311-13: Tích hợp OrderTimeline vào trang khách hàng OrderDetail.jsx', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('OrderTimeline'), 'OrderDetail.jsx phải import OrderTimeline');
    assert.ok(content.includes('<OrderTimeline'), 'OrderDetail.jsx phải render <OrderTimeline />');
    assert.ok(content.includes('orderId={order.id}'), 'Phải truyền orderId vào OrderTimeline');
  });

  test('TC-311-14: Tích hợp OrderTimeline vào modal quản trị Admin Orders.jsx', () => {
    const content = fs.readFileSync(adminOrdersFile, 'utf8');
    assert.ok(content.includes('OrderTimeline'), 'Admin Orders.jsx phải import OrderTimeline');
    assert.ok(content.includes('<OrderTimeline'), 'Admin Orders.jsx phải render <OrderTimeline />');
  });

  test('TC-311-15: Đồng bộ với Notification System chung, không dùng alert()/confirm()', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(!content.includes('alert('), 'Không được dùng alert() trong OrderTimeline');
    assert.ok(!content.includes('confirm('), 'Không được dùng confirm() trong OrderTimeline');
    assert.ok(!content.includes('prompt('), 'Không được dùng prompt() trong OrderTimeline');
  });

  test('TC-311-16: Sắp xếp các mốc lịch sử theo thứ tự thời gian tăng dần', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('sort(') || content.includes('createdAt'), 'Phải bảo đảm sắp xếp theo thời gian createdAt');
  });
});
