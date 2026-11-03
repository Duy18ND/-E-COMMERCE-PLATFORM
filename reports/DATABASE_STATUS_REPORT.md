# BÁO CÁO KIỂM TRA DATABASE VÀ DỮ LIỆU MYSQL – E-COMMERCE PLATFORM

- **Dự án:** `C:\IT209\-E-COMMERCE-PLATFORM`
- **Sprint:** Sprint 1
- **Ngày kiểm tra:** 02/11/2026
- **Vai trò thực hiện:** Senior Database Engineer, Spring Boot Developer & DevOps Engineer
- **Nguyên tắc thực hiện:** Chỉ kiểm tra trạng thái thực tế (Read-only), tuyệt đối không sửa code, không tự tạo Database, không chạy migration/seeder và không hiển thị mật khẩu hay thông tin bí mật.

---

## A. Tổng quan Database

| Nội dung | Kết quả |
|---|---|
| Database đã tồn tại | **Chưa xác minh** *(Đã có cấu hình 4 DB trong `init.sql` & `application.yml`, nhưng container Docker MySQL chưa chạy và MySQL Windows Service trên cổng `3306` từ chối xác thực tài khoản cấu hình của dự án)* |
| MySQL đang chạy | **Có (Windows Service `MySQL80`) / Không (Docker Container `ecommerce-mysql`)** |
| Backend kết nối Database | **Thất bại / Chưa kiểm chứng runtime** *(Các microservice Backend hiện đang tắt; nếu chạy local sẽ bị lỗi `ERROR 1045 (28000): Access denied` khi kết nối vào `MySQL80` trên cổng `3306`)* |
| Đã có bảng dữ liệu | **Chưa xác minh trên MySQL runtime** *(Trong mã nguồn đã định nghĩa đầy đủ 13 bảng JPA Entity và 4 bảng DDL trong `init.sql`)* |
| Đã có dữ liệu Users | **Chưa xác minh trên MySQL runtime** *(Code Backend `auth-service` chưa có seeder tạo sẵn User mẫu, chỉ mới seed 3 Roles)* |
| Đã có dữ liệu Categories | **Chưa xác minh trên MySQL runtime** *(Code Backend `product-service` đã có `DataInitializer` tự động seed 4 danh mục khi service khởi chạy)* |
| Đã có dữ liệu Products | **Chưa xác minh trên MySQL runtime** *(Code Backend `product-service` đã có `DataInitializer` tự động seed 6 sản phẩm khi service khởi chạy)* |
| Đã có dữ liệu Inventory | **Chưa xác minh trên MySQL runtime** *(Tồn kho được lưu tại cột `stock_quantity` của bảng `products`, được seed kèm 6 sản phẩm trong `DataInitializer`)* |
| Có dữ liệu Demo | **Chưa xác định trên MySQL runtime** *(Đã có seeder Roles, Categories, Products/Inventory ở Backend và Mock Fallback ở Frontend, nhưng Backend chưa có seeder tài khoản Admin/User demo)* |

---

## B. Phân tích Cấu hình Database & Cơ chế Khởi tạo Dữ liệu Mẫu

### 1. Kết quả kiểm tra cấu hình Database (Mục 2)

1. **Hệ thống sử dụng Database nào?**
   - **Database quan hệ chính:** **MySQL 8.0** (`image: mysql:8.0`, JDBC Driver `com.mysql.cj.jdbc.Driver`, Hibernate Dialect `org.hibernate.dialect.MySQLDialect`).
   - **Cache / Session / Rate Limiter:** **Redis 7.2** (`image: redis:7.2-alpine`).
   - **Database phục vụ Unit/Integration Test (`build.gradle`):** **H2 In-Memory Database** (`testRuntimeOnly 'com.h2database:h2'`).
2. **Có bao nhiêu Database?**
   - Hệ thống thiết kế **4 Database MySQL tách biệt** theo mô hình *Database-per-Service*. (`discovery-server` và `api-gateway` không sử dụng MySQL).
3. **Tên từng Database và Microservice sử dụng:**
   - `auth_db` $\leftarrow$ `auth-service` (Port `8081`)
   - `product_db` $\leftarrow$ `product-service` (Port `8082`)
   - `order_db` $\leftarrow$ `order-service` (Port `8083`)
   - `payment_db` $\leftarrow$ `payment-service` (Port `8084`)
