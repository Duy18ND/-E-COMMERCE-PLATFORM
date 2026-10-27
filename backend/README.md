# E-Commerce Microservices Platform

> **Đồ án:** Hệ thống Thương mại Điện tử Kiến trúc Microservices  
> **Phiên bản:** 1.0.0 (Hoàn thành Sprint 5 ngày)  
> **Công nghệ lõi:** Spring Boot 3.3, Spring Cloud 2023, Spring WebFlux, Apache Kafka, Redis, MySQL, Docker & Docker Compose.

---

## 🏗️ 1. Kiến trúc Tổng thể (Architecture Overview)

Hệ thống được thiết kế theo kiến trúc Microservices phân tán, toàn diện, đáp ứng các tiêu chuẩn về tính sẵn sàng cao (High Availability), bảo mật tập trung, khả năng chịu lỗi (Fault Tolerance) và xử lý giao dịch phân tán (Distributed Transactions).

```
                                      ┌─────────────────────────────────┐
                                      │   Client (Browser / Postman)    │
                                      └────────────────┬────────────────┘
                                                       │  HTTP (REST)
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │      API Gateway (Port 8080)    │
                                      │   • Spring Cloud Gateway        │
                                      │   • Centralized JWT Filter      │
                                      │   • Global CORS & Rate Limiter  │
                                      │   • Resilience4j Circuit Breaker│
                                      └───────┬──────────────┬──────────┘
                                              │              │
                                     Discovery│              │ Eureka lb://
                                              ▼              ▼
                              ┌────────────────────┐   ┌────────────────────────┐
                              │  Discovery Server  │   │     Microservices      │
                              │  (Eureka :8761)    │   │                        │
                              └────────────────────┘   └───────┬────────────────┘
                                                               │
        ┌─────────────────────────┬────────────────────────────┼───────────────────────────┐
        ▼                         ▼                            ▼                           ▼
┌──────────────┐          ┌──────────────┐             ┌──────────────┐            ┌──────────────┐
│ Auth Service │          │Product Service│            │Order Service │            │Payment Service│
│  Port: 8081  │          │  Port: 8082  │             │  Port: 8083  │            │  Port: 8084  │
└──────┬───────┘          └──────┬───────┘             └──────┬───────┘            └──────┬───────┘
       │                         │                            │                           │
       │                         │       Feign (Sync)         │                           │
       │                         ├────────────────────────────┤                           │
       │                         │       Stock Reserve        │                           │
       │                         │       & Compensation       │                           │
       │                         │                            │                           │
       ▼                         ▼                            ▼                           ▼
┌──────────────┐          ┌──────────────┐             ┌──────────────────────────────────────────┐
│ MySQL & Redis│          │ MySQL & Redis│             │               Apache Kafka               │
│  (auth_db)   │          │ (product_db) │             │    Topics: order-created, payment-success│
│  Token cache │          │ Catalog cache│             │            payment-failed                │
└──────────────┘          └──────────────┘             └──────────────────────────────────────────┘
```

---

## 🛡️ 2. Bảo mật & Điều phối tại API Gateway (`:8080`)

API Gateway đóng vai trò cổng giao tiếp duy nhất (Single Point of Entry) với thế giới bên ngoài, chịu trách nhiệm:

### 2.1. Bảo mật tập trung (JWT GatewayFilter)
- **`AuthenticationFilter`** (kế thừa `AbstractGatewayFilterFactory`):
  - Đón bắt header `Authorization: Bearer <token>`.
  - Xác thực chữ ký và thời hạn của JWT token bằng thư viện `jjwt` 0.12.5 (chia sẻ chung secret key 256-bit với `auth-service`).
  - Giải mã `userId`, `roles`, `email` và **mutate HTTP request** để gắn các header nội bộ:
    - `X-User-Id`: ID định danh người dùng.
    - `X-User-Roles`: Danh sách vai trò (ví dụ: `ROLE_CUSTOMER`, `ROLE_ADMIN`).
    - `X-User-Email`: Email người dùng.
  - Tự động trả về HTTP **`401 Unauthorized`** cùng cấu trúc JSON `ApiResponse.error(...)` nếu token thiếu, định dạng sai, không hợp lệ hoặc đã hết hạn.
