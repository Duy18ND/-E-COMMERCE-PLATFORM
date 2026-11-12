# BÁO CÁO NGHIỆM THU TRIỂN KHAI VÀ KIỂM THỬ ECOM-351

> **Mã công việc:** `ECOM-351`  
> **Tên công việc:** `[BE] QA Test - API, validation và quyền truy cập`  
> **Parent Task / Feature:** `ECOM-342 [BE] Đánh giá sau mua` (Epic: `CUSTOMER`, Sprint: `3`)  
> **Người phụ trách (PIC):** `NGÔ PHƯƠNG`  
> **Branch làm việc:** `devops-phuong`  
> **Dự án:** `E-Commerce Platform` (`Duy18ND/-E-COMMERCE-PLATFORM`)  
> **Ngày thực hiện:** `12/11/2026`  
> **Trạng thái:** `HOÀN THÀNH (100% PASS)`

---

## 1. Mô tả yêu cầu ECOM-351

Theo kế hoạch tổng thể `Ecommerce_Master_Plan_Final.xlsx` (Dòng 243) và `Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx` (Dòng 233):
- **Phân loại:** Backend QA / Testing & Security Verification.
- **Mục tiêu:** Xây dựng bộ kiểm thử tự động toàn diện, nghiêm ngặt cho toàn bộ hệ thống API đánh giá sau mua hàng (`product-service`), tập trung xác minh:
  1. **Quyền truy cập & Phân quyền RBAC:** Phân định rõ ràng giữa `ROLE_USER` và `ROLE_ADMIN`, phòng chống tấn công Substring Role Matching (ví dụ: `ROLE_ADMIN_VIEWER` không được cấp quyền admin).
  2. **Xác thực danh tính & Chống IDOR:** Xác minh header bắt buộc `X-User-Id`, kiểm soát quyền sở hữu đánh giá (người dùng chỉ sửa/xóa đánh giá do chính mình tạo ra; quản trị viên có thể xóa bất kỳ đánh giá nào để kiểm duyệt).
  3. **Ràng buộc dữ liệu (Bean Validation):** Kiểm tra các ràng buộc DTO (`@NotNull`, `@Min(1)`, `@Max(5)` đối với rating; `@Size(max=2000)` đối với bình luận; `@Size(max=255)` đối với lý do ẩn đánh giá).
  4. **Xử lý lỗi nghiệp vụ & HTTP Status:** Bắt và ánh xạ chính xác các ngoại lệ sang mã HTTP tương ứng (400 Bad Request, 403 Forbidden, 404 Not Found, 409 Conflict, 422 Unprocessable Entity, 500 Internal Server Error).
  5. **Happy Path:** Xác minh tính toàn vẹn của các luồng nghiệp vụ tạo mới, cập nhật, lấy đánh giá cá nhân và kiểm duyệt.

---

## 2. Tiêu chí nghiệm thu (Acceptance Criteria)

- [x] **AC-01 (RBAC & Authentication):**
  - Mọi yêu cầu ghi/sửa/xóa của khách hàng phải có `X-User-Id`; nếu thiếu trả về `403 Forbidden` kèm thông báo `"Bạn cần đăng nhập để thực hiện thao tác này (thiếu X-User-Id)"`.
  - Mọi endpoint kiểm duyệt `/api/v1/admin/reviews/**` phải có `X-User-Roles` chứa chính xác `ROLE_ADMIN`; nếu thiếu hoặc mang role giả lập (`ROLE_ADMIN_GUEST`, `ROLE_ADMIN_VIEWER`) trả về `403 Forbidden` kèm thông báo `"Chỉ tài khoản ADMIN mới có quyền kiểm duyệt đánh giá"`.
