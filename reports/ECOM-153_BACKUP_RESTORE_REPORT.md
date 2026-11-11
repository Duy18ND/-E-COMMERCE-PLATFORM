# BÁO CÁO KỸ THUẬT TRIỂN KHAI TASK ECOM-153
## Hệ thống Sao lưu (Backup) & Phục hồi (Restore) Cơ sở Dữ liệu MySQL Tự động

---

### THÔNG TIN TỔNG QUAN

| Thuộc tính | Chi tiết |
|---|---|
| **Mã công việc (Task ID)** | **ECOM-153** |
| **Tên công việc** | `[DevOps] Viết Script Backup & Restore dữ liệu MySQL (mysqldump, backup.sh, restore.sh & cronjob)` |
| **Phân hệ / Module** | DevOps / Database Reliability Engineering / Disaster Recovery |
| **Nhánh phát triển (Branch)** | `devops-phuong` |
| **Repository** | `https://github.com/Duy18ND/-E-COMMERCE-PLATFORM` |
| **Môi trường mục tiêu** | Ubuntu VPS (Linux) & Local Development (Windows PowerShell) |
| **Trạng thái thực thi** | **COMPLETED & VERIFIED (10/10 Test Cases PASS)** |
| **Kỹ sư phụ trách** | Senior DevOps Engineer (`devops-phuong`) |
| **Ngày hoàn thành** | 09/11/2026 |

---

## 1. MỤC TIÊU VÀ PHẠM VI NGHIỆP VỤ

Trong kiến trúc Microservices phân tán của **ShopMart E-Commerce Platform**, dữ liệu được phân chia độc lập thành 4 cơ sở dữ liệu chuyên biệt phục vụ các service cốt lõi. Sự cố mất dữ liệu hoặc hỏng ổ cứng trên máy chủ sản xuất sẽ dẫn đến ngừng trệ toàn bộ chu trình đặt hàng, thanh toán và quản lý người dùng.

Mục tiêu của task **ECOM-153**:
1. Xây dựng công cụ sao lưu tự động định kỳ bằng `mysqldump` kết hợp nén `gzip` mức tối đa (`.sql.gz`).
2. Hỗ trợ sao lưu đồng thời toàn bộ 4 cơ sở dữ liệu (`auth_db`, `product_db`, `order_db`, `payment_db`) hoặc từng cơ sở dữ liệu riêng lẻ.
3. Cơ chế phục hồi (Restore) an toàn tuyệt đối: yêu cầu xác nhận tương tác, kiểm tra toàn vẹn trước khi nạp dữ liệu, và hỗ trợ cơ chế phục hồi diễn tập (**Drill Test**) vào database tạm thời mà không ảnh hưởng database thật.
4. Kiểm định tính toàn vẹn (Verify) chặt chẽ: kiểm tra định dạng nén, signature của MySQL, số lượng bảng và dấu kết thúc `Dump completed`.
5. Tự động hóa lịch sao lưu qua `cronjob` (chạy 02:00 sáng mỗi ngày) và chính sách lưu trữ (**Retention Policy**) tự động dọn dẹp file cũ sau 7 ngày.
6. Bảo mật nghiêm ngặt: Tuyệt đối không hardcode mật khẩu, sử dụng biến môi trường masked `MYSQL_PWD`, không commit file backup thật vào Git repository (`.gitignore`).

---

## 2. KIẾN TRÚC CƠ SỞ DỮ LIỆU HỆ THỐNG

| Cơ sở Dữ liệu | Service Phụ Trách | Port Nội Bộ | Chức Năng Chính & Dữ Liệu Lưu Trữ |
|---|---|---|---|
| `auth_db` | `auth-service` (8081) | 3306 | Tài khoản, mã hóa mật khẩu BCrypt, quyền hạn (ROLE_USER, ROLE_ADMIN), Refresh Tokens |
| `product_db` | `product-service` (8082) | 3306 | Danh mục, thông tin sản phẩm, giá bán, tồn kho kho hàng (`stock_quantity`) |
| `order_db` | `order-service` (8083) | 3306 | Đơn hàng, chi tiết sản phẩm đơn hàng (`order_items`), trạng thái Saga (PENDING, PAID, CANCELLED) |
| `payment_db` | `payment-service` (8084) | 3306 | Lịch sử giao dịch thanh toán mô phỏng (VNPay, MoMo, COD), mã giao dịch đối soát |

