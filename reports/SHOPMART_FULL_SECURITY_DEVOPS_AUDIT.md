# SHOPMART — FULL SECURITY AUDIT, DEVOPS AUDIT & SAFE FIX REPORT

- **Ngày kiểm tra:** 2026-11-17
- **Nhánh làm việc:** `devops-phuong`
- **Phạm vi:** Full-stack (Backend Microservices, API Gateway, Discovery Server, Frontend React/Vite, Docker Compose, Nginx, MySQL Schema/Migrations, GitHub Actions & GHCR).
- **Nguyên tắc an toàn:** Không thay đổi VPS, không thay đổi production database, không in hoặc commit secret thật, không tự ý push/merge/deploy.

---

## 1. Executive Summary

Đợt kiểm tra toàn diện hệ thống **ShopMart E-Commerce Platform** trên nhánh `devops-phuong` đã rà soát mã nguồn 6 microservices Spring Boot (`discovery-server`, `api-gateway`, `auth-service`, `product-service`, `order-service`, `payment-service`), ứng dụng Frontend React/Vite, cấu hình Docker/Docker Compose, Nginx Reverse Proxy, kịch bản SQL/migration và pipeline CI/CD GitHub Actions + GHCR.

### Kết quả tổng quan
- **Các lỗ hổng nghiêm trọng nhất đã phát hiện:**
  1. **[CRITICAL]** `INTERNAL_SERVICE_KEY` trong `backend/docker-compose.prod.yml` và `application.yml` vẫn giữ giá trị fallback mặc định yếu (`ecommerce-internal-service-secret-2026`), và không có trong `backend/.env.example`.
  2. **[CRITICAL]** `DataInitializer` trong `auth-service` có fallback tài khoản admin mặc định (`admin@ecommerce.com` / `Admin@123456`) và `docker-compose.prod.yml` không truyền `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` vào container `auth-service`.
  3. **[HIGH]** Toàn bộ 6 file `application-prod.yml` không override các secret mặc định từ `application.yml` để ép **fail-fast** khi chạy profile `prod` thiếu biến môi trường.
  4. **[HIGH]** Pipeline `.github/workflows/release.yml` và `.github/workflows/deploy.yml` đang bám nhánh `master` thay vì `main` (nhánh production), đồng thời `deploy.yml` triển khai vào `/opt/shopmart` thay vì `/opt/shopmart/backend` và không nhận diện `docker-compose.vps.yml` (nguy cơ tạo Compose project/volume mới).
- **Đã sửa an toàn trên nhánh `devops-phuong`:** 12 file cấu hình và mã nguồn (loại bỏ fallback `INTERNAL_SERVICE_KEY` trong `docker-compose.prod.yml`, chặn seed mật khẩu mặc định trong `prod` tại `DataInitializer.java`, ép fail-fast + tắt Swagger UI trong `application-prod.yml` của cả 6 service, bổ sung `INTERNAL_SERVICE_KEY` & placeholder rõ ràng vào `backend/.env.example`, và đồng bộ `ci.yml`, `release.yml`, `deploy.yml` theo nhánh `main` và `/opt/shopmart/backend`).
- **Kiểm thử sau sửa:** Frontend (`lint` 93 files, `415/415` tests, `vite build`), Backend (`./gradlew.bat test --rerun-tasks --no-daemon`, 24/24 tasks executed), Docker Compose config validation (`dev` & `prod`) và Production Port Hardening check đều **PASS**.

---

## 2. Current System Status

### Trạng thái Git trước và sau kiểm tra
- Trước khi bắt đầu, workspace đang đứng ở nhánh `main` (`e478368`, đồng bộ cây mã nguồn với `master` và `devops-phuong`), có thư mục untracked `reports/presentation/` của người dùng (được giữ nguyên).
- Đã chuyển sang nhánh `devops-phuong` để thực hiện toàn bộ audit và sửa lỗi.
- **Không** thực hiện `git push`, `git merge`, `git reset`, `git clean` hay tác động tới VPS.