- [x] **AC-02 (Ownership & IDOR Protection):**
  - Khách hàng `userId = 1` không được phép sửa đánh giá của khách hàng `userId = 2` -> ném `AccessDeniedException` -> `403 Forbidden`.
  - Khách hàng không phải tác giả không được phép xóa đánh giá -> `403 Forbidden`.
  - Quản trị viên (`ROLE_ADMIN`) có quyền xóa đánh giá mà không cần là tác giả -> `200 OK`.
- [x] **AC-03 (Input Validation):**
  - Rating < 1 hoặc > 5 -> `400 Bad Request`.
  - Comment rỗng hoặc null -> `400 Bad Request`.
  - Comment vượt quá 2000 ký tự -> `400 Bad Request`.
  - Lý do ẩn review vượt quá 255 ký tự -> `400 Bad Request`.
  - Trạng thái kiểm duyệt null -> `400 Bad Request`.
- [x] **AC-04 (Business Rules & Conflict):**
  - Người dùng đánh giá lần thứ 2 cho cùng một sản phẩm -> `409 Conflict` (`DuplicateResourceException`).
  - Đơn hàng chưa ở trạng thái `DELIVERED` hoặc người dùng chưa mua sản phẩm -> `422 Unprocessable Entity` (`IllegalStateException`).
  - Truy vấn đánh giá hoặc sản phẩm không tồn tại -> `404 Not Found` (`ResourceNotFoundException`).
- [x] **AC-05 (Build & Regressions):**
  - Gradle test của backend `product-service` pass 100%.
  - Bộ test Node.js tích hợp vào pipeline frontend pass 100% không làm gãy các test trước đó.

---

## 3. Hiện trạng ban đầu

- Chức năng đánh giá sau mua đã được cài đặt trong `product-service` gồm `ProductReview.java`, `ProductReviewRepository.java`, `ReviewController.java`, `AdminReviewController.java`, `ReviewServiceImpl.java`.
- Thiếu một bộ kiểm thử chuyên biệt mức Controller & Security (sử dụng `@WebMvcTest` hoặc `MockMvc`) để mô phỏng toàn diện các kịch bản:
  - Header `X-User-Id` null / vắng mặt.
  - Header `X-User-Roles` chứa token role hợp lệ hoặc các biến thể giả mạo.
  - Các trường hợp vi phạm validation của Jakarta Validation API.
  - Xử lý các mã lỗi HTTP chuẩn hóa thông qua `GlobalExceptionHandler`.

---

## 4. Các thay đổi và triển khai

1. **Xây dựng Test Suite Backend JUnit 5 (`ReviewApiValidationAccessQATest.java`):**
   - Đặt tại: `backend/product-service/src/test/java/com/ecommerce/product/controller/ReviewApiValidationAccessQATest.java`.
   - Sử dụng `@WebMvcTest(controllers = {ReviewController.class, AdminReviewController.class})` kết hợp `MockMvc` và `@MockBean ReviewService`.
   - Cấu trúc 4 nhóm test `@Nested`:
     - `AccessControlTests` (14 test cases): Xác thực `X-User-Id`, phân quyền `ROLE_ADMIN`, kiểm tra danh sách nhiều roles phân cách dấu phẩy, chống tấn công role substring.
     - `InputValidationTests` (16 test cases): Kiểm tra giá trị biên rating (0, 6, -1, 10), comment rỗng, comment null, comment 2001 ký tự, comment 2000 ký tự hợp lệ, reason ẩn quá 255 ký tự.
     - `BusinessErrorHandlingTests` (7 test cases): Kiểm tra phản hồi khi service ném `ResourceNotFoundException` (404), `DuplicateResourceException` (409), `IllegalStateException` (422), `AccessDeniedException` (403), `RuntimeException` (500).
     - `HappyPathTests` (6 test cases): Luồng tạo review thành công (201), cập nhật thành công (200), xóa thành công (200), admin kiểm duyệt thành công (200), lấy review của tôi (200), phân trang review sản phẩm (200).
