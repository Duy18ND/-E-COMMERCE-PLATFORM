/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-266
 * [FE] QA Test - UI, responsive, lỗi và tích hợp (Đặt hàng & Thanh toán mô phỏng)
 * Dự án: ShopMart – E-Commerce Platform
 * Sprint: Sprint 2 | Epic: CUSTOMER (Parent: ECOM-261 [FE] Đặt hàng & Thanh toán mô phỏng)
 * Người phụ trách (PIC): Ngô Phương (DevOps & QA Lead phụ trách kiểm thử toàn diện Frontend)
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

describe('ECOM-266: [FE] QA TEST - UI, RESPONSIVE, LỖI VÀ TÍCH HỢP (CHECKOUT & MOCK PAYMENT)', () => {

  const checkoutFile = path.join(srcDir, 'pages', 'customer', 'Checkout.jsx');
  const orderSuccessFile = path.join(srcDir, 'pages', 'customer', 'OrderSuccess.jsx');
  const orderServiceFile = path.join(srcDir, 'services', 'orderService.js');
  const paymentServiceFile = path.join(srcDir, 'services', 'paymentService.js');
  const appRoutesFile = path.join(srcDir, 'routes', 'AppRoutes.jsx');
  const protectedRouteFile = path.join(srcDir, 'routes', 'ProtectedRoute.jsx');
  const responsiveCssFile = path.join(srcDir, 'styles', 'responsive.css');

  // =========================================================================
  // 1. CẤU HÌNH ROUTE & BẢO VỆ PHÂN QUYỀN (RBAC)
  // =========================================================================
  test('TC-266-01: Cấu hình Route /checkout, /order-success và bảo vệ phân quyền ROLE_USER', () => {
    assert.ok(fs.existsSync(checkoutFile), 'File Checkout.jsx phải tồn tại');
    assert.ok(fs.existsSync(orderSuccessFile), 'File OrderSuccess.jsx phải tồn tại');
    assert.ok(fs.existsSync(appRoutesFile), 'File AppRoutes.jsx phải tồn tại');

    const appRoutes = readSrc('routes/AppRoutes.jsx');
    const protectedRoute = readSrc('routes/ProtectedRoute.jsx');

    // Route configuration
    assert.ok(appRoutes.includes('path="/checkout"'), 'AppRoutes phải có route path="/checkout"');
    assert.ok(appRoutes.includes('element={<Checkout />}'), 'Route /checkout phải render Checkout');
    assert.ok(appRoutes.includes('path="/order-success"'), 'AppRoutes phải có route path="/order-success"');
    assert.ok(appRoutes.includes('element={<OrderSuccess />}'), 'Route /order-success phải render OrderSuccess');

    // ProtectedRoute with ROLE_USER
    assert.ok(appRoutes.includes("allowedRoles={['ROLE_USER']}"), 'Checkout & OrderSuccess phải được bảo vệ bởi allowedRoles ROLE_USER');
    assert.ok(protectedRoute.includes('!isAuthenticated'), 'ProtectedRoute phải chuyển hướng khách chưa đăng nhập sang /login');
    assert.ok(protectedRoute.includes("to={isAdmin ? '/admin' : '/'}"), 'ProtectedRoute phải chặn Admin vào route khách hàng');
  });

  // =========================================================================
  // 2. PRE-FILL DỮ LIỆU & TIỆN ÍCH TEST NHANH
  // =========================================================================
  test('TC-266-02: Tự động điền trước thông tin tài khoản và hỗ trợ nút điền nhanh dữ liệu test', () => {
    const checkoutCode = readSrc('pages/customer/Checkout.jsx');

    // Tự động pre-fill thông tin user
    assert.ok(checkoutCode.includes('user?.fullName') || checkoutCode.includes('user.fullName'), 'Phải tự động điền họ tên người nhận từ profile user');
    assert.ok(checkoutCode.includes('user?.phone') || checkoutCode.includes('user.phone'), 'Phải tự động điền số điện thoại từ profile user');
    assert.ok(checkoutCode.includes('user?.address') || checkoutCode.includes('user.address'), 'Phải tự động điền địa chỉ từ profile user');

    // Nút tiện ích test
    assert.ok(checkoutCode.includes('handleFillTestData'), 'Phải có hàm handleFillTestData hỗ trợ QA test nhanh');
    assert.ok(checkoutCode.includes('Điền nhanh thông tin test'), 'Giao diện phải có nút "Điền nhanh thông tin test"');
  });

  // =========================================================================
  // 3. TRẠNG THÁI GIỎ HÀNG TRỐNG (EMPTY CART STATE)
  // =========================================================================
  test('TC-266-03: Trạng thái giỏ hàng trống - Khóa đặt hàng, hiển thị thông báo và nút thêm mẫu test', () => {
    const checkoutCode = readSrc('pages/customer/Checkout.jsx');

    assert.ok(checkoutCode.includes('cartItems.length === 0'), 'Phải kiểm tra điều kiện cartItems.length === 0');
    assert.ok(checkoutCode.includes('Giỏ hàng của bạn đang trống'), 'Phải có tiêu đề "Giỏ hàng của bạn đang trống"');
    assert.ok(checkoutCode.includes('Bạn cần có ít nhất 1 sản phẩm trong giỏ'), 'Phải có mô tả yêu cầu giỏ có hàng');
    assert.ok(checkoutCode.includes('handleAddSampleItem'), 'Phải có hàm handleAddSampleItem để thêm sản phẩm mẫu test');
    assert.ok(checkoutCode.includes('Thêm sản phẩm mẫu Flash Sale để test ngay'), 'Có nút CTA thêm hàng mẫu thử nghiệm');
    assert.ok(checkoutCode.includes('Quay lại săn Flash Sale'), 'Có nút quay lại săn deal Flash Sale');
  });

  // =========================================================================
  // 4. VALIDATION FORM NGƯỜI NHẬN HÀNG
  // =========================================================================
  test('TC-266-04: Validation form thông tin giao hàng - Bắt buộc tên, điện thoại, địa chỉ', () => {
    const checkoutCode = readSrc('pages/customer/Checkout.jsx');

    // Form inputs
    assert.ok(checkoutCode.includes('name="receiverName"'), 'Phải có input receiverName');
    assert.ok(checkoutCode.includes('name="receiverPhone"'), 'Phải có input receiverPhone');
    assert.ok(checkoutCode.includes('name="streetAddress"'), 'Phải có input streetAddress');
    assert.ok(checkoutCode.includes('name="city"'), 'Phải có input city');
    assert.ok(checkoutCode.includes('name="note"'), 'Phải có input note');

    // Validation logic
    assert.ok(checkoutCode.includes('!formData.receiverName.trim()'), 'Phải validate receiverName không được để trống');
    assert.ok(checkoutCode.includes('!formData.receiverPhone.trim()'), 'Phải validate receiverPhone không được để trống');
    assert.ok(checkoutCode.includes('!formData.streetAddress.trim()'), 'Phải validate streetAddress không được để trống');
    assert.ok(checkoutCode.includes('Vui lòng điền đầy đủ tên người nhận, số điện thoại và địa chỉ nhận hàng!'), 'Phải có thông báo lỗi validation rõ ràng');
  });

  // =========================================================================
  // 5. PHƯƠNG THỨC THANH TOÁN (COD & MOCK ONLINE)
  // =========================================================================
  test('TC-266-05: Lựa chọn phương thức thanh toán COD hoặc Thanh toán Online mô phỏng', () => {
    const checkoutCode = readSrc('pages/customer/Checkout.jsx');

    assert.ok(checkoutCode.includes('PAYMENT_METHOD.COD'), 'Phải hỗ trợ phương thức PAYMENT_METHOD.COD');
    assert.ok(checkoutCode.includes('PAYMENT_METHOD.MOCK_ONLINE'), 'Phải hỗ trợ phương thức PAYMENT_METHOD.MOCK_ONLINE');
    assert.ok(checkoutCode.includes('Thanh toán bằng tiền mặt khi shipper giao tận nơi'), 'Phải có mô tả chi tiết cho COD');
    assert.ok(checkoutCode.includes('Tự động duyệt trạng thái Đã Thanh Toán (PAID)'), 'Phải có mô tả chi tiết cho Mock Online');
  });

  // =========================================================================
  // 6. TÍCH HỢP BỘ CHỌN VOUCHER & TÍNH CHIẾT KHẤU
  // =========================================================================
  test('TC-266-06: Tích hợp VoucherPickerModal, kiểm tra điều kiện minOrderValue và áp dụng giảm giá', () => {
    const checkoutCode = readSrc('pages/customer/Checkout.jsx');

    assert.ok(checkoutCode.includes('VoucherPickerModal'), 'Phải có component VoucherPickerModal');
    assert.ok(checkoutCode.includes('getVoucherStatus'), 'Phải kiểm tra trạng thái voucher qua getVoucherStatus');
    assert.ok(checkoutCode.includes('minOrderValue'), 'Phải kiểm tra điều kiện đơn tối thiểu minOrderValue');
    assert.ok(checkoutCode.includes('calcDiscount'), 'Phải tính toán số tiền giảm qua calcDiscount');
    assert.ok(checkoutCode.includes('handleSelectVoucher'), 'Phải có hàm handleSelectVoucher');
    assert.ok(checkoutCode.includes('handleRemoveVoucher'), 'Phải có hàm handleRemoveVoucher để xóa mã đã áp dụng');
  });

  // =========================================================================
  // 7. HIỂN THỊ TÓM TẮT ĐƠN HÀNG & TÍNH TOÁN TỔNG THANH TOÁN
  // =========================================================================
  test('TC-266-07: CartSummary tóm tắt đơn hàng, trừ chiết khấu voucher và tính finalTotal chính xác', () => {
    const checkoutCode = readSrc('pages/customer/Checkout.jsx');

    assert.ok(checkoutCode.includes('CartSummary'), 'Phải render component CartSummary');
    assert.ok(checkoutCode.includes('showCheckoutButton={false}'), 'CartSummary trong trang Checkout phải ẩn nút Checkout thừa');
    assert.ok(checkoutCode.includes('voucherDiscount'), 'Phải tính voucherDiscount');
    assert.ok(checkoutCode.includes('finalTotal'), 'Phải tính finalTotal sau khi trừ voucher');
    assert.ok(checkoutCode.includes('Math.max(0, totalPrice - voucherDiscount)'), 'finalTotal phải đảm bảo không âm');
  });

  // =========================================================================
  // 8. TRẠNG THÁI LOADING & CHỐNG DOUBLE SUBMIT
  // =========================================================================
  test('TC-266-08: Trạng thái loading, khóa nút đặt hàng khi đang xử lý để chống double submit', () => {
    const checkoutCode = readSrc('pages/customer/Checkout.jsx');

    assert.ok(checkoutCode.includes('disabled={loading || cartItems.length === 0}'), 'Nút submit phải bị disabled khi đang loading hoặc giỏ trống');
    assert.ok(checkoutCode.includes('Đang xác nhận đơn hàng...'), 'Nút submit phải đổi nhãn khi loading');
    assert.ok(checkoutCode.includes("cursor: loading ? 'not-allowed' : 'pointer'"), 'Cursor phải đổi sang not-allowed khi loading');
  });

  // =========================================================================
  // 9. TÍCH HỢP API BACKEND & THANH TOÁN MÔ PHỎNG
  // =========================================================================
  test('TC-266-09: orderService.checkout gọi POST /orders/checkout và mockPay thanh toán tự động', () => {
    const checkoutCode = readSrc('pages/customer/Checkout.jsx');
    const orderServiceCode = readSrc('services/orderService.js');
    const paymentServiceCode = readSrc('services/paymentService.js');

    // Tích hợp orderService.checkout
    assert.ok(checkoutCode.includes('orderService.checkout'), 'Checkout.jsx phải gọi orderService.checkout');
    assert.ok(orderServiceCode.includes("api.post('/orders/checkout'"), 'orderService.checkout phải gọi endpoint POST /orders/checkout');

    // Tích hợp paymentService.mockPay
    assert.ok(checkoutCode.includes('paymentService.mockPay'), 'Checkout.jsx phải gọi paymentService.mockPay khi chọn MOCK_ONLINE');
    assert.ok(paymentServiceCode.includes('/payments/mock-pay/'), 'paymentService phải có endpoint mockPay');

    // Dọn giỏ hàng & chuyển trang
    assert.ok(checkoutCode.includes('refreshCart()'), 'Phải làm mới / dọn rỗng giỏ hàng sau khi đặt thành công');
    assert.ok(checkoutCode.includes("navigate('/order-success'"), 'Phải điều hướng sang /order-success');
  });

  // =========================================================================
  // 10. XỬ LÝ LỖI & THÔNG BÁO NGƯỜI DÙNG (NOTIFICATION SYSTEM)
  // =========================================================================
  test('TC-266-10: Xử lý ngoại lệ, hiển thị ErrorMessage và thông báo toast qua useNotification', () => {
    const checkoutCode = readSrc('pages/customer/Checkout.jsx');

    assert.ok(checkoutCode.includes('useNotification'), 'Checkout.jsx phải import useNotification');
    assert.ok(checkoutCode.includes('const { notify } = useNotification()'), 'Checkout.jsx phải khai báo notify từ useNotification');
    assert.ok(checkoutCode.includes('notify.success('), 'Phải gọi notify.success khi đặt hàng thành công');
    assert.ok(checkoutCode.includes('notify.error('), 'Phải gọi notify.error khi đặt hàng thất bại');
    assert.ok(checkoutCode.includes('<ErrorMessage'), 'Phải render component ErrorMessage để hiển thị lỗi inline');
  });

  // =========================================================================
  // 11. GIAO DIỆN HÓA ĐƠN ĐẶT HÀNG THÀNH CÔNG (ORDER SUCCESS)
  // =========================================================================
  test('TC-266-11: Trang OrderSuccess hiển thị mã đơn, người nhận, địa chỉ, phương thức, trạng thái và nút điều hướng', () => {
    const successCode = readSrc('pages/customer/OrderSuccess.jsx');

    assert.ok(successCode.includes('Đặt Hàng Thành Công!'), 'Phải có tiêu đề "Đặt Hàng Thành Công!"');
    assert.ok(successCode.includes('#{orderId}'), 'Phải hiển thị mã đơn hàng #{orderId}');
    assert.ok(successCode.includes('Người nhận:'), 'Phải hiển thị thông tin Người nhận');
    assert.ok(successCode.includes('Số điện thoại:'), 'Phải hiển thị Số điện thoại');
    assert.ok(successCode.includes('Địa chỉ nhận hàng:'), 'Phải hiển thị Địa chỉ nhận hàng');
    assert.ok(successCode.includes('Phương thức:'), 'Phải hiển thị Phương thức thanh toán');
    assert.ok(successCode.includes('Trạng thái ban đầu:'), 'Phải hiển thị Trạng thái ban đầu');
    assert.ok(successCode.includes('Xem chi tiết đơn hàng'), 'Phải có nút xem chi tiết đơn hàng');
    assert.ok(successCode.includes('Lịch sử đơn hàng'), 'Phải có nút xem lịch sử đơn hàng');
    assert.ok(successCode.includes('Tiếp tục săn Flash Sale'), 'Phải có nút quay lại săn deal');
  });

  // =========================================================================
  // 12. RESPONSIVE DESIGN TRÊN DESKTOP, TABLET VÀ MOBILE
  // =========================================================================
  test('TC-266-12: Bố cục layout-split co giãn linh hoạt 2 cột sang 1 cột trên màn hình nhỏ', () => {
    const checkoutCode = readSrc('pages/customer/Checkout.jsx');
    const responsiveCss = readSrc('styles/responsive.css');

    assert.ok(checkoutCode.includes('layout-split'), 'Checkout.jsx phải áp dụng layout-split');
    assert.ok(
      responsiveCss.includes('.layout-split') && responsiveCss.includes('grid-template-columns: 1fr'),
      'responsive.css phải chuyển layout-split sang 1 cột trên tablet và mobile (<= 1024px)'
    );
  });

});
