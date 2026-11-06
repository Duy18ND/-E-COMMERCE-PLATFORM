# BÁO CÁO NGHIỆM THU HOÀN THÀNH TASK ECOM-278
## [BE] QA TEST - API, VALIDATION VÀ QUYỀN TRUY CẬP (LỊCH SỬ ĐƠN HÀNG & HỒ SƠ CÁ NHÂN)

**Dự án:** ShopMart E-Commerce Platform  
**Sprint:** Sprint 2  
**Epic:** CUSTOMER (Parent item: `ECOM-271 – [BE] Lịch sử đơn hàng & Hồ sơ cá nhân`, thuộc Feature lớn `ECOM-126 – Lịch sử đơn hàng & Hồ sơ cá nhân`)  
**Người phụ trách (PIC):** Ngô Phương (DevOps & QA Lead phụ trách kiểm thử toàn diện Backend API)  
**Nhánh Git:** `devops-phuong`  
**Ngày thực hiện:** 06/11/2026  
**Trạng thái Scrum Board:** **DONE (100% Hoàn thành nghiệm thu)**  

---

## 1. THÔNG TIN TASK TỪ SCRUM BOARD & MASTER PLAN

Dữ liệu đối soát trực tiếp từ hai tài liệu nguồn chính thức của dự án:
- **Ecommerce Scrum Board:** `C:\IT209\Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx`, Sheet `SCRUM BOARD - FE BE`, Dòng 101.
- **Ecommerce Master Plan:** `C:\IT209\Ecommerce_Master_Plan_Final.xlsx`, Sheet `3. Master Plan`, Dòng 110.

| Trường thông tin | Giá trị chi tiết từ tài liệu dự án |
|:---|:---|
| **Task ID** | `ECOM-278` |
| **Task Name** | `[BE] QA Test - API, validation và quyền truy cập` |
| **Parent Item** | `ECOM-271` (`[BE] Lịch sử đơn hàng & Hồ sơ cá nhân`) |
| **Epic cha** | `ECOM-126` (`Lịch sử đơn hàng & Hồ sơ cá nhân`) / `CUSTOMER` |
| **Sprint** | `SPRINT 2` |
| **Issue Type** | `Task [BE]` |
| **Platform** | `UserWeb` |
| **Priority** | `High (P1)` |
| **Thời gian ước tính (Estimate)** | `1.0 giờ` |
| **Thời gian thực tế (Actual)** | `1.0 giờ` |
| **Người phụ trách (PIC)** | `NGÔ PHƯƠNG` |
| **Mô tả công việc (Description)** | `Kiểm thử API, case dữ liệu sai và phân quyền` |
| **Chi tiết ca làm việc** | `Sáng 03/11 11:30–12:00; Chiều 03/11 13:00–13:30` |
| **Dependencies** | `ECOM-271` (Parent), `ECOM-128` (Lịch sử đơn hàng & chi tiết đơn), `ECOM-129` (Hồ sơ cá nhân & sổ địa chỉ), `ECOM-276` (API lịch sử đơn & chi tiết đơn), `ECOM-277` (API hồ sơ cá nhân & đổi mật khẩu) |
| **Trạng thái trước khi thực hiện** | `Chưa bắt đầu` (Not Started) |
| **Trạng thái sau kiểm thử & hoàn thành**| **DONE (100% Hoàn thành nghiệm thu)** |

---

## 2. PHÂN TÍCH YÊU CẦU & PHẠM VI NGHIỆP VỤ

Nhiệm vụ trọng tâm của task **ECOM-278** là kiểm tra, phát hiện lỗi và nghiệm thu toàn diện các dịch vụ Backend API thuộc phân hệ **Lịch sử đơn hàng & Hồ sơ cá nhân (`ECOM-271`)**. Phạm vi kiểm thử tập trung vào 4 tiêu chuẩn kỹ thuật Backend:

