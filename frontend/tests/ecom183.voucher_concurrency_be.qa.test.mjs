/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-183
 * [BE] QA Test - Xử lý đồng thời voucher: giữ lượt, hoàn lượt khi hủy hoặc lỗi thanh toán
 * Feature: [BE] Voucher & mã giảm giá | Parent: ECOM-331 ([BE] Voucher & mã giảm giá)
 * Dự án: ShopMart – E-Commerce Platform
 * Sprint: SPRINT 3 | Epic: CUSTOMER & ORDER | Priority: High (P1)
 * Người phụ trách: Đoàn Mạnh Duy - 28/07/2006
 * ==============================================================================
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const readBackend = (relPath) => fs.readFileSync(path.join(rootDir, 'backend', relPath), 'utf8');

describe('ECOM-183: [BE] XỬ LÝ ĐỒNG THỜI VOUCHER: GIỮ LƯỢT, HOÀN LƯỢT KHI HỦY HOẶC LỖI THANH TOÁN', () => {

  test('TC-183-01: VoucherRepository có query UPDATE nguyên tử incrementUsedQuantityAtomically chống Race Condition', () => {
    const repo = readBackend('order-service/src/main/java/com/ecommerce/order/repository/VoucherRepository.java');

    assert.match(repo, /@Modifying/, 'Phải có annotation @Modifying');
    assert.match(repo, /UPDATE Voucher v SET v\.usedQuantity = v\.usedQuantity \+ 1/, 'Phải tăng usedQuantity bằng atomic UPDATE');
    assert.match(repo, /v\.usedQuantity < v\.quantity/, 'Phải chặn over-redemption khi usedQuantity < quantity');
    assert.match(repo, /v\.status = 'ACTIVE'/, 'Chỉ tăng lượt khi voucher đang ACTIVE');
    assert.match(repo, /v\.startDate <= :today AND v\.endDate >= :today/, 'Chỉ tăng lượt khi voucher trong thời hạn');
    assert.match(repo, /int incrementUsedQuantityAtomically/, 'Tên method phải là incrementUsedQuantityAtomically');
  });

  test('TC-183-02: VoucherRepository có query hoàn lượt decrementUsedQuantityByCode', () => {
    const repo = readBackend('order-service/src/main/java/com/ecommerce/order/repository/VoucherRepository.java');

    assert.match(repo, /UPDATE Voucher v SET v\.usedQuantity = v\.usedQuantity - 1/, 'Phải giảm usedQuantity khi hoàn lượt');
    assert.match(repo, /v\.usedQuantity > 0/, 'Chỉ giảm khi usedQuantity > 0 chống số âm');
    assert.match(repo, /int decrementUsedQuantityByCode/, 'Tên method phải là decrementUsedQuantityByCode');
  });

  test('TC-183-03: VoucherUsageRepository hỗ trợ theo dõi trạng thái APPLIED / RESTORED', () => {
    const repo = readBackend('order-service/src/main/java/com/ecommerce/order/repository/VoucherUsageRepository.java');

    assert.match(repo, /existsByVoucherCodeIgnoreCaseAndUserIdAndStatus/, 'Kiểm tra voucher đã dùng theo mã, userId và status');
    assert.match(repo, /findFirstByVoucherCodeIgnoreCaseAndOrderIdAndStatusOrderByIdDesc/, 'Tìm bản ghi usage theo orderId để rollback');
    assert.match(repo, /findByUserIdAndStatus/, 'Tìm danh sách voucher user đã áp dụng');
  });

  test('TC-183-04: VoucherServiceImpl.redeemVoucherForOrder thực hiện atomic increment và ném exception nếu hết lượt', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java');

    assert.match(service, /voucherRepository\.incrementUsedQuantityAtomically\(voucher\.getId\(\),\s*today\)/,
      'Phải gọi incrementUsedQuantityAtomically');
    assert.match(service, /if\s*\(updated\s*==\s*0\)\s*\{[\s\S]*?throw new IllegalStateException/,
      'Ném IllegalStateException khi updated == 0 do hết lượt hoặc hết hạn');
  });

  test('TC-183-05: VoucherServiceImpl.restoreVoucherUsageForOrder chuyển trạng thái sang RESTORED', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java');

    assert.match(service, /usage\.setStatus\(VoucherUsageStatus\.RESTORED\)/, 'Đổi trạng thái usage sang RESTORED');
    assert.match(service, /voucherUsageRepository\.save\(usage\)/, 'Lưu lại bản ghi usage đã chuyển RESTORED');
    assert.match(service, /voucherRepository\.decrementUsedQuantityByCode\(code\)/, 'Gọi decrementUsedQuantityByCode để trả lại 1 lượt');
  });

  test('TC-183-06: OrderServiceImpl.checkout kiểm tra chống dùng trùng và ghi nhận voucher_usages', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

    assert.match(service, /voucherService\.validateUserCanUseVoucher\(appliedVoucherCode,\s*request\.getUserId\(\)\)/,
      'Checkout phải kiểm tra người dùng chưa dùng voucher này');
    assert.match(service, /discountAmount\s*=\s*voucherService\.redeemVoucherForOrder\(appliedVoucherCode,\s*subtotalAmount\)/,
      'Checkout phải gọi redeemVoucherForOrder để giữ lượt nguyên tử');
    assert.match(service, /voucherService\.recordVoucherUsage\(appliedVoucherCode,\s*savedOrder\.getUserId\(\),\s*savedOrder\.getId\(\),\s*discountAmount\)/,
      'Sau khi lưu Order thành công phải ghi nhận bản ghi voucher_usages');
  });

  test('TC-183-07: OrderServiceImpl.cancelPendingOrderAndRestoreStock hoàn lại lượt voucher khi hủy đơn PENDING', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

    assert.match(service, /cancelPendingOrderAndRestoreStock[\s\S]*?voucherService\.restoreVoucherUsage\(order\.getVoucherCode\(\)\)/,
      'Hủy đơn PENDING phải gọi restoreVoucherUsage');
    assert.match(service, /cancelPendingOrderAndRestoreStock[\s\S]*?voucherService\.restoreVoucherUsageForOrder\(order\.getVoucherCode\(\),\s*order\.getUserId\(\),\s*order\.getId\(\)\)/,
      'Hủy đơn PENDING phải gọi restoreVoucherUsageForOrder');
  });

  test('TC-183-08: OrderServiceImpl.handlePaymentFailed hoàn lại lượt voucher khi thanh toán thất bại (Saga rollback)', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

    assert.match(service, /handlePaymentFailed[\s\S]*?voucherService\.restoreVoucherUsage\(order\.getVoucherCode\(\)\)/,
      'Thanh toán lỗi phải gọi restoreVoucherUsage');
    assert.match(service, /handlePaymentFailed[\s\S]*?voucherService\.restoreVoucherUsageForOrder\(order\.getVoucherCode\(\),\s*order\.getUserId\(\),\s*order\.getId\(\)\)/,
      'Thanh toán lỗi phải gọi restoreVoucherUsageForOrder');
  });

  test('TC-183-09: OrderServiceImpl.updateOrderStatus hoàn lại lượt voucher khi Admin đổi trạng thái sang CANCELLED', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

    assert.match(service, /if\s*\(newStatus\s*==\s*OrderStatus\.CANCELLED\)[\s\S]*?voucherService\.restoreVoucherUsage\(order\.getVoucherCode\(\)\)/,
      'Admin chuyển sang CANCELLED phải gọi restoreVoucherUsage');
    assert.match(service, /if\s*\(newStatus\s*==\s*OrderStatus\.CANCELLED\)[\s\S]*?voucherService\.restoreVoucherUsageForOrder/,
      'Admin chuyển sang CANCELLED phải gọi restoreVoucherUsageForOrder');
  });

  test('TC-183-10: VoucherServiceTest có bài test concurrency đa luồng xác minh 2 người cùng tranh 1 slot cuối', () => {
    const testCode = readBackend('order-service/src/test/java/com/ecommerce/order/service/VoucherServiceTest.java');

    assert.match(testCode, /redeemVoucherForOrder_TwoUsersCompetingForLastSlot_OnlyOneSucceeds/,
      'Phải có test case redeemVoucherForOrder_TwoUsersCompetingForLastSlot_OnlyOneSucceeds');
    assert.match(testCode, /ExecutorService executor\s*=\s*Executors\.newFixedThreadPool\(threads\)/,
      'Phải sử dụng thread pool mô phỏng concurrency');
    assert.match(testCode, /assertThat\(successCount\.get\(\)\)\.isEqualTo\(1\)/,
      'Chỉ đúng 1 request được phép thành công khi tranh slot cuối');
    assert.match(testCode, /assertThat\(failureCount\.get\(\)\)\.isEqualTo\(1\)/,
      'Request thứ 2 bị từ chối');
  });

  test('TC-183-11: OrderServiceTest kiểm thử tích hợp đầy đủ Checkout, Hủy đơn và PaymentFailed với Voucher', () => {
    const testCode = readBackend('order-service/src/test/java/com/ecommerce/order/service/OrderServiceTest.java');

    assert.match(testCode, /checkout_WithVoucherCode_ShouldRedeemAndDeductDiscountAmount/,
      'Có test checkout kèm mã voucher');
    assert.match(testCode, /cancelOrder_WithVoucherCode_ShouldRestoreVoucherUsage/,
      'Có test hủy đơn hoàn lại voucher');
    assert.match(testCode, /handlePaymentFailed_WithVoucherCode_ShouldRestoreVoucherUsage/,
      'Có test payment failed hoàn lại voucher');
    assert.match(testCode, /updateOrderStatus_CancelledWithVoucher_ShouldRestoreVoucherUsage/,
      'Có test Admin cập nhật CANCELLED hoàn lại voucher');
  });

});

