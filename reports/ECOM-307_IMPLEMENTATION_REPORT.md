# BÁO CÁO TRIỂN KHAI & KIỂM THỬ QA TASK ECOM-307
## [BE] QA TEST - API, VALIDATION VÀ QUYỀN TRUY CẬP (HỆ THỐNG FLASH SALE)

---

- **Mã Task:** `ECOM-307`
- **Tên Task:** `[BE] QA Test - API, validation và quyền truy cập`
- **Sprint:** `Sprint 2`
- **Epic / Feature:** `GUEST` / `ECOM-157` (`Flash Sale System` / `ECOM-158`)
- **Parent Task:** `ECOM-298` (`[BE] Flash Sale`)
- **Platform:** `UserWeb, AdminWeb, API`
- **Issue Type:** `Task [BE]`
- **Độ ưu tiên (Priority):** `High (P1)`
- **Người phụ trách (PIC):** `NGÔ PHƯƠNG`
- **Vai trò thực hiện:** Senior Fullstack Developer, QA Automation Engineer & DevOps Engineer
- **Workspace:** `C:\IT209\-E-COMMERCE-PLATFORM`
- **Nhánh phát triển:** `devops-phuong`
- **Trạng thái thực tế:** **HOÀN THÀNH 100% (DONE - PASS TẤT CẢ TIÊU CHÍ NGHIỆM THU)**

---

## 1. THÔNG TIN TASK ECOM-307

Dữ liệu được trích xuất trực tiếp và đối chiếu từ các tài liệu quy chuẩn dự án ShopMart:
1. **Scrum Board:** `C:\IT209\Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx` (Sheet: `SCRUM BOARD - FE BE`, Dòng 92 thuộc Parent Task ECOM-298).
2. **Master Plan:** `C:\IT209\Ecommerce_Master_Plan_Final.xlsx` (Sheet: `3. Master Plan`, Dòng 92).

| Thuộc tính | Chi tiết kỹ thuật |
| :--- | :--- |
| **Task ID** | `ECOM-307` |
| **Task Name** | `[BE] QA Test - API, validation và quyền truy cập` |
| **Epic** | `GUEST` / `ECOM-157` (`Flash Sale System` / `ECOM-158`) |
| **Parent Task** | `ECOM-298` (`[BE] Flash Sale`) |
| **Sprint** | `SPRINT 2` |
| **Platform** | `UserWeb, AdminWeb, API` |
| **Issue Type** | `Task [BE]` |
| **Priority** | `High (P1)` |
| **Người phụ trách (PIC)** | `NGÔ PHƯƠNG` |
| **Time Estimate** | `1.0 hour` |
| **Mô tả công việc** | `Kiểm thử API, case dữ liệu sai và phân quyền` |
| **Dependencies** | Phụ thuộc vào các task backend trong Epic Flash Sale: `ECOM-161` (Schema DB), `ECOM-162` (Giá Flash Sale & Checkout), `ECOM-304` (API danh sách Flash Sale hiệu lực), `ECOM-305` (API quản lý chương trình & kiểm soát giá/số lượng), `ECOM-306` (Trang Admin quản lý Flash Sale), và tích hợp với Frontend `ECOM-165` (Giao diện Flash Sale). |
| **Trạng thái Scrum Board**| `Chưa bắt đầu` $\rightarrow$ Chuyển sang `Hoàn thành (DONE)` |

---

## 2. PHÂN TÍCH YÊU CẦU

### 2.1. Mục tiêu
Xây dựng bộ kiểm thử QA tự động hóa toàn diện cho toàn bộ các endpoint Backend của hệ thống Flash Sale (`backend/product-service`), tập trung kiểm tra:
1. **API Khách hàng & Công khai (Public & Customer APIs):**
   - Tra cứu danh sách chiến dịch Flash Sale đang diễn ra (`GET /api/v1/flash-sales/active`) không yêu cầu xác thực người dùng.
   - Đặt chỗ và trừ tồn kho Flash Sale nguyên tử qua Redis Lua script (`POST /api/v1/flash-sales/reserve`).
