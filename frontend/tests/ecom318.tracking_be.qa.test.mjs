/**
 * ==============================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG QA – TASK ECOM-318
 * [BE] QA Test - API, validation và quyền truy cập (Theo dõi đơn hàng chi tiết)
 * Mô tả: Kiểm thử API, case dữ liệu sai và phân quyền cho chức năng Theo dõi đơn hàng chi tiết
 * Dự án: ShopMart – E-commerce Platform
 * Sprint: Sprint 2 | Epic: CUSTOMER (Parent: ECOM-309, Feature: ECOM-159)
 * Người phụ trách: NGÔ PHƯƠNG
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

describe('ECOM-318: [BE] QA TEST - API, VALIDATION VÀ QUYỀN TRUY CẬP (THEO DÕI ĐƠN HÀNG CHI TIẾT)', () => {
  const orderJavaDir = path.join(repoRoot, 'backend', 'order-service', 'src', 'main', 'java', 'com', 'ecommerce', 'order');
  const orderTestDir = path.join(repoRoot, 'backend', 'order-service', 'src', 'test', 'java', 'com', 'ecommerce', 'order');

  const orderControllerFile = path.join(orderJavaDir, 'controller', 'OrderController.java');
  const adminOrderControllerFile = path.join(orderJavaDir, 'controller', 'AdminOrderController.java');
  const orderServiceImplFile = path.join(orderJavaDir, 'service', 'impl', 'OrderServiceImpl.java');
  const orderEntityFile = path.join(orderJavaDir, 'entity', 'Order.java');
  const historyEntityFile = path.join(orderJavaDir, 'entity', 'OrderStatusHistory.java');
  const historyRepoFile = path.join(orderJavaDir, 'repository', 'OrderStatusHistoryRepository.java');
  const historyDtoFile = path.join(orderJavaDir, 'dto', 'response', 'OrderStatusHistoryResponse.java');
  const updateStatusReqFile = path.join(orderJavaDir, 'dto', 'request', 'UpdateOrderStatusRequest.java');
  const globalExceptionFile = path.join(orderJavaDir, 'exception', 'GlobalExceptionHandler.java');
  const trackingApiQATestFile = path.join(orderTestDir, 'controller', 'OrderTrackingApiQATest.java');

  test('TC-318-01: [Schema & Entity] Bảng order_status_history định nghĩa đầy đủ trường status, previousStatus, action, updatedBy, actorRole, note, createdAt và Index tối ưu', () => {
    assert.ok(fs.existsSync(historyEntityFile), 'OrderStatusHistory.java phải tồn tại');
    const content = fs.readFileSync(historyEntityFile, 'utf8');
    assert.ok(content.includes('@Table(name = "order_status_history"'), 'Phải ánh xạ bảng order_status_history');
    assert.ok(content.includes('idx_status_history_order_id'), 'Phải có index trên cột order_id');
    assert.ok(content.includes('idx_status_history_created_at'), 'Phải có index trên cột created_at');
    assert.ok(content.includes('private OrderStatus status;'), 'Phải có trường status');
    assert.ok(content.includes('private OrderStatus previousStatus;'), 'Phải có trường previousStatus');
    assert.ok(content.includes('private String updatedBy;'), 'Phải có trường updatedBy');
    assert.ok(content.includes('private String actorRole;'), 'Phải có trường actorRole');
    assert.ok(content.includes('private String note;'), 'Phải có trường note');
  });

  test('TC-318-02: [Repository] OrderStatusHistoryRepository hỗ trợ truy vấn Timeline sắp xếp theo thời gian thực tăng dần (findByOrderIdOrderByCreatedAtAsc)', () => {
    assert.ok(fs.existsSync(historyRepoFile), 'OrderStatusHistoryRepository.java phải tồn tại');
    const content = fs.readFileSync(historyRepoFile, 'utf8');
    assert.ok(content.includes('findByOrderIdOrderByCreatedAtAsc(Long orderId)'), 'Phải có hàm findByOrderIdOrderByCreatedAtAsc');
    assert.ok(content.includes('findTopByOrderIdOrderByCreatedAtDesc(Long orderId)'), 'Phải có hàm lấy mốc mới nhất');
  });

  test('TC-318-03: [API Endpoint Customer] OrderController cung cấp GET /api/v1/orders/{id}/history và GET /api/v1/orders/{id} kèm kiểm tra X-User-Id', () => {
    const content = fs.readFileSync(orderControllerFile, 'utf8');
    assert.ok(content.includes('@GetMapping("/{id}/history")'), 'Phải có endpoint GET /api/v1/orders/{id}/history');
    assert.ok(content.includes('@GetMapping("/{id}")'), 'Phải có endpoint GET /api/v1/orders/{id}');
    assert.ok(content.includes('requireAuthenticated(authenticatedUserId);'), 'Phải bắt buộc xác thực X-User-Id');
  });

  test('TC-318-04: [API Endpoint Admin] AdminOrderController cung cấp PUT /api/v1/admin/orders/{id}/status và GET /api/v1/admin/orders/{id}/history kèm kiểm tra ROLE_ADMIN', () => {
    const content = fs.readFileSync(adminOrderControllerFile, 'utf8');
    assert.ok(content.includes('@PutMapping("/{id}/status")'), 'Phải có endpoint PUT /api/v1/admin/orders/{id}/status');
    assert.ok(content.includes('@GetMapping("/{id}/history")'), 'Phải có endpoint GET /api/v1/admin/orders/{id}/history');
    assert.ok(content.includes('requireAdminRole(roles);'), 'Mọi API Admin phải gọi requireAdminRole(roles)');
  });

  test('TC-318-05: [Chống IDOR - Timeline History] OrderServiceImpl.getOrderStatusHistory chặn người dùng xem lịch sử đơn hàng của người khác (403 AccessDeniedException)', () => {
    const content = fs.readFileSync(orderServiceImplFile, 'utf8');
    assert.ok(content.includes('if (!isAdmin && (authenticatedUserId == null || !order.getUserId().equals(authenticatedUserId)))'), 'Phải kiểm tra quyền sở hữu order.getUserId().equals(authenticatedUserId)');
    assert.ok(content.includes('throw new AccessDeniedException("Bạn không có quyền xem lịch sử đơn hàng của người dùng khác");'), 'Phải ném AccessDeniedException khi vi phạm IDOR');
  });

  test('TC-318-06: [Chống IDOR - Order Detail] OrderServiceImpl.getOrderById chặn người dùng xem chi tiết đơn hàng của người khác (403 AccessDeniedException)', () => {
    const content = fs.readFileSync(orderServiceImplFile, 'utf8');
    assert.ok(content.includes('if (!isAdmin && !authenticatedUserId.equals(order.getUserId()))'), 'Phải kiểm tra quyền sở hữu trên getOrderById');
    assert.ok(content.includes('throw new AccessDeniedException("Bạn không có quyền xem chi tiết đơn hàng này");'), 'Phải ném AccessDeniedException khi xem đơn người khác');
  });

  test('TC-318-07: [Chống Role Bypass] Hàm hasAdminRole và requireAdminRole tách chuỗi bằng dấu phẩy và so khớp chính xác ROLE_ADMIN (chống ROLE_ADMIN_VIEWER)', () => {
    const serviceContent = fs.readFileSync(orderServiceImplFile, 'utf8');
    const adminCtrlContent = fs.readFileSync(adminOrderControllerFile, 'utf8');
    assert.ok(serviceContent.includes('.anyMatch("ROLE_ADMIN"::equals)'), 'OrderServiceImpl phải dùng anyMatch("ROLE_ADMIN"::equals)');
    assert.ok(adminCtrlContent.includes('.anyMatch("ROLE_ADMIN"::equals)'), 'AdminOrderController phải dùng anyMatch("ROLE_ADMIN"::equals)');
  });

  test('TC-318-08: [State Machine Validation] ALLOWED_TRANSITIONS định nghĩa chặt chẽ các luồng chuyển trạng thái hợp lệ và chặn chuyển lùi trạng thái', () => {
    const content = fs.readFileSync(orderServiceImplFile, 'utf8');
    assert.ok(content.includes('ALLOWED_TRANSITIONS = Map.of('), 'Phải định nghĩa ALLOWED_TRANSITIONS');
    assert.ok(content.includes('OrderStatus.CANCELLED, Set.of()'), 'Trạng thái CANCELLED không được chuyển tiếp');
    assert.ok(content.includes('OrderStatus.FAILED, Set.of()'), 'Trạng thái FAILED không được chuyển tiếp');
    assert.ok(content.includes('OrderStatus.REFUNDED, Set.of()'), 'Trạng thái REFUNDED không được chuyển tiếp');
    assert.ok(content.includes('Không thể chuyển trạng thái đơn hàng từ %s sang %s'), 'Phải ném IllegalStateException khi chuyển trạng thái trái phép');
  });

  test('TC-318-09: [Request DTO Validation] UpdateOrderStatusRequest kiểm tra @NotNull cho status và @Size(max = 1000) cho note', () => {
    const content = fs.readFileSync(updateStatusReqFile, 'utf8');
    assert.ok(content.includes('@NotNull(message = "Trạng thái đơn hàng không được để trống")'), 'Phải có @NotNull trên trường status');
    assert.ok(content.includes('@Size(max = 1000, message = "Ghi chú không được vượt quá 1000 ký tự")'), 'Phải giới hạn độ dài ghi chú tối đa 1000 ký tự');
  });

  test('TC-318-10: [Audit Logging] Tự động ghi nhật ký vào order_status_history tại mọi điểm chuyển trạng thái (Tạo đơn, Thanh toán, Hủy đơn, Admin cập nhật)', () => {
    const content = fs.readFileSync(orderServiceImplFile, 'utf8');
    assert.ok(content.includes('"ORDER_CREATED"'), 'Phải ghi lịch sử khi tạo đơn hàng mới');
    assert.ok(content.includes('"ORDER_CANCELLED"'), 'Phải ghi lịch sử khi khách hàng hủy đơn');
    assert.ok(content.includes('"PAYMENT_SUCCESS"'), 'Phải ghi lịch sử khi thanh toán thành công');
    assert.ok(content.includes('"PAYMENT_FAILED"'), 'Phải ghi lịch sử khi thanh toán thất bại');
    assert.ok(content.includes('"ADMIN_STATUS_UPDATE"'), 'Phải ghi lịch sử khi Admin cập nhật trạng thái');
  });

  test('TC-318-11: [Bidirectional Sync ECOM-317] Sau khi Admin cập nhật trạng thái, OrderResponse trả về chứa ngay statusHistories đồng bộ cho Customer', () => {
    const serviceContent = fs.readFileSync(orderServiceImplFile, 'utf8');
    const entityContent = fs.readFileSync(orderEntityFile, 'utf8');
    assert.ok(serviceContent.includes('order.addStatusHistory(syncedHistory);'), 'recordStatusHistory phải đồng bộ ngay vào thực thể Order');
    assert.ok(serviceContent.includes('.statusHistories(historyResponses)'), 'mapToOrderResponse phải trả về danh sách statusHistories');
    assert.ok(entityContent.includes('public void addStatusHistory(OrderStatusHistory history)'), 'Order entity phải có helper addStatusHistory chống trùng lặp');
  });

  test('TC-318-12: [Stock & Voucher Restoration] Khi Admin hoặc Customer chuyển đơn sang CANCELLED, hệ thống tự động hoàn kho ProductClient và hoàn lượt dùng Voucher', () => {
    const content = fs.readFileSync(orderServiceImplFile, 'utf8');
    assert.ok(content.includes('productClient.restoreStock(restoreItems);'), 'Phải gọi productClient.restoreStock khi hủy đơn');
    assert.ok(content.includes('voucherService.restoreVoucherUsage(order.getVoucherCode());'), 'Phải hoàn lại lượt dùng voucher nếu đơn có áp mã');
  });

  test('TC-318-13: [Response DTO Mapping] OrderStatusHistoryResponse ánh xạ đầy đủ nhãn mô tả tiếng Việt thân thiện cho toàn bộ 9 trạng thái OrderStatus', () => {
    const content = fs.readFileSync(historyDtoFile, 'utf8');
    assert.ok(content.includes('public static String getStatusDescription(OrderStatus status)'), 'Phải có hàm getStatusDescription');
    const statuses = ['PENDING', 'PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPING', 'DELIVERED', 'CANCELLED', 'FAILED', 'REFUNDED'];
    statuses.forEach((st) => {
      assert.ok(content.includes(`case ${st} ->`), `getStatusDescription phải xử lý trạng thái ${st}`);
    });
  });

  test('TC-318-14: [Exception Mapping] GlobalExceptionHandler chuẩn hóa mã HTTP: 400 (IllegalState/Validation/InvalidJSON), 403 (AccessDenied), 404 (ResourceNotFound)', () => {
    const content = fs.readFileSync(globalExceptionFile, 'utf8');
    assert.ok(content.includes('@ExceptionHandler(AccessDeniedException.class)') && content.includes('HttpStatus.FORBIDDEN'), 'AccessDeniedException phải trả về 403 FORBIDDEN');
    assert.ok(content.includes('@ExceptionHandler(ResourceNotFoundException.class)') && content.includes('HttpStatus.NOT_FOUND'), 'ResourceNotFoundException phải trả về 404 NOT_FOUND');
    assert.ok(content.includes('@ExceptionHandler(IllegalStateException.class)') && content.includes('HttpStatus.BAD_REQUEST'), 'IllegalStateException phải trả về 400 BAD_REQUEST');
    assert.ok(content.includes('@ExceptionHandler(MethodArgumentNotValidException.class)'), 'MethodArgumentNotValidException phải trả về 400 BAD_REQUEST');
  });

  test('TC-318-15: [Transaction Boundary] Các hàm ghi trạng thái có @Transactional(rollbackFor = Exception.class) và hàm đọc có @Transactional(readOnly = true)', () => {
    const content = fs.readFileSync(orderServiceImplFile, 'utf8');
    assert.ok(content.includes('@Transactional(rollbackFor = Exception.class)'), 'Các thao tác cập nhật phải có @Transactional(rollbackFor = Exception.class)');
    assert.ok(content.includes('@Transactional(readOnly = true)'), 'Các thao tác truy vấn lịch sử/chi tiết phải có @Transactional(readOnly = true)');
  });

  test('TC-318-16: [JUnit 5 QA Suite] Tồn tại bộ kiểm thử JUnit 5 OrderTrackingApiQATest.java kiểm tra toàn diện API Tracking, Validation & IDOR', () => {
    assert.ok(fs.existsSync(trackingApiQATestFile), 'File OrderTrackingApiQATest.java phải tồn tại trong backend/order-service/src/test');
    const content = fs.readFileSync(trackingApiQATestFile, 'utf8');
    assert.ok(content.includes('TC-318-BE-01'), 'Phải có test case TC-318-BE-01');
    assert.ok(content.includes('TC-318-BE-09'), 'Phải có đầy đủ các test case từ TC-318-BE-01 đến TC-318-BE-09');
  });
});