4. **Database được chạy bằng Docker hay cài trực tiếp trên Windows?**
   - **Theo thiết kế dự án:** Chạy bằng **Docker Compose** qua container `ecommerce-mysql` ([`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml)), gắn volume bền vững `mysql-data:/var/lib/mysql` và tự động nạp script [`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) vào `/docker-entrypoint-initdb.d/init.sql:ro`.
   - **Thực tế trên máy Windows hiện tại:** Docker Desktop Engine hiện đang tắt (container `ecommerce-mysql` không chạy). Thay vào đó, dịch vụ **MySQL Server 8.0.45 (`MySQL80`) cài trực tiếp trên Windows** đang chạy (`Status: Running`) và chiếm cổng `3306`.
5. **Cổng kết nối Database:**
   - Cổng **`3306`** (Cấu hình `${MYSQL_PORT:-3306}:3306` trên host và `mysql:3306` trong mạng nội bộ Docker `ecommerce-network`).
6. **Các microservice có dùng chung Database không?**
   - Các microservice **dùng chung 1 MySQL Server instance** và cùng tài khoản kết nối ứng dụng (`ecommerce_user`), nhưng **tách biệt hoàn toàn thành 4 schema/database độc lập** (`auth_db`, `product_db`, `order_db`, `payment_db`). Không có microservice nào truy cập chéo bảng của microservice khác.
7. **Có cấu hình tự động tạo bảng không?**
   - **Có**, thông qua 2 cơ chế:
     - **Hibernate DDL Auto:** Trong `application.yml` và `application-dev.yml` của cả 4 microservice (`auth-service`, `product-service`, `order-service`, `payment-service`), thuộc tính `spring.jpa.hibernate.ddl-auto` được đặt là `update` (tự động tạo mới hoặc cập nhật cấu trúc bảng từ các class `@Entity` khi ứng dụng khởi động). Lưu ý: Trong `application-prod.yml` của [`product-service`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/resources/application-prod.yml), `ddl-auto` được đặt là `validate`, trong khi [`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) chưa có lệnh `CREATE TABLE categories` (bảng `categories` hiện chỉ được tạo khi chạy với `ddl-auto: update` ở profile `dev`).
     - **Docker MySQL Init Script ([`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql)):** Tự động tạo 4 database (`auth_db`, `product_db`, `order_db`, `payment_db`), cấp quyền cho `ecommerce_user` và chạy lệnh `CREATE TABLE IF NOT EXISTS` cho 4 bảng trong `product_db` (`products`, `product_reviews`, `flash_sale_campaigns`, `flash_sale_items`).

---

### 2. Chi tiết các Database và Bảng (Mục 4, 5 & 8B)

> **Lưu ý:** Do không thể đăng nhập vào tiến trình `MySQL80` đang chiếm cổng `3306` bằng thông tin kết nối của dự án (`ERROR 1045: Access denied`) và container `ecommerce-mysql` chưa chạy, cột **Số lượng bản ghi** thực tế trong MySQL được ghi rõ là **Chưa xác minh** theo đúng quy tắc kiểm toán. Bảng dưới đây tổng hợp toàn bộ 4 Database, 14 bảng theo thiết kế Entity/SQL và số lượng bản ghi được cấu hình trong Seeder (`DataInitializer`).

