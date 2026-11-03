# HƯỚNG DẪN CẤU HÌNH GITHUB ACTIONS CI/CD – SHOPMART PLATFORM

Tài liệu này hướng dẫn chi tiết cách thiết lập GitHub Repository Secrets, GitHub Environments, GitHub Container Registry (GHCR) và Branch Protection Rules để kích hoạt hệ thống CI/CD tự động cho ShopMart.

---

## 1. TỔNG QUAN HỆ THỐNG CI/CD

Quy trình tự động hóa ShopMart được thiết kế gồm 3 workflow độc lập theo nguyên tắc Least Privilege:

1. **`.github/workflows/ci.yml` (Continuous Integration):**
   - Kích hoạt khi tạo Pull Request vào `master`, khi push vào `devops-phuong`, hoặc khi chạy thủ công (`workflow_dispatch`).
   - Thực thi song song:
     - **Frontend CI:** Node 20, `npm ci`, `npm run lint`, `npm run test`, `npm run build`.
     - **Backend CI:** Java 21 Temurin, Gradle Wrapper validation, `gradle test`, `gradle bootJar`.
     - **Docker Validation:** Kiểm tra 7 Dockerfiles, cú pháp Compose (`dev` và `prod`), bind mounts, và chặn việc expose cổng nội bộ ra Internet.
     - **Security Checks:** Quét secret rò rỉ, kiểm tra DTO chống leo thang đặc quyền `ROLE_ADMIN`, xác minh `ddl-auto: validate`.

2. **`.github/workflows/release.yml` (Publish Images to GHCR):**
   - Tự động kích hoạt khi merge commit vào `master` hoặc khi tạo tag phiên bản `v*.*.*`.
   - Build multi-arch Docker images bằng Docker BuildKit và push lên GitHub Container Registry (`ghcr.io/duy18nd/<service>`).
   - Gắn tag theo commit SHA (`sha-xxxxxxx`), tag `latest`, và lưu build cache qua GitHub Actions Cache (`type=gha`).

3. **`.github/workflows/deploy.yml` (Continuous Deployment to VPS):**
   - Tự động kích hoạt sau khi `release.yml` hoàn tất thành công trên `master`, hoặc chạy thủ công qua `workflow_dispatch`.
   - Sử dụng GitHub Environment `production` (có hỗ trợ Required Reviewers).
   - Kết nối an toàn đến VPS qua SSH key, tự động sao lưu CSDL MySQL trước khi cập nhật (`mysqldump`), kéo image GHCR mới, khởi chạy container, và thực hiện Healthcheck/Smoke Test đa tầng. Nếu phát hiện lỗi sẽ tự động rollback về phiên bản trước.

---

## 2. CẤU HÌNH GITHUB REPOSITORY SECRETS

Truy cập: **GitHub Repository $\rightarrow$ Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions $\rightarrow$ New repository secret**

Thêm các secrets sau:

| Secret Name | Bắt buộc | Mô tả | Giá trị mẫu |
|---|:---:|---|---|
| `VPS_HOST` | **Có** | Địa chỉ IP công khai của máy chủ VPS Ubuntu | `103.xxx.xxx.xxx` hoặc `vps.shopmart.vn` |
| `VPS_USER` | **Có** | Tài khoản Linux trên VPS dùng để deploy (không dùng root) | `deploy` hoặc `ubuntu` |
| `VPS_SSH_KEY` | **Có** | Nội dung Private Key OpenSSH (ED25519 hoặc RSA) | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| `VPS_SSH_PORT` | Không | Cổng SSH của VPS (mặc định là 22) | `22` (hoặc cổng custom nếu đã đổi) |
| `GHCR_TOKEN` | Không | GitHub Personal Access Token (PAT) có quyền `read:packages` (chỉ cần nếu Package GHCR để ở chế độ Private) | `ghp_xxxxxxxxxxxxxxxxxxxx` |
| `PRODUCTION_URL` | Không | Tên miền hoặc URL website production để ghi nhận trạng thái | `https://shopmart.vn` |

> [!IMPORTANT]
> **Không cấu hình mật khẩu CSDL hoặc JWT Secret trên GitHub Actions:**
> Các biến nhạy cảm như `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET` được lưu trữ an toàn trong file `.env` trực tiếp trên VPS tại `/opt/shopmart/.env`. GitHub Actions tuyệt đối không can thiệp hay đọc trộm các secret này.

---

## 3. CẤU HÌNH GITHUB ENVIRONMENT (PRODUCTION)

Truy cập: **GitHub Repository $\rightarrow$ Settings $\rightarrow$ Environments $\rightarrow$ New environment**

1. Tạo môi trường tên: **`production`**
2. **Environment Protection Rules (Khuyến nghị):**
   - Bật **Required reviewers**: Chọn các thành viên Lead / DevOps được phép phê duyệt trước khi deployment chạy thật trên VPS.
   - Bật **Wait timer** (nếu muốn trì hoãn kiểm tra 5 phút).
   - Chọn **Deployment branches**: Chỉ cho phép triển khai từ nhánh `master`.

---

## 4. PHÂN QUYỀN GITHUB CONTAINER REGISTRY (GHCR)

Mặc định khi chạy `release.yml`, action sử dụng `secrets.GITHUB_TOKEN` với quyền:
```yaml
permissions:
  contents: read
  packages: write
```

Để VPS có thể tải image từ GHCR:
1. **Nếu Package ở chế độ Public:** VPS có thể tải trực tiếp mà không cần đăng nhập.
2. **Nếu Package ở chế độ Private:**
   - Tạo một GitHub Personal Access Token (Classic) với quyền chỉ đọc: `read:packages`.
   - Đặt tên token: `GHCR_PULL_TOKEN_VPS`.
   - Thêm vào GitHub Repository Secrets dưới tên `GHCR_TOKEN`.

---

## 5. THIẾT LẬP BRANCH PROTECTION RULES CHO `master`

Truy cập: **GitHub Repository $\rightarrow$ Settings $\rightarrow$ Branches $\rightarrow$ Add branch ruleset (hoặc Add rule)**

- Branch pattern: `master`
- Đánh dấu các tùy chọn bảo vệ:
  1. **Require a pull request before merging:**
     - Require approvals: ít nhất 1 phê duyệt.
     - Dismiss stale pull request approvals when new commits are pushed.
  2. **Require status checks to pass before merging:**
     - Bắt buộc các job CI sau phải PASS:
       - `Frontend CI`
       - `Backend CI`
       - `Docker & Compose Validation`
       - `Security & Secret Scan`
  3. **Require branches to be up to date before merging.**
  4. **Do not allow force pushes.**
  5. **Do not allow deletions.**
