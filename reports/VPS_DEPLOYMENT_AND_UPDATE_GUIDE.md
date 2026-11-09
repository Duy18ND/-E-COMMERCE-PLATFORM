# HƯỚNG DẪN TRIỂN KHAI & CẬP NHẬT VPS PRODUCTION (KHÔNG MẤT DỮ LIỆU)
## SHOPMART E-COMMERCE PLATFORM

- **Môi trường:** Ubuntu Server 24.04 LTS (4 vCPU, 8 GB RAM, 60 GB SSD)
- **Thư mục làm việc trên VPS:** `/opt/shopmart`
- **User triển khai:** `devops`
- **Nguyên tắc an toàn:**
  - ❌ **TUYỆT ĐỐI KHÔNG** chạy `docker compose down -v` (chặn cờ `-v` làm xóa named volumes).
  - ❌ **TUYỆT ĐỐI KHÔNG** xóa thư mục dữ liệu MySQL (`/var/lib/mysql`).
  - ❌ **TUYỆT ĐỐI KHÔNG** reset database hoặc chạy `ddl-auto: create-drop` trên Production.
  - ✅ **BẮT BUỘC** thực hiện sao lưu CSDL (MySQL Dump) trước khi thực hiện bất kỳ lệnh thay đổi mã nguồn nào.
  - ✅ **BẮT BUỘC** kiểm tra tính hợp lệ của healthcheck sau mỗi lần nâng cấp.

---

## PHẦN I: TRIỂN KHAI BẢN PHÁT HÀNH HIỆN TẠI (PHƯƠNG ÁN A – SPRINT 1 ỔN ĐỊNH)

### Bước 1: Chuẩn bị VPS và Cấu trúc thư mục
1. Đăng nhập vào VPS qua SSH bằng tài khoản `devops`:
   ```bash
   ssh devops@<VPS_IP>
   ```
2. Tạo thư mục làm việc và phân quyền:
   ```bash
   sudo mkdir -p /opt/shopmart/backups
   sudo chown -R devops:devops /opt/shopmart
   cd /opt/shopmart
   ```

### Bước 2: Clone hoặc Cập nhật Repository
```bash
git clone https://github.com/Duy18ND/-E-COMMERCE-PLATFORM.git /opt/shopmart
cd /opt/shopmart
git checkout main
```

### Bước 3: Thiết lập biến môi trường Production an toàn
1. Tạo file `.env` từ template bảo mật:
   ```bash
   cp backend/.env.prod.example backend/.env
   chmod 600 backend/.env
   ```
2. Chỉnh sửa `backend/.env` với các mật khẩu mạnh:
   ```bash
   nano backend/.env
   ```
   *Điền các giá trị thực tế:*
   - `MYSQL_USER=ecommerce_prod_user`
   - `MYSQL_PASSWORD=<Mật_khẩu_mạnh_MySQL>`
   - `MYSQL_ROOT_PASSWORD=<Mật_khẩu_root_mạnh>`
   - `REDIS_PASSWORD=<Mật_khẩu_mạnh_Redis>`
   - `JWT_SECRET=<Chuỗi_Base64_HS512_tối_thiểu_64_ký_tự>`
   - `EUREKA_USER=eureka_prod`
   - `EUREKA_PASSWORD=<Mật_khẩu_Eureka>`

### Bước 4: Khởi động các dịch vụ Hạ tầng cốt lõi (MySQL, Redis, Zookeeper, Kafka)
```bash
cd /opt/shopmart/backend
docker compose -f docker-compose.prod.yml up -d zookeeper kafka mysql redis
```
Kiểm tra trạng thái sẵn sàng của hạ tầng:
```bash
docker compose -f docker-compose.prod.yml ps
```
Chờ khoảng 30–45 giây cho đến khi MySQL, Redis, Kafka báo `(healthy)`.

### Bước 5: Áp dụng CSDL và Phân quyền (Idempotent Migration)
Nếu là VPS mới, `init.sql` sẽ tự động chạy. Nếu là VPS đã có dữ liệu, chạy master migration:
```bash
docker exec -i ecommerce-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" < docker/mysql/migrations/apply_all_migrations.sql
```
*Lệnh trên bảo đảm tạo đủ 4 databases (`auth_db`, `product_db`, `order_db`, `payment_db`), cấp quyền cho `ecommerce_prod_user`, sửa kiểu `rating` sang `INT` mà không mất bất kỳ dòng dữ liệu nào.*