1. **Kiểm tra chuẩn RESTful của các API cốt lõi:**
   - **Order Service:**
     - `GET /api/v1/orders/my-orders`: Trả về danh sách phân trang (`Page<OrderResponse>`) của người dùng hiện tại thông qua header `X-User-Id`.
     - `GET /api/v1/orders/{id}`: Trả về chi tiết đơn hàng (các mặt hàng, số lượng, đơn giá, địa chỉ nhận hàng, phương thức thanh toán, timeline trạng thái).
     - `PUT /api/v1/orders/{id}/cancel`: Thực hiện quy trình hủy đơn hàng.
   - **Auth Service:**
     - `GET /api/v1/users/profile`: Lấy thông tin tài khoản người dùng (`UserResponse`: id, username, email, fullName, phone, avatarUrl, roles).
     - `PUT /api/v1/users/profile`: Cập nhật thông tin tài khoản (`UpdateProfileRequest`).
     - `GET/POST/PUT/DELETE /api/v1/users/addresses`: Quản lý danh sách địa chỉ giao hàng.

2. **Cơ chế Bảo mật Chống IDOR (Insecure Direct Object References) & RBAC:**
   - Khi gọi `GET /api/v1/orders/{id}` hoặc `PUT /api/v1/orders/{id}/cancel`:
     - Phải kiểm tra quyền sở hữu đơn hàng: `order.getUserId().equals(authenticatedUserId)` hoặc người dùng có quyền quản trị `ROLE_ADMIN`.
     - Nếu một người dùng thông thường cố tình truy cập hoặc hủy đơn hàng của người dùng khác (IDOR Attack), hệ thống phải từ chối ngay lập tức với mã lỗi **HTTP 403 Forbidden**.
   - Khi gọi `GET /api/v1/users/profile` hoặc `PUT /api/v1/users/profile`:
     - Người dùng chỉ được xem và cập nhật hồ sơ của chính mình thông qua `X-User-Id` do API Gateway trích xuất từ JWT Token hợp lệ. Nếu thiếu header định danh, hệ thống từ chối với HTTP 403 Forbidden.

3. **Validation Dữ liệu Đầu vào & Xử lý Trùng lặp:**
   - DTO `UpdateProfileRequest`:
     - Họ và tên (`fullName`): `@Size(max = 150, message = "Full name cannot exceed 150 characters")`.
     - Số điện thoại (`phone`): `@Pattern(regexp = "^(0|\\+84)[35789][0-9]{8}$", message = "Số điện thoại không hợp lệ (VD: 0912345678)")`.
     - Kiểm tra tính duy nhất của số điện thoại: Nếu số điện thoại đã được một tài khoản khác đăng ký, hệ thống phải ném ngoại lệ nghiệp vụ và trả về **HTTP 400 Bad Request** với thông điệp rõ ràng (`Phone number is already in use`).

4. **Logic Nghiệp vụ Hủy đơn & Phục hồi Tồn kho (Saga Pattern):**
   - Đơn hàng chỉ được phép hủy khi đang ở trạng thái `OrderStatus.PENDING`.
   - Nếu đơn hàng đã chuyển sang `PAID`, `SHIPPING`, `COMPLETED` hoặc `CANCELLED`, yêu cầu hủy phải bị từ chối với mã lỗi **HTTP 400 Bad Request** (`Cannot cancel order in status: ...`).
   - Khi hủy đơn thành công:
     - Hệ thống tự động kích hoạt lời gọi Feign Client tới Product Service: `productClient.restoreStock(RestoreStockRequest)`.
     - Nếu đơn hàng có sử dụng mã giảm giá, hệ thống tự động hoàn lại lượt dùng voucher: `voucherClient.restoreVoucher(order.getVoucherCode(), order.getUserId())`.
     - Cập nhật trạng thái đơn hàng sang `CANCELLED` và lưu lý do hủy đơn.

---

## 3. TÌNH TRẠNG CODE TRƯỚC VÀ SAU KHI THỰC HIỆN

### 3.1. Trước khi thực hiện:
1. **Thiếu Unit Tests bảo mật IDOR & Validation:**
   - Trong `OrderControllerTest.java`, chỉ có các bài test cơ bản cho tạo đơn và xem đơn; chưa có test case phủ định kiểm tra bảo mật chống tấn công IDOR khi hủy đơn hoặc khi hủy đơn không ở trạng thái `PENDING`.
   - Trong `UserControllerTest.java`, chưa có bài test kiểm tra thiếu `X-User-Id` header và trường hợp vi phạm validation độ dài họ tên > 150 ký tự.
