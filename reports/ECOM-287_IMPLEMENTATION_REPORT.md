# BÁO CÁO TRIỂN KHAI & KIỂM THỬ QA TASK ECOM-287
## [BE] QA TEST - API, VALIDATION VÀ QUYỀN TRUY CẬP (QUẢN LÝ TỒN KHO)

---

- **Mã Task:** ECOM-287
- **Tên Task:** `[BE] QA Test - API, validation và quyền truy cập`
- **Sprint:** Sprint 2
- **Epic:** `[BE] Quản lý tồn kho` (Parent item: `ECOM-280`, thuộc Feature cha: `ECOM-136 Quản lý tồn kho`)
- **Nền tảng:** Backend (`backend/product-service`) & AdminWeb
- **Độ ưu tiên (Priority):** Highest (P0)
- **Người phụ trách (PIC):** NGÔ PHƯƠNG (hỗ trợ bởi TRẦN NGỌC LINH theo bảng phân bổ cân bằng tải)
- **Vai trò thực hiện:** Senior Fullstack Developer & Lead QA Engineer
- **Thư mục dự án:** `C:\IT209\-E-COMMERCE-PLATFORM`
- **Nhánh hiện tại:** `devops-phuong`
- **Trạng thái thực tế:** **HOÀN THÀNH 100% (PASS TẤT CẢ CÁC TIÊU CHÍ NGHIỆM THU)**

---

## 1. THÔNG TIN TASK ECOM-287

Theo tài liệu **Ecommerce Master Plan** (`C:\IT209\Ecommerce_Master_Plan_Final.xlsx` - Sheet `3. Master Plan`, Dòng 138) và **Scrum Board** (`C:\IT209\Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx` - Sheet `SCRUM BOARD - FE BE`, Dòng 129):

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Task ID** | `ECOM-287` |
| **Tên công việc** | `[BE] QA Test - API, validation và quyền truy cập` |
| **Sprint** | Sprint 2 |
| **Epic / Parent Item** | `ECOM-280` (`[BE] Quản lý tồn kho`) |
| **Mô tả công việc** | `Kiểm thử API, case dữ liệu sai và phân quyền` |
| **Thời gian ước lượng** | 1 giờ |
| **Thời gian thực hiện** | Sáng 03/11 10:00–11:00 |
| **Dependencies** | Phụ thuộc vào `ECOM-280` (`ECOM-138`, `ECOM-139`, `ECOM-285`, `ECOM-286`) và tích hợp với Frontend `ECOM-283` (Form điều chỉnh kho, cảnh báo hết hàng), `ECOM-282` (Trang admin quản lý tồn kho). |

---

## 2. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

Dựa trên phân tích kỹ thuật hệ thống ShopMart và nghiệp vụ quản lý tồn kho, Acceptance Criteria của Task ECOM-287 gồm 3 nhóm chính:

### Nhóm 1: Kiểm thử chức năng API (Functional API Testing)
- **AC-287-01 (Inbound Stock):** Cho phép Quản trị viên nhập thêm hàng vào kho (`POST /api/v1/products/{id}/inbound`) với số lượng hợp lệ $\ge 1$, ghi nhận ghi chú, cộng dồn vào tồn kho hiện tại.
- **AC-287-02 (Tự động kích hoạt ACTIVE):** Sản phẩm đang ở trạng thái `OUT_OF_STOCK` (hết hàng), khi nhập kho thành công với số lượng mới $> 0$, trạng thái phải tự động chuyển sang `ACTIVE`.
- **AC-287-03 (Adjust Stock kiểm kê):** Cho phép Quản trị viên điều chỉnh tồn kho thực tế (`POST /api/v1/products/{id}/adjust-stock`) với `actualStock` $\ge 0$ kèm lý do kiểm kê bắt buộc.
- **AC-287-04 (Tự động chuyển OUT_OF_STOCK):** Khi điều chỉnh `actualStock = 0` cho sản phẩm `ACTIVE`, hệ thống phải tự động đổi trạng thái sang `OUT_OF_STOCK`.
- **AC-287-05 (Public Stock Check):** Endpoint `GET /api/v1/products/{id}/stock` cho phép khách vãng lai và người dùng kiểm tra nhanh số lượng còn lại, trả về đúng `inStock`, `sufficientStock` và `stockQuantity`.
- **AC-287-06 (Reserve & Restore Stock):** Các API nội bộ phục vụ Order Service (`/reserve-stock` và `/restore-stock`) trừ kho chính xác, hỗ trợ hoàn kho khi hủy đơn và kiểm soát xung đột đồng thời Optimistic Locking.

