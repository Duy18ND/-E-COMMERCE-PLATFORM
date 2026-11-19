import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const readBackendSrc = (relPath) => fs.readFileSync(path.join(rootDir, 'backend', relPath), 'utf8');
const readFrontendSrc = (relPath) => fs.readFileSync(path.join(rootDir, 'frontend', relPath), 'utf8');

// =========================================================================
// TEST SUITE: TASK ECOM-296 - [BE] QA TEST API, VALIDATION VÀ QUYỀN TRUY CẬP (QUẢN TRỊ ĐƠN HÀNG)
// =========================================================================

test('TC-296-BE-01: AdminOrderController khai báo đầy đủ 4 Endpoint Quản trị đơn hàng toàn hệ thống', () => {
  const controller = readBackendSrc('order-service/src/main/java/com/ecommerce/order/controller/AdminOrderController.java');

  assert.match(controller, /@RequestMapping\(["']\/api\/v1\/admin\/orders["']\)/, 'Base path phải là /api/v1/admin/orders');
  assert.match(controller, /@GetMapping[\s\S]*?public ResponseEntity<ApiResponse<PagedResponse<OrderResponse>>> getAllOrders/, 'Phải có GET danh sách đơn hàng toàn hệ thống');
  assert.match(controller, /@PutMapping\(["']\/\{id\}\/status["']\)/, 'Phải có PUT /{id}/status cập nhật trạng thái');
  assert.match(controller, /@GetMapping\(["']\/\{id\}\/history["']\)/, 'Phải có GET /{id}/history lấy timeline lịch sử');
  assert.match(controller, /@GetMapping\(\{?["']\/statistics["']/, 'Phải có GET /statistics lấy thống kê dashboard');
});

test('TC-296-BE-02: Cơ chế RBAC kiểm tra quyền ADMIN chặt chẽ (chống bypass role giả mạo / substring)', () => {
  const controller = readBackendSrc('order-service/src/main/java/com/ecommerce/order/controller/AdminOrderController.java');

  assert.match(controller, /private void requireAdminRole\(String roles\)/, 'Phải có phương thức helper requireAdminRole');
  assert.match(controller, /"ROLE_ADMIN"::equals/, 'Phải so khớp chính xác chuỗi ROLE_ADMIN qua method reference chống bypass substring');
  assert.match(controller, /throw new AccessDeniedException\(["']Chỉ tài khoản ADMIN/, 'Ném AccessDeniedException khi không có quyền');
});

test('TC-296-BE-03: DTO UpdateOrderStatusRequest định nghĩa validation ràng buộc chặt chẽ', () => {
  const dto = readBackendSrc('order-service/src/main/java/com/ecommerce/order/dto/request/UpdateOrderStatusRequest.java');

  assert.match(dto, /@NotNull\(message\s*=\s*["']Trạng thái đơn hàng không được để trống["']\)/, 'Trường status phải có @NotNull');
  assert.match(dto, /@Size\(max\s*=\s*1000,\s*message\s*=\s*["']Ghi chú không được vượt quá 1000 ký tự["']\)/, 'Trường note phải giới hạn tối đa 1000 ký tự');
});

test('TC-296-BE-04: GlobalExceptionHandler xử lý đúng các HTTP Status Code chuẩn RESTful (400, 403, 404, 409, 500)', () => {
  const handler = readBackendSrc('order-service/src/main/java/com/ecommerce/order/exception/GlobalExceptionHandler.java');

  assert.match(handler, /@ExceptionHandler\(AccessDeniedException\.class\)[\s\S]*?handleAccessDeniedException/, 'Xử lý AccessDeniedException trả về 403 Forbidden');
  assert.match(handler, /HttpStatus\.FORBIDDEN/, 'HTTP Status phải là 403 Forbidden');

  assert.match(handler, /@ExceptionHandler\(ResourceNotFoundException\.class\)/, 'Xử lý ResourceNotFoundException trả về 404 Not Found');
  assert.match(handler, /HttpStatus\.NOT_FOUND/, 'HTTP Status phải là 404 Not Found');

  assert.match(handler, /@ExceptionHandler\(IllegalStateException\.class\)/, 'Xử lý IllegalStateException (chuyển sai State Machine) trả về 400 Bad Request');
  assert.match(handler, /@ExceptionHandler\(MethodArgumentNotValidException\.class\)/, 'Xử lý MethodArgumentNotValidException trả về 400 Bad Request');
  assert.match(handler, /@ExceptionHandler\(org\.springframework\.http\.converter\.HttpMessageNotReadableException\.class\)/, 'Xử lý HttpMessageNotReadableException (sai enum / JSON malformed) trả về 400 Bad Request');
});

test('TC-296-BE-05: OrderServiceImpl tuân thủ State Machine ALLOWED_TRANSITIONS và ghi nhận lịch sử đồng bộ', () => {
  const service = readBackendSrc('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

  assert.match(service, /ALLOWED_TRANSITIONS\s*=\s*Map\.of/, 'Định nghĩa sơ đồ chuyển trạng thái ALLOWED_TRANSITIONS');
  assert.match(service, /ALLOWED_TRANSITIONS\.getOrDefault\(currentStatus,\s*Collections\.emptySet\(\)\)/, 'Lấy tập trạng thái kế tiếp cho phép');
  assert.match(service, /if\s*\(!allowedNext\.contains\(newStatus\)\)\s*\{\s*throw new IllegalStateException/, 'Chặn chuyển trạng thái trái phép');
  assert.match(service, /recordStatusHistory\(savedOrder,\s*newStatus,\s*currentStatus,\s*["']ADMIN_STATUS_UPDATE["']/, 'Ghi nhận lịch sử trạng thái kèm action ADMIN_STATUS_UPDATE');
});

test('TC-296-BE-06: Chuyển sang CANCELLED bắt buộc gọi hoàn kho ProductClient.restoreStock và hoàn voucher', () => {
  const service = readBackendSrc('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

  assert.match(service, /if\s*\(newStatus\s*==\s*OrderStatus\.CANCELLED\)/, 'Kiểm tra khi chuyển sang CANCELLED');
  assert.match(service, /productClient\.restoreStock\(restoreItems\);/, 'Gọi FeignClient ProductClient.restoreStock hoàn lại kho');
  assert.match(service, /voucherService\.restoreVoucherUsage\(order\.getVoucherCode\(\)\);/, 'Hoàn lại lượt sử dụng voucher');
});

test('TC-296-BE-07: Bộ kiểm thử chuyên biệt AdminOrderApiQATest.java được khởi tạo đầy đủ 6 nhóm kiểm thử', () => {
  const testFile = readBackendSrc('order-service/src/test/java/com/ecommerce/order/controller/AdminOrderApiQATest.java');

  assert.match(testFile, /@DisplayName\(["']\[ECOM-296\] QA Test - Quản trị đơn hàng: API, validation và quyền truy cập["']\)/, 'Test class định danh ECOM-296');
  assert.match(testFile, /class RbacAndSecurityTests/, 'Nhóm 1: RBAC and Security Tests');
  assert.match(testFile, /class OrderListingTests/, 'Nhóm 2: Order Listing and Filtering Tests');
  assert.match(testFile, /class UpdateOrderStatusTests/, 'Nhóm 3: Update Order Status and State Machine Tests');
  assert.match(testFile, /class ValidationAndEdgeCasesTests/, 'Nhóm 4: Validation and Edge Cases Tests');
  assert.match(testFile, /class OrderStatusHistoryTests/, 'Nhóm 5: Order Status History Timeline Tests');
  assert.match(testFile, /class OrderStatisticsTests/, 'Nhóm 6: Dashboard Statistics Tests');
});

test('TC-296-BE-08: Bộ kiểm thử Postman ECOM-296 được khởi tạo đầy đủ các nhóm kiểm thử API Quản trị đơn hàng', () => {
  const postmanPath = path.join(rootDir, 'postman/ShopMart_ECOM-296_Admin_Order_QA.postman_collection.json');
  assert.ok(fs.existsSync(postmanPath), 'File ShopMart_ECOM-296_Admin_Order_QA.postman_collection.json phải tồn tại');

  const content = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));
  assert.ok(content.item && content.item.length >= 4, 'Collection phải có ít nhất 4 thư mục kiểm thử');
  assert.match(content.info.name, /ECOM-296/, 'Tên Collection phải chứa mã ECOM-296');
});
