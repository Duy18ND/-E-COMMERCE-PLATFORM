# 03 – BÁO CÁO KIỂM TRA BACKEND MICROSERVICES (BACKEND MICROSERVICES AUDIT)

- **Thời điểm kiểm tra:** 2026-11-16 08:03:35 (GMT+7)
- **Thư mục kiểm tra:** `backend/` (233 file Java, YAML, Lua, Gradle, Dockerfile, SQL)
- **Kết quả Build & Test:** `.\backend\gradlew.bat -p backend test bootJar --no-daemon --max-workers=2` -> **BUILD SUCCESSFUL in 3m 21s** (36 actionable tasks, 0 lỗi)

---

## 1. TỔNG QUAN 6 MICROSERVICES

| STT | Microservice | Port | Database / Hạ tầng | Trạng thái Build & Test | Ghi chú kiến trúc |
|---:|---|---:|---|---|---|
| 1 | `discovery-server` | `8761` | Netflix Eureka Server (HTTP Basic Auth) | **PASS** | Quản lý đăng ký và khám phá dịch vụ nội bộ. |
| 2 | `api-gateway` | `8080` | Spring Cloud Gateway WebFlux + Redis RateLimiter + Resilience4j CircuitBreaker | **PASS** (`AuthenticationFilterTest`) | Xác thực JWT tập trung, chặn header giả mạo (`SpoofedHeaderSanitizationFilter`), chặn external gọi API nội bộ (`BlockExternalAccessGatewayFilterFactory`). |
| 3 | `auth-service` | `8081` | MySQL `auth_db` + Spring Security + BCrypt + JJWT | **PASS** (`AuthControllerIntegrationTest`, `AdminUserControllerIntegrationTest`, `AuthServiceImplTest`, `UserServiceImplTest`, `JwtTokenProviderTest`) | Quản lý đăng ký, đăng nhập, refresh token, hồ sơ cá nhân, sổ địa chỉ và quản trị khách hàng Admin. |
| 4 | `product-service` | `8082` | MySQL `product_db` + Redis Cache (`@Cacheable("products")`) + Redis Lua (`flash_sale.lua`, `flash_sale_restore.lua`) + Feign (`OrderClient`) | **PASS** (`ProductServiceImplTest`, `ProductInventoryTest`, `FlashSaleControllerTest`, `FlashSaleServiceTest`, `ProductReviewServiceImplTest`) | Quản lý danh mục, sản phẩm, tồn kho Optimistic Lock (`@Version`), chiến dịch Flash Sale và đánh giá sau mua. |
| 5 | `order-service` | `8083` | MySQL `order_db` + Feign (`ProductClient`, `AuthClient`) + Kafka Producer/Consumer | **PASS** (`OrderServiceIntegrationTest`, `OrderTrackingIntegrationTest`, `AdminOrderControllerIntegrationTest`, `AdminStatisticsIntegrationTest`, `VoucherConcurrencyIntegrationTest`, `OrderServiceImplTest`, `CartServiceImplTest`, `VoucherServiceImplTest`, `KafkaPaymentConsumerTest`) | Quản lý giỏ hàng, voucher, đặt hàng Saga Orchestration, lịch sử trạng thái đơn (`order_status_history`) và thống kê doanh thu. |
| 6 | `payment-service` | `8084` | MySQL `payment_db` + Kafka Consumer (`order-created`) & Producer (`payment-success`, `payment-failed`) | **PASS** (`PaymentControllerIntegrationTest`, `PaymentServiceImplTest`) | Xử lý thanh toán `COD`, `MOCK_ONLINE`, `VNPAY`, kiểm tra quyền sở hữu giao dịch và bất đồng bộ qua Kafka. |

---

## 2. CÁC LỖI BACKEND ĐÃ PHÁT HIỆN VÀ SỬA TRONG ĐỢT AUDIT

1. **`BUG-BE-01` [HIGH] – Trùng lặp 2 Kafka Consumer (`PaymentConsumer` & `KafkaPaymentConsumer`) trong `order-service`**:
   - **File:** `backend/order-service/src/main/java/com/ecommerce/order/consumer/PaymentConsumer.java`
   - **Nguyên nhân:** Cả `PaymentConsumer` và `KafkaPaymentConsumer` đều gắn `@Component` và `@KafkaListener` lắng nghe cùng topic `payment-success` / `payment-failed` với cùng `groupId = "order-service-group"`.
   - **Đã sửa:** Gỡ bỏ `@Component` và `@KafkaListener` khỏi `PaymentConsumer.java`, giữ `KafkaPaymentConsumer.java` làm listener duy nhất.

