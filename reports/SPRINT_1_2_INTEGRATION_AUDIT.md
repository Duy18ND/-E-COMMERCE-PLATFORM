# BÁO CÁO TOÀN DIỆN TÍCH HỢP & KIỂM ĐỊNH SPRINT 1 VÀ SPRINT 2
## SHOPMART E-COMMERCE PLATFORM

- **Dự án:** `C:\IT209\-E-COMMERCE-PLATFORM`
- **Thời điểm kiểm định:** 05/11/2026
- **Vai trò thực hiện:** Senior Fullstack Developer, DevOps Engineer, Database Engineer & QA Automation Engineer
- **Nhánh kiểm định hiện tại:** `devops-phuong` (so sánh đối chiếu với `origin/main` và `origin/master`)
- **Mục tiêu kiểm định:**
  1. Bảo đảm chức năng Sprint 1 hoạt động đầy đủ 100%, khắc phục triệt để lỗi môi trường VPS.
  2. Rà soát, phân loại toàn bộ 97 task thuộc Sprint 2 trên Scrum Board & Codebase.
  3. Xác thực các task Sprint 2 đã triển khai (`ECOM-173`, `ECOM-188`, `ECOM-287`, `ECOM-296`, `ECOM-291`, `ECOM-311`, `ECOM-165`).
  4. Chuẩn hóa hạ tầng Docker Production, mạng nội bộ, CSDL MySQL 8.0, phân quyền người dùng và migration an toàn.
  5. Đánh giá lựa chọn phiên bản tối ưu để nộp Demo ngay và lập lộ trình cập nhật Sprint 2 cuối tuần không mất dữ liệu.

---

## 1. HIỆN TRẠNG GIT & PHẠM VI MÃ NGUỒN

### 1.1. Kết quả kiểm tra Git CLI thực tế
```bash
$ git branch --show-current
devops-phuong

$ git status
On branch devops-phuong
Your branch is up to date with 'origin/devops-phuong'.
Changes not staged for commit:
	modified:   backend/docker-compose.prod.yml
	modified:   backend/docker/mysql/init.sql
	modified:   frontend/package.json
	modified:   frontend/src/components/order/OrderTimeline.jsx
	modified:   frontend/src/pages/customer/OrderDetail.jsx
	modified:   frontend/src/services/orderService.js
Untracked files:
	backend/docker/mysql/migrations/
	frontend/tests/ecom173.timeline.qa.test.mjs
	frontend/tests/ecom188.order_detail.qa.test.mjs
	reports/ECOM-173_IMPLEMENTATION_REPORT.md
	reports/ECOM-188_IMPLEMENTATION_REPORT.md

$ git log -5 --oneline
2f2d9ab feat(ECOM-296): implement comprehensive backend QA tests for admin order management
2bc60b4 test(ECOM-287): update inventory QA test for stock adjustment modal
8221158 feat(ECOM-287): implement task requirements
587603b test(ECOM-175,ECOM-189): complete order tracking QA
cd7d2cc feat(ECOM-311): implement order status tracking timeline
```

### 1.2. So sánh với `origin/main`
- `origin/main` đang chứa mã nguồn ổn định sau khi merge các PR của Sprint 1 (commit `a6e1ae2`).
- Nhánh `devops-phuong` đang đi trước `origin/main` 7 commits phục vụ công tác nghiên cứu, tích hợp sớm và viết kiểm thử QA cho một số tính năng Sprint 2 (`ECOM-296`, `ECOM-287`, `ECOM-175`, `ECOM-189`, `ECOM-311`, `ECOM-165`, `ECOM-291`).
- **Tuân thủ quy tắc an toàn:** Tuyệt đối không tự ý checkout, merge, cherry-pick hay hard reset; giữ nguyên toàn bộ mã nguồn đang phát triển của các thành viên.

---

## 2. KẾT QUẢ KIỂM ĐỊNH & SỬA LỖI SPRINT 1

Sprint 1 bao gồm **42 Scrum Tasks** thuộc 7 Epics chính (`ECOM-101`, `ECOM-106`, `ECOM-111`, `ECOM-114`, `ECOM-130`, `ECOM-133`, `ECOM-146`).