### Trạng thái VPS (theo ghi nhận smoke test ban đầu — không thay đổi)
- Các container cốt lõi (`MySQL`, `Redis`, `Discovery`, `Auth`, `API Gateway`, `Product`, `Order`, `Payment`) trạng thái Healthy.
- Frontend, Product API, Categories API, Active Flash Sales API trả HTTP 200; Login `{}` trả HTTP 400.
- *Lưu ý:* Smoke test HTTP 200 chưa chứng minh cấu hình secret trên VPS đã hết placeholder hoặc các luồng nội bộ (`INTERNAL_SERVICE_KEY`, `JWT_SECRET`, `DEFAULT_ADMIN_PASSWORD`) đang dùng giá trị mạnh. Cần kiểm tra trực tiếp `.env` trên VPS theo checklist bên dưới.

---

## 3. Security Audit Findings

### 3.1. Ma trận sử dụng Secret theo từng Service

| Secret / Biến môi trường | Service sử dụng | Dùng chung hay riêng? | Truyền qua `.env` / Compose (`prod`) | Mặc định yếu trước khi sửa |
|---|---|---|---|---|
| `JWT_SECRET` | `auth-service`, `api-gateway` | **Dùng chung** (ký ở `auth-service`, verify ở `api-gateway`) | `${JWT_SECRET}` (bắt buộc) | `application.yml` có fallback yếu |
| `INTERNAL_SERVICE_KEY` | `order-service` (gửi qua Feign), `product-service` (xác thực header `X-Internal-Service-Key`) | **Dùng chung** | Trước sửa có fallback `:-ecommerce-internal-service-secret-2026`; **đã sửa** thành `${INTERNAL_SERVICE_KEY}` | `docker-compose.prod.yml`, `application.yml`, `FeignConfig.java`, `FlashSaleController.java`, `ProductController.java` |
| `MYSQL_ROOT_PASSWORD` | `mysql` (và script backup `deploy.yml`) | Riêng cho MySQL root | `${MYSQL_ROOT_PASSWORD}` (bắt buộc) | `docker-compose.yml` có `:-rootpassword` (chỉ dev) |
| `MYSQL_USER` / `MYSQL_PASSWORD` (`SPRING_DATASOURCE_PASSWORD`) | `mysql`, `auth-service`, `product-service`, `order-service`, `payment-service` | **Dùng chung** giữa MySQL & 4 DB-backed services | `${MYSQL_PASSWORD}` (bắt buộc) | `application.yml` có `:ecommerce_pass`; `init.sql` & `01_grant_privileges.sql` có password mẫu |
| `REDIS_PASSWORD` (`SPRING_DATA_REDIS_PASSWORD`) | `redis`, `auth-service`, `product-service`, `api-gateway` | **Dùng chung** giữa Redis & 3 Redis clients | `${REDIS_PASSWORD}` (bắt buộc) | `application.yml` có `:redispassword` |
| `EUREKA_USER` / `EUREKA_PASSWORD` | `discovery-server`, `api-gateway`, `auth-service`, `product-service`, `order-service`, `payment-service` | **Dùng chung** cho Eureka Basic Auth | `${EUREKA_USER}`, `${EUREKA_PASSWORD}` (bắt buộc) | `application.yml` có `eureka` / `eurekapassword` |
| `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` | `auth-service` (`DataInitializer`) | Riêng cho `auth-service` | Trước sửa **không truyền** trong `docker-compose.prod.yml`; **đã bổ sung** | `DataInitializer.java` có `admin@ecommerce.com` / `Admin@123456` |

### 3.2. Chi tiết các phát hiện bảo mật

1. **[CRITICAL] `INTERNAL_SERVICE_KEY` có giá trị mặc định công khai trong `docker-compose.prod.yml` và `application.yml`**
   - **Bằng chứng:** `backend/docker-compose.prod.yml` (dòng 231, 270) dùng `${INTERNAL_SERVICE_KEY:-ecommerce-internal-service-secret-2026}`; `backend/product-service/src/main/resources/application.yml` (dòng 75) và `backend/order-service/src/main/resources/application.yml` (dòng 88) đặt cùng chuỗi mặc định; `backend/.env.example` thiếu hoàn toàn biến này.
   - **Rủi ro:** Nếu `.env` trên VPS chưa khai báo `INTERNAL_SERVICE_KEY`, hai service vẫn khởi động bình thường với secret công khai trên Git.
   - **Trạng thái:** **Đã sửa** (xóa fallback ở `docker-compose.prod.yml`, ép `${INTERNAL_SERVICE_KEY}` không default ở `application-prod.yml`, bổ sung vào `backend/.env.example`).

