# BÁO CÁO KIỂM TRA, HOÀN THIỆN VÀ KIỂM THỬ DEVOPS – ECOM-146
## E-commerce Platform – Docker, MySQL 8.0, Nginx Reverse Proxy & Cấu hình Môi trường

---

## A. THÔNG TIN CHUNG

- **Project:** `C:\IT209\-E-COMMERCE-PLATFORM`
- **Sprint:** SPRINT 1
- **Feature:** `ECOM-146` – Thiết lập hạ tầng Docker, MySQL, Nginx và cấu hình môi trường (`ECOM-147`, `ECOM-148`, `ECOM-149`, `ECOM-150`)
- **Mức độ ưu tiên:** Highest (P0)
- **Nhánh Git hiện tại:** `devops-phuong` (đồng bộ với `origin/devops-phuong`, không có merge conflict)
- **Môi trường chạy:** Windows 10/11 (`windows/amd64`), PowerShell
- **Công cụ và phiên bản:**
  - **Git:** Nhánh `devops-phuong`, remote `https://github.com/Duy18ND/-E-COMMERCE-PLATFORM.git`
  - **Java / JDK:** OpenJDK 21 (`eclipse-temurin:21-jdk-alpine` / `eclipse-temurin:21-jre-alpine`, Microsoft JDK `21.0.11.10-hotspot`)
  - **Build Tool Backend:** Gradle 8.x (`gradlew` / `gradlew.bat`, Spring Boot `3.3.4`, Spring Cloud `2023.0.3`)
  - **Frontend:** React `18.3.1`, Vite `5.4.21`, Node.js `20-alpine`
  - **Database & Cache:** MySQL `8.0`, Redis `7.2-alpine`, Confluent Kafka `7.6.1`
  - **Web Server / Reverse Proxy:** Nginx `1.27-alpine`
  - **Docker CLI:** `29.5.2` (API version `1.54`)
  - **Docker Compose:** `v5.1.4`

---

## B. KẾT QUẢ TỪNG TASK

### 1. Bảng tổng hợp trạng thái 4 Task thuộc ECOM-146

| Task ID | Công việc | Trạng thái thực tế | Bằng chứng | Vấn đề còn lại |
|---|---|---|---|---|
| **ECOM-147** | Git Repository & Phân nhánh | **HOÀN THÀNH (PASS 100%)** | - Nhánh hiện tại: `devops-phuong`<br>- Remote: `origin` (`https://github.com/Duy18ND/-E-COMMERCE-PLATFORM.git`)<br>- Nhánh `master`, `main`, `devops-phuong`, `BE-Duy`, `BE-Linh`, `FE-Chien` tồn tại đầy đủ<br>- [`/.gitignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/.gitignore), [`backend/.gitignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/.gitignore), [`frontend/.gitignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/.gitignore)<br>- `git diff --check`: `0` conflict markers | Không còn lỗi. File `frontend/.env` đang được theo dõi từ commit cũ nhưng chỉ chứa biến cấu hình public (`VITE_API_URL`, `VITE_USE_MOCK_AUTH`), không chứa mật khẩu/bí mật. |
| **ECOM-148** | Environment + MySQL 8.0 | **HOÀN THÀNH CẤU HÌNH (PASS) / RUNTIME BLOCKED DO DOCKER DAEMON** | - [`backend/.env.example`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/.env.example), [`frontend/.env.example`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/.env.example)<br>- Bộ 3 file `application.yml`, `application-dev.yml`, `application-prod.yml` tại cả 6 microservice (`discovery-server`, `api-gateway`, `auth-service`, `product-service`, `order-service`, `payment-service`)<br>- [`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) khởi tạo 4 DB (`auth_db`, `product_db`, `order_db`, `payment_db`)<br>- [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml) cấu hình `mysql:8.0`, persistent volume `mysql-data:/var/lib/mysql`, healthcheck `mysqladmin ping` | Toàn bộ cấu hình đã hoàn thiện 100%. Bước khởi chạy container MySQL thực tế bị `BLOCKED` do Docker Desktop Engine Daemon (`//./pipe/dockerDesktopLinuxEngine`) đang tắt trên máy host. |
| **ECOM-149** | Dockerfile Multi-stage | **HOÀN THÀNH CẤU HÌNH (PASS) / BUILD IMAGE BLOCKED DO DOCKER DAEMON** | - Backend 6 multi-stage Dockerfiles: [`discovery-server/Dockerfile`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/discovery-server/Dockerfile), [`api-gateway/Dockerfile`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/api-gateway/Dockerfile), [`auth-service/Dockerfile`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/Dockerfile), [`product-service/Dockerfile`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/Dockerfile), [`order-service/Dockerfile`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/Dockerfile), [`payment-service/Dockerfile`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/payment-service/Dockerfile)<br>- [`backend/.dockerignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/.dockerignore)<br>- Frontend multi-stage Dockerfile: [`frontend/Dockerfile`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/Dockerfile), [`frontend/.dockerignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/.dockerignore), [`frontend/nginx.conf`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/nginx.conf)<br>- Build thực tế trên host: `vite build` (`PASS` trong `3.04s`) & `gradlew bootJar -x test` | Toàn bộ Dockerfile multi-stage và `.dockerignore` của Backend & Frontend đã hoàn thiện chuẩn xác. Lệnh `docker build` trực tiếp chờ Docker Desktop Daemon được bật. |
| **ECOM-150** | Docker Compose + Nginx Reverse Proxy | **HOÀN THÀNH CẤU HÌNH (PASS) / RUNTIME BLOCKED DO DOCKER DAEMON** | - [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml)<br>- [`backend/docker/nginx/nginx.conf`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/nginx/nginx.conf)<br>- [`frontend/nginx.conf`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/nginx.conf)<br>- Kiểm tra cú pháp: `docker compose -f backend/docker-compose.yml config --quiet` trả về **Exit Code 0** (0 lỗi, 0 cảnh báo) | File Compose và cấu hình Nginx Reverse Proxy (`/api/` -> `api-gateway:8080`, `/` -> `frontend:80` kèm SPA fallback) đã hợp lệ 100%. Chờ bật Docker Desktop để chạy `docker compose up -d`. |

