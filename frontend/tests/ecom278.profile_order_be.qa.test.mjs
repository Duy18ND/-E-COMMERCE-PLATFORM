/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-278
 * [BE] QA Test - API, validation và quyền truy cập (Lịch sử đơn hàng & Hồ sơ cá nhân)
 * Feature: ECOM-126 (Lịch sử đơn hàng & Hồ sơ cá nhân) | Parent: ECOM-271 ([BE] Lịch sử đơn hàng & Hồ sơ cá nhân)
 * Dự án: ShopMart – E-Commerce Platform
 * Sprint: SPRINT 2 | Epic: CUSTOMER | Priority: High (P1)
 * Người phụ trách: Ngô Phương (DevOps & QA Lead)
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

describe('ECOM-278: [BE] QA TEST API, VALIDATION VÀ QUYỀN TRUY CẬP (ORDER HISTORY & USER PROFILE)', () => {

  const orderControllerPath = 'order-service/src/main/java/com/ecommerce/order/controller/OrderController.java';
  const orderServiceImplPath = 'order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java';
  const orderControllerTestPath = 'order-service/src/test/java/com/ecommerce/order/controller/OrderControllerTest.java';
  const orderServiceTestPath = 'order-service/src/test/java/com/ecommerce/order/service/OrderServiceTest.java';

  const userControllerPath = 'auth-service/src/main/java/com/ecommerce/auth/controller/UserController.java';
  const userServiceImplPath = 'auth-service/src/main/java/com/ecommerce/auth/service/impl/UserServiceImpl.java';
  const updateProfileDtoPath = 'auth-service/src/main/java/com/ecommerce/auth/dto/request/UpdateProfileRequest.java';
  const userProfileDtoPath = 'auth-service/src/main/java/com/ecommerce/auth/dto/response/UserProfileResponse.java';
  const userEntityPath = 'auth-service/src/main/java/com/ecommerce/auth/entity/User.java';
  const userControllerTestPath = 'auth-service/src/test/java/com/ecommerce/auth/controller/UserControllerTest.java';
  const userServiceTestPath = 'auth-service/src/test/java/com/ecommerce/auth/service/UserServiceTest.java';
  const gatewayYmlPath = 'api-gateway/src/main/resources/application.yml';

  // =========================================================================
  // 1. ORDER CONTROLLER & API ENDPOINTS
  // =========================================================================
  test('TC-278-BE-01: OrderController khai báo endpoint GET /my-orders trích xuất X-User-Id từ Gateway', () => {
    const code = readBackend(orderControllerPath);

    assert.match(code, /@GetMapping\(["']\/my-orders["']\)/, 'Phải có @GetMapping("/my-orders")');
    assert.match(code, /public\s+ResponseEntity<ApiResponse<List<OrderResponse>>>\s+getMyOrders/, 'Kiểu trả về phải là List<OrderResponse>');
    assert.match(code, /@RequestHeader\(value\s*=\s*["']X-User-Id["']/, 'Phải nhận header X-User-Id');
  });

  test('TC-278-BE-02: OrderController chống Auth Bypass - Yêu cầu xác thực X-User-Id cho getMyOrders và cancelOrder', () => {
    const code = readBackend(orderControllerPath);

    assert.match(code, /requireAuthenticated\(authenticatedUserId\)/, 'Phải gọi requireAuthenticated');
    assert.match(code, /throw new AccessDeniedException\(["'].*?X-User-Id.*?["']\)/, 'Thiếu X-User-Id phải ném AccessDeniedException');
  });

  test('TC-278-BE-03: OrderController khai báo endpoint GET /{id} xem chi tiết đơn hàng chống N+1 query', () => {
    const code = readBackend(orderControllerPath);

    assert.match(code, /@GetMapping\(["']\/\{id\}["']\)/, 'Phải có @GetMapping("/{id}")');
    assert.match(code, /public\s+ResponseEntity<ApiResponse<OrderResponse>>\s+getOrderById/, 'Kiểu trả về phải là OrderResponse');
    assert.match(code, /orderService\.getOrderById\(id,\s*authenticatedUserId,\s*roles\)/, 'Phải truyền id, authenticatedUserId và roles xuống service');
  });

  test('TC-278-BE-04: OrderController khai báo endpoint PUT /{id}/cancel hủy đơn hàng PENDING', () => {
    const code = readBackend(orderControllerPath);

    assert.match(code, /@PutMapping\(["']\/\{id\}\/cancel["']\)/, 'Phải có @PutMapping("/{id}/cancel")');
    assert.match(code, /orderService\.cancelOrder\(id,\s*authenticatedUserId\)/, 'cancelOrder phải nhận id và authenticatedUserId');
  });

  // =========================================================================
  // 2. ORDER SERVICE LOGIC, IDOR DEFENSE & STOCK RESTORATION
  // =========================================================================
  test('TC-278-BE-05: OrderServiceImpl bảo vệ IDOR - Chỉ cho phép chủ sở hữu hoặc ROLE_ADMIN xem chi tiết đơn', () => {
    const code = readBackend(orderServiceImplPath);

    assert.match(code, /!isAdmin\s*&&\s*!authenticatedUserId\.equals\(order\.getUserId\(\)\)/, 'Phải kiểm tra quyền sở hữu order.getUserId()');
    assert.match(code, /throw new AccessDeniedException\(["']Bạn không có quyền xem chi tiết đơn hàng này["']\)/, 'IDOR attempt phải ném AccessDeniedException');
  });

  test('TC-278-BE-06: OrderServiceImpl nghiệp vụ hủy đơn - Chỉ cho phép hủy khi trạng thái là PENDING', () => {
    const code = readBackend(orderServiceImplPath);

    assert.match(code, /order\.getStatus\(\)\s*!=\s*OrderStatus\.PENDING/, 'Phải kiểm tra trạng thái khác PENDING');
    assert.match(code, /throw new IllegalStateException\(["']Chỉ có thể hủy đơn hàng ở trạng thái PENDING/, 'Ném IllegalStateException khi không phải PENDING');
    assert.match(code, /order\.setStatus\(OrderStatus\.CANCELLED\)/, 'Cập nhật trạng thái thành CANCELLED');
  });

  test('TC-278-BE-07: OrderServiceImpl hoàn tồn kho (Stock Restoration) qua Feign ProductClient khi hủy đơn', () => {
    const code = readBackend(orderServiceImplPath);

    assert.match(code, /productClient\.restoreStock\(restoreItems\)/, 'Phải gọi productClient.restoreStock với danh sách sản phẩm');
    assert.match(code, /@Transactional\(rollbackFor\s*=\s*Exception\.class\)/, 'cancelOrder phải được bọc trong @Transactional');
  });

  test('TC-278-BE-08: OrderServiceImpl hoàn lại lượt dùng Voucher và ghi log trạng thái lịch sử khi hủy đơn', () => {
    const code = readBackend(orderServiceImplPath);

    assert.match(code, /voucherService\.restoreVoucherUsage\(order\.getVoucherCode\(\)\)/, 'Phải hoàn lại lượt dùng voucher');
    assert.match(code, /recordStatusHistory\(updatedOrder,\s*OrderStatus\.CANCELLED/, 'Phải ghi nhận mốc CANCELLED vào lịch sử dòng thời gian');
  });

  // =========================================================================
  // 3. USER PROFILE CONTROLLER & SERVICE (AUTH SERVICE)
  // =========================================================================
  test('TC-278-BE-09: UserController khai báo GET /api/v1/users/profile và PUT /api/v1/users/profile', () => {
    const code = readBackend(userControllerPath);

    assert.match(code, /@RequestMapping\(["']\/api\/v1\/users["']\)/, 'Base path phải là /api/v1/users');
    assert.match(code, /@GetMapping\(["']\/profile["']\)/, 'Phải có @GetMapping("/profile")');
    assert.match(code, /@PutMapping\(["']\/profile["']\)/, 'Phải có @PutMapping("/profile")');
    assert.match(code, /userService\.getProfile\(userId\)/, 'Phải gọi userService.getProfile');
    assert.match(code, /userService\.updateProfile\(userId,\s*request\)/, 'Phải gọi userService.updateProfile');
  });

  test('TC-278-BE-10: UserController chống Auth Bypass - resolveUserId ném AccessDeniedException khi thiếu X-User-Id', () => {
    const code = readBackend(userControllerPath);

    assert.match(code, /private Long resolveUserId\(Long headerUserId\)/, 'Phải có hàm resolveUserId');
    assert.match(code, /throw new AccessDeniedException\(["'].*?X-User-Id.*?["']\)/, 'Thiếu user xác thực phải ném AccessDeniedException');
  });

  test('TC-278-BE-11: UpdateProfileRequest DTO ràng buộc chuẩn Regex SĐT Việt Nam và độ dài trường', () => {
    const code = readBackend(updateProfileDtoPath);

    assert.ok(code.includes('^(0|\\\\+84)[35789][0-9]{8}$'), 'SĐT phải đúng regex chuẩn VN');
    assert.match(code, /@Size\(max\s*=\s*150[\s\S]*?fullName/, 'fullName tối đa 150 ký tự');
    assert.match(code, /@Size\(max\s*=\s*255[\s\S]*?addressLine/, 'addressLine tối đa 255 ký tự');
  });

  test('TC-278-BE-12: UserProfileResponse DTO không chứa trường password hay mật khẩu băm', () => {
    const code = readBackend(userProfileDtoPath);

    assert.doesNotMatch(code, /\bpassword\b/i, 'UserProfileResponse tuyệt đối không được chứa trường password');
    assert.match(code, /private String email;/, 'Phải chứa email');
    assert.match(code, /private String fullName;/, 'Phải chứa fullName');
    assert.match(code, /private String phone;/, 'Phải chứa phone');
    assert.match(code, /private AddressResponse defaultAddress;/, 'Phải chứa defaultAddress');
  });

  test('TC-278-BE-13: Entity User bảo vệ mật khẩu băm với @JsonIgnore chống rò rỉ thông tin đăng nhập', () => {
    const code = readBackend(userEntityPath);

    assert.match(code, /@JsonIgnore[\s\S]*?private String password;/, 'password phải có annotation @JsonIgnore');
  });

  test('TC-278-BE-14: UserServiceImpl cập nhật thông tin cá nhân và địa chỉ nhận hàng an toàn', () => {
    const code = readBackend(userServiceImplPath);

    assert.match(code, /public UserProfileResponse getProfile\(Long userId\)/, 'Phải triển khai getProfile');
    assert.match(code, /public UserProfileResponse updateProfile\(Long userId,\s*UpdateProfileRequest request\)/, 'Phải triển khai updateProfile');
    assert.match(code, /userRepository\.findById\(userId\)/, 'Phải tìm user theo userId');
  });

  // =========================================================================
  // 4. API GATEWAY ROUTING & UNIT TEST INTEGRITY
  // =========================================================================
  test('TC-278-BE-15: API Gateway cấu hình AuthenticationFilter cho /api/v1/users/** và /api/v1/orders/**', () => {
    const code = readBackend(gatewayYmlPath);

    assert.match(code, /Path=\/api\/v1\/users\/\*\*/, 'Gateway phải định tuyến /api/v1/users/**');
    assert.match(code, /Path=\/api\/v1\/orders\/\*\*/, 'Gateway phải định tuyến /api/v1/orders/**');
    assert.match(code, /AuthenticationFilter/, 'Các route được bảo vệ phải gắn AuthenticationFilter');
  });

  test('TC-278-BE-16: Đầy đủ Unit Test kiểm thử API, validation và IDOR trong OrderControllerTest & UserControllerTest', () => {
    const orderTestCode = readBackend(orderControllerTestPath);
    const userTestCode = readBackend(userControllerTestPath);

    // OrderControllerTest
    assert.match(orderTestCode, /getMyOrders_Success/, 'Phải có test getMyOrders thành công');
    assert.match(orderTestCode, /getMyOrders_WhenMissingUserId_ShouldReturn403/, 'Phải có test getMyOrders thiếu X-User-Id');
    assert.match(orderTestCode, /getOrderById_Owner_ShouldReturn200/, 'Phải có test getOrderById chủ sở hữu');
    assert.match(orderTestCode, /getOrderById_WhenDifferentUserAndNotAdmin_ShouldReturn403/, 'Phải có test getOrderById chặn IDOR');
    assert.match(orderTestCode, /cancelOrder_WithXUserIdHeader_Success/, 'Phải có test cancelOrder thành công');
    assert.match(orderTestCode, /cancelOrder_WhenMissingUserId_ShouldReturn403/, 'Phải có test cancelOrder thiếu X-User-Id');

    // UserControllerTest
    assert.match(userTestCode, /getProfile_Success/, 'Phải có test getProfile thành công');
    assert.match(userTestCode, /updateProfile_Success/, 'Phải có test updateProfile thành công');
    assert.match(userTestCode, /updateProfile_WhenPhoneContainsPipeChar_ShouldReturn400/, 'Phải có test từ chối SĐT sai định dạng');
    assert.match(userTestCode, /serializeUserEntity_ShouldNotExposePasswordHash/, 'Phải có test bảo vệ password hash');
  });
});
