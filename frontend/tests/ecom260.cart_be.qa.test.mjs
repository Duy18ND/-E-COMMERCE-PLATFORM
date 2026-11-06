/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-260
 * [BE] QA Test - API, validation và quyền truy cập (Quản lý giỏ hàng)
 * Feature: ECOM-117 (Quản lý giỏ hàng) | Parent: ECOM-252 ([BE] Quản lý giỏ hàng)
 * Dự án: ShopMart – E-Commerce Platform
 * Sprint: SPRINT 2 | Epic: CUSTOMER | Priority: Highest (P0)
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
const readFrontend = (relPath) => fs.readFileSync(path.join(rootDir, 'frontend', relPath), 'utf8');
const readPostman = (relPath) => fs.readFileSync(path.join(rootDir, 'postman', relPath), 'utf8');

describe('ECOM-260: [BE] QA TEST API, VALIDATION VÀ QUYỀN TRUY CẬP (QUẢN LÝ GIỎ HÀNG)', () => {

  test('TC-260-BE-01: CartController khai báo đầy đủ 5 Endpoint RESTful Quản lý giỏ hàng', () => {
    const controller = readBackend('order-service/src/main/java/com/ecommerce/order/controller/CartController.java');

    assert.match(controller, /@RequestMapping\(["']\/api\/v1\/cart["']\)/, 'Base path phải là /api/v1/cart');
    assert.match(controller, /@GetMapping[\s\S]*?public ResponseEntity<ApiResponse<CartResponse>> getCart/, 'Phải có GET xem giỏ hàng');
    assert.match(controller, /@PostMapping\(["']\/items["']\)[\s\S]*?addToCart/, 'Phải có POST /items thêm sản phẩm vào giỏ');
    assert.match(controller, /@PutMapping\(["']\/items\/\{itemId\}["']\)[\s\S]*?updateCartItem/, 'Phải có PUT /items/{itemId} cập nhật số lượng');
    assert.match(controller, /@DeleteMapping\(["']\/items\/\{itemId\}["']\)[\s\S]*?removeCartItem/, 'Phải có DELETE /items/{itemId} xóa sản phẩm');
    assert.match(controller, /@DeleteMapping\(value\s*=\s*\{["']["'],\s*["']\/clear["']\}\)[\s\S]*?clearCart/, 'Phải có DELETE /cart và /clear xóa toàn bộ giỏ');
  });

  test('TC-260-BE-02: Cơ chế xác thực và phân quyền trên CartController bắt buộc có header X-User-Id', () => {
    const controller = readBackend('order-service/src/main/java/com/ecommerce/order/controller/CartController.java');

    assert.match(controller, /private void validateAuthenticatedUser\(Long userId\)/, 'Phải có hàm validateAuthenticatedUser kiểm tra đăng nhập');
    assert.match(controller, /if\s*\(userId\s*==\s*null\)\s*\{\s*throw new AccessDeniedException/, 'Ném AccessDeniedException khi thiếu X-User-Id');
    assert.match(controller, /@RequestHeader\(value\s*=\s*["']X-User-Id["'],\s*required\s*=\s*false\)/, 'Đọc authenticatedUserId từ header X-User-Id');
  });

  test('TC-260-BE-03: Phòng chống tấn công IDOR trên giỏ hàng (ngăn User A sửa/xóa item trong giỏ của User B)', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/CartServiceImpl.java');

    // Chống IDOR khi cập nhật số lượng
    assert.match(service, /if\s*\(!item\.getCart\(\)\.getUserId\(\)\.equals\(userId\)\)\s*\{\s*throw new AccessDeniedException/, 'Chặn user khác sửa item qua check getUserId()');
    // Chống IDOR khi xóa sản phẩm
    assert.match(service, /cart\.getItems\(\)\.stream\(\)[\s\S]*?\.filter\(item -> item\.getId\(\)\.equals\(itemId\)\)/, 'Chỉ tìm và xóa item trong giỏ của chính user');
  });

  test('TC-260-BE-04: DTO AddToCartRequest định nghĩa ràng buộc validation đầy đủ', () => {
    const dto = readBackend('order-service/src/main/java/com/ecommerce/order/dto/request/AddToCartRequest.java');

    assert.match(dto, /@NotNull\(message\s*=\s*["']Product ID không được để trống["']\)/, 'Chặn productId null');
    assert.match(dto, /@NotNull\(message\s*=\s*["']Số lượng không được để trống["']\)/, 'Chặn quantity null');
    assert.match(dto, /@Min\(value\s*=\s*1,\s*message\s*=\s*["']Số lượng phải lớn hơn hoặc bằng 1["']\)/, 'Chặn quantity <= 0');
  });

  test('TC-260-BE-05: DTO UpdateCartItemRequest định nghĩa ràng buộc validation đầy đủ', () => {
    const dto = readBackend('order-service/src/main/java/com/ecommerce/order/dto/request/UpdateCartItemRequest.java');

    assert.match(dto, /@NotNull\(message\s*=\s*["']Số lượng không được để trống["']\)/, 'Chặn quantity null');
    assert.match(dto, /@Min\(value\s*=\s*1,\s*message\s*=\s*["']Số lượng phải lớn hơn hoặc bằng 1["']\)/, 'Chặn quantity <= 0');
  });

  test('TC-260-BE-06: DTO CartResponse và CartItemResponse hỗ trợ đầy đủ các trường và alias tương thích Frontend', () => {
    const cartRes = readBackend('order-service/src/main/java/com/ecommerce/order/dto/response/CartResponse.java');
    const itemRes = readBackend('order-service/src/main/java/com/ecommerce/order/dto/response/CartItemResponse.java');

    assert.match(cartRes, /private BigDecimal totalAmount;/, 'CartResponse phải có totalAmount');
    assert.match(cartRes, /public BigDecimal getTotalPrice\(\)/, 'CartResponse phải có alias getTotalPrice');

    assert.match(itemRes, /private BigDecimal subTotal;/, 'CartItemResponse phải có subTotal');
    assert.match(itemRes, /private Integer stockAvailable;/, 'CartItemResponse phải có stockAvailable');
    assert.match(itemRes, /public Long getItemId\(\)/, 'CartItemResponse phải có alias getItemId');
    assert.match(itemRes, /public String getName\(\)/, 'CartItemResponse phải có alias getName');
    assert.match(itemRes, /public BigDecimal getUnitPrice\(\)/, 'CartItemResponse phải có alias getUnitPrice');
  });

  test('TC-260-BE-07: Kiểm tra tồn kho phía Server (validateProductStock) chặn thêm khi không đủ tồn kho', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/CartServiceImpl.java');

    assert.match(service, /validateProductStock\(ProductResponse\s+product,\s*int\s+requestedQuantity\)/, 'Phải có hàm validateProductStock');
    assert.match(service, /product\.getStockQuantity\(\)\s*<\s*requestedQuantity/, 'Kiểm tra tồn kho nhỏ hơn số lượng yêu cầu');
    assert.match(service, /throw new NotEnoughStockException[\s\S]*?không đủ số lượng tồn kho/, 'Ném NotEnoughStockException khi thiếu tồn kho');
  });

  test('TC-260-BE-08: Kiểm tra trạng thái kinh doanh của sản phẩm chặn thêm sản phẩm ngừng kinh doanh', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/CartServiceImpl.java');

    assert.match(service, /!"ACTIVE"\.equalsIgnoreCase\(product\.getStatus\(\)\)/, 'Kiểm tra sản phẩm khác ACTIVE');
    assert.match(service, /throw new NotEnoughStockException[\s\S]*?hiện không còn kinh doanh/, 'Chặn thêm sản phẩm INACTIVE / ngừng bán');
  });

  test('TC-260-BE-09: Cơ chế cộng dồn số lượng khi thêm sản phẩm đã có trong giỏ và kiểm tra tồn kho tổng', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/CartServiceImpl.java');

    assert.match(service, /int targetQuantity = request\.getQuantity\(\);/, 'Khởi tạo targetQuantity');
    assert.match(service, /targetQuantity\s*\+=\s*existingItemOpt\.get\(\)\.getQuantity\(\);/, 'Cộng dồn số lượng đã có trong giỏ');
    assert.match(service, /validateProductStock\(product,\s*targetQuantity\);/, 'Kiểm tra tồn kho dựa trên targetQuantity cộng dồn');
  });

  test('TC-260-BE-10: Tính toán tiền tệ phía Server sử dụng BigDecimal đảm bảo độ chính xác tài chính', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/CartServiceImpl.java');

    assert.match(service, /BigDecimal subTotal\s*=\s*price\.multiply\(BigDecimal\.valueOf\(item\.getQuantity\(\)\)\);/, 'Tính subTotal = price * quantity bằng BigDecimal');
    assert.match(service, /totalAmount\s*=\s*totalAmount\.add\(subTotal\);/, 'Tính tổng totalAmount = sum(subTotal) bằng BigDecimal');
    assert.match(service, /totalItems\s*\+=\s*item\.getQuantity\(\);/, 'Tính tổng số lượng sản phẩm totalItems');
  });

  test('TC-260-BE-11: API Gateway application.yml định cấu hình Route /api/v1/cart/** tới order-service có RateLimiter', () => {
    const yml = readBackend('api-gateway/src/main/resources/application.yml');

    assert.match(yml, /Path=\/api\/v1\/orders\/\*\*,\/api\/v1\/cart\/\*\*/, 'Route bao gồm /api/v1/cart/**');
    assert.match(yml, /uri:\s*lb:\/\/order-service/, 'Định tuyến đến lb://order-service');
    assert.match(yml, /AuthenticationFilter/, 'Có bộ lọc xác thực AuthenticationFilter');
    assert.match(yml, /name:\s*RequestRateLimiter/, 'Có Rate Limiter bảo vệ API');
  });

  test('TC-260-BE-12: GlobalExceptionHandler trong order-service ánh xạ đúng các mã lỗi chuẩn RESTful', () => {
    const handler = readBackend('order-service/src/main/java/com/ecommerce/order/exception/GlobalExceptionHandler.java');

    assert.match(handler, /handleAccessDeniedException[\s\S]*?HttpStatus\.FORBIDDEN/, 'AccessDeniedException trả về 403 Forbidden');
    assert.match(handler, /handleResourceNotFoundException[\s\S]*?HttpStatus\.NOT_FOUND/, 'ResourceNotFoundException trả về 404 Not Found');
    assert.match(handler, /handleNotEnoughStockException[\s\S]*?HttpStatus\.CONFLICT/, 'NotEnoughStockException trả về 409 Conflict');
    assert.match(handler, /handleValidationException[\s\S]*?HttpStatus\.BAD_REQUEST/, 'Validation lỗi trả về 400 Bad Request');
    assert.match(handler, /handleHttpMessageNotReadableException[\s\S]*?HttpStatus\.BAD_REQUEST/, 'JSON sai định dạng trả về 400 Bad Request');
  });

  test('TC-260-BE-13: Frontend cartService.js tích hợp chuẩn xác với Backend Cart Controller', () => {
    const feService = readFrontend('src/services/cartService.js');

    assert.match(feService, /api\.get\(['"]\/cart['"]\)/, 'Gọi GET /cart');
    assert.match(feService, /api\.post\(['"]\/cart\/items['"],/, 'Gọi POST /cart/items');
    assert.match(feService, /api\.put\([`']\/cart\/items\/\$\{itemId\}[`'],/, 'Gọi PUT /cart/items/{itemId}');
    assert.match(feService, /api\.delete\([`']\/cart\/items\/\$\{itemId\}[`']\)/, 'Gọi DELETE /cart/items/{itemId}');
    assert.match(feService, /api\.delete\(['"]\/cart\/clear['"]\)/, 'Gọi DELETE /cart/clear');
  });

  test('TC-260-BE-14: Bộ sưu tập Postman ECOM-260 được khởi tạo đầy đủ 4 thư mục kiểm thử chức năng và bảo mật', () => {
    const postmanRaw = readPostman('ShopMart_ECOM-260_Cart_QA.postman_collection.json');
    const collection = JSON.parse(postmanRaw);

    assert.equal(collection.info.name, 'ShopMart - ECOM-260 [BE] QA Test Quản Lý Giỏ Hàng (API, Validation & Access Control)');
    assert.equal(collection.item.length, 4, 'Bao gồm 4 thư mục kiểm thử');
    const folderNames = collection.item.map((f) => f.name);
    assert.ok(folderNames.includes('01. Authentication Setup'), 'Có thư mục Auth Setup');
    assert.ok(folderNames.includes('02. Functional Cart API (Happy Path)'), 'Có thư mục Functional Happy Path');
    assert.ok(folderNames.includes('03. Validation & Negative Cases'), 'Có thư mục Validation & Negative Cases');
    assert.ok(folderNames.includes('04. Authorization & IDOR Security'), 'Có thư mục Authorization & IDOR Security');
  });

  test('TC-260-BE-15: Bộ kiểm thử Unit Test Backend CartControllerTest và CartServiceTest bao phủ các kịch bản ECOM-260', () => {
    const controllerTest = readBackend('order-service/src/test/java/com/ecommerce/order/controller/CartControllerTest.java');
    const serviceTest = readBackend('order-service/src/test/java/com/ecommerce/order/service/CartServiceTest.java');

    assert.match(controllerTest, /void addToCart_InvalidQuantity_ShouldReturnBadRequest\(\)/, 'Test case validation quantity invalid');
    assert.match(controllerTest, /void updateCartItem_InvalidQuantity_ShouldReturnBadRequest\(\)/, 'Test case update quantity invalid');
    assert.match(controllerTest, /void getCart_WithoutHeader_ShouldReturnForbidden\(\)/, 'Test case missing header X-User-Id');
    assert.match(controllerTest, /void getCart_VerifyServerCalculatedTotals\(\)/, 'Test case server calculated totals');

    assert.match(serviceTest, /void addToCart_NotEnoughStock_ThrowsNotEnoughStockException\(\)/, 'Test case stock shortage');
    assert.match(serviceTest, /void addToCart_InactiveProduct_ThrowsNotEnoughStockException\(\)/, 'Test case inactive product');
    assert.match(serviceTest, /void updateCartItem_Unauthorized_ThrowsAccessDeniedException\(\)/, 'Test case IDOR defense on update');
    assert.match(serviceTest, /void removeCartItem_ItemNotBelongToUserCart_ThrowsResourceNotFoundException\(\)/, 'Test case IDOR defense on remove');
    assert.match(serviceTest, /void getCart_MultipleItems_CalculatesTotalAmountCorrectlyOnServer\(\)/, 'Test case server precision calculation');
  });
});