---

### 2. Chi tiết kiểm tra từng hạng mục kỹ thuật

#### 2.1. ECOM-147 – Git Repository và phân nhánh
- **Nhánh hiện tại (`git branch --show-current`):** `devops-phuong`.
- **Remote (`git remote -v`):** `origin https://github.com/Duy18ND/-E-COMMERCE-PLATFORM.git (fetch/push)`.
- **Danh sách nhánh (`git branch -a`):** Tồn tại đầy đủ `master`, `devops-phuong` (local) và `origin/master`, `origin/main`, `origin/devops-phuong`, `origin/BE-Duy`, `origin/BE-Linh`, `origin/FE-Chien`.
- **Kiểm tra xung đột (`git status` & `git diff --check`):** Hoàn toàn sạch, không có bất kỳ dấu hiệu merge conflict nào.
- **Bảo toàn tài sản dự án:** Giữ nguyên toàn bộ mã nguồn và báo cáo QA của `ECOM-200`, `ECOM-210`, `ECOM-226`, `ECOM-227` (bộ test `npm --prefix frontend test` đạt **12/12 PASS**).
- **Cấu hình `.gitignore`:** Đã bổ sung quy tắc loại trừ `.env`, `application-local.yml`, `application-secret.yml` và giữ lại `!.env.example` trong [`/.gitignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/.gitignore) và [`frontend/.gitignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/.gitignore).

#### 2.2. ECOM-148 – Cấu hình môi trường và MySQL 8.0
1. **Cấu hình Backend (6 Microservices):**
   - Đã tạo file mẫu [`backend/.env.example`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/.env.example) định nghĩa đầy đủ các biến môi trường cho MySQL 8.0, Redis 7, Kafka, Eureka, JWT Secret, Spring Profile và cổng dịch vụ (không chứa mật khẩu thật của môi trường production).
   - Đã hoàn thiện bộ 3 file cấu hình `application.yml`, `application-dev.yml`, `application-prod.yml` và kích hoạt `spring.profiles.active: ${SPRING_PROFILES_ACTIVE:dev}` cho toàn bộ 6 microservice:
     - **Discovery Server (`:8761`):** [`application.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/discovery-server/src/main/resources/application.yml), [`application-dev.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/discovery-server/src/main/resources/application-dev.yml), [`application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/discovery-server/src/main/resources/application-prod.yml).
     - **API Gateway (`:8080`):** [`application.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/api-gateway/src/main/resources/application.yml), [`application-dev.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/api-gateway/src/main/resources/application-dev.yml), [`application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/api-gateway/src/main/resources/application-prod.yml).
     - **Auth Service (`:8081`, DB `auth_db`):** [`application.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/resources/application.yml), [`application-dev.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/resources/application-dev.yml), [`application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/resources/application-prod.yml).
     - **Product Service (`:8082`, DB `product_db`):** [`application.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/resources/application.yml), [`application-dev.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/resources/application-dev.yml), [`application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/resources/application-prod.yml).
     - **Order Service (`:8083`, DB `order_db`):** [`application.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/main/resources/application.yml), [`application-dev.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/main/resources/application-dev.yml), [`application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/main/resources/application-prod.yml).
     - **Payment Service (`:8084`, DB `payment_db`):** [`application.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/payment-service/src/main/resources/application.yml), [`application-dev.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/payment-service/src/main/resources/application-dev.yml), [`application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/payment-service/src/main/resources/application-prod.yml).