2. **API Quản trị Chiến dịch Flash Sale (Admin Campaign CRUD & Redis Stock):**
   - Lấy danh sách toàn bộ chiến dịch Flash Sale (`GET /api/v1/admin/flash-sales/campaigns`).
   - Lấy chi tiết chiến dịch theo ID (`GET /api/v1/admin/flash-sales/campaigns/{id}`).
   - Tạo mới chiến dịch kèm danh sách sản phẩm tham gia (`POST /api/v1/admin/flash-sales/campaigns`).
   - Cập nhật thông tin chiến dịch và cấu hình sản phẩm (`PUT /api/v1/admin/flash-sales/campaigns/{id}`).
   - Cập nhật trạng thái chiến dịch (`PUT /api/v1/admin/flash-sales/campaigns/{id}/status`).
   - Xóa chiến dịch (`DELETE /api/v1/admin/flash-sales/campaigns/{id}`).
   - Khởi tạo trực tiếp số lượng tồn kho Flash Sale cho sản phẩm lên Redis (`POST /api/v1/admin/flash-sales/products/{productId}?stock=...`).
3. **Phân quyền và Bảo mật (RBAC & Defense-in-Depth):**
   - Kiểm tra header phân quyền `X-User-Roles` được chuyển tiếp từ API Gateway.
   - Chặn toàn bộ truy cập từ Guest (không header) và User thông thường (`ROLE_USER`) khi gọi vào các endpoint `/api/v1/admin/...` với HTTP `403 Forbidden`.
   - Cấp quyền truy cập khi có `ROLE_ADMIN` hoặc multi-role chứa `ROLE_ADMIN` (`ROLE_USER, ROLE_ADMIN`).
4. **Validation dữ liệu và Xử lý ngoại lệ (Input Validation, Business Constraints & Edge Cases):**
   - Kiểm tra ràng buộc DTO `@Valid`: Tên chiến dịch, thời gian bắt đầu/kết thúc, danh sách sản phẩm, giá flash sale, số lượng, giới hạn mua mỗi khách.
   - Kiểm tra ràng buộc nghiệp vụ (Service level): Thời gian kết thúc phải sau thời gian bắt đầu, giá flash sale phải lớn hơn 0 và nhỏ hơn giá gốc niêm yết, số lượng flash sale không vượt quá tồn kho thực tế, không cho phép trùng lặp sản phẩm trong cùng chiến dịch, không cho phép cập nhật số lượng nhỏ hơn số lượng đã bán, không cho phép kích hoạt chiến dịch đã quá thời hạn.

---

## 3. TÌNH TRẠNG BAN ĐẦU

Trước khi thực hiện Task ECOM-307:
1. **Backend Codebase:**
   - Các file triển khai Flash Sale đã có sẵn: `FlashSaleController.java`, `FlashSaleService.java`, `FlashSaleCampaign.java`, `FlashSaleItem.java`, `FlashSaleConfig.java`, các DTO request/response.
   - Đã có test cơ bản: `FlashSaleControllerTest.java` (chỉ có 5 test unit cơ bản) và `FlashSaleServiceTest.java` (13 test unit cho service).
2. **Thiếu sót & Bất cập phát hiện:**
   - Chưa có bộ kiểm thử QA Test toàn diện (`FlashSaleApiQATest.java`) chuyên sâu về API contract, ma trận phân quyền RBAC đa vai trò và các ca biên validation theo đúng chuẩn của dự án (như `InventoryStockApiQATest.java` của ECOM-287 hay `AdminOrderApiQATest.java` của ECOM-296).
   - **Lỗi bất đồng bộ phân quyền phát hiện trong `FlashSaleController.java`:** Endpoint `POST /api/v1/admin/flash-sales/products/{productId}` khai báo `@RequestHeader("X-User-Roles") String userRoles` với thuộc tính `required` mặc định là `true`. Khi Guest gọi không gửi header, hệ thống ném `MissingRequestHeaderException` dẫn đến mã lỗi HTTP `400 Bad Request` thay vì HTTP `403 Forbidden` (chuẩn RBAC như tất cả các endpoint admin khác).

---

## 4. DANH SÁCH FILE THAY ĐỔI

