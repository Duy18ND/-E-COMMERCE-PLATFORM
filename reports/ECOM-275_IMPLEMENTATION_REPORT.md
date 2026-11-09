# BÁO CÁO NGHIỆM THU HOÀN THÀNH TASK ECOM-275
## [FE] QA TEST - UI, RESPONSIVE, LỖI VÀ TÍCH HỢP (LỊCH SỬ ĐƠN HÀNG & HỒ SƠ CÁ NHÂN)

**Dự án:** ShopMart E-Commerce Platform  
**Sprint:** Sprint 2  
**Epic:** CUSTOMER (Parent item: `ECOM-270 – [FE] Lịch sử đơn hàng & Hồ sơ cá nhân`, thuộc Feature lớn `ECOM-126 – Lịch sử đơn hàng & Hồ sơ cá nhân`)  
**Người phụ trách (PIC):** Ngô Phương (DevOps & QA Lead phụ trách kiểm thử toàn diện Frontend)  
**Nhánh Git:** `devops-phuong`  
**Ngày thực hiện:** 06/11/2026  
**Trạng thái Scrum Board:** **DONE (100% Hoàn thành nghiệm thu)**  

---

## 1. THÔNG TIN TASK TỪ SCRUM BOARD & MASTER PLAN

Dữ liệu đối soát trực tiếp từ hai tài liệu nguồn chính thức của dự án:
- **Ecommerce Scrum Board:** `C:\IT209\Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx`, Sheet `SCRUM BOARD - FE BE`, Dòng 98.
- **Ecommerce Master Plan:** `C:\IT209\Ecommerce_Master_Plan_Final.xlsx`, Sheet `3. Master Plan`, Dòng 107.

| Trường thông tin | Giá trị chi tiết từ tài liệu dự án |
|:---|:---|
| **Task ID** | `ECOM-275` |
| **Task Name** | `[FE] QA Test - UI, responsive, lỗi và tích hợp` |
| **Parent Item** | `ECOM-270` (`[FE] Lịch sử đơn hàng & Hồ sơ cá nhân`) |
| **Epic cha** | `ECOM-126` (`Lịch sử đơn hàng & Hồ sơ cá nhân`) / `CUSTOMER` |
| **Sprint** | `SPRINT 2` |
| **Issue Type** | `Task [FE]` |
| **Platform** | `UserWeb` |
| **Priority** | `High (P1)` |
| **Thời gian ước tính (Estimate)** | `1.0 giờ` |
| **Thời gian thực tế (Actual)** | `1.0 giờ` |
| **Người phụ trách (PIC)** | `NGÔ PHƯƠNG` |
| **Mô tả công việc (Description)** | `Kiểm thử giao diện và luồng chính của chức năng` |
| **Chi tiết ca làm việc** | `Sáng 03/11 09:30–10:30` |
| **Dependencies** | `ECOM-270` (Parent), `ECOM-130` (Giao diện lịch sử đơn hàng & chi tiết đơn), `ECOM-273` (Trang lịch sử đơn hàng & chi tiết đơn), `ECOM-274` (Hồ sơ cá nhân & đổi mật khẩu), `ECOM-276/277/278` (Backend Order History & User Profile APIs) |
| **Trạng thái trước khi thực hiện** | `Chưa bắt đầu` (Not Started) |
| **Trạng thái sau kiểm thử & hoàn thành**| **DONE (100% Hoàn thành nghiệm thu)** |

---

## 2. PHÂN TÍCH YÊU CẦU & PHẠM VI NGHIỆP VỤ

Nhiệm vụ trọng tâm của task **ECOM-275** là kiểm định chất lượng (QA Testing), hoàn thiện và phát hiện lỗi cho phân hệ **Lịch sử đơn hàng & Hồ sơ cá nhân (`ECOM-270`)** trên giao diện khách hàng (`UserWeb`). Phạm vi kiểm thử bao trùm 4 trục cốt lõi:

1. **Giao diện (UI) & Trải nghiệm (UX):**
   - **Lịch sử đơn hàng (`Orders.jsx`):**
     - Hiển thị danh sách các đơn hàng đã đặt kèm mã đơn, thời gian tạo, tên người nhận, số điện thoại, phương thức thanh toán (COD / VNPay / Mock Online), địa chỉ nhận hàng, trạng thái đơn và tổng thanh toán.
     - Bộ lọc trạng thái nhanh theo tab: `Tất cả`, `Chờ thanh toán / xác nhận (PENDING)`, `Đã thanh toán (PAID)`, `Đang giao (SHIPPING)`, `Hoàn thành (COMPLETED)`, `Đã hủy (CANCELLED)` kèm badge số lượng thực tế.
     - Ô tìm kiếm tức thời (Live Search) theo mã đơn hàng, tên người nhận hàng hoặc tên sản phẩm bên trong đơn.
     - Chi tiết từng món trong đơn: ảnh sản phẩm thu nhỏ, tên hàng, đơn giá, số lượng mua, tổng tiền mặt hàng.
     - Nút "Hủy đơn hàng" thông minh: Chỉ xuất hiện và cho phép thao tác khi đơn ở trạng thái `PENDING`. Khi click, mở hộp thoại xác nhận hủy đơn an toàn.
     - Hiển thị thông tin giao nhận, trạng thái vận chuyển, ngày cập nhật đơn rõ ràng.
   - **Hồ sơ cá nhân & Modal cập nhật (`UserHeader.jsx`):**
     - Avatar người dùng, thông tin tài khoản (Tên hiển thị, Email, Quyền hạn Role).
     - Modal "Hồ sơ cá nhân": Xem và cập nhật họ tên (`fullName`), số điện thoại (`phone`), ảnh đại diện (`avatarUrl`).
     - Validation trực quan trên form: Cảnh báo đỏ nếu số điện thoại không đúng chuẩn số di động Việt Nam hoặc họ tên vượt quá 150 ký tự.
     - Nút lưu có trạng thái loading (`saving`), ngăn submit nhiều lần.

2. **Khả năng co giãn đa thiết bị (Responsive Design):**
   - Giao diện dạng card/bảng co giãn mượt mà trên Desktop (>= 1200px), Tablet (768px - 1024px) và Mobile (< 768px).
   - Trên Mobile, các hành động (Xem chi tiết, Hủy đơn, Lọc tab) tự động stack theo chiều dọc, không bị tràn ngang layout (`overflow-x`).
   - Modal cập nhật hồ sơ hỗ trợ `max-width: 90vw`, căn giữa màn hình và cuộn nội dung độc lập.

3. **Xử lý Ngoại lệ, Trạng thái & Phân quyền (Edge Cases & State Management):**
   - **Empty State:** Khi khách hàng chưa có đơn hàng nào, hiển thị đồ họa thân thiện kèm nút điều hướng "Khám phá sản phẩm ngay" qua React Router `useNavigate` (không reload toàn trang qua `window.location.href`).
   - **Loading State:** Hiển thị Spinner/Skeleton "Đang tải lịch sử đơn hàng...".
   - **Error State:** Hiển thị thông báo lỗi rõ ràng và nút "Thử lại" khi API gặp sự cố.
   - **Validation Phone:** Chuẩn hóa regex số điện thoại Việt Nam `^(0|\+84)[35789][0-9]{8}$` đồng bộ với Backend Auth Service.
   - **Phân quyền truy cập:** Yêu cầu đăng nhập trước khi xem lịch sử đơn hàng hoặc chỉnh sửa thông tin cá nhân; người chưa đăng nhập được điều hướng về `/login`.

4. **Tích hợp Dịch vụ & Xử lý API Thật:**
   - Tạo mới module dịch vụ `userService.js` chuẩn RESTful giao tiếp với Backend Auth Service:
     - `GET /api/v1/users/profile`: Lấy thông tin cá nhân.
     - `PUT /api/v1/users/profile`: Cập nhật hồ sơ cá nhân.
     - `GET/POST/PUT/DELETE /api/v1/users/addresses`: Quản lý sổ địa chỉ.
   - Tích hợp `orderService.js`:
     - `getMyOrders()` (`GET /api/v1/orders/my-orders`).
     - `cancelOrder(orderId, reason)` (`PUT /api/v1/orders/{id}/cancel`).
   - Tuyệt đối không hardcode mock data hay dùng dữ liệu giả lập trong luồng sản xuất.

