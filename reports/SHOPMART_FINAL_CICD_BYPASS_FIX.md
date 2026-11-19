# SHOPMART – FINAL CI/CD BYPASS FIX REPORT

- **Ngày thực hiện**: 2026-11-18
- **Branch**: `devops-phuong` (PR #71: `devops-phuong` → `master`)
- **Mục tiêu**: Xóa bỏ hoàn toàn các trigger phụ có thể bypass CI trong `release.yml` và `deploy.yml`, khóa chặt chính sách `IMAGE_TAG` bất biến trong `backend/.env.prod.example` và `backend/docker-compose.prod.yml`, đồng thời giữ nguyên cơ chế khắc phục lỗi SonarQube `S7631` và bảo vệ VPS.

---

## 1. Các trigger đã xóa

### A. Trong `.github/workflows/release.yml`
- Đã **xóa** trigger `push: tags: [ 'v*.*.*' ]`.
- Đã **xóa** trigger `workflow_dispatch` (cùng input `image_tag`).
- Đã **xóa** các nhánh xử lý `workflow_dispatch` và `push` tag trong step `resolve-ref` và gỡ bỏ `type=ref,event=tag` / `custom_tag` trong `docker/metadata-action`.
- **Chỉ giữ lại duy nhất**:
  ```yaml
  on:
    workflow_run:
      workflows: ["Continuous Integration (CI)"]
      types: [ completed ]
      branches: [ main ]
  ```

### B. Trong `.github/workflows/deploy.yml`
- Đã **xóa** trigger `workflow_dispatch` (cùng input `image_tag`).
- Đã **xóa** nhánh xử lý `workflow_dispatch` trong job `preflight-check`.
- **Chỉ giữ lại duy nhất**:
  ```yaml
  on:
    workflow_run:
      workflows: ["Release and Publish Docker Images"]
      types: [ completed ]
      branches: [ main ]
  ```

---

## 2. Các điều kiện bảo mật đã giữ lại

1. **Chống thực thi code từ fork (SonarQube `githubactions:S7631`)**:
   - Mọi bước `actions/checkout` trong `release.yml` và `deploy.yml` chỉ dùng `with: fetch-depth: 0` (không truyền tham số `ref:` động).
   - Xác minh `workflow_run.head_repository.full_name == github.repository`, `workflow_run.head_branch == 'main'`, `workflow_run.conclusion == 'success'`, và chặn `pull_request` / `pull_request_target` (riêng `release.yml` bắt buộc `workflow_run.event == 'push'`).
   - Xác minh mật mã học commit SHA thuộc lịch sử `refs/remotes/origin/main^{commit}` bằng `git merge-base --is-ancestor` và kiểm tra tính duy nhất của prefix 7 ký tự trước khi `git checkout --detach`.
2. **Phân quyền tối thiểu & Bảo vệ Secrets**:
   - Top-level `permissions: contents: read` ở cả 3 workflow.
   - `packages: write` chỉ cấp cho job `build-and-push` trong `release.yml`.
   - `packages: read` và SSH secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_FINGERPRINT`) chỉ cấp cho job `deploy-to-vps` (thuộc `environment: production`) trong `deploy.yml`.
3. **Bảo vệ VPS & Rollback**:
   - Giữ nguyên toàn bộ 8 phase trong `deploy.yml`: kiểm tra `.env` `IMAGE_TAG` nhất quán trên cả 7 container đang chạy, backup MySQL bắt buộc + `gzip -t`, pin `shopmart-rollback/*:pre-deploy`, recreate có chọn lọc `--no-deps --no-build` theo `SERVICES_TO_RECREATE` (không chạm `mysql`, `redis`, `kafka`, `zookeeper`), xử lý riêng `nginx`, healthcheck + HTTP smoke test, và rollback tự động toàn diện.

---

## 3. Các dòng `IMAGE_TAG` đã sửa

1. **[`backend/.env.prod.example`](../backend/.env.prod.example) (dòng 33–36)**:
   - Trước:
     ```dotenv
     # 7. GHCR Container Registry Configuration
     IMAGE_REGISTRY=ghcr.io
     IMAGE_REPO_OWNER=duy18nd
     IMAGE_TAG=latest
     ```
   - Sau:
     ```dotenv
     # 7. GHCR Container Registry Configuration (IMAGE_TAG phải là tag SHA bất biến; sha-0000000 chỉ là giá trị mẫu)
     IMAGE_REGISTRY=ghcr.io
     IMAGE_REPO_OWNER=duy18nd
     IMAGE_TAG=sha-0000000
     ```
2. **[`backend/docker-compose.prod.yml`](../backend/docker-compose.prod.yml) (7 dòng: 144, 177, 218, 257, 291, 324, 366)**:
   - Đã thay toàn bộ 7 vị trí `${IMAGE_TAG:-latest}` của `discovery-server`, `auth-service`, `product-service`, `order-service`, `payment-service`, `api-gateway`, `frontend` bằng:
     `${IMAGE_TAG:?IMAGE_TAG must be set to an immutable SHA tag}`
3. **[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (dòng 137, 144)**:
   - Cập nhật bước `Validate Production Docker Compose` và `Verify Production Port Hardening` truyền `--env-file backend/.env.prod.example` khi chạy `docker compose -f backend/docker-compose.prod.yml config` để tương thích với biến bắt buộc `${IMAGE_TAG:?...}`.

---

## 4. Kết quả kiểm thử

| Kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `git diff --check` | **PASS** | Exit code `0`, không có lỗi whitespace hay conflict marker. |
| `docker compose -f backend/docker-compose.yml config --quiet` | **PASS** | Exit code `0`. |
| `docker compose --env-file backend/.env.prod.example -f backend/docker-compose.prod.yml config --quiet` | **PASS** | Exit code `0` (`COMPOSE_VALID_OK`). |
| Quét `IMAGE_TAG:-latest`, `IMAGE_TAG=latest`, `workflow_dispatch`, `push: tags` | **PASS** | `0` kết quả khớp trong `docker-compose.prod.yml`, `.env.prod.example`, `release.yml`, `deploy.yml`. |
| Kiểm tra tĩnh điều kiện SHA, `actions/checkout`, và `permissions` | **PASS** | Không còn `with: ref:` động; chỉ dùng `workflow_run` khép kín; phân quyền tối thiểu theo từng job. |
| Parser YAML / `bash -n` cục bộ | **BLOCKED** | Môi trường Windows local không cài `pyyaml`/`ruby`/`actionlint` và sandbox chặn WSL/MSYS (`0xC0000022`). |

---

## 5. Danh sách file đã thay đổi (`git status --short`)

### Modified (`M`):
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/release.yml`
- `backend/.env.prod.example`
- `backend/docker-compose.prod.yml`

### Untracked (`??`):
- `reports/SHOPMART_CICD_BRANCH_STRATEGY_AUDIT.md`
- `reports/SHOPMART_SONARQUBE_GITHUB_ACTIONS_SECURITY_FIX.md`
- `reports/SHOPMART_FINAL_CICD_SECURITY_REVIEW.md`
- `reports/SHOPMART_FINAL_CICD_BYPASS_FIX.md`
- `reports/presentation/`

---

## 6. Rủi ro còn lại

1. **Chưa chạy lại SonarQube Cloud và GitHub Actions trên PR #71**: Cần commit và push các thay đổi trong working tree lên `origin/devops-phuong` để GitHub Actions và SonarQube Cloud xác nhận trực tiếp trên PR #71.
2. **Cấu hình trên GitHub UI (`NOT VERIFIED` từ local)**: Cần bật Branch Protection cho `master`/`main` và Required Reviewers cho GitHub Environment `production` trên giao diện GitHub.

---

## 7. Kết luận

**ĐÃ SẴN SÀNG ĐỂ COMMIT/PUSH LÊN `devops-phuong` VÀ CHỜ GITHUB ACTIONS + SONARQUBE CLOUD KIỂM TRA TRÊN PR #71.**