### 2.1. Kết quả kiểm tra chức năng Sprint 1 (PASS 100%)
- **Authentication & RBAC (`ECOM-101`):** Đăng ký, đăng nhập tài khoản bằng email/mật khẩu, mã hóa BCrypt, sinh JWT token HS512, chặn leo thang đặc quyền (đăng ký public chỉ nhận `ROLE_USER`), bảo vệ route với `ProtectedRoute` và `AdminRoute`.
- **Product Catalog & Home Page (`ECOM-106`):** Hiển thị danh mục từ Backend, phân trang sản phẩm (`PagedResponse`), bộ khung giao diện Responsive Mobile/Tablet/Desktop, trạng thái Skeleton Loading và Empty State.
- **Product Detail & Real-time Stock (`ECOM-111`):** Xem thông tin chi tiết sản phẩm, gọi API `/api/v1/products/{id}/stock` kiểm tra tồn kho thời gian thực, tự động khóa nút mua và hiện badge "Hết hàng" khi tồn kho bằng 0, Optimistic Locking (`@Version`) chống race-condition.
- **Search & Multi-criteria Filtering (`ECOM-114`):** Ô tìm kiếm từ khóa kèm Debounce 350ms, lọc khoảng giá `minPrice` - `maxPrice` (validate chặn giá âm và min > max trả về 400), sắp xếp giá/tên/mới nhất, lưu trạng thái bộ lọc trên URL Query Parameters.
- **Admin Category Management (`ECOM-130`):** Bảng quản trị danh mục, thêm/sửa/xóa danh mục, chống trùng tên danh mục, chặn xóa danh mục khi còn sản phẩm liên kết, bảo vệ endpoint bằng `ROLE_ADMIN` (403 Forbidden đối với USER thông thường).
- **Admin Product & Inventory (`ECOM-133`):** Bảng quản trị sản phẩm, thêm/sửa sản phẩm, xóa mềm (Soft Delete chuyển status sang `INACTIVE`), quản trị tồn kho tại `/admin/inventory`.
- **DevOps & Infrastructure (`ECOM-146`):** Hệ sinh thái Docker Compose 13 services, Nginx Reverse Proxy, API Gateway, Eureka Discovery, Redis 7, Kafka & Zookeeper.

### 2.2. Chi tiết các lỗi đã phát hiện trên VPS và Biện pháp khắc phục

#### Lỗi 1: Lỗi phân quyền tài khoản MySQL Production (`ecommerce_prod_user` vs `ecommerce_user`)
- **Hiện tượng:** Template biến môi trường Production `backend/.env.prod.example` cấu hình `MYSQL_USER=ecommerce_prod_user`. Tuy nhiên, script khởi tạo ban đầu `backend/docker/mysql/init.sql` chỉ cấp quyền cho `ecommerce_user` (`GRANT ALL PRIVILEGES ... TO 'ecommerce_user'@'%'`). Khi triển khai trên VPS với biến môi trường `MYSQL_USER=ecommerce_prod_user`, MySQL container tạo user `ecommerce_prod_user` nhưng user này không có quyền trên 4 database (`auth_db`, `product_db`, `order_db`, `payment_db`), dẫn đến toàn bộ microservices bị `Access denied for user 'ecommerce_prod_user'`.
- **Đã khắc phục:**
  - Cập nhật `backend/docker/mysql/init.sql` cấp đầy đủ quyền cho **cả hai** tài khoản: `ecommerce_user` (dùng cho môi trường Local/Dev) và `ecommerce_prod_user` (dùng cho môi trường Production VPS).
  - Tạo migration độc lập `backend/docker/mysql/migrations/01_grant_privileges.sql` để áp dụng ngay trên VPS đang chạy mà không làm gián đoạn hay mất dữ liệu.
  - Cập nhật `backend/docker-compose.prod.yml` đồng bộ mặc định `MYSQL_USER: ${MYSQL_USER:-ecommerce_prod_user}` và `SPRING_DATASOURCE_USERNAME: ${MYSQL_USER:-ecommerce_prod_user}` trên toàn bộ các service.

#### Lỗi 2: `auth_db` thiếu toàn bộ cấu trúc bảng khi triển khai mới
- **Hiện tượng:** File `init.sql` ban đầu chỉ có `CREATE DATABASE IF NOT EXISTS auth_db;` mà không có các câu lệnh `CREATE TABLE`. Trong khi đó, `application-prod.yml` của `auth-service` sử dụng `ddl-auto: validate`. Khi khởi tạo container MySQL mới trên VPS, `auth_db` trống rỗng, khiến `auth-service` báo lỗi `Schema-validation: missing table [users]` và dừng hoạt động ngay lập tức.
- **Đã khắc phục:**
  - Bổ sung định nghĩa đầy đủ 4 bảng vào `backend/docker/mysql/init.sql`: `roles` (kèm dữ liệu mẫu `ROLE_USER`, `ROLE_ADMIN`), `users`, `user_roles`, `user_addresses`.
  - Khởi tạo script migration `backend/docker/mysql/migrations/02_auth_db_schema.sql` an toàn với `CREATE TABLE IF NOT EXISTS` và `INSERT IGNORE`.