### Bước 6: Khởi động Discovery Server và Toàn bộ Microservices
```bash
docker compose -f docker-compose.prod.yml up -d discovery-server
# Chờ discovery-server healthy (khoảng 35s)
docker compose -f docker-compose.prod.yml up -d auth-service product-service order-service payment-service api-gateway
```

### Bước 7: Khởi động Frontend và Nginx Reverse Proxy
```bash
docker compose -f docker-compose.prod.yml up -d frontend nginx
```

### Bước 8: Kiểm tra trạng thái 13 Container
```bash
docker compose -f docker-compose.prod.yml ps
```
*Yêu cầu nghiệm thu:* Toàn bộ 13/13 container đều ở trạng thái **`Up (healthy)`**.

---

## PHẦN II: HƯỚNG DẪN 9 BƯỚC CẬP NHẬT SPRINT 2 VÀO CUỐI TUẦN

Khi các lập trình viên hoàn thành các task còn lại của Sprint 2, DevOps thực hiện đúng theo quy trình chuẩn 9 bước dưới đây để cập nhật lên VPS mà không gây downtime kéo dài và tuyệt đối không mất dữ liệu:

```
[1. Review Code & PR] ──> [2. Regression Test CI] ──> [3. Backup MySQL CSDL]
                                                              │
[6. Rebuild Services] <── [5. Pull Branch/Tag]    <── [4. Chạy Migration CSDL]
       │
[7. Healthcheck 13 Containers] ──> [8. Smoke Test Live] ──> [9. Done / Rollback]
```

### Bước 1: Code Review & Thống nhất phạm vi
- Xác nhận toàn bộ 97 tasks của Sprint 2 đã được test kỹ lưỡng trên nhánh phát triển.
- Tạo Pull Request chính thức từ nhánh phát triển (ví dụ: `devops-phuong` hoặc `sprint2-release`) vào `master`.
- Tiến hành Code Review, bảo đảm không có secret hoặc thông tin nhạy cảm bị đưa vào mã nguồn.

### Bước 2: Kiểm thử Hồi quy Tự động (Automated Regression Test)
- Kiểm tra kết quả chạy của GitHub Actions CI trên Pull Request.
- Chạy kiểm thử Frontend:
  ```bash
  cd frontend
  npm ci
  npm test
  npm run lint
  npm run build
  ```
- Chạy kiểm thử Backend:
  ```bash
  cd backend
  ./gradlew test --no-daemon
  ```
- **Điều kiện tiên quyết:** Toàn bộ test case của Sprint 1 và Sprint 2 phải đạt **PASS 100%**. Nếu có test fail, dừng ngay lập tức và yêu cầu dev sửa chữa.

### Bước 3: Sao lưu an toàn MySQL CSDL (Mandatory Backup)
Trước khi chạm vào bất kỳ lệnh deploy nào, tạo bản snapshot dữ liệu:
```bash
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p /opt/shopmart/backups

docker exec ecommerce-mysql mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" \
  --databases auth_db product_db order_db payment_db \
  --single-transaction \
  --routines \
  --triggers \
  > /opt/shopmart/backups/shopmart_db_backup_${BACKUP_DATE}.sql

# Nén bản sao lưu để tiết kiệm dung lượng
gzip /opt/shopmart/backups/shopmart_db_backup_${BACKUP_DATE}.sql

echo "==> Backup completed: /opt/shopmart/backups/shopmart_db_backup_${BACKUP_DATE}.sql.gz"
```
*Lưu ý: Lưu trữ tối thiểu 7 bản backup gần nhất.*

### Bước 4: Xác định & Thực thi Migration CSDL
1. Kiểm tra các file migration mới trong thư mục `backend/docker/mysql/migrations/`.
2. Chạy migration an toàn bằng lệnh:
   ```bash
   docker exec -i ecommerce-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" \
     < /opt/shopmart/backend/docker/mysql/migrations/apply_all_migrations.sql
   ```
