# BÁO CÁO TỔNG KIỂM TRA SPRINT 2 (FINAL SPRINT 2 AUDIT & GAP ANALYSIS)
## Dự án: ShopMart E-Commerce Platform
**Ngày thực hiện kiểm tra:** 07/11/2026  
**Đơn vị kiểm định:** Senior Technical Lead, Scrum Master, Fullstack Lead, QA Lead & DevOps Engineer  
**Nhánh kiểm tra:** `devops-phuong` (HEAD: `44b8a1f`) đối chiếu với `origin/master` (`7935d5e`)  
**Môi trường:** Local Workspace & CI Simulation (Java 21, Node.js 20, Vite, Docker Compose, MySQL 8.0)

---

## 1. TỔNG QUAN ĐỊNH LƯỢNG SPRINT 2

| Chỉ số | Số lượng / Kết quả | Ghi chú chi tiết |
|---|---|---|
| **Tổng số Epic trong Sprint 2** | **2 Epic** | `CUSTOMER` (58 task) và `GUEST` (39 task bao gồm Admin Management) |
| **Tổng số Feature (Mục mẹ - Level 1)** | **7 Features** | ECOM-117, ECOM-121, ECOM-126, ECOM-136, ECOM-140, ECOM-157, ECOM-159 |
| **Tổng số Nhóm công việc (Group - Level 2)** | **16 Groups** | 7 Group [FE], 7 Group [BE], 2 Group [QA] |
| **Tổng số Chi tiết công việc (Subtask - Level 3)** | **74 Subtasks** | 32 Task [FE], 39 Task [BE], 3 Task [QA] |
| **TỔNG SỐ TASK ID DUY NHẤT** | **97 Task IDs** | Đối chiếu 100% giữa Scrum Board và Master Plan (Row II là Header) |
| **Số Task DONE thực tế (Code + Test đầy đủ)** | **94 Tasks** (đã merge master) + **3 Tasks** (trên devops-phuong) | 100% có code và test pass |
| **Số Task PARTIAL (Thiếu merge vào master)** | **3 Tasks** | `ECOM-313`, `ECOM-314`, `ECOM-318` (Commit `44b8a1f` chưa vào master) |
| **Số Task NOT STARTED** | **0 Tasks** | Không có task nào bị bỏ sót chưa code |
| **Số Task BLOCKED** | **0 Tasks** | Không có dependency bị nghẽn |
| **Số Task FAILED** | **0 Tasks** | Tất cả bài test đều PASS |
| **Số Task UNVERIFIED** | **0 Tasks** | Đã xác minh 100% bằng chứng code và log test thực |
| **Tỷ lệ hoàn thành code trên devops-phuong** | **100% (97/97 Tasks)** | Toàn bộ 7 Feature đã có code và test tự động |
| **Tỷ lệ hoàn thành merge vào nhánh master** | **96.9% (94/97 Tasks)** | Còn 3 task thuộc commit `44b8a1f` chờ PR vào master |

---

## 2. KẾT QUẢ KIỂM THỬ KỸ THUẬT TOÀN DIỆN

### 2.1. Frontend Test & Build (Node.js 20, React 18, Vite)
- **Automated Tests:** `npm --prefix frontend test`
  - **Tổng số test suite:** 13 test suites (24 file test)
  - **Tổng số test cases:** **313 tests**
  - **Kết quả:** **313 PASS, 0 FAIL, 0 CANCELLED, 0 SKIPPED** (Thời gian chạy: 19.5 giây)
- **Lint Check:** `npm --prefix frontend run lint`
  - **Kết quả:** **PASS** (Quét sạch 87 file nguồn trong `src/` — 0 lỗi cú pháp/import)
- **Production Build:** `npm --prefix frontend run build`
  - **Kết quả:** **PASS** (Vite build thành công trong 4.57 giây, tạo bundle `dist/` đạt chuẩn)

