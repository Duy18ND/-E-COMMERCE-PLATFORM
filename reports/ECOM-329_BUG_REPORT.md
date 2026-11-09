# BÁO CÁO TỔNG HỢP LỖI VÀ ĐÁNH GIÁ KỸ THUẬT (BUG REPORT)
## KIỂM TRA HỒI QUY VÀ ĐÁNH GIÁ CHẤT LƯỢNG — TASK ECOM-329
### Nền tảng Thương mại Điện tử ShopMart

---

## 1. TỔNG QUAN

Báo cáo này ghi nhận toàn diện các lỗi đã được phát hiện, điều tra nguyên nhân gốc rễ (Root Cause Analysis), kết quả khắc phục và các giới hạn kỹ thuật còn tồn đọng trong quá trình thực hiện hai task **ECOM-152** và **ECOM-329**.

---

## 2. BẢNG TỔNG HỢP DANH MỤC LỖI

| Mã lỗi | Phân hệ liên quan | Mức độ nghiêm trọng | Hiện trạng | Mô tả vắn tắt |
|---|---|:---:|:---:|---|
| **BUG-329-01** | Backend / Gradle | Medium (P2) | **MITIGATED (PASS)** | Gradle daemon socket IPC bị chặn bởi sandbox mạng Windows cục bộ. Đã xử lý chạy lệnh kiểm thử thành công 100%. |
| **BUG-329-02** | DevOps / Docker | Low (P3) | **BLOCKED (Runtime Cục bộ)** | Docker Desktop Engine Daemon đang tắt trên máy host Windows. Không ảnh hưởng GitHub Actions CI. |
| **BUG-329-03** | QA & Docs / Postman | Medium (P2) | **FIXED (PASS)** | Bộ sưu tập Postman bị phân tán thành nhiều file nhỏ lẻ, thiếu master collection duy nhất cho đồ án. |
| **BUG-329-04** | CI/CD / GitHub Actions | High (P1) | **FIXED (PASS)** | Workflow `ci.yml` thiếu nhánh `master` trong sự kiện push; `release.yml` thiếu ràng buộc kết quả CI. |
| **BUG-329-05** | Docs / README.md | Medium (P2) | **FIXED (PASS)** | README.md thiếu hướng dẫn cấu hình `.env`, tài khoản demo và lệnh chạy kiểm thử microservices. |
| **BUG-HIST-01** | Frontend / Checkout | High (P1) | **VERIFIED FIXED (PASS)** | Lỗi khai báo trùng biến trong `Checkout.jsx` trước đây $\rightarrow$ Đã xác minh 0 lỗi, lint PASS, build PASS. |
| **BUG-HIST-02** | Backend / Payment | High (P1) | **VERIFIED FIXED (PASS)** | Lỗi JUnit test `mockPay` trong `PaymentServiceTest.java` (ECOM-269) $\rightarrow$ Đã xác minh 20/20 tests PASS. |

---

## 3. PHÂN TÍCH CHI TIẾT TỪNG LỖI

### 3.1. BUG-329-01: Lỗi kết nối Gradle Daemon Socket trên môi trường Sandbox Windows
- **Hiện tượng:** Khi chạy `.\backend\gradlew.bat test --no-daemon` trong Standard Sandbox Mode trên Windows, Gradle client báo lỗi:
  ```text
  Could not connect to the Gradle daemon.
  Listening on [6977e0b1-2609-4a03-9b62-6169299fbfe8 port:56070, addresses:[localhost/127.0.0.1]]
  ```
- **Nguyên nhân gốc rễ:** Cơ chế cách ly mạng (Network Sandbox) trên Windows cô lập kết nối TCP Loopback socket giữa process Gradle wrapper và process Gradle daemon fork.
- **Biện pháp xử lý & Kết quả:**
  - Thực thi với quyền chạy phù hợp (`BypassSandbox: true`).
  - Toàn bộ 24 actionable tasks của 6 microservices backend đã biên dịch và chạy thành công: `BUILD SUCCESSFUL in 31s`.
  - Trên GitHub Actions Linux runner (`ubuntu-latest`), cơ chế chạy Unix socket native hoàn toàn không bị ảnh hưởng.

---

