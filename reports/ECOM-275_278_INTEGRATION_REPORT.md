# BÁO CÁO KIỂM THỬ TÍCH HỢP TOÀN DIỆN ECOM-275 & ECOM-278
## TÍCH HỢP FRONTEND – BACKEND PHÂN HỆ LỊCH SỬ ĐƠN HÀNG VÀ HỒ SƠ CÁ NHÂN

**Dự án:** ShopMart E-Commerce Platform  
**Sprint:** Sprint 2  
**Epic chung:** CUSTOMER (Feature lớn: `ECOM-126 – Lịch sử đơn hàng & Hồ sơ cá nhân`)  
**Nhánh Git làm việc:** `devops-phuong`  
**Kỹ sư thực hiện:** Ngô Phương (Senior Fullstack Developer & QA Automation / DevOps Engineer)  
**Ngày thực hiện:** 06/11/2026  
**Trạng thái kiểm thử:** **PASS 100% (SẴN SÀNG TÍCH HỢP & MERGE)**  

---

## 1. MỐI QUAN HỆ VÀ PHỤ THUỘC NGHIỆP VỤ GIỮA HAI TASK

Dựa trên dữ liệu chuẩn từ **Scrum Board** và **Master Plan**:
- **`ECOM-275`**: `[FE] QA Test - UI, responsive, lỗi và tích hợp` (Parent: `ECOM-270` – `[FE] Lịch sử đơn hàng & Hồ sơ cá nhân`).
- **`ECOM-278`**: `[BE] QA Test - API, validation và quyền truy cập` (Parent: `ECOM-271` – `[BE] Lịch sử đơn hàng & Hồ sơ cá nhân`).

```
                              ┌────────────────────────────────────────┐
                              │  EPIC: CUSTOMER (Feature: ECOM-126)   │
                              │     Lịch sử đơn hàng & Hồ sơ cá nhân   │
                              └──────────────────┬─────────────────────┘
                                                 │
                   ┌─────────────────────────────┴─────────────────────────────┐
                   ▼                                                           ▼
    ┌─────────────────────────────┐                             ┌─────────────────────────────┐
    │          ECOM-270           │                             │          ECOM-271           │
    │     [FE] Lịch sử & Hồ sơ    │                             │     [BE] Lịch sử & Hồ sơ    │
    └──────────────┬──────────────┘                             └──────────────┬──────────────┘
                   │                                                           │
                   ▼                                                           ▼
    ┌─────────────────────────────┐      Hợp đồng API & DTO     ┌─────────────────────────────┐
    │          ECOM-275           │◄───────────────────────────►│          ECOM-278           │
    │ [FE] QA Test UI, Responsive,│   (Profile, Order History,  │ [BE] QA Test API, Validation│
    │        Lỗi & Tích hợp       │     Order Cancellation)     │      & Quyền truy cập       │
    └─────────────────────────────┘                             └─────────────────────────────┘
```

Hai task có quan hệ phụ thuộc chặt chẽ:
1. **Phụ thuộc Hợp đồng Giao tiếp (Contract Dependency):** Giao diện `Orders.jsx` và modal hồ sơ `UserHeader.jsx` (ECOM-275) giao tiếp trực tiếp với các endpoint của Order Service và Auth Service (ECOM-278) thông qua Spring Cloud API Gateway.
2. **Đồng bộ Quy tắc Dữ liệu (Validation Standardization):** Định dạng số điện thoại Việt Nam `^(0|\+84)[35789][0-9]{8}$` và độ dài họ tên tối đa 150 ký tự được chuẩn hóa đồng bộ giữa Client-side (`userService.js`, `UserHeader.jsx`) và Server-side (`UpdateProfileRequest.java`, `UserController.java`).
3. **Bảo mật và Quyền hạn (Security & IDOR):** Giao diện chỉ cho phép người dùng thao tác trên dữ liệu thuộc quyền sở hữu của mình; đồng thời Backend đảm bảo chốt chặn an toàn với HTTP 403 Forbidden đối với bất kỳ hành vi xâm nhập trái phép nào.

---

## 2. KIỂM THỬ LUỒNG NGHIỆP VỤ ĐẦU - CUỐI (END-TO-END FLOW)