| Database | Tên bảng (Theo Entity / `init.sql`) | Số lượng bản ghi thực tế | Ghi chú (Nguồn tạo bảng & Cơ chế Seeder) |
|---|---|---|---|
| **`auth_db`** | `roles` | **Chưa xác minh** | Tạo bởi JPA Entity [`Role.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/entity/Role.java). Khi `auth-service` chạy, [`DataInitializer.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java) tự động seed **3 bản ghi** (`ROLE_GUEST`, `ROLE_USER`, `ROLE_ADMIN`). |
| **`auth_db`** | `users` | **Chưa xác minh** | Tạo bởi JPA Entity [`User.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/entity/User.java). **Chưa có code seeder tạo sẵn tài khoản User/Admin mẫu** trong Backend. |
| **`auth_db`** | `user_roles` | **Chưa xác minh** | Bảng trung gian `@ManyToMany` kết nối `users` và `roles` (định nghĩa trong [`User.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/entity/User.java)). |
| **`auth_db`** | `user_addresses` | **Chưa xác minh** | Tạo bởi JPA Entity [`UserAddress.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/entity/UserAddress.java) (Sổ địa chỉ nhận hàng của người dùng). |
| **`product_db`** | `categories` | **Chưa xác minh** | Tạo bởi JPA Entity [`Category.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/entity/Category.java) (`ddl-auto: update`). Khi `product-service` chạy, [`DataInitializer.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/config/DataInitializer.java) tự động seed **4 danh mục mẫu**. |
| **`product_db`** | `products` *(bao gồm tồn kho `stock_quantity`)* | **Chưa xác minh** | Tạo bởi [`init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) & JPA Entity [`Product.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/entity/Product.java). Quản lý cả sản phẩm và tồn kho (`stock_quantity >= 0`, Optimistic Locking `version`). Khi `product-service` chạy, [`DataInitializer.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/config/DataInitializer.java) tự động seed **6 sản phẩm mẫu** có sẵn tồn kho. |
| **`product_db`** | `product_reviews` | **Chưa xác minh** | Tạo bởi [`init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) & JPA Entity [`ProductReview.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/entity/ProductReview.java). Chưa có dữ liệu seeder. |
| **`product_db`** | `flash_sale_campaigns` | **Chưa xác minh** | Tạo bởi [`init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) & JPA Entity [`FlashSaleCampaign.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/entity/FlashSaleCampaign.java). Chưa có dữ liệu seeder. |
| **`product_db`** | `flash_sale_items` | **Chưa xác minh** | Tạo bởi [`init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) & JPA Entity [`FlashSaleItem.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/entity/FlashSaleItem.java). Chưa có dữ liệu seeder. |
| **`order_db`** | `carts` | **Chưa xác minh** | Tạo bởi JPA Entity [`Cart.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/entity/Cart.java). Dữ liệu phát sinh theo giỏ hàng của người dùng. |
| **`order_db`** | `cart_items` | **Chưa xác minh** | Tạo bởi JPA Entity [`CartItem.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/entity/CartItem.java). |
| **`order_db`** | `orders` | **Chưa xác minh** | Tạo bởi JPA Entity [`Order.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/entity/Order.java). |
| **`order_db`** | `order_items` | **Chưa xác minh** | Tạo bởi JPA Entity [`OrderItem.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/entity/OrderItem.java). |
| **`order_db`** | `order_status_history` | **Chưa xác minh** | Tạo bởi JPA Entity [`OrderStatusHistory.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/entity/OrderStatusHistory.java). |
| **`payment_db`** | `payments` | **Chưa xác minh** | Tạo bởi JPA Entity [`Payment.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/payment-service/src/main/java/com/ecommerce/payment/entity/Payment.java). |

---

### 3. Phân tích cơ chế tạo dữ liệu mẫu trong Backend (Mục 6)

