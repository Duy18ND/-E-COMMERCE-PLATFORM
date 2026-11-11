/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-339
 * [BE] QA Test - Admin tạo, sửa, ẩn voucher, giới hạn lượt sử dụng
 * Feature: [BE] Voucher & mã giảm giá | Parent: ECOM-331 ([BE] Voucher & mã giảm giá)
 * Dự án: ShopMart – E-Commerce Platform
 * Sprint: SPRINT 3 | Epic: ADMIN & ORDER | Priority: High (P1)
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

describe('ECOM-339: [BE] ADMIN TẠO, SỬA, ẨN VOUCHER, GIỚI HẠN LƯỢT SỬ DỤNG', () => {

  test('TC-339-01: AdminVoucherController định nghĩa đầy đủ các endpoint CRUD và Toggle Status', () => {
    const controller = readBackend('order-service/src/main/java/com/ecommerce/order/controller/AdminVoucherController.java');

    assert.match(controller, /@RequestMapping\(["']\/api\/v1\/admin\/vouchers["']\)/, 'Base path phải là /api/v1/admin/vouchers');
    assert.match(controller, /@GetMapping[\s\S]*?getAllVouchers/, 'Phải có GET /api/v1/admin/vouchers');
    assert.match(controller, /@GetMapping\(["']\/\{id\}["']\)[\s\S]*?getVoucherById/, 'Phải có GET /api/v1/admin/vouchers/{id}');
    assert.match(controller, /@PostMapping[\s\S]*?createVoucher/, 'Phải có POST /api/v1/admin/vouchers');
    assert.match(controller, /@PutMapping\(["']\/\{id\}["']\)[\s\S]*?updateVoucher/, 'Phải có PUT /api/v1/admin/vouchers/{id}');
    assert.match(controller, /@PatchMapping\(["']\/\{id\}\/toggle-status["']\)[\s\S]*?toggleVoucherStatus/, 'Phải có PATCH /api/v1/admin/vouchers/{id}/toggle-status');
    assert.match(controller, /@DeleteMapping\(["']\/\{id\}["']\)[\s\S]*?deleteVoucher/, 'Phải có DELETE /api/v1/admin/vouchers/{id}');
  });

  test('TC-339-02: AdminVoucherController bắt buộc quyền ROLE_ADMIN chống Access Control Bypass', () => {
    const controller = readBackend('order-service/src/main/java/com/ecommerce/order/controller/AdminVoucherController.java');

    assert.match(controller, /requireAdminRole\(roles\)/, 'Mọi endpoint phải gọi requireAdminRole');
    assert.match(controller, /"ROLE_ADMIN"::equals/, 'Phải so khớp chính xác ROLE_ADMIN chống substring bypass');
    assert.match(controller, /throw new AccessDeniedException\(["']Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này["']\)/,
      'Ném AccessDeniedException khi không có quyền Admin');
  });

  test('TC-339-03: DTO VoucherRequest ràng buộc validation chặt chẽ', () => {
    const dto = readBackend('order-service/src/main/java/com/ecommerce/order/dto/request/VoucherRequest.java');

    assert.match(dto, /@NotBlank\(message\s*=\s*["']Mã voucher không được để trống["']\)/, 'Chặn code trống');
    assert.match(dto, /@NotNull\(message\s*=\s*["']Loại giảm giá không được để trống["']\)/, 'Chặn discountType null');
    assert.match(dto, /@DecimalMin\(value\s*=\s*["']0\.01["']/, 'Chặn discountValue <= 0');
    assert.match(dto, /@Min\(value\s*=\s*1,\s*message\s*=\s*["']Số lượng mã phải lớn hơn 0["']\)/, 'Giới hạn quantity tối thiểu là 1');
    assert.match(dto, /@NotNull\(message\s*=\s*["']Ngày bắt đầu không được để trống["']\)/, 'Chặn startDate null');
    assert.match(dto, /@NotNull\(message\s*=\s*["']Ngày kết thúc không được để trống["']\)/, 'Chặn endDate null');
    assert.match(dto, /isValidDateRange/, 'Validate khoảng thời gian hợp lệ trong DTO');
  });

  test('TC-339-04: VoucherServiceImpl.createVoucher kiểm tra trùng mã code và ném DuplicateResourceException', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java');

    assert.match(service, /voucherRepository\.existsByCodeIgnoreCase\(code\)/, 'Kiểm tra mã voucher đã tồn tại chưa');
    assert.match(service, /throw new DuplicateResourceException\(/, 'Ném DuplicateResourceException khi trùng mã');
  });

  test('TC-339-05: VoucherServiceImpl.updateVoucher chặn trùng mã và chặn hạ số lượng nhỏ hơn số lượt đã dùng', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java');

    assert.match(service, /voucherRepository\.existsByCodeIgnoreCaseAndIdNot\(code,\s*id\)/, 'Chặn trùng mã với voucher khác khi update');
    assert.match(service, /if\s*\(request\.getQuantity\(\)\s*<\s*voucher\.getUsedQuantity\(\)\)/, 'Chặn quantity < usedQuantity');
    assert.match(service, /throw new IllegalStateException\(["']Số lượng mã \(["']/, 'Ném lỗi khi sửa số lượng nhỏ hơn số lượt đã dùng');
  });

  test('TC-339-06: VoucherServiceImpl.toggleVoucherStatus hỗ trợ ẩn / bật voucher linh hoạt', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java');

    assert.match(service, /toggleVoucherStatus\(Long id\)/, 'Phải có phương thức toggleVoucherStatus');
    assert.match(service, /VoucherStatus\.INACTIVE/, 'Chuyển sang INACTIVE');
    assert.match(service, /VoucherStatus\.ACTIVE/, 'Chuyển sang ACTIVE');
  });

  test('TC-339-07: VoucherControllerTest và VoucherServiceTest có đầy đủ unit tests cho Admin Voucher', () => {
    const controllerTest = readBackend('order-service/src/test/java/com/ecommerce/order/controller/VoucherControllerTest.java');
    const serviceTest = readBackend('order-service/src/test/java/com/ecommerce/order/service/VoucherServiceTest.java');

    assert.match(controllerTest, /getAllVouchers_WithAdminRole_ShouldReturn200/, 'Có test getAllVouchers');
    assert.match(controllerTest, /createVoucher_Valid_ShouldReturn201/, 'Có test createVoucher');
    assert.match(controllerTest, /createVoucher_DuplicateCode_ShouldReturn409/, 'Có test createVoucher duplicate code 409');
    assert.match(controllerTest, /toggleVoucherStatus_ShouldReturn200/, 'Có test toggle status 200');
    assert.match(controllerTest, /deleteVoucher_ShouldReturn200/, 'Có test delete voucher 200');

    assert.match(serviceTest, /updateVoucher_Success/, 'Có test updateVoucher thành công');
    assert.match(serviceTest, /updateVoucher_QuantityLessThanUsedQuantity_ShouldThrow/, 'Có test chặn hạ số lượng thấp hơn usedQuantity');
    assert.match(serviceTest, /toggleVoucherStatus_Success/, 'Có test toggle status thành công');
  });

});