### 2.2. Backend Test & Multi-project Build (Java 21, Spring Boot 3, Gradle 8.7)
- **Automated Tests:** `gradlew.bat test --no-daemon --max-workers=2`
  - **Tổng số unit & integration tests:** **424 JUnit 5 tests**
  - **Phân bổ theo Microservice:**
    - `api-gateway`: 12 tests (0 failures)
    - `auth-service`: 53 tests (0 failures)
    - `discovery-server`: 1 test (0 failures)
    - `order-service`: 166 tests (0 failures)
    - `payment-service`: 20 tests (0 failures)
    - `product-service`: 172 tests (0 failures)
  - **Kết quả:** **424 PASS, 0 FAIL, 0 ERROR, 0 SKIPPED** (Build thời gian: 53 giây)
  - **Hồi quy Payment Service:** Cả 20 test của `payment-service` (bao gồm `mockPay` từng gặp lỗi trong ECOM-269) đã hoạt động chính xác 100%.

### 2.3. Cơ sở dữ liệu & Docker Architecture
- **MySQL Schemas:** Tệp `backend/docker/mysql/init.sql` khởi tạo 4 database độc lập (`auth_db`, `product_db`, `order_db`, `payment_db`) với đầy đủ bảng cho Sprint 2:
  - `carts`, `cart_items` (Giỏ hàng)
  - `orders`, `order_items`, `payments` (Đơn hàng & Thanh toán mô phỏng)
  - `order_status_history` (Nhật ký timeline theo dõi đơn hàng)
  - `flash_sale_campaigns`, `flash_sale_items` (Chương trình Flash Sale)
  - `categories`, `products`, `users`, `roles`, `user_addresses`
- **Docker Compose:** Cả 2 tệp `docker-compose.yml` và `docker-compose.prod.yml` đều hợp lệ, cổng dịch vụ nội bộ được bảo vệ (Port Hardening chỉ lắng nghe `127.0.0.1`), Nginx Reverse Proxy điều phối port 80/443.
- **API Gateway Routing:** Tệp `application.yml` định tuyến chuẩn xác toàn bộ endpoint `/api/v1/auth/**`, `/api/v1/users/**`, `/api/v1/products/**`, `/api/v1/cart/**`, `/api/v1/orders/**`, `/api/v1/payments/**`, `/api/v1/flash-sales/**` kèm CircuitBreakers và RateLimiter chống spam checkout.

### 2.4. GitHub Actions CI/CD
- Quy trình CI tại `.github/workflows/ci.yml` định nghĩa 4 job tự động:
  1. `frontend-ci`: Lint, Test, Vite build dist.
  2. `backend-ci`: Wrapper check, JDK 21, Gradle test, bootJar.
  3. `docker-validation`: Kiểm tra 7 Dockerfiles, bind mounts, port hardening.
  4. `security-checks`: Quét `.env` nhạy cảm, chặn privilege escalation trong RegisterRequest, bắt buộc `ddl-auto: validate` trong môi trường prod.
- Đã kiểm tra mô phỏng local: Cả 4 bài kiểm tra đều thỏa mãn 100%.

---

## 3. ĐÁNH GIÁ 7 EPIC / FEATURE THỰC TẾ TRONG SPRINT 2

```mermaid
graph TD
    S2[Sprint 2: 97 Tasks]
    S2 --> F1[ECOM-117: Giỏ hàng - 11 Tasks]
    S2 --> F2[ECOM-121: Checkout & Payment - 11 Tasks]
    S2 --> F3[ECOM-126: Lịch sử đơn & Hồ sơ - 10 Tasks]
    S2 --> F4[ECOM-136: Quản lý tồn kho - 11 Tasks]
    S2 --> F5[ECOM-140: Quản trị đơn hàng - 10 Tasks]
    S2 --> F6[ECOM-157: Flash Sale - 18 Tasks]
    S2 --> F7[ECOM-159: Timeline Tracking - 16 Tasks]

    F1 --> F1_OK[Status: DONE 100% | Merged]
    F2 --> F2_OK[Status: DONE 100% | Merged]
    F3 --> F3_OK[Status: DONE 100% | Merged]
    F4 --> F4_OK[Status: DONE 100% | Merged]
    F5 --> F5_OK[Status: DONE 100% | Merged]
    F6 --> F6_OK[Status: DONE 100% | Merged]
    F7 --> F7_WARN[Status: 13 Merged, 3 Unmerged to Master]
```

