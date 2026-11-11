# HƯỚNG DẪN TRIỂN KHAI VÀ VẬN HÀNH VPS UBUNTU – SHOPMART

Tài liệu chuẩn bị máy chủ, cấu hình bảo mật, tường lửa, SSL/HTTPS và quy trình vận hành cho ShopMart E-Commerce Platform trên môi trường Ubuntu VPS.

---

## 1. YÊU CẦU MÁY CHỦ (HARDWARE REQUIREMENTS)

| Thành phần | Cấu hình tối thiểu | Khuyến nghị Production |
|---|---|---|
| **Hệ điều hành** | Ubuntu 22.04 LTS / 24.04 LTS (64-bit) | Ubuntu 22.04 LTS (x86_64) |
| **CPU** | 2 vCPU | 4 vCPU |
| **RAM** | 4 GB (+ 2GB Swap) | 8 GB RAM (+ 4GB Swap) |
| **Ổ cứng (SSD)** | 40 GB NVMe/SSD | 80 GB NVMe |
| **Băng thông mạng** | 100 Mbps Public IP | 1 Gbps Dedicated IP |

---

## 2. CÀI ĐẶT DOCKER ENGINE & DOCKER COMPOSE

Đăng nhập vào VPS với quyền root và thực thi các lệnh chuẩn bị:

```bash
# 1. Cập nhật hệ thống
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg lsb-release ufw

# 2. Cài đặt Docker Official GPG Key và Repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Cài đặt Docker Engine và Docker Compose plugin
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Kiểm tra phiên bản
docker --version
docker compose version
```

---

## 3. TẠO USER DEPLOY VÀ CẤU HÌNH SSH AN TOÀN

Tuyệt đối không dùng trực tiếp tài khoản `root` cho GitHub Actions CI/CD. Tạo user riêng biệt có quyền thực thi Docker:

```bash
# 1. Tạo user 'deploy'
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo usermod -aG sudo deploy

# 2. Cho phép user deploy chạy sudo không cần nhập mật khẩu cho các tác vụ chuẩn bị thư mục
echo "deploy ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/deploy-nopasswd

# 3. Cấu hình SSH Key cho user deploy
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh

# Dán Public Key tương ứng với VPS_SSH_KEY (GitHub Secret) vào authorized_keys
sudo nano /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
```

---

## 4. BẢO MẬT TƯỜNG LỬA (UFW FIREWALL)

Theo đúng mô hình Production Security Hardening của ShopMart: **Chỉ mở cổng 22 (SSH), cổng 80 (HTTP) và cổng 443 (HTTPS)** ra Internet. Toàn bộ MySQL (3306), Redis (6379), Kafka (9092), Zookeeper (2181), Eureka (8761) và API Gateway (8080) đều chạy nội bộ:

```bash
# Thiết lập chính sách mặc định
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Chỉ mở các cổng công khai cần thiết
sudo ufw allow 22/tcp comment "SSH Remote Management"
sudo ufw allow 80/tcp comment "HTTP Nginx Reverse Proxy"
sudo ufw allow 443/tcp comment "HTTPS Nginx SSL"

# Kích hoạt UFW
sudo ufw enable
sudo ufw status verbose
```

---

## 5. THIẾT LẬP THƯ MỤC DỰ ÁN VÀ BIẾN MÔI TRƯỜNG

Thư mục chuẩn triển khai trên VPS là `/opt/shopmart`:

```bash
# Tạo thư mục
sudo mkdir -p /opt/shopmart/docker/mysql /opt/shopmart/docker/nginx /opt/shopmart/backups
sudo chown -R deploy:deploy /opt/shopmart
cd /opt/shopmart

# Sao chép file cấu hình từ repository:
# - backend/docker-compose.prod.yml -> /opt/shopmart/docker-compose.prod.yml
# - backend/docker/mysql/init.sql  -> /opt/shopmart/docker/mysql/init.sql
# - backend/docker/nginx/nginx.prod.conf -> /opt/shopmart/docker/nginx/nginx.prod.conf
# - backend/.env.prod.example     -> /opt/shopmart/.env

# Tạo mật khẩu ngẫu nhiên an toàn cho file .env:
openssl rand -base64 24 # Dùng cho MYSQL_PASSWORD và MYSQL_ROOT_PASSWORD
openssl rand -base64 32 # Dùng cho REDIS_PASSWORD và EUREKA_PASSWORD
openssl rand -base64 64 # Dùng cho JWT_SECRET (tối thiểu 512-bit HS512)

# Chỉnh sửa file .env:
nano /opt/shopmart/.env
chmod 600 /opt/shopmart/.env
```

---

## 6. CẤU HÌNH SSL/HTTPS BẰNG CERTBOT (LET'S ENCRYPT)

Để kích hoạt HTTPS cho tên miền của bạn (ví dụ `shopmart.vn`):

```bash
# 1. Cài đặt Certbot
sudo apt-get install -y certbot

# 2. Chạy cấp phát chứng chỉ SSL ở chế độ standalone (tạm thời tắt container port 80 nếu có)
sudo certbot certonly --standalone -d shopmart.vn -d www.shopmart.vn --agree-tos -m admin@shopmart.vn

# 3. Chứng chỉ sẽ được lưu tại:
# /etc/letsencrypt/live/shopmart.vn/fullchain.pem
# /etc/letsencrypt/live/shopmart.vn/privkey.pem

# 4. Cấu hình crontab tự động gia hạn chứng chỉ hàng tháng:
sudo crontab -e
# Thêm dòng:
# 0 3 1 * * certbot renew --quiet && docker compose -f /opt/shopmart/docker-compose.prod.yml exec nginx nginx -s reload
```