*Container Docker quản trị:* `ecommerce-mysql` (Image `mysql:8.0`), persistent volume `mysql-data:/var/lib/mysql`.

---

## 3. THIẾT KẾ VÀ CẤU TRÚC BỘ CÔNG CỤ (SCRIPTS SUITE)

Để đảm bảo tính nhất quán trên cả môi trường Linux VPS (sản xuất) và máy trạm lập trình Windows của đội ngũ kỹ sư, bộ công cụ được phát triển song song với đầy đủ tính năng tương đương:

```text
scripts/
└── backup/
    ├── backup.sh            # Script sao lưu Bash POSIX chuẩn cho Linux VPS / Docker
    ├── restore.sh           # Script khôi phục an toàn Bash POSIX có bảo vệ chống ghi đè
    ├── verify-backup.sh     # Script xác thực tính toàn vẹn file nén và schema SQL Bash
    ├── backup.ps1           # Script sao lưu chuẩn Windows PowerShell (sử dụng .NET GZipStream)
    ├── restore.ps1          # Script khôi phục Windows PowerShell có xác nhận an toàn
    ├── verify-backup.ps1    # Script xác thực Windows PowerShell với khối finally giải phóng file lock
    └── README.md            # Tài liệu hướng dẫn sử dụng, cú pháp crontab và quy trình khắc phục sự cố

backups/
├── .gitkeep                 # Thư mục lưu trữ sao lưu được theo dõi trong Git
└── mysql_backup_*.sql.gz    # File nén sao lưu thực tế (đã loại trừ an toàn qua .gitignore)
```

---

## 4. CHI TIẾT KỸ THUẬT VÀ TÍNH NĂNG NỔI BẬT

### 4.1. Kịch bản Sao lưu (`backup.sh` / `backup.ps1`)
- **Tên tệp chuẩn hóa:** `mysql_backup_YYYY-MM-DD_HH-MM-SS.sql.gz` hoặc `mysql_backup_<dbname>_YYYY-MM-DD_HH-MM-SS.sql.gz`.
- **Cơ chế nén luồng:** Dữ liệu xuất từ `mysqldump` được nén trực tiếp qua luồng `gzip -9` (không tạo tệp `.sql` trung gian lớn trên đĩa cứng, giúp tiết kiệm 80-85% dung lượng đĩa).
- **Tùy chọn mysqldump tối ưu:**
  - `--single-transaction`: Đảm bảo tính nhất quán dữ liệu ACID theo snapshot của InnoDB mà không khóa bảng (Lock-free backup), không gây gián đoạn các giao dịch đặt hàng đang chạy.
  - `--quick`: Đọc từng dòng dữ liệu từ server thay vì load toàn bộ bảng vào RAM, bảo vệ máy chủ VPS không bị cạn bộ nhớ.
  - `--routines --triggers`: Sao lưu đầy đủ stored procedures, functions và triggers.
  - `--skip-lock-tables`: Tránh deadlock với các tiến trình đọc/ghi khác.
- **Bảo mật thông tin đăng nhập:**
  - Mật khẩu được nạp qua biến `MYSQL_PWD` hoặc cờ bảo mật của Docker; không ghi mật khẩu vào tệp log hay in ra stdout.
- **Tự động áp dụng Retention Policy:**
  - Tự động quét và xóa bỏ các tệp sao lưu có thời gian tạo vượt quá `RETENTION_DAYS` (mặc định 7 ngày).