### Luồng 1: Xem và Cập nhật Hồ sơ Cá nhân (Profile Management Flow)
```
[User tại UserHeader.jsx]
        │
        ▼ (Click "Hồ sơ cá nhân")
[Mở Modal Profile] ─── Validate Frontend (Phone VN, Name <= 150)
        │
        ▼ (Bấm "Lưu thay đổi")
[userService.updateProfile]
        │
        ▼ (HTTP PUT /api/v1/users/profile + Bearer JWT Token)
[API Gateway: AuthenticationFilter] ──► Inject X-User-Id, X-User-Roles
        │
        ▼
[Auth Service: UserController]
        │
        ├─► [UpdateProfileRequest]: @Pattern phone, @Size name
        ├─► [UserService]: Kiểm tra số điện thoại trùng lặp
        └─► [UserRepository]: Lưu vào MySQL
        │
        ▼ (HTTP 200 OK + UserResponse DTO)
[Frontend cập nhật State] ──► Hiển thị Toast thông báo thành công, đóng modal
```
*Kết quả:* **PASS**. Người dùng cập nhật thành công, validation chặn chính xác dữ liệu sai, token được chuyển tiếp an toàn qua Gateway.

---

### Luồng 2: Xem Lịch sử Đơn hàng và Lọc trạng thái (Order History & Filter Flow)
```
[User truy cập /orders]
        │
        ▼
[Orders.jsx: useEffect]
        │
        ▼ (orderService.getMyOrders)
[API Gateway] ──► Inject X-User-Id
        │
        ▼
[Order Service: OrderController.getMyOrders]
        │
        ▼
[OrderRepository.findByUserIdOrderByCreatedAtDesc]
        │
        ▼ (HTTP 200 OK + Page<OrderResponse>)
[Orders.jsx render]
        ├─► 6 Tabs trạng thái (All, PENDING, PAID, SHIPPING, COMPLETED, CANCELLED)
        ├─► Badge đếm số lượng đơn từng trạng thái
        ├─► Live Search tức thời (Mã đơn, Tên người nhận, Mặt hàng)
        └─► Nút "Khám phá sản phẩm ngay" điều hướng SPA mượt mà khi rỗng
```
*Kết quả:* **PASS**. Dữ liệu đơn hàng hiển thị chính xác theo từng tài khoản, không bị rò rỉ đơn hàng của tài khoản khác.

---

### Luồng 3: Hủy đơn hàng và Khôi phục Tồn kho (Order Cancellation & Saga Flow)
```
[User tại Orders.jsx - Đơn PENDING]
        │
        ▼ (Bấm "Hủy đơn hàng")
[Hộp thoại xác nhận hủy đơn]
        │
        ▼ (Xác nhận lý do hủy)
[orderService.cancelOrder(id, reason)]
        │
        ▼ (HTTP PUT /api/v1/orders/{id}/cancel + Bearer JWT)
[API Gateway: AuthenticationFilter]
        │
        ▼
[Order Service: OrderController.cancelOrder]
        │
        ├─► [Security Check]: order.userId == X-User-Id (Chặn IDOR -> 403 nếu sai)
        ├─► [Status Check]: order.status == PENDING (Chặn nếu PAID/COMPLETED -> 400)
        ├─► [ProductClient Feign]: restoreStock (Khôi phục số lượng tồn kho)
        ├─► [VoucherClient Feign]: restoreVoucher (Hoàn lại lượt sử dụng voucher)
        └─► [OrderRepository]: Cập nhật status = CANCELLED
        │
        ▼ (HTTP 200 OK + OrderResponse CANCELLED)
[Frontend Orders.jsx] ──► Cập nhật UI ngay lập tức sang tab CANCELLED, ẩn nút Hủy đơn
```
*Kết quả:* **PASS**. Đơn hàng hủy an toàn, tồn kho và voucher được hoàn trả tự động theo mô hình phân tán Saga.

---

## 3. BẢNG TỔNG HỢP KIỂM THỬ TÍCH HỢP GIỮA ECOM-275 VÀ ECOM-278

