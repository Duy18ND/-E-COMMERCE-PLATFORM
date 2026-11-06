/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-257
 * [FE] QA Test - UI, responsive, lỗi và tích hợp (Quản lý giỏ hàng)
 * Dự án: ShopMart – E-Commerce Platform
 * Sprint: Sprint 2 | Epic: CUSTOMER (Parent: ECOM-251 [FE] Quản lý giỏ hàng)
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

describe('ECOM-257: [FE] QA TEST - UI, RESPONSIVE, LỖI VÀ TÍCH HỢP (QUẢN LÝ GIỎ HÀNG)', () => {

  const cartPageFile = path.join(srcDir, 'pages', 'customer', 'Cart.jsx');
  const cartItemFile = path.join(srcDir, 'components', 'cart', 'CartItem.jsx');
  const cartSummaryFile = path.join(srcDir, 'components', 'cart', 'CartSummary.jsx');
  const cartContextFile = path.join(srcDir, 'context', 'CartContext.jsx');
  const cartServiceFile = path.join(srcDir, 'services', 'cartService.js');
  const appRoutesFile = path.join(srcDir, 'routes', 'AppRoutes.jsx');
  const userHeaderFile = path.join(srcDir, 'components', 'user', 'UserHeader.jsx');
  const globalCssFile = path.join(srcDir, 'styles', 'global.css');
  const responsiveCssFile = path.join(srcDir, 'styles', 'responsive.css');

  // =========================================================================
  // 1. CẤU HÌNH ĐỊNH TUYẾN & PROVIDER
  // =========================================================================
  test('TC-257-01: Định tuyến /cart được cấu hình và Provider CartContext bọc toàn bộ ứng dụng', () => {
    assert.ok(fs.existsSync(appRoutesFile), 'File AppRoutes.jsx phải tồn tại');
    assert.ok(fs.existsSync(cartPageFile), 'File Cart.jsx phải tồn tại');
    assert.ok(fs.existsSync(cartContextFile), 'File CartContext.jsx phải tồn tại');

    const appRoutes = readSrc('routes/AppRoutes.jsx');
    const mainJsx = readSrc('main.jsx');

    assert.ok(appRoutes.includes('path="/cart"'), 'AppRoutes phải có route path="/cart"');
    assert.ok(appRoutes.includes('element={<Cart />}'), 'Route /cart phải render component Cart');
    assert.ok(mainJsx.includes('CartProvider'), 'main.jsx phải bọc toàn bộ ứng dụng với CartProvider');
  });

  // =========================================================================
  // 2. PHÂN QUYỀN RBAC - CHẶN ADMIN TRUY CẬP GIỎ HÀNG
  // =========================================================================
  test('TC-257-02: Kiểm tra phân quyền RBAC - Chặn Admin vào giỏ hàng và cảnh báo bảo vệ', () => {
    const cartCode = readSrc('pages/customer/Cart.jsx');
    const contextCode = readSrc('context/CartContext.jsx');

    assert.ok(cartCode.includes('isAdmin'), 'Cart.jsx phải kiểm tra cờ isAdmin từ useAuth');
    assert.ok(cartCode.includes('Khu vực mua sắm dành cho Khách hàng'), 'Phải hiển thị tiêu đề thông báo dành riêng cho khách hàng');
    assert.ok(cartCode.includes('Tài khoản Quản trị viên (Admin) không sử dụng tính năng giỏ hàng'), 'Phải giải thích rõ Admin không được dùng giỏ hàng');
    assert.ok(cartCode.includes('to="/admin/sales"'), 'Phải có nút điều hướng về khu vực quản trị Admin (/admin/sales)');

    // Trong CartContext: addToCart phải chặn Admin
    assert.ok(contextCode.includes('if (isAdmin)'), 'CartContext phải kiểm tra isAdmin khi addToCart');
    assert.ok(contextCode.includes('Tài khoản Quản trị viên (Admin) không được phép thêm sản phẩm vào giỏ hàng'), 'Phải toast lỗi chặn Admin thêm vào giỏ');
  });

  // =========================================================================
  // 3. TRẠNG THÁI TẢI TRANG (LOADING) & GIỎ HÀNG TRỐNG (EMPTY STATE)
  // =========================================================================
  test('TC-257-03: Trạng thái tải dữ liệu (Loading) và giao diện giỏ hàng trống (Empty State)', () => {
    const cartCode = readSrc('pages/customer/Cart.jsx');

    // Loading State
    assert.ok(cartCode.includes('Loading'), 'Cart.jsx phải import hoặc dùng component Loading');
    assert.ok(cartCode.includes('Đang tải giỏ hàng của bạn...'), 'Phải có thông điệp loading thân thiện');

    // Empty State
    assert.ok(cartCode.includes('cartItems.length === 0'), 'Phải kiểm tra trạng thái cartItems.length === 0');
    assert.ok(cartCode.includes('Giỏ hàng đang trống'), 'Phải có tiêu đề "Giỏ hàng đang trống"');
    assert.ok(cartCode.includes('Bạn chưa có sản phẩm nào trong giỏ'), 'Phải có mô tả giỏ hàng trống');
    assert.ok(cartCode.includes('Săn deal Flash Sale ngay') || cartCode.includes('tiếp tục mua sắm'), 'Phải có CTA điều hướng khi giỏ trống');
    assert.ok(cartCode.includes('to="/flash-sale"'), 'Nút CTA phải dẫn đến trang săn deal Flash Sale');
  });

  // =========================================================================
  // 4. BỐ CỤC DANH SÁCH MẶT HÀNG & PHẦN TỬ CHI TIẾT SẢN PHẨM
  // =========================================================================
  test('TC-257-04: Hiển thị đầy đủ thông tin mặt hàng, ảnh, nhãn uỷ quyền, giá gốc, giá sale và mã giảm', () => {
    const itemCode = readSrc('components/cart/CartItem.jsx');
    const cartCode = readSrc('pages/customer/Cart.jsx');

    // Header & Breadcrumb
    assert.ok(cartCode.includes('Giỏ hàng của bạn ({totalItems} món)'), 'Tiêu đề giỏ hàng phải hiển thị số lượng totalItems');
    assert.ok(cartCode.includes('Trang chủ'), 'Breadcrumb phải có Trang chủ');
    assert.ok(cartCode.includes('Flash Sale'), 'Breadcrumb phải có Flash Sale');
    assert.ok(cartCode.includes('Cam kết hàng chính hãng 100%'), 'Phải có cam kết chính hãng');

    // CartItem Elements
    assert.ok(itemCode.includes('item.imageUrl'), 'Phải hiển thị ảnh sản phẩm imageUrl');
    assert.ok(itemCode.includes('resellerTag'), 'Phải hiển thị nhãn đại lý ủy quyền resellerTag');
    assert.ok(itemCode.includes('effectivePrice'), 'Phải tính giá bán thực tế effectivePrice');
    assert.ok(itemCode.includes('originalPrice'), 'Phải hiển thị giá gốc originalPrice');
    assert.ok(itemCode.includes('formatCurrency'), 'Phải format tiền qua formatCurrency');
    assert.ok(itemCode.includes('lineSavings'), 'Phải tính mức tiết kiệm từng dòng lineSavings');
    assert.ok(itemCode.includes('discountPercent'), 'Phải có huy hiệu phần trăm giảm giá');
  });

  // =========================================================================
  // 5. THAO TÁC SỐ LƯỢNG (TĂNG/GIẢM) & BẢO VỆ CHỐNG XÓA NHẦM KHI QTY = 1
  // =========================================================================
  test('TC-257-05: Thao tác tăng/giảm số lượng và bảo vệ người dùng: giảm khi qty = 1 yêu cầu xác nhận', () => {
    const itemCode = readSrc('components/cart/CartItem.jsx');

    assert.ok(itemCode.includes('handleDecrease'), 'Phải có hàm handleDecrease');
    assert.ok(itemCode.includes('handleIncrease'), 'Phải có hàm handleIncrease');
    assert.ok(itemCode.includes('qty <= 1'), 'Phải bắt điều kiện qty <= 1 để hỏi xác nhận');
    assert.ok(itemCode.includes('handleRemove()'), 'Bấm giảm khi qty <= 1 phải gọi handleRemove');
    assert.ok(itemCode.includes('aria-label="Giảm số lượng"'), 'Nút giảm phải có aria-label cho accessibility');
    assert.ok(itemCode.includes('aria-label="Tăng số lượng"'), 'Nút tăng phải có aria-label cho accessibility');
  });

  // =========================================================================
  // 6. XÓA SẢN PHẨM & XÓA TOÀN BỘ GIỎ HÀNG VỚI MODAL XÁC NHẬN CHUYÊN NGHIỆP
  // =========================================================================
  test('TC-257-06: Xóa sản phẩm và xóa toàn bộ giỏ qua ConfirmDialog (Không dùng window.confirm)', () => {
    const itemCode = readSrc('components/cart/CartItem.jsx');
    const cartCode = readSrc('pages/customer/Cart.jsx');

    // Chặn window.confirm() / alert()
    assert.ok(!itemCode.includes('window.confirm(') && !itemCode.includes('confirm('), 'CartItem không được dùng window.confirm()');
    assert.ok(!cartCode.includes('window.confirm(') && !cartCode.includes('confirm('), 'Cart.jsx không được dùng window.confirm()');

    // Xóa từng mục
    assert.ok(itemCode.includes('confirmDialog'), 'CartItem phải dùng confirmDialog từ Notification System');
    assert.ok(itemCode.includes("variant: 'danger'"), 'Hộp thoại xóa phải có variant danger');
    assert.ok(itemCode.includes('removeFromCart'), 'Phải gọi hàm removeFromCart khi xác nhận');
    assert.ok(itemCode.includes('notify.info'), 'Phải thông báo toast info sau khi xóa');

    // Xóa toàn bộ giỏ
    assert.ok(cartCode.includes('handleClearCart'), 'Phải có hàm handleClearCart');
    assert.ok(cartCode.includes('Xóa toàn bộ giỏ hàng'), 'Nút và tiêu đề modal xóa toàn bộ giỏ hàng');
    assert.ok(cartCode.includes('clearCart'), 'Phải gọi clearCart khi xác nhận xóa toàn bộ');
  });

  // =========================================================================
  // 7. TÍNH TOÁN CHÍNH XÁC TẠM TÍNH, GIẢM GIÁ, PHÍ VẬN CHUYỂN VÀ TỔNG THANH TOÁN
  // =========================================================================
  test('TC-257-07: Độ chính xác của tính toán số liệu tài chính: Tạm tính, Tiết kiệm, Miễn phí ship, VAT 10%', () => {
    const summaryCode = readSrc('components/cart/CartSummary.jsx');
    const contextCode = readSrc('context/CartContext.jsx');

    assert.ok(summaryCode.includes('Tổng tiền gốc'), 'Phải hiển thị mục Tổng tiền gốc');
    assert.ok(summaryCode.includes('Giảm giá Flash Sale') || summaryCode.includes('Tiết kiệm'), 'Phải hiển thị số tiền giảm giá');
    assert.ok(summaryCode.includes('Phí vận chuyển'), 'Phải có dòng Phí vận chuyển');
    assert.ok(summaryCode.includes('Miễn phí (0 đ)'), 'Phí vận chuyển hiển thị miễn phí');
    assert.ok(summaryCode.includes('Tổng thanh toán:'), 'Phải có dòng Tổng thanh toán');
    assert.ok(summaryCode.includes('Đã bao gồm VAT 10%'), 'Phải minh bạch thuế VAT 10%');

    // Trong CartContext: tính tổng an toàn
    assert.ok(contextCode.includes('totalPrice') || contextCode.includes('totalAmount'), 'CartContext phải tính toán totalPrice và totalAmount');
    assert.ok(contextCode.includes('totalOriginalPrice'), 'CartContext phải tính totalOriginalPrice');
    assert.ok(contextCode.includes('totalDiscount'), 'CartContext phải tính totalDiscount');
  });

  // =========================================================================
  // 8. ĐIỀU HƯỚNG THANH TOÁN & KHÓA NÚT KHI GIỎ TRỐNG
  // =========================================================================
  test('TC-257-08: Điều hướng thanh toán /checkout, gợi ý voucher và khóa nút đặt hàng khi giỏ rỗng', () => {
    const summaryCode = readSrc('components/cart/CartSummary.jsx');

    assert.ok(summaryCode.includes('to="/checkout"'), 'Phải có liên kết tới trang thanh toán /checkout');
    assert.ok(summaryCode.includes('Tiến hành đặt hàng ngay'), 'Nút thanh toán phải có text "Tiến hành đặt hàng ngay"');
    assert.ok(summaryCode.includes('disabled={totalItems === 0}'), 'Nút đặt hàng phải bị disabled khi totalItems === 0');
    assert.ok(summaryCode.includes("cursor: totalItems === 0 ? 'not-allowed' : 'pointer'"), 'Cursor phải đổi sang not-allowed khi giỏ rỗng');
    assert.ok(summaryCode.includes('to="/vouchers"'), 'Phải có gợi ý săn voucher dẫn tới /vouchers');
    assert.ok(summaryCode.includes('THANH TOÁN AN TOÀN & BẢO MẬT'), 'Phải hiển thị cam kết thanh toán an toàn (Visa, VietQR, COD)');
  });

  // =========================================================================
  // 9. ĐỒNG BỘ HUY HIỆU GIỎ HÀNG TRÊN HEADER (USER HEADER CART BADGE)
  // =========================================================================
  test('TC-257-09: Đồng bộ số lượng mặt hàng tức thì với header-cart-badge trên thanh điều hướng', () => {
    const headerCode = readSrc('components/user/UserHeader.jsx');
    const globalCss = readSrc('styles/global.css');

    assert.ok(headerCode.includes('useCart'), 'UserHeader phải kết nối hook useCart');
    assert.ok(headerCode.includes('totalItems'), 'UserHeader phải lấy totalItems từ CartContext');
    assert.ok(headerCode.includes('header-cart-badge'), 'UserHeader phải có class CSS header-cart-badge');
    assert.ok(headerCode.includes('totalItems > 0'), 'Badge chỉ hiển thị khi totalItems > 0');
    assert.ok(globalCss.includes('.header-cart-badge'), 'global.css phải định nghĩa style cho .header-cart-badge');
  });

  // =========================================================================
  // 10. CHÍNH SÁCH BẢO LƯU GIÁ FLASH SALE & ĐẾM NGƯỢC THỜI GIAN GIỮ CHỖ
  // =========================================================================
  test('TC-257-10: Cơ chế cảnh báo giữ chỗ Flash Sale trong giỏ hàng kèm đếm ngược Countdown', () => {
    const cartCode = readSrc('pages/customer/Cart.jsx');

    assert.ok(cartCode.includes('hasFlashSaleItems'), 'Cart.jsx phải kiểm tra có sản phẩm Flash Sale không');
    assert.ok(cartCode.includes('FlashCountdown'), 'Phải tích hợp component đếm ngược FlashCountdown');
    assert.ok(cartCode.includes('Cảnh báo giữ chỗ'), 'Phải có thanh cảnh báo giữ chỗ màu đỏ nổi bật');
    assert.ok(cartCode.includes('Chính sách giữ giá chớp nhoáng'), 'Phải có thẻ thông tin chính sách giữ giá chớp nhoáng');
    assert.ok(cartCode.includes('15 phút'), 'Thông tin giữ giá quy định rõ 15 phút');
  });

  // =========================================================================
  // 11. TÍCH HỢP REST API BACKEND & CƠ CHẾ DỰ PHÒNG LOCAL STORAGE (FAULT-TOLERANCE)
  // =========================================================================
  test('TC-257-11: cartService tích hợp đầy đủ 5 API Backend chuẩn và cơ chế fallback localStorage', () => {
    const serviceCode = readSrc('services/cartService.js');

    // 5 Endpoints chuẩn RESTful
    assert.ok(serviceCode.includes("api.get('/cart')"), 'Phải có API GET /cart');
    assert.ok(serviceCode.includes("api.post('/cart/items'"), 'Phải có API POST /cart/items');
    assert.ok(serviceCode.includes('api.put(`/cart/items/${itemId}`') || serviceCode.includes('api.put("/cart/items/'), 'Phải có API PUT /cart/items/{itemId}');
    assert.ok(serviceCode.includes('api.delete(`/cart/items/${itemId}`') || serviceCode.includes('api.delete("/cart/items/'), 'Phải có API DELETE /cart/items/{itemId}');
    assert.ok(serviceCode.includes("api.delete('/cart/clear')") || serviceCode.includes("api.delete('/cart')"), 'Phải có API DELETE /cart/clear');

    // Fallback Local Storage
    assert.ok(serviceCode.includes('localStorage'), 'cartService phải có cơ chế đọc/ghi localStorage khi offline hoặc lỗi API');
    assert.ok(serviceCode.includes('calculateCartResponse'), 'Phải có hàm tính toán phản hồi chuẩn calculateCartResponse khi fallback');
  });

  // =========================================================================
  // 12. KIỂM THỬ GIAO DIỆN RESPONSIVE ĐA THIẾT BỊ (DESKTOP, TABLET, MOBILE)
  // =========================================================================
  test('TC-257-12: Kiểm thử Responsive CSS - Chuyển đổi 2 cột thành 1 cột trên Tablet và Mobile', () => {
    const globalCss = readSrc('styles/global.css');
    const responsiveCss = readSrc('styles/responsive.css');
    const cartCode = readSrc('pages/customer/Cart.jsx');

    // Bố cục chia đôi
    assert.ok(cartCode.includes('layout-split'), 'Cart.jsx phải áp dụng class layout-split');
    assert.ok(globalCss.includes('.layout-split'), 'global.css phải khai báo grid layout-split');

    // Responsive Media Query
    assert.ok(
      responsiveCss.includes('.layout-split') && responsiveCss.includes('grid-template-columns: 1fr'),
      'responsive.css phải chuyển layout-split sang 1 cột trên màn hình nhỏ (<= 1024px)'
    );

    // Grid cam kết
    assert.ok(cartCode.includes('trust-grid'), 'Cart.jsx phải có class trust-grid');
    assert.ok(
      responsiveCss.includes('.trust-grid') && responsiveCss.includes('grid-template-columns: 1fr'),
      'responsive.css phải chuyển trust-grid sang 1 cột trên Mobile'
    );
  });

});
