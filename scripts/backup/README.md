# HƯỚNG DẪN SAO LƯU VÀ PHỤC HỒI CƠ SỞ DỮ LIỆU MYSQL (ECOM-153 & ECOM-154)
## ShopMart E-Commerce Platform — Microservices Database Management

Tài liệu này hướng dẫn chi tiết quy trình sao lưu (Backup), khôi phục (Restore), xác thực tính toàn vẹn (Verify) và thiết lập lịch tự động định kỳ (Cronjob) cho toàn bộ 4 cơ sở dữ liệu của hệ thống ShopMart (`auth_db`, `product_db`, `order_db`, `payment_db`).

---

## 1. CẤU TRÚC THƯ MỤC VÀ TẬP TIN

```text
scripts/
└── backup/
    ├── backup.sh            # Script sao lưu tự động MySQL sang .sql.gz (Linux VPS / Docker)
    ├── restore.sh           # Script khôi phục an toàn, hỗ trợ test database drill
    ├── verify-backup.sh     # Script kiểm tra tính toàn vẹn, nén gzip và cấu trúc SQL
    ├── backup.ps1           # Script sao lưu trên môi trường Windows PowerShell
    ├── restore.ps1          # Script khôi phục trên môi trường Windows PowerShell
    ├── verify-backup.ps1    # Script xác thực trên môi trường Windows PowerShell
    └── README.md            # Tài liệu kỹ thuật chi tiết (tài liệu này)

backups/
├── .gitkeep                 # Thư mục lưu trữ các file sao lưu (được gitignore an toàn)
└── mysql_backup_YYYY-MM-DD_HH-MM-SS.sql.gz
```

---

## 2. BIẾN MÔI TRƯỜNG CẤU HÌNH (ENVIRONMENT VARIABLES)

Các script tự động nhận diện file cấu hình môi trường theo thứ tự:
1. `/opt/shopmart/.env` (Môi trường Ubuntu VPS Production)
2. `backend/.env` (Môi trường phát triển cục bộ)
3. `.env` (Thư mục gốc workspace)

| Tên biến | Giá trị mặc định | Mô tả |
|---|---|---|
| `MYSQL_CONTAINER` | `ecommerce-mysql` | Tên container Docker chạy MySQL 8.0 |
| `MYSQL_USER` | `root` | Tài khoản quản trị để thực thi mysqldump |
| `MYSQL_ROOT_PASSWORD` | `rootpassword` | Mật khẩu root MySQL (không in ra log/terminal) |
| `BACKUP_DIR` | `<project_root>/backups` | Thư mục lưu trữ file sao lưu |
| `RETENTION_DAYS` | `7` | Số ngày lưu trữ trước khi tự động dọn dẹp file cũ |
| `BACKUP_TARGET` | `all` | `all` (tất cả 4 DB) hoặc tên DB cụ thể (`auth_db`) |

---

## 3. HƯỚNG DẪN SAO LƯU (BACKUP)

### 3.1. Chạy trên Linux VPS / Ubuntu:
```bash
# Cấp quyền thực thi
chmod +x scripts/backup/*.sh

# 1. Sao lưu toàn bộ hệ thống (Mặc định nén .sql.gz)
./scripts/backup/backup.sh

# 2. Sao lưu một database cụ thể (ví dụ: order_db)
./scripts/backup/backup.sh -d order_db

# 3. Sao lưu với số ngày lưu trữ tùy chọn (ví dụ: giữ 14 ngày)
./scripts/backup/backup.sh -r 14 -o /opt/shopmart/backups
```

### 3.2. Chạy trên Windows (PowerShell):
```powershell
.\scripts\backup\backup.ps1 -Database all -RetentionDays 7
```

### 3.3. Đặc điểm an toàn của `backup.sh`:
1. **Bảo mật mật khẩu:** Sử dụng `MYSQL_PWD` truyền nội bộ vào `docker exec`, không in mật khẩu ra terminal hay file log.
2. **Kiểm tra trước khi dump:** Ping kiểm tra container MySQL đang `healthy` trước khi thực hiện.
3. **Nén tức thời (Streaming Gzip):** Stream trực tiếp qua `gzip -9` để tiết kiệm dung lượng ổ cứng tối đa (giảm 70-85% dung lượng).
4. **Kiểm tra tính toàn vẹn ngay sau khi backup:** Kiểm tra dung lượng > 0 bytes và chạy `gzip -t`. Nếu file rỗng hoặc lỗi, script lập tức xóa file hỏng và trả về mã lỗi (`exit code != 0`).
5. **Chính sách Retention an toàn:** Chỉ xóa các file `mysql_backup_*.sql.gz` cũ hơn `RETENTION_DAYS` trong đúng thư mục `$BACKUP_DIR`, tuyệt đối không xóa nhầm file ngoài.

---

## 4. HƯỚNG DẪN XÁC THỰC TÍNH TOÀN VẸN (VERIFY BACKUP)

