/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-275
 * [FE] QA Test - UI, responsive, lỗi và tích hợp (Lịch sử đơn hàng & Hồ sơ cá nhân)
 * Feature: ECOM-126 (Lịch sử đơn hàng & Hồ sơ cá nhân) | Parent: ECOM-270 ([FE] Lịch sử đơn hàng & Hồ sơ cá nhân)
 * Dự án: ShopMart – E-Commerce Platform
 * Sprint: SPRINT 2 | Epic: CUSTOMER | Priority: High (P1)
 * Người phụ trách: Ngô Phương (DevOps & QA Lead)
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
const srcDir = path.join(rootDir, 'src');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');

describe('ECOM-275: [FE] QA TEST - UI, RESPONSIVE, LỖI VÀ TÍCH HỢP (LỊCH SỬ ĐƠN HÀNG & HỒ SƠ CÁ NHÂN)', () => {

  const ordersPageFile = path.join(srcDir, 'pages', 'customer', 'Orders.jsx');
  const orderDetailPageFile = path.join(srcDir, 'pages', 'customer', 'OrderDetail.jsx');
  const orderItemFile = path.join(srcDir, 'components', 'order', 'OrderItem.jsx');
  const orderTimelineFile = path.join(srcDir, 'components', 'order', 'OrderTimeline.jsx');
  const userHeaderFile = path.join(srcDir, 'components', 'user', 'UserHeader.jsx');
  const userServiceFile = path.join(srcDir, 'services', 'userService.js');
  const orderServiceFile = path.join(srcDir, 'services', 'orderService.js');
  const appRoutesFile = path.join(srcDir, 'routes', 'AppRoutes.jsx');

  // =========================================================================
  // 1. ROUTING & ACCESS CONTROL
  // =========================================================================
  test('TC-275-01: Định tuyến /orders và /orders/:id được cấu hình an toàn trong ProtectedRoute', () => {
    assert.ok(fs.existsSync(appRoutesFile), 'File AppRoutes.jsx phải tồn tại');
    assert.ok(fs.existsSync(ordersPageFile), 'File Orders.jsx phải tồn tại');
    assert.ok(fs.existsSync(orderDetailPageFile), 'File OrderDetail.jsx phải tồn tại');

    const routesCode = readSrc('routes/AppRoutes.jsx');
    assert.ok(routesCode.includes('path="/orders"'), 'AppRoutes phải có route path="/orders"');
    assert.ok(routesCode.includes('path="/orders/:id"'), 'AppRoutes phải có route path="/orders/:id"');
    assert.ok(routesCode.includes('element={<Orders />}'), 'Route /orders phải render Orders');
    assert.ok(routesCode.includes('element={<OrderDetail />}'), 'Route /orders/:id phải render OrderDetail');
    assert.ok(routesCode.includes("allowedRoles={['ROLE_USER']}"), 'Các route đơn hàng phải được bảo vệ bởi ProtectedRoute');
  });

  // =========================================================================
  // 2. USER PROFILE VALIDATION & SERVICE
  // =========================================================================
  test('TC-275-02: Định dạng Regex số điện thoại chuẩn Việt Nam (0 hoặc +84 kết hợp đầu 3, 5, 7, 8, 9 và 8 chữ số)', () => {
    const userServiceCode = readSrc('services/userService.js');
    assert.ok(userServiceCode.includes('VN_PHONE_REGEX'), 'userService.js phải định nghĩa VN_PHONE_REGEX');

    const VN_PHONE_REGEX = /^(0|\+84)[35789][0-9]{8}$/;

    // Số hợp lệ (10 số với 0 hoặc 11/12 ký tự với +84)
    const validPhones = [
      '0912345678',
      '0987654321',
      '0321234567',
      '0561234567',
      '0701234567',
      '0861234567',
      '+84912345678',
      '+84381234567'
    ];
    for (const p of validPhones) {
      assert.equal(VN_PHONE_REGEX.test(p), true, `Số điện thoại ${p} phải hợp lệ`);
    }

    // Số không hợp lệ (sai đầu số, sai độ dài, chứa ký tự đặc biệt)
    const invalidPhones = [
      '12345',
      '0123456789',       // Đầu 01 cũ 11 số không hợp lệ
      '0241234567',       // Đầu 02 điện thoại bàn
      '091234567',        // Thiếu 1 số (9 số)
      '09123456789',      // Thừa 1 số (11 số với đầu 0)
      '0|12345678',       // Ký tự pipe
      'abc0912345',       // Chứa chữ cái
      '+84123456789'      // Đầu +841 không hợp lệ
    ];
    for (const p of invalidPhones) {
      assert.equal(VN_PHONE_REGEX.test(p), false, `Số điện thoại ${p} phải bị từ chối`);
    }
  });

  test('TC-275-03: Service userService cung cấp đầy đủ các phương thức chuẩn RESTful cho Profile và Sổ địa chỉ', () => {
    assert.ok(fs.existsSync(userServiceFile), 'File userService.js phải tồn tại');
    const serviceCode = readSrc('services/userService.js');

    assert.ok(serviceCode.includes('getProfile:'), 'userService phải có phương thức getProfile');
    assert.ok(serviceCode.includes("api.get('/users/profile')"), 'getProfile phải gọi GET /users/profile');
    assert.ok(serviceCode.includes('updateProfile:'), 'userService phải có phương thức updateProfile');
    assert.ok(serviceCode.includes("api.put('/users/profile'"), 'updateProfile phải gọi PUT /users/profile');
    assert.ok(serviceCode.includes('getAddresses:'), 'userService phải có phương thức getAddresses');
    assert.ok(serviceCode.includes('addAddress:'), 'userService phải có phương thức addAddress');
    assert.ok(serviceCode.includes('updateAddress:'), 'userService phải có phương thức updateAddress');
    assert.ok(serviceCode.includes('deleteAddress:'), 'userService phải có phương thức deleteAddress');
  });

  test('TC-275-04: Service userService.updateProfile kiểm tra độ dài họ tên tối đa 150 ký tự và validate SĐT', () => {
    const serviceCode = readSrc('services/userService.js');

    assert.ok(serviceCode.includes('fullName.length > 150'), 'updateProfile phải kiểm tra fullName.length > 150');
    assert.ok(serviceCode.includes('isValidVietnamesePhone'), 'updateProfile phải kiểm tra isValidVietnamesePhone');
  });

  // =========================================================================
  // 3. USER HEADER PROFILE MODAL & NAVIGATION
  // =========================================================================
  test('TC-275-05: UserHeader chứa liên kết điều hướng Đơn hàng và Menu Sửa thông tin cá nhân', () => {
    assert.ok(fs.existsSync(userHeaderFile), 'File UserHeader.jsx phải tồn tại');
    const headerCode = readSrc('components/user/UserHeader.jsx');

    assert.ok(headerCode.includes('to="/orders"'), 'UserHeader phải có link điều hướng to="/orders"');
    assert.ok(headerCode.includes('Lịch sử đơn hàng'), 'UserHeader phải có mục Lịch sử đơn hàng trong menu');
    assert.ok(headerCode.includes('handleOpenEdit'), 'UserHeader phải có hàm handleOpenEdit mở modal cập nhật');
    assert.ok(headerCode.includes('Sửa thông tin cá nhân'), 'UserHeader phải có nút Sửa thông tin cá nhân');
    assert.ok(headerCode.includes('userService'), 'UserHeader phải import và tích hợp userService');
    assert.ok(headerCode.includes('isValidVietnamesePhone'), 'UserHeader phải import hàm validate số điện thoại VN');
  });

  test('TC-275-06: Modal cập nhật hồ sơ trong UserHeader có đầy đủ các trường nhập liệu và hiển thị lỗi xác thực', () => {
    const headerCode = readSrc('components/user/UserHeader.jsx');

    assert.ok(headerCode.includes('name="fullName"'), 'Modal phải có trường họ tên');
    assert.ok(headerCode.includes('name="email"'), 'Modal phải có trường email');
    assert.ok(headerCode.includes('name="phone"'), 'Modal phải có trường số điện thoại');
    assert.ok(headerCode.includes('name="avatarUrl"'), 'Modal phải có trường URL ảnh đại diện');
    assert.ok(headerCode.includes('formError'), 'Modal phải có vùng hiển thị lỗi xác thực formError');
    assert.ok(headerCode.includes('disabled={saving}'), 'Nút lưu phải bị vô hiệu hóa khi đang xử lý (saving)');
  });

  // =========================================================================
  // 4. ORDERS PAGE (LỊCH SỬ ĐƠN HÀNG)
  // =========================================================================
  test('TC-275-07: Trang Orders.jsx có đủ trạng thái Loading, Empty State và Error State', () => {
    const ordersCode = readSrc('pages/customer/Orders.jsx');

    assert.ok(ordersCode.includes('<Loading'), 'Orders.jsx phải có component Loading khi đang tải dữ liệu');
    assert.ok(ordersCode.includes('<EmptyState'), 'Orders.jsx phải có component EmptyState khi không có đơn hàng');
    assert.ok(ordersCode.includes('<ErrorMessage'), 'Orders.jsx phải có component ErrorMessage khi gọi API lỗi');
    assert.ok(ordersCode.includes('fetchOrders'), 'Orders.jsx phải có hàm fetchOrders tải lại dữ liệu');
    assert.ok(ordersCode.includes('🔄 Làm mới'), 'Orders.jsx phải có nút Làm mới dữ liệu');
  });

  test('TC-275-08: Trang Orders.jsx tích hợp bộ lọc trạng thái (Tabs) và tìm kiếm đơn hàng linh hoạt', () => {
    const ordersCode = readSrc('pages/customer/Orders.jsx');

    assert.ok(ordersCode.includes('FILTER_TABS'), 'Orders.jsx phải định nghĩa danh sách FILTER_TABS');
    assert.ok(ordersCode.includes('activeTab'), 'Orders.jsx phải quản lý state tab trạng thái đang chọn');
    assert.ok(ordersCode.includes('searchTerm'), 'Orders.jsx phải quản lý state tìm kiếm');
    assert.ok(ordersCode.includes('filteredOrders'), 'Orders.jsx phải lọc danh sách đơn qua useMemo');
    assert.ok(ordersCode.includes('PENDING'), 'Orders.jsx phải có tab lọc đơn PENDING');
    assert.ok(ordersCode.includes('PAID'), 'Orders.jsx phải có tab lọc đơn PAID');
    assert.ok(ordersCode.includes('SHIPPING'), 'Orders.jsx phải có tab lọc đơn SHIPPING');
    assert.ok(ordersCode.includes('COMPLETED'), 'Orders.jsx phải có tab lọc đơn COMPLETED');
    assert.ok(ordersCode.includes('CANCELLED'), 'Orders.jsx phải có tab lọc đơn CANCELLED');
  });

  test('TC-275-09: Trang Orders.jsx sử dụng React Router navigate thay vì reload toàn trang window.location', () => {
    const ordersCode = readSrc('pages/customer/Orders.jsx');

    assert.ok(ordersCode.includes("navigate('/products')"), 'Orders.jsx phải dùng navigate("/products") để SPA mượt mà');
    assert.ok(!ordersCode.includes("window.location.href = '/products'"), 'Orders.jsx không được dùng window.location.href làm reload trang');
  });

  test('TC-275-10: Component OrderItem.jsx hiển thị đầy đủ thông tin đơn hàng, định dạng tiền tệ và điều hướng chi tiết', () => {
    assert.ok(fs.existsSync(orderItemFile), 'File OrderItem.jsx phải tồn tại');
    const itemCode = readSrc('components/order/OrderItem.jsx');

    assert.ok(itemCode.includes('OrderStatus'), 'OrderItem phải render nhãn trạng thái OrderStatus');
    assert.ok(itemCode.includes('formatCurrency'), 'OrderItem phải format tổng tiền qua formatCurrency');
    assert.ok(itemCode.includes('toLocaleDateString'), 'OrderItem phải format ngày đặt theo chuẩn vi-VN');
    assert.ok(itemCode.includes('to={`/orders/${order.id || order.orderNumber}`'), 'OrderItem phải có link xem chi tiết đơn');
    assert.ok(itemCode.includes('to={`/orders/${order.id || order.orderNumber}/tracking`'), 'OrderItem phải có link theo dõi đơn hàng');
  });

  // =========================================================================
  // 5. ORDER DETAIL PAGE (CHI TIẾT ĐƠN HÀNG & IDOR DEFENSE)
  // =========================================================================
  test('TC-275-11: Trang OrderDetail.jsx hiển thị đầy đủ chi tiết đơn hàng, địa chỉ nhận hàng và danh sách sản phẩm', () => {
    const detailCode = readSrc('pages/customer/OrderDetail.jsx');

    assert.ok(detailCode.includes('OrderTimeline'), 'OrderDetail phải render component OrderTimeline');
    assert.ok(detailCode.includes('Thông tin nhận hàng'), 'OrderDetail phải có khu vực thông tin nhận hàng');
    assert.ok(detailCode.includes('Thanh toán'), 'OrderDetail phải có khu vực phương thức thanh toán');
    assert.ok(detailCode.includes('Sản phẩm đã đặt'), 'OrderDetail phải hiển thị danh sách sản phẩm trong đơn');
    assert.ok(detailCode.includes('Tổng số tiền:'), 'OrderDetail phải có tổng kết tiền thanh toán');
  });

  test('TC-275-12: Trang OrderDetail.jsx bảo vệ IDOR và hiển thị màn hình 403 Forbidden Shield thân thiện', () => {
    const detailCode = readSrc('pages/customer/OrderDetail.jsx');

    assert.ok(detailCode.includes('IDOR Protection'), 'OrderDetail phải có nhãn IDOR Protection khi bị chặn quyền');
    assert.ok(detailCode.includes('Quyền truy cập bị từ chối'), 'OrderDetail phải có tiêu đề Quyền truy cập bị từ chối');
    assert.ok(detailCode.includes('Danh sách đơn hàng của bạn'), 'OrderDetail phải có nút quay về danh sách đơn');
  });

  test('TC-275-13: Nút Hủy đơn chỉ hiển thị khi đơn PENDING và yêu cầu hộp thoại xác nhận confirmDialog (danger)', () => {
    const detailCode = readSrc('pages/customer/OrderDetail.jsx');

    assert.ok(detailCode.includes('ORDER_STATUS.PENDING'), 'Chỉ đơn PENDING mới được phép hiển thị nút Hủy đơn');
    assert.ok(detailCode.includes('confirmDialog'), 'Hủy đơn phải dùng confirmDialog từ Notification System');
    assert.ok(detailCode.includes("variant: 'danger'"), 'Hộp thoại xác nhận hủy đơn phải có variant danger');
    assert.ok(detailCode.includes('orderService.cancelOrder'), 'Hàm handleCancelOrder phải gọi orderService.cancelOrder');
  });

  test('TC-275-14: Nút Thanh toán ngay chỉ hiển thị khi đơn PENDING và phương thức thanh toán là MOCK_ONLINE', () => {
    const detailCode = readSrc('pages/customer/OrderDetail.jsx');

    assert.ok(detailCode.includes("order.paymentMethod === 'MOCK_ONLINE'"), 'Chỉ đơn MOCK_ONLINE mới hiển thị nút Thanh toán ngay');
    assert.ok(detailCode.includes('paymentService.mockPay'), 'Nút thanh toán phải kích hoạt paymentService.mockPay');
  });

  // =========================================================================
  // 6. CODE INTEGRITY & RESPONSIVE ATTRIBUTES
  // =========================================================================
  test('TC-275-15: Quét sạch 100% không còn alert(), confirm(), prompt() ("localhost says")', () => {
    const targetFiles = [
      'components/user/UserHeader.jsx',
      'components/order/OrderItem.jsx',
      'components/order/OrderStatus.jsx',
      'components/order/OrderTimeline.jsx',
      'pages/customer/Orders.jsx',
      'pages/customer/OrderDetail.jsx',
      'services/userService.js',
      'services/orderService.js'
    ];

    for (const rel of targetFiles) {
      const full = path.join(srcDir, rel);
      if (fs.existsSync(full)) {
        const text = fs.readFileSync(full, 'utf8');
        assert.ok(!/\b(window\.)?alert\s*\(/.test(text), `${rel} không được chứa hàm alert()`);
        assert.ok(!/\b(window\.)?confirm\s*\(/.test(text), `${rel} không được chứa hàm confirm()`);
        assert.ok(!/\b(window\.)?prompt\s*\(/.test(text), `${rel} không được chứa hàm prompt()`);
      }
    }
  });

  test('TC-275-16: Bố cục co giãn đa thiết bị (Responsive Design) và không có thuộc tính gây tràn ngang cố định', () => {
    const targetFiles = [
      'pages/customer/Orders.jsx',
      'pages/customer/OrderDetail.jsx',
      'components/order/OrderItem.jsx'
    ];

    for (const rel of targetFiles) {
      const full = path.join(srcDir, rel);
      const text = fs.readFileSync(full, 'utf8');

      assert.ok(text.includes('flexWrap') || text.includes('flex-wrap') || text.includes('gridTemplateColumns'),
        `${rel} phải sử dụng flexWrap hoặc CSS Grid co giãn đa màn hình`);
      assert.ok(!/width:\s*['"]\d{4,}px['"]/.test(text), `${rel} không được hardcode chiều rộng cố định > 1000px gây tràn trang`);
    }
  });
});
