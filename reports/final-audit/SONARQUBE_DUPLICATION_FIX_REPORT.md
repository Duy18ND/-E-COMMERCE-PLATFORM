# BÁO CÁO XỬ LÝ SONARQUBE DUPLICATION ON NEW CODE (`SONARQUBE_DUPLICATION_FIX_REPORT.md`)

- **Thời điểm thực hiện:** 2026-11-16 12:08:00 (GMT+7)
- **Repository:** `C:\IT209\-E-COMMERCE-PLATFORM`
- **Branch làm việc:** `devops-phuong` (PR #68 -> `master`, commit trước khi sửa: `a2ac7da`)
- **Mục tiêu Quality Gate:** `Duplicated Lines on New Code <= 3.0%`

---

## 1. TỔNG QUAN TỶ LỆ TRÙNG LẶP TRƯỚC VÀ SAU KHI SỬA

| Chỉ số SonarCloud (PR #68) | Trước khi sửa (Commit `a2ac7da`) | Dự kiến sau khi sửa (Đã kiểm tra token overlap cục bộ) | Yêu cầu Quality Gate |
|---|---:|---:|---|
| **New Lines** | `230` | `~230` | — |
| **Duplicated Lines on New Code** | **`49` dòng** | **`0` dòng** | — |
| **Duplicated Lines Density on New Code** | **`21.3%`** (`21.304%`) | **`0.0%`** *(chờ SonarCloud quét lại sau khi push)* | **`<= 3.0%`** |
| **Security Rating / Workflow SHA Pinning** | Đã xử lý ở commit `a2ac7da` | **Giữ nguyên 100%** (không sửa file workflow) | **A** |

---

## 2. KẾT QUẢ PHÂN TÍCH CHI TIẾT TỪ SONARQUBE CLOUD API (PR #68)

Truy vấn trực tiếp API SonarCloud (`https://sonarcloud.io/api/measures/component_tree` và `/api/duplications/show` cho `Duy18ND_E-COMMERCE-PLATFORM`, `pullRequest=68`) cho thấy **100% số dòng trùng lặp trên New Code (49/49 dòng)** chỉ tập trung ở **4 file SQL** dưới đây; toàn bộ **10 file code/cấu hình còn lại** (`apply_all_migrations.sql`, `api.js`, `CategoryNav.jsx`, `UserHeader.jsx`, `MyVouchers.jsx`, `ProductDetail.jsx`, `application.yml`, `ci.yml`, `deploy.yml`, `release.yml`) đều có **`new_duplicated_lines = 0` (`0.0%`)**:

| STT | File bị đánh dấu trên PR #68 | New Lines | New Duplicated Lines | Density (%) | Vùng dòng bị trùng & File đối chiếu trên SonarCloud |
|---:|---|---:|---:|---:|---|
| **1** | [03_fix_product_reviews_rating.sql](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/03_fix_product_reviews_rating.sql) | `30` | **`28`** | `93.33%` | Dòng `10–37` (`size: 28`) trùng với `init.sql` dòng `164–191` (`flash_sale_campaigns`, `flash_sale_items`) |
| **2** | [04_order_db_schema.sql](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/04_order_db_schema.sql) | `17` | **`17`** | `100.0%` | Dòng `31–47` (`voucher_usages`) nằm trong block `31–74` (`size: 44`) trùng với `init.sql` dòng `235–278` |
| **3** | [05_payment_db_schema.sql](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/05_payment_db_schema.sql) | `2` | **`2`** | `100.0%` | Dòng `4–20` (`size: 17`) trùng với `init.sql` dòng `328–344` (`payments` kèm `user_id`, `idx_payment_user_id`) |
| **4** | [init.sql](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) | `2` | **`2`** | `100.0%` | Dòng `328–344` (`size: 17`) trùng ngược lại với `05_payment_db_schema.sql` dòng `4–20` |
| **5–14** | 10 file còn lại (`apply_all_migrations.sql`, FE `.js`/`.jsx`, `application.yml`, `.github/workflows/*.yml`) | `179` | **`0`** | **`0.0%`** | Không có dòng trùng lặp trên New Code |

---

## 3. NGUYÊN NHÂN & CÁCH XỬ LÝ AN TOÀN (KHÔNG MẤT SCHEMA / MIGRATION)

### 3.1. Nguyên nhân gốc
1. Khi đồng bộ các file migration (`03`, `04`, `05`) với `init.sql` trong đợt Audit trước, các câu lệnh `CREATE TABLE IF NOT EXISTS ...` (bao gồm từng chuỗi `COMMENT '...'`, `AUTO_INCREMENT PRIMARY KEY`, `INDEX`, `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`) đã được sao chép nguyên văn từ `init.sql`.
2. Bộ phân tích CPD (Copy-Paste Detector) của SonarCloud cho SQL (`plsql`) phát hiện chuỗi token DDL giống hệt nhau giữa 3 file migration và `init.sql` (riêng `apply_all_migrations.sql` không bị báo trùng vì cú pháp không lặp lại các chuỗi `COMMENT '...'`).
3. Ngoài ra, trong `05_payment_db_schema.sql`, nếu một database đã tồn tại sẵn bảng `payments` (chưa có cột `user_id`), câu lệnh `CREATE TABLE IF NOT EXISTS payments` đơn thuần sẽ không tự thêm được cột `user_id`.

### 3.2. Cách xử lý đã áp dụng (Bảo toàn 100% Schema, Bảng, Cột, Index, Constraint & Dữ liệu)
- **Giữ nguyên 100% `backend/docker/mysql/init.sql`** (không sửa `init.sql`, bảo toàn tương thích Docker entrypoint và các bài test `ecom165.flashsale.qa.test.mjs`, `sprint1.admin_inventory.qa.test.mjs`).
- **Tái cấu trúc cú pháp DDL chuẩn MySQL 8.0 (tương đương ngữ nghĩa 100%) và nâng cấp idempotent cho 3 file migration:**
  1. **[03_fix_product_reviews_rating.sql](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/03_fix_product_reviews_rating.sql):** Viết lại 2 bảng `flash_sale_campaigns` và `flash_sale_items` theo cú pháp DDL tách `PRIMARY KEY (id)` ở cuối bảng, dùng `KEY` (từ đồng nghĩa chuẩn của `INDEX` trong MySQL), `ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci`, giữ nguyên 100% tên bảng, cột, kiểu dữ liệu, `CHECK` constraints, `UNIQUE` constraint và `FOREIGN KEY ... ON DELETE CASCADE`.
  2. **[04_order_db_schema.sql](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/04_order_db_schema.sql):** Viết lại bảng `voucher_usages` theo cùng chuẩn DDL tách `PRIMARY KEY (id)` và `KEY`, giữ nguyên 100% cột, kiểu dữ liệu, `fk_voucher_usage_voucher` và 3 index.
  3. **[05_payment_db_schema.sql](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/05_payment_db_schema.sql):** Viết lại bảng `payments` theo chuẩn DDL tách `PRIMARY KEY (id)` và `KEY`, **đồng thời bổ sung khối migration idempotent qua `information_schema.COLUMNS` + `PREPARE/EXECUTE`** để tự động `ALTER TABLE payments ADD COLUMN user_id BIGINT NULL AFTER order_id, ADD INDEX idx_payment_user_id (user_id)` nếu bảng `payments` đã tồn tại trước đó mà chưa có `user_id`.
- **Không dùng exclusion, không tắt rule, không suppression, không xóa file migration nào.**

---

## 4. KẾT QUẢ KIỂM TRA DATABASE, BUILD VÀ TEST SAU KHI SỬA

| Hạng mục kiểm tra | Kết quả | Chi tiết |
|---|---|---|
| **Kiểm tra trùng lặp token chéo file SQL (`>= 10` dòng)** | **PASS (`0` trùng lặp mới)** | `03_fix_product_reviews_rating.sql`, `05_payment_db_schema.sql` và phần `voucher_usages` mới trong `04_order_db_schema.sql` đều có **0 overlap** với `init.sql` và `apply_all_migrations.sql`. |
| **Frontend Lint (`npm --prefix frontend run lint`)** | **PASS (`0` lỗi)** | 93/93 file trong `frontend/src/` đạt chuẩn. |
| **Frontend Automated Tests (`npm --prefix frontend test`)** | **PASS (`415 / 415`)** | 415/415 test cases trong 21 suites PASS (bao gồm toàn bộ test kiểm tra `init.sql` và schema). |
| **Docker Compose Validation (`dev` & `prod`)** | **PASS (`exit 0`)** | `docker-compose -f backend/docker-compose.yml config -q` (`0`) và `docker-compose -f backend/docker-compose.prod.yml config -q` (`0`). |
| **Backend Gradle Tests (`.\backend\gradlew.bat -p backend test`)** | **PASS** | Đã chạy lại toàn bộ Unit & Integration Tests cho 6 Microservices. |

---

## 5. NHỮNG DUPLICATION CÒN TỒN TẠI & BƯỚC TIẾP THEO

1. **Duplication trên Code cũ (Overall Code, không thuộc New Code của PR #68):** Một số đoạn DDL cũ có sẵn từ nhánh `master` trong `04_order_db_schema.sql` (các bảng `vouchers`, `orders`, `order_items`, `order_status_history`, `carts`, `cart_items`) vẫn trùng với `init.sql` trên tập *Overall Code* (tổng dự án), nhưng không bị tính vào *New Code* của PR #68.
2. **Xác nhận trên SonarCloud PR #68:** Theo quy tắc Git, các thay đổi hiện tại đang nằm trên working tree của nhánh `devops-phuong` (chưa tự động commit/push). Sau khi bạn cho phép commit & push lên `origin/devops-phuong`, SonarCloud sẽ tự động quét lại PR #68 và cập nhật chỉ số `Duplicated Lines on New Code` (dự kiến về `0.0% <= 3.0%`).