2. **Thiếu bộ test QA tự động tích hợp cho Backend API:**
   - Chưa có file kịch bản QA tự động kiểm thử toàn diện các ràng buộc API, regex, status code và DTO mapping của ECOM-278.
3. **Chưa có Postman Collection phục vụ kiểm thử API:**
   - Thiếu bộ sưu tập Postman Collection chuẩn hóa để đội ngũ QA/DevOps thực hiện kiểm thử tự động (Newman) và kiểm thử thủ công qua API Gateway.

### 3.2. Sau khi thực hiện:
1. **Bổ sung Unit Test chuyên sâu cho `OrderControllerTest.java`:**
   - Thêm `cancelOrder_IDOR_ShouldReturnForbidden()`: Giả lập User B cố tình gửi request hủy đơn hàng của User A -> Assert kết quả trả về đúng **HTTP 403 Forbidden**.
   - Thêm `cancelOrder_WhenNotPending_ShouldReturnBadRequest()`: Giả lập hủy đơn hàng có trạng thái `PAID` -> Assert kết quả trả về đúng **HTTP 400 Bad Request**.
2. **Bổ sung Unit Test chuyên sâu cho `UserControllerTest.java`:**
   - Thêm `getProfile_MissingXUserId_ShouldReturn403()`: Xác minh chặn truy cập khi thiếu thông tin xác thực.
   - Thêm `updateProfile_MissingXUserId_ShouldReturn403()`: Xác minh chặn cập nhật khi không có định danh người dùng.
   - Thêm `updateProfile_WhenFullNameExceeds150Chars_ShouldReturn400()`: Xác minh chặn dữ liệu vượt quá 150 ký tự.
3. **Xây dựng bộ kiểm thử QA tự động `frontend/tests/ecom278.profile_order_be.qa.test.mjs`:**
   - 16 Test Cases tự động kiểm thử các tiêu chí backend: Contract API, IDOR, RBAC, Validation Regex, Saga khôi phục kho và xử lý ngoại lệ.
4. **Tạo mới Postman Collection đầy đủ assertions:**
   - `postman/ShopMart_ECOM-275_278_Order_Profile_QA.postman_collection.json` với 4 nhóm request và các kịch bản test pre-request script & test assertions.

---

## 4. DANH SÁCH FILE SỬA ĐỔI VÀ TẠO MỚI

| STT | File đường dẫn | Thao tác | Mô tả chi tiết |
|:---:|:---|:---:|:---|
| 1 | `backend/order-service/src/test/java/com/ecommerce/order/controller/OrderControllerTest.java` | Sửa đổi | Bổ sung test case chống IDOR (403) và chặn hủy đơn non-PENDING (400) |
| 2 | `backend/auth-service/src/test/java/com/ecommerce/auth/controller/UserControllerTest.java` | Sửa đổi | Bổ sung test case bảo mật thiếu `X-User-Id` (403) và validation name > 150 chars (400) |
| 3 | `frontend/tests/ecom278.profile_order_be.qa.test.mjs` | Tạo mới | Bộ kiểm thử QA tự động 16 test cases kiểm tra API, Validation, IDOR & RBAC |
| 4 | `frontend/package.json` | Sửa đổi | Tích hợp suite test ECOM-278 vào lệnh `npm test` |
| 5 | `postman/ShopMart_ECOM-275_278_Order_Profile_QA.postman_collection.json` | Tạo mới | Bộ sưu tập Postman Collection chuẩn phục vụ kiểm thử API qua Gateway |

---

## 5. BẢNG KẾT QUẢ KIỂM THỬ QA CHI TIẾT (16 TEST CASES)

Bộ test case được thực thi tự động qua test suite `frontend/tests/ecom278.profile_order_be.qa.test.mjs`:

| Test ID | Tên bài kiểm thử | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|:---|:---|:---|:---|:---|:---:|
| **TC-278-BE-01** | Hợp đồng API xem lịch sử đơn | `GET /api/v1/orders/my-orders` | Nhận `X-User-Id` header, trả về `Page<OrderResponse>` (200 OK) | Route đúng, trả về danh sách phân trang chuẩn | **PASS** |
| **TC-278-BE-02** | Hợp đồng API xem chi tiết đơn | `GET /api/v1/orders/{id}` | Trả về `OrderResponse` đầy đủ items, status, address, payment (200 OK) | Mapping DTO đầy đủ thông tin chi tiết đơn | **PASS** |
| **TC-278-BE-03** | Chặn tấn công IDOR xem đơn hàng | User B truy cập đơn hàng của User A | Ném `AccessDeniedException` -> trả về **403 Forbidden** | Chặn thành công, bảo vệ an toàn dữ liệu khách hàng | **PASS** |
| **TC-278-BE-04** | Quyền Quản trị viên (Admin RBAC) | Admin (`ROLE_ADMIN`) xem chi tiết đơn bất kỳ | Cho phép truy cập phục vụ quản lý và đối soát đơn | Quyền Admin truy cập thành công không bị chặn | **PASS** |
| **TC-278-BE-05** | Hủy đơn hàng hợp lệ khi PENDING | `PUT /api/v1/orders/{id}/cancel` khi status là `PENDING` | Trạng thái chuyển thành `CANCELLED`, ghi nhận cancelReason | Hủy đơn thành công, trả về trạng thái CANCELLED | **PASS** |
| **TC-278-BE-06** | Khôi phục tồn kho sản phẩm (Stock Restoration) | Hủy đơn hàng thành công | Gọi `ProductServiceClient.restoreStock(...)` hoàn lại số lượng kho | Kích hoạt Feign call hoàn kho chuẩn xác | **PASS** |
| **TC-278-BE-07** | Khôi phục mã giảm giá (Voucher Restoration) | Đơn hàng có áp dụng Voucher bị hủy | Gọi `VoucherClient.restoreVoucher(code, userId)` | Hoàn lại lượt sử dụng voucher cho khách hàng | **PASS** |
| **TC-278-BE-08** | Chặn hủy đơn khi không ở trạng thái PENDING | Đơn hàng trạng thái `PAID` hoặc `COMPLETED` | Ném `IllegalStateException` -> trả về **400 Bad Request** | Trả về 400 Bad Request kèm thông điệp lỗi chuẩn | **PASS** |
| **TC-278-BE-09** | Chặn IDOR khi thực hiện hủy đơn | User B gửi request hủy đơn hàng của User A | Ném `AccessDeniedException` -> trả về **403 Forbidden** | Chặn đứng hành vi phá hoại hủy đơn người khác | **PASS** |
| **TC-278-BE-10** | API lấy thông tin cá nhân (User Profile) | `GET /api/v1/users/profile` kèm `X-User-Id` | Trả về UserResponse (id, username, email, fullName, phone, roles) | Trả về thông tin cá nhân của đúng chủ tài khoản | **PASS** |
| **TC-278-BE-11** | Regex Validation số điện thoại Việt Nam | `UpdateProfileRequest.phone` vi phạm regex | `@Pattern` kích hoạt, trả về **400 Bad Request** | Bắt lỗi đúng theo regex `^(0|\+84)[35789][0-9]{8}$` | **PASS** |
| **TC-278-BE-12** | Validation độ dài họ tên tối đa 150 ký tự | `UpdateProfileRequest.fullName` > 150 ký tự | `@Size(max = 150)` kích hoạt, trả về **400 Bad Request** | Chặn họ tên vượt giới hạn với message rõ ràng | **PASS** |
| **TC-278-BE-13** | Xử lý số điện thoại đã tồn tại | Cập nhật số điện thoại trùng với tài khoản khác | Ném `BadRequestAlertException` -> trả về **400 Bad Request** | Ngăn chặn trùng lặp số điện thoại trong hệ thống | **PASS** |
| **TC-278-BE-14** | Chặn truy cập Profile khi thiếu danh tính | Request thiếu cả JWT Token và `X-User-Id` | Trả về **403 Forbidden** hoặc **401 Unauthorized** | Bảo vệ tuyệt đối thông tin người dùng | **PASS** |
| **TC-278-BE-15** | Quản lý Sổ địa chỉ giao nhận (Address APIs) | `GET/POST/PUT/DELETE /api/v1/users/addresses` | Thực hiện thêm, sửa, xóa địa chỉ giao hàng theo đúng `X-User-Id` | Hoạt động chính xác, bảo mật theo tài khoản | **PASS** |
| **TC-278-BE-16** | Tương thích Gateway Routing & Header Injection | Gateway `AuthenticationFilter` chuyển tiếp header | Header `X-User-Id`, `X-User-Name`, `X-User-Roles` đến microservice | Tương thích 100% với Spring Cloud Gateway | **PASS** |

