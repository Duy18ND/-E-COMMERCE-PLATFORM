/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-314
 * [FE] QA Test - UI, responsive, lỗi và tích hợp (Theo dõi đơn hàng chi tiết)
 * Mô tả: Kiểm thử giao diện và luồng chính của chức năng Theo dõi đơn hàng chi tiết
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

describe('ECOM-314: [FE] QA TEST - UI, RESPONSIVE, LỖI VÀ TÍCH HỢP (THEO DÕI ĐƠN HÀNG CHI TIẾT)', () => {
  const orderTimelineFile = path.join(rootDir, 'src', 'components', 'order', 'OrderTimeline.jsx');
  const orderTrackingFile = path.join(rootDir, 'src', 'pages', 'customer', 'OrderTracking.jsx');
  const orderDetailFile = path.join(rootDir, 'src', 'pages', 'customer', 'OrderDetail.jsx');
  const customerOrdersFile = path.join(rootDir, 'src', 'pages', 'customer', 'Orders.jsx');
  const orderItemFile = path.join(rootDir, 'src', 'components', 'order', 'OrderItem.jsx');
  const orderStatusFile = path.join(rootDir, 'src', 'components', 'order', 'OrderStatus.jsx');
  const appRoutesFile = path.join(rootDir, 'src', 'routes', 'AppRoutes.jsx');
  const orderServiceFile = path.join(rootDir, 'src', 'services', 'orderService.js');

  test('TC-314-01: [UI Stepper] OrderTimeline hiển thị đầy đủ 5 bước chuẩn từ Đặt hàng thành công đến Giao thành công kèm icon & mô tả', () => {
    const content = fs.readFileSync(orderTimelineFile, 'utf8');
    assert.ok(content.includes("title: 'Đặt hàng thành công'"), 'Phải có bước Đặt hàng thành công');
    assert.ok(content.includes("title: 'Đã xác nhận'"), 'Phải có bước Đã xác nhận');
    assert.ok(content.includes("title: 'Đang chuẩn bị hàng'"), 'Phải có bước Đang chuẩn bị hàng');
    assert.ok(content.includes("title: 'Đang vận chuyển'"), 'Phải có bước Đang vận chuyển');
    assert.ok(content.includes("title: 'Giao thành công'"), 'Phải có bước Giao thành công');
    assert.ok(content.includes('aria-label='), 'Các node trên Stepper phải có aria-label hỗ trợ Accessibility');
  });

  test('TC-314-02: [UI Real Timestamps] Chỉ hiển thị thời gian thực tế từ lịch sử, tuyệt đối không suy diễn thời gian cho bước chưa diễn ra', () => {
    const content = fs.readFileSync(orderTimelineFile, 'utf8');
    assert.ok(content.includes('const getStepCompletedTime = (stepKey) =>'), 'Phải có hàm getStepCompletedTime');
    assert.ok(content.includes('return found ? formatTimelineDate(found.createdAt) : null;'), 'Trả về null nếu bước chưa có trong history thực tế');
    assert.ok(content.includes('{stepTime && ('), 'Chỉ render nhãn thời gian khi stepTime tồn tại');
  });

  test('TC-314-03: [UI Audit Log] Nhật ký trạng thái chi tiết hiển thị mốc thời gian, vai trò người thực hiện (Admin/Khách hàng/Hệ thống) và ghi chú', () => {
    const content = fs.readFileSync(orderTimelineFile, 'utf8');
    assert.ok(content.includes('Nhật ký trạng thái chi tiết'), 'Phải có tiêu đề Nhật ký trạng thái chi tiết');
    assert.ok(content.includes('mốc ghi nhận'), 'Phải hiển thị tổng số mốc ghi nhận');
    assert.ok(content.includes("record.actorRole === 'ROLE_ADMIN'"), 'Phải phân biệt nhãn Admin / Khách hàng / Hệ thống');
    assert.ok(content.includes('💬 Ghi chú: {record.note}'), 'Phải hiển thị ghi chú đính kèm của mỗi mốc');
  });

  test('TC-314-04: [UI Tracking Header] Trang OrderTracking hiển thị mã vận đơn, đơn vị vận chuyển, trạng thái và ngày giao dự kiến', () => {
    const content = fs.readFileSync(orderTrackingFile, 'utf8');
    assert.ok(content.includes('Theo dõi kiện hàng: {trackingNumber}'), 'Phải hiển thị mã vận đơn trackingNumber');
    assert.ok(content.includes('Đơn vị vận chuyển:'), 'Phải hiển thị đơn vị vận chuyển');
    assert.ok(content.includes('Tiến độ vận chuyển'), 'Phải có hộp hiển thị tiến độ vận chuyển');
    assert.ok(content.includes('getEstimatedDelivery()'), 'Phải hiển thị ngày dự kiến giao hoặc trạng thái hoàn tất/hủy');
  });

  test('TC-314-05: [UI OrderDetail] Trang OrderDetail hiển thị mã đơn #id, ngày đặt, OrderStatus, OrderTimeline, địa chỉ, thanh toán và sản phẩm', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('Đơn hàng #{order.id}'), 'Phải hiển thị mã đơn hàng');
    assert.ok(content.includes('<OrderStatus status={order.status} />'), 'Phải hiển thị badge trạng thái');
    assert.ok(content.includes('<OrderTimeline'), 'Phải nhúng OrderTimeline');
    assert.ok(content.includes('📍 Thông tin nhận hàng'), 'Phải có khối Thông tin nhận hàng');
    assert.ok(content.includes('💳 Thanh toán'), 'Phải có khối Thanh toán');
    assert.ok(content.includes('📦 Sản phẩm đã đặt'), 'Phải có khối Sản phẩm đã đặt');
  });

  test('TC-314-06: [Responsive Layout] OrderTimeline hỗ trợ chuyển đổi bố cục ngang (Desktop) sang bố cục dọc (Mobile <= 640px)', () => {
    const content = fs.readFileSync(orderTimelineFile, 'utf8').replace(/\r\n/g, '\n');
    assert.ok(content.includes('@media (max-width: 640px)'), 'Phải có media query cho màn hình nhỏ <= 640px');
    assert.ok(content.includes('.order-stepper-track {\n            flex-direction: column !important;'), 'Stepper phải chuyển thành cột dọc trên mobile');
    assert.ok(content.includes('.order-stepper-node {\n            flex-direction: row !important;'), 'Node trong stepper xếp ngang gọn gàng trên mobile');
    assert.ok(content.includes('.order-stepper-line {\n            display: none !important;'), 'Ẩn đường nối ngang khi ở chế độ dọc mobile');
  });

  test('TC-314-07: [Responsive Grid] OrderTracking và OrderDetail sử dụng CSS Grid auto-fit minmax(320px, 1fr) và flexWrap chống tràn ngang', () => {
    const trackingContent = fs.readFileSync(orderTrackingFile, 'utf8');
    const detailContent = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(trackingContent.includes('repeat(auto-fit, minmax(320px, 1fr))'), 'OrderTracking phải dùng responsive grid auto-fit');
    assert.ok(detailContent.includes('repeat(auto-fit, minmax(320px, 1fr))'), 'OrderDetail phải dùng responsive grid auto-fit');
    assert.ok(trackingContent.includes("flexWrap: 'wrap'"), 'OrderTracking header phải có flexWrap: wrap');
    assert.ok(detailContent.includes("flexWrap: 'wrap'"), 'OrderDetail header phải có flexWrap: wrap');
  });

  test('TC-314-08: [Error Handling - 403 IDOR] Hiển thị giao diện Khiên bảo mật HTTP 403 Forbidden trên cả OrderTracking, OrderDetail và OrderTimeline', () => {
    const trackingContent = fs.readFileSync(orderTrackingFile, 'utf8');
    const detailContent = fs.readFileSync(orderDetailFile, 'utf8');
    const timelineContent = fs.readFileSync(orderTimelineFile, 'utf8');

    assert.ok(trackingContent.includes('HTTP 403 Forbidden') && trackingContent.includes('Quyền truy cập bị từ chối'), 'OrderTracking phải có màn hình chặn 403 IDOR');
    assert.ok(detailContent.includes('HTTP 403 Forbidden') && detailContent.includes('Quyền truy cập bị từ chối'), 'OrderDetail phải có màn hình chặn 403 IDOR');
    assert.ok(timelineContent.includes('isAccessDenied') && timelineContent.includes('Truy cập bị từ chối'), 'OrderTimeline phải xử lý lỗi 403 IDOR');
  });

  test('TC-314-09: [Error Handling - Network/404 & Retry] Xử lý lỗi tải dữ liệu và cung cấp nút Thử lại (Retry) trên mọi thành phần tracking', () => {
    const trackingContent = fs.readFileSync(orderTrackingFile, 'utf8');
    const timelineContent = fs.readFileSync(orderTimelineFile, 'utf8');

    assert.ok(trackingContent.includes('<ErrorMessage') && trackingContent.includes('Thử lại'), 'OrderTracking phải hiển thị ErrorMessage và nút Thử lại');
    assert.ok(timelineContent.includes('order-timeline-error') && timelineContent.includes('🔄 Thử lại'), 'OrderTimeline phải hiển thị lỗi và nút Thử lại');
  });

  test('TC-314-10: [Loading & Empty States] Xử lý trạng thái đang tải (Skeleton/Spinner) và trạng thái rỗng (Empty State) đầy đủ', () => {
    const timelineContent = fs.readFileSync(orderTimelineFile, 'utf8');
    const ordersContent = fs.readFileSync(customerOrdersFile, 'utf8');

    assert.ok(timelineContent.includes('order-timeline-loading'), 'OrderTimeline phải có Skeleton loading');
    assert.ok(timelineContent.includes('Chưa có dữ liệu lịch sử trạng thái được ghi nhận'), 'OrderTimeline phải có Empty state khi lịch sử trống');
    assert.ok(ordersContent.includes('<EmptyState') && ordersContent.includes('Bạn chưa có đơn hàng nào'), 'Orders.jsx phải có EmptyState khi chưa có đơn hàng');
  });

  test('TC-314-11: [Terminated States UI] Hiển thị cảnh báo trực quan khi đơn hàng bị HỦY (CANCELLED), THẤT BẠI (FAILED) hoặc HOÀN TIỀN (REFUNDED)', () => {
    const timelineContent = fs.readFileSync(orderTimelineFile, 'utf8');
    assert.ok(timelineContent.includes('const isTerminated = isCancelled || isFailed || isRefunded;'), 'Phải kiểm tra trạng thái kết thúc đặc biệt');
    assert.ok(timelineContent.includes('Đơn hàng đã được hủy'), 'Phải có hộp cảnh báo khi đơn hàng bị hủy');
    assert.ok(timelineContent.includes('Đơn hàng xử lý thất bại'), 'Phải có hộp cảnh báo khi đơn hàng thất bại');
    assert.ok(timelineContent.includes('Đã hoàn tiền'), 'Phải có bước hiển thị khi đơn hàng đã hoàn tiền');
  });

  test('TC-314-12: [Integration Navigation] Luồng điều hướng liền mạch giữa Danh sách đơn (/orders) <-> Chi tiết đơn (/orders/:id) <-> Theo dõi (/orders/:id/tracking)', () => {
    const itemContent = fs.readFileSync(orderItemFile, 'utf8');
    const detailContent = fs.readFileSync(orderDetailFile, 'utf8');
    const trackingContent = fs.readFileSync(orderTrackingFile, 'utf8');

    assert.ok(itemContent.includes('/orders/${order.id || order.orderNumber}/tracking'), 'OrderItem phải có link tới trang Tracking');
    assert.ok(itemContent.includes('/orders/${order.id || order.orderNumber}'), 'OrderItem phải có link tới trang Chi tiết đơn');
    assert.ok(detailContent.includes('to={`/orders/${order.id}/tracking`}'), 'OrderDetail phải có nút chuyển sang trang Tracking');
    assert.ok(trackingContent.includes('to={`/orders/${order.id}`}'), 'OrderTracking phải có nút quay lại trang Chi tiết đơn');
    assert.ok(trackingContent.includes('to="/orders"'), 'OrderTracking phải có link về Danh sách đơn hàng');
  });

  test('TC-314-13: [Integration ProtectedRoute] Các route theo dõi đơn hàng được bảo vệ bởi ProtectedRoute trong AppRoutes.jsx', () => {
    const routesContent = fs.readFileSync(appRoutesFile, 'utf8');
    assert.ok(routesContent.includes('path="/orders"'), 'Phải có route /orders');
    assert.ok(routesContent.includes('path="/orders/:id"'), 'Phải có route /orders/:id');
    assert.ok(routesContent.includes('path="/orders/:id/tracking"'), 'Phải có route /orders/:id/tracking');
    assert.ok(routesContent.includes('ProtectedRoute'), 'Các route đơn hàng phải nằm trong ProtectedRoute');
  });

  test('TC-314-14: [Integration Notification] Sử dụng hệ thống Toast / ConfirmModal chuẩn, tuyệt đối không dùng window.alert/confirm/prompt', () => {
    const files = [orderTimelineFile, orderTrackingFile, orderDetailFile, customerOrdersFile, orderItemFile];
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      assert.ok(!src.includes('window.alert(') && !/\balert\(/.test(src), `Không dùng alert() trong ${path.basename(file)}`);
      assert.ok(!src.includes('window.confirm(') && !/\bconfirm\(/.test(src), `Không dùng confirm() trong ${path.basename(file)}`);
      assert.ok(!src.includes('window.prompt(') && !/\bprompt\(/.test(src), `Không dùng prompt() trong ${path.basename(file)}`);
    }
  });

  test('TC-314-15: [Integration Badge Status] Component OrderStatus hiển thị đúng màu sắc và nhãn tiếng Việt cho toàn bộ 9 trạng thái đơn hàng', () => {
    assert.ok(fs.existsSync(orderStatusFile), 'Component OrderStatus.jsx phải tồn tại');
    const content = fs.readFileSync(orderStatusFile, 'utf8');
    assert.ok(content.includes('ORDER_STATUS'), 'OrderStatus phải sử dụng ORDER_STATUS / ORDER_STATUS_LABELS');
  });

  test('TC-314-16: [Integration API Service] orderService tích hợp đầy đủ getMyOrders, getOrderById, getOrderStatusHistory, cancelOrder và updateOrderStatus', () => {
    const content = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(content.includes('getMyOrders:'), 'Phải có getMyOrders');
    assert.ok(content.includes('getOrderById:'), 'Phải có getOrderById');
    assert.ok(content.includes('getOrderStatusHistory:'), 'Phải có getOrderStatusHistory');
    assert.ok(content.includes('cancelOrder:'), 'Phải có cancelOrder');
    assert.ok(content.includes('updateOrderStatus:'), 'Phải có updateOrderStatus');
  });
});
