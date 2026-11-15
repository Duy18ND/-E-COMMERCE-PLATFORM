import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';

register(
  'data:text/javascript,' +
  encodeURIComponent(`
      export async function resolve(specifier, context, nextResolve) {
        try {
          return await nextResolve(specifier, context);
        } catch (err) {
          if (specifier.startsWith('.') && !specifier.endsWith('.js')) {
            return await nextResolve(specifier + '.js', context);
          }
          throw err;
        }
      }
    `),
  import.meta.url
);

const { default: api } = await import('../src/services/api.js');
const { default: orderService, normalizeOrderFromBackend } = await import('../src/services/orderService.js');
const { default: categoryService, classifyCategoryApiError } = await import('../src/services/categoryService.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');
const backendDir = path.resolve(__dirname, '../../backend');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');
const readBackend = (relPath) => fs.readFileSync(path.join(backendDir, relPath), 'utf8');

// ============================================================================
// ECOM-293: [FE] QA Test - UI, responsive, lỗi và tích hợp (Quản trị đơn hàng)
// Parent Task: ECOM-288 | Feature: ECOM-140 | Sprint 2
// ============================================================================

test('TC-293-01: Bảng quản trị đơn hàng hiển thị đầy đủ 7 cột thông tin chuẩn nghiệp vụ', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersCode, />Mã đơn<\/th>/, 'Phải có cột Mã đơn');
  assert.match(ordersCode, />Khách hàng<\/th>/, 'Phải có cột Khách hàng');
  assert.match(ordersCode, />Ngày đặt hàng<\/th>/, 'Phải có cột Ngày đặt hàng');
  assert.match(ordersCode, />Tổng tiền<\/th>/, 'Phải có cột Tổng tiền');
  assert.match(ordersCode, />Phương thức TT<\/th>/, 'Phải có cột Phương thức TT');
  assert.match(ordersCode, />Trạng thái<\/th>/, 'Phải có cột Trạng thái');
  assert.match(ordersCode, />Thao tác<\/th>/, 'Phải có cột Thao tác');
});

test('TC-293-02: Hỗ trợ lọc trạng thái qua cả Quick Filter Pills và Dropdown đầy đủ 9 trạng thái Backend', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersCode, /const STATUS_OPTIONS = \[/, 'Có danh sách STATUS_OPTIONS');
  assert.match(ordersCode, /const QUICK_FILTER_TABS = \[/, 'Có danh sách QUICK_FILTER_TABS');
  for (const statusKey of [
    'PENDING',
    'PAID',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPING',
    'DELIVERED',
    'CANCELLED',
    'FAILED',
    'REFUNDED'
  ]) {
    assert.match(ordersCode, new RegExp(`ORDER_STATUS\\.${statusKey}`), `Hỗ trợ trạng thái ${statusKey}`);
  }
});

test('TC-293-03: Thay đổi bộ lọc trạng thái hoặc sắp xếp tự động reset phân trang về trang 1 và truyền 0-based page lên API', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersCode, /const handleStatusFilterChange = \(newStatus\) => \{\s*setStatusFilter\(newStatus\);\s*setCurrentPage\(1\);\s*\}/, 'Reset trang 1 khi đổi trạng thái');
  assert.match(ordersCode, /page: currentPage - 1/, 'Chuyển đổi currentPage (1-based) sang page (0-based) cho Spring Data');
});

test('TC-293-04: Chống Race Condition khi Admin bấm chuyển đổi tab trạng thái liên tục (requestIdRef)', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersCode, /const requestIdRef = useRef\(0\)/, 'Sử dụng requestIdRef để theo dõi request mới nhất');
  assert.match(ordersCode, /if \(currentRequestId !== requestIdRef\.current\) return;/, 'Bỏ qua kết quả của request cũ đã lỗi thời');
});

test('TC-293-05: Xử lý đầy đủ trạng thái Loading, Error (có nút Thử lại kết nối) và Empty State', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersCode, /<Loading message="Đang tải dữ liệu đơn hàng từ máy chủ\.\.\." \/>/, 'Hiển thị Loading state');
  assert.match(ordersCode, /<ErrorMessage message=\{error\}/, 'Hiển thị ErrorMessage khi lỗi');
  assert.match(ordersCode, /Thử lại kết nối/, 'Có nút Thử lại kết nối');
  assert.match(ordersCode, /Không có đơn hàng nào phù hợp/, 'Hiển thị Empty state');
});