2. **[CRITICAL] `DataInitializer` tạo tài khoản `ROLE_ADMIN` với mật khẩu mặc định `Admin@123456` trong production**
   - **Bằng chứng:** `backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java` (dòng 26–30, 48–54) và `backend/docker-compose.prod.yml` không truyền `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` vào `auth-service`.
   - **Rủi ro:** Nếu DB `auth_db` khởi tạo mới trong prod mà chưa có user, hệ thống tự tạo `admin@ecommerce.com` / `Admin@123456`.
   - **Trạng thái:** **Đã sửa** (truyền biến vào `auth-service` trong `docker-compose.prod.yml`, và chặn seed mật khẩu yếu/placeholder trong profile `prod` — fail-fast nếu DB rỗng và thiếu `DEFAULT_ADMIN_PASSWORD` mạnh).

3. **[HIGH] Thiếu cơ chế Fail-Fast trong `application-prod.yml` của cả 6 microservices**
   - **Bằng chứng:** Trước khi sửa, `application-prod.yml` của cả 6 service chỉ cấu hình Hikari/JPA/logging, không override các placeholder secret từ `application.yml`.
   - **Trạng thái:** **Đã sửa** trên toàn bộ 6 file `application-prod.yml`.

4. **[MEDIUM] Tài khoản MySQL mặc định trong `init.sql` và `01_grant_privileges.sql`**
   - **Bằng chứng:** `backend/docker/mysql/init.sql` (dòng 29, 35) và `backend/docker/mysql/migrations/01_grant_privileges.sql` (dòng 4, 10) có `CREATE USER IF NOT EXISTS 'ecommerce_user'@'%' IDENTIFIED BY 'ecommerce_pass'` và `'ecommerce_prod_user'@'%' IDENTIFIED BY 'ecommerce_prod_pass'`.
   - **Lưu ý:** Trên MySQL đã khởi tạo sẵn volume, `CREATE USER IF NOT EXISTS` không ghi đè mật khẩu hiện tại của `ecommerce_prod_user` (vì entrypoint tạo user theo `MYSQL_USER`/`MYSQL_PASSWORD` trước `init.sql`), nhưng tài khoản `ecommerce_user` dev vẫn có thể tồn tại nếu `init.sql` đã chạy. Cần kiểm tra và xóa/khóa `ecommerce_user` trên VPS nếu không dùng (không tự ý sửa trên VPS).

5. **[MEDIUM] `auth-service` bật `CorsConfiguration` cho phép `*` và Swagger UI mở mặc định**
   - **Bằng chứng:** `backend/auth-service/src/main/java/com/ecommerce/auth/security/SecurityConfig.java` (dòng 55) dùng `setAllowedOriginPatterns(List.of("*"))`; `application.yml` các service bật `springdoc` mặc định.
   - **Trạng thái:** Đã tắt `springdoc.api-docs.enabled: false` và `springdoc.swagger-ui.enabled: false` trong `application-prod.yml` của 4 service có Swagger (`auth`, `product`, `order`, `payment`).

6. **[INFORMATIONAL] Kiểm tra Git History & `.gitignore`**
   - `backend/.env` đã nằm trong `.gitignore` (dòng 41) và **chưa từng** được commit vào lịch sử Git (`git ls-files` và `git log --all` chỉ thấy `backend/.env.example`, `backend/.env.prod.example`, `frontend/.env`, `frontend/.env.example`).
   - `frontend/.env` chỉ chứa `VITE_API_URL` và `VITE_USE_MOCK_AUTH=false`, không chứa secret.

---

## 4. Docker Compose Audit

