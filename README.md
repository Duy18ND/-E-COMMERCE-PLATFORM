# SHOPMART E-COMMERCE PLATFORM — MICROSERVICES SYSTEM

> **Nền tảng Thương mại Điện tử Phân tán Kiến trúc Microservices Chuẩn Doanh nghiệp**  
> Dự án áp dụng Spring Boot 3.3, Spring Cloud Gateway (WebFlux), Netflix Eureka Service Discovery, Apache Kafka Event-Driven Saga Pattern, Redis Cache & Rate Limiting, MySQL 8.0 Multi-database, React 18, Vite, Docker Compose, và GitHub Actions CI/CD Pipeline tự động triển khai GHCR & Ubuntu VPS.

---

## 1. Giới thiệu Dự án & Kiến trúc Hệ thống

ShopMart là hệ thống thương mại điện tử phân tán quy mô lớn được thiết kế theo mô hình Microservices khép kín, phân tách độc lập giữa các domain nghiệp vụ cốt lõi: Xác thực tài khoản (Auth), Quản lý sản phẩm & tồn kho (Product), Quản lý giỏ hàng & đơn hàng (Order), và Cổng thanh toán mô phỏng (Payment).

Toàn bộ luồng giao tiếp ngoại vi từ Web Client hoặc Mobile App đều đi qua điểm tập trung duy nhất là **Nginx Reverse Proxy** và **API Gateway**, giúp cô lập toàn bộ hạ tầng cơ sở dữ liệu và các microservice nội bộ.

### Sơ đồ Kiến trúc Tổng thể (System Architecture)

```
[Web Browser / React Client / Postman]
                  │
                  ▼ HTTP / HTTPS (Port 80 / 443)
       ┌────────────────────────┐
       │   Nginx Reverse Proxy  │ ──► Static React Assets (SPA fallback)
       └────────────────────────┘
                  │  /api/v1/**
                  ▼
       ┌────────────────────────┐
       │   API Gateway (:8080)  │ ◄── JWT Authentication Filter
       └────────────────────────┘ ◄── Redis Distributed Rate Limiter
                  │               ◄── Resilience4j Circuit Breaker
       ┌──────────┴─────────────┐
       │  Eureka Discovery Server│ (:8761)
       └────────────────────────┘
                  │
    ┌─────────────┼────────────────────────┬──────────────────────┐
    ▼             ▼                        ▼                      ▼
[Auth Service] [Product Service]     [Order Service]       [Payment Service]
   (:8081)        (:8082)                  (:8083)                (:8084)
    │              │                        │                      │
    │              │          OpenFeign     │                      │
    │              │◄───────────────────────┤                      │
    │              │ (Reserve/Restore Stock)│                      │
    ▼              ▼                        ▼                      ▼
[MySQL:auth_db] [MySQL:product_db]   [MySQL:order_db]      [MySQL:payment_db]
[Redis:token_bl][Redis:prod_cache]          │                      │
                                            ▼                      ▼
                                     [Apache Kafka Event Broker :9092]
                                     Topics: order-created
                                             payment-success
                                             payment-failed
```

---

## 2. Công nghệ Sử dụng (Tech Stack)

| Phân hệ | Công nghệ & Thư viện | Phiên bản | Vai trò |
|---|---|:---:|---|
| **Frontend** | React, React Router, Vite, Axios | 18.3.1 / 5.4.x | Giao diện Single Page Application (SPA), Responsive UI |
| **Backend Core** | Java, Spring Boot, Spring Cloud | Java 21 / 3.3.4 | Nền tảng Microservices phân tán |
| **Service Gateway** | Spring Cloud Gateway (WebFlux) | 2023.0.3 | Định tuyến tập trung, lọc JWT, Rate Limiting, CORS |
| **Service Registry** | Spring Cloud Netflix Eureka | 2023.0.3 | Quản lý đăng ký và phát hiện dịch vụ tự động |
| **Database** | MySQL Server | 8.0 | Lưu trữ quan hệ ACID, 4 database riêng biệt cho 4 service |
| **Cache & Limiter** | Redis Server, Lettuce | 7.2 | Bộ đệm danh mục/sản phẩm, Blacklist token, Token bucket limiter |
| **Event Streaming** | Apache Kafka & Zookeeper | Confluent 7.6.1 | Hàng đợi sự kiện phi tập trung cho Choreography Saga |
| **Inter-Service** | Spring Cloud OpenFeign, Resilience4j | 2023.0.3 | Giao tiếp HTTP đồng bộ kèm Circuit Breaker chống sập lan chuyền |
| **Container & CI/CD**| Docker, Docker Compose, GHCR, GitHub Actions | 29.5 / v5.1 | Đóng gói Multi-stage, CI song song, CD an toàn lên VPS Ubuntu |