| STT | Đường dẫn File | Loại thay đổi | Mục đích & Chi tiết kỹ thuật |
| :---: | :--- | :---: | :--- |
| 1 | `backend/product-service/src/main/java/com/ecommerce/product/controller/FlashSaleController.java` | **Modified** | Chuẩn hóa header phân quyền `@RequestHeader(value = "X-User-Roles", required = false)` tại endpoint `initFlashSale` để đảm bảo khi thiếu header sẽ rơi vào `requireAdminRole` và trả về chuẩn `403 Forbidden`. |
| 2 | `backend/product-service/src/test/java/com/ecommerce/product/controller/FlashSaleApiQATest.java` | **Created** | Tạo mới bộ kiểm thử QA tự động hóa toàn diện gồm **40 test case** chia làm 4 nhóm chuyên sâu (RBAC, Public Discovery/Reservation, Admin CRUD, Validation/Edge Cases). |
| 3 | `postman/ShopMart_ECOM-307_FlashSale_QA.postman_collection.json` | **Created** | Tạo mới bộ Postman Collection v2.1 gồm đầy đủ kịch bản request kiểm thử tự động phục vụ test API trên môi trường Local và VPS. |
| 4 | `reports/ECOM-307_IMPLEMENTATION_REPORT.md` | **Created** | Báo cáo nghiệm thu chi tiết task ECOM-307 theo đúng 12 mục tiêu chuẩn. |

---

## 5. KẾT QUẢ TRIỂN KHAI

### 5.1. Bộ kiểm thử MockMvc Spring Boot (`FlashSaleApiQATest.java`)
Được thiết kế theo kiến trúc standalone MockMvc tích hợp `MethodValidationInterceptor` và `GlobalExceptionHandler` của hệ thống ShopMart, bao phủ 40 kịch bản kiểm thử:
- **Nhóm 1 - RBAC & Security (9 tests):** Xác thực phân quyền 100% các endpoint admin chặn Guest (không header) và User (`ROLE_USER`), chỉ chấp nhận `ROLE_ADMIN` hoặc multi-role hợp lệ.
- **Nhóm 2 - Public & Customer APIs (7 tests):** Tra cứu chiến dịch đang hiệu lực, kiểm tra dữ liệu mảng rỗng khi không có sale, đặt chỗ tồn kho thành công, xử lý cháy hàng (`409 Conflict`), xử lý sản phẩm không nằm trong Flash Sale (`404 Not Found`), chặn tham số đặt chỗ sai (`400 Bad Request`).
- **Nhóm 3 - Admin Campaign CRUD (8 tests):** Lấy danh sách toàn bộ chiến dịch, lấy chi tiết theo ID tồn tại/không tồn tại, tạo mới thành công (`201 Created`), cập nhật chiến dịch (`200 OK`), chuyển đổi trạng thái (`200 OK`), xóa chiến dịch (`200 OK`), khởi tạo tồn kho Redis (`200 OK`).
- **Nhóm 4 - Validation & Edge Cases (16 tests):** Chặn tên rỗng/quá 200 ký tự, thời gian bắt đầu/kết thúc null hoặc kết thúc trước bắt đầu, items rỗng/null, item thiếu `productId`, item có giá $\le 0$, số lượng $< 1$, giới hạn mua $< 1$, giá flash sale $\ge$ giá gốc, số lượng vượt tồn kho, trùng lặp sản phẩm, trạng thái không hợp lệ, số lượng mới nhỏ hơn số lượng đã bán, kích hoạt chiến dịch quá hạn.

### 5.2. Postman Collection (`ShopMart_ECOM-307_FlashSale_QA.postman_collection.json`)
Cung cấp 14 request mẫu hoàn chỉnh với đầy đủ body, header, tham số và phân loại theo folder trực quan, sẵn sàng import vào Postman hoặc tích hợp vào Newman CI runner.

---

## 6. ACCEPTANCE CRITERIA (TIÊU CHÍ NGHIỆM THU)

*(Lưu ý: Do tài liệu Scrum Board chỉ ghi mô tả tổng quát "Kiểm thử API, case dữ liệu sai và phân quyền", các tiêu chí dưới đây được đề xuất và chuẩn hóa theo tiêu chuẩn kiến trúc dự án ShopMart)*