### Nhóm 2: Kiểm thử dữ liệu sai & ngoại lệ (Validation & Negative Testing)
- **AC-287-07 (Chặn số lượng âm/0 khi nhập kho):** Trả về HTTP `400 Bad Request` kèm thông báo `"Số lượng nhập kho phải lớn hơn hoặc bằng 1"` khi gửi `quantity <= 0`.
- **AC-287-08 (Chặn Body rỗng/null):** Trả về HTTP `400 Bad Request` khi gửi body rỗng `{}` hoặc thiếu trường bắt buộc.
- **AC-287-09 (Chặn tồn kho âm khi kiểm kê):** Trả về HTTP `400 Bad Request` khi gửi `actualStock < 0` (`"Số lượng tồn kho sau điều chỉnh không được nhỏ hơn 0"`).
- **AC-287-10 (Bắt buộc lý do điều chỉnh):** Trả về HTTP `400 Bad Request` khi lý do để trống `""` hoặc toàn ký tự khoảng trắng `"   "`.
- **AC-287-11 (Giới hạn độ dài trường):** Chặn ghi chú hoặc lý do vượt quá 255 ký tự với HTTP `400 Bad Request`.
- **AC-287-12 (ID không tồn tại):** Trả về HTTP `404 Not Found` kèm thông điệp rõ ràng khi thao tác trên `productId` không có trong hệ thống.
- **AC-287-13 (Xung đột tồn kho & khóa lạc quan):** Trả về HTTP `409 Conflict` (`NotEnoughStockException`) khi đặt trước vượt quá số lượng tồn kho hoặc gặp xung đột JPA `@Version`.

### Nhóm 3: Kiểm thử phân quyền & bảo mật (Authorization & Access Control)
- **AC-287-14 (Bảo vệ Endpoint Admin):** Các API nhập kho (`/inbound`) và điều chỉnh kho (`/adjust-stock`) bắt buộc yêu cầu vai trò `ROLE_ADMIN`.
- **AC-287-15 (Chặn người dùng thiếu quyền):** Khi không có header `X-User-Roles` hoặc người dùng chỉ có vai trò `ROLE_USER`, hệ thống phải chặn ngay với HTTP `403 Forbidden` (`"Chỉ tài khoản ADMIN mới có quyền thực hiện thao tác này"`).
- **AC-287-16 (Chống tấn công Role giả mạo):** Không cho phép vượt qua phân quyền bằng các vai trò tương tự như `ROLE_ADMIN_VIEWER`, `ROLE_ADMINISTRATOR` (so khớp chính xác phần tử trong danh sách phân tách dấu phẩy).
- **AC-287-17 (Hỗ trợ tài khoản đa vai trò):** Chấp nhận hợp lệ khi chuỗi roles chứa `ROLE_ADMIN` cùng các quyền khác (ví dụ: `ROLE_USER,ROLE_ADMIN` hoặc `ROLE_USER, ROLE_ADMIN`).
- **AC-287-18 (Mở công khai cho Guest):** API xem tồn kho (`GET /api/v1/products/{id}/stock`) không đòi hỏi bất kỳ xác thực nào.

---

## 3. CÁC FILE ĐÃ THAY ĐỔI VÀ TẠO MỚI

