# PRESENTATION EVIDENCE — NGUỒN ẢNH, SỐ LIỆU & BẰNG CHỨNG THỰC TẾ

Tài liệu này ghi nhận minh bạch toàn bộ nguồn hình ảnh, sơ đồ, số liệu và bằng chứng mã nguồn được sử dụng trong bộ slide `SHOPMART_PRESENTATION.pptx`.

---

## 1. Tài liệu tham khảo bố cục

- **Slide Gamma mẫu:** `https://gamma.app/docs/TEN-DU-AN-SAN-PHAM-WEB-kp7q8lusie5yf1a?mode=doc`
- **Mức độ tham khảo:** Chỉ tham khảo cấu trúc card-based, nhịp điệu zig-zag, cách phân cấp tiêu đề và bảng màu sáng/xanh dương. **Không sao chép nội dung và không sử dụng lại bất kỳ hình ảnh nào từ Gamma.**

---

## 2. Danh sách Tài sản Hình ảnh (`reports/presentation/assets/`)

### 2.1. Ảnh chụp Giao diện Thực tế ShopMart (Live Capture từ `http://localhost:5173`)

| Tên file trong `assets/` | Slide sử dụng | Trang ứng dụng thực tế | Ghi chú xác thực |
|---|---|---|---|
| `ui_customer_home.png` | Slide 10 | `/` (`Home.jsx`) | Chụp trực tiếp trên Vite dev server (`1440x900`). |
| `ui_customer_products.png` | Slide 10 | `/products` (`Products.jsx`) | Chụp trực tiếp bộ lọc giá, danh mục, phân trang. |
| `ui_customer_detail.png` | Slide 10 | `/products/1` (`ProductDetail.jsx`) | Chụp trực tiếp trang chi tiết sản phẩm. |
| `ui_customer_flashsale.png` | Slide 10 | `/flash-sale` (`FlashSale.jsx`) | Chụp trực tiếp đếm ngược & tiến độ Flash Sale. |
| `ui_customer_login.png` | Slide 10 | `/login` (`Login.jsx`) | Chụp trực tiếp form đăng nhập & Quick-fill demo. |
| `ui_admin_products.png` | Slide 11 | `/admin/products` (`Products.jsx`) | Chụp trực tiếp Admin Portal (mock store khi BE offline). |
| `ui_admin_orders.png` | Slide 11 | `/admin/orders` (`Orders.jsx`) | Chụp trực tiếp bảng quản lý 8 trạng thái đơn hàng. |
| `ui_admin_sales.png` | Slide 11 | `/admin/sales` (`AdminSales.jsx`) | Chụp trực tiếp giao diện quản lý chiến dịch Sale. |
| `ui_admin_dashboard.png` | Slide 11 | `/admin` (`Dashboard.jsx`) | Hiển thị Graceful Error State thực tế khi Backend chưa bật. |

### 2.2. Sơ đồ & Biểu đồ Kỹ thuật Tự tạo từ Mã nguồn (`matplotlib` 240 DPI)

| Tên file trong `assets/` | Slide sử dụng | Nguồn dữ liệu đối chiếu trong Repository |
|---|---|---|
| `diagram_business_flow.png` | Slide 6 | `README.md` (Sequence Diagram Saga), `OrderServiceImpl.java`, `KafkaPaymentConsumer.java` |
| `diagram_system_architecture.png` | Slide 7 | `README.md`, `backend/api-gateway/src/main/resources/application.yml`, `03_BACKEND_MICROSERVICES_AUDIT.md` |
| `diagram_erd.png` | Slide 9 | `backend/docker/mysql/init.sql` (4 DBs, 17 tables), `05_DATABASE_AUDIT.md` |
| `chart_testing_quality.png` | Slide 12 | `01_ALL_SPRINT_TASK_STATUS.md`, `10_TEST_EXECUTION_REPORT.md`, `SONARQUBE_DUPLICATION_FIX_REPORT.md` |
| `diagram_devops_cicd.png` | Slide 13 | `.github/workflows/ci.yml`, `release.yml`, `deploy.yml`, `09_DEVOPS_VPS_AUDIT.md` |

### 2.3. Hình ảnh Minh họa Công nghệ AI tạo mới (Không dùng cho UI giả)

| Tên file trong `assets/` | Slide sử dụng | Mục đích minh họa |
|---|---|---|
| `hero_ecommerce.jpg` | Slide 1 | Minh họa thương mại điện tử hiện đại trên trang bìa. |
| `problem_solution.jpg` | Slide 3 | Minh họa bài toán lưu lượng cao, phân tán & giao hàng. |
| `thank_you_tech.jpg` | Slide 15 | Minh họa đội ngũ kỹ thuật hoàn thành dự án trên trang cảm ơn. |

---

## 3. Bằng chứng Số liệu & Trạng thái Thực tế

- **Tổng số ECOM Tasks:** `235` tasks (`Sprint 1`: 78/78 DONE, `Sprint 2`: 97/97 DONE, `Sprint 3`: 59/60 DONE, `1` PARTIAL là `ECOM-154` chờ SSH VPS thật) — Nguồn: `reports/final-audit/01_ALL_SPRINT_TASK_STATUS.md`.
- **Frontend Kiểm thử & Build:** `npm --prefix frontend run lint` (`93/93` files, `0` errors), `npm --prefix frontend test` (`415/415` PASS trên `21` suites / `32` file `.test.mjs` trong `4.83s`), `vite build` (`2.76s`) — Nguồn: `reports/final-audit/10_TEST_EXECUTION_REPORT.md`.
- **Backend Kiểm thử & Build:** `.\backend\gradlew.bat -p backend test bootJar` (`23/23` test classes PASS trên 6 microservices, `BUILD SUCCESSFUL in 3m 21s`) — Nguồn: `reports/final-audit/10_TEST_EXECUTION_REPORT.md`.
- **Database Schema:** `4` MySQL Databases (`auth_db`: 4 bảng, `product_db`: 5 bảng, `order_db`: 7 bảng, `payment_db`: 1 bảng — tổng `17` bảng), đồng bộ `100%` với `ddl-auto: validate` — Nguồn: `backend/docker/mysql/init.sql` & `reports/final-audit/05_DATABASE_AUDIT.md`.
- **SonarCloud PR #68:**
  - Security rule `githubactions:S7637`: Đã ghim full 40-char commit SHA cho `18/18` vị trí `uses:` trên 3 file workflow — Nguồn: `reports/final-audit/SONARQUBE_QUALITY_GATE_FIX_REPORT.md`.
  - Duplication on New Code: Giảm từ `49` dòng (`21.3%`) xuống `0` overlap mới tại local; chờ commit/push để SonarCloud quét lại — Nguồn: `reports/final-audit/SONARQUBE_DUPLICATION_FIX_REPORT.md`.
- **Trạng thái Hạn chế / Chờ Môi trường:** Docker Desktop daemon trên máy local đang tắt (`open //./pipe/docker_engine`) và chưa có SSH credentials Ubuntu VPS thật nên chưa chạy live container `docker compose up -d` và Certbot SSL — Nguồn: `reports/final-audit/12_REMAINING_ISSUES.md`.