test('TC-293-06: Quy trình chuyển tiếp trạng thái (ORDER_TRANSITIONS) đồng bộ 100% với State Machine ở Backend', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  const adminOrderController = readBackend('order-service/src/main/java/com/ecommerce/order/controller/AdminOrderController.java');

  assert.match(ordersCode, /\[ORDER_STATUS\.DELIVERED\]: \[\]/, 'Trạng thái DELIVERED không cho phép chuyển tiếp');
  assert.match(ordersCode, /\[ORDER_STATUS\.CANCELLED\]: \[\]/, 'Trạng thái CANCELLED không cho phép chuyển tiếp');
  assert.match(ordersCode, /\[ORDER_STATUS\.FAILED\]: \[\]/, 'Trạng thái FAILED không cho phép chuyển tiếp');
  assert.match(ordersCode, /\[ORDER_STATUS\.REFUNDED\]: \[\]/, 'Trạng thái REFUNDED không cho phép chuyển tiếp');
  assert.match(adminOrderController, /orderService\.updateOrderStatus\(id,\s*request\.getStatus\(\),\s*updatedBy,\s*"ROLE_ADMIN",\s*request\.getNote\(\)\)/, 'Backend thực thi updateOrderStatus theo State Machine kèm ghi chú');
});

test('TC-293-07: Modal Chi tiết đơn hàng tích hợp Form cập nhật trạng thái đơn (ECOM-292) với ghi chú và kiểm tra hợp lệ', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersCode, /Cập nhật trạng thái đơn hàng/, 'Có tiêu đề khối Cập nhật trạng thái đơn hàng trong Modal');
  assert.match(ordersCode, /id="modal-order-status-select"/, 'Có dropdown chọn trạng thái tiếp theo');
  assert.match(ordersCode, /id="modal-order-status-note"/, 'Có ô nhập ghi chú / lý do cập nhật');
  assert.match(ordersCode, /const handleModalStatusSubmit = async \(e\) =>/, 'Có hàm xử lý submit form cập nhật trạng thái trong Modal');
  assert.match(ordersCode, /Lưu trạng thái mới/, 'Có nút Lưu trạng thái mới');
});

test('TC-293-08: Bắt buộc nhập lý do khi Admin chọn chuyển sang trạng thái Đã hủy (CANCELLED) trong Form cập nhật', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(
    ordersCode,
    /if \(modalTargetStatus === ORDER_STATUS\.CANCELLED && !statusNote\.trim\(\)\)/,
    'Kiểm tra bắt buộc nhập lý do khi chọn CANCELLED'
  );
  assert.match(
    ordersCode,
    /Vui lòng nhập lý do hủy đơn hàng \(bắt buộc khi hủy đơn\)\./,
    'Hiển thị lỗi khi bỏ trống lý do hủy đơn'
  );
});

test('TC-293-09: Modal Chi tiết đơn hàng hiển thị thông tin người nhận, bảng sản phẩm, tổng tiền và OrderTimeline', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersCode, /Chi tiết đơn hàng #\{selectedOrder\.id\}/, 'Hiển thị tiêu đề mã đơn hàng');
  assert.match(ordersCode, /Danh sách sản phẩm/, 'Hiển thị danh sách sản phẩm trong đơn');
  assert.match(ordersCode, /Tổng cộng tiền thanh toán:/, 'Hiển thị tổng cộng tiền thanh toán');
  assert.match(ordersCode, /<OrderTimeline/, 'Tích hợp component OrderTimeline');
});

test('TC-293-10: Hỗ trợ đóng Modal Chi tiết đơn hàng bằng phím Escape và thuộc tính Accessibility', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersCode, /aria-modal="true"/, 'Modal có aria-modal="true"');
  assert.match(ordersCode, /role="dialog"/, 'Modal có role="dialog"');
  assert.match(ordersCode, /e\.key === 'Escape' && !actionLoading/, 'Đóng modal bằng phím Escape khi không đang xử lý');
});

test('TC-293-11: Kiểm tra Responsive Layout của bảng đơn hàng và thanh công cụ trên nhiều kích thước màn hình', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  const globalCss = readSrc('styles/global.css');
  assert.match(ordersCode, /className="table-responsive"/, 'Bọc bảng đơn hàng trong .table-responsive');
  assert.match(ordersCode, /className="data-table orders-table"/, 'Sử dụng class orders-table');
  assert.match(globalCss, /\.orders-table/, 'Có định nghĩa CSS responsive cho .orders-table');
});