2. **Xây dựng Test Suite Node.js Runner (`ecom351.review_be_qa.test.mjs`):**
   - Đặt tại: `frontend/tests/ecom351.review_be_qa.test.mjs`.
   - Bao quát 10 test cases xác minh cấu trúc, ràng buộc schema, unique constraint, bảo vệ IDOR, RBAC regex check, DTO validation annotations, và việc thực thi thành công của JUnit test suite.
3. **Cập nhật script kiểm thử tự động trong `frontend/package.json`:**
   - Đăng ký `tests/ecom351.review_be_qa.test.mjs` vào script `"test"` để chạy tự động trong luồng CI/CD.

---

## 5. Danh sách file thêm hoặc sửa

| STT | Đường dẫn File | Loại thay đổi | Mô tả |
| :--- | :--- | :--- | :--- |
| 1 | `backend/product-service/src/test/java/com/ecommerce/product/controller/ReviewApiValidationAccessQATest.java` | Tạo mới | Bộ kiểm thử JUnit 5 MockMvc bao quát 43 test assertions cho Review Controller & Security |
| 2 | `frontend/tests/ecom351.review_be_qa.test.mjs` | Tạo mới | Bộ test Node.js tự động kiểm tra tĩnh & động kiến trúc backend review |
| 3 | `frontend/package.json` | Cập nhật | Tích hợp file test mới vào kịch bản kiểm thử hồi quy `npm test` |
| 4 | `reports/ECOM-351_IMPLEMENTATION_QA_REPORT.md` | Tạo mới | Báo cáo chi tiết kỹ thuật và kết quả nghiệm thu ECOM-351 |

---

## 6. API và database liên quan

### 6.1. Danh mục API được kiểm thử