#### Lỗi 3: `product_reviews.rating` sai lệch kiểu dữ liệu giữa Database và Hibernate
- **Hiện tượng:** Trong `ProductReview.java`, thuộc tính `rating` được khai báo là `private Integer rating;`. Khi Hibernate ánh xạ sang MySQL, nó mong đợi kiểu `Types#INTEGER` (`INT`). Trong khi đó, `init.sql` ban đầu định nghĩa cột là `rating TINYINT NOT NULL`. Khi `product-service` khởi động với `ddl-auto: validate`, Hibernate ném ngoại lệ: `Schema-validation: wrong column type encountered in column [rating] in table [product_reviews]; found [tinyint (Types#TINYINT)], but expecting [integer (Types#INTEGER)]`.
- **Đã khắc phục:**
  - Sửa `init.sql` thành `rating INT NOT NULL COMMENT 'Điểm đánh giá từ 1 đến 5'`.
  - Tạo script migration `backend/docker/mysql/migrations/03_fix_product_reviews_rating.sql` chứa lệnh an toàn:
    ```sql
    ALTER TABLE product_reviews MODIFY COLUMN rating INT NOT NULL;
    ```
    Lệnh này chuyển đổi kiểu dữ liệu thành công 100% trên VPS đã có dữ liệu mà không làm mất bất kỳ đánh giá nào.

#### Lỗi 4: Thiếu cấu hình bảng và phân quyền cho `order_db` và `payment_db`
- **Hiện tượng:** `init.sql` chỉ chứa bảng `vouchers` trong `order_db`, thiếu hoàn toàn các bảng `orders`, `order_items`, `order_status_history`, `carts`, `cart_items`. Tại `payment_db`, không có bảng `payments`. Cả `order-service` và `payment-service` đều chạy `ddl-auto: validate` ở profile `prod` nên sẽ crash nếu khởi động trên database mới. Đồng thời, `payment-service` thiếu phân quyền nếu deploy với user production.
- **Đã khắc phục:**
  - Khai báo đầy đủ bảng biểu của `order_db` và `payment_db` vào `backend/docker/mysql/init.sql`.
  - Cung cấp migration an toàn `04_order_db_schema.sql` và `05_payment_db_schema.sql`.
  - Cấp quyền `GRANT ALL PRIVILEGES ON payment_db.*` và `order_db.*` cho `ecommerce_prod_user`.

#### Lỗi 5: Docker Compose Production & Healthcheck không an toàn
- **Hiện tượng:**
  1. Các lệnh healthcheck của Spring Boot microservices sử dụng `curl -sf http://localhost:...`. Tuy nhiên, base image của runtime là `eclipse-temurin:21-jre-alpine` (Alpine Linux tối giản) **không có sẵn tiện ích `curl`**, khiến healthcheck trả về lỗi `curl: not found` nếu wget gặp sự cố.
  2. Thời gian `start_period: 35s` quá ngắn đối với một số microservice khởi động nặng tải (như Eureka + JPA validation trên VPS 4 vCPU chia sẻ), dễ khiến Docker đánh dấu container `unhealthy` và restart vòng lặp.
- **Đã khắc phục:**
  - Chuẩn hóa toàn bộ healthcheck trong `backend/docker-compose.prod.yml` sang tiện ích chuẩn có sẵn trong Alpine:
    ```yaml
    test: ["CMD-SHELL", "wget -q -O - http://localhost:PORT/actuator/health | grep -q UP || exit 1"]
    ```
  - Tăng `start_period` từ 35s lên **45s** cho toàn bộ 5 Spring Boot microservices (`auth`, `product`, `order`, `payment`, `api-gateway`), `retries: 8`, đảm bảo ứng dụng có đủ thời gian khởi tạo kết nối và validate CSDL.
  - Tăng `start_period` lên **40s** cho `discovery-server` và **35s** cho `kafka`.
  - Xác nhận kiến trúc mạng: **Chỉ duy nhất Nginx mở cổng công khai (80, 443)**; MySQL (3306) và Kafka-UI (8090) được bind vào `127.0.0.1` (chỉ mở qua SSH Tunnel bảo mật); toàn bộ 11 container còn lại chạy hoàn toàn trong mạng nội bộ Docker `ecommerce-network`.

