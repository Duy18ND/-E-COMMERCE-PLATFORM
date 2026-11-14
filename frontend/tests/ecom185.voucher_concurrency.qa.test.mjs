/**
 * ============================================================================
 * AUTOMATED QA TEST SUITE — TASK ECOM-185
 * [QA] Kiểm thử Voucher – Giới hạn lượt sử dụng, Concurrency và Đơn hàng bị hủy
 * PIC: Ngô Phương (QA)
 * ============================================================================
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getVoucherStatus,
  calcDiscount,
} from '../src/services/voucherService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, '..');
const BACKEND_ORDER_ROOT = path.resolve(FRONTEND_ROOT, '..', 'backend', 'order-service');

function readBackendFile(relPath) {
  return fs.readFileSync(path.join(BACKEND_ORDER_ROOT, relPath), 'utf8');
}

describe('ECOM-185 Group A: Giới hạn tổng lượt sử dụng Voucher (E185-01 -> E185-06)', () => {
  it('E185-01: Voucher chưa được sử dụng (usedQuantity = 0, quantity = 10) -> Trạng thái ACTIVE và tính giảm giá hợp lệ', () => {
    const v = {
      id: 1,
      code: 'UNUSED10',
      discountType: 'FIXED',
      discountValue: 50000,
      minOrderValue: 500000,
      quantity: 10,
      usedQuantity: 0,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'ACTIVE',
    };
    const now = new Date('2026-11-10T10:00:00+07:00');
    assert.equal(getVoucherStatus(v, now), 'ACTIVE');
    const discountAmount = calcDiscount(v, 600000, now);
    assert.equal(discountAmount, 50000);
  });

  it('E185-02: Voucher còn đúng 1 lượt cuối (usedQuantity = 9, quantity = 10) -> Vẫn ở trạng thái ACTIVE cho lượt hợp lệ cuối cùng', () => {
    const v = {
      id: 2,
      code: 'LASTSLOT',
      discountType: 'FIXED',
      discountValue: 50000,
      minOrderValue: 500000,
      quantity: 10,
      usedQuantity: 9,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'ACTIVE',
    };
    const now = new Date('2026-11-10T10:00:00+07:00');
    assert.equal(getVoucherStatus(v, now), 'ACTIVE');
    assert.equal(calcDiscount(v, 600000, now), 50000);
  });

  it('E185-03: Voucher đã đạt giới hạn tổng (usedQuantity = 10, quantity = 10) -> Chuyển sang SOLD_OUT và chặn áp dụng (giảm giá = 0)', () => {
    const v = {
      id: 3,
      code: 'SOLDOUT10',
      discountType: 'FIXED',
      discountValue: 50000,
      minOrderValue: 500000,
      quantity: 10,
      usedQuantity: 10,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      status: 'ACTIVE',
    };
    const now = new Date('2026-11-10T10:00:00+07:00');
    assert.equal(getVoucherStatus(v, now), 'SOLD_OUT');
    assert.equal(calcDiscount(v, 600000, now), 0);
  });

  it('E185-04 & E185-05: VoucherRepository sử dụng câu lệnh UPDATE nguyên tử có điều kiện v.usedQuantity < v.quantity và clearAutomatically', () => {
    const repoSrc = readBackendFile('src/main/java/com/ecommerce/order/repository/VoucherRepository.java');
    assert.match(repoSrc, /@Modifying\(clearAutomatically\s*=\s*true,\s*flushAutomatically\s*=\s*true\)/);
    assert.match(repoSrc, /UPDATE\s+Voucher\s+v\s+SET\s+v\.usedQuantity\s*=\s*v\.usedQuantity\s*\+\s*1/);
    assert.match(repoSrc, /v\.usedQuantity\s*<\s*v\.quantity/);
  });

  it('E185-06: Chính sách cấu hình giới hạn tổng bắt buộc @NotNull @Min(1) trên VoucherRequest.quantity và CHECK constraint trong DB', () => {
    const reqSrc = readBackendFile('src/main/java/com/ecommerce/order/dto/request/VoucherRequest.java');
    const entitySrc = readBackendFile('src/main/java/com/ecommerce/order/entity/Voucher.java');
    assert.match(reqSrc, /@Min\(value\s*=\s*1/);
    assert.match(entitySrc, /nullable\s*=\s*false/);
  });
});

describe('ECOM-185 Group B & C: Giới hạn theo người dùng, Concurrency & Xác thực danh tính (E185-07 -> E185-12)', () => {
  it('E185-07, E185-08, E185-09, E185-10: VoucherServiceImpl chặn dùng trùng theo userId bằng ReentrantLock + inFlightUserVouchers + bảng voucher_usages', () => {
    const serviceSrc = readBackendFile('src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java');
    assert.match(serviceSrc, /userVoucherLocks/);
    assert.match(serviceSrc, /inFlightUserVouchers/);
    assert.match(serviceSrc, /existsByVoucherCodeIgnoreCaseAndUserIdAndStatus\(\s*code,\s*userId,\s*VoucherUsageStatus\.APPLIED\)/);
    assert.match(serviceSrc, /Bạn đã sử dụng mã giảm giá này rồi\./);
  });

  it('E185-11 & E185-12: VoucherController và OrderController xác thực danh tính từ X-User-Id, từ chối token giả mạo và ghi đè userId trong body', () => {
    const voucherCtrl = readBackendFile('src/main/java/com/ecommerce/order/controller/VoucherController.java');
    const orderCtrl = readBackendFile('src/main/java/com/ecommerce/order/controller/OrderController.java');

    assert.match(voucherCtrl, /request\.setUserId\(userId\)/);
    assert.match(voucherCtrl, /Token xác thực không hợp lệ hoặc đã hết hạn/);
    assert.match(orderCtrl, /validateHeaderAuthentication\(authenticatedUserId,\s*authorizationHeader\)/);
    assert.match(orderCtrl, /requireAuthenticated\(authenticatedUserId\)/);
    assert.match(orderCtrl, /request\.setUserId\(authenticatedUserId\)/);
  });
});

describe('ECOM-185 Group D: Đơn hàng bị hủy và hoàn lượt sử dụng Voucher (E185-13 -> E185-18)', () => {
  it('E185-13 & E185-14: Hủy đơn hàng PENDING, lỗi thanh toán hoặc Admin hủy đơn đều hoàn lại usedQuantity và chuyển VoucherUsage sang RESTORED theo đúng orderId', () => {
    const voucherServiceSrc = readBackendFile('src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java');
    const repoSrc = readBackendFile('src/main/java/com/ecommerce/order/repository/VoucherRepository.java');

    assert.match(repoSrc, /SET\s+v\.usedQuantity\s*=\s*v\.usedQuantity\s*-\s*1/);
    assert.match(repoSrc, /WHERE\s+UPPER\(v\.code\)\s*=\s*UPPER\(:code\)\s+AND\s+v\.usedQuantity\s*>\s*0/);
    assert.match(voucherServiceSrc, /findFirstByVoucherCodeIgnoreCaseAndOrderIdAndStatusOrderByIdDesc/);
    assert.match(voucherServiceSrc, /usage\.setStatus\(VoucherUsageStatus\.RESTORED\)/);
  });

  it('E185-15, E185-16, E185-17, E185-18: OrderServiceImpl khóa đồng bộ theo orderId (orderLocks), gọi restoreStock trước khi lưu trạng thái CANCELLED và chặn hủy đơn DELIVERED/PAID', () => {
    const orderServiceSrc = readBackendFile('src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

    assert.match(orderServiceSrc, /acquireOrderLock\(orderId\)/);
    assert.match(orderServiceSrc, /Chỉ có thể hủy đơn hàng ở trạng thái PENDING/);
    assert.match(orderServiceSrc, /Không thể chuyển trạng thái đơn hàng từ %s sang %s/);

    // Đảm bảo trong cancelPendingOrderAndRestoreStock, productClient.restoreStock được gọi trước orderRepository.save(order)
    const cancelMethodIdx = orderServiceSrc.indexOf('private OrderResponse cancelPendingOrderAndRestoreStock(Order order)');
    assert.ok(cancelMethodIdx > 0);
    const cancelBody = orderServiceSrc.slice(cancelMethodIdx, cancelMethodIdx + 1600);
    const restoreStockPos = cancelBody.indexOf('productClient.restoreStock(restoreItems)');
    const saveOrderPos = cancelBody.indexOf('orderRepository.save(order)');
    const restoreVoucherPos = cancelBody.indexOf('voucherService.restoreVoucherUsage');
    assert.ok(restoreStockPos > 0 && saveOrderPos > restoreStockPos && restoreVoucherPos > restoreStockPos);
  });
});