- **Quy tắc định tuyến (Route Access Rules):**
  - **Bỏ qua xác thực (Public):**
    - Toàn bộ route xác thực `/api/v1/auth/**` (đăng ký, đăng nhập, refresh token).
    - Các API đọc danh mục sản phẩm: `GET /api/v1/products/**`.
  - **Bắt buộc xác thực:**
    - Toàn bộ thao tác ghi/sửa/xóa sản phẩm: `POST, PUT, DELETE, PATCH /api/v1/products/**`.
    - Toàn bộ nghiệp vụ đơn hàng & giỏ hàng: `/api/v1/orders/**`, `/api/v1/cart/**`.
    - Toàn bộ nghiệp vụ thanh toán: `/api/v1/payments/**`.

### 2.2. Global CORS & Rate Limiting (Redis)
- **Cấu hình Global CORS:** Hỗ trợ mọi phương thức `GET, POST, PUT, DELETE, PATCH, OPTIONS`, chấp nhận cookie credentials và nguồn gốc (frontend: `http://localhost:3000`, `http://localhost:5173`).
- **Redis Rate Limiter chống spam / DDoS:**
  - Tích hợp `RequestRateLimiter` Gateway Filter dựa trên cấu trúc Token Bucket lưu trữ trên Redis 7.
  - Phân giải khóa động qua `userKeyResolver` (ưu tiên `X-User-Id` -> `Authorization` -> Client IP Address).
  - Cấu hình đặc thù cho endpoint đặt hàng `/api/v1/orders/checkout`:
    - `replenishRate: 2` (tối đa 2 token/giây).
    - `burstCapacity: 5` (dung lượng chứa tối đa 5 request đột biến).

### 2.3. Circuit Breaker & Fallback Controller (Resilience4j)
- Tích hợp **Resilience4j Reactor** bảo vệ toàn bộ 4 microservices:
  - Giám sát tỉ lệ lỗi (Failure Rate Threshold = 50%), thời gian chờ phục hồi (Wait Duration in Open State = 30s), và giới hạn thời gian phản hồi (Timeout = 5s).
- Khi microservice phía sau bị sập hoặc phản hồi quá lâu, Gateway tự động chuyển tiếp sang **`FallbackController`** trả về `Mono<ApiResponse>` với HTTP **`503 Service Unavailable`** chuẩn hóa:
  - `/fallback/auth` $\rightarrow$ Auth Service Unavailable
  - `/fallback/product` $\rightarrow$ Product Service Unavailable
  - `/fallback/order` $\rightarrow$ Order Service Unavailable
  - `/fallback/payment` $\rightarrow$ Payment Service Unavailable

---

## 🔄 3. Luồng Giao dịch Phân tán: Saga Pattern (Choreography)

Hệ thống triển khai **Saga Pattern theo cơ chế Biên đạo (Choreography-based Saga)** kết hợp giao tiếp đồng bộ (OpenFeign) và bất đồng bộ hướng sự kiện (Kafka Events) để đảm bảo tính toàn vẹn dữ liệu cuối cùng (Eventual Consistency):

```
[Client] ──1. POST /api/v1/orders/checkout──► [Order Service]
                                                     │
                             2. Feign (Sync)         │
                         reserveStock()              │
                                                     ▼
                                            [Product Service] (Trừ tạm tồn kho)
                                                     │
                             3. Produce Event        ▼
                           OrderCreatedEvent ──► [Kafka Topic: order-created]
                                                     │
                                                     ▼ 4. Consume Event
                                            [Payment Service] (Xử lý thanh toán)
                                                     │
                ┌────────────────────────────────────┴────────────────────────────────────┐
                ▼ (Thành công)                                                            ▼ (Thất bại)
    [Kafka: payment-success]                                                  [Kafka: payment-failed]
                │                                                                         │
                ▼ (Consume)                                                               ▼ (Consume)
        [Order Service]                                                           [Order Service]
   Cập nhật trạng thái: PAID                                                1. Cập nhật trạng thái: FAILED
                                                                            2. [Saga Compensation] ──┐
                                                                               Gọi Feign restoreStock│
                                                                                                     ▼
                                                                                             [Product Service]
                                                                                           (Hoàn lại tồn kho)
```

