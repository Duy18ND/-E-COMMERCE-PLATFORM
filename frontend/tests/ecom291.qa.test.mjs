import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');
const backendDir = path.resolve(__dirname, '../../backend');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');
const readBackend = (relPath) => fs.readFileSync(path.join(backendDir, relPath), 'utf8');

// =========================================================================
// TEST SUITE: ECOM-291 - [FE] Bảng quản trị đơn hàng, bộ lọc trạng thái
// =========================================================================

test('TC-291-01: Admin truy cập trang quản lý đơn hàng - Kiểm tra Route & AdminLayout', () => {
  const appRoutesCode = readSrc('routes/AppRoutes.jsx');
  const adminLayoutCode = readSrc('layouts/AdminLayout.jsx');
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');

  // Đảm bảo route /admin/orders được cấu hình trong AdminRoute bọc bởi AdminLayout
  assert.match(appRoutesCode, /<Route\s+element=\{<AdminRoute\s*\/>\}>/, 'Route admin phải được bảo vệ bởi AdminRoute');
  assert.match(appRoutesCode, /path="\/admin\/orders"/, 'Phải có Route định tuyến /admin/orders');
  assert.match(appRoutesCode, /<AdminOrders\s*\/>/, 'Route /admin/orders phải render AdminOrders');

  // Đảm bảo tiêu đề và mô tả trang hiển thị chính xác theo yêu cầu
  assert.match(ordersPageCode, /Quản lý đơn hàng/, 'Tiêu đề trang phải là "Quản lý đơn hàng"');
  assert.match(ordersPageCode, /Theo dõi và quản lý các đơn hàng trong hệ thống ShopMart\./, 'Mô tả ngắn trang phải chính xác');
});

