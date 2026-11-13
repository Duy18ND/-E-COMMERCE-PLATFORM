import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// ECOM-324: [FE] QA Test - UI, responsive, lỗi và tích hợp
// Nhóm chức năng: Quản lý khách hàng & Thống kê (Admin) | Sprint 3
// Liên kết: ECOM-319, ECOM-322, ECOM-323, ECOM-320, ECOM-145, ECOM-325, ECOM-326, ECOM-327
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');
const backendDir = path.resolve(__dirname, '../../backend');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');
const readBackend = (relPath) => fs.readFileSync(path.join(backendDir, relPath), 'utf8');

// Browser globals mock for runtime service tests
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

const dispatchedEvents = [];
globalThis.window = {
  location: { pathname: '/admin/users', href: 'http://localhost:5173/admin/users' },
  dispatchEvent: (evt) => {
    dispatchedEvents.push(evt);
    return true;
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.detail = options.detail;
  }
};

const { default: formatCurrency } = await import('../src/utils/formatCurrency.js');
const { default: api, unwrapApiResponse } = await import('../src/services/api.js');
const { default: userService } = await import('../src/services/userService.js');

// ============================================================================
// NHÓM 1: KIỂM THỬ GIAO DIỆN & DỮ LIỆU DASHBOARD ADMIN (ECOM-322 / ECOM-324)
// ============================================================================

test('TC-324-01: Dashboard hiển thị đầy đủ 8 thẻ thống kê KPI tổng quan, không bị undefined/null/NaN và định dạng VND chuẩn', async () => {
  const dashboardCode = readSrc('pages/admin/Dashboard.jsx');

  // Kiểm tra 8 thẻ KPI trên Dashboard
  for (const cardTitle of [
    'Tổng doanh thu',
    'Tổng đơn hàng',
    'Đơn giao thành công',
    'Đơn đang xử lý',
    'Đơn chờ xử lý',
    'Đơn đã hủy',
    'Tổng khách hàng',
    'Sản phẩm sắp hết hàng'
  ]) {
    assert.ok(dashboardCode.includes(cardTitle), `Dashboard phải hiển thị thẻ KPI: ${cardTitle}`);
  }

  // Kiểm tra hàm bảo vệ số liệu toSafeNumber chống NaN / null / undefined
  assert.match(dashboardCode, /const toSafeNumber = \(val, fallback = 0\) =>/, 'Dashboard có helper toSafeNumber chống NaN/null/undefined');
  assert.match(dashboardCode, /Number\.isFinite\(parsed\) \? parsed : fallback/, 'toSafeNumber kiểm tra Number.isFinite');

  // Kiểm tra runtime formatCurrency với các giá trị biên (0, số lớn, null, undefined, NaN, chuỗi lỗi)
  assert.match(formatCurrency(0), /^0\s*₫$/, 'formatCurrency(0) phải hiển thị 0 ₫');
  assert.match(formatCurrency(15420000), /15\.420\.000\s*₫/, 'formatCurrency định dạng chuẩn VND');
  assert.doesNotMatch(formatCurrency(NaN), /NaN/, 'formatCurrency(NaN) không được trả về NaN ₫');
  assert.doesNotMatch(formatCurrency(undefined), /NaN|undefined/, 'formatCurrency(undefined) không được trả về NaN/undefined');
  assert.doesNotMatch(formatCurrency(null), /NaN|null/, 'formatCurrency(null) không được trả về NaN/null');
  assert.doesNotMatch(formatCurrency('invalid-number'), /NaN/, 'formatCurrency("invalid-number") phải fallback về 0 ₫');
});

