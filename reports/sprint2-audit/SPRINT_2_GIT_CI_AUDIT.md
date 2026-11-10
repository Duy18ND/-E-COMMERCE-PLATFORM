# BÁO CÁO KIỂM TOÁN GIT VÀ GITHUB ACTIONS CI/CD (GIT & CI AUDIT)

## 1. THỰC TRẠNG GIT VÀ CÁC NHÁNH PHÁT TRIỂN

### 1.1. Tình trạng Working Tree & Commit Local
- **Lệnh thực hiện:** `git status`
- **Kết quả:**
  ```text
  On branch devops-phuong
  Your branch is up to date with 'origin/devops-phuong'.
  nothing to commit, working tree clean
  ```
- **Đánh giá:**
  - 100% mã nguồn đã được commit sạch sẽ.
  - Không có file dở dang chưa commit (`uncommitted files: 0`).
  - Không có commit local nào chưa push (`unpushed commits: 0`).
  - Nhánh `devops-phuong` ở local hoàn toàn đồng bộ với remote `origin/devops-phuong`.

### 1.2. Đối chiếu giữa nhánh `devops-phuong` và nhánh `origin/master`
- **Mã commit HEAD của `devops-phuong`:** `44b8a1ff063df8b36f67e7b6a15cc9faa31954a2`
- **Mã commit HEAD của `origin/master`:** `7935d5e66bbd7cff7eddf77abbf52334d0eca41b`
- **Số commit trên `devops-phuong` chưa vào `origin/master`:** **1 commit**
  ```text
  44b8a1f feat: complete ECOM-284 ECOM-293 ECOM-303 (Thực tế chứa code ECOM-313, ECOM-314, ECOM-318)
  ```
- **Chi tiết các file bị lệch giữa `devops-phuong` và `master` (15 files, 1334 insertions, 15 deletions):**
  - `backend/order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java`
  - `backend/order-service/src/test/java/com/ecommerce/order/controller/OrderTrackingApiQATest.java` (Bộ test JUnit 5 289 dòng)
  - `frontend/package.json`
  - `frontend/src/components/order/OrderTimeline.jsx`
  - `frontend/src/pages/customer/OrderDetail.jsx`
  - `frontend/src/pages/customer/OrderTracking.jsx`
  - `frontend/src/pages/customer/Orders.jsx`
  - `frontend/src/services/orderService.js` (Thêm đồng bộ BroadcastChannel và signal)
  - `frontend/tests/ecom313.status_sync.qa.test.mjs`
  - `frontend/tests/ecom314.tracking_fe.qa.test.mjs`
  - `frontend/tests/ecom318.tracking_be.qa.test.mjs`
  - `reports/ECOM-313_314_318_INTEGRATION_REPORT.md`
  - `reports/ECOM-313_IMPLEMENTATION_REPORT.md`
  - `reports/ECOM-314_IMPLEMENTATION_REPORT.md`
  - `reports/ECOM-318_IMPLEMENTATION_REPORT.md`

### 1.3. Lịch sử các Pull Request đã merge vào `master`
- **PR #48:** `Merge pull request #48 from Duy18ND/devops-phuong` (Commit `6179eae`: ECOM-284, ECOM-293, ECOM-303) - ĐÃ MERGE
- **PR #47:** `Merge pull request #47 from Duy18ND/devops-phuong` (Commit `509d2ad`: ECOM-275, ECOM-278) - ĐÃ MERGE
- **PR #46:** `Merge pull request #46 from Duy18ND/devops-phuong` (Commit `3c31fbe`: ECOM-269 Payment Service fix) - ĐÃ MERGE
- **PR #45:** `Merge pull request #45 from Duy18ND/devops-phuong` (Commit `6aede34`: ECOM-260, ECOM-312) - ĐÃ MERGE
- **PR #43:** `Merge pull request #43 from Duy18ND/devops-phuong` (Commit `f86d491`: ECOM-173, ECOM-188) - ĐÃ MERGE
- **PR #44 & #42:** `Merge pull request from Duy18ND/BE-Linh` - ĐÃ MERGE

---

## 2. KẾT QUẢ KIỂM TOÁN GITHUB ACTIONS WORKFLOWS

### 2.1. Kiểm tra Cấu hình CI (`.github/workflows/ci.yml`)
- Cấu hình workflow kích hoạt trên:
  - `pull_request` vào nhánh `master`
  - `push` vào nhánh `devops-phuong`
- Toàn bộ 4 Job đều được thẩm định:
  1. `frontend-ci`:
     - Node version: 20
     - Cache: `npm` (khóa phụ thuộc `frontend/package-lock.json`)
     - Lệnh chạy: `npm ci` -> `npm run lint` -> `npm run test` -> `npm run build`
     - Môi trường: `VITE_API_URL=/api/v1`, `VITE_USE_MOCK_AUTH=false`
     - Lưu trữ artifact: `frontend/dist` (7 ngày)
  2. `backend-ci`:
     - JDK distribution: `temurin` version 21
     - Gradle wrapper validation: `gradle/actions/wrapper-validation@v4`
     - Lệnh chạy: `./gradlew test --no-daemon --max-workers=2` -> `./gradlew bootJar --no-daemon -x test --max-workers=2`
     - Lưu trữ artifact: Các file `.jar` của 6 microservice.
  3. `docker-validation`:
     - Kiểm tra vị trí 7 Dockerfile (`frontend`, `auth-service`, `product-service`, `order-service`, `payment-service`, `discovery-server`, `api-gateway`).
     - Kiểm tra bind mount: `init.sql` và `nginx.prod.conf`.
     - Kiểm tra cú pháp Compose dev và prod.
     - Port hardening script: Đảm bảo toàn bộ private port gắn với `127.0.0.1`.
  4. `security-checks`:
     - Quét không cho phép file `.env` nhạy cảm bị commit.
     - Quét bảo vệ phân quyền: `RegisterRequest` không chứa trường gán role.
     - Quét Hibernate: Tất cả `application-prod.yml` phải dùng `ddl-auto: validate`.

### 2.2. Kết quả Chạy Kiểm thử Cục bộ (Local Pre-flight CI Run)
- **Frontend Linter:** PASS (0 lỗi).
- **Frontend Automated Tests:** PASS (313/313 tests pass).
- **Frontend Production Build:** PASS (`dist/` build trong 4.57s).
- **Backend Gradle Tests:** PASS (424/424 tests pass trên toàn bộ 6 microservices).
- **Docker & Compose:** PASS (Tất cả Dockerfiles, bind mounts và hardening đều đạt chuẩn).

---

## 3. RỦI RO KHI TRIỂN KHAI VÀ KHUYẾN NGHỊ DEVOPS

1. **Rủi ro phân mảnh phiên bản giữa các nhánh:**
   - Cần khẩn trương tạo PR #49 để đưa commit `44b8a1f` vào `master`. Không deploy VPS từ nhánh `master` trước khi hoàn tất merge này.
2. **Triển khai lên VPS ShopMart:**
   - Khi pull code mới trên VPS, tuân thủ đúng quy trình:
     1. `git pull origin master`
     2. `docker compose -f backend/docker-compose.prod.yml build`
     3. `docker compose -f backend/docker-compose.prod.yml up -d --remove-orphans`
     4. Kiểm tra sức khỏe dịch vụ: `curl -I http://127.0.0.1/api/v1/actuator/health`