---

## 3. Cấu trúc Thư mục Dự án (Project Directory Structure)

```
c:\IT209\-E-COMMERCE-PLATFORM
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Continuous Integration (Frontend, Backend, Docker, Security)
│       ├── release.yml            # Matrix Build 7 Microservices & Push GHCR
│       └── deploy.yml             # SSH Deployment, mysqldump backup & automated rollback
├── backend/
│   ├── api-gateway/               # Spring Cloud Gateway (Port 8080)
│   ├── auth-service/              # JWT Auth, User & Address Management (Port 8081)
│   ├── discovery-server/          # Eureka Service Registry (Port 8761)
│   ├── order-service/             # Cart, Checkout, Order Tracking & Audit (Port 8083)
│   ├── payment-service/           # Mock Payment, Saga Consumer/Producer (Port 8084)
│   ├── product-service/           # Catalog, Stock, Flash Sale, Reviews (Port 8082)
│   ├── docker/
│   │   ├── mysql/init.sql         # Script tạo 4 databases, roles & tables chuẩn hóa
│   │   └── nginx/nginx.conf       # Cấu hình Reverse Proxy Nginx
│   ├── docker-compose.yml         # Compose cho môi trường Development đầy đủ
│   ├── docker-compose.prod.yml    # Compose cho môi trường Production (Port hardening)
│   ├── build.gradle               # Root Gradle multi-project build file
│   └── gradlew / gradlew.bat      # Gradle Wrapper (Gradle 8.7)
├── frontend/
│   ├── src/
│   │   ├── components/            # Header, Footer, OrderTimeline, Modals, ProductCard
│   │   ├── context/               # AuthContext, CartContext, NotificationContext
│   │   ├── pages/                 # Home, Products, Cart, Checkout, Orders, Tracking, Admin
│   │   └── services/              # api.js, authService, productService, orderService
│   ├── tests/                     # 28 QA & E2E Automated Test Suites (Node.js Test Runner)
│   ├── package.json               # Frontend dependencies & npm test scripts
│   └── vite.config.js             # Cấu hình Vite build & dev proxy
├── postman/
│   ├── ShopMart_Complete_API_Collection.postman_collection.json # Bộ Postman API hoàn chỉnh
│   └── ShopMart_Complete_Environment.postman_environment.json   # Environment Gateway 8080
├── docs/
│   ├── CI_CD_SETUP.md             # Hướng dẫn thiết lập Secrets, GHCR và Branch Rules
│   └── VPS_DEPLOYMENT.md          # Hướng dẫn chi tiết triển khai máy chủ VPS Ubuntu
└── reports/                       # Báo cáo nghiệm thu kỹ thuật, E2E QA, API Docs & Demo
```

---

## 4. Yêu cầu Môi trường (System Requirements)

- **Hệ điều hành:** Windows 10/11, Ubuntu 22.04 LTS hoặc macOS.
- **Node.js:** Phiên bản 20 LTS trở lên (`node -v` $\ge$ 20.0.0).
- **JDK:** OpenJDK 21 (Eclipse Temurin hoặc Microsoft OpenJDK 21).
- **Docker & Docker Compose:** Docker Engine $\ge$ 24.0, Docker Compose $\ge$ 2.20 (hoặc v5.x).
- **RAM tối thiểu:** 8 GB (Khuyến nghị 16 GB để chạy toàn bộ 12 containers cùng lúc).