- **Compose base (`backend/docker-compose.yml`):** Phục vụ môi trường dev/local, có expose các port `2181`, `9092`, `29092`, `8090`, `6379`, `8761`, `8080`, `5173`, `3000`, `80` và `127.0.0.1:3307`. Không dùng cho production.
- **Compose production (`backend/docker-compose.prod.yml`):**
  - **Port Hardening:** Chỉ `nginx` publish port `80` và `443` ra `0.0.0.0`. `mysql` (`127.0.0.1:3307:3306`) và `kafka-ui` (`127.0.0.1:${KAFKA_UI_PORT:-8090}:8080`) chỉ bind `127.0.0.1` cho SSH tunnel. `redis`, `kafka`, `zookeeper`, `discovery-server`, `api-gateway`, `auth-service`, `product-service`, `order-service`, `payment-service`, `frontend` đều cô lập hoàn toàn trong bridge network `ecommerce-network`.
  - **Healthcheck & `depends_on`:** Đầy đủ `condition: service_healthy` cho chuỗi phụ thuộc `zookeeper -> kafka -> discovery-server -> microservices -> api-gateway -> frontend -> nginx`.
  - **Restart Policy & Volumes:** `restart: always`; giữ nguyên tên volume (`mysql-data`, `redis-data`, `kafka-data`, `zookeeper-data`) và network (`ecommerce-network`).
  - **Nginx (`backend/docker/nginx/nginx.prod.conf`):** Proxy `/api/` tới `api-gateway:8080`, `/` tới `frontend:80`, có `/healthz`. Block HTTPS (port 443) hiện đang comment sẵn sàng cho Certbot SSL.
  - **Điểm cần lưu ý (`MEDIUM`):** `docker-compose.prod.yml` chưa đặt `deploy.resources.limits` (memory/CPU) cho từng container; các Dockerfile Java đã có `-XX:MaxRAMPercentage=75.0` nên hoạt động tốt nếu có limit hoặc trên VPS RAM đủ lớn, nhưng nên bổ sung `mem_limit` trong `docker-compose.vps.yml` nếu VPS hạn chế RAM.

---

## 5. GitHub Actions & GHCR Audit

Kiểm tra 3 workflow trong `.github/workflows/`:

1. **[HIGH] Sai nhánh production (`master` thay vì `main`) trong `release.yml` và `deploy.yml`**
   - **Bằng chứng:** `release.yml` trước sửa chỉ trigger build/push GHCR trên nhánh `master` (`branches: [ master ]`, `enable=${{ github.ref == 'refs/heads/master' }}`); `deploy.yml` chỉ trigger `workflow_run` khi `release.yml` chạy trên `master`; `ci.yml` thiếu `main` trong `push`/`pull_request`.
   - **Trạng thái:** **Đã sửa** — `ci.yml` thêm `main`; `release.yml` và `deploy.yml` chuyển nhánh phát hành/triển khai chuẩn sang `main`.

2. **[HIGH] `deploy.yml` sai thư mục Compose trên VPS (`/opt/shopmart` thay vì `/opt/shopmart/backend`) và bỏ qua `docker-compose.vps.yml`**
   - **Bằng chứng:** `deploy.yml` (dòng 120, 175–178 trước sửa) đặt `DEPLOY_DIR="/opt/shopmart"` và chạy `docker compose -f docker-compose.prod.yml`. Trên VPS thực tế, thư mục compose là `/opt/shopmart/backend` và có `docker-compose.vps.yml`. Nếu chạy `deploy.yml` cũ, Docker Compose sẽ lấy tên project là `shopmart` thay vì `backend`, tạo volume mới rỗng (`shopmart_mysql-data`) và làm mất kết nối tới dữ liệu hiện có.
   - **Trạng thái:** **Đã sửa** — `deploy.yml` mới dùng `COMPOSE_DIR="/opt/shopmart/backend"`, tự động phát hiện và ghép `-f docker-compose.vps.yml` nếu tồn tại, và tuyệt đối không ghi đè `docker-compose.vps.yml`.

3. **[MEDIUM] Lỗi logic trong `deploy.yml` khi cập nhật `IMAGE_TAG` vào `.env` và kiểm tra healthcheck JSON**
   - **Bằng chứng:** `sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${IMAGE_TAG}/" .env || echo ...` không append nếu dòng `IMAGE_TAG=` chưa tồn tại (vì `sed` luôn trả exit code 0); `grep -c '"Health": "unhealthy"'` phụ thuộc khoảng trắng sau dấu `:`; `mysqldump -p"${MYSQL_ROOT_PASSWORD}"` lộ password trong process list.
   - **Trạng thái:** **Đã sửa** (kiểm tra `grep -q "^IMAGE_TAG="` trước khi `sed`/append, dùng regex `'"Health":[[:space:]]*"unhealthy"'`, và truyền `MYSQL_PWD` qua biến môi trường `docker exec -e MYSQL_PWD=...`).