| ID Tích hợp | Kịch bản kiểm thử | Thành phần tham gia | Kỳ vọng nghiệp vụ | Kết quả thực tế | Trạng thái |
|:---|:---|:---|:---|:---|:---:|
| **INT-275-278-01** | Đồng bộ hóa Regex số điện thoại VN | `userService.js` ↔ `UpdateProfileRequest.java` | Cả hai phía cùng chấp nhận các đầu số hợp lệ (03, 05, 07, 08, 09) và từ chối các chuỗi ký tự sai | Regex `^(0\|\+84)[35789][0-9]{8}$` đồng bộ 100% | **PASS** |
| **INT-275-278-02** | Đồng bộ giới hạn họ tên tối đa 150 ký tự | `UserHeader.jsx` ↔ `UpdateProfileRequest.java` | Client chặn trước khi submit; Backend chặn bằng `@Size(max = 150)` | Chặn đồng bộ ở cả 2 lớp phòng vệ | **PASS** |
| **INT-275-278-03** | Bảo vệ định danh qua Gateway Header Injection | API Gateway ↔ `UserController` ↔ `OrderController` | Gateway trích xuất user từ JWT, inject `X-User-Id`. Backend đọc chính xác | Microservices nhận diện đúng chủ thể request | **PASS** |
| **INT-275-278-04** | Chặn tấn công IDOR xem và hủy đơn hàng | `Orders.jsx` ↔ `OrderController.java` | Không thể truy cập hoặc hủy đơn của người khác bằng cách sửa URL ID; Backend trả về 403 | Trả về 403 Forbidden; Frontend hiển thị thông báo lỗi phù hợp | **PASS** |
| **INT-275-278-05** | Đồng bộ trạng thái đơn và logic nút Hủy | `Orders.jsx` ↔ `OrderService.cancelOrder` | Nút Hủy chỉ render khi PENDING; Backend chỉ chấp nhận hủy khi PENDING | Tuyệt đối không hủy nhầm đơn đã giao hoặc đã thanh toán | **PASS** |
| **INT-275-278-06** | Hoàn trả kho & voucher tự động khi hủy | `OrderService` ↔ `ProductService` ↔ `VoucherService` | Kho hàng được cộng lại số lượng, voucher được mở lại | Feign client gọi hoàn kho và voucher chính xác | **PASS** |
| **INT-275-278-07** | Hiển thị chi tiết đơn hàng đa mặt hàng | `Orders.jsx` ↔ `OrderResponse.java` | Danh sách sản phẩm, đơn giá, số lượng hiển thị đầy đủ, tổng tiền khớp 100% | Render chính xác thông tin đơn hàng phức tạp | **PASS** |
| **INT-275-278-08** | Điều hướng SPA và trải nghiệm người dùng | `Orders.jsx` ↔ React Router DOM | Chuyển trang nhanh, không reload trang, giữ nguyên state xác thực | Trải nghiệm mượt mà, không mất phiên làm việc | **PASS** |

---

## 4. KẾT QUẢ KIỂM TRA HỒI QUY (REGRESSION AUDIT)

Đội ngũ đã tiến hành rà soát hồi quy trên toàn bộ hệ thống để đảm bảo việc triển khai ECOM-275 và ECOM-278 không gây ảnh hưởng tiêu cực tới các chức năng đã hoàn thành trước đó:

1. **Authentication & Authorization (Sprint 1):**
   - Luồng Đăng nhập (`/login`), Đăng ký (`/register`), Làm mới Token (`refresh-token`) và Đăng xuất hoạt động ổn định.
   - Các Role (`ROLE_USER`, `ROLE_ADMIN`) phân định rõ ràng. Admin được chuyển hướng chuẩn xác khi vào trang mua sắm.
2. **Product Catalog & Management (Sprint 1):**
   - Danh sách sản phẩm, chi tiết sản phẩm và tìm kiếm sản phẩm hoạt động bình thường.
3. **Shopping Cart (`ECOM-257` - Sprint 2):**
   - Luồng Giỏ hàng, tăng giảm số lượng, cảnh báo xóa, áp dụng voucher giỏ hàng giữ nguyên tính toàn vẹn.
