# BÁO CÁO KỸ THUẬT KIỂM THỬ BACKEND (QA TEST REPORT)
## Task ECOM-327: [BE] QA Test - API, validation và quyền truy cập

---

### THÔNG TIN TỔNG QUAN

| Thuộc tính | Chi tiết |
|---|---|
| **Mã công việc (Task ID)** | **ECOM-327** |
| **Tên công việc** | `[BE] QA Test - API, validation và quyền truy cập` |
| **Sprint** | **SPRINT 3** |
| **Chức năng cha (Parent Epic)** | `ECOM-320 – Quản lý khách hàng & Thống kê` |
| **Phạm vi kiểm thử trực tiếp** | `ECOM-325` (API danh sách khách hàng có phân quyền) & `ECOM-326` (API thống kê doanh thu / đơn hàng) |
| **Người phụ trách QA (PIC)** | **NGÔ PHƯƠNG** |
| **Người phối hợp Backend** | **TRẦN NGỌC LINH** |
| **Nhánh phát triển (Branch)** | `devops-phuong` |
| **Repository** | `https://github.com/Duy18ND/-E-COMMERCE-PLATFORM` |
| **Thời gian ước tính (Estimate)** | 1 giờ |
| **Trạng thái thực thi** | **COMPLETED & VERIFIED (29/29 Test Cases PASS)** |
| **Ngày lập báo cáo** | 09/11/2026 |

---

## 1. MỤC TIÊU VÀ PHẠM VI KIỂM THỬ

Task **ECOM-327** là công việc kiểm thử chất lượng (Quality Assurance - Backend QA) thuộc Sprint 3 nhằm thẩm tra toàn diện hai phân hệ quản trị then chốt phục vụ Admin Dashboard của dự án **ShopMart E-Commerce Platform**:

1. **Phân hệ ECOM-325 (`auth-service`):**
   - API quản lý danh sách khách hàng toàn hệ thống với cơ chế phân quyền RBAC nghiêm ngặt (`ROLE_ADMIN`).
   - Khả năng phân trang (`page`, `size`), sắp xếp (`sortBy`, `sortDir`), tìm kiếm theo từ khóa (`keyword`) và lọc trạng thái tài khoản (`status`: `ACTIVE`, `BLOCKED`).
   - API khóa/mở khóa tài khoản khách hàng, xem chi tiết hồ sơ cá nhân (`profile`) và đếm tổng số lượng khách hàng.
   - Cơ chế bảo vệ thông tin nhạy cảm: Tuyệt đối không để lộ mật khẩu, mã hash BCrypt hoặc token trong phản hồi API.
2. **Phân hệ ECOM-326 (`order-service`):**
   - API báo cáo thống kê doanh thu và đơn hàng theo thời gian thực trực tiếp từ cơ sở dữ liệu (`/api/v1/admin/statistics`).
   - Kiểm tra tính đúng đắn của các chỉ số tài chính và vận hành: Tổng doanh thu (`totalRevenue` không bị âm), tổng số đơn hàng (`totalOrders`), phân bổ trạng thái đơn hàng (`ordersByStatus`), số lượng sản phẩm sắp hết hàng (`lowStockProductsCount`).
   - Đảm bảo câu truy vấn cơ sở dữ liệu không bị nhân đôi doanh thu do lỗi phép nối (`JOIN`) bảng, xử lý mượt mà khi cơ sở dữ liệu chưa có đơn hàng nào mà không phát sinh lỗi HTTP 500.
3. **Kiểm tra Validation & Error Handling:**
   - Xử lý các tình huống đầu vào bất thường: Tham số trang âm (`page = -1`), kích thước trang không hợp lệ (`size = 0` hoặc `size = -5`), từ khóa tìm kiếm rỗng hoặc chứa ký tự đặc biệt (SQL Injection / XSS tokens).
   - Kiểm tra mã phản hồi HTTP chuẩn RESTful (200 OK, 400 Bad Request, 403 Forbidden, 404 Not Found) và cấu trúc lỗi JSON đồng bộ (`ApiResponse` / `ErrorResponse`).

