# ShopMart Final Pre-Deploy Audit Report

- **Branch**: `devops-phuong`
- **Scope**: `DataInitializer.java`, `.github/workflows/{ci,release,deploy}.yml`, `backend/docker-compose*.yml`, `backend/*/src/main/resources/application-prod.yml`
- **Constraints**: Working tree only — **NO** commit, **NO** push, **NO** merge, **NO** VPS deploy, **NO** edits to VPS-local files (`docker-compose.vps.yml`, `.env`, `nginx.vps-http.conf`).

---

## 1. Danh sách lỗi tìm thấy

### 1.1. `DataInitializer.java` (auth-service) — Thiếu kiểm tra độ dài và độ mạnh mật khẩu admin ở `prod`
- **Vị trí**: `backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java`
- **Chi tiết**:
  - Trước khi sửa, profile `prod` chỉ từ chối mật khẩu rỗng, `"Admin@123456"`, hoặc chuỗi bắt đầu bằng `"CHANGE_ME"`.
  - Mật khẩu quá ngắn (ví dụ `"Ab1!short"`), thiếu độ phức tạp (thiếu chữ hoa/thường/số/ký tự đặc biệt), có khoảng trắng, hoặc các biến thể mặc định/placeholder khác (như `password`, `admin123`, `PLACEHOLDER`, `CHANGEME` chứa ở giữa chuỗi) vẫn có thể lọt qua.
  - Email placeholder (ví dụ chứa `CHANGE_ME` hoặc không hợp lệ) cũng chưa được kiểm tra chặt ở `prod`.

### 1.2. `.github/workflows/deploy.yml` — Thiếu kiểm tra nhất quán `IMAGE_TAG` giữa `.env` và 7 container đang chạy trước deploy
- **Vị trí**: `.github/workflows/deploy.yml` (Phase 5 & Rollback)
- **Chi tiết**:
  - Trước khi sửa, Phase 5 chỉ đọc tag từ từng container đang chạy (`{{.Config.Image}}`), không đọc `IMAGE_TAG` từ `${COMPOSE_DIR}/.env` và không kiểm tra 7 container đang chạy (`discovery-server`, `auth-service`, `product-service`, `order-service`, `payment-service`, `api-gateway`, `frontend`) có dùng cùng tag với `IMAGE_TAG` cũ trong `.env` hay không.
  - Nếu trạng thái production trước deploy bị lệch tag giữa `.env` và các container, deploy vẫn tiếp tục thay vì abort trước khi chạm vào production.
  - Khi rollback, biến môi trường shell `IMAGE_TAG` được export thành tag mới ở Phase 6 chưa được khôi phục lại thành `PREV_ENV_IMAGE_TAG` sau khi restore `.env`, dễ gây ưu tiên nhầm biến shell khi gọi `dc` ở các bước rollback phụ thuộc `.env`.

### 1.3. `.github/workflows/deploy.yml` — Thay đổi Compose của `nginx` không được áp dụng và chưa có rollback tương ứng
- **Vị trí**: `.github/workflows/deploy.yml` (Phase 5, 7, 8 & Rollback)
- **Chi tiết**:
  - Trước khi sửa, workflow chỉ kiểm tra `BEFORE_NGINX_SHA != AFTER_NGINX_SHA` (file `nginx.prod.conf`) để chạy `nginx -s reload`.
  - Trường hợp `docker-compose.yml` hoặc `docker-compose.prod.yml` thay đổi cấu hình service `nginx` (image, port, volume, network, healthcheck, v.v.) nhưng `nginx.prod.conf` không đổi thì `ecommerce-nginx` không bao giờ được recreate (`dc up -d --no-deps nginx`).
  - Ngoài ra chưa pin image cũ của `nginx` (`shopmart-rollback/nginx:pre-deploy`), chưa kiểm tra health trước/sau khi thay đổi `nginx`, và rollback chưa khôi phục lại container `nginx` về image + Compose config cũ nếu recreate thất bại.