- **Flyway / Liquibase / `data.sql` / `schema.sql`:** Hệ thống **không sử dụng** Flyway, Liquibase, `data.sql` hay `schema.sql`. Chỉ có file [`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) chứa các câu lệnh DDL (`CREATE DATABASE`, `GRANT`, `CREATE TABLE`), không chứa câu lệnh `INSERT`.
- **`CommandLineRunner` (`DataInitializer.java`):** Hệ thống đã triển khai **2 bộ khởi tạo dữ liệu mẫu tự động** khi dịch vụ Backend khởi chạy:
  1. **Tại `auth-service` ([`DataInitializer.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java)):**
     - **Dữ liệu khởi tạo:** Duyệt qua `RoleName.values()` để tạo 3 vai trò: `ROLE_GUEST`, `ROLE_USER`, `ROLE_ADMIN`.
     - **Chống trùng dữ liệu:** Có kiểm tra `!roleRepository.existsByName(roleName)` trước khi `save()`, đảm bảo **không tạo trùng** khi khởi động lại service.
     - **Tài khoản demo:** **Chưa có** logic khởi tạo tài khoản Admin hoặc User mẫu trong `auth-service`. (Hiện tại, khi đăng ký qua API `POST /api/v1/auth/register`, `RegisterRequest` cho phép truyền trường `roles` tùy chọn hoặc mặc định gán `ROLE_USER`).
  2. **Tại `product-service` ([`DataInitializer.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/config/DataInitializer.java)):**
     - **Dữ liệu khởi tạo:**
       - **4 danh mục (`categories`):**
         1. `Điện thoại & Tablet`
         2. `Laptop & Workstation`
         3. `Phụ Kiện & Âm Thanh`
         4. `Nhà Thông Minh & Gia Dụng`
       - **6 sản phẩm kèm tồn kho (`products`):**
         1. `Laptop Dell XPS 15` (Giá: `32,990,000` VNĐ, Tồn kho: `50`, Trạng thái: `ACTIVE`)
         2. `iPhone 15 Pro Max 256GB` (Giá: `29,990,000` VNĐ, Tồn kho: `100`, Trạng thái: `ACTIVE`)
         3. `Tai nghe Sony WH-1000XM5` (Giá: `7,490,000` VNĐ, Tồn kho: `200`, Trạng thái: `ACTIVE`)
         4. `Robot Hút Bụi Deebot X2 OMNI` (Giá: `18,990,000` VNĐ, Tồn kho: `15`, Trạng thái: `ACTIVE`)
         5. `Bàn phím cơ không dây đa kết nối` (Giá: `1,850,000` VNĐ, Tồn kho: `25`, Trạng thái: `ACTIVE`)
         6. `MacBook Air M2 13 inch` (Giá: `24,500,000` VNĐ, Tồn kho: `8`, Trạng thái: `ACTIVE`)
     - **Chống trùng dữ liệu:** Kiểm tra `if (categoryRepository.count() > 0) return;` và `if (productRepository.count() > 0) return;`, đảm bảo **không bị trùng lặp dữ liệu** khi khởi động lại `product-service`.

---

## C. Kết quả kết nối (Mục 3, 7 & 8C)

### 1. Trạng thái MySQL & Docker
- **Docker Engine / Docker Desktop:** **Đang TẮT (`Stopped`)**.
  - Bằng chứng lỗi khi gọi Docker CLI:
    ```text
    failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine; check if the path is correct and if the daemon is running: open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified.
    ```
- **Container `ecommerce-mysql` (Docker Compose):** **Không chạy** (do Docker Engine chưa được khởi động).
- **Windows Service `MySQL80` (Cài trực tiếp trên máy host):** **Đang CHẠY (`Running`)**.
  - Phiên bản: `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe Ver 8.0.45 for Win64 on x86_64 (MySQL Community Server - GPL)`.
  - Đang lắng nghe trên cổng `3306` (`[::]:3306 Listen`).

### 2. Trạng thái kết nối Backend – Database
- **Trạng thái các Microservices Backend (`8080`, `8081`, `8082`, `8083`, `8084`, `8761`):** **Đang TẮT** (Không có tiến trình nào đang lắng nghe trên các cổng này).
- **Kiểm tra kết nối từ Cấu hình Backend tới MySQL trên cổng `3306`:** **THẤT BẠI (`Access Denied`)**.
  - Khi thử kết nối chỉ đọc tới `127.0.0.1:3306` bằng tài khoản ứng dụng (`ecommerce_user`) và tài khoản quản trị (`root`) theo cấu hình trong `application.yml` / `.env.example`, dịch vụ `MySQL80` trên Windows trả về:
    ```text
    ERROR 1045 (28000): Access denied for user 'ecommerce_user'@'localhost' (using password: YES)
    ERROR 1045 (28000): Access denied for user 'root'@'localhost' (using password: YES)
    ```

### 3. Các lỗi cấu hình và vận hành phát hiện được
1. **Docker Desktop Linux Engine chưa chạy:** Khiến toàn bộ hạ tầng container (`ecommerce-mysql`, `ecommerce-redis`, `ecommerce-kafka`, `ecommerce-zookeeper` và các microservices) chưa được khởi tạo/khởi chạy.
2. **Xung đột cổng `3306` và lệch môi trường MySQL giữa Windows Service (`MySQL80`) và Docker (`ecommerce-mysql`):**
   - Dịch vụ Windows `MySQL80` đang chiếm cổng `3306`. Dịch vụ này là bản cài đặt MySQL riêng trên máy Windows, chưa được chạy script `init.sql` để tạo user `ecommerce_user` và 4 database (`auth_db`, `product_db`, `order_db`, `payment_db`).
   - Hệ quả 1: Nếu chạy Backend trực tiếp trên Windows (`gradlew bootRun`), Backend sẽ kết nối vào `localhost:3306` (tức `MySQL80`) và gặp lỗi `ERROR 1045 (28000): Access denied for user 'ecommerce_user'@'localhost'`.
   - Hệ quả 2: Khi bật Docker Desktop và chạy `docker compose up -d`, container `ecommerce-mysql` (mapping cổng `3306:3306`) sẽ không thể bind cổng `3306` trên host nếu dịch vụ Windows `MySQL80` chưa được dừng (`Stop-Service MySQL80`).
3. **Điểm lưu ý trong `application-prod.yml` của `product-service` và `init.sql`:**
   - Trong [`backend/product-service/src/main/resources/application-prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/resources/application-prod.yml), `spring.jpa.hibernate.ddl-auto` được đặt là `validate`, nhưng [`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql) mới chỉ tạo 4 bảng (`products`, `product_reviews`, `flash_sale_campaigns`, `flash_sale_items`), thiếu bảng `categories`. Ở profile mặc định `dev` (`ddl-auto: update`), Hibernate sẽ tự tạo bảng `categories` bình thường, nhưng nếu chuyển sang profile `prod` trên một database mới hoàn toàn thì Hibernate schema validation sẽ báo thiếu bảng `categories`.

### 4. Các lệnh kiểm tra chỉ đọc đã thực hiện
```powershell
# 1. Kiểm tra danh sách container Docker, trạng thái cổng mạng và dịch vụ MySQL trên Windows
docker ps -a
Get-NetTCPConnection -LocalPort 3306,8080,8081,8082,8083,8084,8761 -ErrorAction SilentlyContinue
Get-Service *mysql* -ErrorAction SilentlyContinue

# 2. Kiểm tra phiên bản MySQL CLI trên máy
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" --version

# 3. Kiểm tra kết nối chỉ đọc (SHOW DATABASES) tới MySQL trên cổng 3306
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h 127.0.0.1 -P 3306 -u ecommerce_user -p<REDACTED> -e "SHOW DATABASES;"
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h 127.0.0.1 -P 3306 -u root -p<REDACTED> -e "SHOW DATABASES;"
```

---

## D. Kết luận (Mục 8D)

1. **Project hiện tại đã có Database chưa?**
   - **Về mặt thiết kế & cấu hình:** **ĐÃ CÓ ĐẦY ĐỦ** (Gồm 4 database `auth_db`, `product_db`, `order_db`, `payment_db` được định nghĩa trong [`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql), [`backend/docker-compose.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.yml) và các file `application.yml`).
   - **Về mặt thực tế đang chạy (Runtime):** **CHƯA XÁC MINH** do container `ecommerce-mysql` của dự án chưa chạy (Docker Engine đang tắt), còn dịch vụ `MySQL80` cục bộ của Windows đang chiếm cổng `3306` không chứa user `ecommerce_user` của dự án (`Access denied`).

2. **Database có đang chạy không?**
   - Container MySQL của dự án (`ecommerce-mysql` trong Docker Compose): **KHÔNG CHẠY** (do Docker Desktop đang tắt).
   - Dịch vụ MySQL của Windows (`MySQL80` trên cổng `3306`): **ĐANG CHẠY**, nhưng đây là instance cục bộ trên máy host và từ chối thông tin đăng nhập cấu hình trong dự án.

3. **Database đã có bảng chưa?**
   - **Trên MySQL runtime:** **CHƯA XÁC MINH** (vì chưa kết nối được vào MySQL bằng tài khoản dự án).
   - **Trong mã nguồn:** Đã có đầy đủ **14 bảng** (4 bảng trong `auth_db`, 5 bảng trong `product_db`, 5 bảng trong `order_db`, 1 bảng trong `payment_db`) sẵn sàng được tạo tự động ngay khi container `ecommerce-mysql` và các dịch vụ Spring Boot (`ddl-auto: update`) khởi chạy.

4. **Có bao nhiêu bản ghi sản phẩm?**
   - **Trong MySQL thực tế hiện tại:** **CHƯA XÁC MINH** (do chưa kết nối được MySQL).
   - **Trong bộ khởi tạo tự động của Backend ([`product-service DataInitializer.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/config/DataInitializer.java)):** Có **6 bản ghi sản phẩm mẫu** (kèm số lượng tồn kho từ `8` đến `200` sản phẩm/mã) sẽ tự động được nạp ngay khi `product-service` khởi động lần đầu.