---

## 2. DANH SÁCH ENDPOINTS ĐÃ KIỂM THỬ

| STT | Phân Hệ / Module | HTTP Method | Endpoint URI | Yêu Cầu Header / Token | Quyền Hạn (RBAC) | Mô Tả Chức Năng |
|:---:|---|:---:|---|---|:---:|---|
| 1 | `auth-service` (ECOM-325) | `GET` | `/api/v1/admin/customers` | `Authorization: Bearer <JWT>` / `X-User-Roles` | `ROLE_ADMIN` | Lấy danh sách khách hàng phân trang, lọc từ khóa & trạng thái |
| 2 | `auth-service` (ECOM-325) | `PUT` | `/api/v1/admin/customers/{id}/status` | `Authorization: Bearer <JWT>` / `X-User-Roles` | `ROLE_ADMIN` | Khóa hoặc mở khóa tài khoản khách hàng (`ACTIVE`/`BLOCKED`) |
| 3 | `auth-service` (ECOM-325) | `GET` | `/api/v1/admin/customers/{id}` | `Authorization: Bearer <JWT>` / `X-User-Roles` | `ROLE_ADMIN` | Xem chi tiết hồ sơ khách hàng và sổ địa chỉ giao hàng |
| 4 | `auth-service` (ECOM-325) | `GET` | `/api/v1/admin/customers/count` | `Authorization: Bearer <JWT>` / `X-User-Roles` | `ROLE_ADMIN` | Đếm tổng số lượng khách hàng đăng ký trong hệ thống |
| 5 | `order-service` (ECOM-326) | `GET` | `/api/v1/admin/statistics` | `Authorization: Bearer <JWT>` / `X-User-Roles` | `ROLE_ADMIN` | Lấy báo cáo thống kê doanh thu, đơn hàng & tồn kho thấp |

---

## 3. BẢNG MA TRẬN TEST CASE & KẾT QUẢ THỰC TẾ (29/29 TEST CASES)