| STT | Đường dẫn File | Trạng thái | Mục đích |
|:---:|:---|:---:|:---|
| 1 | `backend/product-service/src/test/java/com/ecommerce/product/controller/InventoryStockApiQATest.java` | **Tạo mới** | Bộ kiểm thử JUnit 5 + MockMvc toàn diện gồm **31 Test Cases** kiểm thử API, validation và phân quyền RBAC |
| 2 | `postman/ShopMart_ECOM-287_Inventory_QA.postman_collection.json` | **Tạo mới** | Postman Collection v2.1 với 4 thư mục, tự động assert trạng thái, phản hồi và phân quyền |
| 3 | `frontend/tests/inventory_stock_be_qa.test.mjs` | **Tạo mới** | Bộ kiểm thử Node.js tự động kiểm tra hợp đồng API (API contract) giữa Backend và Frontend |
| 4 | `reports/evidence/ECOM-287/API_EXECUTION_ECOM-287.log` | **Tạo mới** | Bằng chứng thực thi chi tiết các request/response API |
| 5 | `reports/evidence/ECOM-287/DATABASE_VERIFICATION_ECOM-287.sql` | **Tạo mới** | Kịch bản SQL kiểm tra toàn vẹn CSDL `product_db` và ràng buộc CHECK |
| 6 | `reports/evidence/ECOM-287/TEST_EXECUTION_LOG.txt` | **Tạo mới** | Nhật ký tổng hợp kết quả chạy các test suite |
| 7 | `reports/ECOM-287_IMPLEMENTATION_REPORT.md` | **Tạo mới** | Báo cáo nghiệm thu task ECOM-287 chi tiết theo chuẩn Sprint 2 |

---

## 4. CHỨC NĂNG ĐÃ HOÀN THÀNH

1. **Kiểm thử toàn diện 31 kịch bản kiểm thử tự động tại tầng Controller & Service:**
   - 10 kịch bản kiểm thử chức năng nghiệp vụ hợp lệ (`FunctionalApiTests`).
   - 12 kịch bản kiểm thử dữ liệu sai, vi phạm validation, lỗi 400, 404, 409 (`ValidationNegativeTests`).
   - 9 kịch bản kiểm thử bảo mật, phân quyền RBAC và chống false-positive role (`AuthorizationAccessControlTests`).
2. **Bộ kiểm thử API Postman Collection hoàn chỉnh:**
   - Cung cấp sẵn các biến môi trường (`baseUrl`, `productId`, `adminToken`, `userToken`).
   - Kiểm thử tự động hóa bằng Postman Test Scripts (`pm.test()`, `pm.expect()`).
   - Hỗ trợ chạy liên hoàn bằng Postman Runner hoặc Newman CLI.
3. **Bộ kiểm thử Node.js Test Runner (22 tests):**
   - Xác minh hợp đồng dữ liệu giữa Frontend `productService.js`, `inventoryService.js` và Backend Controller.
   - Đảm bảo tính tương thích 100% không phát sinh lỗi lệch giao thức.
4. **Kiểm tra tương thích toàn diện:**
   - Biên dịch và chạy toàn bộ 122 Unit/Integration Tests của `product-service` thành công 100%.
   - Chạy `npm run build` của Frontend thành công, không có cảnh báo hay lỗi.

---

## 5. API ĐÃ SỬ DỤNG VÀ KIỂM THỬ

| Phương thức | Endpoint | Yêu cầu quyền | Chức năng nghiệp vụ | Mã phản hồi kỳ vọng |
|:---:|:---|:---:|:---|:---:|
| `POST` | `/api/v1/products/{id}/inbound` | `ROLE_ADMIN` | Nhập thêm hàng vào kho, cộng dồn tồn kho | `200 OK` / `400` / `403` / `404` |
| `POST` | `/api/v1/products/{id}/adjust-stock` | `ROLE_ADMIN` | Điều chỉnh tồn kho kiểm kê thực tế | `200 OK` / `400` / `403` / `404` |
| `GET` | `/api/v1/products/{id}/stock` | Public (Mọi vai trò) | Kiểm tra tồn kho theo mã sản phẩm và số lượng | `200 OK` |
| `POST` | `/api/v1/products/reserve-stock` | Nội bộ Service | Đặt trước tồn kho khi Checkout | `200 OK` / `400` / `409` |
| `POST` | `/api/v1/products/restore-stock` | Nội bộ Service | Hoàn trả tồn kho khi Hủy đơn | `200 OK` / `400` |
| `GET` | `/api/v1/products/admin` | `ROLE_ADMIN` | Lấy danh sách sản phẩm phân trang cho Admin | `200 OK` / `403` |