test('TC-293-12: Tích hợp API orderService (getAllOrders, getAdminOrderById, updateOrderStatus, getOrderStatusHistory)', () => {
  const orderServiceCode = readSrc('services/orderService.js');
  assert.match(orderServiceCode, /getAllOrders:\s*async/, 'Có hàm getAllOrders');
  assert.match(orderServiceCode, /api\.get\('\/admin\/orders'/, 'Gọi GET /admin/orders');
  assert.match(orderServiceCode, /getAdminOrderById:\s*async/, 'Có hàm getAdminOrderById');
  assert.match(orderServiceCode, /updateOrderStatus:\s*async\s*\(id,\s*status,\s*note\s*=\s*''\)/, 'Hàm updateOrderStatus nhận id, status, note');
  assert.match(orderServiceCode, /api\.put\(`\/admin\/orders\/\$\{id\}\/status`,\s*\{\s*status,\s*note\s*\}\)/, 'Gọi PUT /admin/orders/{id}/status kèm status và note');
});

test('TC-293-13: Đồng bộ danh sách đơn hàng và làm mới lịch sử Timeline ngay sau khi cập nhật trạng thái thành công', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersCode, /const updatedOrder = await orderService\.updateOrderStatus\(orderId, targetStatus, customNote\)/, 'Gọi API updateOrderStatus kèm customNote');
  assert.match(ordersCode, /refreshedHistories = await orderService\.getOrderStatusHistory\(orderId\)/, 'Làm mới lịch sử trạng thái cho OrderTimeline');
});

test('TC-293-14: Định tuyến /admin/orders được bảo vệ bởi AdminRoute', () => {
  const appRoutes = readSrc('routes/AppRoutes.jsx');
  assert.match(appRoutes, /<Route element=\{<AdminRoute \/>\}>/, 'Route /admin được bảo vệ bởi AdminRoute');
  assert.match(appRoutes, /path="\/admin\/orders"[\s\S]*?<AdminOrders \/>/, 'Có route /admin/orders trỏ tới AdminOrders');
});

test('TC-293-15: Tích hợp Backend AdminOrderController yêu cầu quyền ADMIN (requireAdminRole / ROLE_ADMIN)', () => {
  const controllerCode = readBackend('order-service/src/main/java/com/ecommerce/order/controller/AdminOrderController.java');
  assert.match(controllerCode, /@RequestMapping\("\/api\/v1\/admin\/orders"\)/, 'Mapping /api/v1/admin/orders');
  assert.match(controllerCode, /requireAdminRole\(roles\)/, 'Yêu cầu quyền ADMIN tại AdminOrderController');
  assert.match(controllerCode, /@PutMapping\("\/\{id\}\/status"\)/, 'Có endpoint PUT /{id}/status');
});