### Các bước chi tiết trong luồng Saga:

1. **Khởi tạo Đơn hàng (Order Placement):**
   - Khách hàng thực hiện checkout tại `order-service`.
   - `order-service` gửi request đồng bộ qua FeignClient sang `product-service` để giữ hàng tồn kho (`reserveStock`).
   - Nếu tồn kho đủ, đơn hàng được lưu vào cơ sở dữ liệu với trạng thái ban đầu là **`PENDING`**.

2. **Phát sự kiện Đơn hàng mới (Order Created Event):**
   - `order-service` phát thông điệp `OrderCreatedEvent` (bao gồm `orderId`, `userId`, `totalAmount`, `paymentMethod`) vào Kafka topic **`order-created`**.

3. **Xử lý Thanh toán (Payment Processing):**
   - `payment-service` lắng nghe topic `order-created`, tạo bản ghi giao dịch thanh toán và xử lý giao dịch.

4. **Nhánh Thành công (Happy Path):**
   - Thanh toán hợp lệ, `payment-service` cập nhật trạng thái thanh toán là `COMPLETED` và phát sự kiện `PaymentSuccessEvent` vào topic **`payment-success`**.
   - `order-service` nhận sự kiện `PaymentSuccessEvent` $\rightarrow$ cập nhật trạng thái đơn hàng sang **`PAID`** (hoặc `CONFIRMED`).

5. **Nhánh Thất bại & Giao dịch Bù trừ (Compensating Transaction):**
   - Nếu thanh toán thất bại (tài khoản không đủ tiền, lỗi cổng thanh toán...), `payment-service` phát sự kiện `PaymentFailedEvent` vào topic **`payment-failed`**.
   - `order-service` nhận sự kiện `PaymentFailedEvent`:
     - Cập nhật trạng thái đơn hàng sang **`FAILED`**.
     - Thực thi **Giao dịch bù trừ (Compensating Transaction)**: Tự động gọi FeignClient sang `product-service` API `restoreStock` để khôi phục lại toàn bộ số lượng tồn kho đã giữ trước đó.

---

## 🔌 4. Bảng Cổng & Đường Dẫn Dịch Vụ (Port Mapping)

| Thành phần | Cổng Host | Đường dẫn truy cập | Tài khoản / Ghi chú |
|:---|:---:|:---|:---|
| **API Gateway** | `8080` | `http://localhost:8080` | Cổng vào duy nhất của hệ thống |
| **Eureka Server** | `8761` | `http://localhost:8761` | `eureka` / `eurekapassword` |
| **Auth Service** | `8081` | `http://localhost:8081/swagger-ui.html` | Đăng ký, đăng nhập, JWT tokens |
| **Product Service** | `8082` | `http://localhost:8082/swagger-ui.html` | CRUD sản phẩm, tồn kho |
| **Order Service** | `8083` | `http://localhost:8083/swagger-ui.html` | Quản lý đơn hàng, giỏ hàng |
| **Payment Service** | `8084` | `http://localhost:8084/swagger-ui.html` | Xử lý thanh toán |
| **Kafka UI** | `8090` | `http://localhost:8090` | Dashboard giám sát Topic, Message |
| **MySQL Database**| `3306` | `localhost:3306` | `ecommerce_user` / `ecommerce_pass` |
| **Redis Cache** | `6379` | `localhost:6379` | Mật khẩu: `redispassword` |
| **Zookeeper** | `2181` | `localhost:2181` | Điều phối cụm Kafka |

---

## 🚀 5. Hướng Dẫn Chạy Dự Án (Deployment Guide)

### 5.1. Yêu cầu Tiên quyết
- **Java Development Kit (JDK):** Phiên bản 21 trở lên.
- **Docker & Docker Compose:** Docker Desktop hoặc Docker Engine version 24+.

---

### 5.2. Cách 1: Triển khai toàn bộ bằng Docker Compose (Khuyến nghị cho Buổi Bảo vệ)

