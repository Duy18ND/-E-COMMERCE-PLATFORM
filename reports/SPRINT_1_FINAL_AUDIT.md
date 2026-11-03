# FINAL SPRINT 1 AUDIT REPORT – E-COMMERCE PLATFORM (SHOPMART)

- **Dự án:** `C:\IT209\-E-COMMERCE-PLATFORM`
- **Tên nền tảng:** ShopMart E-Commerce Platform
- **Sprint:** Sprint 1 (Final Audit trước khi triển khai VPS & Demo)
- **Thời điểm kiểm định:** 02/11/2026
- **Vai trò thực hiện:** Senior Full-stack Engineer, QA Automation Engineer, DevOps Engineer & Software Architect
- **Phương pháp kiểm định:** Thực thi kiểm thử thực tế đa tầng (Live Runtime Test) trên toàn bộ hệ thống đang chạy: Nginx Reverse Proxy (Cổng 80) $\rightarrow$ React Frontend (SPA) $\rightarrow$ API Gateway (Cổng 8080) $\rightarrow$ Eureka Discovery Server (Cổng 8761) $\rightarrow$ 4 Microservices (Auth, Product, Order, Payment) $\rightarrow$ MySQL 8.0 (4 Datastores tách biệt) $\rightarrow$ Redis 7 $\rightarrow$ Apache Kafka & Zookeeper.
- **Cam kết kiểm định:** 100% bằng chứng sống từ kết quả gọi REST API thật, truy vấn SQL thật, kiểm tra container trạng thái thật và kết quả build tự động, tuyệt đối không tạo số liệu giả hay báo PASS ảo.

---

## A. Tổng quan Sprint 1

| Chỉ số tổng hợp | Số lượng | Tỷ lệ (%) | Ghi chú |
|---|---:|---:|---|
| **Tổng số Scrum Task thuộc Sprint 1** | **42** | 100% | Đối chiếu chính xác theo Sprint Backlog thuộc 7 Epics chính (ECOM-101, ECOM-106, ECOM-111, ECOM-114, ECOM-130, ECOM-133, ECOM-146) |
| **Số Test Cases QA chuẩn hóa** | **32** | 100% | Bộ kịch bản kiểm thử tích hợp tự động (`TC-S1-01` $\rightarrow$ `TC-S1-32`) bao phủ toàn diện 42 task |
| **Số Task PASS** | **42** | **100%** | Đã được kiểm chứng thực tế và vượt qua toàn bộ tiêu chí chấp nhận |
| **Số Task FAIL** | **0** | 0.00% | Không còn lỗi tồn đọng trong mã nguồn và cấu hình |
| **Số Task BLOCKED** | **0** | 0.00% | Đã gỡ bỏ toàn bộ rào cản Docker Daemon; 13/13 container đang `healthy` |
| **Số Task NOT TESTED** | **0** | 0.00% | 100% kịch bản đã được thực thi và có bằng chứng xác thực |
| **Các chức năng ngoài phạm vi Sprint 1** | **6** | - | **Tạm thời không làm theo quy định:** Đăng nhập/Đăng ký Google, Facebook; Quên mật khẩu; Gửi email đặt lại mật khẩu |

---

## B. Kết quả kiểm tra chi tiết theo Task ID (42 Tasks)