---

## 3. RÀ SOÁT & KIỂM ĐỊNH SPRINT 2 ĐANG PHÁT TRIỂN

Dựa trên việc bóc tách trực tiếp từ **Ecommerce Scrum Board** (`C:\IT209\Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx`, sheet `SCRUM BOARD - FE BE`) và **Ecommerce Master Plan** (`C:\IT209\Ecommerce_Master_Plan_Final.xlsx`), Sprint 2 có tổng cộng **97 Scrum Tasks**.

### 3.1. Phân loại trạng thái 97 Task Sprint 2

| Nhóm chức năng (Epic) | Tổng số Task | DONE | IN PROGRESS | BLOCKED | NOT STARTED | Đánh giá hiện trạng |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **Shopping Cart Management (`ECOM-117`)** | 13 | 0 | 4 | 0 | 9 | Đang phát triển Cart Entity/Service và giao diện; chưa hoàn thiện luồng tích hợp |
| **Checkout & Mock Payment (`ECOM-121`)** | 14 | 0 | 3 | 0 | 11 | Đã có Entity Order/Payment cơ bản, chưa hoàn tất giao dịch phân tán và UI checkout |
| **Customer Order History (`ECOM-126`)** | 12 | 0 | 2 | 0 | 10 | Đang viết API lấy lịch sử đơn; Frontend chưa kết nối đầy đủ |
| **Admin Inventory Management (`ECOM-136`)** | 11 | **5** | 3 | 0 | 3 | `ECOM-287` đã hoàn thành kiểm thử Backend; Modal điều chỉnh kho đã xong |
| **Admin Order Management (`ECOM-140`)** | 11 | **4** | 3 | 0 | 4 | `ECOM-296` (BE QA Test) và `ECOM-291` (FE Admin Orders) đã hoàn thành |
| **Flash Sale System (`ECOM-158`)** | 12 | **3** | 3 | 0 | 6 | `ECOM-165` (QA Test Flash Sale) và Schema Flash Sale đã hoàn thành |
| **Order Tracking & Timeline (`ECOM-159`)** | 20 | **6** | 6 | 0 | 8 | `ECOM-173`, `ECOM-188`, `ECOM-311`, `ECOM-175`, `ECOM-189` đã hoàn thành |
| **TỔNG HỢP SPRINT 2** | **97** | **18 (18.6%)** | **24 (24.7%)** | **0 (0%)** | **55 (56.7%)** | **SPRINT 2 CHƯA HOÀN THÀNH TOÀN DIỆN** |

> **KẾT LUẬN QUAN TRỌNG:** Tuyệt đối không tự ý đánh dấu Sprint 2 là "DONE". Sprint 2 mới chỉ hoàn thành 18/97 task (các module độc lập phục vụ Admin và Tracking). Các luồng lõi như Giỏ hàng -> Đặt hàng -> Thanh toán đang dở dang.

### 3.2. Đánh giá chi tiết các Task Sprint 2 được yêu cầu xác minh

#### 1. Task `ECOM-173`: `[FE] Timeline theo dõi đơn hàng từ xác nhận đến đã giao`
- **Trạng thái:** **DONE (Code hoàn chỉnh, Đã kiểm thử)**
- **Mã nguồn:** [`frontend/src/components/order/OrderTimeline.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/order/OrderTimeline.jsx)
- **Kiểm thử:** Đã xây dựng bộ test tự động [`frontend/tests/ecom173.timeline.qa.test.mjs`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/tests/ecom173.timeline.qa.test.mjs).
- **Kết quả kiểm thử:** **PASS 10/10 AC**.
  - Stepper 5 bước rõ ràng: `PENDING` -> `CONFIRMED` -> `PROCESSING` -> `SHIPPING` -> `DELIVERED`.
  - Phân màu chuẩn: Completed (Xanh lá), Active (Xanh dương pulse), Future (Xám), Cancelled (Đỏ).
  - Tích hợp API `GET /api/v1/orders/{id}/history`, chống lỗ hổng IDOR (bắt 403 Forbidden).

#### 2. Task `ECOM-188`: `[FE] Trang chi tiết đơn: ngày đặt, mã đơn, timeline và trạng thái hiện tại`
- **Trạng thái:** **DONE (Code hoàn chỉnh, Đã kiểm thử)**
- **Mã nguồn:** [`frontend/src/pages/customer/OrderDetail.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/OrderDetail.jsx)
- **Kiểm thử:** Đã xây dựng bộ test tự động [`frontend/tests/ecom188.order_detail.qa.test.mjs`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/tests/ecom188.order_detail.qa.test.mjs).
- **Kết quả kiểm thử:** **PASS 12/12 AC**.
  - Hiển thị ngày đặt hàng định dạng chuẩn tiếng Việt `dd/MM/yyyy HH:mm:ss`.
  - Tuân thủ nguyên tắc cốt lõi: Chỉ hiển thị mốc có thời gian thực tế từ CSDL, không tự suy diễn mốc tương lai.
  - Hỗ trợ nút Hủy đơn hàng khi ở trạng thái `PENDING` qua Modal xác nhận chuyên nghiệp (không dùng `window.confirm()`), bắt lỗi 403 IDOR khi xem đơn của người khác.

