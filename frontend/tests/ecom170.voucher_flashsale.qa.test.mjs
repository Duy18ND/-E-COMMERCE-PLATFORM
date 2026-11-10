/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-170
 * [QA] Kiểm thử điều kiện tối thiểu, hết hạn và kết hợp Flash Sale
 * Parent: ECOM-332 – QA Voucher & mã giảm giá | Sprint 3
 * PIC: Ngô Phương (QA)
 * ==============================================================================
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Giả lập môi trường Web Storage & Window Event cho voucherService.js
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear()
};
globalThis.window = {
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {}
};

import voucherService, {
  parseLocalDateBoundary,
  getVoucherStatus,
  calcDiscount
} from '../src/services/voucherService.js';

const readFrontend = (relPath) =>
  fs.readFileSync(path.join(rootDir, 'frontend', relPath), 'utf8');

// Thời điểm cố định phục vụ kiểm thử: 2026-11-10 10:00:00 (Local Time)
const FIXED_NOW = new Date(2026, 10, 10, 10, 0, 0, 0);

const createSampleVoucher = (overrides = {}) => ({
  id: 101,
  code: 'GIAM50K',
  name: 'Ưu đãi 50K cho đơn từ 500K',
  discountType: 'FIXED',
  discountValue: 50000,
  maxDiscount: null,
  minOrderValue: 500000,
  quantity: 100,
  usedQuantity: 10,
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  status: 'ACTIVE',
  ...overrides
});