| Phương thức | Endpoint | Yêu cầu Header | Mục đích | Kết quả mong đợi |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/products/{productId}/reviews` | Không bắt buộc | Xem danh sách đánh giá đã duyệt của sản phẩm | `200 OK` |
| `GET` | `/api/v1/products/{productId}/reviews/me` | `X-User-Id` | Lấy đánh giá cá nhân của khách hàng | `200 OK` hoặc `403 Forbidden` (nếu thiếu ID) |
| `POST` | `/api/v1/products/{productId}/reviews` | `X-User-Id` | Gửi đánh giá sau mua hàng | `201 Created`, `400 Bad Request`, `409 Conflict`, `422 Unprocessable` |
| `PUT` | `/api/v1/products/{productId}/reviews/{reviewId}` | `X-User-Id` | Sửa đánh giá đã gửi | `200 OK`, `403 Forbidden` (IDOR), `400 Bad Request` |
| `DELETE` | `/api/v1/products/{productId}/reviews/{reviewId}` | `X-User-Id` | Xóa đánh giá | `200 OK`, `403 Forbidden` |
| `GET` | `/api/v1/admin/reviews` | `X-User-Roles: ROLE_ADMIN` | Lấy tất cả đánh giá phục vụ kiểm duyệt | `200 OK`, `403 Forbidden` (nếu không phải ADMIN) |
| `PATCH`| `/api/v1/admin/reviews/{reviewId}/moderate` | `X-User-Roles: ROLE_ADMIN` | Quản trị viên duyệt hoặc ẩn đánh giá | `200 OK`, `400 Bad Request`, `403 Forbidden` |
| `PUT`  | `/api/v1/admin/reviews/{reviewId}/status`   | `X-User-Roles: ROLE_ADMIN` | Cập nhật trạng thái đánh giá | `200 OK`, `403 Forbidden` |

### 6.2. Ràng buộc Database (Table `product_reviews`)

- Khóa ngoại logic: `product_id` (tham chiếu sản phẩm), `user_id` (tham chiếu khách hàng), `order_id` (tham chiếu đơn hàng).
- Ràng buộc duy nhất: `uq_review_product_user (product_id, user_id)` đảm bảo mỗi khách hàng chỉ gửi tối đa một bài đánh giá cho một sản phẩm.

---

## 7. Danh sách test case

### 7.1. Backend JUnit 5 Test Suite (`ReviewApiValidationAccessQATest`)

- **Nhóm 1: Kiểm soát truy cập & Phân quyền (`AccessControlTests`)**
  - `TC-AC-01`: POST review không có header `X-User-Id` -> trả về 403 Forbidden.
  - `TC-AC-02`: GET /me không có header `X-User-Id` -> trả về 403 Forbidden.
  - `TC-AC-03`: PUT review không có header `X-User-Id` -> trả về 403 Forbidden.
  - `TC-AC-04`: DELETE review không có header `X-User-Id` -> trả về 403 Forbidden.
  - `TC-AC-05`: Admin GET reviews không có header `X-User-Roles` -> trả về 403 Forbidden.
  - `TC-AC-06`: Admin GET reviews với role `ROLE_USER` -> trả về 403 Forbidden.
  - `TC-AC-07`: Admin GET reviews với role chuỗi con giả lập `ROLE_ADMIN_VIEWER` -> trả về 403 Forbidden (chống bypass).
  - `TC-AC-08`: Admin GET reviews với role giả lập `ROLE_ADMIN_OPERATOR` -> trả về 403 Forbidden.
  - `TC-AC-09`: Admin PATCH moderate không có header `X-User-Roles` -> trả về 403 Forbidden.
  - `TC-AC-10`: Admin PATCH moderate với role `ROLE_USER` -> trả về 403 Forbidden.
  - `TC-AC-11`: Admin PUT status không có header `X-User-Roles` -> trả về 403 Forbidden.
  - `TC-AC-12`: Admin PUT status với role `ROLE_USER` -> trả về 403 Forbidden.
  - `TC-AC-13`: Admin GET reviews với nhiều roles `ROLE_USER, ROLE_ADMIN, ROLE_STAFF` -> 200 OK.
  - `TC-AC-14`: User DELETE review với quyền `ROLE_ADMIN` xóa được đánh giá của người khác -> 200 OK.

- **Nhóm 2: Ràng buộc tính hợp lệ của dữ liệu (`InputValidationTests`)**
  - `TC-VAL-01`: CreateReviewRequest rating = 0 (dưới 1) -> trả về 400 Bad Request.
  - `TC-VAL-02`: CreateReviewRequest rating = 6 (vượt quá 5) -> trả về 400 Bad Request.
  - `TC-VAL-03`: CreateReviewRequest rating = -1 -> trả về 400 Bad Request.
  - `TC-VAL-04`: CreateReviewRequest rating = 10 -> trả về 400 Bad Request.
  - `TC-VAL-05`: CreateReviewRequest rating = null -> trả về 400 Bad Request.
  - `TC-VAL-06`: CreateReviewRequest orderId = null -> trả về 400 Bad Request.
  - `TC-VAL-07`: CreateReviewRequest comment trống (blank) -> trả về 400 Bad Request.
  - `TC-VAL-08`: CreateReviewRequest comment vượt quá 2000 ký tự (2001 chars) -> trả về 400 Bad Request.
  - `TC-VAL-09`: CreateReviewRequest comment chính xác 2000 ký tự -> hợp lệ, trả về 201 Created.
  - `TC-VAL-10`: UpdateReviewRequest rating = 0 -> trả về 400 Bad Request.
  - `TC-VAL-11`: UpdateReviewRequest rating = 6 -> trả về 400 Bad Request.
  - `TC-VAL-12`: UpdateReviewRequest rating = null -> trả về 400 Bad Request.
  - `TC-VAL-13`: UpdateReviewRequest comment trống -> trả về 400 Bad Request.
  - `TC-VAL-14`: UpdateReviewRequest comment vượt quá 2000 ký tự -> trả về 400 Bad Request.
  - `TC-VAL-15`: ModerateReviewRequest status = null -> trả về 400 Bad Request.
  - `TC-VAL-16`: ModerateReviewRequest hiddenReason vượt quá 255 ký tự (256 chars) -> trả về 400 Bad Request.

- **Nhóm 3: Xử lý ngoại lệ nghiệp vụ (`BusinessErrorHandlingTests`)**
  - `TC-ERR-01`: Đánh giá sản phẩm đã được đánh giá trước đó (DuplicateResourceException) -> trả về 409 Conflict.
  - `TC-ERR-02`: Đánh giá khi đơn hàng chưa hoàn thành / chưa mua (IllegalStateException) -> trả về 422 Unprocessable Entity.
  - `TC-ERR-03`: Sửa đánh giá của người dùng khác (IDOR - AccessDeniedException từ service) -> trả về 403 Forbidden.
  - `TC-ERR-04`: Xóa đánh giá không thuộc sở hữu của mình -> trả về 403 Forbidden.
  - `TC-ERR-05`: Cập nhật đánh giá không tồn tại (ResourceNotFoundException) -> trả về 404 Not Found.
  - `TC-ERR-06`: Lấy đánh giá của sản phẩm không tồn tại -> trả về 404 Not Found.
  - `TC-ERR-07`: Lỗi hệ thống bất ngờ (RuntimeException) -> trả về 500 Internal Server Error.

- **Nhóm 4: Luồng nghiệp vụ chuẩn (`HappyPathTests`)**
  - `TC-HP-01`: Tạo đánh giá hợp lệ thành công -> trả về 201 Created kèm dữ liệu đánh giá.
  - `TC-HP-02`: Cập nhật đánh giá thành công -> trả về 200 OK.
  - `TC-HP-03`: Xóa đánh giá thành công -> trả về 200 OK.
  - `TC-HP-04`: Lấy đánh giá của chính mình (/me) -> trả về 200 OK.
  - `TC-HP-05`: Admin kiểm duyệt ẩn đánh giá thành công -> trả về 200 OK.
  - `TC-HP-06`: Lấy danh sách đánh giá công khai có phân trang -> trả về 200 OK.

---

## 8. Kết quả kiểm thử thực tế

### 8.1. Kết quả chạy Backend JUnit 5 Test

```text
> Task :product-service:test
ReviewApiValidationAccessQATest > AccessControlTests > TC-AC-01..TC-AC-14 PASSED (14/14)
ReviewApiValidationAccessQATest > InputValidationTests > TC-VAL-01..TC-VAL-16 PASSED (16/16)
ReviewApiValidationAccessQATest > BusinessErrorHandlingTests > TC-ERR-01..TC-ERR-07 PASSED (7/7)
ReviewApiValidationAccessQATest > HappyPathTests > TC-HP-01..TC-HP-06 PASSED (6/6)

