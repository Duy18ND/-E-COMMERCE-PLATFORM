# SHOPMART – FINAL CI/CD SECURITY REVIEW REPORT (UPDATED POST-BYPASS FIX)

- **Ngày cập nhật**: 2026-11-18
- **Branch hiện tại**: `devops-phuong` (`HEAD` = `786a1a8`, kèm các thay đổi đã sửa trong working tree)
- **Các file đã cập nhật trong working tree (`git status --short`)**:
  - `M .github/workflows/ci.yml`
  - `M .github/workflows/release.yml`
  - `M .github/workflows/deploy.yml`
  - `M backend/.env.prod.example`
  - `M backend/docker-compose.prod.yml`

---

## 1. Kiểm tra Release có bypass CI không (`.github/workflows/release.yml`)

Sau khi sửa, `.github/workflows/release.yml` (dòng 3–7) **chỉ còn duy nhất 1 trigger**:
- `workflow_run` (`workflows: ["Continuous Integration (CI)"]`, `types: [ completed ]`, `branches: [ main ]`)
- Đã **xóa hoàn toàn** `push: tags: ['v*.*.*']` và `workflow_dispatch`.

| Câu hỏi kiểm tra | Trạng thái sau khi sửa |
| --- | --- |
| **1. Có chắc chắn CI đã PASS trên đúng commit SHA được Release không?** | **PASS** — Bắt buộc `github.event_name == 'workflow_run'`, `workflow_run.name == 'Continuous Integration (CI)'`, `conclusion == 'success'`, `event == 'push'`, `head_branch == 'main'`, `head_repository.full_name == github.repository`, và `EXPECTED_SHA="$WORKFLOW_RUN_SHA"`. |
| **2. Có thể phát hành commit thuộc lịch sử `main` nhưng CI chưa chạy hoặc CI thất bại không?** | **PASS (Không thể)** — Mọi đường trigger thủ công hoặc qua tag đã bị loại bỏ; chỉ khi `ci.yml` hoàn thành với `conclusion == 'success'` trên `main` mới kích hoạt `release.yml`. |
| **3. `workflow_dispatch` có thể phát hành một commit cũ mà chưa có CI PASS không?** | **PASS (Không thể)** — Trigger `workflow_dispatch` đã bị xóa khỏi `release.yml`. |
| **4. Push tag `v*.*.*` có thể bỏ qua CI không?** | **PASS (Không thể)** — Trigger `push: tags: ['v*.*.*']` đã bị xóa khỏi `release.yml`. |

---

## 2. Kiểm tra tag `latest`

| Hạng mục kiểm tra | Trạng thái thực tế sau khi sửa | Kết luận |
| --- | --- | --- |
| **`release.yml` còn push `latest` không?** | Không. `metadata-action` (dòng 150–156) chỉ còn duy nhất `type=raw,value=${{ steps.resolve-ref.outputs.sha_tag }}`. | **PASS** |
| **`backend/.env.prod.example` còn `IMAGE_TAG=latest` không?** | Không. Tại dòng 36 đã đổi thành `IMAGE_TAG=sha-0000000` kèm chú thích đây chỉ là giá trị mẫu. | **PASS** |
| **`backend/docker-compose.prod.yml` còn `${IMAGE_TAG:-latest}` không?** | Không. Cả 7 service (`discovery-server`, `auth-service`, `product-service`, `order-service`, `payment-service`, `api-gateway`, `frontend` tại các dòng 144, 177, 218, 257, 291, 324, 366) đã được thay bằng `${IMAGE_TAG:?IMAGE_TAG must be set to an immutable SHA tag}`. | **PASS** |
| **Deploy có bắt buộc dùng `sha-xxxxxxx` không?** | Có. `deploy.yml` bắt buộc `^sha-[0-9a-fA-F]{7}$` ở cả runner và remote VPS. | **PASS** |

---

## 3. Kiểm tra Deploy (`.github/workflows/deploy.yml`)

- **Chỉ chạy sau Release hợp lệ**: **PASS** — Đã xóa `workflow_dispatch`; chỉ giữ duy nhất `workflow_run` sau `"Release and Publish Docker Images"` hoàn thành với `conclusion == 'success'` trên `main`.
- **Không nhận code từ fork & không checkout `ref` không đáng tin cậy**: **PASS** — `actions/checkout` chỉ dùng `with: fetch-depth: 0` (không truyền `ref:`), kiểm tra `event != 'pull_request'`, `event != 'pull_request_target'`, `head_repository.full_name == github.repository`, và xác minh `git merge-base --is-ancestor "$COMMIT_SHA" "$MAIN_HEAD"` trước khi `git checkout --detach`.
- **Chỉ deploy commit đã xác minh thuộc `main` và có CI PASS**: **PASS** — Chuỗi khép kín `push main` → `ci.yml` (`success`) → `release.yml` (`success` cho cùng `head_sha`) → `deploy.yml` (`success` cho cùng `head_sha`).
- **Bảo vệ SSH secrets, backup, healthcheck và rollback**: **PASS** — Giữ nguyên đầy đủ 8 phase trên VPS.

---

## 4. Kiểm tra CI/CD Branch Flow

Chuỗi thực thi hiện tại khớp tuyệt đối với mô hình bắt buộc:
`devops-phuong → CI → PR → master → CI → nghiệm thu Sprint → main → CI PASS → Release GHCR → Deploy VPS`

---

## 5. Kết luận cho 5 câu hỏi bắt buộc

1. **Có thể push branch `devops-phuong` chưa?**
   - **CÓ.** Toàn bộ lỗi SonarQube `S7631` và các đường bypass CI (`workflow_dispatch`, `push: tags`, `IMAGE_TAG=latest`, `IMAGE_TAG:-latest`) đã được xử lý xong trong working tree. Bạn có thể commit và push lên `origin/devops-phuong`.
2. **Có thể merge PR #71 vào `master` chưa?**
   - Sau khi commit và push nhánh `devops-phuong`, chờ GitHub Actions chạy pass 4 job CI và **SonarQube Cloud Quality Gate** chuyển sang **PASS (Security Rating A)** thì **đủ điều kiện merge PR #71 vào `master`**.
3. **Có thể merge `master` vào `main` sau khi nghiệm thu Sprint chưa?**
   - **CÓ**, sau khi PR #71 đã được merge vào `master`, CI trên `master` chạy PASS, nhóm hoàn tất nghiệm thu Sprint và đã bật các thiết lập bảo vệ trên GitHub UI.
4. **Có đường nào bypass CI để Release hoặc Deploy không?**
   - **KHÔNG.** Cả `release.yml` và `deploy.yml` hiện chỉ kích hoạt qua chuỗi `workflow_run` bắt buộc `Continuous Integration (CI)` (`event == 'push'`, `head_branch == 'main'`, `conclusion == 'success'`) → `Release and Publish Docker Images` (`conclusion == 'success'`, `head_branch == 'main'`) → `Deploy to Production VPS`.
5. **Còn những việc nào bắt buộc phải làm trên GitHub UI?**
   - **Settings → Branches (hoặc Rulesets)**: Bật Branch Protection cho `master` và `main` (bắt buộc Pull Request, bắt buộc pass đủ 4 status checks của `ci.yml` và **SonarQube Cloud Code Analysis**, cấm force-push).
   - **Settings → Environments → `production`**: Bật **Required reviewers** (phê duyệt thủ công trước khi chạy `deploy-to-vps`) và giới hạn **Deployment branches** chỉ cho phép nhánh `main`.
