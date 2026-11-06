/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-312
 * [FE] Trang chi tiết tracking và trạng thái không có quyền
 * Mô tả: Triển khai và kiểm tra trang chi tiết tracking và trạng thái không có quyền
 * Dự án: ShopMart – E-commerce Platform
 * Sprint: Sprint 2 | Epic: CUSTOMER (Parent: ECOM-308 Theo dõi đơn hàng chi tiết)
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

describe('ECOM-312: TRANG CHI TIẾT TRACKING VÀ TRẠNG THÁI KHÔNG CÓ QUYỀN (ACCESS DENIED / IDOR DEFENSE)', () => {

  const orderTrackingFile = path.join(rootDir, 'src', 'pages', 'customer', 'OrderTracking.jsx');
  const appRoutesFile = path.join(rootDir, 'src', 'routes', 'AppRoutes.jsx');
  const orderDetailFile = path.join(rootDir, 'src', 'pages', 'customer', 'OrderDetail.jsx');
  const orderItemFile = path.join(rootDir, 'src', 'components', 'order', 'OrderItem.jsx');
  const orderServiceFile = path.join(rootDir, 'src', 'services', 'orderService.js');

  test('TC-312-01: File OrderTracking.jsx tồn tại và xuất mặc định React Component', () => {
    assert.ok(fs.existsSync(orderTrackingFile), 'File OrderTracking.jsx phải tồn tại trong src/pages/customer/');
    const content = fs.readFileSync(orderTrackingFile, 'utf8');
    assert.ok(content.includes('const OrderTracking = () =>'), 'Phải khai báo component OrderTracking');
    assert.ok(content.includes('export default OrderTracking;'), 'Phải export default OrderTracking');
    assert.ok(content.includes('useParams'), 'Phải sử dụng useParams để lấy id đơn hàng');
  });

  test('TC-312-02: Định tuyến /orders/:id/tracking được đăng ký hợp lệ trong AppRoutes.jsx dưới ProtectedRoute', () => {
    assert.ok(fs.existsSync(appRoutesFile), 'File AppRoutes.jsx phải tồn tại');
    const content = fs.readFileSync(appRoutesFile, 'utf8');
    assert.ok(content.includes("import OrderTracking from '../pages/customer/OrderTracking'"), 'Phải import OrderTracking trong AppRoutes');
    assert.ok(content.includes('path="/orders/:id/tracking"'), 'Phải đăng ký đường dẫn /orders/:id/tracking');
    assert.ok(content.includes('element={<OrderTracking />}'), 'Phải render OrderTracking tại route /orders/:id/tracking');
  });

  test('TC-312-03: Header hiển thị thông tin tracking: mã vận đơn, mã đơn hàng #id, đơn vị vận chuyển và OrderStatus', () => {
    const content = fs.readFileSync(orderTrackingFile, 'utf8');
    assert.ok(content.includes('trackingNumber') || content.includes('Theo dõi kiện hàng'), 'Phải có thông tin mã vận đơn');
    assert.ok(content.includes('carrierName') || content.includes('Đơn vị vận chuyển'), 'Phải có tên đơn vị vận chuyển');
    assert.ok(content.includes('#{order.id}') || content.includes('#{id}'), 'Phải hiển thị mã đơn hàng dạng #{order.id}');
    assert.ok(content.includes('<OrderStatus status={order.status} />'), 'Phải render component OrderStatus');
  });

  test('TC-312-04: Tích hợp Component OrderTimeline với props orderId, currentStatus và historyData', () => {
    const content = fs.readFileSync(orderTrackingFile, 'utf8');
    assert.ok(content.includes("import OrderTimeline from '../../components/order/OrderTimeline'"), 'Phải import OrderTimeline');
    assert.ok(content.includes('<OrderTimeline'), 'Phải render component OrderTimeline');
    assert.ok(content.includes('orderId={order.id}'), 'Phải truyền orderId={order.id}');
    assert.ok(content.includes('currentStatus={order.status}'), 'Phải truyền currentStatus={order.status}');
    assert.ok(content.includes('historyData={order.statusHistories}'), 'Phải truyền historyData={order.statusHistories}');
  });

  test('TC-312-05: [BẢO MẬT IDOR] Xử lý trạng thái 403 Forbidden và hiển thị giao diện Không có quyền truy cập', () => {
    const content = fs.readFileSync(orderTrackingFile, 'utf8');
    assert.ok(content.includes('403'), 'Phải kiểm tra HTTP status 403');
    assert.ok(content.includes('isAccessDenied'), 'Phải có state quản lý isAccessDenied');
    assert.ok(content.includes('Quyền truy cập bị từ chối') || content.includes('Không có quyền'), 'Phải có tiêu đề thông báo từ chối truy cập');
    assert.ok(content.includes('IDOR') || content.includes('chủ sở hữu'), 'Phải giải thích nguyên nhân bảo mật chống IDOR');
    assert.ok(content.includes('🛡️') || content.includes('🔒'), 'Phải có biểu tượng khiên bảo vệ hoặc ổ khóa');
  });

  test('TC-312-06: Điều hướng an toàn từ trạng thái 403 về danh sách đơn hàng (/orders) và trang chủ (/)', () => {
    const content = fs.readFileSync(orderTrackingFile, 'utf8');
    assert.ok(content.includes('to="/orders"'), 'Phải có nút điều hướng về /orders');
    assert.ok(content.includes('to="/"'), 'Phải có nút điều hướng về trang chủ /');
  });

  test('TC-312-07: Hiển thị thông tin người nhận, số điện thoại và địa chỉ giao hàng đầy đủ', () => {
    const content = fs.readFileSync(orderTrackingFile, 'utf8');
    assert.ok(content.includes('Thông tin nhận hàng'), 'Phải có khối Thông tin nhận hàng');
    assert.ok(content.includes('receiverName'), 'Phải hiển thị tên người nhận');
    assert.ok(content.includes('phone') || content.includes('receiverPhone'), 'Phải hiển thị số điện thoại');
    assert.ok(content.includes('fullAddress') || content.includes('shippingAddress'), 'Phải hiển thị địa chỉ nhận hàng');
  });

  test('TC-312-08: Hiển thị tóm tắt kiện hàng: danh sách sản phẩm, số lượng, giá và tổng tiền', () => {
    const content = fs.readFileSync(orderTrackingFile, 'utf8');
    assert.ok(content.includes('Kiện hàng') || content.includes('sản phẩm'), 'Phải có phần tóm tắt kiện hàng');
    assert.ok(content.includes('formatCurrency'), 'Phải sử dụng hàm formatCurrency để hiển thị tiền');
    assert.ok(content.includes('totalAmount') || content.includes('totalPrice'), 'Phải hiển thị tổng tiền đơn hàng');
  });

  test('TC-312-09: Xử lý Loading state và Error / 404 state với nút Thử lại', () => {
    const content = fs.readFileSync(orderTrackingFile, 'utf8');
    assert.ok(content.includes('<Loading'), 'Phải có component Loading khi đang tải dữ liệu');
    assert.ok(content.includes('<ErrorMessage') || content.includes('error'), 'Phải xử lý lỗi khi không tải được dữ liệu');
    assert.ok(content.includes('fetchTrackingData'), 'Phải có hàm lấy lại dữ liệu khi nhấn Thử lại');
  });

  test('TC-312-10: Tích hợp nút Theo dõi kiện hàng từ OrderDetail.jsx dẫn tới /orders/:id/tracking', () => {
    const detailContent = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(detailContent.includes('/orders/${order.id}/tracking'), 'OrderDetail phải có link dẫn tới /orders/${order.id}/tracking');
    assert.ok(detailContent.includes('Theo dõi kiện hàng'), 'Phải có nút Theo dõi kiện hàng');
  });

  test('TC-312-11: Tích hợp nút Theo dõi từ OrderItem.jsx dẫn tới /orders/:id/tracking', () => {
    const itemContent = fs.readFileSync(orderItemFile, 'utf8');
    assert.ok(itemContent.includes('/tracking'), 'OrderItem phải có link dẫn tới /tracking');
    assert.ok(itemContent.includes('Theo dõi'), 'Phải có nút Theo dõi');
  });

  test('TC-312-12: Kiểm tra an toàn biến, không khai báo trùng lặp biến/hook (chống lỗi notify)', () => {
    const trackingContent = fs.readFileSync(orderTrackingFile, 'utf8');
    // Kiểm tra không khai báo trùng biến nào
    const notifyMatches = trackingContent.match(/const\s+.*notify.*/g) || [];
    assert.ok(notifyMatches.length <= 1, 'Không được khai báo trùng lặp hook notification');
    // Kiểm tra không có marker xung đột git
    assert.ok(!/^(<<<<<<<|=======|>>>>>>>)/m.test(trackingContent), 'Không được có dấu vết merge conflict');
  });

  test('TC-312-13: Service orderService.getOrderById và getOrderStatusHistory xử lý ném lỗi 403 phục vụ bắt lỗi IDOR', () => {
    const serviceContent = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(serviceContent.includes('err.response?.status === 403'), 'orderService phải kiểm tra lỗi 403');
    assert.ok(serviceContent.includes('throw err'), 'orderService phải ném lại lỗi 403 để component xử lý');
  });
});