### 1.4. `.github/workflows/deploy.yml` — Thay đổi Compose cho app service khác khi `CHANGED_SERVICES` không rỗng
- **Vị trí**: `.github/workflows/deploy.yml` (Phase 7 & Phase 8)
- **Chi tiết**:
  - Trước khi sửa bổ sung, nếu có ít nhất 1 app service đổi image (`CHANGED_SERVICES` khác rỗng) đồng thời `docker-compose.yml`/`docker-compose.prod.yml` thay đổi cấu hình cho một app service *khác* không đổi image, `update_stage` chỉ recreate các service trong `CHANGED_SERVICES`, bỏ sót service chỉ đổi Compose config.
  - Ngược lại, khi `CHANGED_SERVICES` rỗng và `BEFORE_COMPOSE_HASH != AFTER_COMPOSE_HASH`, workflow lại recreate toàn bộ `$APP_SERVICES` thay vì chỉ những service có cấu hình thay đổi.
  - **Đã sửa**: Thay bằng hàm `extract_service_block_hash` render `dc config` với cùng `IMAGE_TAG` trước/sau khi copy file cấu hình để băm riêng từng block service (`$APP_SERVICES` và `nginx`). Tập `SERVICES_TO_RECREATE` là hợp của `CHANGED_SERVICES` (đổi image digest) và `COMPOSE_CHANGED_SERVICES` (đổi cấu hình Compose), chỉ recreate đúng service cần thiết qua `update_stage` (`--no-deps --no-build`), không bao giờ đụng tới `mysql`, `redis`, `kafka`, `zookeeper`, không làm gì khi no-op, và ghi đầy đủ vào `ATTEMPTED_SERVICES` để rollback khôi phục cả Compose config lẫn image ID cũ.

### 1.5. Audit bổ sung (`ci.yml`, `release.yml`, `deploy.yml`, Compose env vars & secrets)
- Đã rà soát toàn bộ `ci.yml`, `release.yml`, `deploy.yml`:
  - Đủ 7 image: `auth-service`, `product-service`, `order-service`, `payment-service`, `discovery-server`, `api-gateway`, `frontend`.
  - Exact 40-char SHA checkout và tag `sha-xxxxxxx` (unique 7-char prefix) nhất quán giữa `release.yml` và `deploy.yml`; `deploy.yml` từ chối `latest` và giới hạn `main`.
  - Quyền GHCR: `release.yml` (`contents: read`, `packages: write`), `deploy.yml` (`contents: read`, `packages: read`).
  - Biến môi trường trong `backend/docker-compose.prod.yml` khớp với toàn bộ `${...}` trong `application.yml` và `application-prod.yml` của cả 6 service Spring Boot.
  - Không phát hiện secret hard-code mới hay in nội dung `.env` / password ra log.
  - Không chạm vào `docker-compose.vps.yml`, `.env`, hoặc `nginx.vps-http.conf`.

---

## 2. File đã sửa và lý do sửa

| File | Lý do sửa |
| --- | --- |
| `backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java` | Bổ sung `isValidProdAdminEmail` và `isStrongProdAdminPassword` (tối thiểu 12 ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt, không khoảng trắng, từ chối mật khẩu mặc định và placeholder); fail-fast nếu DB rỗng ở `prod`; bỏ qua an toàn nếu DB đã có user; giữ nguyên luồng `initRoles()` và profile `dev`; không log secret/password. |
| `backend/auth-service/src/test/java/com/ecommerce/auth/config/DataInitializerTest.java` | Thêm 8 unit test kiểm chứng đầy đủ các kịch bản `prod` (DB rỗng + thiếu/mặc định/placeholder/ngắn/yếu/hợp lệ, DB đã có user) và `dev` fallback, đồng thời kiểm tra thông báo lỗi không làm lộ mật khẩu. |
| `.github/workflows/deploy.yml` | (1) Thêm `read_env_image_tag` đọc riêng dòng `IMAGE_TAG=` từ `.env` mà không in nội dung `.env`, kiểm tra đồng bộ tag của cả 7 service đang chạy với `PREV_ENV_IMAGE_TAG` và abort nếu lệch; (2) Pin thêm `shopmart-rollback/nginx:pre-deploy` và thêm `extract_service_block_hash` phát hiện thay đổi cấu hình Compose riêng cho từng service trong `$APP_SERVICES` và `nginx`; (3) Tính `SERVICES_TO_RECREATE` (hợp của `CHANGED_SERVICES` và `COMPOSE_CHANGED_SERVICES`) để chỉ recreate đúng các app service cần thiết bằng `--no-deps --no-build`, và chỉ recreate/reload `nginx` khi thực sự cần, có kiểm tra health trước và sau; không đụng tới `mysql`, `redis`, `kafka`, `zookeeper`; (4) Cập nhật rollback khôi phục `.env`, `export IMAGE_TAG="${PREV_ENV_IMAGE_TAG}"`, app services, và recreate/reload `nginx` về trạng thái & image ID trước đó. |