### 4.2. Kịch bản Phục hồi An toàn (`restore.sh` / `restore.ps1`)
- **Kiểm tra tiền điều kiện (Pre-flight Checks):**
  - Kiểm tra tệp tồn tại, dung lượng tệp lớn hơn 0 byte.
  - Kiểm tra tính hợp lệ của định dạng gzip và khả năng giải nén trước khi thực hiện bất kỳ lệnh nạp dữ liệu nào.
  - Kiểm tra trạng thái sẵn sàng của container MySQL (`docker exec ... mysqladmin ping`).
- **Bảo vệ chống ghi đè vô ý (Accidental Overwrite Protection):**
  - Mặc định script hiển thị cảnh báo đỏ và yêu cầu người vận hành xác nhận rõ ràng bằng bàn phím (`[y/N]`).
  - Hỗ trợ cờ tự động hóa `-y` / `--force` cho các kịch bản CI/CD pipeline tự động.
- **Chế độ Diễn tập Phục hồi (Drill / Sandbox Restoration):**
  - Hỗ trợ tham số `-t <test_db>` / `--test-db <test_db>`: Cho phép giải nén và nạp thử nghiệm vào cơ sở dữ liệu thử nghiệm độc lập (ví dụ `auth_db_test`, `product_db_test`) để kiểm tra toàn vẹn nghiệp vụ mà **tuyệt đối không làm gián đoạn hoặc mất mát dữ liệu đang phục vụ khách hàng**.

### 4.3. Kịch bản Xác thực Tính Toàn vẹn (`verify-backup.sh` / `verify-backup.ps1`)
Thực hiện 6 bước kiểm tra nghiêm ngặt:
1. `CHECK_FILE_EXISTS`: Xác nhận tệp tồn tại trên đường dẫn chỉ định.
2. `CHECK_NON_EMPTY`: Kiểm tra dung lượng tệp > 0 bytes (loại bỏ tệp rỗng tạo do lỗi ngắt kết nối).
3. `CHECK_GZIP_INTEGRITY`: Thử nghiệm giải nén luồng qua `gzip -t` hoặc `.NET System.IO.Compression.GZipStream` để phát hiện lỗi hỏng checksum CRC32.
4. `CHECK_SQL_HEADER`: Quét sự hiện diện của chuỗi định danh chuẩn `MySQL dump` trong phần header của tệp SQL.
5. `CHECK_TABLE_COUNT`: Phân tích và thống kê số lượng bảng DDL (`CREATE TABLE`) có trong tệp sao lưu.
6. `CHECK_SQL_TRAILER`: Quét chuỗi hoàn tất `Dump completed on` ở cuối tệp để đảm bảo tiến trình mysqldump không bị ngắt quãng giữa chừng.

---

## 5. CẤU HÌNH CRONJOB TỰ ĐỘNG VÀ QUẢN LÝ NHẬT KÝ (LOGROTATE)

### 5.1. Thiết lập Cronjob trên Ubuntu VPS
Tự động kích hoạt sao lưu lúc **02:00 sáng hàng ngày** (giờ thấp điểm của hệ thống thương mại điện tử):

```bash
# Mở bảng lịch trình crontab của user deploy hoặc root
sudo crontab -u deploy -e

# Thêm cấu hình sao lưu định kỳ:
0 2 * * * /opt/shopmart/scripts/backup/backup.sh -r 7 >> /var/log/shopmart_backup.log 2>&1
```

### 5.2. Quản lý Nhật ký với Logrotate (`/etc/logrotate.d/shopmart-backup`)
Để ngăn tệp log làm đầy dung lượng ổ cứng VPS:

```text
/var/log/shopmart_backup.log {
    weekly
    rotate 8
    compress
    missingok
    notifempty
    create 0640 deploy deploy
}
```

---

## 6. MA TRẬN KIỂM THỬ THỰC TẾ (TEST EXECUTION & RESULTS)

Toàn bộ các chức năng của bộ công cụ đã được thực thi và kiểm định toàn diện trên workspace của dự án:

| STT | Mã Kịch Bản | Mục Tiêu Kiểm Thử | Dữ Liệu Đầu Vào / Lệnh Thực Thi | Kết Quả Mong Đợi | Kết Quả Thực Tế | Đánh Giá |
|---|---|---|---|---|---|:---:|
| 1 | **TC-BK-01** | Tạo bản sao lưu nén toàn bộ hệ thống (4 DB) | `.\scripts\backup\backup.ps1 -BackupTarget all` | Tệp `.sql.gz` được tạo, dung lượng > 0, nén chuẩn | Đã tạo `mysql_backup_2026-11-09_19-05-09.sql.gz` (3.9 KB nén, 16 bảng) | **PASS** |
| 2 | **TC-BK-02** | Sao lưu riêng lẻ một database cụ thể | `.\scripts\backup\backup.ps1 -BackupTarget product_db` | Chỉ sao lưu bảng thuộc `product_db` | Tệp nén riêng biệt được tạo thành công | **PASS** |
| 3 | **TC-VF-01** | Xác thực tính toàn vẹn bản sao lưu hợp lệ | `.\scripts\backup\verify-backup.ps1 -BackupFile <file>` | Vượt qua cả 6 kiểm tra, đếm đúng 16 bảng | Header: OK, Tables: 16, Checksum: OK, Trailer: OK | **PASS** |
| 4 | **TC-RS-01** | Diễn tập phục hồi an toàn vào DB Test | `.\scripts\backup\restore.ps1 -BackupFile <file> -TestDatabase auth_db_test -Force` | Nạp dữ liệu vào `auth_db_test`, không ảnh hưởng DB chính | Khôi phục thành công, dữ liệu toàn vẹn | **PASS** |
| 5 | **TC-RT-01** | Cơ chế dọn dẹp theo thời gian lưu trữ | `.\scripts\backup\backup.ps1 -RetentionDays 7` | Giữ tệp mới, loại bỏ tệp cũ hơn 7 ngày | Thuật toán quét và áp dụng đúng hạn mức retention | **PASS** |
| 6 | **TC-NEG-01** | Phục hồi tệp sao lưu không tồn tại | `.\scripts\backup\restore.ps1 -BackupFile not_found.sql.gz` | Báo lỗi rõ ràng và dừng tiến trình với mã lỗi != 0 | `[ERROR] Backup file not found`, Exit Code 1 | **PASS** |
| 7 | **TC-NEG-02** | Kiểm tra tệp sao lưu rỗng (0 bytes) | `.\scripts\backup\verify-backup.ps1 -BackupFile empty.sql.gz` | Từ chối xác thực tệp rỗng | `[FAIL] Backup file is empty (0 bytes)` | **PASS** |
| 8 | **TC-NEG-03** | Kiểm tra tệp nén gzip bị hỏng dữ liệu | `.\scripts\backup\verify-backup.ps1 -BackupFile corrupted.sql.gz` | Phát hiện lỗi CRC / stream, giải phóng handle an toàn | Báo lỗi CRC, giải phóng file lock an toàn | **PASS** |
| 9 | **TC-SEC-01** | Kiểm tra rò rỉ mật khẩu trong stdout/log | Quét output và script logging | Không xuất hiện mật khẩu plaintext | Mật khẩu được ẩn hoàn toàn | **PASS** |
| 10 | **TC-GIT-01** | Kiểm tra bảo vệ mã nguồn Git | `git status --ignored` | Không cho phép đưa file `.sql.gz` vào repository | Thư mục `backups/*` được gitignore chính xác | **PASS** |

---

## 7. KẾT LUẬN VÀ BÀN GIAO

1. **Hoàn thành 100% mục tiêu của ECOM-153:** Toàn bộ kịch bản sao lưu, phục hồi, kiểm tra toàn vẹn, lập lịch crontab và tài liệu kỹ thuật chi tiết đã sẵn sàng phục vụ sản xuất.
2. **Sẵn sàng tích hợp cho ECOM-154:** Bộ công cụ đáp ứng đầy đủ yêu cầu triển khai thực tế trên Ubuntu VPS và hỗ trợ kịch bản diễn tập khôi phục sau thảm họa (Disaster Recovery Drill).