| AC ID | Nội dung tiêu chí nghiệm thu | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **AC-307-01** | Khách vãng lai truy cập danh sách Flash Sale đang hiệu lực | Trả về HTTP 200 OK kèm danh sách chiến dịch ACTIVE, không yêu cầu đăng nhập | HTTP 200 OK, trả về đúng danh sách sản phẩm Flash Sale | **PASS** |
| **AC-307-02** | Khách hàng đặt chỗ tồn kho Flash Sale hợp lệ | Gọi Redis Lua script, trả về HTTP 200 OK, trừ tồn kho nguyên tử | HTTP 200 OK, thông báo đặt chỗ thành công | **PASS** |
| **AC-307-03** | Đặt chỗ Flash Sale khi sản phẩm đã hết hàng | Ném `NotEnoughStockException`, trả về HTTP 409 Conflict | HTTP 409 Conflict ("Đã cháy hàng Flash Sale!") | **PASS** |
| **AC-307-04** | Đặt chỗ sản phẩm không nằm trong Flash Sale | Ném `ResourceNotFoundException`, trả về HTTP 404 Not Found | HTTP 404 Not Found kèm thông báo rõ ràng | **PASS** |
| **AC-307-05** | Guest hoặc User thường gọi API Admin Flash Sale | Bị chặn truy cập, trả về HTTP 403 Forbidden | HTTP 403 Forbidden, không cho phép truy cập trái phép | **PASS** |
| **AC-307-06** | Admin có header `ROLE_ADMIN` gọi API Quản lý chiến dịch | Cho phép truy cập, trả về HTTP 200 OK hoặc 201 Created | HTTP 200/201, xử lý nghiệp vụ chính xác | **PASS** |
| **AC-307-07** | Tạo/sửa chiến dịch có tên rỗng hoặc vượt quá 200 ký tự | Bean Validation chặn lại với HTTP 400 Bad Request | HTTP 400 Bad Request kèm chi tiết lỗi validation trường `name` | **PASS** |
| **AC-307-08** | Tạo chiến dịch có thời gian kết thúc trước thời gian bắt đầu | Chặn lại với HTTP 400 Bad Request (`isValidTimeRange`) | HTTP 400 Bad Request ("Thời gian kết thúc phải sau thời gian bắt đầu") | **PASS** |
| **AC-307-09** | Tạo chiến dịch không có sản phẩm tham gia (`items` rỗng/null) | Chặn lại với HTTP 400 Bad Request | HTTP 400 Bad Request ("Chiến dịch phải có ít nhất 1 sản phẩm tham gia") | **PASS** |
| **AC-307-10** | Item có giá flash sale $\le 0$, số lượng $< 1$ hoặc userLimit $< 1$ | Chặn lại với HTTP 400 Bad Request | HTTP 400 Bad Request kèm map lỗi chi tiết cho từng trường | **PASS** |
| **AC-307-11** | Giá Flash Sale $\ge$ Giá niêm yết gốc của sản phẩm | Service ném `IllegalArgumentException`, trả về HTTP 400 Bad Request | HTTP 400 Bad Request ("Giá Flash Sale phải nhỏ hơn giá gốc niêm yết") | **PASS** |
| **AC-307-12** | Số lượng Flash Sale vượt quá tồn kho thực tế của sản phẩm | Service ném `IllegalArgumentException`, trả về HTTP 400 Bad Request | HTTP 400 Bad Request ("Số lượng Flash Sale vượt quá tồn kho thực tế của sản phẩm") | **PASS** |
| **AC-307-13** | Trùng lặp sản phẩm trong cùng một chiến dịch | Service ném `IllegalArgumentException`, trả về HTTP 400 Bad Request | HTTP 400 Bad Request ("Sản phẩm ID ... bị trùng lặp trong cùng một chiến dịch") | **PASS** |
| **AC-307-14** | Cập nhật trạng thái chiến dịch với giá trị không hợp lệ | Service ném `IllegalArgumentException`, trả về HTTP 400 Bad Request | HTTP 400 Bad Request ("Trạng thái chiến dịch không hợp lệ...") | **PASS** |
| **AC-307-15** | Cập nhật số lượng mới nhỏ hơn số lượng đã bán | Service ném `IllegalArgumentException`, trả về HTTP 400 Bad Request | HTTP 400 Bad Request ("Số lượng Flash Sale mới (...) không được nhỏ hơn số lượng đã bán (...)") | **PASS** |
| **AC-307-16** | Kích hoạt chiến dịch đã quá thời hạn kết thúc | Chặn với HTTP 400 Bad Request | HTTP 400 Bad Request ("Không thể kích hoạt chiến dịch đã quá thời gian kết thúc") | **PASS** |
| **AC-307-17** | Tra cứu hoặc xóa chiến dịch không tồn tại theo ID | Ném `ResourceNotFoundException`, trả về HTTP 404 Not Found | HTTP 404 Not Found ("Không tìm thấy chiến dịch Flash Sale với ID: ...") | **PASS** |

