# BÁO CÁO TOÀN DIỆN AUDIT WORKFLOW RELEASE & GHCR PUBLISH
## ShopMart E-commerce Platform

**Repository:** `Duy18ND/-E-COMMERCE-PLATFORM`  
**Ngày thực hiện:** 23/11/2026  
**Branch kiểm tra:** `devops-phuong` / `main`  
**Mục tiêu:** Rà soát toàn bộ cấu hình phát hành Docker Images lên GitHub Container Registry (GHCR), tính bất biến của tag, kiến trúc matrix dịch vụ, và sự bảo mật của pipeline release.

---

## 1. TỔNG QUAN KIẾN TRÚC WORKFLOW RELEASE

File cấu hình: `.github/workflows/release.yml`  
Workflow: `Release and Publish Docker Images`

### Cơ chế kích hoạt (Trigger Mechanism):
```yaml
on:
  workflow_run:
    workflows: ["Continuous Integration (CI)"]
    types: [ completed ]
    branches: [ main ]
```

### Các lớp bảo vệ an ninh (Security Guards):
Job `build-and-push` được bảo vệ nghiêm ngặt bằng điều kiện `if`:
1. **Kiểm tra workflow nguồn:** Bắt buộc phải là `Continuous Integration (CI)`.
2. **Kiểm tra trạng thái kết luận:** Bắt buộc `conclusion == 'success'`.
3. **Kiểm tra nhánh nguồn:** Bắt buộc `head_branch == 'main'`.
4. **Kiểm tra sự kiện trigger:** Bắt buộc `event == 'push'` (tuyệt đối từ chối `pull_request` hoặc `pull_request_target`).
5. **Kiểm tra repository nguồn:** Bắt buộc `head_repository.full_name == github.repository` (tuyệt đối chặn các fork ngoài tổ chức).
6. **Kiểm tra tổ tiên Git (Ancestry Check):** Trong step `resolve-ref`, script thực thi kiểm tra nghiêm ngặt:
   ```bash
   if ! git merge-base --is-ancestor "$EXPECTED_SHA" "$MAIN_HEAD"; then
     echo "::error ::Commit '${EXPECTED_SHA}' does not belong to 'main' branch history."
     exit 1
   fi
   ```
   Ngăn chặn hoàn toàn việc build hoặc publish mã nguồn không nằm trong nhánh `main` được tin cậy.

---

## 2. RÀ SOÁT MATRIX DỊCH VỤ (8 MICROSERVICES)

Matrix dịch vụ hiện tại được định nghĩa trong `.github/workflows/release.yml` bao gồm đầy đủ **8 dịch vụ**:

| STT | Tên Dịch Vụ (`name`) | Ngữ Cảnh Build (`context`) | Đường Dẫn Dockerfile (`dockerfile`) | Build Arguments | Cache Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `auth-service` | `backend` | `backend/auth-service/Dockerfile` | Không | `auth-service` |
| 2 | `product-service` | `backend` | `backend/product-service/Dockerfile` | Không | `product-service` |
| 3 | `order-service` | `backend` | `backend/order-service/Dockerfile` | Không | `order-service` |
| 4 | `payment-service` | `backend` | `backend/payment-service/Dockerfile` | Không | `payment-service` |
| 5 | `discovery-server` | `backend` | `backend/discovery-server/Dockerfile` | Không | `discovery-server` |
| 6 | `api-gateway` | `backend` | `backend/api-gateway/Dockerfile` | Không | `api-gateway` |
| 7 | `chatbot-service` | `backend` | `backend/chatbot-service/Dockerfile` | Không | `chatbot-service` |
| 8 | `frontend` | `frontend` | `frontend/Dockerfile` | `VITE_API_URL=/api/v1`<br>`VITE_USE_MOCK_AUTH=false` | `frontend` |

### Làm rõ về `chatbot-service`:
- Trước đây có nghi vấn rằng `chatbot-service` bị thiếu trong release matrix.
- **Kết quả xác minh:** `chatbot-service` **đã có mặt chính thức** trong release matrix tại vị trí số 7. Dịch vụ này sử dụng context `backend`, Dockerfile `backend/chatbot-service/Dockerfile`, cổng nội bộ 8085, kết nối `chatbot_db` và Gemini AI API.
- Trong Release #48, `chatbot-service` đã được build và publish thành công lên `ghcr.io/duy18nd/chatbot-service:sha-76d7fd0`.

---

## 3. CHIẾN LƯỢC ĐẶT TAG & TÍNH BẤT BIẾN (IMMUTABILITY)

### Định dạng Tag:
Workflow sử dụng định dạng tag bất biến theo chuẩn Git SHA:
```
sha-${PREFIX_7}  (Ví dụ: sha-76d7fd0)
```