4. **[LOW] Sử dụng tag `latest` song song `sha-<short>`**
   - `release.yml` gắn đồng thời `sha-<short>` (truy vết commit chính xác) và `latest` trên `main`. `deploy.yml` khi chạy tự động từ `workflow_run` đã resolve `TAG="sha-$(echo head_sha | cut -c1-7)"` — đây là thực hành tốt, giúp rollback chính xác về `PREVIOUS_TAG` thay vì phụ thuộc `latest`.

---

## 6. Backend Audit

- **API Gateway:** Đã tắt `discovery.locator.enabled: false`; `SpoofedHeaderSanitizationFilter` chạy ở `Ordered.HIGHEST_PRECEDENCE` xóa mọi `X-User-Id`, `X-User-Roles`, `X-User-Email`, `X-Internal-Service-Key` giả mạo từ client; `AuthenticationFilter` verify JWT bằng `jwt.secret` và kiểm tra Redis blacklist `jwt:blacklist:`; các route nội bộ (`/reserve-stock`, `/restore-stock`, `/flash-sales/reserve`, `/flash-sales/restore`) bị chặn ngoài qua `BlockExternalAccess`.
- **Auth Service:** `RegisterRequest` dùng `@JsonIgnoreProperties(ignoreUnknown = true)` và không có field `roles` (chống privilege escalation). `JwtTokenProvider` ký/verify HS512/HMAC với `jwt.secret`.
- **Product Service:** `InternalAuthValidator` dùng `MessageDigest.isEqual` (constant-time comparison) kiểm tra `X-Internal-Service-Key` hoặc `ROLE_ADMIN`.
- **Order Service & Payment Service:** Kiểm tra `X-User-Id` chống IDOR ở `OrderController` và `PaymentController`, đồng thời `FeignConfig` chuyển tiếp `X-Internal-Service-Key` và header xác thực sang `product-service`.

---

## 7. Frontend Audit

- `frontend/src/services/api.js`: Tự động fallback `BASE_API_URL` sang `/api/v1` nếu truy cập từ domain/IP khác `localhost`/`127.0.0.1` (giúp không bị lỗi gọi nhầm localhost người dùng trên VPS).
- `frontend/Dockerfile` và `docker-compose.prod.yml` truyền build-arg `VITE_API_URL=/api/v1` và `VITE_USE_MOCK_AUTH=false`.
- `frontend/nginx.conf` cấu hình SPA fallback `try_files $uri $uri/ /index.html`, gzip và `/healthz`.
- Linter (`93` files), `415` unit/QA tests và `vite build` đều pass không lỗi.

---

## 8. Database & Migration Audit