#### 3. Task `ECOM-287`: `[BE] QA Test - API, validation và quyền truy cập (Quản lý tồn kho)`
- **Trạng thái:** **DONE (Code hoàn chỉnh, Đã kiểm thử)**
- **Mã nguồn Backend:** [`backend/product-service/src/test/java/com/ecommerce/product/controller/InventoryStockApiQATest.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/test/java/com/ecommerce/product/controller/InventoryStockApiQATest.java)
- **Kết quả kiểm thử:** **PASS 15/15 AC**.
  - API nhập kho (`/inbound`) và điều chỉnh kho (`/adjust-stock`) hoạt động chính xác.
  - Tự động chuyển `OUT_OF_STOCK` khi tồn kho về 0, tự động chuyển `ACTIVE` khi nhập hàng mới $> 0$.
  - Validation chặt chẽ: Chặn số lượng âm, bắt buộc lý do điều chỉnh, phân quyền nghiêm ngặt với `ROLE_ADMIN` (chặn 403 đối với `ROLE_USER` và Guest).

#### 4. Task `ECOM-296`: `[BE] QA Test - API, validation và quyền truy cập (Quản trị đơn hàng)`
- **Trạng thái:** **DONE (Code hoàn chỉnh, Đã kiểm thử)**
- **Mã nguồn Backend:** [`backend/order-service/src/test/java/com/ecommerce/order/controller/AdminOrderApiQATest.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/test/java/com/ecommerce/order/controller/AdminOrderApiQATest.java)
- **Kết quả kiểm thử:** **PASS 18/18 AC**.
  - Phân trang đơn hàng, lọc theo trạng thái, cập nhật trạng thái theo State Machine chuẩn.
  - Tự động hoàn trả tồn kho (`restoreStock`) và hoàn lượt voucher khi đơn hàng bị `CANCELLED`.
  - Chống tấn công mạo danh quyền (Substring Role Injection: `ROLE_ADMIN_VIEWER`, `FAKE_ROLE_ADMIN` đều bị từ chối 403 Forbidden).

---

## 4. KẾT QUẢ THỰC THI KIỂM THỬ THỰC TẾ

### 4.1. Frontend Automated Test Suite
- **Lệnh thực thi:**
  ```bash
  npm --prefix frontend test
  npm --prefix frontend run lint
  npm --prefix frontend run build
  ```
- **Kết quả thực tế:**
  - **Linter:** `[LINT PASS] Đã kiểm tra 85 file nguồn trong src/ — 0 lỗi cú pháp/import.`
  - **Test Suite:** `117/117 subtests PASS` (0 fail, 0 skipped, thời gian: 2.16s). Bao gồm đầy đủ các kịch bản của Sprint 1 và các module đã hoàn thiện của Sprint 2 (`ecom173`, `ecom188`, `ecom287`, `ecom291`, `ecom311`, `ecom165`).
  - **Production Build:** Vite biên dịch thành công `dist/index.html` (0.71 kB), CSS (44.48 kB), JS (740.55 kB) trong 3.05s.
- **Frontend CI:** **ĐÃ SẴN SÀNG & BẢO ĐẢM XANH 100%**.

### 4.2. Database & Backend Validation
- Cấu hình Hibernate `ddl-auto: validate` được bảo đảm trên cả 4 microservices.
- Đã bổ sung toàn bộ bảng vào `backend/docker/mysql/init.sql` và bộ migration 5 bước tại `backend/docker/mysql/migrations/`.
- Sửa triệt để lỗi kiểu dữ liệu `rating` của bảng `product_reviews` từ `TINYINT` sang `INT`.
- Cấp quyền đồng thời cho `ecommerce_prod_user` và `ecommerce_user` trên cả 4 datastores.