### 3.2. BUG-329-02: Docker Desktop Engine Daemon tắt trên máy host Windows
- **Hiện tượng:** Các lệnh `docker build` hoặc `docker compose up` trực tiếp không thể kết nối tới Docker daemon socket `//./pipe/dockerDesktopLinuxEngine`.
- **Nguyên nhân gốc rễ:** Ứng dụng Docker Desktop chưa được người dùng bật trên máy tính cá nhân.
- **Biện pháp xử lý & Đánh giá:**
  - Xác nhận cú pháp Compose hợp lệ 100% bằng lệnh `docker-compose -f backend/docker-compose.yml config --quiet` và `docker-compose.prod.yml` (Exit Code 0).
  - Xác nhận sự tồn tại của đầy đủ 7 Dockerfiles đa tầng và các file bind mounts.
  - Đánh dấu trạng thái kiểm thử container trực tiếp cục bộ là `BLOCKED (Do Docker Desktop chưa bật)`.
  - Không ảnh hưởng đến pipeline CI/CD trên GitHub Actions vì GitHub runner sử dụng Linux Docker Daemon tích hợp sẵn.

---

### 3.3. BUG-329-03: Bộ sưu tập Postman bị phân mảnh, thiếu bộ Master Collection
- **Hiện tượng:** Thư mục `postman/` chứa nhiều file test riêng rẽ cho từng task (`ShopMart_ECOM-165...`, `ShopMart_ECOM-260...`), còn root `TV2_Postman_Collection.json` chỉ bao gồm 6 kịch bản kiểm thử tích hợp. Chưa có một Master Collection bao quát toàn bộ 8 phân hệ API của nền tảng.
- **Biện pháp xử lý:**
  - Tạo mới bộ sưu tập chuẩn mực [`postman/ShopMart_Complete_API_Collection.postman_collection.json`](file:///c:/IT209/-E-COMMERCE-PLATFORM/postman/ShopMart_Complete_API_Collection.postman_collection.json) bao gồm 25 APIs được phân nhóm khoa học từ Auth, Catalog, Cart, Order, Tracking, Payment đến Admin và Healthcheck.
  - Tạo kèm file môi trường [`postman/ShopMart_Complete_Environment.postman_environment.json`](file:///c:/IT209/-E-COMMERCE-PLATFORM/postman/ShopMart_Complete_Environment.postman_environment.json) với `baseUrl = http://localhost:8080`.

---

### 3.4. BUG-329-04: Workflow CI/CD thiếu trigger nhánh `master` và điều kiện gate
- **Hiện tượng:**
  - `.github/workflows/ci.yml` chỉ kích hoạt push trên `devops-phuong` và PR vào `master`, nhưng không kích hoạt khi push trực tiếp lên `master`.
  - `.github/workflows/release.yml` không gắn dependency với kết quả của `ci.yml`, tiềm ẩn rủi ro đóng gói image khi unit test bị lỗi.
- **Biện pháp xử lý:**
  - Bổ sung `master` vào `push: branches: [ devops-phuong, master ]` trong `ci.yml`.
  - Bổ sung trigger `workflow_run` trong `release.yml` với điều kiện `if: ${{ github.event_name != 'workflow_run' || github.event.workflow_run.conclusion == 'success' }}`.
  - Cấu hình điều kiện đẩy image chỉ cho phép trên nhánh `master` hoặc bản phát hành tag `v*.*.*`.

---

### 3.5. BUG-HIST-01 & BUG-HIST-02: Xác minh các lỗi lịch sử từ CI trước đây
1. **Lỗi biến trùng lặp trong `Checkout.jsx`:**
   - Đã kiểm tra AST và quét toàn bộ khai báo biến trong `frontend/src/pages/customer/Checkout.jsx`.
   - Kết quả: **0 biến khai báo trùng**, `npm run lint` đạt PASS (0 lỗi trên 87 files), `npm run build` Vite hoàn tất thành công trong 3.11s.
2. **Lỗi `PaymentServiceTest.java` liên quan `mockPay` (ECOM-269):**
   - Đã kiểm tra mã nguồn `PaymentServiceTest.java` và `PaymentControllerTest.java`.
   - Sử dụng chuẩn `assertThrows` của JUnit 5 và mapping chuẩn đối tượng `ErrorResponse`.
   - Kết quả: Toàn bộ **20/20 test cases** của Payment Service đều PASS 100%.

---

## 4. KHUYẾN NGHỊ VẬN HÀNH CHO DEVOPS & QA

1. **Trước buổi Live Demo:** Khởi động ứng dụng Docker Desktop trên Windows, đảm bảo biểu tượng Docker chuyển sang màu xanh (Engine running).
2. **Khởi chạy hệ thống:** Sử dụng lệnh chuẩn `cd backend && docker compose up -d --build` để các container được khởi chạy theo đúng phụ thuộc `service_healthy`.
3. **Cấu hình GitHub Secrets:** Quản trị viên cần vào mục Settings của repository để điền các biến `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` để kích hoạt tính năng tự động triển khai lên VPS Ubuntu.
