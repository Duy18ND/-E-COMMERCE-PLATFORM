/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-188
 * [FE] Trang chi tiết đơn: ngày đặt, mã đơn, timeline và trạng thái hiện tại
 * Mô tả: Hiển thị các mốc có thời gian thực tế, không suy diễn trạng thái chưa cập nhật
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

describe('ECOM-188: TRANG CHI TIẾT ĐƠN HÀNG, NGÀY ĐẶT, MÃ ĐƠN, TIMELINE & TRẠNG THÁI HIỆN TẠI', () => {

  const orderDetailFile = path.join(rootDir, 'src', 'pages', 'customer', 'OrderDetail.jsx');
  const timelineFile = path.join(rootDir, 'src', 'components', 'order', 'OrderTimeline.jsx');
  const orderServiceFile = path.join(rootDir, 'src', 'services', 'orderService.js');

  test('TC-188-01: Tồn tại component OrderDetail.jsx với đầy đủ các khối chức năng chi tiết', () => {
    assert.ok(fs.existsSync(orderDetailFile), 'File OrderDetail.jsx phải tồn tại');
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('const OrderDetail = () =>'), 'Phải khai báo component OrderDetail');
    assert.ok(content.includes('useParams'), 'Phải sử dụng useParams để lấy id đơn hàng');
  });

  test('TC-188-02: Hiển thị mã đơn hàng (#order.id) trên tiêu đề trang', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('Đơn hàng #{order.id}') || content.includes('#{order.id}'), 'Phải hiển thị mã đơn hàng dạng Đơn hàng #{order.id}');
  });

  test('TC-188-03: Hiển thị ngày đặt hàng (order.createdAt) chuẩn định dạng tiếng Việt vi-VN', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('Đặt ngày:'), 'Phải có nhãn Đặt ngày:');
    assert.ok(content.includes('order.createdAt'), 'Phải đọc trường order.createdAt');
    assert.ok(content.includes('vi-VN'), 'Phải định dạng ngày giờ theo locale vi-VN');
  });

  test('TC-188-04: Hiển thị huy hiệu trạng thái hiện tại bằng component OrderStatus', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('import OrderStatus'), 'Phải import component OrderStatus');
    assert.ok(content.includes('<OrderStatus status={order.status} />') || content.includes('<OrderStatus'), 'Phải render component OrderStatus với order.status');
  });

  test('TC-188-05: Tích hợp Component OrderTimeline để hiển thị tiến trình đơn hàng', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('import OrderTimeline'), 'Phải import component OrderTimeline');
    assert.ok(content.includes('<OrderTimeline'), 'Phải render component OrderTimeline');
  });

  test('TC-188-06: Truyền đúng props orderId, currentStatus và historyData vào OrderTimeline', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('orderId={order.id}'), 'Phải truyền orderId={order.id}');
    assert.ok(content.includes('currentStatus={order.status}'), 'Phải truyền currentStatus={order.status}');
    assert.ok(content.includes('historyData={order.statusHistories}'), 'Phải truyền historyData={order.statusHistories}');
  });

  test('TC-188-07: [Nguyên tắc cốt lõi ECOM-188] Chỉ hiển thị các mốc có thời gian thực tế, không suy diễn mốc tương lai chưa cập nhật', () => {
    const timelineContent = fs.readFileSync(timelineFile, 'utf8');
    // Kiểm tra hàm getStepCompletedTime chỉ lấy thời gian từ history thực tế
    assert.ok(timelineContent.includes('getStepCompletedTime'), 'Phải có hàm getStepCompletedTime');
    assert.ok(timelineContent.includes('history.find'), 'Phải tìm mốc thực tế trong mảng history');
    assert.ok(timelineContent.includes('{stepTime &&'), 'Chỉ render thời gian khi stepTime có giá trị thực tế');
    // Không suy diễn mốc tương lai
    assert.ok(timelineContent.includes('stepTime = getStepCompletedTime'), 'Thời gian của từng bước phụ thuộc dữ liệu thực tế');
  });

  test('TC-188-08: Hiển thị đầy đủ khối Thông tin nhận hàng (Người nhận, Số điện thoại, Địa chỉ giao hàng, Ghi chú)', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('Thông tin nhận hàng'), 'Phải có tiêu đề Thông tin nhận hàng');
    assert.ok(content.includes('receiverName'), 'Phải hiển thị người nhận receiverName');
    assert.ok(content.includes('phone') || content.includes('receiverPhone'), 'Phải hiển thị số điện thoại nhận hàng');
    assert.ok(content.includes('fullAddress') || content.includes('shippingAddress'), 'Phải hiển thị địa chỉ giao hàng');
    assert.ok(content.includes('order.note'), 'Phải hỗ trợ hiển thị ghi chú nếu có');
  });

  test('TC-188-09: Hiển thị đầy đủ khối Thanh toán (Phương thức COD/Online, Trạng thái thanh toán)', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('Thanh toán'), 'Phải có khối Thanh toán');
    assert.ok(content.includes('paymentMethod'), 'Phải hiển thị paymentMethod');
    assert.ok(content.includes('Trạng thái thanh toán:'), 'Phải hiển thị trạng thái thanh toán');
    assert.ok(content.includes('Đã thanh toán'), 'Phải có nhãn Đã thanh toán khi hoàn tất');
    assert.ok(content.includes('Chưa thanh toán'), 'Phải có nhãn Chưa thanh toán khi còn chờ');
  });

  test('TC-188-10: Hiển thị danh sách sản phẩm (Ảnh/Placeholder, Tên, Số lượng, Đơn giá, Thành tiền)', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('Sản phẩm đã đặt'), 'Phải có tiêu đề Sản phẩm đã đặt');
    assert.ok(content.includes('items.map'), 'Phải duyệt danh sách items');
    assert.ok(content.includes('quantity'), 'Phải hiển thị số lượng');
    assert.ok(content.includes('formatCurrency'), 'Phải dùng formatCurrency để hiển thị tiền');
  });

  test('TC-188-11: Hiển thị Tổng tiền đơn hàng chuẩn định dạng tiền tệ VND qua formatCurrency', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('Tổng số tiền:') || content.includes('Tổng tiền:'), 'Phải có nhãn tổng số tiền');
    assert.ok(content.includes('formatCurrency(order.totalAmount'), 'Phải formatCurrency cho order.totalAmount');
  });

  test('TC-188-12: Khách hàng chỉ được phép hủy đơn hàng khi trạng thái là PENDING', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('ORDER_STATUS.PENDING'), 'Phải kiểm tra trạng thái PENDING');
    assert.ok(content.includes('isPending'), 'Phải có biến isPending để kiểm soát hiển thị nút hủy');
    assert.ok(content.includes('handleCancelOrder'), 'Phải có hàm xử lý handleCancelOrder');
  });

  test('TC-188-13: Quy trình hủy đơn sử dụng confirmDialog, tuyệt đối không dùng window.confirm() hoặc window.alert()', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('confirmDialog'), 'Phải sử dụng confirmDialog từ hook useNotification');
    assert.ok(!content.includes('window.confirm(') && !content.includes('confirm('), 'Không được dùng confirm() của trình duyệt');
    assert.ok(!content.includes('window.alert(') && !content.includes('alert('), 'Không được dùng alert() của trình duyệt');
  });

  test('TC-188-14: Gọi API orderService.cancelOrder(id) khi xác nhận hủy đơn, cập nhật state và thông báo Toast', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('orderService.cancelOrder'), 'Phải gọi orderService.cancelOrder(id)');
    assert.ok(content.includes('setOrder'), 'Phải cập nhật state setOrder sau khi hủy');
    assert.ok(content.includes('notify.success'), 'Phải hiển thị toast notify.success');
  });

  test('TC-188-15: Hỗ trợ thanh toán mô phỏng khi paymentMethod là MOCK_ONLINE và trạng thái PENDING', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('MOCK_ONLINE'), 'Phải kiểm tra phương thức MOCK_ONLINE');
    assert.ok(content.includes('handleMockPay'), 'Phải có hàm xử lý handleMockPay');
    assert.ok(content.includes('Thanh toán ngay'), 'Phải có nút Thanh toán ngay');
  });

  test('TC-188-16: Xử lý bảo mật IDOR (HTTP 403 Forbidden) hiển thị thông báo không có quyền xem đơn hàng', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('403'), 'Phải kiểm tra mã lỗi 403');
    assert.ok(content.includes('IDOR') || content.includes('quyền xem'), 'Phải thông báo lỗi phân quyền IDOR');
    const serviceContent = fs.readFileSync(orderServiceFile, 'utf8');
    assert.ok(serviceContent.includes('err.response?.status === 403'), 'orderService.getOrderById phải ném lại lỗi 403');
  });

  test('TC-188-17: Xử lý Loading state với component Loading và Error state với component ErrorMessage', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('<Loading'), 'Phải render component Loading khi đang tải');
    assert.ok(content.includes('<ErrorMessage'), 'Phải render component ErrorMessage khi có lỗi');
  });

  test('TC-188-18: Cung cấp liên kết quay lại danh sách đơn hàng (/orders)', () => {
    const content = fs.readFileSync(orderDetailFile, 'utf8');
    assert.ok(content.includes('to="/orders"'), 'Phải có liên kết điều hướng tới /orders');
    assert.ok(content.includes('Quay lại danh sách'), 'Phải có text quay lại danh sách đơn hàng');
  });
});