---

## 5. Cấu hình Môi trường (.env)

### 5.1. Cấu hình Frontend (`frontend/.env`)
Tạo file `frontend/.env` từ `frontend/.env.example`:
```env
# URL trỏ về API Gateway (Local: http://localhost:8080/api/v1, Docker/Nginx: /api/v1)
VITE_API_URL=http://localhost:8080/api/v1
VITE_USE_MOCK_AUTH=false
```

### 5.2. Cấu hình Backend (`backend/.env`)
Tạo file `backend/.env` từ `backend/.env.example`:
```env
# Spring Profile
SPRING_PROFILES_ACTIVE=dev

# MySQL Database
MYSQL_ROOT_PASSWORD=rootpassword
MYSQL_DATABASE=product_db
MYSQL_USER=ecommerce_user
MYSQL_PASSWORD=ecommerce_password
MYSQL_PORT=3306

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Eureka
EUREKA_SERVER_URL=http://localhost:8761/eureka
EUREKA_USER=eureka
EUREKA_PASSWORD=eurekapassword

# JWT Secret (Tối thiểu 512-bit HS512)
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
JWT_EXPIRATION=86400000
```

---

## 6. Hướng dẫn Khởi chạy Hệ thống

### 6.1. Cách 1: Khởi chạy bằng Docker Compose (Khuyến nghị cho Fullstack & Production)

Khởi động toàn bộ 12 containers bao gồm MySQL, Redis, Kafka, Zookeeper, Eureka, Gateway, 4 Microservices, Frontend và Nginx:

```bash
# 1. Điều hướng vào thư mục backend
cd backend

# 2. Khởi chạy toàn bộ hệ thống
docker compose up -d --build

# 3. Theo dõi trạng thái sức khỏe
docker compose ps
```

Sau khi toàn bộ containers chuyển sang trạng thái `healthy`:
- **Giao diện Cửa hàng (Storefront):** `http://localhost` (hoặc `http://localhost:5173`)
- **API Gateway:** `http://localhost:8080`
- **Eureka Dashboard:** `http://localhost:8761` (Tài khoản: `eureka` / `eurekapassword`)
- **Kafka UI:** `http://localhost:8090`

### 6.2. Cách 2: Khởi chạy Cục bộ cho Lập trình viên (Local Developer Mode)

#### Bước 1: Khởi động Hạ tầng nền tảng (Database, Cache, Message Queue)
```bash
cd backend
docker compose up -d mysql redis zookeeper kafka
```

#### Bước 2: Khởi chạy các Backend Microservices (theo đúng thứ tự)
Mở các cửa sổ terminal riêng biệt và chạy:
```bash
# 1. Discovery Server
cd backend/discovery-server && ../gradlew bootRun

# 2. API Gateway
cd backend/api-gateway && ../gradlew bootRun

# 3. Auth Service
cd backend/auth-service && ../gradlew bootRun

# 4. Product Service
cd backend/product-service && ../gradlew bootRun

# 5. Order Service
cd backend/order-service && ../gradlew bootRun

# 6. Payment Service
cd backend/payment-service && ../gradlew bootRun
```

#### Bước 3: Khởi chạy Giao diện Frontend
```bash
cd frontend
npm ci
npm run dev
```
Truy cập `http://localhost:5173` trên trình duyệt.

---

## 7. Tài khoản Demo Thực tế

Hệ thống hỗ trợ kiểm thử trực tiếp qua các tài khoản định danh:

| Vai trò | Email đăng nhập | Mật khẩu | Quyền hạn |
|---|---|---|---|
| **Admin** | `admin@shopmart.com` | `Admin@123` | Quản trị danh mục, thêm/sửa/xóa sản phẩm, cập nhật tồn kho, duyệt và cập nhật trạng thái đơn hàng |
| **Customer** | `customer@shopmart.com` | `Customer@123` | Xem sản phẩm, tìm kiếm, giỏ hàng, đặt hàng, hủy đơn, theo dõi timeline vận chuyển |
| **Tài khoản mới** | Đăng ký trực tiếp tại `/register` | Tự chọn (tối thiểu 6 ký tự) | Tự động gán quyền `ROLE_USER` |

