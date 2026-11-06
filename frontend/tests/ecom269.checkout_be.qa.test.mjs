/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-269
 * [BE] QA Test - API, validation và quyền truy cập (Đặt hàng & Thanh toán mô phỏng)
 * Feature: ECOM-121 (Đặt hàng & Thanh toán mô phỏng) | Parent: ECOM-262 ([BE] Đặt hàng & Thanh toán mô phỏng)
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

describe('ECOM-269: [BE] QA TEST API, VALIDATION VÀ QUYỀN TRUY CẬP (CHECKOUT & MOCK PAYMENT)', () => {

  test('TC-269-BE-01: OrderController khai báo đầy đủ các endpoint Đặt hàng và Quản lý đơn hàng', () => {
    const controller = readBackend('order-service/src/main/java/com/ecommerce/order/controller/OrderController.java');

    assert.match(controller, /@RequestMapping\(["']\/api\/v1\/orders["']\)/, 'Base path phải là /api/v1/orders');
    assert.match(controller, /@PostMapping\(["']\/checkout["']\)[\s\S]*?checkout/, 'Phải có POST /checkout');
    assert.match(controller, /@PostMapping\(["']\/from-cart["']\)[\s\S]*?createOrderFromCart/, 'Phải có POST /from-cart');
    assert.match(controller, /@PutMapping\(["']\/\{id\}\/cancel["']\)[\s\S]*?cancelOrder/, 'Phải có PUT /{id}/cancel');
    assert.match(controller, /@GetMapping\(["']\/my-orders["']\)[\s\S]*?getMyOrders/, 'Phải có GET /my-orders');
    assert.match(controller, /@GetMapping\(["']\/\{id\}["']\)[\s\S]*?getOrderById/, 'Phải có GET /{id}');
    assert.match(controller, /@GetMapping\(["']\/\{id\}\/history["']\)[\s\S]*?getOrderStatusHistory/, 'Phải có GET /{id}/history');
  });

  test('TC-269-BE-02: PaymentController khai báo đầy đủ các endpoint Thanh toán mô phỏng và tra cứu', () => {
    const controller = readBackend('payment-service/src/main/java/com/ecommerce/payment/controller/PaymentController.java');

    assert.match(controller, /@RequestMapping\(["']\/api\/v1\/payments["']\)/, 'Base path phải là /api/v1/payments');
    assert.match(controller, /@PostMapping\(["']\/mock-pay\/\{orderId\}["']\)[\s\S]*?mockPay/, 'Phải có POST /mock-pay/{orderId}');
    assert.match(controller, /@GetMapping\(["']\/order\/\{orderId\}["']\)[\s\S]*?getPaymentByOrderId/, 'Phải có GET /order/{orderId}');
    assert.match(controller, /@GetMapping\(["']\/\{id\}["']\)[\s\S]*?getPaymentById/, 'Phải có GET /{id}');
  });

  test('TC-269-BE-03: DTO CheckoutRequest định nghĩa validation ràng buộc chặt chẽ với Regex SĐT Việt Nam', () => {
    const dto = readBackend('order-service/src/main/java/com/ecommerce/order/dto/request/CheckoutRequest.java');

    assert.match(dto, /@NotBlank\(message\s*=\s*["']Tên người nhận không được để trống["']\)/, 'Chặn null/blank receiverName');
    assert.match(dto, /@NotBlank\(message\s*=\s*["']Số điện thoại nhận hàng không được để trống["']\)/, 'Chặn null/blank receiverPhone');
    assert.match(dto, /@Pattern\(regexp\s*=\s*["']\^\(0\|\\\\\+84\)\[35789\]\[0-9\]\{8\}\$["']/, 'Validate số điện thoại định dạng chuẩn Việt Nam');
    assert.match(dto, /@NotBlank\(message\s*=\s*["']Địa chỉ nhận hàng không được để trống["']\)/, 'Chặn null/blank shippingAddress');
    assert.match(dto, /@NotNull\(message\s*=\s*["']Phương thức thanh toán không được để trống["']\)/, 'Chặn null paymentMethod');
    assert.match(dto, /@Size\(max\s*=\s*50,\s*message\s*=\s*["']Mã voucher không được vượt quá 50 ký tự["']\)/, 'Giới hạn voucherCode tối đa 50 ký tự');
  });

  test('TC-269-BE-04: DTO MockPaymentRequest định nghĩa ràng buộc validation đầy đủ', () => {
    const dto = readBackend('payment-service/src/main/java/com/ecommerce/payment/dto/request/MockPaymentRequest.java');

    assert.match(dto, /@NotNull\(message\s*=\s*["']Trạng thái giả lập thanh toán \(success\) không được để trống["']\)/, 'Chặn null success');
    assert.match(dto, /@Size\(max\s*=\s*255,\s*message\s*=\s*["']Ghi chú thanh toán không được vượt quá 255 ký tự["']\)/, 'Giới hạn note tối đa 255 ký tự');
  });

  test('TC-269-BE-05: Cơ chế phân quyền và xác thực bắt buộc X-User-Id trên checkout và from-cart', () => {
    const controller = readBackend('order-service/src/main/java/com/ecommerce/order/controller/OrderController.java');

    assert.match(controller, /if\s*\(authenticatedUserId\s*!=\s*null\)\s*\{\s*request\.setUserId\(authenticatedUserId\);\s*\}\s*else\s+if\s*\(request\.getUserId\(\)\s*==\s*null\)\s*\{\s*throw new AccessDeniedException/, 'Bắt buộc xác thực người dùng trên checkout');
    assert.match(controller, /private void requireAuthenticated\(Long authenticatedUserId\)/, 'Hàm helper requireAuthenticated');
  });

  test('TC-269-BE-06: Phòng chống tấn công IDOR khi xem chi tiết và hủy đơn hàng', () => {
    const controller = readBackend('order-service/src/main/java/com/ecommerce/order/controller/OrderController.java');
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

    assert.match(controller, /orderService\.cancelOrder\(id,\s*authenticatedUserId\)/, 'Truyền authenticatedUserId vào cancelOrder');
    assert.match(service, /!userId\.equals\(order\.getUserId\(\)\)/, 'Kiểm tra quyền sở hữu !userId.equals(order.getUserId())');
    assert.match(service, /throw new AccessDeniedException\(["']Bạn không có quyền hủy đơn hàng này["']\)/, 'Ném AccessDeniedException khi vi phạm IDOR hủy đơn');
    assert.match(service, /throw new AccessDeniedException\(["']Bạn không có quyền xem chi tiết đơn hàng này["']\)/, 'Ném AccessDeniedException khi vi phạm IDOR xem đơn');
  });

  test('TC-269-BE-07: Quản lý giao dịch nguyên tử @Transactional(rollbackFor = Exception.class) trên checkout', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

    assert.match(service, /@Transactional\(rollbackFor\s*=\s*Exception\.class\)[\s\S]*?public OrderResponse checkout\(CheckoutRequest request\)/, 'Phương thức checkout phải có @Transactional(rollbackFor = Exception.class)');
    assert.match(service, /@Transactional\(rollbackFor\s*=\s*Exception\.class\)[\s\S]*?public OrderResponse createOrderFromCart/, 'Phương thức createOrderFromCart phải có @Transactional');
  });

  test('TC-269-BE-08: Cơ chế chống Price Tampering - lấy giá sản phẩm trực tiếp từ DB qua ProductClient', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

    assert.match(service, /ApiResponse<ProductResponse> productApiResponse\s*=\s*productClient\.getProductById/, 'Lấy thông tin sản phẩm từ Product Service');
    assert.match(service, /BigDecimal actualPrice\s*=\s*product\.getPrice\(\);/, 'Lấy giá thực tế actualPrice từ ProductResponse');
    assert.match(service, /itemReq\.setPriceAtPurchase\(actualPrice\);/, 'Ghi đè giá mua priceAtPurchase từ backend');
  });

  test('TC-269-BE-09: Tích hợp trừ tồn kho qua FeignClient ProductClient.reserveStock', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

    assert.match(service, /productClient\.reserveStock\(reservationItems\);/, 'Gọi FeignClient trừ tồn kho');
    assert.match(service, /productClient\.reserveFlashSaleStock/, 'Trừ tồn kho Flash Sale nguyên tử nếu có');
  });

  test('TC-269-BE-10: Tự động làm trống giỏ hàng (cart.clearItems()) sau khi đặt hàng thành công', () => {
    const service = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

    assert.match(service, /c\.clearItems\(\);/, 'Gọi c.clearItems() dọn sạch giỏ');
    assert.match(service, /cartRepository\.save\(c\);/, 'Lưu giỏ hàng đã làm trống');
  });

  test('TC-269-BE-11: Luồng xử lý thanh toán mô phỏng PaymentServiceImpl phân tách COD và MOCK_ONLINE', () => {
    const service = readBackend('payment-service/src/main/java/com/ecommerce/payment/service/impl/PaymentServiceImpl.java');

    assert.match(service, /"COD"\.equalsIgnoreCase\(event\.getPaymentMethod\(\)\)/, 'Kiểm tra phương thức COD');
    assert.match(service, /codPayment\.setStatus\(PaymentStatus\.PENDING\);/, 'COD lưu trạng thái PENDING không bắn event thành công');
    assert.match(service, /processMockOnlinePayment/, 'Hàm xử lý riêng cho MOCK_ONLINE');
  });

  test('TC-269-BE-12: Cơ chế Saga Rollback khi thanh toán thất bại kích hoạt Kafka payment-failed', () => {
    const service = readBackend('payment-service/src/main/java/com/ecommerce/payment/service/impl/PaymentServiceImpl.java');

    assert.match(service, /PAYMENT_LIMIT\s*=\s*new BigDecimal\(["']50000000["']\);/, 'Hạn mức thanh toán quy định 50,000,000 VND');
    assert.match(service, /event\.getTotalAmount\(\)\.compareTo\(PAYMENT_LIMIT\)\s*>\s*0/, 'Kiểm tra vượt hạn mức');
    assert.match(service, /kafkaPaymentProducer\.sendPaymentFailed\(failedEvent\);/, 'Bắn event payment-failed kích hoạt Saga Rollback');
    assert.match(service, /kafkaPaymentProducer\.sendPaymentSuccess\(successEvent\);/, 'Bắn event payment-success khi thành công');
  });

  test('TC-269-BE-13: API Gateway cấu hình Rate Limiter chống spam riêng cho /orders/checkout', () => {
    const yml = readBackend('api-gateway/src/main/resources/application.yml');

    assert.match(yml, /Path=\/api\/v1\/orders\/checkout/, 'Route riêng cho /orders/checkout');
    assert.match(yml, /redis-rate-limiter\.replenishRate:\s*2/, 'Replenish rate chống spam là 2');
    assert.match(yml, /redis-rate-limiter\.burstCapacity:\s*5/, 'Burst capacity là 5');
    assert.match(yml, /AuthenticationFilter/, 'Bảo vệ bởi AuthenticationFilter');
  });

  test('TC-269-BE-14: Frontend orderService.js và paymentService.js tích hợp chuẩn xác với Backend APIs', () => {
    const feOrder = readFrontend('src/services/orderService.js');
    const fePayment = readFrontend('src/services/paymentService.js');

    assert.match(feOrder, /api\.post\(['"]\/orders\/checkout['"],/, 'FE gọi POST /orders/checkout');
    assert.match(feOrder, /api\.get\(['"]\/orders\/my-orders['"]\)/, 'FE gọi GET /orders/my-orders');
    assert.match(feOrder, /api\.put\([`']\/orders\/\$\{id\}\/cancel[`']\)/, 'FE gọi PUT /orders/{id}/cancel');
    assert.match(fePayment, /payments\/mock-pay/, 'FE gọi API mock-pay');
  });

  test('TC-269-BE-15: Bộ sưu tập Postman ECOM-269 được khởi tạo đầy đủ 4 thư mục kiểm thử chức năng và bảo mật', () => {
    const postmanRaw = readPostman('ShopMart_ECOM-269_Checkout_Payment_QA.postman_collection.json');
    const collection = JSON.parse(postmanRaw);

    assert.equal(collection.info.name, 'ShopMart - ECOM-269 [BE] QA Test Đặt Hàng & Thanh Toán Mô Phỏng (API, Validation & Access Control)');
    assert.equal(collection.item.length, 4, 'Bao gồm 4 thư mục kiểm thử');
    const folderNames = collection.item.map((f) => f.name);
    assert.ok(folderNames.includes('01. Authentication Setup'), 'Có thư mục Auth Setup');
    assert.ok(folderNames.includes('02. Functional Checkout & Payment API (Happy Path)'), 'Có thư mục Functional Happy Path');
    assert.ok(folderNames.includes('03. Validation & Negative Cases'), 'Có thư mục Validation & Negative Cases');
    assert.ok(folderNames.includes('04. Authorization & IDOR Security'), 'Có thư mục Authorization & IDOR Security');
  });

  test('TC-269-BE-16: Bộ kiểm thử Unit Test Backend OrderControllerTest, PaymentControllerTest và PaymentServiceTest bao phủ các kịch bản', () => {
    const orderControllerTest = readBackend('order-service/src/test/java/com/ecommerce/order/controller/OrderControllerTest.java');
    const paymentControllerTest = readBackend('payment-service/src/test/java/com/ecommerce/payment/controller/PaymentControllerTest.java');
    const paymentServiceTest = readBackend('payment-service/src/test/java/com/ecommerce/payment/service/PaymentServiceTest.java');

    assert.match(orderControllerTest, /void checkout_InvalidPhone_ShouldReturnBadRequest\(\)/, 'Test case SĐT VN không hợp lệ');
    assert.match(orderControllerTest, /void checkout_MissingReceiverName_ShouldReturnBadRequest\(\)/, 'Test case thiếu tên người nhận');
    assert.match(orderControllerTest, /void checkout_MissingPaymentMethod_ShouldReturnBadRequest\(\)/, 'Test case thiếu phương thức thanh toán');
    assert.match(orderControllerTest, /void checkout_MissingUserId_ShouldReturnForbidden\(\)/, 'Test case thiếu X-User-Id');

    assert.match(paymentControllerTest, /void testMockPay_Success\(\)/, 'Test case mock-pay thành công');
    assert.match(paymentControllerTest, /void testMockPay_Failure\(\)/, 'Test case mock-pay thất bại');
    assert.match(paymentControllerTest, /void testMockPay_MissingSuccess_ShouldReturnBadRequest\(\)/, 'Test case thiếu success');

    assert.match(paymentServiceTest, /void testMockPay_Success\(\)/, 'Service test mockPay thành công');
    assert.match(paymentServiceTest, /void testMockPay_Failure\(\)/, 'Service test mockPay thất bại');
    assert.match(paymentServiceTest, /void testMockPay_AlreadyPaid_ThrowsIllegalStateException\(\)/, 'Service test đã thanh toán ném ngoại lệ');
  });
});