- Tất cả 4 service dùng MySQL (`auth-service`, `product-service`, `order-service`, `payment-service`) đều cấu hình `spring.jpa.hibernate.ddl-auto: validate` trong `application-prod.yml`.
- Các script trong `backend/docker/mysql/init.sql` và `backend/docker/mysql/migrations/01..05` + `apply_all_migrations.sql` đều idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`, kiểm tra `information_schema.COLUMNS`), bao gồm bản vá `product_reviews.rating` sang `INT NOT NULL` và cột `payments.user_id` khớp entity Hibernate.
- Không phát hiện sai lệch schema nào gây restart loop với `ddl-auto: validate`.

---

## 9. Bugs Found (Tổng hợp theo mức độ)

| ID | Mức độ | Mô tả vấn đề | Vị trí | Trạng thái |
|---|---|---|---|---|
| SEC-01 | **CRITICAL** | `INTERNAL_SERVICE_KEY` có giá trị mặc định yếu trong prod compose & config | `backend/docker-compose.prod.yml`, `application.yml`, `.env.example` | Đã sửa |
| SEC-02 | **CRITICAL** | `DataInitializer` có fallback seed admin `Admin@123456` và compose prod không truyền biến admin | `DataInitializer.java`, `backend/docker-compose.prod.yml` | Đã sửa |
| SEC-03 | **HIGH** | `application-prod.yml` cả 6 service thiếu override fail-fast cho secret | `backend/*/src/main/resources/application-prod.yml` | Đã sửa |
| DEV-01 | **HIGH** | `release.yml` & `deploy.yml` chạy trên `master` thay vì `main` | `.github/workflows/release.yml`, `deploy.yml`, `ci.yml` | Đã sửa |
| DEV-02 | **HIGH** | `deploy.yml` deploy vào `/opt/shopmart` thay vì `/opt/shopmart/backend` & bỏ qua `docker-compose.vps.yml` | `.github/workflows/deploy.yml` | Đã sửa |
| SEC-04 | **MEDIUM** | Swagger UI & API Docs chưa tắt ở profile `prod` | `backend/*/src/main/resources/application-prod.yml` | Đã sửa |
| SEC-05 | **MEDIUM** | `init.sql` & `01_grant_privileges.sql` tạo user dev `ecommerce_user` với pass mặc định | `backend/docker/mysql/init.sql`, `01_grant_privileges.sql` | Giữ nguyên (tránh ảnh hưởng init cũ), cần kiểm tra trên VPS |
| DEV-03 | **MEDIUM** | `deploy.yml` lỗi `sed` khi `IMAGE_TAG` chưa có, regex JSON healthcheck cứng, lộ `MYSQL_ROOT_PASSWORD` qua CLI | `.github/workflows/deploy.yml` | Đã sửa |
| SEC-06 | **LOW** | `auth-service` `SecurityConfig` cấu hình CORS `*` | `auth-service/.../SecurityConfig.java` | Chấp nhận được (đã đứng sau Gateway/Nginx), ghi nhận theo dõi |

---

## 10. Fixes Applied

1. **Loại bỏ fallback yếu & truyền biến Admin (`backend/docker-compose.prod.yml`):**
   - Đổi `INTERNAL_SERVICE_KEY` ở `product-service` và `order-service` từ `${INTERNAL_SERVICE_KEY:-ecommerce-internal-service-secret-2026}` thành `${INTERNAL_SERVICE_KEY}`.
   - Truyền `DEFAULT_ADMIN_EMAIL` và `DEFAULT_ADMIN_PASSWORD` vào `auth-service`.
2. **Bảo vệ `DataInitializer` trong production (`auth-service/.../DataInitializer.java`):**
   - Kiểm tra profile `prod`: từ chối seed mật khẩu mặc định `Admin@123456` hoặc `CHANGE_ME*`; fail-fast bằng `IllegalStateException` nếu DB user đang rỗng mà thiếu cấu hình admin mạnh.
3. **Ép Fail-Fast Secret & tắt Swagger trong `prod` (`backend/*/src/main/resources/application-prod.yml`):**
   - Override `spring.datasource.password`, `spring.data.redis.password`, `jwt.secret`, `internal.service-key`, `eureka.client.service-url.defaultZone`, `spring.security.user.*` không kèm giá trị mặc định.
   - Tắt `springdoc.api-docs.enabled` và `springdoc.swagger-ui.enabled`.
4. **Cập nhật mẫu cấu hình (`backend/.env.example`):**
   - Thay toàn bộ mật khẩu mẫu sang placeholder `CHANGE_ME_...` và bổ sung `INTERNAL_SERVICE_KEY`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`.
5. **Chuẩn hóa CI/CD (`ci.yml`, `release.yml`, `deploy.yml`):**
   - Chuyển nhánh build/push GHCR và deploy production sang `main`.
   - Sửa `deploy.yml` dùng `/opt/shopmart/backend`, tự ghép `-f docker-compose.vps.yml` nếu có, sửa `IMAGE_TAG` update, regex healthcheck và `MYSQL_PWD`.

---

## 11. Files Changed

- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/release.yml`
- `backend/.env.example`
- `backend/docker-compose.prod.yml`
- `backend/discovery-server/src/main/resources/application-prod.yml`
- `backend/api-gateway/src/main/resources/application-prod.yml`
- `backend/auth-service/src/main/resources/application-prod.yml`
- `backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java`
- `backend/product-service/src/main/resources/application-prod.yml`
- `backend/order-service/src/main/resources/application-prod.yml`
- `backend/payment-service/src/main/resources/application-prod.yml`
- `reports/SHOPMART_FULL_SECURITY_DEVOPS_AUDIT.md` (báo cáo này)

---

## 12. Tests Executed

| Hạng mục | Lệnh thực thi | Kết quả |
|---|---|---|
| Backend Compile & Full Test Suite | `cd backend; .\gradlew.bat test --rerun-tasks --no-daemon` | **PASS** (24/24 tasks executed, `BUILD SUCCESSFUL in 2m 31s`) |
| Frontend Lint | `cd frontend; npm run lint` | **PASS** (93 files, 0 errors) |
| Frontend Automated QA Tests | `cd frontend; npm run test` | **PASS** (415 tests / 21 suites, 0 failures) |
| Frontend Production Build | `cd frontend; npm run build` | **PASS** (`vite build` thành công) |
| Docker Compose Dev Config | `docker compose -f backend/docker-compose.yml config --quiet` | **PASS** (exit code 0) |
| Docker Compose Prod Config | `docker compose -f backend/docker-compose.prod.yml config --quiet` | **PASS** (exit code 0; cảnh báo thiếu `INTERNAL_SERVICE_KEY` trong shell hiện tại — đúng thiết kế không default) |
| Prod Port Hardening Check | Script Node kiểm tra `docker compose -f backend/docker-compose.prod.yml config --format json` | **PASS** |
| Git Secret History Check | `git ls-files "*.env*"` & `git log --all -- "*.env" "*/*/.env"` | **PASS** (không có `.env` chứa secret) |