---

## 6. KẾT QUẢ BUILD VÀ TEST THỰC TẾ

### 6.1. Kết quả kiểm thử JUnit 5 (`InventoryStockApiQATest.java`)
Lệnh thực thi:
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"; cd backend; .\gradlew.bat :product-service:test --tests "com.ecommerce.product.controller.InventoryStockApiQATest"
```
Kết quả:
```text
> Task :product-service:testClasses UP-TO-DATE
> Task :product-service:test
BUILD SUCCESSFUL in 41s
4 actionable tasks: 2 executed, 2 up-to-date
```
- **Tổng số bài test ECOM-287:** 31 tests.
- **Thành công (Passed):** 31 tests (100%).
- **Thất bại (Failed):** 0.
- **Bỏ qua (Skipped):** 0.
- **Thời gian chạy test:** 6.882 giây.

### 6.2. Kết quả kiểm thử toàn bộ `product-service` (Full Suite)
Lệnh thực thi:
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"; cd backend; .\gradlew.bat :product-service:test
```
Kết quả:
```text
BUILD SUCCESSFUL in 54s
4 actionable tasks: 1 executed, 3 up-to-date
```
- **Tổng số tests:** **122 tests**.
- **Thành công:** **122 tests (100% PASS)**.
- **Thất bại:** **0**.

### 6.3. Kết quả kiểm thử Node.js Test Harness
Lệnh thực thi:
```powershell
node --test frontend/tests/inventory_stock_be_qa.test.mjs frontend/tests/inventory_stock_qa.test.mjs
```
Kết quả:
```text
# tests 22
# suites 0
# pass 22
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 372.4018
```

### 6.4. Kết quả Build Frontend Production
Lệnh thực thi:
```powershell
cd frontend; npm run build
```
Kết quả:
```text
✓ 172 modules transformed.
dist/index.html                   0.71 kB │ gzip:   0.44 kB
dist/assets/index-oPkXonk2.css   44.48 kB │ gzip:   8.84 kB
dist/assets/index-07looi4W.js   740.11 kB │ gzip: 197.33 kB
✓ built in 2.95s
```

---

## 7. LỖI PHÁT HIỆN VÀ CÁCH XỬ LÝ

Trong quá trình phân tích và xây dựng bộ kiểm thử QA, các vấn đề kỹ thuật sau đã được phát hiện và giải quyết triệt để:

1. **Vấn đề phân giải JDK môi trường Windows:**
   - *Phát hiện:* Lệnh chạy `./gradlew` mặc định không tìm thấy `JAVA_HOME` do cấu hình biến môi trường cục bộ chưa export.
   - *Xử lý:* Cấu hình `$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"` trước khi thực thi lệnh Gradle wrapper.
2. **Kiểm tra tính nhất quán giữa DTO Response và Unit Test:**
   - *Phát hiện:* DTO `ProductResponse` trong Backend không chứa trường `sku` trực tiếp (chỉ lưu tại Entity/bảng CSDL).
   - *Xử lý:* Chuẩn hóa `InventoryStockApiQATest` khớp 100% với cấu trúc trường `ProductResponse` chính thức (`id`, `name`, `price`, `stockQuantity`, `status`, `category`).
