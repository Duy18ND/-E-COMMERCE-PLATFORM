# E-COMMERCE PLATFORM — MICROSERVICES SYSTEM

> **Hệ thống Thương Mại Điện Tử Kiến Trúc Microservices Toàn Diện**  
> **Sprint 5 ngày hoàn thành:** Kiến trúc Microservices phân tán với Spring Boot 3.3, Spring Cloud, Spring WebFlux API Gateway, Apache Kafka Event-Driven Saga Pattern, Redis Caching & Rate Limiting, MySQL, và Docker Compose.

---

## 🏗️ 1. Kiến trúc Hệ thống (Architecture Overview)

Toàn bộ hệ thống giao tiếp qua cổng tập trung **API Gateway (Port 8080)**, điều phối qua **Eureka Discovery Server (Port 8761)**, sử dụng cơ chế sự kiện bất đồng bộ qua **Apache Kafka**:

```
Client (Browser / ReactJS / Postman)
               │
               ▼ HTTP (REST)
     [API Gateway :8080]  ◄── JWT Auth Filter, Redis Rate Limiter, Resilience4j Circuit Breaker
               │
       ┌───────┴────────────────────┐
       │   Eureka Registry :8761    │
       └────────────────────────────┘
               │
       ┌───────┴──────────────────────────────────────────────────────┐
       ▼                            ▼                ▼                ▼
[Auth Service]              [Product Service] [Order Service]  [Payment Service]
    :8081                        :8082            :8083            :8084
       │                            │                │                │
       │                            │   Feign (Sync) │                │
       │                            ├────────────────┤                │
       │                            │ Reserve / Comp │                │
       ▼                            ▼                ▼                ▼
[MySQL: auth_db]             [MySQL: product_db]  [MySQL: order_db] [MySQL: payment_db]
[Redis: token_bl]            [Redis: cache]                │                │
                                                           ▼                ▼
                                                    [Apache Kafka Broker :9092]
                                                    Topics: order-created
                                                            payment-success
                                                            payment-failed
```

---

## 🛡️ 2. Tính năng Bảo mật & Gateway (API Gateway :8080)

1. **Bảo mật JWT Filter (`AuthenticationFilter`):**
   - Đón bắt header `Authorization: Bearer <token>`.
   - Xác thực token bằng `jjwt` (dùng chung secret key với `auth-service`).
   - Trích xuất `userId`, `roles`, mutate request gắn headers `X-User-Id`, `X-User-Roles` trước khi route downstream.
   - Trả về HTTP `401 Unauthorized` nếu token thiếu, sai, hoặc hết hạn.
   - Bỏ qua xác thực cho `/api/v1/auth/**` và GET `/api/v1/products/**`. Bắt buộc xác thực cho Order, Payment, và các thao tác thay đổi dữ liệu của Product (`POST, PUT, DELETE, PATCH`).

2. **CORS & Rate Limiting (Redis):**
   - Global CORS cho phép mọi phương thức `GET, POST, PUT, DELETE, PATCH, OPTIONS`.
   - Redis Rate Limiter chống spam/DDoS cho endpoint checkout `/api/v1/orders/checkout` (`replenishRate: 2`, `burstCapacity: 5`).

3. **Circuit Breaker & Fallback (Resilience4j):**
   - Giám sát độ trễ và tỷ lệ lỗi downstream services. Tự động kích hoạt Circuit Breaker khi lỗi vượt ngưỡng 50%.
   - `FallbackController` trả về `Mono<ApiResponse>` kèm mã HTTP `503 Service Unavailable` khi bất kỳ service nào bị sự cố hoặc timeout.

---

## 🔄 3. Luồng Giao Dịch Phân Tán: Saga Pattern (Choreography)

Hệ thống triển khai cơ chế **Choreography-based Saga** đảm bảo tính nhất quán dữ liệu giữa `order-service`, `product-service` và `payment-service`:

1. **Khởi tạo Đơn hàng (Order Checkout):**
   - Khách hàng checkout tại `order-service` $\rightarrow$ gọi OpenFeign đồng bộ sang `product-service` giữ trước hàng tồn kho (`reserveStock`).
   - Đơn hàng tạo ở trạng thái **`PENDING`**.
2. **Phát sự kiện (Publish Event):**
   - `order-service` phát sự kiện `OrderCreatedEvent` vào Kafka topic **`order-created`**.
3. **Xử lý thanh toán (Payment Processing):**
   - `payment-service` lắng nghe topic `order-created` và tiến hành xử lý thanh toán.
4. **Kịch bản thành công (Happy Path):**
   - `payment-service` phát sự kiện `PaymentSuccessEvent` vào topic **`payment-success`**.
   - `order-service` cập nhật đơn hàng thành **`PAID`**.
5. **Kịch bản thất bại & Bù trừ (Compensating Transaction):**
   - Nếu thanh toán thất bại, `payment-service` phát sự kiện `PaymentFailedEvent` vào topic **`payment-failed`**.
   - `order-service` cập nhật đơn hàng thành **`FAILED`** và thực thi **Giao dịch bù trừ (Compensation)**: gọi API `restoreStock` của `product-service` để hoàn trả lại số lượng tồn kho.

---

## 🚀 4. Lệnh Khởi Chạy Toàn Bộ Hệ Thống (Chuẩn bị Bảo vệ Đồ Án)

### Yêu cầu Tiên quyết:
- **JDK 21+**
- **Docker Desktop / Docker Engine**

### Lệnh thực thi:

```bash
# 1. Điều hướng vào thư mục backend
cd backend

# 2. Build toàn bộ dự án Gradle (bỏ qua chạy test để build nhanh)
# Trên Linux/macOS:
./gradlew clean bootJar -x test
# Trên Windows:
.\gradlew.bat clean bootJar -x test

# 3. Khởi chạy toàn bộ hệ thống bằng Docker Compose (Đã thiết lập thứ tự chuẩn)
docker compose up -d --build

# 4. Kiểm tra trạng thái sức khỏe các containers (chờ các container chuyển sang healthy)
docker compose ps

# 5. Theo dõi log thời gian thực
docker compose logs -f
```

---

## 🔌 5. Bảng Cổng & Đường Dẫn Dịch Vụ

| Dịch vụ | Cổng | URL Truy cập | Ghi chú |
|:---|:---:|:---|:---|
| **API Gateway** | `8080` | `http://localhost:8080` | Điểm vào chính của toàn bộ API |
| **Eureka Server** | `8761` | `http://localhost:8761` | `eureka` / `eurekapassword` |
| **Auth Service** | `8081` | `http://localhost:8081/swagger-ui.html` | Quản lý người dùng & JWT |
| **Product Service** | `8082` | `http://localhost:8082/swagger-ui.html` | Quản lý sản phẩm & tồn kho |
| **Order Service** | `8083` | `http://localhost:8083/swagger-ui.html` | Quản lý đơn hàng & giỏ hàng |
| **Payment Service** | `8084` | `http://localhost:8084/swagger-ui.html` | Xử lý thanh toán |
| **Kafka UI** | `8090` | `http://localhost:8090` | Giám sát Kafka topics & events |
| **Frontend UI** | `5173` | `http://localhost:5173` | Giao diện ReactJS + Vite |

---

## 🌿 6. Quy trình Phân nhánh Git Nhóm (Branching Workflow)
- **`master`:** Nhánh phát triển chính, toàn bộ PR tính năng merge vào đây sau review.
- **`main`:** Nhánh phát hành chính thức, chỉ merge từ `master` khi hệ thống đã ổn định hoàn toàn.