1. **ECOM-117: Quản lý giỏ hàng (Shopping Cart Management):** Hoàn thành xuất sắc. Đầy đủ UI, responsive 320px-1200px, tính tổng tiền server, kiểm tra tồn kho, CartContext, API backend CRUD giỏ hàng.
2. **ECOM-121: Đặt hàng & Thanh toán mô phỏng (Checkout & Mock Payment):** Hoàn thành xuất sắc. Có kiểm tra trừ tồn kho tự động với `@Transactional`, tích hợp cổng thanh toán mô phỏng `MOCK_ONLINE` và `COD`, xử lý đơn hàng thành công, xóa giỏ hàng tự động.
3. **ECOM-126: Lịch sử đơn hàng & Hồ sơ cá nhân (Order History & User Profile):** Hoàn thành xuất sắc. Khách hàng xem danh sách đơn, chi tiết đơn, hủy đơn khi ở trạng thái PENDING (hoàn kho tự động), cập nhật hồ sơ và địa chỉ, có cơ chế bảo vệ dữ liệu chống IDOR.
4. **ECOM-136: Quản lý tồn kho (Manage Inventory):** Hoàn thành xuất sắc. Trang Admin Inventory lọc sản phẩm sắp hết hàng, modal điều chỉnh tồn kho `StockAdjustmentModal`, khóa không âm, xử lý tranh chấp đồng thời bằng `@Version` Optimistic Locking.
5. **ECOM-140: Quản trị đơn hàng (Manage Orders):** Hoàn thành xuất sắc. Admin xem bảng đơn hàng, lọc theo trạng thái, modal chuyển trạng thái đơn hàng tuân thủ state machine nghiêm ngặt, phân quyền `ROLE_ADMIN`.
6. **ECOM-157: Flash Sale:** Hoàn thành xuất sắc. Khách hàng xem trang Flash Sale có đồng hồ đếm ngược, thanh tiến độ số lượng đã bán, giới hạn mua mỗi khách, Admin tạo/sửa/kích hoạt chiến dịch, kiểm thử hết hạn sale tự động.
7. **ECOM-159: Theo dõi đơn hàng chi tiết (Order Tracking):** Hoàn thành về mặt code và test. Timeline 5 bước hiển thị trạng thái sinh động, bảng `order_status_history` lưu vết đầy đủ người cập nhật và thời gian. Có cơ chế đồng bộ trạng thái realtime giữa Admin và Customer. Tuy nhiên, 3 task cuối (`ECOM-313`, `ECOM-314`, `ECOM-318`) đang nằm trên commit `44b8a1f` của nhánh `devops-phuong` và chưa được merge vào `master`.

---

## 4. KẾT LUẬN VÀ KHẢ NĂNG DEMO

- **Trạng thái trên nhánh `devops-phuong`:** **READY FOR DEMO**  
  (Tất cả 7 chức năng hoạt động hoàn hảo, 313 test frontend PASS, 424 test backend PASS, build dist và JAR executable không có lỗi).
- **Trạng thái trên nhánh `master`:** **READINESS UNVERIFIED / NOT READY UNTIL MERGE**  
  (Nhánh `master` đang ở commit `7935d5e`, còn thiếu commit `44b8a1f` của 3 task `ECOM-313`, `ECOM-314`, `ECOM-318`).
- **Hành động bắt buộc để nghiệm thu 100%:** Tạo Pull Request #49 để merge `devops-phuong` vào `master`. Sau khi merge, toàn bộ Sprint 2 chính thức hoàn thành 100% trên `master`.