test('TC-324-02: Dashboard gọi API GET /admin/statistics thực tế, xử lý dữ liệu bằng 0 hợp lý và KHÔNG hiển thị số liệu giả khi API lỗi', async () => {
  const dashboardCode = readSrc('pages/admin/Dashboard.jsx');
  const orderServiceCode = readSrc('services/orderService.js');

  // Kiểm tra orderService.getOrderStats gọi API GET /admin/statistics với params startDate / endDate
  assert.match(orderServiceCode, /rawStats = await api\.get\('\/admin\/statistics',\s*\{\s*params:\s*queryParams\s*\}\);/, 'Gọi endpoint /admin/statistics kèm query params');
  assert.match(orderServiceCode, /await api\.get\('\/admin\/orders\/stats'\)/, 'Fallback gọi /admin/orders/stats khi không truyền khoảng ngày');
  assert.match(orderServiceCode, /await api\.get\('\/admin\/customers\/count'\)/, 'Lấy tổng số khách hàng thực tế qua /admin/customers/count');

  // Không còn dữ liệu giả 154 users hay mock orders trong getOrderStats
  assert.doesNotMatch(orderServiceCode, /totalUsers:\s*154/, 'Không được hardcode totalUsers: 154 khi API lỗi');

  // Xử lý dữ liệu bằng 0 an toàn và bảo vệ tất cả trường số
  assert.match(orderServiceCode, /totalRevenue:\s*Math\.max\(0,\s*toFiniteNumber\(/, 'Bảo vệ trường totalRevenue chống NaN');
  assert.match(orderServiceCode, /totalOrders:\s*Math\.max\(0,\s*toFiniteNumber\(/, 'Bảo vệ trường totalOrders chống NaN');

  // Hiển thị ErrorMessage trung thực và có nút thử lại khi API lỗi
  assert.match(dashboardCode, /<ErrorMessage message=\{error\}/, 'Dashboard hiển thị ErrorMessage khi API lỗi');
  assert.match(dashboardCode, /Thử lại ngay/, 'Dashboard có nút Thử lại ngay khi API lỗi');
});

test('TC-324-03: Biểu đồ Donut tỷ trọng trạng thái, Biểu đồ cột doanh thu theo ngày và Bảng chi tiết 9 trạng thái hoạt động chuẩn xác', () => {
  const dashboardCode = readSrc('pages/admin/Dashboard.jsx');

  // Biểu đồ SVG Donut và Biểu đồ cột doanh thu
  assert.match(dashboardCode, /Biểu đồ Phân bổ Đơn hàng theo Trạng thái/, 'Có biểu đồ Phân bổ Đơn hàng theo Trạng thái');
  assert.match(dashboardCode, /<svg[^>]*viewBox="0 0 160 160"/, 'Có SVG Donut Chart');
  assert.match(dashboardCode, /Biểu đồ Doanh thu & Cơ cấu Ghi nhận/, 'Có biểu đồ Doanh thu & Cơ cấu Ghi nhận');
  assert.match(dashboardCode, /Bảng Thống kê Đơn hàng theo Trạng thái \(ordersByStatus\)/, 'Có bảng thống kê chi tiết theo từng trạng thái');

  // Chỉ tính doanh thu từ các trạng thái hợp lệ (PAID, CONFIRMED, PROCESSING, SHIPPING, DELIVERED)
  assert.match(
    dashboardCode,
    /const REVENUE_STATUS_SET = new Set\(\[/,
    'Biểu đồ doanh thu chỉ cộng các đơn hàng hợp lệ, loại trừ đơn CANCELLED/PENDING/FAILED/REFUNDED'
  );

  // Kiểm tra trường hợp không có dữ liệu & bộ lọc ngày không hợp lệ (startDate > endDate)
  assert.match(dashboardCode, /Hệ thống không tự sinh dữ liệu mẫu/, 'Có trạng thái rỗng cho biểu đồ');
  assert.match(
    dashboardCode,
    /Ngày bắt đầu không được lớn hơn ngày kết thúc\./,
    'Kiểm tra validation ngày bắt đầu > ngày kết thúc trên bộ lọc thống kê'
  );
  assert.match(dashboardCode, /const requestIdRef = useRef\(0\)/, 'Dashboard có requestIdRef chống race condition khi đổi bộ lọc ngày liên tục');
});

// ============================================================================
// NHÓM 2: KIỂM THỬ TRANG QUẢN LÝ KHÁCH HÀNG & KHÓA/MỞ KHÓA (ECOM-319 / ECOM-324)
// ============================================================================

test('TC-324-04: Bảng khách hàng hiển thị đúng các cột, xử lý dữ liệu dài (word-break) và không crash khi thiếu trường dữ liệu', async () => {
  const adminUsersCode = readSrc('pages/admin/AdminUsers.jsx');

  // Kiểm tra đầy đủ 7 cột chuẩn của bảng quản lý khách hàng
  for (const colHeader of [
    'ID KH',
    'Họ tên',
    'Email',
    'Số điện thoại',
    'Ngày đăng ký',
    'Trạng thái tài khoản',
    'Thao tác'
  ]) {
    assert.ok(adminUsersCode.includes(colHeader), `Bảng khách hàng phải có cột: ${colHeader}`);
  }

  // Kiểm tra chống tràn chữ với tên/email dài
  assert.match(adminUsersCode, /wordBreak:\s*'break-word'/, 'Cột tên/email có wordBreak: break-word');
  assert.match(adminUsersCode, /overflowWrap:\s*'anywhere'/, 'Cột tên/email có overflowWrap: anywhere');

  // Kiểm tra runtime normalizeUser qua getCustomers với bản ghi thiếu trường, LocalDateTime array và bản ghi trùng ID
  const originalAdapter = api.defaults.adapter;
  try {
    api.defaults.adapter = async (config) => ({
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      data: {
        success: true,
        data: {
          content: [
            {
              id: 101,
              fullName: null,
              email: null,
              phone: null,
              roles: ['ROLE_ADMIN_VIEWER'], // Role chứa chuỗi ADMIN nhưng KHÔNG phải ROLE_ADMIN
              enabled: true,
              status: 'ACTIVE',
              createdAt: [2026, 3, 15, 10, 30, 45]
            },
            {
              id: 101, // Bản ghi trùng ID để kiểm tra deduplication
              fullName: 'Duplicate User',
              email: 'dup@example.com'
            },
            {
              id: 1,
              fullName: 'Super Admin',
              email: 'admin@shopmart.com',
              roles: ['ROLE_ADMIN'],
              enabled: true,
              status: 'ACTIVE',
              address: { street: '123 Lê Lợi', ward: 'Bến Nghé', district: 'Quận 1', city: 'TP.HCM' }
            }
          ],
          pageNumber: 0,
          pageSize: 8,
          totalElements: 2,
          totalPages: 1
        }
      }
    });

    const res = await userService.getCustomers({ page: 0, size: 8 });
    assert.equal(res.content.length, 2, 'Loại bỏ bản ghi trùng ID trên frontend');
    assert.equal(res.page, 0, 'Map chuẩn pageNumber -> page từ PagedResponse của Backend');
    assert.equal(res.size, 8, 'Map chuẩn pageSize -> size từ PagedResponse của Backend');

    const user101 = res.content[0];
    assert.equal(user101.fullName, 'Khách hàng', 'Fallback tên mặc định khi fullName bị null');
    assert.equal(user101.email, '', 'Email rỗng an toàn khi email bị null');
    assert.equal(user101.phone, 'Chưa cập nhật', 'Fallback SĐT mặc định khi phone bị null');
    assert.equal(user101.role, 'USER', 'ROLE_ADMIN_VIEWER không được nhận nhầm thành ADMIN');
    assert.match(user101.createdAt, /^2026-03-15T/, 'Chuyển đổi chuẩn mảng LocalDateTime [yyyy,MM,dd,HH,mm,ss] sang ISO string');

    const adminUser = res.content[1];
    assert.equal(adminUser.role, 'ADMIN', 'Nhận diện đúng ADMIN');
    assert.equal(adminUser.address, '123 Lê Lợi, Bến Nghé, Quận 1, TP.HCM', 'Format địa dạng object thành chuỗi hiển thị');
  } finally {
    api.defaults.adapter = originalAdapter;
  }
});

test('TC-324-05: Khóa và mở khóa tài khoản khách hàng (PUT /admin/customers/{id}/status), chống click đúp, bảo vệ Admin và không cập nhật giả khi API lỗi', async () => {
  const adminUsersCode = readSrc('pages/admin/AdminUsers.jsx');

  // 1. Có Modal xác nhận trước khi khóa/mở khóa
  assert.match(adminUsersCode, /Xác nhận khóa tài khoản|Xác nhận mở khóa tài khoản/, 'Có Modal xác nhận khóa/mở khóa tài khoản');

  // 2. Có khóa đồng bộ statusActionInFlightRef chống click liên tục gửi request trùng
  assert.match(adminUsersCode, /const statusActionInFlightRef = useRef\(false\)/, 'Có ref đồng bộ statusActionInFlightRef');
  assert.match(
    adminUsersCode,
    /if \(statusActionInFlightRef\.current \|\| actionLoading\) return;/,
    'Chặn click liên tục ngay lập tức bằng statusActionInFlightRef.current'
  );

  // 3. Bảo vệ không khóa tài khoản Admin hiện tại (theo cả id/userId và email) hoặc bất kỳ tài khoản ROLE_ADMIN nào
  assert.match(adminUsersCode, /const isTargetSelfOrAdmin = useCallback|const isTargetSelfOrAdmin =/, 'Có hàm kiểm tra bảo vệ tài khoản Admin');
  assert.match(
    adminUsersCode,
    /Không được phép khóa tài khoản Quản trị viên \(ADMIN\)\./,
    'Hiển thị thông báo chặn khi cố khóa tài khoản Admin'
  );

  // 4. Kiểm tra runtime gọi API PUT /admin/customers/{id}/status cho Khóa (BLOCKED) và Mở khóa (ACTIVE)
  const originalAdapter = api.defaults.adapter;
  try {
    const requests = [];
    api.defaults.adapter = async (config) => {
      requests.push({
        method: config.method.toUpperCase(),
        url: config.url,
        body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data
      });
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: {
          success: true,
          message: 'Updated',
          data: {
            id: 25,
            fullName: 'Nguyễn Văn A',
            email: 'vana@example.com',
            roles: ['ROLE_USER'],
            enabled: requests[requests.length - 1].body.status === 'ACTIVE',
            status: requests[requests.length - 1].body.status
          }
        }
      };
    };

    const lockedUser = await userService.lockUser(25);
    assert.equal(requests[0].method, 'PUT');
    assert.equal(requests[0].url, '/admin/customers/25/status');
    assert.deepEqual(requests[0].body, { status: 'BLOCKED' });
    assert.equal(lockedUser.status, 'LOCKED');
    assert.equal(lockedUser.enabled, false);

    const unlockedUser = await userService.unlockUser(25);
    assert.equal(requests[1].method, 'PUT');
    assert.equal(requests[1].url, '/admin/customers/25/status');
    assert.deepEqual(requests[1].body, { status: 'ACTIVE' });
    assert.equal(unlockedUser.status, 'ACTIVE');
    assert.equal(unlockedUser.enabled, true);

    // Khi API trả lỗi 400/500 -> ném lỗi, không tự trả trạng thái thành công giả
    api.defaults.adapter = async (config) => {
      const err = new Error('Cannot block admin account');
      err.status = 400;
      err.config = config;
      err.response = { status: 400, data: { message: 'Cannot block admin account' } };
      throw err;
    };

    await assert.rejects(
      () => userService.lockUser(1),
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Cannot block admin account/);
        return true;
      }
    );
  } finally {
    api.defaults.adapter = originalAdapter;
  }
});

// ============================================================================
// NHÓM 3: KIỂM THỬ BỘ LỌC, BẢNG SỐ LIỆU VÀ PHÂN TRANG - 10 TRƯỜNG HỢP (ECOM-323)
// ============================================================================

test('TC-324-06: Kiểm thử đầy đủ 10 trường hợp Bộ lọc, Tìm kiếm, Sắp xếp và Phân trang (ECOM-323)', async () => {
  const adminUsersCode = readSrc('pages/admin/AdminUsers.jsx');

  // Xác nhận AdminUsers truyền query params lên API và xử lý race condition + xóa dữ liệu cũ khi lỗi
  assert.match(adminUsersCode, /keyword:\s*apiKeyword/, 'AdminUsers gửi apiKeyword lên userService.getAllUsers');
  assert.match(adminUsersCode, /status:\s*statusFilter/, 'AdminUsers gửi statusFilter lên userService.getAllUsers');
  assert.match(adminUsersCode, /const requestIdRef = useRef\(0\)/, 'AdminUsers có requestIdRef chống race condition khi lọc liên tục');
  assert.match(adminUsersCode, /setUsers\(\[\]\);/, 'AdminUsers xóa kết quả cũ khi API trả về lỗi để không hiển thị dữ liệu sai lệch');
  assert.match(adminUsersCode, /const handleResetFilters = \(\) =>/, 'AdminUsers có nút Đặt lại bộ lọc');

  const originalAdapter = api.defaults.adapter;
  try {
    const capturedCalls = [];
    api.defaults.adapter = async (config) => {
      capturedCalls.push({ url: config.url, params: { ...(config.params || {}) } });
      if (config.url === '/admin/customers') {
        const kw = (config.params?.keyword || '').toLowerCase();
        const st = config.params?.status;
        const allCustomers = [
          { id: 10, fullName: 'Trần Thị Bích', email: 'bich@gmail.com', phone: '0901112222', roles: ['ROLE_USER'], status: 'ACTIVE', enabled: true },
          { id: 11, fullName: 'Lê Hoàng Nam', email: 'nam@gmail.com', phone: '0903334444', roles: ['ROLE_USER'], status: 'BLOCKED', enabled: false }
        ];
        const filtered = allCustomers.filter((c) => {
          const matchKw = !kw || c.fullName.toLowerCase().includes(kw) || c.email.toLowerCase().includes(kw);
          const matchSt = !st || c.status === st;
          return matchKw && matchSt;
        });
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: {
            success: true,
            data: { content: filtered, pageNumber: 0, pageSize: 1000, totalElements: filtered.length, totalPages: 1 }
          }
        };
      }
      if (config.url === '/admin/users') {
        return {
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          data: {
            success: true,
            data: [
              { id: 1, fullName: 'Admin Root', email: 'admin@shopmart.com', roles: ['ROLE_ADMIN'], status: 'ACTIVE', enabled: true },
              // Trả kèm ROLE_USER không khớp bộ lọc để đảm bảo getAllUsers KHÔNG ghi đè kết quả đã lọc của /admin/customers
              { id: 10, fullName: 'Trần Thị Bích', email: 'bich@gmail.com', roles: ['ROLE_USER'], status: 'ACTIVE', enabled: true },
              { id: 11, fullName: 'Lê Hoàng Nam', email: 'nam@gmail.com', roles: ['ROLE_USER'], status: 'BLOCKED', enabled: false }
            ]
          }
        };
      }
      throw new Error(`Unexpected URL: ${config.url}`);
    };

    // Case 1: Không nhập điều kiện lọc
    capturedCalls.length = 0;
    const case1 = await userService.getAllUsers({ page: 0, size: 1000 });
    assert.equal(case1.length, 3, 'Case 1 (Không lọc): trả về đủ 2 customer + 1 admin');
    assert.equal(capturedCalls[0].params.keyword, undefined, 'Case 1: không gửi param keyword rỗng');
    assert.equal(capturedCalls[0].params.status, undefined, 'Case 1: không gửi param status khi ALL');

    // Case 2: Nhập từ khóa hợp lệ ("bich")
    capturedCalls.length = 0;
    const case2 = await userService.getAllUsers({ keyword: 'bich' });
    assert.equal(capturedCalls[0].params.keyword, 'bich', 'Case 2: gửi đúng query param keyword=bich');
    assert.equal(case2.length, 1, 'Case 2: chỉ trả về đúng khách hàng khớp từ khóa, không bị /admin/users ghi đè');
    assert.equal(case2[0].email, 'bich@gmail.com');

    // Case 3: Nhập từ khóa không có kết quả ("khong_ton_tai_xyz")
    const case3 = await userService.getAllUsers({ keyword: 'khong_ton_tai_xyz' });
    assert.equal(case3.length, 0, 'Case 3 (Từ khóa không khớp): trả về mảng rỗng');

    // Case 4: Nhập chuỗi chỉ có khoảng trắng ("   ") hoặc khoảng trắng đầu cuối ("  bich  ")
    capturedCalls.length = 0;
    await userService.getAllUsers({ keyword: '     ' });
    assert.equal(capturedCalls[0].params.keyword, undefined, 'Case 4a (Chỉ khoảng trắng): tự động trim và không gửi keyword rỗng');
    capturedCalls.length = 0;
    const case4b = await userService.getAllUsers({ keyword: '   bich   ' });
    assert.equal(capturedCalls[0].params.keyword, 'bich', 'Case 4b (Khoảng trắng 2 đầu): trim trước khi gửi lên API');
    assert.equal(case4b.length, 1);

    // Case 5: Nhập chuỗi có ký tự đặc biệt ("' OR 1=1 -- <script>")
    capturedCalls.length = 0;
    const specialKw = "' OR 1=1 -- <script>";
    const case5 = await userService.getAllUsers({ keyword: specialKw });
    assert.equal(capturedCalls[0].params.keyword, specialKw, 'Case 5 (Ký tự đặc biệt): truyền nguyên chuỗi an toàn qua query param, không crash');
    assert.equal(case5.length, 0);

    // Case 6 & 7: Lọc theo trạng thái LOCKED -> map chuẩn sang status=BLOCKED trên Backend API
    capturedCalls.length = 0;
    const case6 = await userService.getAllUsers({ status: 'LOCKED' });
    assert.equal(capturedCalls[0].params.status, 'BLOCKED', 'Case 6: map chuẩn LOCKED trên UI sang BLOCKED cho Backend API');
    assert.equal(case6.length, 1, 'Case 6: chỉ trả về tài khoản bị khóa, không lẫn tài khoản ACTIVE từ /admin/users');
    assert.equal(case6[0].status, 'LOCKED');

    // Case 8 & 9: Dữ liệu rỗng từ Backend
    api.defaults.adapter = async (config) => ({
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
      data: { success: true, data: { content: [], pageNumber: 0, pageSize: 8, totalElements: 0, totalPages: 0 } }
    });
    const case9 = await userService.getAllUsers({});
    assert.deepEqual(case9, [], 'Case 9 (Dữ liệu rỗng): trả về mảng rỗng an toàn');
    assert.equal(case9.length, 0);

    // Case 10: API /admin/customers trả về lỗi 500 -> phải ném lỗi ngay cả khi /admin/users thành công
    api.defaults.adapter = async (config) => {
      if (config.url === '/admin/customers') {
        const err = new Error('Customer query failed');
        err.status = 500;
        err.config = config;
        err.response = { status: 500, data: { message: 'Customer query failed' } };
        throw err;
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: { success: true, data: [] }
      };
    };
    await assert.rejects(
      () => userService.getAllUsers({ keyword: 'test' }),
      (err) => {
        assert.equal(err.status, 500);
        return true;
      },
      'Case 10 (API lỗi): getAllUsers không được nuốt lỗi của /admin/customers'
    );
  } finally {
    api.defaults.adapter = originalAdapter;
  }
});

// ============================================================================
// NHÓM 4: KIỂM THỬ RESPONSIVE TRÊN 5 KÍCH THƯỚC MÀN HÌNH (ECOM-324 MỤC 6)
// ============================================================================

test('TC-324-07: Responsive CSS đáp ứng đầy đủ 5 kích thước màn hình (1920x1080, 1366x768, 768x1024, 390x844, 360x800)', () => {
  const responsiveCss = readSrc('styles/responsive.css');
  const globalCss = readSrc('styles/global.css');
  const dashboardCode = readSrc('pages/admin/Dashboard.jsx');
  const adminUsersCode = readSrc('pages/admin/AdminUsers.jsx');

  // 1. Desktop (1920x1080) & Laptop (1366x768): Sidebar cố định 236px/260px, main content flex: 1, min-width: 0
  assert.match(globalCss, /\.admin-sidebar\s*\{[\s\S]*?width:\s*(?:236px|260px)/, 'Desktop/Laptop: Sidebar rộng tối ưu');
  assert.match(responsiveCss, /@media \(max-width: 1620px\)[\s\S]*?\.admin-nav-prefix\s*\{\s*display:\s*none;/, 'Laptop 1366x768: ẩn chữ Quản lý trên topbar để không tràn');

  // 2. Tablet (768x1024 - @media max-width: 1024px & max-width: 991px):
  // - Sidebar thu gọn thành icon rail 72px (1024px) hoặc Drawer trượt (<= 768px)
  // - Thẻ KPI Dashboard & AdminUsers tự điều chỉnh về 2 cột
  // - Bộ lọc AdminUsers chuyển ô Search lên toàn chiều ngang dòng 1 (grid-column: 1 / -1)
  assert.match(responsiveCss, /@media \(max-width: 1024px\)[\s\S]*?\.admin-sidebar\s*\{\s*width:\s*72px/, 'Tablet 1024px: Sidebar thu gọn thành rail 72px');
  assert.match(
    responsiveCss,
    /@media \(max-width: 991px\)[\s\S]*?\.admin-dashboard-kpi-grid,\s*\.admin-users-kpi-grid\s*\{\s*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)\s*!important;/,
    'Tablet 768x1024: Thẻ thống kê tự điều chỉnh về 2 cột'
  );
  assert.match(
    responsiveCss,
    /@media \(max-width: 991px\)[\s\S]*?\.admin-users-search-col\s*\{\s*grid-column:\s*1\s*\/\s*-1\s*!important;/,
    'Tablet 768x1024: Ô tìm kiếm khách hàng chiếm trọn dòng đầu, không chồng lấn'
  );

  // 3. Mobile (390x844) & Mobile nhỏ (360x800 - @media max-width: 640px & 480px):
  // - Thẻ thống kê, biểu đồ và bộ lọc chuyển về 1 cột dọc (1fr)
  // - Không dùng minmax(340px, 1fr) cố định gây tràn màn hình 360px
  assert.match(
    responsiveCss,
    /@media \(max-width: 640px\)[\s\S]*?\.admin-users-filter-bar,\s*\.admin-dashboard-kpi-grid,\s*\.admin-users-kpi-grid,\s*\.admin-dashboard-charts-grid,\s*\.admin-dashboard-bottom-grid\s*\{\s*grid-template-columns:\s*1fr\s*!important;/,
    'Mobile 390x844 & 360x800: Tất cả KPI cards, biểu đồ và bộ lọc chuyển về 1 cột dọc'
  );
  assert.doesNotMatch(
    dashboardCode,
    /minmax\(340px,\s*1fr\)/,
    'Dashboard không dùng minmax(340px, 1fr) trần gây tràn ngang trên màn hình 360x800'
  );
  assert.match(dashboardCode, /className="admin-dashboard-kpi-grid"/, 'Dashboard gắn class responsive cho lưới KPI');
  assert.match(dashboardCode, /className="admin-dashboard-charts-grid"/, 'Dashboard gắn class responsive cho lưới Biểu đồ');
  assert.match(adminUsersCode, /admin-users-filter-bar/, 'AdminUsers gắn class responsive cho thanh bộ lọc');
  assert.match(adminUsersCode, /admin-users-search-col/, 'AdminUsers gắn class responsive cho cột tìm kiếm');
});

// ============================================================================
// NHÓM 5: KIỂM THỬ TÍCH HỢP API HTTP STATUS & PHÂN QUYỀN FRONTEND (MỤC 7 & 8)
// ============================================================================

test('TC-324-08: Kiểm thử tích hợp HTTP 200/400/401/403/404/500, Timeout và Network Error trong api.js', async () => {
  const originalAdapter = api.defaults.adapter;
  try {
    // HTTP 200 + unwrapApiResponse
    const unwrapped = unwrapApiResponse({ data: { success: true, data: { totalCustomers: 42 } } });
    assert.deepEqual(unwrapped, { totalCustomers: 42 });

    // HTTP 400 Validation Error (fieldErrors)
    api.defaults.adapter = async (config) => {
      const err = new Error('Validation failed');
      err.status = 400;
      err.config = config;
      err.response = {
        status: 400,
        data: {
          message: 'Validation failed',
          errors: { status: 'Trạng thái chỉ chấp nhận ACTIVE hoặc BLOCKED' }
        }
      };
      throw err;
    };
    await assert.rejects(
      () => api.put('/admin/customers/10/status', { status: 'INVALID' }),
      (err) => {
        assert.equal(err.status, 400);
        assert.match(err.message, /Trạng thái chỉ chấp nhận ACTIVE hoặc BLOCKED/);
        return true;
      }
    );

    // HTTP 401 Unauthorized -> xóa auth và phát sự kiện auth:unauthorized
    storageMap.set('token', 'expired-jwt-token');
    dispatchedEvents.length = 0;
    api.defaults.adapter = async (config) => {
      const err = new Error('Token expired');
      err.status = 401;
      err.config = config;
      err.response = { status: 401, data: { message: 'Token expired' } };
      throw err;
    };
    await assert.rejects(
      () => api.get('/admin/customers'),
      (err) => {
        assert.equal(err.status, 401);
        return true;
      }
    );
    assert.equal(storageMap.get('token'), undefined, 'HTTP 401 phải xóa token hết hạn khỏi localStorage');
    assert.ok(
      dispatchedEvents.some((e) => e.type === 'auth:unauthorized'),
      'HTTP 401 phải dispatch sự kiện auth:unauthorized để AuthContext điều hướng về /login'
    );

    // HTTP 403 Forbidden
    api.defaults.adapter = async (config) => {
      const err = new Error('Forbidden');
      err.status = 403;
      err.config = config;
      err.response = { status: 403, data: {} };
      throw err;
    };
    await assert.rejects(
      () => api.get('/admin/statistics'),
      (err) => {
        assert.equal(err.status, 403);
        assert.match(err.message, /không có quyền truy cập/i);
        return true;
      }
    );

    // HTTP 404 Not Found
    api.defaults.adapter = async (config) => {
      const err = new Error('Not Found');
      err.status = 404;
      err.config = config;
      err.response = { status: 404, data: {} };
      throw err;
    };
    await assert.rejects(
      () => api.get('/admin/customers/999999'),
      (err) => {
        assert.equal(err.status, 404);
        assert.match(err.message, /Không tìm thấy dữ liệu/i);
        return true;
      }
    );

    // HTTP 500 Server Error
    api.defaults.adapter = async (config) => {
      const err = new Error('Internal Server Error');
      err.status = 500;
      err.config = config;
      err.response = { status: 500, data: {} };
      throw err;
    };
    await assert.rejects(
      () => api.get('/admin/statistics'),
      (err) => {
        assert.equal(err.status, 500);
        assert.match(err.message, /sự cố nội bộ/i);
        return true;
      }
    );

    // Network Timeout (ECONNABORTED)
    api.defaults.adapter = async (config) => {
      const timeoutErr = new Error('timeout of 15000ms exceeded');
      timeoutErr.code = 'ECONNABORTED';
      timeoutErr.config = config;
      throw timeoutErr;
    };
    await assert.rejects(
      () => api.get('/admin/statistics'),
      (err) => {
        assert.equal(err.status, 408);
        assert.match(err.message, /quá thời gian phản hồi/i);
        return true;
      }
    );
  } finally {
    api.defaults.adapter = originalAdapter;
  }
});

test('TC-324-09: Kiểm thử cơ chế bảo vệ Route Admin (AdminRoute, ProtectedRoute, AppRoutes) và đối chiếu контракт Backend (ECOM-145/325/326)', () => {
  const appRoutesCode = readSrc('routes/AppRoutes.jsx');
  const adminRouteCode = readSrc('routes/AdminRoute.jsx');
  const protectedRouteCode = readSrc('routes/ProtectedRoute.jsx');
  const adminSidebarCode = readSrc('components/admin/AdminSidebar.jsx');
  const adminHeaderCode = readSrc('components/admin/AdminHeader.jsx');

  // 1. Route /admin và /admin/users phải nằm trong <Route element={<AdminRoute />}>
  assert.match(appRoutesCode, /<Route element=\{<AdminRoute \/>\}>[\s\S]*?path="\/admin"[\s\S]*?path="\/admin\/users"/, 'Cả /admin và /admin/users đều được bảo vệ bởi AdminRoute');
  assert.match(adminRouteCode, /if \(!isAuthenticated\)\s*\{\s*return <Navigate to="\/login"/, 'Guest chưa đăng nhập bị chuyển hướng về /login');
  assert.match(adminRouteCode, /if \(!isAdmin\)[\s\S]*?<Navigate[\s\S]*?to="\/"/, 'User thường (ROLE_USER) truy cập trang Admin bị chuyển hướng về trang chủ /');
  assert.match(protectedRouteCode, /to=\{isAdmin \? '\/admin' : '\/'\}/, 'Tách biệt rạch ròi luồng Admin và Customer');

  // 2. Menu điều hướng AdminSidebar và AdminHeader có link tới /admin/users
  assert.match(adminSidebarCode, /path:\s*'\/admin\/users'/, 'AdminSidebar có mục Quản lý Tài khoản (/admin/users)');
  assert.match(adminHeaderCode, /to="\/admin\/users"/, 'AdminHeader có link điều hướng /admin/users');

  // 3. Đối chiếu trực tiếp với Backend Controllers (ECOM-145, ECOM-325, ECOM-326)
  const adminCustomerController = readBackend('auth-service/src/main/java/com/ecommerce/auth/controller/AdminCustomerController.java');
  const adminStatsController = readBackend('order-service/src/main/java/com/ecommerce/order/controller/AdminStatisticsController.java');

  assert.match(adminCustomerController, /@RequestMapping\("\/api\/v1\/admin\/customers"\)/, 'Backend có endpoint /api/v1/admin/customers');
  assert.match(adminCustomerController, /requireAdminRole\(roles\);/, 'Backend bảo vệ API khách hàng bằng requireAdminRole');
  assert.match(adminCustomerController, /@PutMapping\("\/\{id\}\/status"\)/, 'Backend hỗ trợ PUT /api/v1/admin/customers/{id}/status');
  assert.match(adminStatsController, /@RequestMapping\("\/api\/v1\/admin\/statistics"\)/, 'Backend có endpoint /api/v1/admin/statistics');
  assert.match(adminStatsController, /requireAdminRole\(roles\);/, 'Backend kiểm tra quyền ROLE_ADMIN trên API thống kê');
});
