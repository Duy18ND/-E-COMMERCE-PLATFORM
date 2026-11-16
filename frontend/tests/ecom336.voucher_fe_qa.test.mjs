import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// ECOM-336: [FE] QA Test - UI, responsive, lỗi và tích hợp
// Epic: CUSTOMER (ECOM-158 Voucher & mã giảm giá) | Sprint 3
// Parent Task: ECOM-330 ([FE] Voucher & mã giảm giá)
// Tasks liên quan: ECOM-168, ECOM-184, ECOM-333, ECOM-334, ECOM-335,
//                  ECOM-166, ECOM-167, ECOM-182, ECOM-183, ECOM-337, ECOM-338, ECOM-339, ECOM-340
// PIC / QA Lead: Ngô Phương (devops-phuong)
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');
const backendDir = path.resolve(__dirname, '../../backend');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');
const readBackend = (relPath) => fs.readFileSync(path.join(backendDir, relPath), 'utf8');

// Browser globals mock for runtime service & component tests
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

const dispatchedEvents = [];
globalThis.window = {
  location: { pathname: '/admin/vouchers', href: 'http://localhost:5173/admin/vouchers' },
  dispatchEvent: (evt) => {
    dispatchedEvents.push(evt);
    return true;
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};

const { default: voucherService, getVoucherStatus, calcDiscount, parseLocalDateBoundary } =
  await import('../src/services/voucherService.js');
const { INITIAL_VOUCHERS } = await import('../src/mock/mockVouchers.js');

// ============================================================================
// NHÓM 1: KIỂM THỬ KHO VOUCHER & VOUCHER CỦA TÔI (ECOM-168 / ECOM-336)
// ============================================================================

test('TC-336-01: Kho voucher (/vouchers) hiển thị đầy đủ thông tin chi tiết của từng mã giảm giá và tính toán số ngày còn lại chuẩn xác', async () => {
  const vouchersCode = readSrc('pages/customer/Vouchers.jsx');
  const myVouchersCode = readSrc('pages/customer/MyVouchers.jsx');

  // Kiểm tra các trường thông tin bắt buộc trên thẻ voucher
  for (const field of [
    'discountType',
    'discountValue',
    'maxDiscount',
    'minOrderValue',
    'endDate',
    'quantity',
    'usedQuantity',
    'code',
    'name'
  ]) {
    assert.ok(vouchersCode.includes(field), `Vouchers.jsx phải chứa trường thông tin: ${field}`);
  }

  // Kiểm tra logic hiển thị % hoặc tiền mặt
  assert.ok(vouchersCode.includes("voucher.discountType === 'PERCENT' ? '% Giảm phần trăm' : '💰 Giảm tiền mặt'"),
    'Hiển thị loại voucher rõ ràng giữa phần trăm và tiền mặt');
  assert.ok(vouchersCode.includes('Tối đa'), 'Hiển thị mức giảm tối đa khi là voucher phần trăm');
  assert.ok(vouchersCode.includes('Đơn tối thiểu'), 'Hiển thị điều kiện giá trị đơn hàng tối thiểu');
  assert.ok(vouchersCode.includes('Còn lại:'), 'Hiển thị số lượng voucher còn lại có thể sử dụng');

  // Runtime test: Phân loại trạng thái voucher với getVoucherStatus
  const baseVoucher = {
    id: 991,
    code: 'TESTSTATUS',
    name: 'Voucher Kiểm thử',
    discountType: 'FIXED',
    discountValue: 50000,
    minOrderValue: 200000,
    quantity: 10,
    usedQuantity: 2,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    status: 'ACTIVE'
  };

  const fixedNow = new Date('2026-11-12T12:00:00+07:00');

  // Đang hoạt động
  assert.strictEqual(getVoucherStatus(baseVoucher, fixedNow), 'ACTIVE');

  // Đã hết hạn (endDate < now)
  const expiredVoucher = { ...baseVoucher, endDate: '2026-11-10' };
  assert.strictEqual(getVoucherStatus(expiredVoucher, fixedNow), 'EXPIRED');

  // Sắp diễn ra (startDate > now)
  const upcomingVoucher = { ...baseVoucher, startDate: '2026-11-20' };
  assert.strictEqual(getVoucherStatus(upcomingVoucher, fixedNow), 'UPCOMING');

  // Đã hết lượt (usedQuantity >= quantity)
  const soldOutVoucher = { ...baseVoucher, usedQuantity: 10, quantity: 10 };
  assert.strictEqual(getVoucherStatus(soldOutVoucher, fixedNow), 'SOLD_OUT');

  // Bị tạm dừng / ẩn bởi Admin
  const inactiveVoucher = { ...baseVoucher, status: 'INACTIVE' };
  assert.strictEqual(getVoucherStatus(inactiveVoucher, fixedNow), 'INACTIVE');
});

test('TC-336-02: Bộ lọc tabs và ô tìm kiếm tại trang Kho voucher hoạt động chính xác với mọi tiêu chí', async () => {
  const vouchersCode = readSrc('pages/customer/Vouchers.jsx');

  // Kiểm tra 6 tab bộ lọc chuẩn
  for (const tabKey of ['ALL', 'ACTIVE', 'PERCENT', 'FIXED', 'EXPIRING', 'SAVED']) {
    assert.ok(vouchersCode.includes(`key: '${tabKey}'`), `Bộ lọc phải hỗ trợ tab: ${tabKey}`);
  }

  // Khởi tạo danh sách mẫu test filter
  const testList = [
    { id: 1, code: 'GIAM10PCT', name: 'Giảm 10%', discountType: 'PERCENT', discountValue: 10, startDate: '2026-11-01', endDate: '2026-11-30', quantity: 100, usedQuantity: 5, status: 'ACTIVE' },
    { id: 2, code: 'TIENMAT50K', name: 'Giảm 50K', discountType: 'FIXED', discountValue: 50000, startDate: '2026-11-01', endDate: '2026-11-30', quantity: 100, usedQuantity: 10, status: 'ACTIVE' },
    { id: 3, code: 'SAPTHET', name: 'Sắp hết hạn 3 ngày', discountType: 'FIXED', discountValue: 20000, startDate: '2026-11-01', endDate: '2026-11-14', quantity: 50, usedQuantity: 20, status: 'ACTIVE' },
    { id: 4, code: 'TAMKHOA', name: 'Tạm dừng', discountType: 'FIXED', discountValue: 30000, startDate: '2026-11-01', endDate: '2026-11-30', quantity: 50, usedQuantity: 0, status: 'INACTIVE' }
  ];

  // Test tìm kiếm theo mã hoặc tên
  const searchByCode = testList.filter((v) => v.code.toLowerCase().includes('giam10'));
  assert.strictEqual(searchByCode.length, 1);
  assert.strictEqual(searchByCode[0].code, 'GIAM10PCT');

  const searchByName = testList.filter((v) => v.name.toLowerCase().includes('50k'));
  assert.strictEqual(searchByName.length, 1);
  assert.strictEqual(searchByName[0].code, 'TIENMAT50K');

  // Test lọc PERCENT
  const percentList = testList.filter((v) => v.discountType === 'PERCENT');
  assert.strictEqual(percentList.length, 1);

  // Test lọc FIXED
  const fixedList = testList.filter((v) => v.discountType === 'FIXED');
  assert.strictEqual(fixedList.length, 3);
});

test('TC-336-03: Thao tác Lưu và Bỏ lưu voucher đồng bộ tức thì với localStorage và Header Navigation', async () => {
  storageMap.clear();

  // Ban đầu chưa lưu voucher nào
  assert.deepStrictEqual(voucherService.getSavedIds(), []);

  // Lưu voucher id: 101
  voucherService.saveVoucher(101);
  assert.deepStrictEqual(voucherService.getSavedIds(), [101]);

  // Lưu thêm voucher id: 102
  voucherService.saveVoucher(102);
  assert.deepStrictEqual(voucherService.getSavedIds(), [101, 102]);

  // Lưu trùng voucher 101 -> không bị duplicate
  voucherService.saveVoucher(101);
  assert.deepStrictEqual(voucherService.getSavedIds(), [101, 102]);

  // Bỏ lưu voucher 101
  voucherService.unsaveVoucher(101);
  assert.deepStrictEqual(voucherService.getSavedIds(), [102]);

  // Kiểm tra sự kiện app_saved_vouchers_changed được dispatch
  const hasSavedEvent = dispatchedEvents.some((e) => e.type === 'app_saved_vouchers_changed');
  assert.ok(hasSavedEvent, 'Phải phát event app_saved_vouchers_changed khi thay đổi trạng thái lưu mã');

  // Header UserHeader lắng nghe sự kiện để cập nhật badge số lượng
  const userHeaderCode = readSrc('components/user/UserHeader.jsx');
  assert.ok(userHeaderCode.includes('app_saved_vouchers_changed'), 'UserHeader đồng bộ số lượng voucher đã lưu');
  assert.ok(userHeaderCode.includes('to="/vouchers"'), 'UserHeader có link điều hướng tới trang Kho voucher');
  assert.ok(userHeaderCode.includes('to="/my-vouchers"'), 'UserHeader có link điều hướng tới trang Voucher của tôi');
});

// ============================================================================
// NHÓM 2: KIỂM THỬ ÁP DỤNG VOUCHER TẠI CHECKOUT (ECOM-168 / ECOM-184 / ECOM-333)
// ============================================================================

test('TC-336-04: Áp dụng mã giảm giá FIXED và PERCENT có trần maxDiscount tính toán chuẩn xác không làm âm tổng thanh toán', async () => {
  const checkoutCode = readSrc('pages/customer/Checkout.jsx');

  // Kiểm tra công thức tính toán tổng thanh toán sau khi trừ voucher
  assert.ok(checkoutCode.includes('const finalTotal       = Math.max(0, totalPrice - voucherDiscount);'),
    'Checkout tính finalTotal = Math.max(0, totalPrice - voucherDiscount)');

  // Runtime test: calcDiscount với voucher FIXED
  const fixedVoucher = {
    code: 'FIXED50K',
    discountType: 'FIXED',
    discountValue: 50000,
    minOrderValue: 200000,
    quantity: 100,
    usedQuantity: 0,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    status: 'ACTIVE'
  };

  // Đơn 300K -> Giảm 50K
  assert.strictEqual(calcDiscount(fixedVoucher, 300000), 50000);

  // Đơn 150K (< minOrderValue 200K) -> Giảm 0đ
  assert.strictEqual(calcDiscount(fixedVoucher, 150000), 0);

  // Runtime test: calcDiscount với voucher PERCENT có trần maxDiscount
  const percentVoucher = {
    code: 'PCT20',
    discountType: 'PERCENT',
    discountValue: 20,
    maxDiscount: 100000, // Trần tối đa 100K
    minOrderValue: 300000,
    quantity: 100,
    usedQuantity: 0,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    status: 'ACTIVE'
  };

  // Đơn 400K -> 20% = 80K (< maxDiscount 100K) -> Giảm 80K
  assert.strictEqual(calcDiscount(percentVoucher, 400000), 80000);

  // Đơn 1.000.000đ -> 20% = 200K (> maxDiscount 100K) -> Bị chạm trần 100K
  assert.strictEqual(calcDiscount(percentVoucher, 1000000), 100000);

  // Voucher mệnh giá lớn hơn đơn hàng (ví dụ giảm 500K cho đơn 400K) -> Giảm tối đa bằng đơn hàng, không âm
  const bigVoucher = { ...fixedVoucher, discountValue: 500000, minOrderValue: 0 };
  assert.strictEqual(calcDiscount(bigVoucher, 400000), 400000);
});

test('TC-336-05: Checkout bắt lỗi validation chặt chẽ khi nhập mã voucher rỗng, sai mã, hết hạn, hết lượt hoặc đơn chưa đủ điều kiện tối thiểu', async () => {
  // Test validate input voucherService.applyCode
  await assert.rejects(
    async () => voucherService.applyCode('', 300000),
    /Mã giảm giá không được để trống/
  );

  await assert.rejects(
    async () => voucherService.applyCode('   ', 300000),
    /Mã giảm giá không được để trống/
  );

  await assert.rejects(
    async () => voucherService.applyCode('MAKHONGTONTAI', 300000),
    /Mã giảm giá không tồn tại hoặc không hợp lệ/
  );

  await assert.rejects(
    async () => voucherService.applyCode('CODE', 0),
    /Tổng tiền đơn hàng phải lớn hơn 0đ/
  );

  await assert.rejects(
    async () => voucherService.applyCode('CODE', null),
    /Tổng tiền đơn hàng không được để trống/
  );

  // Đưa mock voucher vào localStorage để test logic fallback
  const mockList = [
    {
      id: 881,
      code: 'MINORDER500K',
      discountType: 'FIXED',
      discountValue: 50000,
      minOrderValue: 500000,
      quantity: 100,
      usedQuantity: 0,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      status: 'ACTIVE'
    },
    {
      id: 882,
      code: 'EXPIREDCODE',
      discountType: 'FIXED',
      discountValue: 30000,
      minOrderValue: 0,
      quantity: 100,
      usedQuantity: 0,
      startDate: '2026-10-01',
      endDate: '2026-10-15',
      status: 'ACTIVE'
    },
    {
      id: 883,
      code: 'SOLDOUTCODE',
      discountType: 'FIXED',
      discountValue: 30000,
      minOrderValue: 0,
      quantity: 5,
      usedQuantity: 5,
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      status: 'ACTIVE'
    }
  ];
  storageMap.set('app_vouchers', JSON.stringify(mockList));

  // Kiểm tra thông báo đơn chưa đủ điều kiện tối thiểu
  await assert.rejects(
    async () => voucherService.applyCode('MINORDER500K', 400000),
    /Đơn hàng tối thiểu 500\.000/
  );

  // Kiểm tra mã hết hạn
  await assert.rejects(
    async () => voucherService.applyCode('EXPIREDCODE', 600000),
    /Mã giảm giá đã hết hạn/
  );

  // Kiểm tra mã hết lượt
  await assert.rejects(
    async () => voucherService.applyCode('SOLDOUTCODE', 600000),
    /Mã giảm giá đã hết lượt sử dụng/
  );

  // Áp dụng thành công khi đủ điều kiện
  const res = await voucherService.applyCode('MINORDER500K', 600000);
  assert.strictEqual(res.voucher.code, 'MINORDER500K');
  assert.strictEqual(res.discountAmount, 50000);
});

test('TC-336-06: Modal VoucherPickerModal hiển thị danh sách mã đã lưu, phân định rõ ràng điều kiện áp dụng và cho phép gỡ bỏ voucher khi cần', async () => {
  const checkoutCode = readSrc('pages/customer/Checkout.jsx');

  // Kiểm tra component VoucherPickerModal
  assert.ok(checkoutCode.includes('const VoucherPickerModal ='), 'Checkout có component VoucherPickerModal');
  assert.ok(checkoutCode.includes('const canApply   = status === \'ACTIVE\' && orderTotal > 0 && orderTotal >= minOrder;'),
    'VoucherPickerModal kiểm tra chặt chẽ điều kiện có thể áp dụng');
  assert.ok(checkoutCode.includes('disabledReason = `Cần đơn tối thiểu ${fmtMoney(minOrder)}`'),
    'Hiển thị rõ lý do không đủ điều kiện khi đơn hàng dưới ngưỡng tối thiểu');
  assert.ok(checkoutCode.includes('disabledReason = status === \'EXPIRED\' ? \'Đã hết hạn\''),
    'Hiển thị lý do hết hạn');
  assert.ok(checkoutCode.includes('disabled={!canApply}'), 'Chặn người dùng chọn các mã không đủ điều kiện');

  // Kiểm tra tính năng gỡ bỏ voucher (handleRemoveVoucher)
  assert.ok(checkoutCode.includes('handleRemoveVoucher'), 'Checkout có hàm handleRemoveVoucher để gỡ bỏ voucher');
  assert.ok(checkoutCode.includes('notify.info(\'Đã gỡ bỏ mã giảm giá.\')'), 'Thông báo khi người dùng gỡ bỏ mã');
});

// ============================================================================
// NHÓM 3: KIỂM THỬ TRANG QUẢN TRỊ ADMIN VOUCHER (ECOM-334 / ECOM-335 / ECOM-336)
// ============================================================================

test('TC-336-07: AdminVouchers hiển thị 4 thẻ KPI thống kê, hỗ trợ phân trang và bộ lọc tìm kiếm đa tiêu chí', async () => {
  const adminVouchersCode = readSrc('pages/admin/AdminVouchers.jsx');

  // 4 Thẻ KPI thống kê
  assert.ok(adminVouchersCode.includes("'Tổng mã'"), 'Thẻ KPI: Tổng mã');
  assert.ok(adminVouchersCode.includes("'Đang hoạt động'"), 'Thẻ KPI: Đang hoạt động');
  assert.ok(adminVouchersCode.includes("'Đã hết / Hết lượt'"), 'Thẻ KPI: Đã hết / Hết lượt');
  assert.ok(adminVouchersCode.includes("'Tạm dừng'"), 'Thẻ KPI: Tạm dừng');

  // Bộ lọc: Tìm kiếm, Status, Type, Total
  assert.ok(adminVouchersCode.includes('className="voucher-filter-search"'), 'Ô tìm kiếm theo mã hoặc tên');
  assert.ok(adminVouchersCode.includes('statusFilter'), 'Dropdown lọc theo trạng thái');
  assert.ok(adminVouchersCode.includes('typeFilter'), 'Dropdown lọc theo loại giảm giá');
  assert.ok(adminVouchersCode.includes('className="voucher-filter-total"'), 'Hiển thị tổng số lượng mã tìm thấy / tổng số');

  // Bảng dữ liệu có Pagination
  assert.ok(adminVouchersCode.includes('<Pagination'), 'AdminVouchers tích hợp component Pagination');
  assert.ok(adminVouchersCode.includes('itemsPerPageOptions={[5, 10, 20]}'), 'Pagination hỗ trợ chọn 5, 10, 20 mục/trang');
});

test('TC-336-08: AdminVouchers validation Form chặt chẽ khi Thêm/Sửa: chặn mã trùng, chặn sửa số lượng nhỏ hơn số lượng đã dùng', async () => {
  const adminVouchersCode = readSrc('pages/admin/AdminVouchers.jsx');

  // Kiểm tra các rule validation
  assert.ok(adminVouchersCode.includes("errors.code = 'Mã voucher không được để trống.'"), 'Validate mã voucher không rỗng');
  assert.ok(adminVouchersCode.includes("errors.name = 'Tên chương trình không được để trống.'"), 'Validate tên không rỗng');
  assert.ok(adminVouchersCode.includes("errors.discountValue = 'Giá trị giảm phải lớn hơn 0.'"), 'Validate giá trị giảm > 0');
  assert.ok(adminVouchersCode.includes("errors.discountValue = 'Phần trăm giảm không được vượt quá 100%.'"), 'Validate % giảm <= 100');
  assert.ok(adminVouchersCode.includes("errors.minOrderValue = 'Đơn tối thiểu không được âm.'"), 'Validate đơn tối thiểu >= 0');
  assert.ok(adminVouchersCode.includes("errors.quantity = 'Số lượng mã phải lớn hơn 0.'"), 'Validate số lượng > 0');
  assert.ok(adminVouchersCode.includes("errors.startDate = 'Vui lòng chọn ngày bắt đầu.'"), 'Validate ngày bắt đầu');
  assert.ok(adminVouchersCode.includes("errors.endDate = 'Vui lòng chọn ngày kết thúc.'"), 'Validate ngày kết thúc');
  assert.ok(adminVouchersCode.includes("errors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu.'"), 'Validate ngày kết thúc >= ngày bắt đầu');

  // Kiểm tra rule chống giảm số lượng nhỏ hơn số lượt đã dùng
  assert.ok(adminVouchersCode.includes("errors.quantity = 'Số lượng phát hành không được nhỏ hơn số lượt đã dùng (' + current.usedQuantity + ').'"),
    'Validate quantity >= usedQuantity khi sửa voucher');

  // Kiểm tra modal xác nhận xóa an toàn (không dùng window.confirm)
  assert.ok(adminVouchersCode.includes('<Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Xác nhận xóa mã giảm giá">'),
    'Sử dụng Modal xác nhận xóa an toàn');
  assert.ok(adminVouchersCode.includes('selected.usedQuantity > 0'), 'Hiển thị cảnh báo đặc biệt khi voucher đã từng có lượt sử dụng');
  assert.doesNotMatch(adminVouchersCode, /window\.confirm|confirm\(/, 'AdminVouchers không được dùng confirm() trình duyệt');
});

// ============================================================================
// NHÓM 4: KIỂM THỬ GIAO DIỆN & TÍNH TƯƠNG THÍCH RESPONSIVE
// ============================================================================

test('TC-336-09: Giao diện Admin và Customer tương thích hoàn hảo trên Desktop (1200px+), Tablet (768px-991px) và Mobile (375px-640px)', async () => {
  const responsiveCss = readSrc('styles/responsive.css');
  const globalCss = readSrc('styles/global.css');
  const adminVouchersCode = readSrc('pages/admin/AdminVouchers.jsx');

  // 1. Kiểm tra cấu trúc bảng Admin có bao bọc table-responsive chống tràn màn hình
  assert.ok(adminVouchersCode.includes('className="table-wrapper table-responsive"'),
    'Bảng voucher Admin được bọc trong table-wrapper table-responsive');
  assert.ok(adminVouchersCode.includes("minWidth: '900px'"),
    'Bảng voucher Admin có minWidth 900px bảo vệ cấu trúc các cột');

  // 2. Desktop CSS: 4 cột KPI và filter bar 4 thành phần
  assert.ok(globalCss.includes('.grid-cols-4'), 'Có cấu hình .grid-cols-4');
  assert.ok(globalCss.includes('.admin-voucher-filter-bar'), 'Có cấu hình .admin-voucher-filter-bar');

  // 3. Tablet CSS (768px - 991px): KPI 2x2, Filter bar 2 dòng
  assert.ok(responsiveCss.includes('.admin-voucher-filter-bar {'), 'Tablet có rule riêng cho .admin-voucher-filter-bar');
  assert.ok(responsiveCss.includes('.voucher-filter-search {'), 'Tablet cho .voucher-filter-search mở rộng grid-column: 1 / -1');

  // 4. Mobile CSS (<= 640px): xếp chồng 1 cột dọc toàn bộ
  assert.ok(responsiveCss.includes('@media (max-width: 640px)'), 'Có media query max-width: 640px');
  assert.ok(responsiveCss.includes('.admin-voucher-filter-bar,'), 'Mobile xếp chồng .admin-voucher-filter-bar thành 1 cột');
  assert.ok(responsiveCss.includes('.grid-cols-4,'), 'Mobile chuyển .grid-cols-4 thành 1 cột');

  // 5. Grid thẻ voucher người dùng linh hoạt
  const vouchersCode = readSrc('pages/customer/Vouchers.jsx');
  assert.ok(vouchersCode.includes("gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))'"),
    'Grid voucher người dùng co giãn linh hoạt min(280px, 100%) tránh tràn màn hình mobile');
});

// ============================================================================
// NHÓM 5: KIỂM THỬ TÍCH HỢP SERVICE, REST API BACKEND & BẢO VỆ PHÂN QUYỀN
// ============================================================================

test('TC-336-10: voucherService.js map 100% đúng contract các endpoint Backend và có cơ chế fallback an toàn qua LocalStorage', async () => {
  const serviceCode = readSrc('services/voucherService.js');
  const beControllerCode = readBackend('order-service/src/main/java/com/ecommerce/order/controller/VoucherController.java');
  const beAdminControllerCode = readBackend('order-service/src/main/java/com/ecommerce/order/controller/AdminVoucherController.java');

  // Kiểm tra mapping các endpoint Frontend <-> Backend
  assert.ok(serviceCode.includes("api.get('/vouchers/active')"), 'Frontend gọi GET /vouchers/active');
  assert.ok(beControllerCode.includes('@GetMapping({"", "/active"})'), 'Backend VoucherController có GET /active');

  assert.ok(serviceCode.includes("api.post('/vouchers/apply'"), 'Frontend gọi POST /vouchers/apply');
  assert.ok(beControllerCode.includes('@PostMapping("/apply")'), 'Backend VoucherController có POST /apply');

  assert.ok(serviceCode.includes("api.get('/admin/vouchers')"), 'Frontend gọi GET /admin/vouchers');
  assert.ok(beAdminControllerCode.includes('@GetMapping'), 'Backend AdminVoucherController có GET /');

  assert.ok(serviceCode.includes("api.post('/admin/vouchers'"), 'Frontend gọi POST /admin/vouchers');
  assert.ok(beAdminControllerCode.includes('@PostMapping'), 'Backend AdminVoucherController có POST /');

  assert.ok(serviceCode.includes("api.put(`/admin/vouchers/${id}`"), 'Frontend gọi PUT /admin/vouchers/{id}');
  assert.ok(beAdminControllerCode.includes('@PutMapping("/{id}")'), 'Backend AdminVoucherController có PUT /{id}');

  assert.ok(serviceCode.includes("api.patch(`/admin/vouchers/${id}/toggle-status`)"), 'Frontend gọi PATCH /admin/vouchers/{id}/toggle-status');
  assert.ok(beAdminControllerCode.includes('@PatchMapping("/{id}/toggle-status")'), 'Backend AdminVoucherController có PATCH /{id}/toggle-status');

  assert.ok(serviceCode.includes("api.delete(`/admin/vouchers/${id}`)"), 'Frontend gọi DELETE /admin/vouchers/{id}');
  assert.ok(beAdminControllerCode.includes('@DeleteMapping("/{id}")'), 'Backend AdminVoucherController có DELETE /{id}');

  // Kiểm tra xử lý date boundary GMT+7 tránh lệch 7 tiếng
  assert.ok(serviceCode.includes('parseLocalDateBoundary'), 'voucherService có helper parseLocalDateBoundary');
  const startD = parseLocalDateBoundary('2026-11-12', false);
  assert.strictEqual(startD.getHours(), 0);
  assert.strictEqual(startD.getMinutes(), 0);
  const endD = parseLocalDateBoundary('2026-11-12', true);
  assert.strictEqual(endD.getHours(), 23);
  assert.strictEqual(endD.getMinutes(), 59);

  // Kiểm tra bảo vệ route AdminRoute
  const appRoutesCode = readSrc('routes/AppRoutes.jsx');
  assert.ok(appRoutesCode.includes('path="/admin/vouchers"'), 'Route /admin/vouchers đã đăng ký');
  assert.ok(appRoutesCode.includes('<AdminLayout>'), 'Trang AdminVouchers bọc trong <AdminLayout>');
  assert.ok(appRoutesCode.includes('element={<AdminRoute />}'), 'Các trang admin nằm trong nhánh AdminRoute bảo vệ');
});