2. **`BUG-BE-02` [MEDIUM] – Thiếu `@CacheEvict(value = "products", allEntries = true)` trong `FlashSaleService`**:
   - **File:** `backend/product-service/src/main/java/com/ecommerce/product/service/FlashSaleService.java`
   - **Nguyên nhân:** `ProductServiceImpl.getProducts()` cache `PagedResponse<ProductResponse>` (có nhúng `activeFlashSale`) trong Redis cache `"products"`. Khi tạo/sửa/xóa/bật/tắt chiến dịch Flash Sale hoặc trừ/hoàn suất Flash Sale, cache `"products"` không được xóa dẫn đến hiển thị giá Flash Sale cũ tối đa 10 phút.
   - **Đã sửa:** Bổ sung `@CacheEvict(value = "products", allEntries = true)` vào `initFlashSaleStock`, `reserveFlashSaleStock`, `restoreFlashSaleStock`, `createCampaign`, `updateCampaign`, `updateCampaignStatus`, và `deleteCampaign`.

3. **`BUG-BE-03` [LOW/MEDIUM] – `ProductController.countLowStockProducts` chưa nhận `X-Internal-Service-Key`**:
   - **File:** `backend/product-service/src/main/java/com/ecommerce/product/controller/ProductController.java`
   - **Nguyên nhân:** `GET /api/v1/products/low-stock/count` chỉ kiểm tra `requireAdminRole(roles)` thay vì cho phép cả `X-Internal-Service-Key` khi `order-service` gọi nội bộ qua Feign (`ProductClient.countLowStockProducts`).
   - **Đã sửa:** Sử dụng `requireInternalOrAdmin(internalKey, roles)` hỗ trợ cả `X-Internal-Service-Key` và `ROLE_ADMIN`.

4. **`BUG-BE-04` [LOW/MEDIUM] – Bổ sung `GET /api/v1/admin/orders/{id}` trong `AdminOrderController`**:
   - **File:** `backend/order-service/src/main/java/com/ecommerce/order/controller/AdminOrderController.java`
   - **Nguyên nhân:** `frontend/src/services/orderService.js` (`getAdminOrderById`) gọi `GET /api/v1/admin/orders/${orderId}` trước khi fallback sang `/orders/${orderId}`, nhưng `AdminOrderController` chưa khai báo `@GetMapping("/{id}")`.
   - **Đã sửa:** Bổ sung `@GetMapping("/{id}")` (`getOrderByIdForAdmin`) vào `AdminOrderController.java`.

5. **`BUG-BE-05` [MEDIUM] – `DataInitializer.java` trong `auth-service` chưa đọc biến môi trường `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD`**:
   - **File:** `backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java`
   - **Nguyên nhân:** `backend/.env.prod.example` định nghĩa `DEFAULT_ADMIN_EMAIL` và `DEFAULT_ADMIN_PASSWORD`, nhưng `DataInitializer.java` gắn cứng chuỗi `"admin@ecommerce.com"` và `"Admin@123456"`.
   - **Đã sửa:** Inject `@Value("${DEFAULT_ADMIN_EMAIL:admin@ecommerce.com}")` và `@Value("${DEFAULT_ADMIN_PASSWORD:Admin@123456}")` kèm giá trị mặc định an toàn.

6. **`BUG-BE-06` [LOW] – Đồng bộ đường dẫn `GET /api/v1/vouchers` công khai trên `api-gateway`**:
   - **File:** `backend/api-gateway/src/main/resources/application.yml`
   - **Nguyên nhân:** `VoucherController` mở `@GetMapping({"", "/active"})`, nhưng route `order-service-public-vouchers` trên Gateway chỉ khai báo `/api/v1/vouchers/active`.
   - **Đã sửa:** Cập nhật `Path=/api/v1/vouchers/active,/api/v1/vouchers` (`Method=GET`).