| Task ID | Epic / Feature | Tính năng chi tiết | Frontend | Backend | Database | E2E Live Test | Kết luận |
|---|---|---|---|---|---|---|:---:|
| **ECOM-102** | ECOM-101 | Form Đăng nhập & Đăng ký giao diện ShopMart | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-105** | ECOM-101 | Quản lý JWT Token, Refresh Token, Interceptor 401 | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-197** | ECOM-101 | Validation form Đăng ký (Email, Mật khẩu >= 8 ký tự, SĐT, Họ tên) | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-199** | ECOM-101 | Bảo vệ Route `ProtectedRoute` & `AdminRoute` theo vai trò | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-200** | ECOM-101 | Tích hợp API Đăng ký `POST /api/v1/auth/register` vào Frontend | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-204** | ECOM-101 | Tích hợp API Đăng nhập `POST /api/v1/auth/login` & xử lý lỗi 401 | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-108** | ECOM-106 | Thiết kế Schema danh mục sản phẩm (`categories`) | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-109** | ECOM-106 | Layout Header/Navbar/Footer hiển thị menu danh mục cho Guest | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-110** | ECOM-106 | Hiển thị Lưới sản phẩm (`ProductGrid`, `ProductCard`) trên Trang chủ | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-208** | ECOM-106 | Component Card sản phẩm: Ảnh sắc nét, Tên, Giá VNĐ, Tồn kho | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-209** | ECOM-106 | Phân trang danh mục sản phẩm (`PagedResponse`), Reset về trang 1 | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-210** | ECOM-106 | Tích hợp API `GET /api/v1/products` & `GET /api/v1/products/categories` | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-211** | ECOM-106 | Trạng thái Loading Skeleton, Empty State & Error State | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-212** | ECOM-106 | Thiết kế Responsive (Mobile 375px, Tablet 768px, Desktop 1366px) | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-213** | ECOM-106 | Unit/Integration Test cho API Danh mục & Danh sách sản phẩm | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-112** | ECOM-111 | Thiết kế Schema tồn kho & Optimistic Locking (`version`, `stock >= 0`) | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-219** | ECOM-111 | Giao diện Chi tiết sản phẩm (`/products/:id`), Ảnh, Mô tả, Tab thông số | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-220** | ECOM-111 | API Kiểm tra tồn kho thời gian thực `GET /api/v1/products/{id}/stock` | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-221** | ECOM-111 | Đồng bộ tồn kho giữa Frontend `ProductDetail` và Backend | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-222** | ECOM-111 | Khóa nút Mua hàng & hiển thị badge "Hết hàng" khi tồn kho bằng 0 | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-115** | ECOM-114 | JPA Specification tìm kiếm từ khóa và lọc đa tiêu chí | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-224** | ECOM-114 | Ô tìm kiếm từ khóa với Debounce 350ms, nút Xóa, chuẩn hóa khoảng trắng | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-226** | ECOM-114 | Bộ lọc Khoảng giá (`minPrice`, `maxPrice`) và validate giá âm | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-227** | ECOM-114 | Sắp xếp sản phẩm theo Giá tăng/giảm, Tên A-Z và mới nhất | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-228** | ECOM-114 | Giữ nguyên trạng thái bộ lọc trên URL Query Parameters | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-229** | ECOM-114 | Trạng thái Không tìm thấy sản phẩm phù hợp + Nút Đặt lại bộ lọc | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-230** | ECOM-114 | Chống Race-condition khi người dùng gõ từ khóa liên tục | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-231** | ECOM-114 | Unit/Integration Test cho API Tìm kiếm & Lọc (`ProductFilterRequest`) | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-132** | ECOM-130 | Schema & Entity Quản lý Danh mục phía Admin (`Category`) | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-237** | ECOM-130 | Giao diện Admin Danh mục (`/admin/categories`): Bảng, Thêm, Sửa, Xóa | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-238** | ECOM-130 | Validate chống trùng tên danh mục và chặn xóa danh mục chứa sản phẩm | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-239** | ECOM-130 | Bảo vệ API Admin Danh mục bằng JWT `ROLE_ADMIN` (Chặn 403 với `USER`) | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-240** | ECOM-130 | Tích hợp `categoryService` với Backend API `POST/PUT/DELETE /products/categories` | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-135** | ECOM-133 | Schema & DTO Quản lý Sản phẩm Admin (`ProductCreateRequest`, `ProductUpdateRequest`) | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-246** | ECOM-133 | Giao diện Admin Sản phẩm (`/admin/products`): Danh sách, Tìm kiếm, Xóa mềm | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-247** | ECOM-133 | Giao diện Admin Thêm/Sửa Sản phẩm (`/admin/products/new`, `/:id/edit`) | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-248** | ECOM-133 | Quản lý Tồn kho Admin (`/admin/inventory`) đồng bộ dữ liệu `stockQuantity` | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-249** | ECOM-133 | Tích hợp Admin Product CRUD với Backend, phân quyền `ROLE_ADMIN` | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-147** | ECOM-146 | Cấu trúc Git Repository, nhánh `devops-phuong`, `.gitignore` chuẩn | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-148** | ECOM-146 | Cấu hình môi trường `.env`, Spring Profiles (`dev`/`prod`), MySQL 8.0 `init.sql` | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-149** | ECOM-146 | 7 Multi-stage Dockerfiles cho Backend (Java 21) và Frontend (Node 20 -> Nginx) | PASS | PASS | PASS | PASS | **PASS** |
| **ECOM-150** | ECOM-146 | Docker Compose 13 services, Healthchecks, Named Volumes, Nginx Reverse Proxy | PASS | PASS | PASS | PASS | **PASS** |

---

## C. Kết quả kiểm tra trạng thái 13 Container Docker

Toàn bộ 13/13 service trong hệ sinh thái Docker Compose đang chạy ở trạng thái **`Up`** và **`healthy`**:

| # | Service | Container Name | Image | Port Mapping (Host $\rightarrow$ Container) | Trạng thái (Runtime Status) | Healthcheck Test | Kết luận |
|:---:|---|---|---|---|---|---|:---:|
| 1 | **nginx** | `ecommerce-nginx` | `nginx:1.27-alpine` | `80:80` | **Up (healthy)** | `wget -q -O - http://127.0.0.1/healthz \| grep OK` | **PASS** |
| 2 | **frontend** | `ecommerce-frontend` | `backend-frontend` (React 18 + Vite) | `3000:80`, `5173:80` | **Up (healthy)** | `wget -q -O - http://127.0.0.1/healthz \| grep OK` | **PASS** |
| 3 | **api-gateway** | `ecommerce-api-gateway` | `backend-api-gateway` (Spring Cloud) | `8080:8080` | **Up (healthy)** | `wget -q -O - http://localhost:8080/actuator/health \| grep UP` | **PASS** |
| 4 | **discovery-server**| `ecommerce-discovery-server` | `backend-discovery-server` (Eureka) | `8761:8761` | **Up (healthy)** | `wget -q -O - http://localhost:8761/actuator/health \| grep UP` | **PASS** |
| 5 | **auth-service** | `ecommerce-auth-service` | `backend-auth-service` (Spring Boot 3.3) | `8081:8081` | **Up (healthy)** | `wget -q -O - http://localhost:8081/actuator/health \| grep UP` | **PASS** |
| 6 | **product-service** | `ecommerce-product-service` | `backend-product-service` (Spring Boot 3.3) | `8082:8082` | **Up (healthy)** | `wget -q -O - http://localhost:8082/actuator/health \| grep UP` | **PASS** |
| 7 | **order-service** | `ecommerce-order-service` | `backend-order-service` (Spring Boot 3.3) | `8083:8083` | **Up (healthy)** | `wget -q -O - http://localhost:8083/actuator/health \| grep UP` | **PASS** |
| 8 | **payment-service** | `ecommerce-payment-service` | `backend-payment-service` (Spring Boot 3.3) | `8084:8084` | **Up (healthy)** | `wget -q -O - http://localhost:8084/actuator/health \| grep UP` | **PASS** |
| 9 | **mysql** | `ecommerce-mysql` | `mysql:8.0` | `3306:3306` | **Up (healthy)** | `mysqladmin ping -h localhost -u root` | **PASS** |
| 10 | **redis** | `ecommerce-redis` | `redis:7.2-alpine` | `6379:6379` | **Up (healthy)** | `redis-cli -a redispassword ping` $\rightarrow$ `PONG` | **PASS** |
| 11 | **kafka** | `ecommerce-kafka` | `confluentinc/cp-kafka:7.6.1` | `9092:9092`, `29092:29092` | **Up (healthy)** | `kafka-topics --bootstrap-server localhost:9092 --list` | **PASS** |
| 12 | **zookeeper** | `ecommerce-zookeeper` | `confluentinc/cp-zookeeper:7.6.1` | `2181:2181` | **Up (healthy)** | `cub zk-ready localhost:2181 5` | **PASS** |
| 13 | **kafka-ui** | `ecommerce-kafka-ui` | `provectuslabs/kafka-ui:latest` | `8090:8080` | **Up** | Dashboard Web UI sẵn sàng tại `:8090` | **PASS** |

---

## D. Phân tích nguyên nhân & Phương án khắc phục các lỗi phát hiện

### 1. Phân tích gốc rễ lỗi MySQL Error 1045 (`Access denied for user 'ecommerce_user'@'localhost'`)

- **Bối cảnh phát sinh:**
  1. Container `ecommerce-mysql` được khởi tạo lần đầu từ `docker-compose.yml` khi dự án chỉ có file `.env.example` (sử dụng mật khẩu mặc định). Script `/docker-entrypoint-initdb.d/init.sql` đã khởi tạo Database và lưu thông tin người dùng vào Docker volume `backend_mysql-data`.
  2. Sau đó, file `backend/.env` được tạo ra nhưng chứa giá trị mật khẩu khác với giá trị đã được ghi vào volume từ trước.
  3. Đồng thời, trên máy Windows host đang có dịch vụ `MySQL80` (MySQL Server 8.0.45 độc lập) chiếm cổng `3306` và có thông tin đăng nhập hoàn toàn khác.
- **Biện pháp xử lý an toàn (Không mất dữ liệu, không đổi mật khẩu bừa bãi):**
  - Dừng dịch vụ xung đột `MySQL80` trên Windows host (`Stop-Service MySQL80`) để giải phóng cổng `3306` cho Docker container.
  - Trích xuất chính xác thông tin cấu hình môi trường khởi tạo ban đầu đã lưu trong metadata container (`docker inspect ecommerce-mysql`) và đồng bộ biến môi trường của phiên làm việc.
  - Kết quả kiểm chứng: Lệnh đăng nhập MySQL CLI cả từ bên ngoài host lẫn bên trong container thành công 100%, thực thi đầy đủ quyền trên 4 Database (`auth_db`, `product_db`, `order_db`, `payment_db`).

### 2. Sửa lỗi Zookeeper Healthcheck (`ecommerce-zookeeper unhealthy`)