5. **Có bao nhiêu danh mục?**
   - **Trong MySQL thực tế hiện tại:** **CHƯA XÁC MINH** (do chưa kết nối được MySQL).
   - **Trong bộ khởi tạo tự động của Backend ([`product-service DataInitializer.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/config/DataInitializer.java)):** Có **4 bản ghi danh mục mẫu** (`Điện thoại & Tablet`, `Laptop & Workstation`, `Phụ Kiện & Âm Thanh`, `Nhà Thông Minh & Gia Dụng`).

6. **Có bao nhiêu tài khoản?**
   - **Trong MySQL thực tế hiện tại:** **CHƯA XÁC MINH**.
   - **Trong bộ khởi tạo tự động của Backend ([`auth-service DataInitializer.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java)):** **`0` tài khoản** (`auth-service` hiện chỉ mới tự động tạo **3 bản ghi vai trò `roles`**: `ROLE_GUEST`, `ROLE_USER`, `ROLE_ADMIN`, chưa tự động tạo sẵn bản ghi `users` nào trong Database).

7. **Có dữ liệu demo để kiểm thử Sprint 1 chưa?**
   - **Đã có một phần trong code seeder (`DataInitializer`):** Đã có sẵn dữ liệu mẫu tự động cho **Roles (3 vai trò)**, **Categories (4 danh mục)** và **Products + Inventory (6 sản phẩm kèm tồn kho)**. Ngoài ra Frontend cũng có lớp dữ liệu Mock Fallback (`mockUsers.js`, `mockData.js`) khi chạy độc lập.
   - **Tuy nhiên trên Database thực tế:** Vì Docker và Backend chưa được bật nên dữ liệu seeder chưa thể truy vấn trực tiếp trên MySQL, đồng thời Backend `auth-service` **chưa có seeder tự tạo tài khoản Admin & Customer mẫu**.