test('TC-291-02: Danh sách đơn hàng hiển thị đúng dữ liệu Backend với đủ 7 cột chuẩn', () => {
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');

  // 1. Mã đơn hàng
  assert.match(ordersPageCode, /<th[^>]*>Mã đơn<\/th>/, 'Bảng phải có cột "Mã đơn"');
  assert.match(ordersPageCode, /#\{order\.id\}/, 'Cột mã đơn phải render ID đơn hàng');

  // 2. Tên khách hàng
  assert.match(ordersPageCode, /<th[^>]*>Khách hàng<\/th>/, 'Bảng phải có cột "Khách hàng"');
  assert.match(ordersPageCode, /order\.receiverName\s*\|\|\s*order\.userEmail/, 'Phải hiển thị receiverName hoặc userEmail');

  // 3. Ngày đặt hàng
  assert.match(ordersPageCode, /<th[^>]*>Ngày đặt hàng<\/th>/, 'Bảng phải có cột "Ngày đặt hàng"');
  assert.match(ordersPageCode, /order\.createdAt/, 'Phải hiển thị createdAt');

  // 4. Tổng tiền
  assert.match(ordersPageCode, /<th[^>]*>Tổng tiền<\/th>/, 'Bảng phải có cột "Tổng tiền"');
  assert.match(ordersPageCode, /formatCurrency\(order\.totalAmount/, 'Tổng tiền phải được định dạng qua formatCurrency');

  // 5. Phương thức thanh toán
  assert.match(ordersPageCode, /<th[^>]*>Phương thức TT<\/th>/, 'Bảng phải có cột "Phương thức TT"');
  assert.match(ordersPageCode, /order\.paymentMethod/, 'Phải hiển thị thông tin paymentMethod');

  // 6. Trạng thái đơn hàng
  assert.match(ordersPageCode, /<th[^>]*>Trạng thái<\/th>/, 'Bảng phải có cột "Trạng thái"');
  assert.match(ordersPageCode, /<OrderStatus\s+status=\{order\.status\}\s*\/>/, 'Trạng thái đơn hàng phải dùng OrderStatus component');

  // 7. Thao tác xem chi tiết
  assert.match(ordersPageCode, /<th[^>]*>Thao tác<\/th>/, 'Bảng phải có cột "Thao tác"');
  assert.match(ordersPageCode, /Chi tiết/, 'Phải có nút xem Chi tiết đơn hàng');
});

test('TC-291-03: Bộ lọc "Tất cả" hiển thị các đơn hàng phù hợp', () => {
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');
  const orderServiceCode = readSrc('services/orderService.js');

  // Kiểm tra option và tab "Tất cả"
  assert.match(ordersPageCode, /value:\s*'',\s*label:\s*'Tất cả trạng thái'/, 'Phải có tùy chọn lọc "Tất cả trạng thái"');
  assert.match(ordersPageCode, /value:\s*'',\s*label:\s*'Tất cả'/, 'Phải có tab lọc nhanh "Tất cả"');

  // Khi status = '', orderService không gửi query status hoặc gửi undefined để lấy toàn bộ đơn
  assert.match(ordersPageCode, /if\s*\(statusFilter\)\s*\{\s*params\.status\s*=\s*statusFilter;\s*\}/, 'Không gán params.status nếu rỗng');
});

test('TC-291-04: Lọc đơn hàng theo trạng thái PENDING nếu tồn tại', () => {
  const constantsCode = readSrc('utils/constants.js');
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');
  const backendOrderStatus = readBackend('order-service/src/main/java/com/ecommerce/order/enums/OrderStatus.java');

  // Backend và frontend constants phải có PENDING
  assert.match(backendOrderStatus, /PENDING,/, 'Backend OrderStatus enum phải có PENDING');
  assert.match(constantsCode, /PENDING:\s*'PENDING'/, 'Frontend constants phải có ORDER_STATUS.PENDING');
  assert.match(ordersPageCode, /ORDER_STATUS\.PENDING/, 'Orders.jsx phải hỗ trợ lọc trạng thái PENDING');
});

test('TC-291-05: Lọc đơn hàng theo các trạng thái khác được Backend hỗ trợ', () => {
  const constantsCode = readSrc('utils/constants.js');
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');
  const backendOrderStatus = readBackend('order-service/src/main/java/com/ecommerce/order/enums/OrderStatus.java');

  // Kiểm tra danh sách trạng thái thực tế từ Backend
  const expectedStatuses = ['PENDING', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'FAILED', 'REFUNDED'];
  for (const status of expectedStatuses) {
    assert.match(backendOrderStatus, new RegExp(`\\b${status}\\b`), `Backend OrderStatus enum phải có ${status}`);
    assert.match(constantsCode, new RegExp(`\\b${status}:\\s*'${status}'`), `Frontend constants phải có ${status}`);
    assert.match(ordersPageCode, new RegExp(`ORDER_STATUS\\.${status}`), `Orders.jsx phải hỗ trợ trạng thái ${status}`);
  }
});

test('TC-291-06: Không có đơn hàng phù hợp với bộ lọc (Empty State)', () => {
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');

  // Đảm bảo hiển thị Empty State khi mảng rỗng
  assert.match(ordersPageCode, /displayedOrders\.length\s*===\s*0/, 'Orders.jsx phải kiểm tra danh sách rỗng');
  assert.match(ordersPageCode, /Không có đơn hàng nào phù hợp/, 'Phải hiển thị thông điệp "Không có đơn hàng nào phù hợp"');
  assert.match(ordersPageCode, /Đặt lại bộ lọc/, 'Phải có nút đặt lại bộ lọc trong Empty State');
});

test('TC-291-07: Xử lý API trả về lỗi (Error State & Nút Thử lại)', () => {
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');

  // Đảm bảo hiển thị ErrorMessage và nút Thử lại kết nối
  assert.match(ordersPageCode, /<ErrorMessage\s+message=\{error\}/, 'Phải có ErrorMessage khi error khác rỗng');
  assert.match(ordersPageCode, /Thử lại kết nối/, 'Phải có nút "Thử lại kết nối"');
  assert.match(ordersPageCode, /onClick=\{fetchOrders\}/, 'Nút thử lại phải gọi fetchOrders');
});

test('TC-291-08: USER truy cập /admin/orders bị từ chối quyền', () => {
  const adminRouteCode = readSrc('routes/AdminRoute.jsx');

  // Kiểm tra logic từ chối role non-admin
  assert.match(adminRouteCode, /if\s*\(!isAdmin\)/, 'AdminRoute phải kiểm tra quyền isAdmin');
  assert.match(adminRouteCode, /accessDenied:\s*true/, 'Phải trả về accessDenied khi không phải admin');
  assert.match(adminRouteCode, /Bạn không có quyền truy cập vào khu vực Quản trị viên \(Admin\)!/, 'Phải thông báo từ chối quyền truy cập');
});

test('TC-291-09: Guest truy cập /admin/orders bị yêu cầu đăng nhập', () => {
  const adminRouteCode = readSrc('routes/AdminRoute.jsx');

  // Kiểm tra logic chuyển hướng khách vãng lai
  assert.match(adminRouteCode, /if\s*\(!isAuthenticated\)/, 'AdminRoute phải kiểm tra isAuthenticated');
  assert.match(adminRouteCode, /<Navigate\s+to="\/login"/, 'Guest phải bị chuyển hướng đến /login');
});

test('TC-291-10: Kiểm tra giao diện responsive', () => {
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');

  // Kiểm tra table-responsive và container bọc co giãn
  assert.match(ordersPageCode, /className="table-responsive"/, 'Bảng đơn hàng phải được bọc trong table-responsive để không bị tràn màn hình');
  assert.match(ordersPageCode, /className="admin-toolbar-grid"/, 'Thanh công cụ phải responsive với admin-toolbar-grid');
  assert.match(ordersPageCode, /flexWrap:\s*'wrap'/, 'Các nút lọc và thanh điều hướng phải có flexWrap: wrap');
});

test('TC-291-11: Kiểm tra phân trang Backend (Pagination)', () => {
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');
  const orderServiceCode = readSrc('services/orderService.js');
  const backendController = readBackend('order-service/src/main/java/com/ecommerce/order/controller/AdminOrderController.java');

  // Backend AdminOrderController hỗ trợ page, size, status, sortBy, sortDir
  assert.match(backendController, /@RequestParam\(defaultValue = "0"\) int page/, 'Backend phải hỗ trợ param page');
  assert.match(backendController, /@RequestParam\(defaultValue = "10"\) int size/, 'Backend phải hỗ trợ param size');
  assert.match(backendController, /PagedResponse<OrderResponse>/, 'Backend phải trả về PagedResponse');

  // orderService.getAllOrders xử lý chuẩn PagedResponse
  assert.match(orderServiceCode, /response\.content/, 'orderService phải trích xuất content từ PagedResponse');
  assert.match(orderServiceCode, /response\.totalElements/, 'orderService phải lấy totalElements');
  assert.match(orderServiceCode, /response\.totalPages/, 'orderService phải lấy totalPages');

  // Orders.jsx reset về trang 1 khi thay đổi trạng thái
  assert.match(ordersPageCode, /setCurrentPage\(1\)/, 'Orders.jsx phải đặt lại về trang đầu tiên khi thay đổi bộ lọc');
  assert.match(ordersPageCode, /<Pagination/, 'Orders.jsx phải sử dụng component Pagination');
});

test('TC-291-12: Kiểm tra xem chi tiết đơn hàng (Modal chi tiết)', () => {
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');
  const orderServiceCode = readSrc('services/orderService.js');

  // 1. Phải có hàm getAdminOrderById trong orderService
  assert.match(orderServiceCode, /getAdminOrderById:\s*async/, 'orderService phải có hàm getAdminOrderById');

  // 2. Orders.jsx có handleViewDetail mở Modal
  assert.match(ordersPageCode, /handleViewDetail/, 'Orders.jsx phải có hàm handleViewDetail');
  assert.match(ordersPageCode, /orderService\.getAdminOrderById/, 'handleViewDetail phải gọi orderService.getAdminOrderById');

  // 3. Modal hiển thị đầy đủ thông tin yêu cầu:
  // - Mã đơn hàng & Ngày đặt
  assert.match(ordersPageCode, /Chi tiết đơn hàng #\{selectedOrder\.id\}/, 'Modal phải hiển thị mã đơn hàng');
  // - Khách hàng, SĐT, Địa chỉ
  assert.match(ordersPageCode, /selectedOrder\.receiverName/, 'Modal phải hiển thị tên người nhận');
  assert.match(ordersPageCode, /selectedOrder\.receiverPhone/, 'Modal phải hiển thị SĐT');
  assert.match(ordersPageCode, /selectedOrder\.shippingAddress/, 'Modal phải hiển thị địa chỉ');
  // - Danh sách sản phẩm
  assert.match(ordersPageCode, /selectedOrder\.items/, 'Modal phải hiển thị danh sách sản phẩm');
  assert.match(ordersPageCode, /item\.productName/, 'Modal phải hiển thị tên sản phẩm');
  assert.match(ordersPageCode, /item\.priceAtPurchase/, 'Modal phải hiển thị giá mua');
  assert.match(ordersPageCode, /item\.quantity/, 'Modal phải hiển thị số lượng');
  assert.match(ordersPageCode, /item\.subTotal/, 'Modal phải hiển thị thành tiền');
  // - Tổng tiền
  assert.match(ordersPageCode, /Tổng cộng tiền thanh toán/, 'Modal phải hiển thị tổng cộng');
  // - Trạng thái
  assert.match(ordersPageCode, /<OrderStatus\s+status=\{selectedOrder\.status\}\s*\/>/, 'Modal phải hiển thị trạng thái đơn hàng');
});