---

## 13. Tests Passed

Tất cả 8 hạng mục kiểm thử ở mục 12 đều **PASS** sau lần chỉnh sửa cuối cùng.

---

## 14. Tests Failed

Không có test nào thất bại (0 failed).

---

## 15. Tests Not Run

- **Docker image build local (`docker compose build`) & Runtime Container Integration Test:** Chưa chạy build image Docker và dựng stack full MySQL/Redis/Kafka local do không chạy daemon container test trong phạm vi kiểm tra tĩnh/unit/compose validation này; quá trình build image thật sẽ chạy trên GitHub Actions (`release.yml`) khi merge vào `main`.
- **Live VPS Penetration / Secret Verification:** Không thực hiện truy cập VPS hoặc kiểm tra `.env` thật trên VPS theo đúng ràng buộc an toàn.

---

## 16. Remaining Risks

1. **[HIGH — Hành động bắt buộc trước deploy]** File `.env` hiện tại trên VPS (`/opt/shopmart/backend/.env`) **có thể chưa có `INTERNAL_SERVICE_KEY`** hoặc vẫn đang chứa giá trị placeholder/yếu cho `JWT_SECRET`, `REDIS_PASSWORD`, `EUREKA_PASSWORD`, `MYSQL_PASSWORD`. Sau khi áp dụng bản sửa này, nếu `.env` trên VPS thiếu `INTERNAL_SERVICE_KEY`, `product-service` và `order-service` sẽ chủ động **fail-fast** (không khởi động) để bảo vệ hệ thống.
2. **[MEDIUM]** Tài khoản `ecommerce_user` dev trong MySQL (nếu đã được tạo từ `init.sql` ban đầu) vẫn tồn tại trên VPS nếu chưa được rà soát/khóa.
3. **[LOW]** HTTPS (port 443) trong `nginx.prod.conf` hiện đang comment chờ cấu hình chứng chỉ SSL Let's Encrypt theo domain thật.

---

## 17. VPS Secret Rotation Plan (Chỉ hướng dẫn — KHÔNG tự ý thực hiện)

> **Nguyên tắc:** Luôn backup MySQL trước khi rotation (`scripts/backup/backup.sh`). Thực hiện theo từng nhóm để dễ khoanh vùng và rollback.

### Nhóm A: `INTERNAL_SERVICE_KEY` (Ưu tiên cao nhất — bổ sung/đổi ngay trước khi deploy bản mới)
- **Các service dùng chung & phải cập nhật đồng bộ:** `product-service`, `order-service`.
- **Quy trình:**
  1. Sinh key mới trên VPS: `openssl rand -hex 32`
  2. Cập nhật `INTERNAL_SERVICE_KEY=<new_key>` trong `/opt/shopmart/backend/.env`.
  3. Recreate đồng bộ 2 service: `docker compose -f docker-compose.prod.yml -f docker-compose.vps.yml up -d --force-recreate product-service order-service`.
  4. Kiểm tra log `product-service` và `order-service` đảm bảo không có `403 AccessDenied` khi checkout.