8. **Nếu chưa có, cần bổ sung những dữ liệu nào?**
   - **Về dữ liệu Seeder trong Backend (`auth-service`):** Nên bổ sung khởi tạo sẵn tối thiểu **02 tài khoản demo** trong [`auth-service/.../DataInitializer.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/config/DataInitializer.java):
     - `01` tài khoản **Admin** (`ROLE_ADMIN`) để giảng viên/QA có thể đăng nhập ngay vào trang Quản trị (`/admin/categories`, `/admin/products`, `/admin/inventory`) mà không cần tự gọi API đăng ký kèm role Admin.
     - `01` tài khoản **Customer** (`ROLE_USER`) để kiểm thử ngay luồng đăng nhập khách hàng.
   - **Về vận hành hạ tầng trước khi Demo:**
     1. Dừng dịch vụ `MySQL80` của Windows (`Stop-Service MySQL80`) để giải phóng cổng `3306`.
     2. Khởi động **Docker Desktop** trên Windows.
     3. Chạy `cd backend && docker compose up -d --build` để container `ecommerce-mysql` thực thi `init.sql` (tạo 4 DB) và các microservice thực thi `DataInitializer` (tạo bảng + nạp dữ liệu mẫu).

9. **Hệ thống đã đủ dữ liệu để demo chưa?**
   - **Trạng thái hiện tại:** **CHƯA SẴN SÀNG TRÊN DATABASE THỰC TẾ** vì:
     1. Container `ecommerce-mysql` và các dịch vụ Backend đang tắt (Docker Desktop chưa chạy, cổng `3306` đang bị chiếm bởi Windows Service `MySQL80` không khớp thông tin xác thực).
     2. `auth-service` chưa tự động seed sẵn tài khoản `ADMIN` và `USER` mẫu trong bảng `users` (người тест phải gọi API `POST /api/v1/auth/register` trước khi đăng nhập).
   - Ngay sau khi dừng `MySQL80`, bật Docker Desktop, khởi chạy `docker compose up -d` và đăng ký (hoặc seed) tài khoản `ADMIN`/`USER`, hệ thống sẽ có đầy đủ **4 danh mục, 6 sản phẩm, tồn kho và 3 vai trò** trong MySQL để demo trọn vẹn Sprint 1.