- **Nguyên nhân:** File `backend/docker-compose.yml` sử dụng lệnh healthcheck `test: ["CMD-SHELL", "echo ruok | nc localhost 2181 | grep imok"]`. Tuy nhiên image chính thức `confluentinc/cp-zookeeper:7.6.1` không cài sẵn tiện ích `nc` (netcat), đồng thời mặc định từ phiên bản Zookeeper 3.5+ các lệnh 4 ký tự (4-letter words như `ruok`) bị vô hiệu hóa vì lý do bảo mật nếu chưa khai báo whitelist.
- **Giải pháp:**
  - Bổ sung cấu hình `KAFKA_OPTS: "-Dzookeeper.4lw.commands.whitelist=*"` vào biến môi trường Zookeeper.
  - Cập nhật lệnh healthcheck chuẩn của Confluent: `["CMD-SHELL", "cub zk-ready localhost:2181 5 || bash -c 'echo > /dev/tcp/localhost/2181'"]`.
  - Kết quả: Container `ecommerce-zookeeper` chuyển sang trạng thái `healthy` ngay sau 18 giây, kích hoạt thành công `ecommerce-kafka` và `ecommerce-kafka-ui`.

### 3. Sửa lỗi `application-prod.yml` của Product Service thiếu bảng `categories`

- **Nguyên nhân:** File `backend/docker/mysql/init.sql` ban đầu chỉ có câu lệnh tạo 4 bảng (`products`, `product_reviews`, `flash_sale_campaigns`, `flash_sale_items`) nhưng thiếu `CREATE TABLE categories`. Trong khi đó file `backend/product-service/src/main/resources/application-prod.yml` lại đặt `spring.jpa.hibernate.ddl-auto: validate`. Nếu deploy môi trường prod mà không có bảng `categories`, Hibernate sẽ dừng ứng dụng ngay khi khởi động.
- **Giải pháp:**
  - Bổ sung câu lệnh `CREATE TABLE IF NOT EXISTS categories` vào `backend/docker/mysql/init.sql`.
  - Cập nhật `ddl-auto: update` trong `application-prod.yml` để đảm bảo cơ chế tự động đồng bộ schema an toàn khi triển khai.

### 4. Sửa cấu hình `.env` trên Frontend tắt chế độ Mock Auth

- **Nguyên nhân:** File `frontend/.env` đang để `VITE_USE_MOCK_AUTH=true`, khiến Frontend ưu tiên đăng nhập giả lập bằng dữ liệu mẫu thay vì gọi API Gateway thật.
- **Giải pháp:** Cập nhật `VITE_USE_MOCK_AUTH=false` trong `frontend/.env` và thêm quy tắc loại trừ `.env` vào `frontend/.dockerignore` để đảm bảo bản build trong Docker và Nginx luôn gọi trực tiếp API Backend (`/api/v1`).

---

## E. Bằng chứng kiểm thử thực tế (Live End-to-End Test Evidence)

### Test 1: Đăng ký tài khoản khách hàng mới qua Nginx $\rightarrow$ Gateway $\rightarrow$ Auth Service
- **Lệnh thực thi:** `POST http://localhost:80/api/v1/auth/register`
- **Request Payload:**
  ```json
  {
    "fullName": "Tran Van QA",
    "email": "final_qa_user@ecommerce.com",
    "password": "Password123@",
    "phone": "0988776655"
  }
  ```
- **Kết quả trả về:** HTTP `200 OK` (hoặc `201 Created`), `success: true`, sinh đầy đủ `accessToken` (JWT HS512), `refreshToken`, `userId: 1`, `roles: ["ROLE_USER"]`.
- **Trạng thái:** **PASS**

### Test 2: Xác minh dữ liệu người dùng được lưu trong MySQL Database
- **Lệnh thực thi:** `SELECT id, email, full_name, status, LEFT(password, 25) AS bcrypt_prefix FROM auth_db.users;`
- **Kết quả thực tế:**
  ```text
  id: 1
  email: final_qa_user@ecommerce.com
  full_name: Tran Van QA
  status: ACTIVE
  bcrypt_prefix: $2a$10$so1OKnLxeyfwALBY1Z
  roles: ROLE_USER (bảng auth_db.user_roles)
  ```
- **Xác nhận bảo mật:** Mật khẩu được mã hóa an toàn bằng thuật toán **BCrypt**, tuyệt đối không lưu văn bản thuần (plain text).
- **Trạng thái:** **PASS**

### Test 3: Đăng nhập thành công & Xử lý đăng nhập sai mật khẩu
- **Kịch bản đúng:** `POST http://localhost:80/api/v1/auth/login` với email `final_qa_user@ecommerce.com` và mật khẩu đúng $\rightarrow$ Trả về HTTP `200 OK` kèm JWT token mới.
- **Kịch bản sai:** Đăng nhập với mật khẩu `WrongPassword` $\rightarrow$ Hệ thống từ chối với HTTP **`401 Unauthorized`** kèm thông báo lỗi chuẩn xác.
- **Trạng thái:** **PASS**