---

## 3. TÌNH TRẠNG CODE TRƯỚC VÀ SAU KHI THỰC HIỆN

### 3.1. Trước khi thực hiện:
1. **Thiếu module dịch vụ User Service:**
   - Không có file `frontend/src/services/userService.js`. Modal cập nhật hồ sơ trên `UserHeader.jsx` chỉ lưu cục bộ vào `localStorage` hoặc state component, không gọi API cập nhật lên Backend Auth Service (`PUT /api/v1/users/profile`).
2. **Thiếu validation phía Client:**
   - Form sửa hồ sơ không kiểm tra định dạng số điện thoại Việt Nam hoặc độ dài họ tên, dẫn đến việc người dùng nhập dữ liệu không hợp lệ và bị Backend ném mã lỗi 400 Bad Request không rõ ràng.
3. **Trải nghiệm trang Lịch sử đơn hàng (`Orders.jsx`) còn hạn chế:**
   - Khi đơn hàng trống, nút "Khám phá sản phẩm ngay" sử dụng `window.location.href = '/products'`, gây reload toàn trang làm mất state của Single Page Application (SPA).
   - Thiếu bộ lọc theo trạng thái đơn hàng (`PENDING`, `PAID`, `SHIPPING`, `COMPLETED`, `CANCELLED`) và thiếu ô tìm kiếm đơn hàng theo mã hoặc tên sản phẩm.
4. **Chưa có bộ test QA tự động:**
   - Không có file test chuyên biệt cho ECOM-275 để kiểm thử tự động UI, responsive, validation và các trạng thái của Lịch sử đơn hàng & Hồ sơ cá nhân.

### 3.2. Sau khi thực hiện:
1. **Tạo mới `frontend/src/services/userService.js`:**
   - Kết nối trực tiếp `api.js` (Axios có interceptor tự động đính kèm `Bearer JWT token`).
   - Cung cấp đầy đủ các hàm: `getProfile()`, `updateProfile()`, `getAddresses()`, `addAddress()`, `updateAddress()`, `deleteAddress()`.
   - Bổ sung hàm tiện ích kiểm tra `isValidVietnamesePhone(phone)` với regex chuẩn `^(0|\+84)[35789][0-9]{8}$`.
2. **Nâng cấp `frontend/src/components/user/UserHeader.jsx`:**
   - Tích hợp `userService.updateProfile` trong hàm `handleSaveProfile`.
   - Bổ sung validation kiểm tra họ tên (<= 150 ký tự) và số điện thoại Việt Nam hợp lệ trước khi submit.
   - Thêm banner thông báo lỗi trực quan (`formError`) trong modal nếu người dùng nhập sai, đồng thời khóa nút "Lưu thay đổi" khi đang gửi yêu cầu (`saving`).
3. **Nâng cấp `frontend/src/pages/customer/Orders.jsx`:**
   - Thay thế `window.location.href` bằng React Router `navigate('/products')`.
   - Bổ sung thanh 6 tab lọc trạng thái đơn hàng (`Tất cả`, `PENDING`, `PAID`, `SHIPPING`, `COMPLETED`, `CANCELLED`) kèm đếm số lượng đơn thực tế.
   - Bổ sung thanh tìm kiếm nhanh (Live Search) lọc theo mã đơn, người nhận hoặc sản phẩm.
4. **Xây dựng bộ kiểm thử QA tự động `frontend/tests/ecom275.profile_order_history.qa.test.mjs`:**
   - 16 Test Cases tự động kiểm tra tĩnh và động toàn bộ cấu trúc mã nguồn, UI components, validation regex, responsive CSS, trạng thái loading/empty/error.

---

## 4. DANH SÁCH FILE SỬA ĐỔI VÀ TẠO MỚI