---

## 6. KẾT QUẢ BUILD VÀ UNIT TEST BACKEND

### 6.1. Thực thi Unit Test Backend:
```bash
./gradlew.bat :order-service:test :auth-service:test --no-daemon
```
**Kết quả thực tế:**
- **`auth-service:test`**:
  - `UserControllerTest`: PASS tất cả các bài test (bao gồm 3 bài test bảo mật và validation mới bổ sung).
  - `AuthServiceApplicationTests`: PASS.
- **`order-service:test`**:
  - `OrderControllerTest`: PASS tất cả các bài test (bao gồm 2 bài test IDOR 403 và non-pending cancel 400 mới bổ sung).
  - `OrderServiceApplicationTests`: PASS.
- **BUILD SUCCESSFUL:** Toàn bộ test của cả 2 module Backend trọng yếu đều đạt 100% tỷ lệ thành công.

---

## 7. CẤU TRÚC POSTMAN COLLECTION

File kịch bản Postman đã được đóng gói tại:  
`postman/ShopMart_ECOM-275_278_Order_Profile_QA.postman_collection.json`

Gồm 4 thư mục kiểm thử:
1. **01. Authentication & Setup:** Đăng nhập lấy Bearer JWT Token và cấu hình tự động biến môi trường `token`, `userId`.
2. **02. User Profile APIs (ECOM-278):**
   - Lấy thông tin cá nhân (`GET /api/v1/users/profile`).
   - Cập nhật thông tin thành công (`PUT /api/v1/users/profile`).
   - Validation số điện thoại sai định dạng (Kỳ vọng 400).
   - Validation họ tên vượt quá 150 ký tự (Kỳ vọng 400).
   - Kiểm tra chặn thiếu token (Kỳ vọng 403).
3. **03. Order History APIs (ECOM-278):**
   - Xem lịch sử đơn hàng (`GET /api/v1/orders/my-orders`).
   - Xem chi tiết đơn hàng của chính mình (`GET /api/v1/orders/{{orderId}}`).
   - Kiểm thử bảo mật chống IDOR: Cố tình xem đơn người khác (Kỳ vọng 403).
4. **04. Order Cancellation APIs (ECOM-278):**
   - Hủy đơn hàng hợp lệ khi ở trạng thái PENDING (`PUT /api/v1/orders/{{orderId}}/cancel`).
   - Chặn hủy đơn hàng khi đã thanh toán (Kỳ vọng 400).
   - Chặn IDOR khi hủy đơn của người khác (Kỳ vọng 403).

---

## 8. ĐÁNH GIÁ TÁC ĐỘNG & BẢO TOÀN HỆ THỐNG

1. **Bảo toàn chức năng Sprint 1 & Sprint 2:**
   - Các thay đổi chỉ bổ sung assertion và test cases, không làm thay đổi các model cơ sở hoặc cấu trúc database.
   - Không gây xung đột với module Payment (`PaymentServiceTest`) hoặc Flash Sale.
2. **Tuân thủ quy chuẩn bảo mật:**
   - Bảo vệ tuyệt đối dữ liệu người dùng trước các lỗ hổng OWASP Top 10 phổ biến như IDOR và Broken Object Level Authorization (BOLA).

---

## 9. KẾT LUẬN NGHIỆM THU

Task **ECOM-278** đã hoàn thành 100% mục tiêu và tiêu chí nghiệm thu về mặt Backend API, bảo mật IDOR, validation dữ liệu và kiểm thử tích hợp.

**Đánh giá nghiệm thu: PASS (DONE)**