---

## 7. QUY TRÌNH SAO LƯU, PHỤC HỒI DỮ LIỆU & DIỄN TẬP KHẮC PHỤC SỰ CỐ (ECOM-153 & ECOM-154)

Hệ thống ShopMart sử dụng bộ công cụ tự động hóa chuyên biệt tại `scripts/backup/` (`backup.sh`, `restore.sh`, `verify-backup.sh`). Dữ liệu được nén trực tiếp `.sql.gz` và áp dụng chính sách tự động xóa sau 7 ngày.

### 7.1. Cấp quyền thực thi các script trên VPS:
```bash
chmod +x /opt/shopmart/scripts/backup/*.sh
```

### 7.2. Tạo bản sao lưu tức thời (Trước khi deploy hoặc bảo trì hệ thống):
```bash
cd /opt/shopmart
# Sao lưu toàn bộ 4 database (auth_db, product_db, order_db, payment_db)
./scripts/backup/backup.sh

# Hoặc sao lưu một database cụ thể (ví dụ: order_db)
./scripts/backup/backup.sh -d order_db
```
File sao lưu sẽ được tạo trong `/opt/shopmart/backups/mysql_backup_YYYY-MM-DD_HH-MM-SS.sql.gz`.

### 7.3. Thiết lập lịch sao lưu tự động định kỳ (Cronjob):
Chạy sao lưu tự động vào lúc **02:00 sáng hàng ngày**:
```bash
sudo crontab -u deploy -e
# Thêm dòng sau:
0 2 * * * /opt/shopmart/scripts/backup/backup.sh -r 7 >> /var/log/shopmart_backup.log 2>&1
```

### 7.4. Kiểm tra tính toàn vẹn của bản sao lưu (Verify):
```bash
./scripts/backup/verify-backup.sh /opt/shopmart/backups/mysql_backup_YYYY-MM-DD_HH-MM-SS.sql.gz
```

### 7.5. Diễn tập Phục hồi An toàn (Disaster Recovery Drill - ECOM-154):
> [!IMPORTANT]
> **Quy tắc an toàn sống còn:** Tuyệt đối không phục hồi đè trực tiếp lên cơ sở dữ liệu production đang phục vụ khách hàng khi diễn tập. Sử dụng cơ chế phục hồi vào cơ sở dữ liệu kiểm thử riêng biệt (`auth_db_test`, `product_db_test`).

**Quy trình diễn tập 10 bước chuẩn hóa:**
1. **Bước 1:** Tạo bản sao lưu snapshot mới nhất:
   `./scripts/backup/backup.sh -d auth_db`
2. **Bước 2:** Xác thực tính toàn vẹn của tệp nén sao lưu:
   `./scripts/backup/verify-backup.sh <file_vua_tao>`
3. **Bước 3:** Khởi tạo cơ sở dữ liệu diễn tập cô lập:
   `docker exec -i ecommerce-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS auth_db_test;"`
4. **Bước 4:** Thực thi phục hồi bản sao lưu vào cơ sở dữ liệu diễn tập:
   `./scripts/backup/restore.sh -t auth_db_test <file_vua_tao>`
5. **Bước 5:** Đối soát số lượng bảng và cấu trúc schema giữa `auth_db` và `auth_db_test`:
   `docker exec -i ecommerce-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SHOW TABLES FROM auth_db_test;"`
6. **Bước 6:** Truy vấn mẫu kiểm tra tính nhất quán dữ liệu người dùng:
   `docker exec -i ecommerce-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "SELECT id, email, username FROM auth_db_test.users LIMIT 5;"`
7. **Bước 7:** Kiểm tra tính toàn vẹn khóa ngoại (Foreign Keys) và chỉ mục (Indexes).
8. **Bước 8:** Ghi nhận nhật ký diễn tập và thời gian hoàn tất (RTO - Recovery Time Objective < 5 phút).
9. **Bước 9:** Dọn dẹp an toàn cơ sở dữ liệu diễn tập sau khi nghiệm thu:
   `docker exec -i ecommerce-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD}" -e "DROP DATABASE IF EXISTS auth_db_test;"`
10. **Bước 10:** Xác nhận hệ thống chính không bị ảnh hưởng và hoạt động ổn định 100%.

### 7.6. Phục hồi thực tế khi xảy ra sự cố thảm họa (Disaster Recovery):
Khi xảy ra lỗi mất dữ liệu thực tế và đã có phê duyệt bảo trì:
```bash
./scripts/backup/restore.sh /opt/shopmart/backups/mysql_backup_YYYY-MM-DD_HH-MM-SS.sql.gz
# Nhập 'yes' khi hệ thống yêu cầu xác nhận an toàn
```

---

## 8. QUY TRÌNH ROLLBACK (KHI DEPLOYMENT GẶP SỰ CỐ)

Nếu phiên bản mới gặp lỗi logic hoặc healthcheck không phản hồi:

1. **Rollback tự động:** Workflow `.github/workflows/deploy.yml` đã tích hợp cơ chế tự động revert về image tag trước đó nếu container không vượt qua healthcheck trong vòng 120 giây.
2. **Rollback thủ công bằng lệnh trên VPS:**
   ```bash
   cd /opt/shopmart
   # Chỉ định tag phiên bản trước (ví dụ sha-9a1b2c3 hoặc latest)
   export IMAGE_TAG="sha-9a1b2c3"
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   ```