### Nhóm B: `JWT_SECRET`
- **Các service dùng chung & phải cập nhật đồng bộ:** `auth-service`, `api-gateway`.
- **Ảnh hưởng:** Mọi Access/Refresh Token đang lưu ở trình duyệt người dùng sẽ hết hiệu lực ngay lập tức (user phải đăng nhập lại).
- **Quy trình:**
  1. Sinh key 512-bit: `openssl rand -base64 64`
  2. Cập nhật `JWT_SECRET=<new_key>` trong `.env`.
  3. Recreate đồng bộ: `docker compose ... up -d --force-recreate auth-service api-gateway`.

### Nhóm C: `REDIS_PASSWORD`
- **Các service dùng chung & phải cập nhật đồng bộ:** `redis`, `auth-service`, `product-service`, `api-gateway`.
- **Quy trình:**
  1. Sinh password mới: `openssl rand -base64 32`
  2. Cập nhật `REDIS_PASSWORD=<new_pass>` trong `.env`.
  3. Recreate đồng bộ cả 4 container (`redis` trước, sau đó `auth-service`, `product-service`, `api-gateway`).

### Nhóm D: `EUREKA_USER` / `EUREKA_PASSWORD`
- **Các service dùng chung & phải cập nhật đồng bộ:** `discovery-server`, `api-gateway`, `auth-service`, `product-service`, `order-service`, `payment-service`.
- **Quy trình:** Cập nhật `.env`, recreate `discovery-server` trước để healthy, rồi recreate 5 service còn lại.

### Nhóm E: `MYSQL_ROOT_PASSWORD` & `MYSQL_PASSWORD` (Cẩn trọng nhất)
- **Các service dùng chung & phải cập nhật đồng bộ:** `mysql`, `auth-service`, `product-service`, `order-service`, `payment-service`.
- **Lưu ý quan trọng:** Đổi biến trong `.env` **không tự đổi** password trong volume `mysql-data` đã tồn tại!
- **Quy trình:**
  1. Chạy backup toàn bộ DB trước.
  2. Kết nối vào MySQL đang chạy bằng mật khẩu cũ, chạy lệnh SQL `ALTER USER 'ecommerce_prod_user'@'%' IDENTIFIED BY '<new_pass>'; ALTER USER 'root'@'localhost' IDENTIFIED BY '<new_root_pass>'; FLUSH PRIVILEGES;` (và kiểm tra xóa user dev `DROP USER IF EXISTS 'ecommerce_user'@'%';` nếu không sử dụng).
  3. Cập nhật `MYSQL_PASSWORD` / `MYSQL_ROOT_PASSWORD` trong `.env`.
  4. Recreate 4 service backend (`auth-service`, `product-service`, `order-service`, `payment-service`).

---

## 18. Git Merge & Deployment Checklist

1. **Review diff trên nhánh `devops-phuong`:**
   - Kiểm tra `git diff` xác nhận không có secret thật, không ghi đè `reports/presentation/`.
2. **Push nhánh `devops-phuong` và kiểm tra GitHub Actions CI:**
   - Đảm bảo job `Frontend CI`, `Backend CI`, `Docker & Compose Validation`, `Security & Secret Scan` đều xanh.
3. **Merge `devops-phuong` → `master`, sau đó `master` → `main`:**
   - Khi merge vào `main`, `release.yml` sẽ tự động build và push 7 Docker image lên GHCR với tag `sha-<commit>` và `latest`.
4. **Chuẩn bị trên VPS TRƯỚC khi chạy `deploy.yml`:**
   - SSH vào VPS (`/opt/shopmart/backend`).
   - Kiểm tra `.env` có đầy đủ các biến bắt buộc và **không còn giá trị placeholder/mặc định yếu**: `JWT_SECRET`, `INTERNAL_SERVICE_KEY`, `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `REDIS_PASSWORD`, `EUREKA_USER`, `EUREKA_PASSWORD`.
   - Kiểm tra GitHub Repository Secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `GHCR_TOKEN`) đã cấu hình đầy đủ.
   - Đảm bảo `docker-compose.vps.yml` trên VPS vẫn nguyên vẹn.
5. **Deploy & Verify:**
   - Chạy `deploy.yml` (hoặc theo dõi `workflow_run` sau khi `release.yml` trên `main` thành công) với `run_backup=true`.
   - Kiểm tra tất cả container Healthy và test end-to-end (Login, Product, Flash Sale, Cart, Checkout, Payment).