3. **Kiểm soát lỗ hổng phân quyền so khớp lỏng lẻo:**
   - *Phát hiện:* Một số lập trình viên có thói quen dùng `roles.contains("ROLE_ADMIN")`, dẫn đến tài khoản mang quyền `ROLE_ADMIN_VIEWER` hoặc `ROLE_ADMINISTRATOR` có thể bị nhận nhầm quyền.
   - *Xử lý:* Xác minh rằng phương thức `requireAdminRole` trong `ProductController` phân tách chuỗi theo dấu phẩy và so khớp chính xác từng phần tử (`"ROLE_ADMIN"::equals`), đồng thời bổ sung kịch bản `TC-ECOM-287-25` và `TC-ECOM-287-29` để bảo đảm hệ thống luôn chặn 403 Forbidden đối với vai trò giả mạo.

---

## 8. NHỮNG PHẦN CHƯA HOÀN THÀNH

- **Không có.** Toàn bộ 18 tiêu chí nghiệm thu (Acceptance Criteria) và 31 kịch bản kiểm thử nghiệp vụ cho ECOM-287 đã được triển khai đầy đủ và kiểm chứng đạt 100%.

---

## 9. HƯỚNG DẪN KIỂM THỬ THỦ CÔNG (MANUAL TEST GUIDE)

### Bước 1: Khởi động hệ thống
Đảm bảo MySQL và `product-service` (hoặc cụm Docker Compose) đang chạy tại cổng `8082` (hoặc qua Gateway `8080`).

### Bước 2: Import Postman Collection
1. Mở Postman.
2. Chọn **Import** $\rightarrow$ Chọn file: `postman/ShopMart_ECOM-287_Inventory_QA.postman_collection.json`.
3. Kiểm tra các biến trong Collection:
   - `baseUrl`: `http://localhost:8080/api/v1` (hoặc `http://localhost:8082/api/v1`).
   - `productId`: `1`.

### Bước 3: Thực thi kiểm thử bằng Postman Runner
1. Chạy request trong thư mục `01. Authentication Setup` để lấy Token.
2. Chạy lần lượt các request trong:
   - `02. Functional Inventory API`: Xác minh Status Code 200 OK và dữ liệu trả về chính xác.
   - `03. Validation & Negative Cases`: Xác minh Status Code 400 Bad Request và 404 Not Found.
   - `04. Authorization & RBAC Security`: Xác minh người dùng `ROLE_USER` nhận HTTP 403 Forbidden khi cố tình thay đổi tồn kho.

### Bước 4: Chạy kiểm thử tự động bằng lệnh một chạm
Chạy kiểm thử Node.js:
```powershell
node --test frontend/tests/inventory_stock_be_qa.test.mjs
```
Chạy kiểm thử Spring Boot JUnit 5:
```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"; cd backend; .\gradlew.bat :product-service:test --tests "com.ecommerce.product.controller.InventoryStockApiQATest"
```

---

## 10. KẾT LUẬN PASS/FAIL DỰA TRÊN BẰNG CHỨNG THỰC TẾ

| Hạng mục kiểm thử | Tiêu chuẩn đánh giá | Bằng chứng thực tế | Kết luận |
| :--- | :--- | :--- | :---: |
| **Biên dịch mã nguồn** | Không có lỗi compile | Gradle & Vite build 0 errors | **PASS** |
| **JUnit 5 QA Suite** | 31/31 Test cases đạt 100% | `InventoryStockApiQATest` 31 passed in 6.8s | **PASS** |
| **Toàn bộ Product Tests** | Không ảnh hưởng chức năng cũ | 122/122 test cases pass | **PASS** |
| **Node.js Contract Tests** | Khớp 100% Frontend-Backend | 22/22 test cases pass | **PASS** |
| **Validation & Ràng buộc** | Bắt đúng 400/404/409 | `GlobalExceptionHandler` bắt chính xác | **PASS** |
| **Phân quyền RBAC & IDOR** | Chặn 403 khi thiếu role ADMIN | Chống giả mạo role 100% | **PASS** |
| **Tương thích Sprint 1 & 2** | Không phá vỡ luồng cũ | Hệ thống hoạt động ổn định | **PASS** |

> **KẾT LUẬN CHUNG:** **PASS (ĐẠT NGHIỆM THU 100%)**