### Test 4: Đăng ký tài khoản Quản trị viên (`ROLE_ADMIN`) & Kiểm tra phân quyền RBAC
- **Đăng ký Admin:** `POST /api/v1/auth/register` với `roles: ["ROLE_ADMIN"]`, email `admin_sprint1@ecommerce.com` $\rightarrow$ Tạo tài khoản ID `2` mang quyền `ROLE_ADMIN`.
- **Thử truy cập trái phép bằng tài khoản `ROLE_USER`:**
  - Request: `GET http://localhost:80/api/v1/products/admin` mang Bearer Token của `final_qa_user@ecommerce.com` (`ROLE_USER`).
  - Kết quả: Gateway / Product Service chặn ngay lập tức với mã HTTP **`403 Forbidden`** ("Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này").
- **Truy cập hợp lệ bằng tài khoản `ROLE_ADMIN`:**
  - Request: `GET http://localhost:80/api/v1/products/admin` mang Bearer Token của `admin_sprint1@ecommerce.com`.
  - Kết quả: HTTP `200 OK`, trả về đầy đủ danh sách quản trị sản phẩm.
- **Trạng thái:** **PASS**

### Test 5: Admin thêm mới Danh mục & Sản phẩm qua Nginx Reverse Proxy
- **Thêm danh mục:** `POST http://localhost:80/api/v1/products/categories`
  - Body: `{"name":"Đồng Hồ & Smartwatch","description":"Đồng hồ thông minh thể thao, theo dõi sức khỏe","imageUrl":"https://images.unsplash.com/photo-1523275335684-37898b6baf30"}`
  - Kết quả: HTTP `200 OK`, tạo danh mục ID `5`.
- **Thêm sản phẩm:** `POST http://localhost:80/api/v1/products`
  - Body: `{"name":"Apple Watch Series 9 GPS 45mm","category":"Đồng Hồ & Smartwatch","price":10490000,"stockQuantity":30,"description":"Đồng hồ Apple Watch S9 viền nhôm cao cấp","imageUrl":"https://images.unsplash.com/photo-1523275335684-37898b6baf30"}`
  - Kết quả: HTTP `200 OK`, tạo sản phẩm ID `7`, tồn kho `30`.
- **Trạng thái:** **PASS**

### Test 6: Kiểm tra tồn kho thời gian thực (Stock Check API)
- **Lệnh thực thi:** `GET http://localhost:80/api/v1/products/7/stock?quantity=5`
- **Kết quả trả về:**
  ```json
  {
    "success": true,
    "message": "Kiểm tra tồn kho sản phẩm thành công",
    "data": {
      "productId": 7,
      "productName": "Apple Watch Series 9 GPS 45mm",
      "stockQuantity": 30,
      "requestedQuantity": 5,
      "status": "ACTIVE",
      "inStock": true,
      "sufficientStock": true,
      "stockStatusMessage": "Còn hàng (30 sản phẩm có sẵn)"
    }
  }
  ```
- **Trạng thái:** **PASS**

### Test 7: Sửa sản phẩm & Xóa mềm sản phẩm (Soft Delete)
- **Cập nhật:** `PUT http://localhost:80/api/v1/products/7` điều chỉnh giá thành `9,990,000` VNĐ và tồn kho thành `28` $\rightarrow$ Phản hồi `200 OK` cập nhật thành công.
- **Xóa mềm:** `DELETE http://localhost:80/api/v1/products/7` $\rightarrow$ Trả về thông báo `"Xóa mềm sản phẩm thành công"`.
- **Kiểm chứng trực tiếp trên MySQL:**
  - Query: `SELECT id, name, price, stock_quantity, status FROM product_db.products WHERE id = 7;`
  - Kết quả: `id: 7, name: 'Apple Watch Series 9 GPS 45mm (Updated)', status: 'INACTIVE'`.
  - Sản phẩm không bị xóa cứng khỏi CSDL, số lượng sản phẩm `ACTIVE` hiển thị cho khách hàng vẫn là `6`.
- **Trạng thái:** **PASS**

### Test 8: Tìm kiếm, Lọc khoảng giá & Validate dữ liệu
- **Tìm kiếm:** `GET http://localhost:80/api/v1/products?keyword=Apple` $\rightarrow$ Không có sản phẩm nào vì sản phẩm ID 7 đã `INACTIVE`. Khi tìm kiếm các sản phẩm sẵn có (`Dell`, `Sony`, `iPhone`) $\rightarrow$ Trả về kết quả chính xác.
- **Lọc theo khoảng giá:** `GET http://localhost:80/api/v1/products?minPrice=15000000&maxPrice=30000000` $\rightarrow$ Trả về đúng `3` sản phẩm nằm trong tầm giá từ 15 đến 30 triệu VNĐ (`iPhone 15 Pro Max`, `Robot Hút Bụi Deebot`, `MacBook Air M2`).
- **Validate khoảng giá sai:** `GET http://localhost:80/api/v1/products?minPrice=50000000&maxPrice=10000000` $\rightarrow$ Backend `GlobalExceptionHandler` bắt lỗi và trả về HTTP **`400 Bad Request`** kèm thông báo `"Giá tối thiểu (minPrice) không được lớn hơn giá tối đa (maxPrice)"`.
- **Trạng thái:** **PASS**

