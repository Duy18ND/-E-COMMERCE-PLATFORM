import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '../../backend');
const frontendDir = path.resolve(__dirname, '../src');
const postmanDir = path.resolve(__dirname, '../../postman');

const readBackend = (relPath) => fs.readFileSync(path.join(backendDir, relPath), 'utf8');
const readFrontend = (relPath) => fs.readFileSync(path.join(frontendDir, relPath), 'utf8');
const readPostman = (relPath) => fs.readFileSync(path.join(postmanDir, relPath), 'utf8');

// =========================================================================
// TEST SUITE: ECOM-287 BACKEND QA COMPREHENSIVE VERIFICATION
// API, VALIDATION & ACCESS CONTROL FOR INVENTORY MANAGEMENT
// =========================================================================

test('TC-287-BE-01: ProductController khai báo đầy đủ các Endpoint Quản lý tồn kho', () => {
  const controller = readBackend('product-service/src/main/java/com/ecommerce/product/controller/ProductController.java');
  assert.match(controller, /@PostMapping\("\/\{id\}\/inbound"\)/, 'Phải có endpoint inbound stock');
  assert.match(controller, /@PostMapping\("\/\{id\}\/adjust-stock"\)/, 'Phải có endpoint adjust-stock');
  assert.match(controller, /@GetMapping\("\/\{id\}\/stock"\)/, 'Phải có endpoint check stock');
  assert.match(controller, /@PostMapping\("\/reserve-stock"\)/, 'Phải có endpoint reserve-stock');
  assert.match(controller, /@PostMapping\("\/restore-stock"\)/, 'Phải có endpoint restore-stock');
  assert.match(controller, /@GetMapping\("\/admin"\)/, 'Phải có endpoint lấy danh sách admin products');
});

test('TC-287-BE-02: Cơ chế RBAC kiểm tra quyền ADMIN chặt chẽ (chống bypass role giả mạo)', () => {
  const controller = readBackend('product-service/src/main/java/com/ecommerce/product/controller/ProductController.java');
  assert.match(controller, /requireAdminRole\(roles\)/, 'Các endpoint nhạy cảm phải gọi requireAdminRole');
  assert.match(controller, /"ROLE_ADMIN"::equals/, 'So khớp chính xác ROLE_ADMIN, không dùng contains');
  assert.match(controller, /throw new AccessDeniedException/, 'Ném AccessDeniedException khi không đủ quyền');
});

test('TC-287-BE-03: StockInboundRequest DTO định nghĩa ràng buộc validation đầy đủ', () => {
  const inboundDto = readBackend('product-service/src/main/java/com/ecommerce/product/dto/request/StockInboundRequest.java');
  assert.match(inboundDto, /@NotNull\(message = "Số lượng nhập kho không được để trống"\)/, 'Chặn null quantity');
  assert.match(inboundDto, /@Min\(value = 1, message = "Số lượng nhập kho phải lớn hơn hoặc bằng 1"\)/, 'Chặn số lượng <= 0');
  assert.match(inboundDto, /@Size\(max = 255, message = "Ghi chú không được vượt quá 255 ký tự"\)/, 'Chặn note quá 255 ký tự');
});

test('TC-287-BE-04: StockAdjustmentRequest DTO định nghĩa ràng buộc validation đầy đủ', () => {
  const adjustDto = readBackend('product-service/src/main/java/com/ecommerce/product/dto/request/StockAdjustmentRequest.java');
  assert.match(adjustDto, /@NotNull\(message = "Số lượng tồn kho thực tế không được để trống"\)/, 'Chặn null actualStock');
  assert.match(adjustDto, /@Min\(value = 0, message = "Số lượng tồn kho sau điều chỉnh không được nhỏ hơn 0"\)/, 'Chặn số âm');
  assert.match(adjustDto, /@NotBlank\(message = "Lý do điều chỉnh kho không được để trống"\)/, 'Bắt buộc nhập lý do');
  assert.match(adjustDto, /@Size\(max = 255, message = "Lý do không được vượt quá 255 ký tự"\)/, 'Chặn reason quá 255 ký tự');
});

