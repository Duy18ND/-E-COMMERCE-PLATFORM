# SHOPMART – SONARQUBE GITHUB ACTIONS SECURITY FIX REPORT

- **Branch**: `devops-phuong` (PR #71: `devops-phuong` → `master`)
- **Rule bị cảnh báo**: SonarQube Cloud `githubactions:S7631` — *"Make sure that no untrusted code is executed from a fork."* (Security / High / Vulnerability / Major)
- **Mục tiêu**: Khắc phục triệt để lỗ hổng checkout code từ event `workflow_run` trong môi trường có quyền cao/secrets (không tắt rule, không chỉnh Quality Gate).

---

## 1. Nguyên nhân của từng Issue

### Issue 1: `.github/workflows/deploy.yml` (Line 143)
- **Nguyên nhân thực tế**:
  - Workflow `deploy.yml` có trigger `on: workflow_run` (chạy trong ngữ cảnh nhánh mặc định với quyền truy cập `secrets.VPS_SSH_KEY`, `secrets.VPS_HOST`, `secrets.GHCR_TOKEN`).
  - Ở job `preflight-check`, biến `github.event.workflow_run.head_sha` được gán vào `CHECKOUT_REF` và xuất ra job output `needs.preflight-check.outputs.checkout_ref` **mà chưa kiểm tra**:
    1. `workflow_run.event` không phải `pull_request` / `pull_request_target`,
    2. `workflow_run.head_repository.full_name == github.repository`,
    3. `workflow_run.head_sha` thực sự là commit thuộc lịch sử `origin/main` (`git merge-base --is-ancestor`).
  - Sau đó, tại dòng 143 của `deploy.yml`, `actions/checkout` nhận trực tiếp `ref: ${{ needs.preflight-check.outputs.checkout_ref }}`.
  - Về mặt phân tích tĩnh (SonarQube taint analysis `S7631`) cũng như thực tế bảo mật GitHub Actions: truyền một `ref:` có nguồn gốc từ `github.event.workflow_run.*` vào `actions/checkout` trong một workflow có secrets cho phép GitHub Actions fetch và checkout một commit thuộc PR từ fork (nếu workflow nguồn bị kích hoạt từ PR có nhánh trùng tên `main`), dẫn đến nguy cơ thực thi script/config độc hại với SSH key của VPS production.

### Issue 2: `.github/workflows/release.yml` (Line 124)
- **Nguyên nhân thực tế**:
  - Workflow `release.yml` có trigger `on: workflow_run` sau `"Continuous Integration (CI)"` (vốn có `on: pull_request: branches: [ master, main ]`) và có quyền `packages: write` cùng `secrets.GITHUB_TOKEN`.
  - Bước `resolve-ref` lấy `github.event.workflow_run.head_sha` gán vào `steps.resolve-ref.outputs.checkout_ref` mà không kiểm tra `workflow_run.event == 'push'` và `workflow_run.head_repository.full_name == github.repository`.
  - Tại dòng 124 của `release.yml`, `actions/checkout` nhận `ref: ${{ steps.resolve-ref.outputs.checkout_ref }}`, và ngay sau đó `docker/build-push-action` thực thi `Dockerfile` (`RUN ./gradlew ...`, `RUN npm ci`, `RUN npm run build`). Nếu kẻ tấn công mở PR từ fork có nhánh tên `main` vào `main`, `ci.yml` hoàn thành sẽ kích hoạt `release.yml`, checkout code của fork tại dòng 124 và thực thi lệnh trong `Dockerfile` với quyền `packages: write` (lỗ hổng *Pwn Request*).
  - Ngoài ra, trigger `push: tags: ['v*.*.*']` trước đó cũng chưa kiểm tra commit của tag có thuộc lịch sử `main` hay không.

---

## 2. Code trước và sau khi sửa

### A. `.github/workflows/release.yml`

**Trước khi sửa (trích đoạn dòng 25–147):**
```yaml
  build-and-push:
    name: Build & Push ${{ matrix.service.name }}
    runs-on: ubuntu-latest
    if: ${{ github.event_name != 'workflow_run' || (github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.head_branch == 'main') }}
...
      - name: Resolve Exact Release Commit & Branch Policy
        id: resolve-ref
        env:
          EVENT_NAME: ${{ github.event_name }}
          WORKFLOW_RUN_BRANCH: ${{ github.event.workflow_run.head_branch }}
          WORKFLOW_RUN_SHA: ${{ github.event.workflow_run.head_sha }}
...
          if [ "$EVENT_NAME" = "workflow_run" ]; then
            ...
            CHECKOUT_REF="$WORKFLOW_RUN_SHA"
            EXPECTED_SHA="$WORKFLOW_RUN_SHA"
          ...
          echo "checkout_ref=${CHECKOUT_REF}" >> "$GITHUB_OUTPUT"

      - name: Checkout Exact Release Commit (Full History for 7-Char Prefix Uniqueness)
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          ref: ${{ steps.resolve-ref.outputs.checkout_ref }}
          fetch-depth: 0
```

**Sau khi sửa:**
```yaml
  build-and-push:
    name: Build & Push ${{ matrix.service.name }}
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    if: >-
      (github.event_name == 'workflow_run' &&
       github.event.workflow_run.name == 'Continuous Integration (CI)' &&
       github.event.workflow_run.conclusion == 'success' &&
       github.event.workflow_run.head_branch == 'main' &&
       github.event.workflow_run.event == 'push' &&
       github.event.workflow_run.head_repository.full_name == github.repository) ||
      (github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')) ||
      (github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main')
...
    steps:
      - name: Checkout Trusted Repository History
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0

      - name: Resolve & Verify Exact Release Commit in Trusted Main History
        id: resolve-ref
        ...
          MAIN_HEAD=$(git rev-parse --verify "refs/remotes/origin/main^{commit}" 2>/dev/null || git rev-parse --verify "refs/heads/main^{commit}" 2>/dev/null || true)
          RESOLVED_COMMIT=$(git rev-parse --verify "${EXPECTED_SHA}^{commit}" 2>/dev/null || true)
          if [ -z "$MAIN_HEAD" ] || [ -z "$RESOLVED_COMMIT" ] || [ "$RESOLVED_COMMIT" != "$EXPECTED_SHA" ]; then
            echo "::error ::Target commit '${EXPECTED_SHA}' could not be resolved in trusted repository history."
            exit 1
          fi
          if ! git merge-base --is-ancestor "$EXPECTED_SHA" "$MAIN_HEAD"; then
            echo "::error ::Commit '${EXPECTED_SHA}' does not belong to 'main' branch history. Refusing to release non-main or untrusted code."
            exit 1
          fi
          if [ "$MAIN_HEAD" != "$EXPECTED_SHA" ]; then
            git checkout --detach "$EXPECTED_SHA"
          fi
```

---

### B. `.github/workflows/deploy.yml`

**Trước khi sửa (trích đoạn dòng 27–146):**
```yaml
  preflight-check:
    name: Validate Deployment Prerequisites
    runs-on: ubuntu-latest
    if: ${{ github.event_name == 'workflow_dispatch' || (github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.head_branch == 'main') }}
    outputs:
      configured: ${{ steps.check-secrets.outputs.configured }}
      deploy_tag: ${{ steps.resolve-tag.outputs.tag }}
      checkout_ref: ${{ steps.resolve-tag.outputs.checkout_ref }}
      repo_owner: ${{ steps.repo-owner.outputs.owner_lc }}
    steps:
      - name: Checkout Repository History (for Manual Dispatch SHA Verification)
        if: ${{ github.event_name == 'workflow_dispatch' }}
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0
...
  deploy-to-vps:
    ...
    steps:
      - name: Checkout Exact Target Commit
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          ref: ${{ needs.preflight-check.outputs.checkout_ref }}
```

**Sau khi sửa:**
```yaml
  preflight-check:
    name: Validate Deployment Prerequisites
    runs-on: ubuntu-latest
    permissions:
      contents: read
    if: >-
      (github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main') ||
      (github.event_name == 'workflow_run' &&
       github.event.workflow_run.name == 'Release and Publish Docker Images' &&
       github.event.workflow_run.conclusion == 'success' &&
       github.event.workflow_run.head_branch == 'main' &&
       github.event.workflow_run.event != 'pull_request' &&
       github.event.workflow_run.event != 'pull_request_target' &&
       github.event.workflow_run.head_repository.full_name == github.repository)
    outputs:
      configured: ${{ steps.check-secrets.outputs.configured }}
      deploy_tag: ${{ steps.resolve-tag.outputs.tag }}
      repo_owner: ${{ steps.repo-owner.outputs.owner_lc }}
    steps:
      - name: Checkout Trusted Repository History
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0
...
  deploy-to-vps:
    name: Deploy to Production VPS
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: read
    ...
    steps:
      - name: Checkout Trusted Repository History
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          fetch-depth: 0

      - name: Verify & Align Trusted Main Commit for Deployment
        env:
          DEPLOY_TAG: ${{ needs.preflight-check.outputs.deploy_tag }}
        run: |
          if ! [[ "$DEPLOY_TAG" =~ ^sha-[0-9a-fA-F]{7}$ ]]; then
            echo "::error ::Invalid deploy_tag '${DEPLOY_TAG}'."
            exit 1
          fi
          SHORT_SHA="${DEPLOY_TAG#sha-}"
          MAIN_HEAD=$(git rev-parse --verify "refs/remotes/origin/main^{commit}" 2>/dev/null || git rev-parse --verify "refs/heads/main^{commit}" 2>/dev/null || true)
          TARGET_COMMIT=$(git rev-parse --verify "${SHORT_SHA}^{commit}" 2>/dev/null || true)
          if [ -z "$MAIN_HEAD" ] || [ -z "$TARGET_COMMIT" ] || [ "${TARGET_COMMIT:0:7}" != "$SHORT_SHA" ]; then
            echo "::error ::Could not resolve unique commit for '${DEPLOY_TAG}' in trusted repository."
            exit 1
          fi
          if ! git merge-base --is-ancestor "$TARGET_COMMIT" "$MAIN_HEAD" 2>/dev/null; then
            echo "::error ::Commit '${TARGET_COMMIT}' (${DEPLOY_TAG}) is not in 'main' branch history."
            exit 1
          fi
          if [ "$MAIN_HEAD" != "$TARGET_COMMIT" ]; then
            git checkout --detach "$TARGET_COMMIT"
          fi
```

---

## 3. Những file đã thay đổi

1. **[`.github/workflows/release.yml`](../.github/workflows/release.yml)**
2. **[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)**

---

## 4. Cách xử lý để không thực thi code từ fork

1. **Loại bỏ hoàn toàn tham số `ref:` động/tainted khỏi `actions/checkout`**:
   - Mọi bước `actions/checkout` trong `release.yml` và `deploy.yml` chỉ dùng `with: fetch-depth: 0` (checkout mặc định của repository gốc, không truyền bất kỳ biến nào từ `github.event.workflow_run.*` hay output của step/job vào `actions/checkout`).
2. **Chặn sự kiện từ PR / Fork ngay ở điều kiện `if:` của job và trong shell**:
   - `release.yml`: bắt buộc `github.event.workflow_run.name == 'Continuous Integration (CI)'`, `conclusion == 'success'`, `head_branch == 'main'`, `event == 'push'`, và `head_repository.full_name == github.repository`.
   - `deploy.yml`: bắt buộc `github.event.workflow_run.name == 'Release and Publish Docker Images'`, `conclusion == 'success'`, `head_branch == 'main'`, `event != 'pull_request'`, `event != 'pull_request_target'`, và `head_repository.full_name == github.repository`.
3. **Xác minh mật mã học lịch sử commit trên `origin/main` trước khi sử dụng**:
   - Cả `release.yml` (cho cả 3 trigger `workflow_run`, `workflow_dispatch`, `push` tag `v*.*.*`) và `deploy.yml` (trong cả `preflight-check` và `deploy-to-vps`) đều kiểm tra `git merge-base --is-ancestor "$COMMIT_SHA" "$MAIN_HEAD"` với `MAIN_HEAD` là `refs/remotes/origin/main^{commit}`.
   - Chỉ khi commit được chứng minh thuộc nhánh `main` của repository gốc và có prefix 7 ký tự duy nhất thì mới `git checkout --detach` tới commit đó.

---

## 5. Cách bảo vệ secrets và permissions

- **Nguyên tắc quyền tối thiểu (Least Privilege)**:
  - Top-level `permissions` của cả `ci.yml`, `release.yml`, `deploy.yml` đều chỉ là `contents: read`.
  - Quyền `packages: write` chỉ cấp riêng ở mức job `build-and-push` trong `release.yml`.
  - Quyền `packages: read` và SSH secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_FINGERPRINT`) chỉ cấp cho job `deploy-to-vps` (gắn với `environment: production`) trong `deploy.yml`.
- **Chống Shell Injection (`S7630`)**:
  - Không có bất kỳ biểu thức `${{ github.event... }}` hay `${{ inputs... }}` nào được nối trực tiếp vào khối `run:` hoặc `script:`. Toàn bộ đều truyền qua `env:` và kiểm tra bằng biểu thức chính quy (`^[0-9a-fA-F]{40}$`, `^sha-[0-9a-fA-F]{7}$`, `^[a-z0-9._-]+$`).
- **Đồng thời & Bất biến**:
  - Đã thêm `concurrency` cho `release.yml` và gỡ tag `latest` khỏi `release.yml` để chỉ phát hành tag bất biến.

---

## 6. Kết quả kiểm thử

| Hạng mục kiểm tra | Kết quả | Chi tiết |
| --- | --- | --- |
| `git diff --check` | **PASS** | Exit code `0`, không có lỗi khoảng trắng hay conflict marker. |
| Kiểm tra tĩnh `actions/checkout` trong `ci.yml`, `release.yml`, `deploy.yml` | **PASS** | Không còn bất kỳ `actions/checkout` nào dùng `with: ref: ${{ ... }}`. |
| Kiểm tra chống Shell Injection (`${{ ... }}` trong `run:`/`script:`) | **PASS** | Toàn bộ dữ liệu event/input được truyền qua `env:` và kiểm tra regex chặt chẽ. |
| Kiểm tra phân quyền `permissions:` | **PASS** | Top-level `contents: read`; `packages: write` chỉ ở job release; `packages: read` + SSH key chỉ ở job deploy. |
| Kiểm tra YAML / `actionlint` / `bash -n` bằng tool thực thi local | **BLOCKED** | Môi trường Windows local thiếu `pyyaml`/`ruby`/`actionlint` và WSL/Git Bash bị chặn bởi sandbox OS (`0xC0000022`). |

---

## 7. Những rủi ro còn lại

1. **Chưa chạy lại SonarQube Cloud scan thực tế**: Vì theo yêu cầu chưa commit và chưa push lên GitHub nên SonarQube Cloud trên PR #71 chỉ cập nhật sang Quality Gate **PASS (Rating A)** sau khi bạn kiểm tra, commit và push nhánh `devops-phuong`.
2. **Thiết lập trên GitHub UI (`NOT VERIFIED`)**: Branch Protection cho `master`/`main` và Required Reviewers trên GitHub Environment `production` cần được xác nhận trực tiếp trên giao diện GitHub.

---

## 8. Các bước cần thực hiện trên GitHub

1. Kiểm tra lại `git diff` tại máy local, sau đó `git add .github/workflows/release.yml .github/workflows/deploy.yml` (cùng các báo cáo nếu muốn), `git commit` và `git push origin devops-phuong`.
2. Mở PR #71 (`devops-phuong` → `master`), chờ **SonarQube Cloud** và 4 job của **Continuous Integration (CI)** chạy lại; xác nhận **Security Rating on New Code = A** và Quality Gate **PASS**.
3. Trong **Settings → Branches** (hoặc Rulesets): bật Branch Protection cho `master` và `main` yêu cầu pass 4 job CI và SonarQube Quality Gate trước khi merge.
4. Trong **Settings → Environments → `production`**: bật **Required reviewers** để phê duyệt thủ công trước khi `deploy-to-vps` thực thi trên VPS.