---

## 7. CHI TIẾT TEST CASES (40 TEST CASES)

### 7.1. Nhóm 1: Phân quyền và Bảo mật (RBAC & Security)
1. `TC-307-SEC-01`: Guest truy cập `GET /api/v1/admin/flash-sales/campaigns` không header $\rightarrow$ HTTP 403 Forbidden.
2. `TC-307-SEC-02`: Guest truy cập `GET /api/v1/admin/flash-sales/campaigns/{id}` không header $\rightarrow$ HTTP 403 Forbidden.
3. `TC-307-SEC-03`: Guest truy cập `POST /api/v1/admin/flash-sales/campaigns` không header $\rightarrow$ HTTP 403 Forbidden.
4. `TC-307-SEC-04`: Guest truy cập `PUT /api/v1/admin/flash-sales/campaigns/{id}` không header $\rightarrow$ HTTP 403 Forbidden.
5. `TC-307-SEC-05`: Guest truy cập `PUT /api/v1/admin/flash-sales/campaigns/{id}/status` không header $\rightarrow$ HTTP 403 Forbidden.
6. `TC-307-SEC-06`: Guest truy cập `DELETE /api/v1/admin/flash-sales/campaigns/{id}` không header $\rightarrow$ HTTP 403 Forbidden.
7. `TC-307-SEC-07`: Guest truy cập `POST /api/v1/admin/flash-sales/products/{id}` không header $\rightarrow$ HTTP 403 Forbidden.
8. `TC-307-SEC-08`: Người dùng `ROLE_USER` truy cập các admin endpoint $\rightarrow$ HTTP 403 Forbidden.
9. `TC-307-SEC-09`: Admin có quyền `ROLE_ADMIN` hoặc multi-role `ROLE_USER, ROLE_ADMIN` $\rightarrow$ Cấp quyền thành công (200/201).

### 7.2. Nhóm 2: API Khách hàng & Công khai (Public Discovery & Reservation)
10. `TC-307-PUB-01`: Guest tra cứu danh sách Flash Sale hiệu lực `GET /api/v1/flash-sales/active` $\rightarrow$ 200 OK.
11. `TC-307-PUB-02`: Guest tra cứu khi không có chiến dịch nào hiệu lực $\rightarrow$ 200 OK với data mảng rỗng `[]`.
12. `TC-307-PUB-03`: Khách hàng đặt chỗ tồn kho Flash Sale `POST /api/v1/flash-sales/reserve` $\rightarrow$ 200 OK.
13. `TC-307-PUB-04`: Đặt chỗ khi sản phẩm hết hàng Flash Sale $\rightarrow$ 409 Conflict (`NotEnoughStockException`).
14. `TC-307-PUB-05`: Đặt chỗ khi sản phẩm không thuộc chương trình Flash Sale $\rightarrow$ 404 Not Found (`ResourceNotFoundException`).
15. `TC-307-PUB-06`: Đặt chỗ với `quantity <= 0` hoặc null $\rightarrow$ 400 Bad Request.
16. `TC-307-PUB-07`: Đặt chỗ với `productId == null` $\rightarrow$ 400 Bad Request.

### 7.3. Nhóm 3: API Quản trị Chiến dịch Flash Sale (Admin CRUD)
17. `TC-307-CRUD-01`: Admin xem toàn bộ danh sách chiến dịch $\rightarrow$ 200 OK kèm danh sách chi tiết.
18. `TC-307-CRUD-02`: Admin xem chi tiết chiến dịch tồn tại $\rightarrow$ 200 OK.
19. `TC-307-CRUD-03`: Admin xem chi tiết chiến dịch không tồn tại $\rightarrow$ 404 Not Found.
20. `TC-307-CRUD-04`: Admin tạo mới chiến dịch hợp lệ $\rightarrow$ 201 Created.
21. `TC-307-CRUD-05`: Admin cập nhật chiến dịch thành công $\rightarrow$ 200 OK.
22. `TC-307-CRUD-06`: Admin cập nhật trạng thái hợp lệ (`ENDED`, `ACTIVE`, `CANCELLED`) $\rightarrow$ 200 OK.
23. `TC-307-CRUD-07`: Admin xóa chiến dịch $\rightarrow$ 200 OK.
24. `TC-307-CRUD-08`: Admin khởi tạo trực tiếp số lượng Flash Sale lên Redis $\rightarrow$ 200 OK.