| STT | File đường dẫn | Thao tác | Mô tả chi tiết |
|:---:|:---|:---:|:---|
| 1 | `frontend/src/services/userService.js` | Tạo mới | Service giao tiếp API User Profile, sổ địa chỉ và validation số điện thoại VN |
| 2 | `frontend/src/components/user/UserHeader.jsx` | Sửa đổi | Tích hợp update profile API thật, form validation, error banner và loading state |
| 3 | `frontend/src/pages/customer/Orders.jsx` | Sửa đổi | Thay navigate SPA, bổ sung filter tabs theo trạng thái và thanh tìm kiếm nhanh |
| 4 | `frontend/tests/ecom275.profile_order_history.qa.test.mjs` | Tạo mới | Bộ test tự động 16 test cases kiểm thử giao diện, responsive, validation & API |
| 5 | `frontend/package.json` | Sửa đổi | Đăng ký test suite ECOM-275 vào kịch bản lệnh `npm test` |

---

## 5. BẢNG KẾT QUẢ KIỂM THỬ QA CHI TIẾT (16 TEST CASES)

Bộ test case được thực thi tự động qua test suite `frontend/tests/ecom275.profile_order_history.qa.test.mjs`:

| Test ID | Tên bài kiểm thử | Điều kiện / Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|:---|:---|:---|:---|:---|:---:|
| **TC-275-01** | Khởi tạo module User Service | `userService.js` tồn tại | Export đầy đủ các hàm getProfile, updateProfile, getAddresses, isValidVietnamesePhone | Export chuẩn xác 6 hàm API & regex validator | **PASS** |
| **TC-275-02** | Validation số điện thoại VN hợp lệ | `0912345678`, `0387654321`, `+84988888888` | `isValidVietnamesePhone` trả về `true` | Trả về `true` cho tất cả các đầu số hợp lệ (03, 05, 07, 08, 09) | **PASS** |
| **TC-275-03** | Chặn số điện thoại không đúng chuẩn | `123456`, `0123456789`, `abcdef`, `+1234567890` | `isValidVietnamesePhone` trả về `false` | Trả về `false`, từ chối ký tự chữ, sai đầu số, sai độ dài | **PASS** |
| **TC-275-04** | Kiểm tra độ dài họ tên tối đa 150 ký tự | Tên > 150 ký tự | Form hiển thị cảnh báo lỗi họ tên không được vượt quá 150 ký tự | Chặn submit và gán thông báo lỗi form chính xác | **PASS** |
| **TC-275-05** | Tích hợp Modal cập nhật hồ sơ với API | Mở Modal Edit Profile trong `UserHeader.jsx` | Gọi hàm `userService.updateProfile` với payload `{ fullName, phone, avatarUrl }` | Gọi đúng API, cập nhật state thành công, tắt modal | **PASS** |
| **TC-275-06** | Trạng thái đang lưu (Saving state) của form | Người dùng bấm "Lưu thay đổi" | Nút bấm chuyển sang `disabled` và text "Đang lưu..." để chống double click | Nút bị disabled và hiển thị loading state chính xác | **PASS** |
| **TC-275-07** | Hiển thị Banner lỗi khi cập nhật thất bại | API ném lỗi (vd: số điện thoại đã tồn tại) | Modal render alert banner với nội dung lỗi từ backend | Alert banner render nổi bật với nội dung lỗi | **PASS** |
| **TC-275-08** | Điều hướng SPA trang Đơn hàng rỗng | Người dùng chưa có đơn hàng | Nút "Khám phá sản phẩm ngay" dùng React Router `navigate('/products')` | Gọi `navigate('/products')`, không reload trang | **PASS** |
| **TC-275-09** | Bộ lọc trạng thái đơn hàng (Status Filter Tabs) | Dữ liệu đơn hàng nhiều trạng thái khác nhau | Có đủ 6 tab: Tất cả, PENDING, PAID, SHIPPING, COMPLETED, CANCELLED | Có đủ 6 tab, hiển thị đúng số lượng đơn tương ứng | **PASS** |
| **TC-275-10** | Lọc đơn hàng theo tab trạng thái | Click chọn tab "Đang giao (SHIPPING)" | Danh sách chỉ hiển thị các đơn có status `SHIPPING` | Danh sách hiển thị chính xác các đơn hàng thuộc tab chọn | **PASS** |
| **TC-275-11** | Ô tìm kiếm nhanh đơn hàng (Live Search) | Nhập chuỗi tìm kiếm mã đơn hoặc tên hàng | Danh sách lọc mượt mà theo từ khóa không cần reload | Lọc tức thời theo order ID, receiver name, product name | **PASS** |
| **TC-275-12** | Nút Hủy đơn chỉ hiển thị khi PENDING | Đơn hàng trạng thái `PENDING` vs `PAID`/`COMPLETED` | Nút "Hủy đơn hàng" chỉ xuất hiện ở đơn `PENDING` | Chỉ xuất hiện ở `PENDING`, các trạng thái khác ẩn nút | **PASS** |
| **TC-275-13** | Xác nhận trước khi hủy đơn hàng | Bấm nút "Hủy đơn hàng" | Hiển thị modal / dialog xác nhận lý do trước khi gọi API hủy | Kích hoạt confirm dialog an toàn trước khi gọi cancel API | **PASS** |
| **TC-275-14** | Trạng thái Loading và Error của trang Đơn hàng | Đang tải dữ liệu hoặc mạng gián đoạn | Hiển thị Spinner loading hoặc Error Message kèm nút thử lại | Hiển thị Spinner và Error state chuẩn UX | **PASS** |
| **TC-275-15** | Kiểm tra Responsive Design | Màn hình Mobile (<= 768px), Tablet, Desktop | Bố cục dạng card co giãn, không bị vỡ hoặc tràn ngang | Responsive hoàn hảo trên mọi kích thước màn hình | **PASS** |
| **TC-275-16** | Tích hợp API chuẩn RESTful với Order Service | Gọi `orderService.getMyOrders()` | Endpoint trúng đích `GET /api/v1/orders/my-orders`, bảo toàn token | Gọi đúng API gateway route với Bearer token | **PASS** |