Tuyệt đối không coi một file backup là hợp lệ chỉ vì nó tồn tại trên ổ cứng. Script `verify-backup.sh` kiểm tra 6 tiêu chuẩn:
1. File tồn tại trên hệ thống.
2. Dung lượng file lớn hơn 0 bytes.
3. Giải nén gzip thành công không có lỗi CRC checksum (`gzip -t`).
4. Nhận diện chữ ký header chuẩn của MySQL dump (`MySQL dump`, `/*!40101 SET`).
5. Đếm số lượng bảng và cấu trúc DDL `CREATE TABLE`.
6. Kiểm tra dòng trailer kết thúc dump (`Dump completed on ...`).

```bash
# Kiểm tra file backup
./scripts/backup/verify-backup.sh backups/mysql_backup_2026-11-09_18-00-00.sql.gz
```

Trên Windows:
```powershell
.\scripts\backup\verify-backup.ps1 -Path backups\mysql_backup_2026-11-09_18-00-00.sql.gz
```

---

## 5. HƯỚNG DẪN PHỤC HỒI (RESTORE)

### 5.1. Phục hồi an toàn vào Database kiểm thử (Diễn tập Diễn tập / Drill Mode):
Để không ảnh hưởng dữ liệu đang phục vụ người dùng, script hỗ trợ cờ `-t` (hoặc `--test-db`) để restore vào một database độc lập nhằm kiểm tra:
```bash
./scripts/backup/restore.sh backups/mysql_backup_2026-11-09_18-00-00.sql.gz -t auth_db_test -y
```

### 5.2. Phục hồi sản xuất khi xảy ra sự cố (Production Disaster Recovery):
```bash
# Chế độ tương tác có hỏi xác nhận:
./scripts/backup/restore.sh backups/mysql_backup_2026-11-09_18-00-00.sql.gz

# Bỏ qua xác nhận (dùng trong script tự động hóa / CI-CD Rollback):
./scripts/backup/restore.sh backups/mysql_backup_2026-11-09_18-00-00.sql.gz -y
```

---

## 6. THIẾT LẬP LỊCH TỰ ĐỘNG ĐỊNH KỲ (CRONJOB TRÊN LINUX VPS)

Để hệ thống tự động sao lưu hàng ngày vào lúc **02:00 sáng**, cấu hình crontab trên VPS như sau:

```bash
# 1. Mở trình soạn thảo crontab với user deploy hoặc root
crontab -e

# 2. Thêm dòng sau (đường dẫn tuyệt đối, ghi log và tự động xoay log):
0 2 * * * /opt/shopmart/scripts/backup/backup.sh -o /opt/shopmart/backups -r 14 >> /var/log/shopmart_backup.log 2>&1

# 3. Kiểm tra danh sách cronjob đã nạp
crontab -l
```

### Cấu hình Xoay vòng Log (Logrotate cho /var/log/shopmart_backup.log):
Tạo file `/etc/logrotate.d/shopmart-backup`:
```text
/var/log/shopmart_backup.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
}
```

---

## 7. QUY TRÌNH DIỄN TẬP SAO LƯU & PHỤC HỒI (ECOM-154 DRILL)

1. **Bước 1 — Pre-check:** Đảm bảo hệ thống microservices đang chạy ổn định.
2. **Bước 2 — Snapshot:** Kích hoạt `backup.sh` tạo bản sao lưu trước diễn tập.
3. **Bước 3 — Verify:** Chạy `verify-backup.sh` đảm bảo archive không lỗi.
4. **Bước 4 — Clone Test:** Dùng `restore.sh -t product_db_drill` nạp dữ liệu vào schema diễn tập.
5. **Bước 5 — Data Audit:** Truy vấn đối chiếu số lượng records giữa DB chính và DB diễn tập:
   ```sql
   SELECT COUNT(*) FROM product_db.products;
   SELECT COUNT(*) FROM product_db_drill.products;
   ```
6. **Bước 6 — Clean up:** Xóa database diễn tập sau khi hoàn tất kiểm tra:
   ```sql
   DROP DATABASE IF EXISTS product_db_drill;
   ```

---

## 8. XỬ LÝ LỖI THƯỜNG GẶP (TROUBLESHOOTING)

| Lỗi | Nguyên nhân | Cách khắc phục |
|---|---|---|
| `MySQL container 'ecommerce-mysql' is NOT running` | Container MySQL chưa được khởi động | Chạy `docker compose up -d mysql` và đợi container healthy |
| `Failed to authenticate or connect to MySQL` | Sai mật khẩu root MySQL | Kiểm tra biến `MYSQL_ROOT_PASSWORD` trong file `.env` |
| `gzip: unexpected end of file` | Quá trình dump bị ngắt giữa chừng | Kiểm tra dung lượng ổ đĩa VPS (`df -h`) và chạy lại backup |
| `Permission denied` khi chạy script | Thiếu quyền thực thi trên Linux | Chạy `chmod +x scripts/backup/*.sh` |
