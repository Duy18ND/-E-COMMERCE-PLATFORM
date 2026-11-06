/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-173
 * [FE] Timeline theo dõi đơn hàng từ xác nhận đến đã giao
 * Dự án: ShopMart – E-commerce Platform
 * Sprint: Sprint 2 | Epic: CUSTOMER (Parent: ECOM-308)
 * Người phụ trách: Ngô Phương (DevOps & QA Lead hỗ trợ Frontend)
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

describe('ECOM-173: TIMELINE THEO DÕI ĐƠN HÀNG TỪ XÁC NHẬN ĐẾN ĐÃ GIAO', () => {

  const timelineFile = path.join(rootDir, 'src', 'components', 'order', 'OrderTimeline.jsx');
  const orderServiceFile = path.join(rootDir, 'src', 'services', 'orderService.js');
  const orderDetailFile = path.join(rootDir, 'src', 'pages', 'customer', 'OrderDetail.jsx');
  const adminOrdersFile = path.join(rootDir, 'src', 'pages', 'admin', 'Orders.jsx');

  test('TC-173-01: Tồn tại component OrderTimeline với Stepper 5 bước chuẩn từ xác nhận đến đã giao', () => {
    assert.ok(fs.existsSync(timelineFile), 'File OrderTimeline.jsx phải tồn tại');
    const content = fs.readFileSync(timelineFile, 'utf8');

    assert.ok(content.includes('STANDARD_STEPS'), 'Phải định nghĩa STANDARD_STEPS');
    assert.ok(content.includes('PENDING'), 'Phải có bước PENDING (Đặt hàng thành công)');
    assert.ok(content.includes('CONFIRMED'), 'Phải có bước CONFIRMED (Đã xác nhận)');
    assert.ok(content.includes('PROCESSING'), 'Phải có bước PROCESSING (Đang chuẩn bị hàng)');
    assert.ok(content.includes('SHIPPING'), 'Phải có bước SHIPPING (Đang vận chuyển)');
    assert.ok(content.includes('DELIVERED'), 'Phải có bước DELIVERED (Giao thành công)');
  });

  test('TC-173-02: Phân loại 4 nhóm trạng thái màu sắc và biểu tượng trực quan', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    // Nhóm 1: Completed (xanh lá #10b981 / #ecfdf5 / #059669)
    assert.ok(content.includes('#10b981') || content.includes('#059669'), 'Phải có màu xanh lá cho bước đã hoàn thành');
    // Nhóm 2: Active / Current (xanh dương highlight #2563eb / #eff6ff / #1d4ed8)
    assert.ok(content.includes('#2563eb') || content.includes('#1d4ed8'), 'Phải có màu xanh dương cho bước hiện tại');
    // Nhóm 3: Future / Pending (xám #cbd5e1 / #f1f5f9 / #64748b)
    assert.ok(content.includes('#cbd5e1') || content.includes('#e2e8f0'), 'Phải có màu xám cho bước chưa diễn ra');
    // Nhóm 4: Terminated / Error / Cancelled (đỏ / cảnh báo #ef4444 / #dc2626)
    assert.ok(content.includes('#ef4444') || content.includes('#dc2626'), 'Phải có màu đỏ cảnh báo cho bước hủy/thất bại');
  });

  test('TC-173-03: Định dạng ngày giờ chuẩn tiếng Việt (vi-VN) cho các mốc thời gian', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('vi-VN'), 'Phải sử dụng locale vi-VN để hiển thị ngày giờ');
    assert.ok(content.includes('formatTimelineDate'), 'Phải có hàm format thời gian chuẩn');
  });

  test('TC-173-04: Hiển thị đầy đủ thông tin mô tả, người thực hiện (actorRole), ghi chú (note)', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('statusDescription'), 'Phải hiển thị statusDescription từ Backend');
    assert.ok(content.includes('actorRole'), 'Phải hiển thị actorRole (ROLE_ADMIN, ROLE_USER, SYSTEM)');
    assert.ok(content.includes('note'), 'Phải hiển thị ghi chú note nếu có');
  });

  test('TC-173-05: Xử lý đơn hàng bị HỦY (CANCELLED) cảnh báo màu đỏ và ngắt chuỗi bước tiếp theo', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('isCancelled'), 'Phải có biến nhận diện trạng thái CANCELLED');
    assert.ok(content.includes('Đơn hàng đã hủy') || content.includes('Đơn hàng đã được hủy'), 'Phải có thông báo trạng thái đơn hàng đã hủy');
    assert.ok(content.includes('isErrorStep'), 'Phải đánh dấu isErrorStep để đổi giao diện thành màu đỏ');
  });

  test('TC-173-06: Xử lý trạng thái FAILED và REFUNDED trên Stepper', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('FAILED'), 'Phải xử lý trạng thái FAILED');
    assert.ok(content.includes('REFUNDED'), 'Phải xử lý trạng thái REFUNDED');
  });

  test('TC-173-07: Xử lý Loading state dạng Skeleton Animation', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('order-timeline-loading'), 'Phải có class order-timeline-loading');
    assert.ok(content.includes('pulse'), 'Phải có hiệu ứng pulse animation');
  });

  test('TC-173-08: Xử lý Empty state khi không có dữ liệu lịch sử trạng thái', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('Chưa có dữ liệu lịch sử trạng thái'), 'Phải có thông báo khi lịch sử rỗng');
  });

  test('TC-173-09: Xử lý Error state và nút Thử lại (Retry)', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('order-timeline-error'), 'Phải có khối hiển thị lỗi');
    assert.ok(content.includes('Thử lại'), 'Phải có nút Thử lại khi tải thất bại');
  });

  test('TC-173-10: Tích hợp API Backend ECOM-315 GET /api/v1/orders/{id}/history trong orderService', () => {
    const content = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(content.includes('getOrderStatusHistory'), 'Phải có hàm getOrderStatusHistory');
    assert.ok(content.includes('/orders/${id}/history') || content.includes('/orders/'), 'Phải gọi endpoint /orders/{id}/history');
    assert.ok(content.includes('getOrderHistory'), 'Phải có alias getOrderHistory');
  });

  test('TC-173-11: Chống IDOR và bảo vệ phân quyền (Xử lý HTTP 403 Forbidden)', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('403') || content.includes('isAccessDenied'), 'Phải bắt mã lỗi 403 Forbidden');
    assert.ok(content.includes('IDOR') || content.includes('quyền xem'), 'Phải có thông báo phân quyền bảo mật IDOR');
  });

  test('TC-173-12: Hỗ trợ Responsive đa thiết bị (mobile media query max-width: 640px)', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('@media (max-width: 640px)'), 'Phải có media query tối ưu cho màn hình mobile');
    assert.ok(content.includes('flex-direction: column'), 'Trên mobile chuyển stepper sang dạng dọc');
  });

  test('TC-173-13: Ánh xạ chính xác trạng thái alias PAID và COMPLETED vào stepper', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('STEP_ORDER_INDEX'), 'Phải có bảng ánh xạ cấp bậc STEP_ORDER_INDEX');
    assert.ok(content.includes('ORDER_STATUS.PAID'), 'Phải hỗ trợ ORDER_STATUS.PAID');
    assert.ok(content.includes('ORDER_STATUS.COMPLETED'), 'Phải hỗ trợ ORDER_STATUS.COMPLETED');
  });

  test('TC-173-14: Đồng bộ với Notification System chung, không dùng alert()/confirm()/prompt()', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(!content.includes('alert('), 'Không được dùng alert() trong OrderTimeline');
    assert.ok(!content.includes('confirm('), 'Không được dùng confirm() trong OrderTimeline');
    assert.ok(!content.includes('prompt('), 'Không được dùng prompt() trong OrderTimeline');
  });

  test('TC-173-15: Sắp xếp các mốc lịch sử theo thứ tự thời gian tăng dần (createdAt ASC)', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('sort(') || content.includes('createdAt'), 'Phải bảo đảm sắp xếp theo thời gian createdAt');
  });

  test('TC-173-16: Hỗ trợ thuộc tính compact cho modal quản trị Admin Orders.jsx', () => {
    const content = fs.readFileSync(timelineFile, 'utf8');
    assert.ok(content.includes('compact'), 'Phải nhận prop compact');
    const adminContent = fs.readFileSync(adminOrdersFile, 'utf8');
    assert.ok(adminContent.includes('compact={true}') || adminContent.includes('compact'), 'Admin Orders phải sử dụng prop compact');
  });
});
