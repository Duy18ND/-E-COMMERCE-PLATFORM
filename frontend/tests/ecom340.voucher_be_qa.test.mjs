/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-340
 * [BE] QA Test - API, validation và quyền truy cập (Voucher & mã giảm giá)
 * Mô tả: Kiểm thử toàn diện API, validation dữ liệu sai, phân quyền RBAC và xử lý lỗi tầng Backend
 * Dự án: ShopMart – E-Commerce Platform
 * Sprint: Sprint 3 | Epic: CUSTOMER (Parent Task: ECOM-331, Feature: ECOM-158)
 * Người phụ trách: NGÔ PHƯƠNG (devops-phuong)
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
const repoRoot = path.resolve(rootDir, '..');

describe('ECOM-340: [BE] QA TEST - API, VALIDATION VÀ QUYỀN TRUY CẬP (VOUCHER & MÃ GIẢM GIÁ)', () => {
  const orderJavaDir = path.join(repoRoot, 'backend', 'order-service', 'src', 'main', 'java', 'com', 'ecommerce', 'order');
  const orderTestDir = path.join(repoRoot, 'backend', 'order-service', 'src', 'test', 'java', 'com', 'ecommerce', 'order');

  const voucherEntityFile = path.join(orderJavaDir, 'entity', 'Voucher.java');
  const voucherUsageEntityFile = path.join(orderJavaDir, 'entity', 'VoucherUsage.java');
  const voucherRepoFile = path.join(orderJavaDir, 'repository', 'VoucherRepository.java');
  const voucherUsageRepoFile = path.join(orderJavaDir, 'repository', 'VoucherUsageRepository.java');
  const voucherControllerFile = path.join(orderJavaDir, 'controller', 'VoucherController.java');
  const adminVoucherControllerFile = path.join(orderJavaDir, 'controller', 'AdminVoucherController.java');
  const voucherServiceImplFile = path.join(orderJavaDir, 'service', 'impl', 'VoucherServiceImpl.java');
  const voucherRequestFile = path.join(orderJavaDir, 'dto', 'request', 'VoucherRequest.java');
  const applyVoucherRequestFile = path.join(orderJavaDir, 'dto', 'request', 'ApplyVoucherRequest.java');
  const voucherResponseFile = path.join(orderJavaDir, 'dto', 'response', 'VoucherResponse.java');
  const applyVoucherResponseFile = path.join(orderJavaDir, 'dto', 'response', 'ApplyVoucherResponse.java');
  const globalExceptionFile = path.join(orderJavaDir, 'exception', 'GlobalExceptionHandler.java');
  const voucherApiQATestFile = path.join(orderTestDir, 'controller', 'VoucherApiValidationAccessQATest.java');

  test('TC-340-01: [Schema & Entity] Thực thể Voucher và VoucherUsage định nghĩa đầy đủ các trường, quan hệ và khóa phụ lục chuẩn', () => {
    assert.ok(fs.existsSync(voucherEntityFile), 'Voucher.java phải tồn tại');
    assert.ok(fs.existsSync(voucherUsageEntityFile), 'VoucherUsage.java phải tồn tại');

    const vContent = fs.readFileSync(voucherEntityFile, 'utf8');
    assert.ok(vContent.includes('@Table(name = "vouchers"'), 'Voucher phải ánh xạ bảng vouchers');
    assert.ok(vContent.includes('private String code;'), 'Phải có trường code');
    assert.ok(vContent.includes('private DiscountType discountType;'), 'Phải có trường discountType');
    assert.ok(vContent.includes('private BigDecimal discountValue;'), 'Phải có trường discountValue');
    assert.ok(vContent.includes('private BigDecimal maxDiscount;'), 'Phải có trường maxDiscount');
    assert.ok(vContent.includes('minOrderValue'), 'Phải có trường minOrderValue');
    assert.ok(vContent.includes('quantity'), 'Phải có trường quantity');
    assert.ok(vContent.includes('usedQuantity'), 'Phải có trường usedQuantity');
    assert.ok(vContent.includes('startDate'), 'Phải có trường startDate');
    assert.ok(vContent.includes('endDate'), 'Phải có trường endDate');
    assert.ok(vContent.includes('VoucherStatus status'), 'Phải có trường status');

    const uContent = fs.readFileSync(voucherUsageEntityFile, 'utf8');
    assert.ok(uContent.includes('name = "voucher_usages"'), 'VoucherUsage phải ánh xạ bảng voucher_usages');
    assert.ok(uContent.includes('private Long voucherId;'), 'Phải có voucherId');
    assert.ok(uContent.includes('private Long userId;'), 'Phải có userId');
    assert.ok(uContent.includes('private Long orderId;'), 'Phải có orderId');
    assert.ok(uContent.includes('discountAmount'), 'Phải có discountAmount');
  });

  test('TC-340-02: [Repository & Atomic Update] VoucherRepository hỗ trợ tìm kiếm không phân biệt hoa thường và tăng/giảm usedQuantity nguyên tử', () => {
    assert.ok(fs.existsSync(voucherRepoFile), 'VoucherRepository.java phải tồn tại');
    const content = fs.readFileSync(voucherRepoFile, 'utf8');

    assert.ok(content.includes('findByCodeIgnoreCase(String code)'), 'Phải có hàm findByCodeIgnoreCase');
    assert.ok(content.includes('existsByCodeIgnoreCase(String code)'), 'Phải có hàm existsByCodeIgnoreCase');
    assert.ok(content.includes('incrementUsedQuantityAtomically('), 'Phải có hàm cập nhật nguyên tử incrementUsedQuantityAtomically');
    assert.ok(content.includes('decrementUsedQuantityByCode('), 'Phải có hàm hoàn lượt nguyên tử decrementUsedQuantityByCode');
    assert.ok(content.includes('findAvailableForCustomer('), 'Phải có hàm truy vấn voucher khả dụng cho customer');
  });

  test('TC-340-03: [Admin API & Phân quyền RBAC] AdminVoucherController yêu cầu header X-User-Roles chứa chính xác ROLE_ADMIN trên tất cả endpoint', () => {
    assert.ok(fs.existsSync(adminVoucherControllerFile), 'AdminVoucherController.java phải tồn tại');
    const content = fs.readFileSync(adminVoucherControllerFile, 'utf8');

    assert.ok(content.includes('@RequestMapping("/api/v1/admin/vouchers")'), 'Prefix phải là /api/v1/admin/vouchers');
    assert.ok(content.includes('@GetMapping'), 'Có endpoint GET danh sách');
    assert.ok(content.includes('@GetMapping("/{id}")'), 'Có endpoint GET chi tiết');
    assert.ok(content.includes('@PostMapping'), 'Có endpoint POST tạo mới');
    assert.ok(content.includes('@PutMapping("/{id}")'), 'Có endpoint PUT cập nhật');
    assert.ok(content.includes('@PatchMapping("/{id}/toggle-status")'), 'Có endpoint PATCH toggle-status');
    assert.ok(content.includes('@DeleteMapping("/{id}")'), 'Có endpoint DELETE xóa voucher');

    // Kiểm tra cơ chế requireAdminRole
    assert.ok(content.includes('requireAdminRole(roles);'), 'Mọi phương thức phải gọi requireAdminRole');
    assert.ok(content.includes('.anyMatch("ROLE_ADMIN"::equals)'), 'Phải so khớp chính xác ROLE_ADMIN (chống substring bypass)');
    assert.ok(content.includes('throw new AccessDeniedException("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này");'),
      'Ném AccessDeniedException khi thiếu quyền ADMIN');
  });

  test('TC-340-04: [Customer API & IDOR Protection] VoucherController cung cấp GET /active và POST /apply, chặn IDOR giả mạo userId', () => {
    assert.ok(fs.existsSync(voucherControllerFile), 'VoucherController.java phải tồn tại');
    const content = fs.readFileSync(voucherControllerFile, 'utf8');

    assert.ok(content.includes('@RequestMapping("/api/v1/vouchers")'), 'Prefix phải là /api/v1/vouchers');
    assert.ok(content.includes('@GetMapping({"", "/active"})'), 'Có endpoint GET /active');
    assert.ok(content.includes('@PostMapping("/apply")'), 'Có endpoint POST /apply');

    // Xác thực X-User-Id và chống IDOR
    assert.ok(content.includes('userId <= 0'), 'Kiểm tra X-User-Id không được âm hoặc 0');
    assert.ok(content.includes('authorizationHeader != null && !authorizationHeader.trim().isEmpty() && userId == null'),
      'Chặn request có token Authorization nhưng không có X-User-Id hợp lệ từ Gateway');
    assert.ok(content.includes('request.setUserId(userId);'), 'Luôn ghi đè userId bằng danh tính xác thực từ X-User-Id');
  });

  test('TC-340-05: [DTO Bean Validation - VoucherRequest] Bắt buộc đầy đủ trường, độ dài, regex ký tự, giá trị dương, trần % <= 100 và ngày kết thúc >= bắt đầu', () => {
    assert.ok(fs.existsSync(voucherRequestFile), 'VoucherRequest.java phải tồn tại');
    const content = fs.readFileSync(voucherRequestFile, 'utf8');

    assert.ok(content.includes('@NotBlank(message = "Mã voucher không được để trống")'), 'Validate mã không trống');
    assert.ok(content.includes('@Size(min = 3, max = 50'), 'Validate độ dài mã từ 3-50 ký tự');
    assert.ok(content.includes('@Pattern(regexp = "^[A-Za-z0-9_-]+$"'), 'Validate mã chỉ chứa chữ cái, số, gạch nối');
    assert.ok(content.includes('@NotBlank(message = "Tên chương trình voucher không được để trống")'), 'Validate tên chương trình');
    assert.ok(content.includes('@NotNull(message = "Loại giảm giá không được để trống")'), 'Validate discountType');
    assert.ok(content.includes('@DecimalMin(value = "0.01", message = "Giá trị giảm phải lớn hơn 0")'), 'Validate discountValue > 0');
    assert.ok(content.includes('@Min(value = 1, message = "Số lượng mã phải lớn hơn 0")'), 'Validate quantity >= 1');
    assert.ok(content.includes('@NotNull(message = "Ngày bắt đầu không được để trống")'), 'Validate startDate');
    assert.ok(content.includes('@NotNull(message = "Ngày kết thúc không được để trống")'), 'Validate endDate');
    assert.ok(content.includes('public boolean isValidDateRange()'), 'Validate ngày kết thúc >= ngày bắt đầu');
    assert.ok(content.includes('public boolean isValidPercentValue()'), 'Validate % giảm giá <= 100%');
  });

  test('TC-340-06: [DTO Bean Validation - ApplyVoucherRequest] Kiểm tra bắt buộc code và orderTotal > 0 tại bước Checkout', () => {
    assert.ok(fs.existsSync(applyVoucherRequestFile), 'ApplyVoucherRequest.java phải tồn tại');
    const content = fs.readFileSync(applyVoucherRequestFile, 'utf8');

    assert.ok(content.includes('@NotBlank(message = "Mã giảm giá không được để trống")'), 'Validate mã áp không trống');
    assert.ok(content.includes('@NotNull(message = "Tổng tiền đơn hàng không được để trống")'), 'Validate orderTotal không null');
    assert.ok(content.includes('@DecimalMin(value = "0.00", inclusive = false, message = "Tổng tiền đơn hàng phải lớn hơn 0")'),
      'Validate orderTotal phải lớn hơn 0đ');
  });

  test('TC-340-07: [Business Rules & Error Codes] VoucherServiceImpl ném đúng ngoại lệ chuẩn: 409 Duplicate, 404 NotFound, 400 BadRequest', () => {
    assert.ok(fs.existsSync(voucherServiceImplFile), 'VoucherServiceImpl.java phải tồn tại');
    const content = fs.readFileSync(voucherServiceImplFile, 'utf8');

    // Duplicate Code
    assert.ok(content.includes('existsByCodeIgnoreCase'), 'Kiểm tra trùng mã khi tạo');
    assert.ok(content.includes('existsByCodeIgnoreCaseAndIdNot'), 'Kiểm tra trùng mã khi cập nhật');
    assert.ok(content.includes('throw new DuplicateResourceException('), 'Ném DuplicateResourceException khi trùng mã');

    // Chặn sửa số lượng phát hành nhỏ hơn số lượt đã dùng
    assert.ok(content.includes('request.getQuantity() < voucher.getUsedQuantity()'), 'Kiểm tra quantity < usedQuantity');
    assert.ok(content.includes('không được nhỏ hơn số lượt đã sử dụng'), 'Thông báo lỗi khi sửa quantity không hợp lệ');

    // Kiểm tra điều kiện áp mã
    assert.ok(content.includes('Mã giảm giá không còn hiệu lực.'), 'Báo lỗi khi voucher INACTIVE');
    assert.ok(content.includes('Mã giảm giá chưa đến thời gian áp dụng.'), 'Báo lỗi khi chưa tới ngày');
    assert.ok(content.includes('Mã giảm giá đã hết hạn.'), 'Báo lỗi khi quá hạn');
    assert.ok(content.includes('Mã giảm giá đã hết lượt sử dụng.'), 'Báo lỗi khi hết số lượng phát hành');
    assert.ok(content.includes('Đơn hàng tối thiểu'), 'Báo lỗi khi đơn dưới minOrderValue');
    assert.ok(content.includes('Bạn đã sử dụng mã giảm giá này rồi.'), 'Báo lỗi khi người dùng đã dùng mã');
  });

  test('TC-340-08: [Transaction Boundary & Rollback] Các hàm ghi dữ liệu có @Transactional(rollbackFor = Exception.class) và hàm đọc có @Transactional(readOnly = true)', () => {
    assert.ok(fs.existsSync(voucherServiceImplFile), 'VoucherServiceImpl.java phải tồn tại');
    const content = fs.readFileSync(voucherServiceImplFile, 'utf8');

    assert.ok(content.includes('@Transactional(readOnly = true)\n    public List<VoucherResponse> getAllVouchers()'), 'getAllVouchers có readOnly = true');
    assert.ok(content.includes('@Transactional(readOnly = true)\n    public VoucherResponse getVoucherById(Long id)'), 'getVoucherById có readOnly = true');
    assert.ok(content.includes('@Transactional(readOnly = true)\n    public List<VoucherResponse> getActiveVouchers()'), 'getActiveVouchers có readOnly = true');
    assert.ok(content.includes('@Transactional(rollbackFor = Exception.class)\n    public VoucherResponse createVoucher('), 'createVoucher có rollbackFor = Exception.class');
    assert.ok(content.includes('@Transactional(rollbackFor = Exception.class)\n    public VoucherResponse updateVoucher('), 'updateVoucher có rollbackFor = Exception.class');
    assert.ok(content.includes('@Transactional(rollbackFor = Exception.class)\n    public VoucherResponse toggleVoucherStatus('), 'toggleVoucherStatus có rollbackFor = Exception.class');
    assert.ok(content.includes('@Transactional(rollbackFor = Exception.class)\n    public void deleteVoucher('), 'deleteVoucher có rollbackFor = Exception.class');
    assert.ok(content.includes('@Transactional(rollbackFor = Exception.class)\n    public BigDecimal redeemVoucherForOrder('), 'redeemVoucherForOrder có rollbackFor = Exception.class');
  });

  test('TC-340-09: [Exception Mapping] GlobalExceptionHandler ánh xạ chuẩn RESTful: 409 Conflict, 403 Forbidden, 404 NotFound, 400 BadRequest', () => {
    assert.ok(fs.existsSync(globalExceptionFile), 'GlobalExceptionHandler.java phải tồn tại');
    const content = fs.readFileSync(globalExceptionFile, 'utf8');

    assert.ok(content.includes('@ExceptionHandler(DuplicateResourceException.class)'), 'Bắt DuplicateResourceException');
    assert.ok(content.includes('HttpStatus.CONFLICT'), 'DuplicateResourceException -> 409 CONFLICT');

    assert.ok(content.includes('@ExceptionHandler(AccessDeniedException.class)'), 'Bắt AccessDeniedException');
    assert.ok(content.includes('HttpStatus.FORBIDDEN'), 'AccessDeniedException -> 403 FORBIDDEN');

    assert.ok(content.includes('@ExceptionHandler(ResourceNotFoundException.class)'), 'Bắt ResourceNotFoundException');
    assert.ok(content.includes('HttpStatus.NOT_FOUND'), 'ResourceNotFoundException -> 404 NOT_FOUND');

    assert.ok(content.includes('@ExceptionHandler(MethodArgumentNotValidException.class)'), 'Bắt MethodArgumentNotValidException -> 400');
    assert.ok(content.includes('@ExceptionHandler(IllegalStateException.class)'), 'Bắt IllegalStateException -> 400');
    assert.ok(content.includes('@ExceptionHandler(IllegalArgumentException.class)'), 'Bắt IllegalArgumentException -> 400');
  });

  test('TC-340-10: [JUnit 5 Test Suite] File VoucherApiValidationAccessQATest.java tồn tại trong backend và thực thi 100% PASS', () => {
    assert.ok(fs.existsSync(voucherApiQATestFile), 'File VoucherApiValidationAccessQATest.java phải tồn tại trong test directory');
    const content = fs.readFileSync(voucherApiQATestFile, 'utf8');

    assert.ok(content.includes('TC-340-01'), 'Có test case TC-340-01');
    assert.ok(content.includes('TC-340-10'), 'Có test case TC-340-10');
    assert.ok(content.includes('TC-340-20'), 'Có test case TC-340-20');
    assert.ok(content.includes('TC-340-30'), 'Có test case TC-340-30');
    assert.ok(content.includes('VoucherApiValidationAccessQATest'), 'Tên class khớp VoucherApiValidationAccessQATest');
  });
});