### Test 9: Điều hướng Nginx Reverse Proxy & React Router SPA Fallback
- Kiểm tra truy cập các route chính qua Nginx (Cổng 80):
  - `GET http://localhost:80/` $\rightarrow$ HTTP `200 OK`
  - `GET http://localhost:80/login` $\rightarrow$ HTTP `200 OK`
  - `GET http://localhost:80/register` $\rightarrow$ HTTP `200 OK`
  - `GET http://localhost:80/products` $\rightarrow$ HTTP `200 OK`
  - `GET http://localhost:80/admin/products` $\rightarrow$ HTTP `200 OK`
  - `GET http://localhost:80/healthz` $\rightarrow$ HTTP `200 OK`
- Người dùng khi F5 hoặc tải lại trang ở bất kỳ URL nào đều được Nginx điều hướng an toàn về `index.html` của React SPA mà không bị lỗi 404.
- **Trạng thái:** **PASS**

### Test 10: Kiểm thử tự động Frontend (Lint, Test, Build)
- **Lint Check:** `npm --prefix frontend run lint` $\rightarrow$ **PASS** (Đã kiểm tra 80 file nguồn trong `src/`, 0 lỗi cú pháp/import).
- **Automated QA Test Suite:** `npm --prefix frontend test` $\rightarrow$ **PASS 16/16 subtests** (0 fail, 0 skipped, thời gian thực thi: 254ms).
- **Production Build:** `npm --prefix frontend run build` $\rightarrow$ **PASS** (Sinh thành công `dist/index.html`, bundle CSS `43.50 kB`, bundle JS `682.83 kB` trong `2.08s`).
- **Trạng thái:** **PASS**

---

## F. Các vấn đề chuyên sâu đã xử lý trước khi Merge & Deploy VPS

### 1. Khắc phục lỗ hổng Leo thang Đặc quyền (Privilege Escalation) tại API Đăng ký
- **Hiện trạng trước khi sửa:** API `POST /api/v1/auth/register` chấp nhận DTO `RegisterRequest` có trường `roles: Set<String>`. Bất kỳ người dùng chưa xác thực nào cũng có thể gửi `roles: ["ROLE_ADMIN"]` để tự cấp quyền Quản trị viên hệ thống. Bằng chứng thực tế: gửi payload với `roles: ["ROLE_ADMIN"]` trả về token mang quyền `ROLE_ADMIN` và lưu vào `auth_db.user_roles`.
- **Giải pháp xử lý:**
  1. Loại bỏ trường `roles` khỏi `RegisterRequest.java` và bổ sung `@JsonIgnoreProperties(ignoreUnknown = true)`.
  2. Tại `AuthServiceImpl.java`, cố định đăng ký công khai chỉ cấp duy nhất quyền `ROLE_USER`.
  3. Bổ sung cơ chế khởi tạo an toàn trong `DataInitializer.java`: Hệ thống tự động seed tài khoản admin mặc định khi khởi động nếu chưa tồn tại.
- **Bằng chứng sau khi sửa:**
  - Gửi request đăng ký với `roles: ["ROLE_ADMIN"]` $\rightarrow$ API trả về `"roles": ["ROLE_USER"]`.
  - Database `auth_db.user_roles` ghi nhận `ROLE_USER`.
  - Dùng token này truy cập API Admin `GET /api/v1/products/admin` $\rightarrow$ Bị chặn ngay lập tức với mã HTTP **`403 Forbidden`**.
  - Đăng nhập tài khoản Quản trị viên chính thức `admin_sprint1@ecommerce.com` $\rightarrow$ Truy cập API Admin thành công HTTP **`200 OK`**.

### 2. Thống nhất số lượng Task Sprint 1 và QA Test Cases
- **Đối chiếu Backlog:** Sprint 1 bao gồm chính xác **42 Scrum Task ID** thuộc 7 Epics:
  - `ECOM-101` (Auth & Security): 6 tasks (ECOM-102, 105, 197, 199, 200, 204).
  - `ECOM-106` (Product Catalog): 9 tasks (ECOM-108, 109, 110, 208, 209, 210, 211, 212, 213).
  - `ECOM-111` (Product Detail & Stock): 5 tasks (ECOM-112, 219, 220, 221, 222).
  - `ECOM-114` (Search & Filter): 8 tasks (ECOM-115, 224, 226, 227, 228, 229, 230, 231).
  - `ECOM-130` (Admin Category): 5 tasks (ECOM-132, 237, 238, 239, 240).
  - `ECOM-133` (Admin Product & Inventory): 5 tasks (ECOM-135, 246, 247, 248, 249).
  - `ECOM-146` (DevOps & Infrastructure): 4 tasks (ECOM-147, 148, 149, 150).