describe('ECOM-170: KIỂM THỬ ĐIỀU KIỆN TỐI THIỂU, THỜI HẠN VOUCHER VÀ KẾT HỢP FLASH SALE', () => {
  beforeEach(() => {
    storageMap.clear();
  });

  // ===========================================================================
  // A. KIỂM TRA GIÁ TRỊ ĐƠN HÀNG TỐI THIỂU (E170-01 -> E170-06)
  // ===========================================================================
  describe('A. Kiểm tra điều kiện giá trị đơn hàng tối thiểu (minOrderValue = 500.000đ)', () => {
    test('E170-01: Đơn hàng dưới 500.000đ (499.999đ) -> Không được áp dụng (giảm 0đ và ném lỗi khi applyCode)', async () => {
      // Arrange
      const voucher = createSampleVoucher();
      localStorage.setItem('app_vouchers', JSON.stringify([voucher]));

      // Act
      const discount = calcDiscount(voucher, 499999, FIXED_NOW);

      // Assert
      assert.equal(discount, 0, 'Đơn 499.999đ < 500.000đ phải trả về giảm giá = 0');
      await assert.rejects(
        () => voucherService.applyCode('GIAM50K', 499999),
        /Đơn hàng tối thiểu/,
        'applyCode phải từ chối đơn dưới 500.000đ'
      );
    });

    test('E170-02: Đơn hàng đúng bằng 500.000đ -> Được áp dụng thành công', () => {
      // Arrange
      const voucher = createSampleVoucher();

      // Act
      const discount = calcDiscount(voucher, 500000, FIXED_NOW);
      const finalAmount = Math.max(0, 500000 - discount);

      // Assert
      assert.equal(discount, 50000, 'Đơn đúng 500.000đ phải được giảm 50.000đ');
      assert.equal(finalAmount, 450000, 'Tổng thanh toán sau giảm phải là 450.000đ');
    });

    test('E170-03: Đơn hàng trên 500.000đ (800.000đ) -> Được áp dụng chính xác', () => {
      // Arrange
      const percentVoucher = createSampleVoucher({
        code: 'SALE10',
        discountType: 'PERCENT',
        discountValue: 10,
        maxDiscount: 100000,
        minOrderValue: 500000
      });

      // Act
      const discount = calcDiscount(percentVoucher, 800000, FIXED_NOW);
      const finalAmount = Math.max(0, 800000 - discount);

      // Assert
      assert.equal(discount, 80000, '10% của 800.000đ phải giảm 80.000đ');
      assert.equal(finalAmount, 720000, 'Tổng thanh toán cuối phải là 720.000đ');
    });

    test('E170-04: Đơn hàng bằng 0 (kể cả khi minOrderValue = 0) -> Không được áp dụng', async () => {
      // Arrange
      const zeroMinVoucher = createSampleVoucher({ minOrderValue: 0 });

      // Act
      const discount = calcDiscount(zeroMinVoucher, 0, FIXED_NOW);

      // Assert
      assert.equal(discount, 0, 'Đơn hàng 0đ tuyệt đối không được áp dụng giảm giá');
      await assert.rejects(
        () => voucherService.applyCode('GIAM50K', 0),
        /lớn hơn 0đ/,
        'applyCode phải từ chối đơn hàng có giá trị bằng 0'
      );
    });

    test('E170-05: Đơn hàng có giá trị âm không hợp lệ (-200.000đ, NaN) -> Bị từ chối', async () => {
      // Arrange
      const voucher = createSampleVoucher({ minOrderValue: 0 });

      // Act & Assert
      assert.equal(calcDiscount(voucher, -200000, FIXED_NOW), 0);
      assert.equal(calcDiscount(voucher, NaN, FIXED_NOW), 0);
      await assert.rejects(
        () => voucherService.applyCode('GIAM50K', -200000),
        /lớn hơn 0đ/
      );
    });

    test('E170-06: Giá trị đơn hàng thiếu, null, undefined hoặc chuỗi rỗng -> Xử lý validation đúng', async () => {
      // Arrange
      const voucher = createSampleVoucher({ minOrderValue: 0 });

      // Act & Assert
      assert.equal(calcDiscount(voucher, null, FIXED_NOW), 0);
      assert.equal(calcDiscount(voucher, undefined, FIXED_NOW), 0);
      assert.equal(calcDiscount(voucher, '', FIXED_NOW), 0);
      await assert.rejects(
        () => voucherService.applyCode('GIAM50K', null),
        /không được để trống/
      );
    });
  });

  // ===========================================================================
  // B. KIỂM TRA THỜI HẠN VOUCHER & TIMEZONE (E170-07 -> E170-12)
  // ===========================================================================
  describe('B. Kiểm tra thời hạn sử dụng Voucher và biên ngày theo múi giờ Local (GMT+7)', () => {
    test('E170-07: Voucher chưa đến thời gian bắt đầu -> Trạng thái UPCOMING, không được áp dụng', () => {
      // Arrange: FIXED_NOW = 2026-11-10, voucher bắt đầu 2026-11-11
      const upcomingVoucher = createSampleVoucher({
        startDate: '2026-11-11',
        endDate: '2026-11-20'
      });

      // Act
      const status = getVoucherStatus(upcomingVoucher, FIXED_NOW);
      const discount = calcDiscount(upcomingVoucher, 600000, FIXED_NOW);

      // Assert
      assert.equal(status, 'UPCOMING');
      assert.equal(discount, 0);
    });

    test('E170-08: Voucher đang trong thời hạn -> Trạng thái ACTIVE, được áp dụng', () => {
      // Arrange
      const activeVoucher = createSampleVoucher({
        startDate: '2026-11-01',
        endDate: '2026-11-30'
      });

      // Act
      const status = getVoucherStatus(activeVoucher, FIXED_NOW);
      const discount = calcDiscount(activeVoucher, 600000, FIXED_NOW);

      // Assert
      assert.equal(status, 'ACTIVE');
      assert.equal(discount, 50000);
    });

    test('E170-09: Voucher đã hết hạn -> Trạng thái EXPIRED, không được áp dụng', () => {
      // Arrange: FIXED_NOW = 2026-11-10, voucher hết hạn 2026-11-09
      const expiredVoucher = createSampleVoucher({
        startDate: '2026-11-01',
        endDate: '2026-11-09'
      });

      // Act
      const status = getVoucherStatus(expiredVoucher, FIXED_NOW);
      const discount = calcDiscount(expiredVoucher, 600000, FIXED_NOW);

      // Assert
      assert.equal(status, 'EXPIRED');
      assert.equal(discount, 0);
    });

    test('E170-10: Thời điểm đúng bằng 00:00:00.000 ngày bắt đầu (Local Time, không bị lệch 7h UTC) -> ACTIVE và áp dụng được', () => {
      // Arrange: Đúng 00:00:00.000 ngày 2026-11-10 giờ địa phương
      // Nếu parse bằng new Date("2026-11-10") (UTC midnight = 07:00 GMT+7) thì lúc 00:00..06:59 sẽ bị nhận nhầm là UPCOMING!
      const startBoundaryNow = new Date(2026, 10, 10, 0, 0, 0, 0);
      const voucher = createSampleVoucher({
        startDate: '2026-11-10',
        endDate: '2026-11-15'
      });

      // Act
      const parsedStart = parseLocalDateBoundary('2026-11-10', false);
      const status = getVoucherStatus(voucher, startBoundaryNow);
      const discount = calcDiscount(voucher, 500000, startBoundaryNow);

      // Assert
      assert.equal(parsedStart.getHours(), 0);
      assert.equal(parsedStart.getMinutes(), 0);
      assert.equal(status, 'ACTIVE', 'Lúc 00:00 sáng ngày startDate phải là ACTIVE, không bị lệch múi giờ UTC');
      assert.equal(discount, 50000);
    });

    test('E170-11: Thời điểm đúng bằng 23:59:59.999 ngày kết thúc -> ACTIVE, sang 00:00:00.000 ngày kế tiếp -> EXPIRED', () => {
      // Arrange
      const endBoundaryNow = new Date(2026, 10, 10, 23, 59, 59, 999);
      const oneMsAfterEnd = new Date(2026, 10, 11, 0, 0, 0, 0);
      const voucher = createSampleVoucher({
        startDate: '2026-11-01',
        endDate: '2026-11-10'
      });

      // Act & Assert
      assert.equal(getVoucherStatus(voucher, endBoundaryNow), 'ACTIVE');
      assert.equal(calcDiscount(voucher, 500000, endBoundaryNow), 50000);
      assert.equal(getVoucherStatus(voucher, oneMsAfterEnd), 'EXPIRED');
      assert.equal(calcDiscount(voucher, 500000, oneMsAfterEnd), 0);
    });

    test('E170-12: Thời gian bắt đầu lớn hơn thời gian kết thúc (startDate > endDate) -> Từ chối cấu hình sai', async () => {
      // Arrange
      const invalidDateVoucher = createSampleVoucher({
        startDate: '2026-11-25',
        endDate: '2026-11-10'
      });

      // Act & Assert
      assert.equal(getVoucherStatus(invalidDateVoucher, FIXED_NOW), 'INACTIVE');
      assert.equal(calcDiscount(invalidDateVoucher, 600000, FIXED_NOW), 0);
      await assert.rejects(
        () =>
          voucherService.create({
            code: 'WRONGDATE',
            name: 'Sai ngày',
            discountType: 'FIXED',
            discountValue: 50000,
            minOrderValue: 200000,
            quantity: 10,
            startDate: '2026-11-25',
            endDate: '2026-11-10'
          }),
        /Ngày kết thúc phải bằng hoặc sau ngày bắt đầu/
      );
    });
  });

  // ===========================================================================
  // C & D. KẾT HỢP VOUCHER VỚI FLASH SALE & TÍNH TOÁN GIÁ (E170-13 -> E170-18)
  // ===========================================================================
  describe('C & D. Kiểm tra kết hợp Voucher với Flash Sale và độ chính xác tính giá', () => {
    // Hàm mô phỏng đúng công thức tính giỏ hàng từ CartContext.jsx + Checkout.jsx
    const computeCartAndVoucherSummary = (cartItems, voucher, now = FIXED_NOW) => {
      const totalOriginalPrice = cartItems.reduce(
        (sum, item) => sum + Number(item.originalPrice ?? item.price ?? 0) * item.quantity,
        0
      );
      const totalPrice = cartItems.reduce(
        (sum, item) => sum + Number(item.salePrice ?? item.price ?? 0) * item.quantity,
        0
      );
      const flashSaleDiscount = Math.max(0, totalOriginalPrice - totalPrice);
      const voucherDiscount = voucher ? calcDiscount(voucher, totalPrice, now) : 0;
      const finalTotal = Math.max(0, totalPrice - voucherDiscount);
      return {
        totalOriginalPrice,
        totalPrice,
        flashSaleDiscount,
        voucherDiscount,
        finalTotal
      };
    };

    test('E170-13: Sản phẩm Flash Sale đủ điều kiện đơn tối thiểu sau giảm Flash Sale -> Áp dụng đúng quy tắc', () => {
      // Arrange: Giá gốc 800.000đ, giá Flash Sale 550.000đ (>= minOrderValue 500.000đ)
      const cart = [{ id: 501, originalPrice: 800000, salePrice: 550000, quantity: 1 }];
      const voucher = createSampleVoucher({ discountType: 'FIXED', discountValue: 50000, minOrderValue: 500000 });

      // Act
      const summary = computeCartAndVoucherSummary(cart, voucher);

      // Assert
      assert.equal(summary.totalOriginalPrice, 800000);
      assert.equal(summary.totalPrice, 550000);
      assert.equal(summary.flashSaleDiscount, 250000);
      assert.equal(summary.voucherDiscount, 50000);
      assert.equal(summary.finalTotal, 500000);
    });

    test('E170-14: Sản phẩm Flash Sale làm tổng tiền sau Flash Sale (400.000đ) thấp hơn minOrderValue (500.000đ) -> Từ chối áp Voucher', () => {
      // Arrange: Giá gốc 600.000đ (>= 500.000đ) nhưng giá Flash Sale là 400.000đ (< 500.000đ)
      const cart = [{ id: 503, originalPrice: 600000, salePrice: 400000, quantity: 1 }];
      const voucher = createSampleVoucher({ minOrderValue: 500000 });

      // Act
      const summary = computeCartAndVoucherSummary(cart, voucher);

      // Assert
      assert.equal(summary.totalPrice, 400000);
      assert.equal(summary.voucherDiscount, 0, 'Không được lấy giá gốc 600.000đ để vượt điều kiện tối thiểu 500.000đ');
      assert.equal(summary.finalTotal, 400000);
    });

    test('E170-15: Giỏ hàng hỗn hợp có sản phẩm Flash Sale và sản phẩm thường -> Tính giảm giá đúng phạm vi', () => {
      // Arrange: 1 sản phẩm Flash Sale (gốc 800k -> sale 550k) + 1 sản phẩm thường (250k) = 800k
      const cart = [
        { id: 501, originalPrice: 800000, salePrice: 550000, quantity: 1 },
        { id: 502, originalPrice: 250000, price: 250000, quantity: 1 }
      ];
      const percentVoucher = createSampleVoucher({
        code: 'FLASH10',
        discountType: 'PERCENT',
        discountValue: 10,
        maxDiscount: 80000,
        minOrderValue: 500000
      });

      // Act
      const summary = computeCartAndVoucherSummary(cart, percentVoucher);

      // Assert
      assert.equal(summary.totalOriginalPrice, 1050000);
      assert.equal(summary.totalPrice, 800000);
      assert.equal(summary.flashSaleDiscount, 250000);
      assert.equal(summary.voucherDiscount, 80000);
      assert.equal(summary.finalTotal, 720000);
    });

    test('E170-16: Chỉ cho phép 1 Voucher duy nhất trên mỗi đơn hàng, chọn mã mới tự động thay thế mã cũ', () => {
      // Arrange
      const checkoutCode = readFrontend('src/pages/customer/Checkout.jsx');
      const v1 = createSampleVoucher({ id: 1, code: 'GIAM50K', discountType: 'FIXED', discountValue: 50000 });
      const v2 = createSampleVoucher({ id: 2, code: 'FLASH10', discountType: 'PERCENT', discountValue: 10, maxDiscount: 100000 });

      // Act: Áp dụng v1 rồi chọn sang v2 trên đơn 700.000đ
      let appliedVoucher = { voucher: v1, discountAmount: calcDiscount(v1, 700000, FIXED_NOW) };
      appliedVoucher = { voucher: v2, discountAmount: calcDiscount(v2, 700000, FIXED_NOW) };

      // Assert
      assert.equal(appliedVoucher.voucher.code, 'FLASH10');
      assert.equal(appliedVoucher.discountAmount, 70000, 'Chỉ tính giảm giá của mã đang chọn, không cộng dồn 50k + 70k');
      assert.match(checkoutCode, /const \[appliedVoucher,\s*setAppliedVoucher\]\s*=\s*useState\(null\)/);
    });

    test('E170-17: Giá trị giảm của Voucher vượt tổng tiền hàng -> Không tạo tổng tiền âm (finalTotal = 0)', () => {
      // Arrange: Voucher giảm 500.000đ cho đơn từ 100.000đ, tổng đơn hàng = 250.000đ
      const hugeVoucher = createSampleVoucher({
        discountType: 'FIXED',
        discountValue: 500000,
        minOrderValue: 100000
      });

      // Act
      const discount = calcDiscount(hugeVoucher, 250000, FIXED_NOW);
      const finalTotal = Math.max(0, 250000 - discount);

      // Assert
      assert.equal(discount, 250000, 'Số tiền giảm tối đa bằng đúng tổng tiền đơn hàng (250.000đ)');
      assert.equal(finalTotal, 0, 'Tổng thanh toán cuối cùng phải bằng 0, không được âm');
    });

    test('E170-18: Thay đổi số lượng sau khi áp Voucher -> Tự động tính lại tiền giảm và tự gỡ Voucher nếu tụt dưới minOrderValue', () => {
      // Arrange
      const checkoutCode = readFrontend('src/pages/customer/Checkout.jsx');
      const percentVoucher = createSampleVoucher({
        code: 'FLASH10',
        discountType: 'PERCENT',
        discountValue: 10,
        maxDiscount: 100000,
        minOrderValue: 500000
      });

      // Act 1: Số lượng = 2 (2 x 300.000đ = 600.000đ) -> Giảm 60.000đ
      const discountQty2 = calcDiscount(percentVoucher, 600000, FIXED_NOW);
      // Act 2: Tăng số lượng = 3 (3 x 300.000đ = 900.000đ) -> Giảm 90.000đ
      const discountQty3 = calcDiscount(percentVoucher, 900000, FIXED_NOW);
      // Act 3: Giảm số lượng = 1 (1 x 300.000đ = 300.000đ < 500.000đ) -> Giảm 0đ và tự gỡ appliedVoucher
      const discountQty1 = calcDiscount(percentVoucher, 300000, FIXED_NOW);

      // Assert
      assert.equal(discountQty2, 60000);
      assert.equal(discountQty3, 90000);
      assert.equal(discountQty1, 0);
      assert.match(
        checkoutCode,
        /if \(!v \|\| status !== 'ACTIVE' \|\| totalPrice <= 0 \|\| totalPrice < minOrder\) \{\s*setAppliedVoucher\(null\);/,
        'Checkout.jsx phải tự động gỡ appliedVoucher khi totalPrice giảm xuống dưới minOrderValue'
      );
    });
  });
});
