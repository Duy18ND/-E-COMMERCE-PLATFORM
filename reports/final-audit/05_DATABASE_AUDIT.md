# 05 – BÁO CÁO KIỂM TRA VÀ ĐỒNG BỘ DATABASE (DATABASE AUDIT REPORT)

- **Thời điểm kiểm tra:** 2026-11-16 08:04:00 (GMT+7)
- **Hệ quản trị CSDL:** MySQL 8.0 (`utf8mb4_unicode_ci`) – Kiến trúc Database-per-Service gồm 4 Database độc lập (`auth_db`, `product_db`, `order_db`, `payment_db`) và 16 bảng dữ liệu.
- **File đã kiểm tra & đồng bộ:**
  - `backend/docker/mysql/init.sql`
  - `backend/docker/mysql/migrations/01_create_databases_and_users.sql`
  - `backend/docker/mysql/migrations/02_auth_db_schema.sql`
  - `backend/docker/mysql/migrations/03_fix_product_reviews_rating.sql`
  - `backend/docker/mysql/migrations/04_order_db_schema.sql`
  - `backend/docker/mysql/migrations/05_payment_db_schema.sql`
  - `backend/docker/mysql/migrations/apply_all_migrations.sql`
  - Toàn bộ 15 JPA `@Entity` trong 4 Microservices (`auth-service`, `product-service`, `order-service`, `payment-service`).

---

## 1. BẢNG ĐỐI CHIẾU TOÀN BỘ 4 DATABASES & 16 BẢNG DỮ LIỆU

| Database | Tên bảng | JPA Entity | Primary Key | Foreign Keys / Unique Constraints | Indexes | Trạng thái khớp `ddl-auto: validate` |
|---|---|---|---|---|---|---|
| `auth_db` | `roles` | `Role.java` | `id BIGINT AI` | `UNIQUE (name)` | PK + Unique `name` | **ĐỒNG BỘ 100%** |
| `auth_db` | `users` | `User.java` | `id BIGINT AI` | `UNIQUE (email)` | `idx_users_email` | **ĐỒNG BỘ 100%** |
| `auth_db` | `user_roles` | `@JoinTable(name = "user_roles")` | `(user_id, role_id)` | `fk_user_roles_user`, `fk_user_roles_role` (`ON DELETE CASCADE`) | Composite PK | **ĐỒNG BỘ 100%** |
| `auth_db` | `user_addresses` | `UserAddress.java` | `id BIGINT AI` | — | `idx_address_user_id` | **ĐỒNG BỘ 100%** |
| `product_db` | `categories` | `Category.java` | `id BIGINT AI` | `UNIQUE (name)` | `idx_categories_name` | **ĐỒNG BỘ 100%** |
| `product_db` | `products` | `Product.java` | `id BIGINT AI` | `CHECK (stock_quantity >= 0)` | `idx_products_name`, `idx_products_category`, `idx_products_status`, `idx_products_status_price`, `idx_products_status_category` | **ĐỒNG BỘ 100%** |
| `product_db` | `product_reviews` | `ProductReview.java` | `id BIGINT AI` | `uq_review_product_user (product_id, user_id)`, `chk_rating (1..5)` | `idx_reviews_product_id`, `idx_reviews_user_id`, `idx_reviews_product_status` | **ĐỒNG BỘ 100%** |
| `product_db` | `flash_sale_campaigns` | `FlashSaleCampaign.java` | `id BIGINT AI` | — | `idx_fs_status_time (status, start_time, end_time)` | **ĐỒNG BỘ 100%** |
| `product_db` | `flash_sale_items` | `FlashSaleItem.java` | `id BIGINT AI` | `fk_fs_campaign`, `fk_fs_product`, `uq_fs_campaign_product` | `idx_fs_item_product` | **ĐỒNG BỘ 100%** |
| `order_db` | `vouchers` | `Voucher.java` | `id BIGINT AI` | `uq_voucher_code (code)` | `idx_vouchers_code`, `idx_vouchers_status_dates` | **ĐỒNG BỘ 100%** |
| `order_db` | `voucher_usages` | `VoucherUsage.java` | `id BIGINT AI` | `fk_voucher_usage_voucher` (`ON DELETE CASCADE`) | `idx_voucher_usage_voucher_user`, `idx_voucher_usage_code_user`, `idx_voucher_usage_order_id` | **ĐỒNG BỘ 100%** |
| `order_db` | `orders` | `Order.java` | `id BIGINT AI` | — | `idx_orders_user_id`, `idx_orders_status`, `idx_orders_created_at` | **ĐỒNG BỘ 100%** |
| `order_db` | `order_items` | `OrderItem.java` | `id BIGINT AI` | `fk_order_items_order` (`ON DELETE CASCADE`) | `idx_order_item_order_id`, `idx_order_item_product_id` | **ĐỒNG BỘ 100%** |
| `order_db` | `order_status_history` | `OrderStatusHistory.java` | `id BIGINT AI` | `fk_status_history_order` (`ON DELETE CASCADE`) | `idx_status_history_order_id`, `idx_status_history_created_at` | **ĐỒNG BỘ 100%** |
| `order_db` | `carts` | `Cart.java` | `id BIGINT AI` | `UNIQUE (user_id)` | `idx_carts_user_id` | **ĐỒNG BỘ 100%** |
| `order_db` | `cart_items` | `CartItem.java` | `id BIGINT AI` | `fk_cart_items_cart` (`ON DELETE CASCADE`), `uk_cart_item_cart_product (cart_id, product_id)` | `idx_cart_items_cart_id`, `idx_cart_items_product_id` | **ĐỒNG BỘ 100%** |
| `payment_db` | `payments` | `Payment.java` | `id BIGINT AI` | — | `idx_payment_order_id`, `idx_payment_user_id`, `idx_payment_transaction_code` | **ĐỒNG BỘ 100%** |