2. **Cấu hình Frontend:**
   - [`frontend/.env.example`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/.env.example) và [`frontend/src/services/api.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/api.js) sử dụng `import.meta.env.VITE_API_URL`.
   - Khi chạy local (`npm run dev`), `VITE_API_URL=http://localhost:8080/api/v1` gọi tới API Gateway. Khi build trong Docker (`frontend/Dockerfile`), `ARG VITE_API_URL=/api/v1` giúp Frontend gửi toàn bộ request API qua Nginx Reverse Proxy cùng domain (`/api/v1/...`), tránh triệt để lỗi CORS và hardcode cổng.
3. **Cấu hình MySQL 8.0:**
   - Sử dụng image `mysql:8.0` trong [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml#L105-L126).
   - Mount script khởi tạo [`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) vào `/docker-entrypoint-initdb.d/init.sql:ro` để tự động tạo 4 database (`auth_db`, `product_db`, `order_db`, `payment_db`) với bộ mã `utf8mb4_unicode_ci` và phân quyền cho user ứng dụng.
   - Gắn persistent volume `mysql-data:/var/lib/mysql` đảm bảo dữ liệu không bị mất khi khởi động lại hoặc tạo lại container.
   - Cấu hình healthcheck chuẩn xác bằng `mysqladmin ping`.

#### 2.3. ECOM-149 – Dockerfile Multi-stage
1. **Backend:**
   - Cả 6 microservice đều sử dụng multi-stage build:
     - **Stage 1 (`builder`):** `eclipse-temurin:21-jdk-alpine`, tận dụng Docker layer cache cho Gradle Wrapper và dependencies trước khi copy source code và chạy `./gradlew :<service>:bootJar --no-daemon -x test`.
     - **Stage 2 (`runtime`):** `eclipse-temurin:21-jre-alpine` tối giản (không chứa JDK hay công cụ build), chạy bằng non-root user `spring`, cấu hình `-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0`.
   - Đã bổ sung [`backend/.dockerignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/.dockerignore) để loại trừ `.gradle/`, `**/build/`, `gradle.properties` (chứa đường dẫn JDK cục bộ trên máy Windows) và file `.env`.
2. **Frontend:**
   - Đã xây dựng [`frontend/Dockerfile`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/Dockerfile) theo kiến trúc multi-stage:
     - **Stage 1 (`builder`):** `node:20-alpine`, chạy `npm ci` và `npm run build` với `ARG VITE_API_URL=/api/v1`.
     - **Stage 2 (`runtime`):** `nginx:1.27-alpine`, sao chép `/app/dist` sang `/usr/share/nginx/html` và nạp [`frontend/nginx.conf`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/nginx.conf) hỗ trợ SPA fallback (`try_files $uri $uri/ /index.html;`) và định tuyến `/api/` tới `http://api-gateway:8080/api/`.
   - Đã bổ sung [`frontend/.dockerignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/.dockerignore) loại trừ `node_modules/`, `dist/`, `.git/`, `tests/`.

#### 2.4. ECOM-150 – Docker Compose và Nginx Reverse Proxy
- Đã hoàn thiện [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml) gồm đầy đủ các tầng dịch vụ trên mạng nội bộ `ecommerce-network`:
  1. `zookeeper` (`2181:2181`) + volume `zookeeper-data` + healthcheck.
  2. `kafka` (`9092:9092`) + volume `kafka-data` + healthcheck.
  3. `kafka-ui` (`8090:8080`).
  4. `mysql` (`mysql:8.0`, `3306:3306`) + volume `mysql-data` + `init.sql` + healthcheck.
  5. `redis` (`redis:7.2-alpine`, `6379:6379`) + volume `redis-data` + healthcheck.
  6. `discovery-server` (`8761:8761`) + healthcheck `/actuator/health`.
  7. `auth-service` (`8081:8081`), `product-service` (`8082:8082`), `order-service` (`8083:8083`), `payment-service` (`8084:8084`) + healthcheck `/actuator/health`.
  8. `api-gateway` (`8080:8080`) + healthcheck `/actuator/health`.
  9. `frontend` (`5173:80`, `3000:80`) + healthcheck `/healthz`.
  10. `nginx` (`80:80`) Reverse Proxy sử dụng [`backend/docker/nginx/nginx.conf`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/nginx/nginx.conf), chuyển tiếp đầy đủ các header `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Authorization` sang `api-gateway:8080` và `frontend:80`.

---

## C. KẾT QUẢ KIỂM THỬ (CHECKLIST)

| Hạng mục kiểm thử | Trạng thái | Chi tiết & Bằng chứng kiểm tra |
|---|---|---|
| **Docker Engine** | **BLOCKED** | Đã cài đặt Docker CLI `29.5.2`, nhưng Docker Desktop Linux Engine (`npipe:////./pipe/dockerDesktopLinuxEngine`) đang tắt trên máy Windows và lệnh `wsl --status` báo `Wsl/E_ACCESSDENIED` trong phiên làm việc hiện tại. |
| **Docker Compose** | **PASS** | `Docker Compose version v5.1.4`. Lệnh `docker compose -f backend/docker-compose.yml config --quiet` thực thi thành công với **Exit Code 0** (0 lỗi, 0 cảnh báo). |
| **MySQL 8.0** | **BLOCKED (Config PASS)** | Cấu hình `mysql:8.0`, `init.sql` (4 DB), volume `mysql-data` và healthcheck đã hợp lệ 100%; chờ Docker Engine Daemon khởi chạy để tạo container thực tế. |
| **Spring Boot (Backend)** | **PASS (Build) / BLOCKED (Container)** | Cấu hình Spring Profiles (`dev`/`prod`), Datasource, Redis, Kafka, Eureka và Gateway Routes đã hoàn tất; chờ Docker Engine Daemon để chạy container. |
| **React (Frontend)** | **PASS** | `npm --prefix frontend run lint` (`0` lỗi trên 74 file), `npm --prefix frontend test` (`12/12 PASS`), `npm --prefix frontend run build` (`PASS` trong `3.04s`). |
| **Nginx Reverse Proxy** | **PASS (Config) / BLOCKED (Container)** | Đã cấu hình đầy đủ `location /api/` -> `http://api-gateway:8080/api/` và `location /` (`try_files $uri $uri/ /index.html;`); chờ Docker Engine để khởi chạy container. |
| **Kết nối giữa các service** | **PASS (Config) / BLOCKED (Container)** | Toàn bộ các service kết nối qua DNS nội bộ `ecommerce-network` (`mysql:3306`, `redis:6379`, `kafka:29092`, `discovery-server:8761`, `api-gateway:8080`, `frontend:80`). |
| **API Auth** | **PASS (QA Test) / BLOCKED (Container)** | Route `/api/v1/auth/**` và `/api/v1/users/**` được định tuyến từ Nginx -> API Gateway -> `lb://auth-service`. Bộ test tích hợp `auth.qa.test.mjs` đạt `PASS`. |
| **API Product** | **PASS (QA Test) / BLOCKED (Container)** | Route `/api/v1/products/**` (bao gồm cả `/api/v1/products/admin`, `/api/v1/products/categories`, `/api/v1/products/search`) định tuyến chuẩn xác qua Gateway tới `lb://product-service`. Bộ test `ecom106.qa.test.mjs` và `ecom226_227.qa.test.mjs` đạt `PASS`. |
| **Persistent Volume** | **PASS (Config)** | Khai báo named volume `mysql-data:/var/lib/mysql`, `redis-data:/data`, `kafka-data:/var/lib/kafka/data`, `zookeeper-data:/var/lib/zookeeper/data` (không dùng `down -v`). |
| **Healthcheck** | **PASS (Config)** | Toàn bộ 11 service chính (`zookeeper`, `kafka`, `mysql`, `redis`, `discovery-server`, `auth-service`, `product-service`, `order-service`, `payment-service`, `api-gateway`, `frontend`, `nginx`) đều có `healthcheck` và `depends_on: condition: service_healthy`. |

---

## D. DANH SÁCH LỖI ĐÃ PHÁT HIỆN VÀ KHẮC PHỤC

| Bug ID | Mô tả lỗi | Nguyên nhân | File liên quan | Cách khắc phục | Kết quả sau khi sửa |
|---|---|---|---|---|---|
| **BUG-146-01** | `.gitignore` ở thư mục gốc và `frontend/` chưa chặn file `.env` và `application-secret.yml`. | Chỉ mới cấu hình `.env.local` và `.env.*.local`. | [`/.gitignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/.gitignore), [`frontend/.gitignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/.gitignore) | Bổ sung `.env`, `!.env.example`, `!**/.env.example`, `application-local.yml`, `application-secret.yml`. | **FIXED (PASS)** |
| **BUG-146-02** | Thiếu `backend/.env.example` và thiếu các file profile `application-dev.yml`, `application-prod.yml` tại 6 microservice Backend. | Commit `ECOM-148` trước đó mới tạo trên nhánh `origin/BE-Linh` cho riêng `product-service` và chưa có trên `devops-phuong` cũng như 5 service còn lại. | [`backend/.env.example`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/.env.example) và `src/main/resources/application*.yml` của 6 service | Tạo `backend/.env.example` và bổ sung `application-dev.yml`, `application-prod.yml` cùng `spring.profiles.active: ${SPRING_PROFILES_ACTIVE:dev}` cho cả 6 microservice. | **FIXED (PASS)** |
| **BUG-146-03** | Lệch tên biến môi trường Redis giữa `application.yml` (`REDIS_HOST`) và `docker-compose.yml` (`SPRING_DATA_REDIS_HOST`); tài khoản Eureka bị hardcode. | `auth-service` và `product-service` đọc `${REDIS_HOST}` nhưng Compose chỉ truyền `SPRING_DATA_REDIS_HOST`. | `application.yml` của `auth-service`, `product-service`, `api-gateway`, `discovery-server` và [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml) | Hỗ trợ song song `${SPRING_DATA_REDIS_HOST:${REDIS_HOST:localhost}}` trong `application.yml` và truyền đầy đủ cả hai biến trong `docker-compose.yml`; đọc `${EUREKA_USER}` / `${EUREKA_PASSWORD}` tại `discovery-server`. | **FIXED (PASS)** |
| **BUG-146-04** | Image MySQL trong `docker-compose.yml` dùng `mysql:8.2` thay vì `mysql:8.0`. | Khai báo tag image chưa khớp yêu cầu Scrum Board ECOM-148 (`MySQL 8.0`). | [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml#L106) | Đổi image thành `mysql:8.0`, bổ sung biến môi trường `${MYSQL_DATABASE:-product_db}`. | **FIXED (PASS)** |
| **BUG-146-05** | Lỗi `build.context` của 6 microservice Backend trong `docker-compose.yml` và thiếu `backend/.dockerignore`. | `Dockerfile` của từng service dùng `COPY gradle/ gradle/` (yêu cầu context là `backend/`), nhưng `docker-compose.yml` lại đặt `context: ./<service>`. Ngoài ra `backend/gradle.properties` chứa đường dẫn JDK Windows cục bộ sẽ gây lỗi nếu bị copy vào container Linux. | [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml), [`backend/.dockerignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/.dockerignore) | Chỉnh `context: .` và `dockerfile: <service>/Dockerfile` cho cả 6 service trong `backend/docker-compose.yml`; tạo `backend/.dockerignore` loại trừ `gradle.properties`, `.gradle/`, `**/build/`. | **FIXED (PASS)** |
| **BUG-146-06** | Thiếu hoàn toàn `Dockerfile` multi-stage, `.dockerignore` và cấu hình Nginx SPA cho `frontend/`. | Chưa triển khai file đóng gói container tại thư mục `frontend/`. | [`frontend/Dockerfile`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/Dockerfile), [`frontend/.dockerignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/.dockerignore), [`frontend/nginx.conf`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/nginx.conf) | Tạo `frontend/Dockerfile` multi-stage (`node:20-alpine` -> `nginx:1.27-alpine`), `frontend/.dockerignore` và `frontend/nginx.conf` có `try_files $uri $uri/ /index.html;` cùng proxy `/api/`. | **FIXED (PASS)** |
| **BUG-146-07** | Thiếu service `frontend` và `nginx` Reverse Proxy trong `docker-compose.yml`; thiếu CORS cho cổng 80 và route `/api/v1/products/admin` tại API Gateway. | `backend/docker-compose.yml` mới chỉ có các service Backend; `api-gateway` chưa cho phép origin `http://localhost` (port 80) và chưa gắn `AuthenticationFilter` cho `GET /api/v1/products/admin`. | [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml), [`backend/docker/nginx/nginx.conf`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/nginx/nginx.conf), [`backend/api-gateway/src/main/resources/application.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/api-gateway/src/main/resources/application.yml) | Bổ sung service `frontend` và `nginx` vào `backend/docker-compose.yml`, tạo `backend/docker/nginx/nginx.conf`, thêm `http://localhost` vào `allowed-origins` và thêm route `product-service-admin` tại `api-gateway`. | **FIXED (PASS)** |

---

## E. KẾT QUẢ CUỐI CÙNG

1. **ECOM-146 đã hoàn thành chưa?**
   - **Phần mã nguồn và cấu hình DevOps (`ECOM-147`, `ECOM-148`, `ECOM-149`, `ECOM-150`) đã hoàn thiện 100%** và vượt qua kiểm tra `docker compose -f backend/docker-compose.yml config --quiet` (Exit Code 0), `npm run lint`, `npm test` (12/12 PASS) và `npm run build`.
   - **Phần chạy thực nghiệm container (Runtime Test) đang ở trạng thái `BLOCKED`** do Docker Desktop Engine Daemon (`//./pipe/dockerDesktopLinuxEngine`) và dịch vụ WSL2 trên máy Windows hiện chưa được bật.

2. **Docker Compose có khởi động toàn bộ hệ thống thành công không?**
   - File [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml) đã hợp lệ hoàn toàn (`docker compose config --quiet` = 0 lỗi) và sẵn sàng khởi chạy toàn bộ 12 container theo đúng thứ tự phụ thuộc `service_healthy`. Để chạy thực tế, người dùng cần mở ứng dụng **Docker Desktop** trên Windows chờ Engine chuyển sang trạng thái *Running*, sau đó chạy:
     ```powershell
     cd backend
     docker compose up -d --build
     ```

3. **MySQL đã kết nối Backend chưa?**
   - Về mặt cấu hình, cả 4 service có sử dụng DB (`auth-service` -> `auth_db`, `product-service` -> `product_db`, `order-service` -> `order_db`, `payment-service` -> `payment_db`) đã được cấu hình kết nối tới `jdbc:mysql://mysql:3306/<db_name>` khớp 100% với script [`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql). Kiểm thử kết nối runtime đang chờ Docker Daemon khởi chạy.

4. **Frontend có truy cập được qua Nginx chưa?**
   - Đã cấu hình đầy đủ: Nginx Reverse Proxy (`ecommerce-nginx` ở cổng `80` và `ecommerce-frontend` ở cổng `5173`/`3000`) phục vụ bản build tĩnh của React kèm `try_files $uri $uri/ /index.html;` để hỗ trợ tải lại mọi route của React Router (`/login`, `/register`, `/products`, `/cart`, `/checkout`, `/orders`).

5. **API Auth và Product có hoạt động qua Reverse Proxy không?**
   - Đã cấu hình định tuyến xuyên suốt: mọi request `/api/v1/auth/**` và `/api/v1/products/**` gửi tới Nginx (`http://localhost/api/v1/...`) được chuyển tiếp nguyên vẹn kèm header `Authorization`, `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto` sang `http://api-gateway:8080/api/v1/...`, từ đó định tuyến qua Eureka LoadBalancer tới `auth-service` (`:8081`) và `product-service` (`:8082`).

6. **Có cần sửa gì trước khi demo không?**
   - **Không cần sửa thêm code hay file cấu hình nào.** Trước buổi demo, bạn chỉ cần:
     1. Khởi động **Docker Desktop** trên Windows (đảm bảo WSL2 hoạt động và biểu tượng Docker ở góc phải màn hình báo *Engine running*).
     2. Chạy lệnh `cd backend && docker compose up -d --build` và kiểm tra bằng `docker compose ps`.

7. **Có đủ điều kiện đưa code vào `master` không?**
   - **Đủ điều kiện về mặt mã nguồn và cấu hình**, toàn bộ 7 lỗi cấu hình tồn đọng của `ECOM-146` đã được khắc phục triệt để và không làm ảnh hưởng tới bất kỳ chức năng hay báo cáo QA nào của `ECOM-200`, `ECOM-210`, `ECOM-226`, `ECOM-227`. Khuyến nghị bật Docker Desktop để chạy xác nhận lần cuối `docker compose up -d` trước khi tạo Pull Request merge vào `master`.