---

## 3. Kết quả từng test

| Kiểm tra / Test | Kết quả | Chi tiết quan sát thực tế |
| --- | --- | --- |
| `git diff --check` | **PASS** | Chạy lại sau chỉnh sửa cuối cùng: thoát mã 0, không có lỗi trailing whitespace hay conflict marker. |
| `docker compose --env-file backend/.env.prod.example -f backend/docker-compose.prod.yml config` | **PASS** | Chạy với file mẫu `.env.prod.example` (không chứa secret thật), thoát mã 0 và xác nhận cấu trúc YAML chuẩn (`services:`, `  auth-service:`, `  nginx:`) tương thích với `extract_service_block_hash`. |
| `.\gradlew.bat :auth-service:test --no-daemon` | **PASS** | `BUILD SUCCESSFUL in 20s` (lần chạy đầy đủ trước đó `1m 33s` kèm `:auth-service:bootJar`, `DataInitializerTest`: 8 tests, 0 failures, 0 errors, 0 skipped). |
| YAML workflow syntax check (`python` / `ruby` / `node`) | **BLOCKED** | Môi trường local Windows không cài `pyyaml`, `ruby`, hoặc `js-yaml`/`yaml` trong `node_modules`. |
| Bash syntax check (`bash -n`) trên script trong `deploy.yml` | **BLOCKED** | WSL `bash.exe` (`Bash/E_ACCESSDENIED`) và Git Bash (`msys-2.0.dll` `NtCreateDirectoryObject` `0xC0000022`) bị chặn trong môi trường chạy lệnh hiện tại. |

---

## 4. Rủi ro còn tồn tại

1. **Chưa chạy parser YAML và `bash -n` cục bộ**: Do thiếu thư viện YAML trong Python/Node và hạn chế MSYS/WSL trong môi trường local, cú pháp YAML của `.github/workflows/*.yml` và cú pháp bash của `deploy.yml` chưa được lint tự động bằng `actionlint`/`yamllint`/`bash -n` trước khi push.
2. **E2E trên VPS thực tế**: Các luồng SSH/Docker rollback trên VPS chưa chạy thực tế theo đúng ràng buộc không deploy VPS.

---

## 5. Danh sách file modified / untracked

### Modified (`M`)
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/release.yml`
- `backend/.env.example`
- `backend/api-gateway/src/main/resources/application-prod.yml`
- `backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java`
- `backend/auth-service/src/main/resources/application-prod.yml`
- `backend/discovery-server/src/main/resources/application-prod.yml`
- `backend/docker-compose.prod.yml`
- `backend/order-service/src/main/resources/application-prod.yml`
- `backend/payment-service/src/main/resources/application-prod.yml`
- `backend/product-service/src/main/resources/application-prod.yml`

### Untracked (`??`)
- `backend/auth-service/src/test/java/com/ecommerce/auth/config/DataInitializerTest.java`
- `reports/SHOPMART_FULL_SECURITY_DEVOPS_AUDIT.md`
- `reports/SHOPMART_FINAL_PRE_DEPLOY_AUDIT.md`
- `reports/presentation/`

---

## 6. Kết luận

**ĐỦ ĐIỀU KIỆN ĐỂ COMMIT/PUSH LÊN NHÁNH DEVOPS/CI ĐỂ KIỂM CHỨNG WORKFLOW TRÊN GITHUB ACTIONS** (với lưu ý: nên chạy `yamllint`/`actionlint` hoặc `bash -n` trên Linux/WSL trước khi kích hoạt deploy production thực tế, và kiểm tra lại danh sách các file đã sửa trước đó trong working tree thuộc phạm vi commit mong muốn).