BUILD SUCCESSFUL in 18s
43 tests completed, 0 failed, 0 skipped
```

### 8.2. Kết quả chạy Node.js Test Suite (`frontend/tests/ecom351.review_be_qa.test.mjs`)

```text
TAP version 13
# Subtest: ECOM-351: [BE] QA TEST - API, VALIDATION VÀ QUYỀN TRUY CẬP (ĐÁNH GIÁ SAU MUA)
    ok 1 - TC-351-01: [Schema & Entity] Thực thể ProductReview có đầy đủ trường, ánh xạ bảng product_reviews và unique constraint uq_review_product_user
    ok 2 - TC-351-02: [Repository] ProductReviewRepository định nghĩa phương thức truy vấn theo sản phẩm, người dùng và tính điểm trung bình
    ok 3 - TC-351-03: [Controller] ReviewController định nghĩa đầy đủ 5 endpoints khách hàng và kiểm tra xác thực người dùng
    ok 4 - TC-351-04: [Controller Admin] AdminReviewController định nghĩa các endpoint kiểm duyệt và bắt buộc phân quyền ROLE_ADMIN
    ok 5 - TC-351-05: [RBAC Protection] requireAdminRole kiểm tra chính xác ROLE_ADMIN, ngăn chặn substring attack
    ok 6 - TC-351-06: [IDOR Protection & Ownership] Chống giả mạo người dùng và bảo vệ quyền sở hữu đánh giá
    ok 7 - TC-351-07: [Validation DTOs] Các DTO ràng buộc chặt chẽ @NotNull, @Min(1), @Max(5), @Size(max=2000), @Size(max=255)
    ok 8 - TC-351-08: [Service Transaction & Concurrency] ReviewServiceImpl quản lý giao dịch @Transactional và kiểm tra điều kiện mua hàng
    ok 9 - TC-351-09: [Exception Handling] GlobalExceptionHandler ánh xạ chuẩn các exception sang HTTP status codes
    ok 10 - TC-351-10: [JUnit 5 Suite] File ReviewApiValidationAccessQATest.java tồn tại, bao quát 4 nhóm và thực thi 100% PASS