---

## 2. CÁC LỖI DATABASE SCHEMA PHÁT HIỆN VÀ ĐÃ SỬA AN TOÀN

### 2.1. `BUG-DB-01` [CRITICAL] – Thiếu cột `user_id` trong bảng `payment_db.payments`
- **Nguyên nhân:** `Payment.java` ánh xạ `@Column(name = "user_id") private Long userId;`, nhưng `init.sql`, `05_payment_db_schema.sql` và `apply_all_migrations.sql` chưa có cột `user_id BIGINT`. Khi chạy profile `prod` (`spring.jpa.hibernate.ddl-auto: validate`), Hibernate sẽ báo lỗi `Schema-validation: missing column [user_id] in table [payments]`.
- **Đã sửa:**
  1. Bổ sung `user_id BIGINT NULL COMMENT 'ID người dùng thanh toán'` và `INDEX idx_payment_user_id (user_id)` vào `backend/docker/mysql/init.sql`, `05_payment_db_schema.sql`, và `apply_all_migrations.sql`.
  2. Chuẩn hóa `@Index` trong `Payment.java` dùng tên cột vật lý `order_id`, `user_id`, `transaction_code`.

### 2.2. `BUG-DB-02` [HIGH] – Thiếu bảng `voucher_usages` trong `04_order_db_schema.sql` và `apply_all_migrations.sql`
- **Nguyên nhân:** Bảng `voucher_usages` đã có trong `init.sql` và `VoucherUsage.java`, nhưng chưa được đưa vào `04_order_db_schema.sql` và `apply_all_migrations.sql`.
- **Đã sửa:** Bổ sung `CREATE TABLE IF NOT EXISTS voucher_usages` đầy đủ khóa ngoại và index vào cả 2 file migration.

### 2.3. `BUG-DB-03` [HIGH] – Thiếu bảng `flash_sale_campaigns`, `flash_sale_items` và cột kiểm duyệt `product_reviews` trong `apply_all_migrations.sql` & `03_fix_product_reviews_rating.sql`
- **Nguyên nhân:** `apply_all_migrations.sql` chưa có 2 bảng Flash Sale và 2 cột `status`, `hidden_reason` của `product_reviews` (vốn đã có trong `init.sql`).
- **Đã sửa:** Đồng bộ đầy đủ `flash_sale_campaigns`, `flash_sale_items`, `product_reviews` (`status`, `hidden_reason`, `idx_reviews_product_status`) và các composite index vào `03_fix_product_reviews_rating.sql` và `apply_all_migrations.sql` mà không dùng bất kỳ lệnh `DROP` hay `TRUNCATE` nào.