3. Xác minh kết quả migration:
   ```bash
   docker exec -i ecommerce-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "
     DESCRIBE product_db.product_reviews;
     SHOW TABLES FROM order_db;
     SHOW TABLES FROM payment_db;
   "
   ```
   *Đảm bảo cột `product_reviews.rating` là `int(11)` hoặc `int` và các bảng đơn hàng, thanh toán đã xuất hiện.*

### Bước 5: Pull phiên bản mã nguồn đã duyệt
```bash
cd /opt/shopmart
git fetch origin
git checkout master
git pull origin master
```

### Bước 6: Rebuild và Khởi động lại các Service cần thiết
Không cần dừng toàn bộ hệ thống (zero-downtime microservices). Chỉ rebuild những service có thay đổi mã nguồn trong Sprint 2:
```bash
cd /opt/shopmart/backend

# 1. Cập nhật Order Service & Payment Service (Sprint 2 Core)
docker compose -f docker-compose.prod.yml up -d --no-deps --build order-service payment-service

# 2. Cập nhật Product Service (nếu có bổ sung API tồn kho/flash sale)
docker compose -f docker-compose.prod.yml up -d --no-deps --build product-service

# 3. Cập nhật Frontend (Giao diện mới: Giỏ hàng, Checkout, Timeline)
docker compose -f docker-compose.prod.yml up -d --no-deps --build frontend

# 4. Reload cấu hình Nginx (không ngắt kết nối client)
docker exec ecommerce-nginx nginx -s reload
```

### Bước 7: Kiểm tra Healthcheck 13 Containers
Theo dõi tiến trình khởi động:
```bash
docker compose -f docker-compose.prod.yml ps
```
Liên tục quan sát trong 60 giây. Toàn bộ 13 services phải chuyển sang trạng thái `healthy`.
Xem logs nếu có container nào bị khởi động lại:
```bash
docker compose -f docker-compose.prod.yml logs --tail=100 -f order-service
```

### Bước 8: Smoke Test Website và API
Thực hiện các bước kiểm tra nhanh trên trình duyệt và terminal:
1. **Kiểm tra HTTP status qua Nginx:**
   ```bash
   curl -I http://localhost/healthz
   curl -I http://localhost/api/v1/products
   ```
2. **Kiểm tra luồng nghiệp vụ Sprint 1 (Regression Check):**
   - Đăng nhập với tài khoản khách hàng và quản trị viên.
   - Tìm kiếm, lọc sản phẩm theo khoảng giá.
   - Kiểm tra tồn kho sản phẩm `/stock`.
3. **Kiểm tra luồng mới của Sprint 2:**
   - Thêm sản phẩm vào Giỏ hàng -> Xem giỏ hàng.
   - Tạo đơn hàng thử nghiệm -> Kiểm tra dòng thời gian Stepper (`OrderTimeline`).
   - Vào trang Admin Quản lý đơn hàng -> Kiểm tra danh sách đơn và trạng thái.

---

## PHẦN III: KẾ HOẠCH ROLLBACK DỰ PHÒNG (NẾU TRIỂN KHAI THẤT BẠI)

Nếu sau khi triển khai Sprint 2 gặp sự cố nghiêm trọng (ví dụ: container crashloop, lỗi logic thanh toán không thể khắc phục ngay):

### Bước R1: Checkout lại phiên bản ổn định Sprint 1
```bash
cd /opt/shopmart
git checkout <COMMIT_SHA_HOAC_TAG_SPRINT_1>
```

### Bước R2: Rebuild và khởi động lại các Container về phiên bản cũ
```bash
cd /opt/shopmart/backend
docker compose -f docker-compose.prod.yml up -d --no-deps --build order-service payment-service product-service frontend
```

### Bước R3: Phục hồi CSDL từ bản Backup (Nếu CSDL bị lỗi cấu trúc)
```bash
gunzip < /opt/shopmart/backups/shopmart_db_backup_${BACKUP_DATE}.sql.gz | \
docker exec -i ecommerce-mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD"
```

### Bước R4: Xác minh phục hồi thành công
```bash
docker compose -f docker-compose.prod.yml ps
curl -I http://localhost/healthz
```
*Hệ thống được khôi phục 100% về trạng thái Sprint 1 ổn định ban đầu chỉ trong vòng 3 phút.*