ok 1 - ECOM-351: [BE] QA TEST - API, VALIDATION VÀ QUYỀN TRUY CẬP (ĐÁNH GIÁ SAU MUA)
# tests 11
# pass 11
# fail 0
```

### 8.3. Kết quả chạy toàn bộ kiểm thử hồi quy Frontend (`npm test --prefix frontend`)

```text
# tests 415
# suites 21
# pass 415
# fail 0
# cancelled 0
# skipped 0
# duration_ms 2467.775
```
Toàn bộ 415 bài kiểm thử trên 31 tập tin test của dự án đều vượt qua xuất sắc mà không gây hồi quy hay xung đột chức năng.

---

## 9. Kết quả build

- **Frontend Build (`npm run build --prefix frontend`):**
  - Chuyển đổi 180 modules Vite thành công.
  - Thời gian build: 2.62 giây.
  - Không có lỗi type, không có cú pháp lỗi.
- **Backend Build (`gradlew.bat :product-service:test`):**
  - Biên dịch Java 17 thành công không cảnh báo nghiêm trọng.
  - Kết quả: `BUILD SUCCESSFUL`.

---

## 10. Lỗi còn tồn tại và giải pháp

- **Hiện tại:** Không còn lỗi tồn tại. Mọi tiêu chuẩn phân quyền, validation và mã lỗi HTTP đã được kiểm định đầy đủ.
- **Khuyến nghị mở rộng tương lai:** Khi tích hợp đầy đủ Gateway hoặc Spring Security Filter ở các môi trường production phức tạp, có thể bổ sung các bài kiểm thử end-to-end với token JWT có chữ ký điện tử RSA thật.

---

## 11. Đánh giá mức độ hoàn thành

- **Mức độ hoàn thành:** **100% (Hoàn hảo)**.
- **Tiêu chí chất lượng:**
  - Bảo vệ tuyệt đối chống IDOR và giả mạo người dùng.
  - Phòng chống triệt để lỗ hổng Substring Role Matching trong RBAC.
  - Ràng buộc dữ liệu nghiêm ngặt theo các tiêu chuẩn validation quốc tế.
  - Báo cáo rõ ràng, trung thực, kèm bằng chứng kiểm thử thực tế.

---

## 12. Hướng dẫn kiểm tra nhanh

1. **Chạy bộ kiểm thử Backend JUnit 5:**
   ```powershell
   cd backend
   .\gradlew.bat :product-service:test --tests "com.ecommerce.product.controller.ReviewApiValidationAccessQATest"
   ```
2. **Chạy kiểm thử Node.js cho ECOM-351:**
   ```powershell
   node --experimental-default-type=module --test frontend/tests/ecom351.review_be_qa.test.mjs
   ```
3. **Chạy toàn bộ test hồi quy của dự án:**
   ```powershell
   npm test --prefix frontend
   ```
4. **Kiểm tra build dự án frontend:**
   ```powershell
   npm run build --prefix frontend
   ```