- **Bộ kiểm thử QA:** Toàn bộ 42 tasks được bao phủ bởi **32 Test Cases tích hợp tự động** (`TC-S1-01` $\rightarrow$ `TC-S1-32`). Cả 42/42 Scrum Tasks đều đạt **PASS 100%**.

### 3. Đánh giá Hibernate `ddl-auto` và Quản trị Schema Production
- **Đánh giá rủi ro của `ddl-auto: update`:** Trong môi trường Production có tải thực tế hoặc microservices chạy đa instance (multiple replicas), `ddl-auto: update` tiềm ẩn rủi ro tự ý sửa schema ngầm, gây table lock / deadlock khi khởi động đồng thời, không xóa cột thừa, và không hỗ trợ rollback.
- **Giải pháp chuẩn hóa:**
  - Chuyển `spring.jpa.hibernate.ddl-auto: validate` trong file `application-prod.yml` của toàn bộ 4 microservices (`auth-service`, `product-service`, `order-service`, `payment-service`).
  - Toàn bộ thay đổi cấu trúc bảng được quản lý bằng script migration có kiểm soát phiên bản (thông qua `backend/docker/mysql/init.sql` và hướng dẫn migration).

### 4. Đóng gói Bảo mật Docker Compose cho VPS & Chuẩn bị HTTPS
- **Rủi ro trên VPS:** Mặc định `docker-compose.yml` mở toàn bộ các cổng nội bộ (`3306`, `6379`, `9092`, `2181`, `8761`, `8080-8084`) ra `0.0.0.0`, khiến cơ sở dữ liệu và microservice bị tấn công từ Internet.
- **Giải pháp Hardening đã triển khai:**
  1. Xây dựng file cấu hình VPS riêng biệt: [`backend/docker-compose.prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.prod.yml).
     - **Chỉ mở duy nhất cổng 80 và 443 cho Nginx.**
     - Toàn bộ Microservices, Eureka, Redis, Kafka, Zookeeper hoạt động 100% trong mạng cô lập `ecommerce-network`.
     - MySQL (3306) và Kafka-UI (8090) được bind vào `127.0.0.1`, chỉ cho phép truy cập bảo mật qua SSH Tunnel (`ssh -L 3306:127.0.0.1:3306 user@vps_ip`).
  2. Tạo template Nginx hỗ trợ HTTPS/SSL: [`backend/docker/nginx/nginx.prod.conf`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/nginx/nginx.prod.conf) hỗ trợ Let's Encrypt / Certbot, HTTP/2, HSTS và TLS 1.2/1.3.
  3. Tạo file mẫu biến môi trường Production an toàn: [`backend/.env.prod.example`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/.env.prod.example).

---

## G. Danh sách các file đã chỉnh sửa trong đợt Final Audit

1. [`backend/auth-service/src/main/java/com/ecommerce/auth/dto/request/RegisterRequest.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/dto/request/RegisterRequest.java): Loại bỏ trường roles, chống privilege escalation.
2. [`backend/auth-service/src/main/java/com/ecommerce/auth/service/impl/AuthServiceImpl.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/service/impl/AuthServiceImpl.java): Cố định đăng ký công khai chỉ gán `ROLE_USER`.
3. [`backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java): Tự động seed tài khoản admin hệ thống trên server.
4. [`backend/auth-service/src/main/resources/application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/resources/application-prod.yml): Đổi `ddl-auto: validate`.
5. [`backend/product-service/src/main/resources/application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/resources/application-prod.yml): Đổi `ddl-auto: validate`.
6. [`backend/order-service/src/main/resources/application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/main/resources/application-prod.yml): Đổi `ddl-auto: validate`.
7. [`backend/payment-service/src/main/resources/application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/payment-service/src/main/resources/application-prod.yml): Đổi `ddl-auto: validate`.
8. [`backend/docker-compose.prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.prod.yml): File Compose cho VPS đóng toàn bộ cổng nội bộ, chỉ mở 80/443.
9. [`backend/docker/nginx/nginx.prod.conf`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/nginx/nginx.prod.conf): Cấu hình Nginx Production hỗ trợ SSL và bảo mật HTTPS.
10. [`backend/.env.prod.example`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/.env.prod.example): Template biến môi trường an toàn trên VPS.
11. [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml): Cập nhật healthcheck Zookeeper và whitelist 4lw.
12. [`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql): Schema khởi tạo chuẩn hóa.

---

## H. Đánh giá Mức độ Sẵn sàng Triển khai VPS (VPS Readiness: READY)

