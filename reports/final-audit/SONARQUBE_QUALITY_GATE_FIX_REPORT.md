# BÁO CÁO XỬ LÝ LỖI BẢO MẬT SONARQUBE TRONG GITHUB ACTIONS WORKFLOWS (`SONARQUBE_QUALITY_GATE_FIX_REPORT.md`)

- **Thời điểm thực hiện:** 2026-11-16 08:40:00 (GMT+7)
- **Repository:** `C:\IT209\-E-COMMERCE-PLATFORM`
- **Branch làm việc:** `devops-phuong` (Base commit: `c463ad2`)
- **Rule SonarQube cảnh báo:** `githubactions:S7637` — *"Use full commit SHA hash for this dependency."*
  - **File:** `.github/workflows/deploy.yml`
  - **Dòng:** `90` (`uses: appleboy/scp-action@v0.1.7`) và dòng `100` (`uses: appleboy/ssh-action@v1.2.0`)
  - **Severity:** `HIGH`
  - **Quality:** `Security`
  - **Status:** `Open`

---

## 1. NGUYÊN NHÂN LỖI & ACTION BỊ CẢNH BÁO

### 1.1. Vị trí lỗi chính do SonarQube phát hiện
- Trong file [.github/workflows/deploy.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/deploy.yml#L86-L100) tại commit `c463ad2`:
  - **Dòng 90:** `uses: appleboy/scp-action@v0.1.7`
  - **Dòng 100:** `uses: appleboy/ssh-action@v1.2.0`
  - **Dòng 87:** `uses: actions/checkout@v4`
- **Nguyên nhân gốc (Root Cause):**
  - Trong GitHub Actions, việc tham chiếu một Action (đặc biệt là Third-party Action như `appleboy/scp-action` và `appleboy/ssh-action` có quyền truy cập trực tiếp `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER`, `GHCR_TOKEN`) bằng **Git tag khả biến (`@v0.1.7`, `@v1.2.0`, `@v4`, `@v3`, ...)** tạo ra lỗ hổng **Supply Chain Attack (Tấn công chuỗi cung ứng)**.
  - Git tag không bất biến (mutable): nếu repository của Action bên thứ ba bị chiếm quyền điều khiển, kẻ tấn công có thể trỏ lại tag `v0.1.7` hoặc `v1.2.0` sang một commit chứa mã độc để trích xuất toàn bộ GitHub Secrets của dự án trong quá trình chạy workflow.
  - Do đó, SonarQube Security Rule (`githubactions:S7637`) yêu cầu bắt buộc phải ghim cố định (pin) bằng **full 40-character commit SHA hash** kèm comment phiên bản.

### 1.2. Rà soát toàn bộ các dòng `uses:` trong `.github/workflows/`
Kiểm tra toàn bộ 3 file workflow trong `.github/workflows/`:
1. [.github/workflows/deploy.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/deploy.yml) — 3 dòng `uses:` (dòng 87, 90, 100).
2. [.github/workflows/ci.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/ci.yml) — 10 dòng `uses:` (dòng 25, 28, 50, 67, 70, 73, 79, 94, 110, 171).
3. [.github/workflows/release.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/release.yml) — 5 dòng `uses:` (dòng 61, 69, 72, 80, 90).

Tổng cộng phát hiện **18 vị trí `uses:`** (thuộc **11 GitHub Actions**) đang tham chiếu bằng tag ngắn.

---

## 2. BẢNG ĐỐI CHIẾU SHA TRƯỚC VÀ SAU KHI SỬA & NGUỒN XÁC MINH

Toàn bộ các mã `commit SHA` 40 ký tự dưới đây được xác minh trực tiếp từ máy chủ Git chính thức của GitHub bằng lệnh `git ls-remote --tags https://github.com/<owner>/<repo>.git refs/tags/<tag> refs/tags/<tag>^{}` (đối với annotated tag như `gradle/actions@v4`, lấy commit SHA thực sau khi giải tham chiếu `refs/tags/v4^{}`):

| STT | File Workflow | Dòng | Action | Tham chiếu trước khi sửa | Tham chiếu sau khi sửa (Full 40-char Commit SHA + Comment) | Nguồn xác minh chính thức |
|---:|---|---:|---|---|---|---|
| **1** | [deploy.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/deploy.yml#L90) | **90** | `appleboy/scp-action` | `appleboy/scp-action@v0.1.7` | `appleboy/scp-action@917f8b81dfc1ccd331fef9e2d61bdc6c8be94634 # v0.1.7` | `git ls-remote --tags https://github.com/appleboy/scp-action.git refs/tags/v0.1.7` |
| **2** | [deploy.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/deploy.yml#L100) | **100** | `appleboy/ssh-action` | `appleboy/ssh-action@v1.2.0` | `appleboy/ssh-action@7eaf76671a0d7eec5d98ee897acda4f968735a17 # v1.2.0` | `git ls-remote --tags https://github.com/appleboy/ssh-action.git refs/tags/v1.2.0` |
| **3** | [deploy.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/deploy.yml#L87) | **87** | `actions/checkout` | `actions/checkout@v4` | `actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4` | `git ls-remote --tags https://github.com/actions/checkout.git refs/tags/v4` |
| **4** | [ci.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/ci.yml#L25) | **25, 67, 110, 171** | `actions/checkout` | `actions/checkout@v4` | `actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4` | `git ls-remote --tags https://github.com/actions/checkout.git refs/tags/v4` |
| **5** | [ci.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/ci.yml#L28) | **28** | `actions/setup-node` | `actions/setup-node@v4` | `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4` | `git ls-remote --tags https://github.com/actions/setup-node.git refs/tags/v4` |
| **6** | [ci.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/ci.yml#L50) | **50, 94** | `actions/upload-artifact` | `actions/upload-artifact@v4` | `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4` | `git ls-remote --tags https://github.com/actions/upload-artifact.git refs/tags/v4` |
| **7** | [ci.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/ci.yml#L70) | **70** | `gradle/actions/wrapper-validation` | `gradle/actions/wrapper-validation@v4` | `gradle/actions/wrapper-validation@ed408507eac070d1f99cc633dbcf757c94c7933a # v4` | `git ls-remote --tags https://github.com/gradle/actions.git refs/tags/v4^{}` |
| **8** | [ci.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/ci.yml#L73) | **73** | `actions/setup-java` | `actions/setup-java@v4` | `actions/setup-java@cf277c60eb25467037889841efdb72551f06f6c3 # v4` | `git ls-remote --tags https://github.com/actions/setup-java.git refs/tags/v4` |
| **9** | [ci.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/ci.yml#L79) | **79** | `gradle/actions/setup-gradle` | `gradle/actions/setup-gradle@v4` | `gradle/actions/setup-gradle@ed408507eac070d1f99cc633dbcf757c94c7933a # v4` | `git ls-remote --tags https://github.com/gradle/actions.git refs/tags/v4^{}` |
| **10** | [release.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/release.yml#L61) | **61** | `actions/checkout` | `actions/checkout@v4` | `actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4` | `git ls-remote --tags https://github.com/actions/checkout.git refs/tags/v4` |
| **11** | [release.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/release.yml#L69) | **69** | `docker/setup-buildx-action` | `docker/setup-buildx-action@v3` | `docker/setup-buildx-action@8d2750c68a42422c14e847fe6c8ac0403b4cbd6f # v3` | `git ls-remote --tags https://github.com/docker/setup-buildx-action.git refs/tags/v3` |
| **12** | [release.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/release.yml#L72) | **72** | `docker/login-action` | `docker/login-action@v3` | `docker/login-action@c94ce9fb468520275223c153574b00df6fe4bcc9 # v3` | `git ls-remote --tags https://github.com/docker/login-action.git refs/tags/v3` |
| **13** | [release.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/release.yml#L80) | **80** | `docker/metadata-action` | `docker/metadata-action@v5` | `docker/metadata-action@c299e40c65443455700f0fdfc63efafe5b349051 # v5` | `git ls-remote --tags https://github.com/docker/metadata-action.git refs/tags/v5` |
| **14** | [release.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/release.yml#L90) | **90** | `docker/build-push-action` | `docker/build-push-action@v6` | `docker/build-push-action@10e90e3645eae34f1e60eeb005ba3a3d33f178e8 # v6` | `git ls-remote --tags https://github.com/docker/build-push-action.git refs/tags/v6` |

---

## 3. CÁC FILE ĐÃ THAY ĐỔI

1. [.github/workflows/deploy.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/deploy.yml) — Chỉ thay đổi đúng 3 dòng `uses:` tại dòng 87 (`actions/checkout`), dòng 90 (`appleboy/scp-action`) và dòng 100 (`appleboy/ssh-action`); giữ nguyên 100% logic deploy, SSH, Docker, GHCR, secrets và biến môi trường.
2. [.github/workflows/ci.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/ci.yml) — Thay thế 10 dòng `uses:` sang full 40-char commit SHA kèm comment `# v4`.
3. [.github/workflows/release.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/.github/workflows/release.yml) — Thay thế 5 dòng `uses:` sang full 40-char commit SHA kèm comment `# v3`, `# v4`, `# v5`, `# v6`.
4. [reports/final-audit/SONARQUBE_QUALITY_GATE_FIX_REPORT.md](file:///c:/IT209/-E-COMMERCE-PLATFORM/reports/final-audit/SONARQUBE_QUALITY_GATE_FIX_REPORT.md) — Báo cáo chi tiết nguyên nhân, bảng SHA đối chiếu và bằng chứng kiểm tra.

---

## 4. KẾT QUẢ KIỂM TRA SAU SỬA & LƯU Ý VỀ SONARQUBE QUALITY GATE

1. **Kiểm tra tự động toàn bộ 18 dòng `uses:` trên 3 file workflow:**
   - Mọi dòng `uses:` trong `.github/workflows/deploy.yml`, `.github/workflows/ci.yml` và `.github/workflows/release.yml` đều khớp biểu thức chính quy `^[A-Za-z0-9_.\-\/]+@[0-9a-f]{40}\s+#\s*v[0-9.]+$` (`18/18 PASS`).
2. **Kiểm tra `git diff HEAD -- .github/workflows/deploy.yml`:**
   - Xác nhận chỉ thay đổi đúng 3 dòng `uses:` (dòng 87, 90, 100) so với `HEAD` (`c463ad2`), không thay đổi bất kỳ logic deploy/SSH/env nào khác.
3. **Lưu ý minh bạch về SonarQube Security Rating:**
   - Mã nguồn trong `.github/workflows/` đã khắc phục triệt để cảnh báo `Use full commit SHA hash for this dependency` ở cả `.github/workflows/deploy.yml` (dòng 90, 100) lẫn `ci.yml` và `release.yml`.
   - Tuy nhiên, việc sửa file tại local chưa tự động cập nhật kết quả trên máy chủ SonarQube: cần commit/push và chạy lại **SonarQube Analysis / Quality Gate scan** để hệ thống SonarQube xác nhận đóng issue và cập nhật **Security Rating A**.