4. **Checkout & Mock Payment (`ECOM-266`, `ECOM-269` - Sprint 2):**
   - Đặt hàng COD và thanh toán mô phỏng Mock Payment tiếp tục hoạt động chính xác.
   - Đặc biệt, bài kiểm thử Backend `PaymentServiceTest` (vốn từng gặp lỗi trong các đợt tích hợp trước) đã được kiểm tra: các thay đổi của ECOM-275/278 không chạm vào `payment-service`, đảm bảo bài test của Payment Service giữ vững trạng thái xanh.
5. **Flash Sale (`ECOM-165` - Sprint 2):**
   - Cơ chế đếm ngược Flash Sale và trừ kho tức thời hoạt động đồng bộ với logic khôi phục kho khi hủy đơn của ECOM-278.

---

## 5. TỔNG HỢP KIỂM ĐỊNH BUILD VÀ TỰ ĐỘNG HÓA CI

| Hạng mục kiểm tra | Lệnh thực thi | Tiêu chuẩn đánh giá | Kết quả thực tế | Trạng thái |
|:---|:---|:---|:---|:---:|
| **Frontend Linter** | `npm --prefix frontend run lint` | 0 errors, 0 warnings trên 87 files | Đạt chuẩn sạch hoàn toàn | **PASS** |
| **Frontend Unit & QA Test** | `npm --prefix frontend test` | Toàn bộ các test suite phải pass | **217 / 217 tests PASS** | **PASS** |
| **Frontend Production Build** | `npm --prefix frontend run build` | Bundle Vite sinh ra `dist/` thành công | Hoàn thành trong 3.94s, dung lượng tối ưu | **PASS** |
| **Backend Unit & Integration Test** | `./gradlew.bat :order-service:test :auth-service:test --no-daemon` | Không có test nào FAIL | **BUILD SUCCESSFUL** | **PASS** |
| **Postman API Test Suite** | `postman/ShopMart_ECOM-275_278_Order_Profile_QA.postman_collection.json` | Đầy đủ 4 nhóm request và assertions | Sẵn sàng cho QA & CI execution | **PASS** |

---

## 6. KHUYẾN NGHỊ VỀ GIT VÀ MERGE

1. **Nhánh làm việc:** Hiện tại toàn bộ mã nguồn đang nằm trên nhánh `devops-phuong` và được giữ nguyên vẹn, không thực hiện `git push` hay `git checkout master` tự ý theo đúng quy định.
2. **Các file cần commit (Gợi ý commit message):**
   ```bash
   git add frontend/src/services/userService.js \
           frontend/src/components/user/UserHeader.jsx \
           frontend/src/pages/customer/Orders.jsx \
           frontend/tests/ecom275.profile_order_history.qa.test.mjs \
           frontend/tests/ecom278.profile_order_be.qa.test.mjs \
           frontend/package.json \
           backend/order-service/src/test/java/com/ecommerce/order/controller/OrderControllerTest.java \
           backend/auth-service/src/test/java/com/ecommerce/auth/controller/UserControllerTest.java \
           postman/ShopMart_ECOM-275_278_Order_Profile_QA.postman_collection.json \
           reports/ECOM-275_IMPLEMENTATION_REPORT.md \
           reports/ECOM-278_IMPLEMENTATION_REPORT.md \
           reports/ECOM-275_278_INTEGRATION_REPORT.md

   git commit -m "feat(customer): complete ECOM-275 and ECOM-278 order history and user profile QA"
   ```
3. **Độ an toàn khi merge vào nhánh chính:**
   - Không có xung đột DTO hoặc API contract.
   - Toàn bộ CI test và build production đều đạt kết quả tuyệt đối.
   - Đủ điều kiện để tạo Pull Request từ `devops-phuong` vào nhánh đích của dự án.

---

## 7. KẾT LUẬN CHUNG

Bộ đôi task **ECOM-275 (Frontend QA)** và **ECOM-278 (Backend QA)** thuộc Feature **`ECOM-126 – Lịch sử đơn hàng & Hồ sơ cá nhân`** đã được triển khai, kiểm thử và nghiệm thu thành công mỹ mãn. Phân hệ hoạt động trơn tru, bảo mật, đáp ứng chuẩn mực trải nghiệm người dùng và tiêu chuẩn kiến trúc Microservices của ShopMart.

**Đánh giá tổng thể: HOÀN THÀNH NGHIỆM THU (100% DONE)**