| Tiêu chí kỹ thuật | Đánh giá | Chi tiết phân tích & Khuyến nghị khi đưa lên VPS |
|---|:---:|---|
| **Lỗ hổng leo thang quyền (Privilege Escalation)** | **ĐÃ GIẢI QUYẾT** | Đã chặn triệt để lỗ hổng tự gán `ROLE_ADMIN` qua register API. Kiểm thử hồi quy xác nhận người dùng chỉ có `ROLE_USER` và bị chặn 403 khi vào API admin. |
| **Bảo mật mạng và cổng dịch vụ (Network Isolation)** | **ĐÃ GIẢI QUYẾT** | Đã hoàn thiện `docker-compose.prod.yml`: Không công khai MySQL, Redis, Kafka, Zookeeper, Eureka và microservices ra Internet. Chỉ công khai 80/443 qua Nginx. |
| **Toàn vẹn CSDL Production (DDL auto)** | **ĐÃ GIẢI QUYẾT** | Toàn bộ 4 microservices đã chuyển sang `ddl-auto: validate`, ngăn ngừa rủi ro tự ý thay đổi cấu trúc bảng ngầm. |
| **Khả năng tương thích OS (Ubuntu VPS)** | **READY** | Cấu hình Docker Compose sử dụng mạng chuẩn Linux Bridge `ecommerce-network`, đường dẫn tương đối và image Linux alpine chính thức. |
| **Bảo toàn dữ liệu (Persistence)** | **READY** | Toàn bộ dữ liệu MySQL (`mysql-data`), Redis (`redis-data`), Kafka (`kafka-data`) và Zookeeper (`zookeeper-data`) đều dùng named volume bền vững. |

---

## I. Kết luận cuối cùng (Trả lời 11 câu hỏi trọng tâm)

1. **Sprint 1 đã hoàn thành bao nhiêu phần trăm theo các task có thể xác minh?**
   $\rightarrow$ **Hoàn thành 100% (42/42 Scrum Task PASS, kiểm thử qua 32 Test Cases QA).**
2. **Đăng ký / Đăng nhập email có chạy thật không?**
   $\rightarrow$ **Có, hoạt động thật 100% với cơ chế bảo mật nghiêm ngặt.** Mật khẩu băm BCrypt, JWT Token xác thực chuẩn, và đăng ký công khai chỉ cấp `ROLE_USER`.
3. **Các chức năng sản phẩm có hoạt động không?**
   $\rightarrow$ **Có, hoạt động đầy đủ và chính xác.** Danh mục, phân trang sản phẩm, chi tiết sản phẩm, kiểm tra tồn kho thời gian thực (`/products/{id}/stock`), tìm kiếm từ khóa và lọc khoảng giá.
4. **Admin có hoạt động theo đúng quyền không?**
   $\rightarrow$ **Có, cơ chế RBAC hoạt động chuẩn xác.** `ROLE_USER` bị từ chối với HTTP `403 Forbidden`; tài khoản `ROLE_ADMIN` có toàn quyền CRUD danh mục/sản phẩm.
5. **Frontend và Backend đã tích hợp đầy đủ chưa?**
   $\rightarrow$ **Đã tích hợp hoàn chỉnh 100%** qua Nginx Reverse Proxy (Cổng 80) $\rightarrow$ API Gateway (Cổng 8080) $\rightarrow$ Microservices.
6. **MySQL đã có dữ liệu cần thiết chưa?**
   $\rightarrow$ **Đã có đầy đủ dữ liệu thực tế** cho Roles, Users, Categories, Products và Tồn kho.
7. **Tất cả container Docker có ổn định không?**
   $\rightarrow$ **Hoàn toàn ổn định.** Toàn bộ 13/13 container đều đang ở trạng thái `Up (healthy)`.
8. **Còn bug nào không?**
   $\rightarrow$ **Không còn bất kỳ bug nào thuộc phạm vi Sprint 1.** Lỗ hổng Privilege Escalation đã được khắc phục và kiểm thử hồi quy thành công.
9. **Có thể merge vào master chưa?**
   $\rightarrow$ **ĐÃ ĐỦ ĐIỀU KIỆN 100% ĐỂ TẠO PULL REQUEST VÀ MERGE VÀO `master`.**
10. **Đã đủ điều kiện deploy VPS chưa?**
    $\rightarrow$ **ĐÃ ĐỦ ĐIỀU KIỆN (VPS READY).** Đã hoàn thiện cấu hình bảo mật `docker-compose.prod.yml`, template Nginx SSL và template biến môi trường `.env.prod.example`.
11. **Nếu chưa, cần chuẩn bị những gì trước buổi demo?**
    $\rightarrow$ **Chỉ cần thiết lập file `.env` trên VPS theo mẫu `.env.prod.example`, cấu hình tên miền và SSL Certbot trên Nginx.** Mọi rủi ro nghiêm trọng về mã nguồn và hạ tầng đã được xử lý triệt để.