---

## 8. Hướng dẫn Chạy Kiểm thử Toàn diện (Testing)

### 8.1. Kiểm thử Frontend (Lint, Tests, Build)
```bash
cd frontend

# 1. Kiểm tra cú pháp và imports (0 lỗi)
npm run lint

# 2. Chạy toàn bộ 28 Test Suites E2E & QA tự động
npm test

# 3. Đóng gói kiểm tra Production Assets
npm run build
```

### 8.2. Kiểm thử Backend (Unit & Integration Tests)
```bash
cd backend

# Chạy toàn bộ bài kiểm thử đơn vị của cả 6 microservices
./gradlew test --no-daemon --max-workers=2

# Kiểm tra đóng gói Spring Boot Executable JARs
./gradlew bootJar --no-daemon -x test --max-workers=2
```

### 8.3. Kiểm thử Cấu hình Docker & Bảo mật
```bash
# Kiểm tra cú pháp Compose Development
docker compose -f backend/docker-compose.yml config --quiet

# Kiểm tra cú pháp Compose Production & Port Hardening
docker compose -f backend/docker-compose.prod.yml config --quiet
```

---

## 9. Danh mục API Chính (API Quick Reference)

Chi tiết đầy đủ xem tại [`reports/ECOM-329_API_DOCUMENTATION.md`](reports/ECOM-329_API_DOCUMENTATION.md) và Postman Collection [`postman/ShopMart_Complete_API_Collection.postman_collection.json`](postman/ShopMart_Complete_API_Collection.postman_collection.json).

- `POST /api/v1/auth/register` — Đăng ký tài khoản khách hàng mới
- `POST /api/v1/auth/login` — Đăng nhập hệ thống, cấp mã JWT Token
- `GET /api/v1/products` — Lấy danh sách sản phẩm phân trang & bộ lọc
- `GET /api/v1/products/search?keyword=...` — Tìm kiếm sản phẩm
- `GET /api/v1/cart` — Xem giỏ hàng người dùng
- `POST /api/v1/cart/items` — Thêm sản phẩm vào giỏ hàng
- `POST /api/v1/orders/checkout` — Đặt hàng từ giỏ hàng hoặc mua ngay (Trừ kho tự động)
- `GET /api/v1/orders/{id}/timeline` — Xem timeline lịch sử xử lý đơn hàng
- `POST /api/v1/payments/mock-pay/{orderId}` — Xác nhận thanh toán mô phỏng (Saga Commit / Rollback)
- `GET /api/v1/admin/orders` — Admin quản lý danh sách đơn hàng toàn sàn
- `PUT /api/v1/admin/orders/{id}/status` — Admin duyệt đơn hàng và chuyển trạng thái

---

## 10. Tài liệu Kỹ thuật Bổ trợ

- [Báo cáo Triển khai CI/CD ECOM-152](reports/ECOM-152_IMPLEMENTATION_REPORT.md)
- [Báo cáo Tổng hợp QA & Docs ECOM-329](reports/ECOM-329_IMPLEMENTATION_REPORT.md)
- [Báo cáo Kiểm thử Tích hợp E2E ECOM-155](reports/ECOM-329_E2E_TEST_REPORT.md)
- [Tài liệu Đặc tả REST API Toàn diện](reports/ECOM-329_API_DOCUMENTATION.md)
- [Kịch bản Demo Hệ thống MVP (11 Bước)](reports/ECOM-329_DEMO_SCRIPT.md)
- [Báo cáo Lỗi & Khuyến nghị Kỹ thuật](reports/ECOM-329_BUG_REPORT.md)
- [Hướng dẫn Cấu hình VPS Ubuntu & Bảo mật](docs/VPS_DEPLOYMENT.md)
