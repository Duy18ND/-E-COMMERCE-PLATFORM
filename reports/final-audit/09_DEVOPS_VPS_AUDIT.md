# 09 – BÁO CÁO KIỂM TRA DEVOPS, DOCKER, CI/CD & VPS (DEVOPS & VPS AUDIT)

- **Thời điểm kiểm tra:** 2026-11-16 08:04:00 (GMT+7)
- **Kết quả kiểm tra cấu hình Docker Compose:**
  - `docker-compose -f backend/docker-compose.yml config -q` -> **PASS (`exit code 0`)**
  - `docker-compose -f backend/docker-compose.prod.yml config -q` -> **PASS (`exit code 0`)**

---

## 1. KIỂM TRA ĐẦY ĐỦ HẠ TẦNG CONTAINER & CI/CD

| Thành phần | File cấu hình | Kết quả kiểm tra | Ghi chú kỹ thuật |
|---|---|---|---|
| **Dockerfiles (7 services)** | `backend/discovery-server/Dockerfile`, `api-gateway/Dockerfile`, `auth-service/Dockerfile`, `product-service/Dockerfile`, `order-service/Dockerfile`, `payment-service/Dockerfile`, `frontend/Dockerfile` | **ĐẠT 100%** | Multi-stage build (`eclipse-temurin:21-jdk-alpine` -> `21-jre-alpine`, chạy dưới non-root `appuser`; Frontend `node:20-alpine` -> `nginx:1.27-alpine`), đều có `HEALTHCHECK`. |
| **Docker Compose Development** | `backend/docker-compose.yml` | **HỢP LỆ (`exit 0`)** | Đầy đủ 11 containers (`mysql`, `redis`, `zookeeper`, `kafka`, `discovery-server`, `api-gateway`, `auth-service`, `product-service`, `order-service`, `payment-service`, `frontend`, `nginx`), `depends_on: condition: service_healthy`, persistent volumes `mysql_data`, `redis_data`. |
| **Docker Compose Production** | `backend/docker-compose.prod.yml` | **HỢP LỆ (`exit 0`)** | Sử dụng image từ GHCR (`ghcr.io/${IMAGE_REPO_OWNER}/ecommerce-*:latest`), bắt buộc truyền secret qua `${VAR:?err}`, giới hạn RAM (`deploy.resources.limits.memory`) phù hợp Ubuntu VPS, chỉ mở port `80`/`443` tại `nginx`. |
| **Nginx Reverse Proxy** | `frontend/nginx.conf`, `backend/docker/nginx/nginx.conf`, `backend/docker/nginx/nginx.prod.conf` | **ĐẠT (ĐÃ SỬA `BUG-DEVOPS-01`)** | Định tuyến `/api/` -> `http://api-gateway:8080/api/`, hỗ trợ SPA `try_files $uri $uri/ /index.html`, `/healthz` trả `200 OK`. Đã comment khối `listen 443 ssl` mẫu trong `nginx.prod.conf` để container `nginx` không bị crash trên VPS mới trước khi chạy Certbot. |
| **GitHub Actions CI/CD** | `.github/workflows/ci.yml`, `docker-publish.yml`, `deploy.yml` | **ĐẠT (ĐÃ SỬA `BUG-DEVOPS-02`)** | `ci.yml` chạy test toàn bộ 6 microservices + Frontend lint/test/build + Docker Compose validation; `docker-publish.yml` đẩy 7 image lên GHCR; `deploy.yml` đã được bổ sung bước `appleboy/scp-action` đồng bộ `docker-compose.prod.yml`, `init.sql`, `migrations/`, `nginx.prod.conf`, `scripts/backup/` lên `/opt/shopmart` trước khi chạy `docker compose up -d`. |
| **Backup & Restore Scripts** | `scripts/backup/backup.sh`, `restore.sh`, `verify-backup.sh`, `backup.ps1`, `restore.ps1`, `verify-backup.ps1` | **ĐẠT 100%** | Sao lưu đủ 4 DB (`auth_db`, `product_db`, `order_db`, `payment_db`), nén `.sql.gz`, kiểm tra checksum `SHA-256`, tự động tạo bản pre-restore safety backup trước khi khôi phục. |

---

## 2. TRẠNG THÁI RUNTIME TRÊN MÁY LOCAL & VPS

1. **Docker Daemon trên máy kiểm thử cục bộ:** Khi chạy `docker info`, Docker Desktop daemon trên máy Windows hiện đang tắt (`open //./pipe/docker_engine: The system cannot find the file specified`). Do đó bước xác thực cú pháp `docker-compose config -q` đã **PASS 100%**, còn việc khởi chạy trực tiếp `docker compose up -d` cần người dùng bật ứng dụng **Docker Desktop** trên máy.
2. **Triển khai trực tiếp lên Ubuntu VPS (`ECOM-154`):** Chưa thực thi SSH lên VPS do chưa có `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` và tuân thủ quy tắc *"Không tự ý deploy lên VPS hoặc thay đổi dữ liệu Production nếu chưa được cho phép"*.