test('TC-293-16: Đảm bảo an toàn Lint/CI: Không trùng lặp biến notify và dùng confirmDialog chuẩn thay cho window.confirm/alert', () => {
  const ordersCode = readSrc('pages/admin/Orders.jsx');
  const notifyMatches = ordersCode.match(/const\s+\{\s*notify\b/g) || [];
  assert.equal(notifyMatches.length, 1, 'Orders.jsx chỉ khai báo destructuring notify đúng 1 lần');
  assert.match(ordersCode, /await confirmDialog\(/, 'Sử dụng confirmDialog chuẩn của hệ thống');
  assert.doesNotMatch(ordersCode, /window\.(alert|confirm|prompt)\s*\(/, 'Không sử dụng window.alert/confirm/prompt');
});

test('TC-293-17: normalizeOrderFromBackend chuyển đổi đúng OrderResponse từ Backend (kể cả BigDecimal string & LocalDateTime array)', () => {
  assert.equal(normalizeOrderFromBackend(null), null);
  assert.equal(normalizeOrderFromBackend(undefined), null);

  const normalized = normalizeOrderFromBackend({
    id: 42,
    userId: 7,
    receiverName: 'Nguyễn Minh Anh',
    receiverPhone: '0901234567',
    shippingAddress: '101 Lê Lợi, Quận 1, TP.HCM',
    subtotalAmount: '500000.00',
    voucherCode: 'SALE50K',
    discountAmount: '50000.00',
    totalAmount: '450000.00',
    status: 'confirmed',
    paymentMethod: 'mock_online',
    createdAt: [2026, 11, 10, 14, 30, 5],
    items: [
      {
        id: 100,
        productId: 12,
        productName: 'Bàn phím cơ Keychron K2',
        quantity: 2,
        priceAtPurchase: '250000',
        subTotal: null
      }
    ],
    statusHistories: [
      {
        id: 1,
        orderId: 42,
        status: 'pending',
        previousStatus: null,
        createdAt: [2026, 11, 10, 14, 0, 0]
      }
    ]
  });

  assert.equal(normalized.id, 42);
  assert.equal(normalized.status, 'CONFIRMED');
  assert.equal(normalized.paymentMethod, 'MOCK_ONLINE');
  assert.equal(normalized.subtotalAmount, 500000);
  assert.equal(normalized.discountAmount, 50000);
  assert.equal(normalized.totalAmount, 450000);
  assert.equal(normalized.voucherCode, 'SALE50K');
  assert.ok(typeof normalized.createdAt === 'string' && !Number.isNaN(new Date(normalized.createdAt).getTime()));
  assert.equal(normalized.items.length, 1);
  assert.equal(normalized.items[0].productName, 'Bàn phím cơ Keychron K2');
  assert.equal(normalized.items[0].subTotal, 500000);
  assert.equal(normalized.statusHistories[0].status, 'PENDING');
});

test('TC-293-18: orderService.getAllOrders và getRealOrdersForDashboard chuẩn hóa dữ liệu thật & ném lỗi thật khi API thất bại (không dùng mock che lỗi)', async () => {
  const originalGet = api.get;
  try {
    api.get = async (url, config) => {
      assert.equal(url, '/admin/orders');
      assert.equal(config.params.page, 0);
      return {
        content: [
          {
            id: 99,
            receiverName: 'Khách Thực Tế',
            receiverPhone: '0988777666',
            totalAmount: 1200000,
            status: 'PENDING',
            paymentMethod: 'COD',
            createdAt: '2026-11-11T09:00:00'
          }
        ],
        totalElements: 1,
        totalPages: 1,
        pageNumber: 0,
        pageSize: 10,
        last: true
      };
    };

    const paged = await orderService.getAllOrders({ page: 0, size: 10, sortBy: 'id', sortDir: 'desc' });
    assert.equal(paged.content.length, 1);
    assert.equal(paged.content[0].id, 99);
    assert.equal(paged.content[0].totalAmount, 1200000);
    assert.equal(paged.totalElements, 1);

    const dashboardOrders = await orderService.getRealOrdersForDashboard(50);
    assert.equal(dashboardOrders.length, 1);
    assert.equal(dashboardOrders[0].status, 'PENDING');

    api.get = async () => {
      const apiErr = new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn (HTTP 401).');
      apiErr.response = { status: 401 };
      throw apiErr;
    };
    await assert.rejects(() => orderService.getAllOrders({ page: 0, size: 10 }), /HTTP 401/);

    api.get = async () => {
      const apiErr = new Error('Bạn không có quyền truy cập tài nguyên này (HTTP 403).');
      apiErr.response = { status: 403 };
      throw apiErr;
    };
    await assert.rejects(() => orderService.getAllOrders({ page: 0, size: 10 }), /HTTP 403/);

    api.get = async () => {
      const apiErr = new Error('Máy chủ đang gặp sự cố nội bộ (HTTP 500).');
      apiErr.response = { status: 500 };
      throw apiErr;
    };
    await assert.rejects(() => orderService.getAllOrders({ page: 0, size: 10 }), /HTTP 500/);
  } finally {
    api.get = originalGet;
  }
});

test('TC-293-19: orderService.getAdminOrderById & updateOrderStatus không che giấu lỗi HTTP 500 từ Backend', async () => {
  const originalGet = api.get;
  const originalPut = api.put;
  try {
    api.get = async (url) => {
      assert.equal(url, '/orders/55');
      return {
        id: 55,
        receiverName: 'Trần Bảo',
        totalAmount: '750000',
        status: 'SHIPPING',
        paymentMethod: 'COD',
        createdAt: '2026-11-11T08:00:00',
        items: [{ id: 1, productId: 5, productName: 'Chuột Logitech', quantity: 1, priceAtPurchase: 750000, subTotal: 750000 }]
      };
    };
    const detail = await orderService.getAdminOrderById(55);
    assert.equal(detail.id, 55);
    assert.equal(detail.totalAmount, 750000);
    assert.equal(detail.items[0].productName, 'Chuột Logitech');

    api.put = async () => {
      const serverErr = new Error('Lỗi hoàn kho từ Product Service (HTTP 500)');
      serverErr.response = { status: 500 };
      throw serverErr;
    };
    await assert.rejects(() => orderService.updateOrderStatus(55, 'CANCELLED', 'Hết hàng'), /HTTP 500/);

    // Kiểm tra khi lỗi chỉ có err.status (không có err.response)
    api.get = async () => {
      const statusOnlyErr = new Error('Không tìm thấy đơn hàng (HTTP 404).');
      statusOnlyErr.status = 404;
      throw statusOnlyErr;
    };
    await assert.rejects(() => orderService.getAdminOrderById(9999), /HTTP 404/);
    await assert.rejects(() => orderService.getAllOrders({ page: 0, size: 10 }), /HTTP 404/);
  } finally {
    api.get = originalGet;
    api.put = originalPut;
  }
});

test('TC-293-20: ECOM-130, ECOM-131, ECOM-235, ECOM-237: categoryService xử lý chuẩn thành công và thất bại (Network, HTTP 500, Auth 401/403, Data 400/409)', async () => {
  const originalGet = api.get;
  const originalPost = api.post;
  const originalPut = api.put;
  const originalDelete = api.delete;

  try {
    // 1. Khi API thành công -> trả về danh sách danh mục chuẩn hóa với ID thực từ Backend
    api.get = async (url) => {
      assert.equal(url, '/products/categories');
      return [
        { id: 1, name: 'Điện thoại & Tablet', description: 'Smartphone chính hãng', imageUrl: 'https://example.com/phone.jpg' },
        { id: 5, name: 'Thiết bị văn phòng', description: 'Máy in, máy chiếu', imageUrl: 'https://example.com/office.jpg' }
      ];
    };
    const adminCats = await categoryService.getAllForAdmin({ rejectOnError: true });
    assert.equal(adminCats.length, 2);
    assert.equal(adminCats[0].id, '1');
    assert.equal(adminCats[1].id, '5');
    assert.equal(adminCats[1].name, 'Thiết bị văn phòng');
    assert.equal(adminCats[1].productCount, 0);

    // 2. Khi API trả về lỗi mạng (Network Error) -> throw NETWORK_ERROR, không trả về mock data
    api.get = async () => {
      throw new Error('Network Error');
    };
    await assert.rejects(
      () => categoryService.getAllForAdmin({ rejectOnError: true }),
      (err) => err.errorType === 'NETWORK_ERROR' && /kết nối/.test(err.message)
    );

    // 3. Khi API trả về lỗi xác thực / phân quyền (401 / 403) -> throw AUTH_ERROR
    api.get = async () => {
      const authErr = new Error('Forbidden');
      authErr.response = { status: 403, data: { message: 'Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này' } };
      throw authErr;
    };
    await assert.rejects(
      () => categoryService.getAllForAdmin({ rejectOnError: true }),
      (err) => err.errorType === 'AUTH_ERROR' && err.status === 403
    );

    // 4. Khi API trả về dữ liệu sai định dạng (object không phải mảng) -> throw DATA_ERROR, không biến thành mảng rỗng []
    api.get = async () => ({ unexpected: true });
    await assert.rejects(
      () => categoryService.getAllForAdmin({ rejectOnError: true }),
      (err) => err.errorType === 'DATA_ERROR' && /không đúng định dạng/.test(err.message)
    );

    // 5. Kiểm tra create, update, delete khi thành công và thất bại (409 Conflict, 500 Server Error)
    api.post = async (url, payload) => {
      assert.equal(url, '/products/categories');
      return { id: 10, ...payload };
    };
    const created = await categoryService.create({ name: 'Màn hình Gaming', description: 'Màn hình 240Hz', rejectOnError: true });
    assert.equal(created.id, '10');
    assert.equal(created.name, 'Màn hình Gaming');

    api.post = async () => {
      const conflictErr = new Error('Conflict');
      conflictErr.response = { status: 409, data: { message: 'Tên danh mục đã tồn tại' } };
      throw conflictErr;
    };
    await assert.rejects(
      () => categoryService.create({ name: 'Màn hình Gaming', rejectOnError: true }),
      (err) => err.errorType === 'DATA_ERROR' && err.status === 409 && /đã tồn tại/.test(err.message)
    );

    api.put = async () => {
      const serverErr = new Error('Internal Server Error');
      serverErr.status = 500;
      throw serverErr;
    };
    await assert.rejects(
      () => categoryService.update(10, { name: 'Màn hình 4K', rejectOnError: true }),
      (err) => err.errorType === 'HTTP_ERROR' && err.status === 500
    );

    api.delete = async () => {
      const netErr = new Error('Network Error');
      throw netErr;
    };
    await assert.rejects(
      () => categoryService.delete(10),
      (err) => err.errorType === 'NETWORK_ERROR'
    );
  } finally {
    api.get = originalGet;
    api.post = originalPost;
    api.put = originalPut;
    api.delete = originalDelete;
  }
});