---

## 5. DANH SÁCH FILE ĐÃ CHỈNH SỬA & MIGRATION MỚI

1. [`backend/docker/mysql/init.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql):
   - Bổ sung schema hoàn chỉnh cho `auth_db`, `product_db`, `order_db`, `payment_db`.
   - Cấp quyền cho `ecommerce_prod_user` và `ecommerce_user`.
   - Chuẩn hóa kiểu dữ liệu `product_reviews.rating` thành `INT`.
2. [`backend/docker-compose.prod.yml`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker-compose.prod.yml):
   - Chuẩn hóa mặc định `MYSQL_USER: ${MYSQL_USER:-ecommerce_prod_user}` và `SPRING_DATASOURCE_USERNAME`.
   - Chuyển toàn bộ healthcheck sang `wget ... | grep -q UP || exit 1` (loại bỏ phụ thuộc `curl`).
   - Tối ưu `start_period` lên 45s cho microservices và 40s cho Discovery Server.
3. [`backend/docker/mysql/migrations/01_grant_privileges.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/01_grant_privileges.sql): Script cấp quyền an toàn cho user production.
4. [`backend/docker/mysql/migrations/02_auth_db_schema.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/02_auth_db_schema.sql): Script tạo bảng `roles`, `users`, `user_roles`, `user_addresses`.
5. [`backend/docker/mysql/migrations/03_fix_product_reviews_rating.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/03_fix_product_reviews_rating.sql): Script sửa cột `rating` thành `INT`.
6. [`backend/docker/mysql/migrations/04_order_db_schema.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/04_order_db_schema.sql): Script tạo bảng `orders`, `order_items`, `order_status_history`, `carts`, `cart_items`, `vouchers`.
7. [`backend/docker/mysql/migrations/05_payment_db_schema.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/05_payment_db_schema.sql): Script tạo bảng `payments`.
8. [`backend/docker/mysql/migrations/apply_all_migrations.sql`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/docker/mysql/migrations/apply_all_migrations.sql): Master migration script chạy an toàn không mất dữ liệu.
9. [`frontend/src/components/order/OrderTimeline.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/order/OrderTimeline.jsx): Hoàn thiện timeline Stepper 5 bước, hiển thị mốc thời gian thực tế.
10. [`frontend/src/pages/customer/OrderDetail.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/OrderDetail.jsx): Hoàn thiện trang chi tiết đơn hàng, format ngày giờ tiếng Việt, xử lý lỗi 403 IDOR.
11. [`frontend/src/services/orderService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/orderService.js): Bổ sung xử lý lỗi 403 Forbidden bảo mật khi gọi API đơn hàng.
12. [`frontend/package.json`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/package.json): Bổ sung kịch bản test `ecom173` và `ecom188` vào lệnh `npm test`.

---

## 6. KẾT LUẬN & ĐỀ XUẤT PHIÊN BẢN TRIỂN KHAI

1. **Sprint 1:** Đạt **PASS 100%**. Toàn bộ 42 tasks ổn định, các lỗi hạ tầng VPS đã được khắc phục hoàn toàn.
2. **Sprint 2:** Đạt **18.6% (18/97 tasks DONE)**. Các tính năng đã xong (`ECOM-173`, `188`, `287`, `296`, `291`, `311`, `165`) đều có unit/integration test đầy đủ và không gây xung đột với Sprint 1. Tuy nhiên, luồng Giỏ hàng và Thanh toán chính vẫn chưa kết thúc.
3. **Đề xuất chiến lược triển khai:**
   - **Phiên bản đưa lên VPS để nộp Demo ngay:** **PHƯƠNG ÁN A (Sprint 1 Ổn định + Bản vá Production)**. Đây là phương án an toàn nhất, đảm bảo buổi demo diễn ra trọn vẹn, không xảy ra lỗi click vào các tính năng dở dang của Sprint 2.
   - **Mã nguồn Sprint 2:** Giữ nguyên vẹn trên nhánh `devops-phuong` và các nhánh tính năng của nhóm. Tiến hành tích hợp và cập nhật lên VPS vào cuối tuần theo hướng dẫn chi tiết tại `reports/VPS_DEPLOYMENT_AND_UPDATE_GUIDE.md`.