### 7.4. Nhóm 4: Kiểm thử Validation, Dữ liệu không hợp lệ & Biên (Validation & Edge Cases)
25. `TC-307-VAL-01`: Tên chiến dịch rỗng hoặc khoảng trắng $\rightarrow$ 400 Bad Request.
26. `TC-307-VAL-02`: Tên chiến dịch vượt quá 200 ký tự $\rightarrow$ 400 Bad Request.
27. `TC-307-VAL-03`: Thời gian bắt đầu hoặc kết thúc null $\rightarrow$ 400 Bad Request.
28. `TC-307-VAL-04`: Thời gian kết thúc trước hoặc bằng thời gian bắt đầu $\rightarrow$ 400 Bad Request.
29. `TC-307-VAL-05`: Danh sách items rỗng hoặc null $\rightarrow$ 400 Bad Request.
30. `TC-307-VAL-06`: Item thiếu `productId` $\rightarrow$ 400 Bad Request.
31. `TC-307-VAL-07`: Item có `flashSalePrice <= 0` hoặc null $\rightarrow$ 400 Bad Request.
32. `TC-307-VAL-08`: Item có `quantity < 1` hoặc null $\rightarrow$ 400 Bad Request.
33. `TC-307-VAL-09`: Item có `userLimit < 1` hoặc null $\rightarrow$ 400 Bad Request.
34. `TC-307-VAL-10`: Giá Flash Sale $\ge$ Giá gốc niêm yết của sản phẩm $\rightarrow$ 400 Bad Request.
35. `TC-307-VAL-11`: Số lượng Flash Sale vượt quá tồn kho thực tế $\rightarrow$ 400 Bad Request.
36. `TC-307-VAL-12`: Sản phẩm bị trùng lặp trong cùng một chiến dịch $\rightarrow$ 400 Bad Request.
37. `TC-307-VAL-13`: Trạng thái chiến dịch không hợp lệ trong status update $\rightarrow$ 400 Bad Request.
38. `TC-307-VAL-14`: Cập nhật số lượng mới nhỏ hơn số lượng đã bán $\rightarrow$ 400 Bad Request.
39. `TC-307-VAL-15`: Kích hoạt chiến dịch đã quá thời hạn kết thúc $\rightarrow$ 400 Bad Request.
40. `TC-307-VAL-16`: Xóa hoặc cập nhật chiến dịch với ID không tồn tại $\rightarrow$ 404 Not Found.

---

## 8. KẾT QUẢ THỰC THI KIỂM THỬ THỰC TẾ

### 8.1. Kiểm thử Backend Spring Boot (`FlashSaleApiQATest`)
- **Lệnh thực thi:**
  ```bash
  cmd /c "cd backend && gradlew.bat :product-service:test --tests *FlashSaleApiQATest*"
  ```
- **Kết quả thực tế:**
  - `TEST-com.ecommerce.product.controller.FlashSaleApiQATest$RbacAndSecurityTests`: **9 passed / 0 failed / 0 skipped**
  - `TEST-com.ecommerce.product.controller.FlashSaleApiQATest$PublicAndCustomerApiTests`: **7 passed / 0 failed / 0 skipped**
  - `TEST-com.ecommerce.product.controller.FlashSaleApiQATest$AdminCampaignCrudTests`: **8 passed / 0 failed / 0 skipped**
  - `TEST-com.ecommerce.product.controller.FlashSaleApiQATest$ValidationAndBoundaryTests`: **16 passed / 0 failed / 0 skipped**
  - **TỔNG CỘNG:** **40 passed / 0 failed / 0 skipped (100% PASS)**

### 8.2. Kiểm thử hồi quy toàn bộ module Flash Sale (`product-service`)
- **Lệnh thực thi:**
  ```bash
  cmd /c "cd backend && gradlew.bat :product-service:test --tests *FlashSale*"
  ```
- **Kết quả thực tế:**
  - `FlashSaleApiQATest`: 40 tests passed
  - `FlashSaleControllerTest`: 5 tests passed
  - `FlashSaleServiceTest`: 13 tests passed
  - **TỔNG CỘNG:** **58 passed / 0 failed / 0 skipped (BUILD SUCCESSFUL)**

### 8.3. Kiểm thử hồi quy Frontend và CI Automation
- **Linter:** `npm --prefix frontend run lint`
  - Đã quét 85 file nguồn trong `src/` $\rightarrow$ **0 lỗi cú pháp/import**.