Hệ thống đã cấu hình điều kiện khởi động phụ thuộc nghiêm ngặt theo đúng trình tự:
$$\text{Zookeeper} \longrightarrow \text{Kafka} \longrightarrow \text{MySQL / Redis} \longrightarrow \text{Discovery Server} \longrightarrow \text{Core Services} \longrightarrow \text{API Gateway}$$

```bash
# Bước 1: Điều hướng vào thư mục backend
cd backend

# Bước 2: Build tất cả các artifact JAR bằng Gradle Wrapper
# Trên Linux / macOS:
./gradlew clean bootJar -x test

# Trên Windows (PowerShell / CMD):
.\gradlew.bat clean bootJar -x test

# Bước 3: Khởi chạy toàn bộ hệ thống bằng Docker Compose
docker compose up -d --build

# Bước 4: Kiểm tra trạng thái sức khỏe (Health Status) của các container
docker compose ps

# Bước 5: Xem log thời gian thực của toàn bộ hệ thống
docker compose logs -f
```

---

### 5.3. Cách 2: Chạy phục vụ Phát triển cục bộ (Local Development)

Nếu muốn debug hoặc chạy từng service trên máy tính:

```bash
cd backend

# 1. Chỉ khởi động hạ tầng dùng chung (MySQL, Redis, Zookeeper, Kafka, Kafka UI)
docker compose up -d zookeeper kafka mysql redis kafka-ui

# 2. Khởi chạy Discovery Server trước (Terminal 1)
./gradlew :discovery-server:bootRun

# 3. Khởi chạy các Core Services (Terminal 2, 3, 4, 5)
./gradlew :auth-service:bootRun
./gradlew :product-service:bootRun
./gradlew :order-service:bootRun
./gradlew :payment-service:bootRun

# 4. Khởi chạy API Gateway sau cùng (Terminal 6)
./gradlew :api-gateway:bootRun
```

---

## 🧪 6. Hướng Dẫn Kiểm Thử Luồng Chính Qua API Gateway (`:8080`)

### Bước 1: Đăng ký & Đăng nhập lấy JWT Token
```bash
# Đăng nhập lấy access_token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@ecommerce.com","password":"Password123@"}'
```
Lấy `accessToken` từ phản hồi để dùng cho các request tiếp theo.

### Bước 2: Đọc danh sách sản phẩm (Không cần Token)
```bash
curl -X GET http://localhost:8080/api/v1/products
```

### Bước 3: Thao tác ghi sản phẩm (Bắt buộc Token)
```bash
curl -X POST http://localhost:8080/api/v1/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{"name":"Laptop Gaming ASUS ROG","price":25000000,"stock":10,"description":"Ryzen 9, RTX 4070"}'
```

### Bước 4: Đặt hàng (Kích hoạt luồng Saga & Kiểm tra Rate Limit)
```bash
curl -X POST http://localhost:8080/api/v1/orders/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "userId": 1,
    "paymentMethod": "CREDIT_CARD",
    "shippingAddress": "123 Đường Nguyễn Huệ, Quận 1, TP.HCM",
    "items": [
      {"productId": 1, "quantity": 1, "price": 25000000}
    ]
  }'
```
> **Kiểm tra Anti-Spam Rate Limit:** Gửi liên tục từ 6 request checkout trở lên trong 1 giây, hệ thống sẽ trả về mã lỗi HTTP **`429 Too Many Requests`**.

### Bước 5: Kiểm tra Circuit Breaker Fallback
Tắt `product-service` (`docker compose stop product-service`), sau đó gửi request tới `http://localhost:8080/api/v1/products`.  
Gateway sẽ tự động ngắt mạch và trả về phản hồi fallback:
```json
{
  "success": false,
  "message": "Dịch vụ sản phẩm (Product Service) tạm thời không khả dụng hoặc quá thời gian phản hồi. Vui lòng thử lại sau.",
  "timestamp": "2026-10-30T10:00:00.000"
}
```

---

## 👥 Danh Sách Đóng Góp
- **Sprint 5 ngày:** Hoàn thiện kiến trúc Microservices, Service Discovery, Gateway Security, Saga Pattern, Resilience4j, Docker Orchestration.