test('TC-287-BE-05: GlobalExceptionHandler xử lý đúng các HTTP Status Code chuẩn RESTful', () => {
  const handler = readBackend('product-service/src/main/java/com/ecommerce/product/exception/GlobalExceptionHandler.java');
  assert.match(handler, /handleAccessDeniedException[\s\S]*?HttpStatus\.FORBIDDEN/, 'AccessDenied trả về 403 Forbidden');
  assert.match(handler, /handleValidationExceptions[\s\S]*?HttpStatus\.BAD_REQUEST/, 'Validation lỗi trả về 400 Bad Request');
  assert.match(handler, /handleResourceNotFoundException[\s\S]*?HttpStatus\.NOT_FOUND/, 'Không tìm thấy trả về 404 Not Found');
  assert.match(handler, /handleNotEnoughStockException[\s\S]*?HttpStatus\.CONFLICT/, 'Hết hàng / xung đột trả về 409 Conflict');
  assert.match(handler, /handleOptimisticLockingFailureException[\s\S]*?HttpStatus\.CONFLICT/, 'Optimistic lock trả về 409 Conflict');
});

test('TC-287-BE-06: ProductServiceImpl xử lý chuyển trạng thái ACTIVE <-> OUT_OF_STOCK chính xác', () => {
  const service = readBackend('product-service/src/main/java/com/ecommerce/product/service/impl/ProductServiceImpl.java');
  // Inbound: nếu OUT_OF_STOCK và số lượng mới > 0 chuyển sang ACTIVE
  assert.match(service, /product\.getStatus\(\) == ProductStatus\.OUT_OF_STOCK && newStock > 0/, 'Inbound kích hoạt lại ACTIVE');
  assert.match(service, /product\.setStatus\(ProductStatus\.ACTIVE\)/, 'Chuyển ACTIVE khi có hàng');
  // Adjust stock: nếu actualStock == 0 chuyển OUT_OF_STOCK
  assert.match(service, /request\.getActualStock\(\) == 0 && product\.getStatus\(\) == ProductStatus\.ACTIVE/, 'Adjust stock về 0 chuyển OUT_OF_STOCK');
  assert.match(service, /product\.setStatus\(ProductStatus\.OUT_OF_STOCK\)/, 'Đổi sang OUT_OF_STOCK');
});

test('TC-287-BE-07: Frontend productService.js tích hợp chuẩn xác với Backend Endpoints', () => {
  const feProductService = readFrontend('services/productService.js');
  assert.match(feProductService, /inboundStock:\s*async\s*\(id,/, 'Hàm inboundStock');
  assert.match(feProductService, /products\/\$\{id\}\/inbound/, 'Đúng URI inbound');
  assert.match(feProductService, /adjustStock:\s*async\s*\(id,/, 'Hàm adjustStock');
  assert.match(feProductService, /products\/\$\{id\}\/adjust-stock/, 'Đúng URI adjust-stock');
  assert.match(feProductService, /checkStock:\s*async\s*\(id,/, 'Hàm checkStock');
  assert.match(feProductService, /products\/\$\{id\}\/stock/, 'Đúng URI stock');
});

test('TC-287-BE-08: Bộ kiểm thử Postman ECOM-287 được khởi tạo đầy đủ các nhóm kiểm thử', () => {
  const postmanContent = readPostman('ShopMart_ECOM-287_Inventory_QA.postman_collection.json');
  const collection = JSON.parse(postmanContent);
  assert.equal(collection.info.name, 'ShopMart - ECOM-287 QA Test Suite (Inventory API, Validation & RBAC)');
  assert.equal(collection.item.length, 4, 'Bao gồm 4 thư mục kiểm thử chính');
  const folderNames = collection.item.map((f) => f.name);
  assert.ok(folderNames.includes('01. Authentication Setup'), 'Có thư mục Auth');
  assert.ok(folderNames.includes('02. Functional Inventory API'), 'Có thư mục Functional');
  assert.ok(folderNames.includes('03. Validation & Negative Cases'), 'Có thư mục Validation');
  assert.ok(folderNames.includes('04. Authorization & RBAC Security'), 'Có thư mục RBAC');
});