- **Frontend QA Suites:** `npm --prefix frontend test`
  - Chạy 13 file test QA tự động hóa (bao gồm `ecom165.flashsale.qa.test.mjs`, `ecom173`, `ecom188`, `ecom257`, `ecom266`,...):
  - **141 tests passed / 0 failed (100% PASS)**.
- **Frontend Build:** `npm --prefix frontend run build`
  - Build Vite production thành công trong 3.87s, sinh bundle `dist/` hoàn chỉnh.

---

## 9. LỖI ĐÃ KHẮC PHỤC

1. **Lỗi không đồng nhất phân quyền tại endpoint khởi tạo tồn kho Flash Sale:**
   - **Vấn đề:** Trong `FlashSaleController.java`, endpoint `POST /api/v1/admin/flash-sales/products/{productId}` khai báo `@RequestHeader("X-User-Roles") String userRoles` không có `required = false`. Khi Guest gọi không gửi header, Spring MVC ném `MissingRequestHeaderException` dẫn đến lỗi `400 Bad Request` thay vì `403 Forbidden` (lỗi RBAC chuẩn).
   - **Khắc phục:** Cập nhật thành `@RequestHeader(value = "X-User-Roles", required = false) String userRoles`. Khi không có header, `userRoles` là `null`, phương thức `requireAdminRole` sẽ ném `AccessDeniedException` và trả về chuẩn RESTful `403 Forbidden` ("Truy cập bị từ chối: yêu cầu quyền ROLE_ADMIN"), đồng bộ 100% với các endpoint admin khác của toàn bộ hệ thống ShopMart.

---

## 10. VẤN ĐỀ CÒN TỒN TẠI & RỦI RO

- **Không còn lỗi tồn tại trong phạm vi task ECOM-307.**
- **Lưu ý triển khai tích hợp:**
  - API `/api/v1/flash-sales/reserve` sử dụng Redis Lua script để trừ tồn kho nguyên tử (`flash_sale_stock:{productId}`). Trong môi trường production/VPS, cần đảm bảo Redis Server đã được khởi động và `FlashSaleConfig` đã nạp thành công bean `RedisScript<Long> flashSaleScript`. Nếu Redis gặp sự cố tạm thời, `FlashSaleService` đã có cơ chế tự phục hồi (self-heal) từ database, nhưng Redis vẫn là thành phần trọng yếu đảm bảo tốc độ cao trong giờ cao điểm Flash Sale.

---

## 11. ẢNH HƯỞNG ĐẾN DỰ ÁN

- **Sprint 1 & Sprint 2:** Không gây ảnh hưởng tiêu cực đến bất kỳ module nào đã release ở Sprint 1 hoặc đang phát triển ở Sprint 2. Toàn bộ code của `ECOM-173`, `ECOM-188`, `ECOM-257`, `ECOM-266` được bảo toàn nguyên vẹn.
- **Database Schema:** Không thay đổi cấu trúc bảng cơ sở dữ liệu (`flash_sales`, `flash_sale_items`).
- **API Gateway:** Các route public `/api/v1/flash-sales/**` và route admin `/api/v1/admin/flash-sales/**` hoàn toàn tương thích với cơ chế gắn header `X-User-Roles` của Gateway.
- **DevOps & VPS:** Không thay đổi container hay cấu hình Docker Compose trên VPS.

---

## 12. KẾT LUẬN

Task **ECOM-307** đã được hoàn thành xuất sắc và vượt mức yêu cầu:
- Trực tiếp kiểm thử và bao phủ toàn bộ 100% các endpoint Backend của hệ thống Flash Sale.
- Sửa lỗi bảo mật RBAC giúp các endpoint admin phản hồi chuẩn `403 Forbidden`.
- 40 test case QA độc lập (`FlashSaleApiQATest`) đạt tỷ lệ **100% PASS**.
- 58 bài kiểm thử hồi quy Flash Sale Backend đạt tỷ lệ **100% PASS**.
- 141 bài kiểm thử Frontend và linter đạt tỷ lệ **100% PASS**, Vite build thành công.
- Cung cấp Postman Collection tự động hóa cho QA manual và CI runner.

**ĐÁNH GIÁ CHUNG: HOÀN THÀNH TOÀN DIỆN (DONE 100%)**