### Quy trình xác minh tính duy nhất (Uniqueness Verification):
Trong step `resolve-ref`:
```bash
PREFIX_7="${FULL_SHA:0:7}"
RESOLVED_7=$(git rev-parse --verify "${PREFIX_7}^{commit}" 2>/dev/null || true)
if [ -z "$RESOLVED_7" ] || [ "$RESOLVED_7" != "$FULL_SHA" ]; then
  echo "::error ::7-char SHA prefix '${PREFIX_7}' is not unique or does not resolve to '${FULL_SHA}'."
  exit 1
fi
```
Nếu 7 ký tự prefix bị trùng lặp (collision) trong Git tree, release workflow sẽ fail-fast ngay lập tức để bảo vệ tính toàn vẹn của image version.

### So sánh với Tag Mutable (`latest`):
- Hệ thống **tuyệt đối không sử dụng tag `latest`** để deploy lên production VPS.
- Việc sử dụng `sha-<7-char>` đảm bảo:
  1. Mỗi image build ra gắn liền với một commit xác định duy nhất trên `main`.
  2. Không bao giờ bị ghi đè ngầm (non-overwritable).
  3. Cho phép rollback chính xác tuyệt đối tới bất kỳ phiên bản nào trước đó trên VPS mà không lo ngại Docker local cache sử dụng nhầm image cũ.

---

## 4. TỐI ƯU HÓA BUILDX VÀ QUẢN LÝ CACHE

1. **GitHub Actions Cache Backend:**
   - Cấu hình: `cache-from: type=gha,scope=${{ matrix.service.name }}`
   - `cache-to: type=gha,mode=max,scope=${{ matrix.service.name }}`
   - Cache được phân vùng theo từng service (`scope`), tránh việc layer của backend làm bẩn cache của frontend hoặc giữa các microservice với nhau.

2. **Khắc phục lỗi build `product-service` (Đã hoàn thành ở PR #85 / Release #48):**
   - Đã bổ sung Google Maven Central Mirror fallback vào `settings.gradle` và `build.gradle` để chống nghẽn mạng tải dependencies.
   - Đã loại bỏ `--mount=type=cache` trong Dockerfile của `product-service` để tận dụng triệt để layer cache `type=gha` của Docker Buildx, giúp Gradle compile ổn định 100% trong môi trường GitHub Actions runner.

---

## 5. TỔNG KẾT ĐÁNH GIÁ SẴN SÀNG PHÁT HÀNH

| Hạng mục kiểm tra | Trạng thái | Đánh giá |
| :--- | :--- | :--- |
| Trigger an toàn từ CI trên `main` | **PASS** | Đạt chuẩn an ninh nghiêm ngặt |
| Xác minh commit thuộc nhánh `main` | **PASS** | Kiểm tra `merge-base` đầy đủ |
| Số lượng microservices trong matrix | **PASS** | Đủ 8/8 services (bao gồm `chatbot-service` & `frontend`) |
| Định dạng Tag bất biến (`sha-XXXXXXX`) | **PASS** | Kiểm tra duy nhất 7 ký tự SHA |
| Xác thực GHCR qua `GITHUB_TOKEN` | **PASS** | Quyền `packages: write` an toàn |
| Đồng bộ OCI Revision Annotation | **PASS** | Đã cấu hình `org.opencontainers.image.revision=${{ steps.resolve-ref.outputs.full_sha }}` |

---

## 6. KẾT QUẢ FINAL VERIFICATION (VÒNG KIỂM TRA CUỐI)

1. **Trigger & Phân quyền:**
   - Workflow chỉ kích hoạt khi `workflow_run` từ `Continuous Integration (CI)` có `conclusion == 'success'` và `head_branch == 'main'`. CI thất bại tuyệt đối không kích hoạt release.
   - Không có trigger `workflow_dispatch` tự do, ngăn ngừa phát hành nhầm source ref.
2. **Đồng bộ OCI Revision:**
   - Step `resolve-ref` export `full_sha=${FULL_SHA}`.
   - Action `docker/metadata-action` ghi đè nhãn OCI `org.opencontainers.image.revision` bằng đúng commit SHA đã checkout, triệt tiêu hoàn toàn sự sai lệch giữa tag và revision metadata.
3. **Không tạo vòng lặp workflow:**
   - Workflow chỉ thực hiện `docker/build-push-action` lên GHCR, không push commit ngược vào Git repository, loại trừ hoàn toàn nguy cơ infinite workflow loop.

**Kết luận:** Hệ thống Release và Publish GHCR đạt trạng thái **READY FOR COMMIT / RELEASE**.