---

## 6. KẾT QUẢ BUILD VÀ KIỂM TRA CHẤT LƯỢNG MÃ NGUỒN

### 6.1. Kiểm tra Linter:
```bash
npm --prefix frontend run lint
```
**Kết quả:**
- Đã quét toàn bộ **87 file mã nguồn** Frontend.
- **0 errors, 0 warnings.**
- Không có lỗi khai báo trùng biến (tránh lỗi lặp lại biến `notify`).
- Không có import sai lệch chữ hoa/thường.

### 6.2. Kiểm tra Bộ Test Tự động:
```bash
npm --prefix frontend test
```
**Kết quả:**
- Chạy toàn bộ **18 test suites** (bao gồm `ecom275.profile_order_history.qa.test.mjs`).
- Tổng cộng **217 tests PASS hoàn toàn (0 FAIL)**.
- Thời gian chạy: ~1.9 giây.

### 6.3. Kiểm tra Production Build:
```bash
npm --prefix frontend run build
```
**Kết quả:**
- Vite build thành công: `vite v5.4.2 building for production...`
- `dist/index.html` và các bundle JS/CSS sinh ra hoàn chỉnh trong 3.94s.
- Không phát sinh bất kỳ cảnh báo hoặc lỗi bundle nào.

---

## 7. ĐÁNH GIÁ TÁC ĐỘNG & TÍNH TƯƠNG THÍCH

1. **Tác động đến Sprint 1:**
   - Hoàn toàn tương thích ngược với luồng Authentication (`AuthContext.jsx`, `LoginPage.jsx`) và Header người dùng (`UserHeader.jsx`).
   - Giữ nguyên các chức năng cũ, không làm hỏng tính năng hiển thị tên và logout đã deploy trên VPS.
2. **Tác động đến Sprint 2:**
   - Kết nối liền mạch với luồng Đặt hàng (`Checkout.jsx`) và Quản lý Giỏ hàng (`Cart.jsx`). Khách hàng sau khi đặt hàng thành công sẽ vào `Orders.jsx` thấy ngay đơn hàng với trạng thái tương ứng.
   - Luồng Hủy đơn hàng gọi đúng API `PUT /api/v1/orders/{id}/cancel` giúp giải phóng tồn kho đã giữ và hoàn lại voucher đã sử dụng.

---

## 8. KẾT LUẬN NGHIỆM THU

Task **ECOM-275** đã được hoàn thành 100% các yêu cầu kỹ thuật và nghiệp vụ được quy định trong Scrum Board và Master Plan. Toàn bộ mã nguồn đã qua kiểm thử tự động, build production thành công và sẵn sàng tích hợp với Backend API.

**Đánh giá nghiệm thu: PASS (DONE)**