### A. Nhóm Test Case: API Quản Lý Khách Hàng (ECOM-325 — `auth-service`)
*File test suite:* [`AdminCustomerApiQATest.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/test/java/com/ecommerce/auth/controller/AdminCustomerApiQATest.java)

| Mã Test Case | API / Chức Năng | Tình Huống Kiểm Thử (Scenario) | Kết Quả Mong Đợi | Kết Quả Thực Tế | HTTP Status | Đánh Giá |
|---|---|---|---|---|:---:|:---:|
| **E327-01** | Customers RBAC | ADMIN có header `X-User-Roles: ROLE_ADMIN` | Cho phép truy cập danh sách | Trả về `success: true`, data danh sách | **200 OK** | **PASS** |
| **E327-02** | Customers RBAC | USER thông thường (`ROLE_USER`) | Từ chối truy cập | Thông báo lỗi không có quyền quản trị | **403 Forbidden** | **PASS** |
| **E327-03** | Customers RBAC | GUEST không truyền token / thiếu header | Từ chối truy cập | Bắt lỗi phân quyền, không lộ tài nguyên | **403 Forbidden** | **PASS** |
| **E327-04** | Customers RBAC | Header `X-User-Roles` rỗng hoặc khoảng trắng | Từ chối truy cập | Bắt lỗi phân quyền | **403 Forbidden** | **PASS** |
| **E327-05** | Customers RBAC | User có nhiều role chứa `ROLE_ADMIN` | Cho phép truy cập | Trả về dữ liệu thành công | **200 OK** | **PASS** |
| **E327-06** | Customers Query | Query params đầy đủ (`keyword`, `status`, `page`, `size`, `sortBy`, `sortDir`) | Trả về cấu trúc phân trang chuẩn | Trả về đúng `pageNumber: 0`, `pageSize: 10`, `totalElements: 1` | **200 OK** | **PASS** |
| **E327-07** | Customers Query | Tìm kiếm với từ khóa rỗng hoặc khoảng trắng | Xử lý bình thường, không lỗi | Bỏ qua bộ lọc từ khóa, trả về danh sách | **200 OK** | **PASS** |
| **E327-08** | Customers Query | Tìm kiếm chứa ký tự đặc biệt (`' OR 1=1 -- <script>`) | Xử lý an toàn, chống Injection | Escape ký tự an toàn, trả về mảng rỗng | **200 OK** | **PASS** |
| **E327-09** | Customers Query | Cơ sở dữ liệu chưa có khách hàng | Trả về mảng rỗng, `totalElements: 0` | Không phát sinh lỗi 500, dữ liệu rỗng chuẩn | **200 OK** | **PASS** |
| **E327-10** | Customers Validation | Phân trang lỗi: Page âm (`page = -1`) | Báo lỗi 400 Bad Request (không bị 500) | Bắt lỗi "Chỉ số trang không được nhỏ hơn 0" | **400 Bad Request** | **PASS** |
| **E327-11** | Customers Validation | Phân trang lỗi: Size không hợp lệ (`size = 0`) | Báo lỗi 400 Bad Request (không bị 500) | Bắt lỗi "Kích thước trang phải lớn hơn 0" | **400 Bad Request** | **PASS** |
| **E327-12** | Customers Security | Kiểm tra rò rỉ dữ liệu nhạy cảm trong response | Không có `password`, `hash`, `token` | Toàn bộ trường nhạy cảm đều null / không tồn tại | **200 OK** | **PASS** |
| **E327-13** | Customer Status | ADMIN cập nhật trạng thái khách hàng sang `BLOCKED` | Cập nhật thành công | Trả về trạng thái `status: BLOCKED` | **200 OK** | **PASS** |
| **E327-14** | Customer Status | USER cố gắng cập nhật trạng thái khách hàng | Từ chối truy cập | Trả về lỗi 403 Forbidden | **403 Forbidden** | **PASS** |
| **E327-15** | Customer Status | Cập nhật khách hàng với ID không tồn tại (ID 999) | Trả về 404 Not Found | Báo lỗi "Không tìm thấy người dùng với ID: 999" | **404 Not Found** | **PASS** |
| **E327-16** | Customer Profile | ADMIN xem chi tiết hồ sơ và sổ địa chỉ khách hàng | Trả về thông tin cá nhân & địa chỉ | Đầy đủ thông tin, không chứa password | **200 OK** | **PASS** |
| **E327-17** | Customer Count | ADMIN lấy tổng số lượng khách hàng | Trả về số lượng kiểu số nguyên | Trả về `data: 250` thành công | **200 OK** | **PASS** |

---

### B. Nhóm Test Case: API Thống Kê Doanh Thu & Đơn Hàng (ECOM-326 — `order-service`)
*File test suite:* [`AdminStatisticsApiQATest.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/order-service/src/test/java/com/ecommerce/order/controller/AdminStatisticsApiQATest.java)

| Mã Test Case | API / Chức Năng | Tình Huống Kiểm Thử (Scenario) | Kết Quả Mong Đợi | Kết Quả Thực Tế | HTTP Status | Đánh Giá |
|---|---|---|---|---|:---:|:---:|
| **E327-18** | Statistics RBAC | ADMIN có header `X-User-Roles: ROLE_ADMIN` | Cho phép truy cập thống kê | Trả về đối tượng `DashboardResponse` | **200 OK** | **PASS** |
| **E327-19** | Statistics RBAC | USER thông thường (`ROLE_USER`) | Từ chối truy cập | Báo lỗi "Chỉ tài khoản ADMIN mới có quyền..." | **403 Forbidden** | **PASS** |
| **E327-20** | Statistics RBAC | GUEST không có token / thiếu roles | Từ chối truy cập | Báo lỗi phân quyền | **403 Forbidden** | **PASS** |
| **E327-21** | Statistics RBAC | Header `X-User-Roles` rỗng / sai | Từ chối truy cập | Báo lỗi phân quyền | **403 Forbidden** | **PASS** |
| **E327-22** | Statistics RBAC | Header chứa nhiều quyền kèm `ROLE_ADMIN` | Cho phép truy cập | Trả về dữ liệu thành công | **200 OK** | **PASS** |
| **E327-23** | Statistics Data | Dữ liệu đầy đủ: Đơn hàng, doanh thu, phân bổ trạng thái | Cấu trúc đầy đủ, kiểu dữ liệu chuẩn | `totalOrders: Long`, `totalRevenue: BigDecimal`, `ordersByStatus: Map` | **200 OK** | **PASS** |
| **E327-24** | Statistics Data | Xác thực tổng doanh thu không bị âm | `totalRevenue >= 0` | Doanh thu >= 0, định dạng tiền tệ hợp lệ | **200 OK** | **PASS** |
| **E327-25** | Statistics Data | Số lượng sản phẩm sắp hết hàng (`lowStockProductsCount`) | Kiểu dữ liệu Long, giá trị >= 0 | Giá trị hợp lệ, không gây lỗi parse | **200 OK** | **PASS** |
| **E327-26** | Statistics Edge | Hệ thống mới chưa có đơn hàng nào | Trả về giá trị 0, không lỗi 500 | `totalOrders: 0`, `totalRevenue: 0.00`, map trạng thái = 0 | **200 OK** | **PASS** |
| **E327-27** | Statistics Edge | Chỉ có đơn hàng `CANCELLED`/`PENDING` (chưa thanh toán) | Doanh thu tính toán bằng 0.00 | Doanh thu trả về `0.00`, không tính nhầm đơn hủy | **200 OK** | **PASS** |
| **E327-28** | Statistics Security | Kiểm tra rò rỉ thông tin nhạy cảm trong response | Không có `password`, `hash`, `token` | Không để lộ bất kỳ trường nhạy cảm nào | **200 OK** | **PASS** |
| **E327-29** | Statistics Security | Phản hồi lỗi phân quyền | Không để lộ SQL hay stack trace | Error response sạch sẽ, chuẩn RESTful | **403 Forbidden** | **PASS** |

---

## 4. KẾT QUẢ KIỂM TRA PHÂN QUYỀN (RBAC & JWT)

Kiến trúc bảo mật phân tầng giữa API Gateway và các Microservices được xác nhận hoạt động chuẩn xác:

1. **Cơ chế Phân quyền 2 Lớp (Dual-Layer Security):**
   - **Lớp Ngoài (API Gateway - `AuthenticationFilter.java`):** Kiểm tra tính hợp lệ của JWT token từ header `Authorization: Bearer <token>`. Nếu token không hợp lệ hoặc thiếu, Gateway lập tức ngắt request và trả về **401 Unauthorized**. Khi token hợp lệ, Gateway giải mã các claims (`userId`, `roles`, `email`) và truyền xuống các downstream microservices qua header `X-User-Roles`, `X-User-Id`.
   - **Lớp Trong (Microservices Controller & Security Config):** Tại cả `AdminCustomerController` và `AdminStatisticsController`, hệ thống tiến hành thẩm định trực tiếp quyền `ROLE_ADMIN` từ header `X-User-Roles` và `SecurityContext`. Bất kỳ người dùng nào không sở hữu quyền Admin đều bị chặn đứng với mã lỗi **403 Forbidden**.
2. **Kiểm tra vai trò:**
   - `ADMIN` (`ROLE_ADMIN`): Truy cập thành công 100% các API quản lý và thống kê (**200 OK**).
   - `USER` (`ROLE_USER`): Bị từ chối truy cập toàn bộ các endpoint quản trị (**403 Forbidden**).
   - `GUEST` (Không đăng nhập / không gửi token): Bị từ chối truy cập (**401 / 403 Forbidden**).

---

## 5. PHÁT HIỆN LỖI THỰC TẾ VÀ CÁC THAY ĐỔI ĐÃ KHẮC PHỤC

Trong quá trình thực hiện kiểm thử hộp trắng và kiểm thử biên (Edge Case Testing), đội ngũ QA đã phát hiện **02 lỗi thực tế** trên mã nguồn Backend của `auth-service` và đã trực tiếp xử lý triệt để:

### Lỗi #1: Thiếu Validation kiểm tra tham số phân trang âm hoặc không hợp lệ
- **Mức độ nghiêm trọng:** Medium
- **Mô tả:** Tại `AdminCustomerController.getCustomers()`, các tham số `page` và `size` được nhận trực tiếp từ `@RequestParam`. Khi client gửi `page = -1` hoặc `size = 0`, Spring Data `PageRequest.of(page, size, ...)` ném ra ngoại lệ `IllegalArgumentException`.
- **Hậu quả:** Do chưa có bộ lọc tham số trước khi khởi tạo `PageRequest`, ngoại lệ không được chặn ở tầng Controller.

### Lỗi #2: Thiếu Exception Handler cho `IllegalArgumentException` dẫn đến lỗi HTTP 500
- **Mức độ nghiêm trọng:** High (Vi phạm tiêu chí: *"Không trả về HTTP 500 cho lỗi đầu vào thông thường"*)
- **Mô tả:** Trong lớp `GlobalExceptionHandler.java` của `auth-service`, chưa khai báo `@ExceptionHandler(IllegalArgumentException.class)`. Do đó, ngoại lệ `IllegalArgumentException` bị rơi xuống bộ bắt lỗi tổng quát `handleGenericException(Exception.class)`, khiến hệ thống trả về mã lỗi **HTTP 500 Internal Server Error** kèm thông báo *"Đã xảy ra lỗi máy chủ nội bộ"*.
- **Giải pháp khắc phục đã thực hiện:**
  1. Trong [`AdminCustomerController.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/controller/AdminCustomerController.java): Bổ sung kiểm tra điều kiện biên:
     ```java
     if (page < 0) {
         throw new IllegalArgumentException("Chỉ số trang (page) không được nhỏ hơn 0");
     }
     if (size <= 0) {
         throw new IllegalArgumentException("Kích thước trang (size) phải lớn hơn 0");
     }
     ```
  2. Trong [`GlobalExceptionHandler.java`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/auth-service/src/main/java/com/ecommerce/auth/exception/GlobalExceptionHandler.java): Bổ sung handler chuẩn hóa chuyển đổi `IllegalArgumentException` thành mã lỗi **HTTP 400 Bad Request**:
     ```java
     @ExceptionHandler(IllegalArgumentException.class)
     public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
             IllegalArgumentException ex, HttpServletRequest request) {
         log.warn("Illegal argument on path {}: {}", request.getRequestURI(), ex.getMessage());
         ErrorResponse errorResponse = ErrorResponse.builder()
                 .timestamp(LocalDateTime.now())
                 .status(HttpStatus.BAD_REQUEST.value())
                 .error("Bad Request")
                 .message(ex.getMessage() != null ? ex.getMessage() : "Tham số yêu cầu không hợp lệ")
                 .path(request.getRequestURI())
                 .build();
         return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
     }
     ```
  - **Kết quả nghiệm thu sau khi sửa:** Các kịch bản test `E327-10` (`page = -1`) và `E327-11` (`size = 0`) đều trả về chính xác mã lỗi **HTTP 400 Bad Request** với thông điệp rõ ràng, hoàn toàn loại bỏ lỗi HTTP 500.

---

## 6. DANH MỤC TẬP TIN TẠO MỚI VÀ CHỈNH SỬA

| STT | Tập Tin | Phân Hệ | Thao Tác | Nội Dung Thực Hiện |
|:---:|---|---|:---:|---|
| 1 | `backend/auth-service/.../controller/AdminCustomerApiQATest.java` | `auth-service` | **Tạo mới** | Bộ 17 Test Cases QA toàn diện cho ECOM-325 (RBAC, Validation, Query, Security, Edge cases) |
| 2 | `backend/order-service/.../controller/AdminStatisticsApiQATest.java` | `order-service` | **Tạo mới** | Bộ 12 Test Cases QA toàn diện cho ECOM-326 (RBAC, Data structure, Empty data, Security) |
| 3 | `backend/auth-service/.../controller/AdminCustomerController.java` | `auth-service` | **Chỉnh sửa** | Bổ sung kiểm tra tham số biên cho `page < 0` và `size <= 0` |
| 4 | `backend/auth-service/.../exception/GlobalExceptionHandler.java` | `auth-service` | **Chỉnh sửa** | Bổ sung xử lý `IllegalArgumentException` trả về HTTP 400 Bad Request |
| 5 | `reports/ECOM-327_BACKEND_QA_REPORT.md` | QA Documentation | **Tạo mới** | Báo cáo kiểm thử kỹ thuật chi tiết ECOM-327 (tài liệu này) |

---

## 7. KẾT QUẢ THỰC THI AUTOMATED TESTS

Toàn bộ các test suite đã được biên dịch và thực thi trực tiếp bằng Gradle Test Runner trên môi trường dự án:

### Lệnh 1: Thực thi Test Suite Khách hàng (ECOM-325)
```bash
.\gradlew.bat :auth-service:test --tests "com.ecommerce.auth.controller.AdminCustomerApiQATest" --no-daemon
```
**Kết quả:**
- Trạng thái: `BUILD SUCCESSFUL in 30s`
- Tổng số test: **17 tests executed, 0 failures, 0 errors, 0 skipped**
- File kết quả: `backend/auth-service/build/test-results/test/TEST-com.ecommerce.auth.controller.AdminCustomerApiQATest$*.xml`

### Lệnh 2: Thực thi Test Suite Thống kê (ECOM-326)
```bash
.\gradlew.bat :order-service:test --tests "com.ecommerce.order.controller.AdminStatisticsApiQATest" --no-daemon
```
**Kết quả:**
- Trạng thái: `BUILD SUCCESSFUL in 28s`
- Tổng số test: **12 tests executed, 0 failures, 0 errors, 0 skipped**
- File kết quả: `backend/order-service/build/test-results/test/TEST-com.ecommerce.order.controller.AdminStatisticsApiQATest$*.xml`

### Lệnh 3: Kiểm tra hồi quy toàn diện (Regression Verification)
```bash
.\gradlew.bat :auth-service:test :order-service:test --no-daemon
```
**Kết quả:**
- Trạng thái: `BUILD SUCCESSFUL in 1m 28s`
- Toàn bộ các test cases hiện hữu và mới của cả 2 services đều đạt **100% PASS**, không có bất kỳ lỗi hồi quy nào phát sinh.

---

## 8. ĐÁNH GIÁ VÀ KẾT LUẬN CUỐI CÙNG

1. **Hoàn thành 100% mục tiêu của ECOM-327:** Đã kiểm thử đầy đủ API danh sách khách hàng (`ECOM-325`) và API thống kê doanh thu / đơn hàng (`ECOM-326`), kiểm tra phân quyền ADMIN / USER / GUEST, validation dữ liệu, các trường hợp dữ liệu rỗng và bảo vệ thông tin nhạy cảm.
2. **Chất lượng mã nguồn:** Phát hiện và khắc phục kịp thời 02 lỗi tiềm ẩn về validation tham số phân trang và xử lý ngoại lệ HTTP 500, nâng cao độ bền vững và tính an toàn của hệ thống.
3. **Mã nguồn sạch và an toàn:** Toàn bộ test và thay đổi đều nằm trong phạm vi cho phép, tuân thủ nghiêm ngặt quy tắc Git (không commit, không push, không merge).
4. **Trạng thái nghiệm thu:** **ĐẠT YÊU CẦU NGHIỆM THU SPRINT 3 (READY FOR REVIEW & MERGE).**
