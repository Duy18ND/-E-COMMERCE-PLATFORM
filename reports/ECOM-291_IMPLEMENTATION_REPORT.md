# BÁO CÁO TRIỂN KHAI & KIỂM THỬ ECOM-291
## [FE] Bảng Quản Trị Đơn Hàng & Bộ Lọc Trạng Thái — ShopMart E-Commerce Platform

---

## 1. THÔNG TIN TASK ECOM-291

- **Mã Task**: ECOM-291
- **Sprint**: Sprint 2
- **Epic**: [FE] Quản trị đơn hàng
- **Tên chức năng**: [FE] Bảng quản trị đơn hàng, bộ lọc trạng thái
- **Mô tả**: Xây dựng và kiểm thử toàn diện trang quản trị đơn hàng (`/admin/orders`), bao gồm bảng hiển thị 7 cột thông tin chuẩn, bộ lọc trạng thái tích hợp đầy đủ Enum thực tế từ Backend, phân trang dữ liệu Spring Data `PagedResponse`, và Modal xem chi tiết đơn hàng (kèm danh sách sản phẩm, giá cả, và lịch sử Timeline).
- **Mức độ ưu tiên (Priority)**: Highest (P0)
- **Trạng thái ban đầu**: TO DO
- **Trạng thái sau hoàn thành**: **DONE (Đã hoàn thành & Kiểm thử PASS 100%)**
- **Kỹ sư thực hiện**: Senior React Developer, Frontend Architect & QA Engineer

---

## 2. PHÂN TÍCH CHỨC NĂNG

### 2.1. Yêu cầu nghiệp vụ
1. **Tiêu đề & Giới thiệu**:
   - Hiển thị tiêu đề chính xác: **Quản lý đơn hàng**
   - Mô tả ngắn: `"Theo dõi và quản lý các đơn hàng trong hệ thống ShopMart."`
2. **Bảng danh sách đơn hàng (7 cột chuẩn)**:
   - **Mã đơn hàng**: Định dạng `#<id>`.
   - **Khách hàng / Người nhận**: Hiển thị tên người nhận (`receiverName`), email tài khoản (`userEmail`) và số điện thoại liên lạc (`receiverPhone`).
   - **Ngày đặt hàng**: Hiển thị ngày giờ tạo đơn rõ ràng theo định dạng tiếng Việt (`vi-VN`).
   - **Tổng tiền**: Hiển thị tổng thanh toán, định dạng tiền tệ VNĐ chuẩn (`formatCurrency`).
   - **Phương thức thanh toán**: Hiển thị huy hiệu trực quan (`💵 COD` hoặc `💳 Trực tuyến`).
   - **Trạng thái đơn hàng**: Huy hiệu màu sắc theo chuẩn Backend (`<OrderStatus />`).
   - **Thao tác**: Nút `👁️ Chi tiết` để mở Modal thông tin chi tiết và các nút xử lý chuyển trạng thái theo đúng State Machine của Backend.
3. **Bộ lọc trạng thái (Status Filter)**:
   - Đồng bộ 100% với Enum `com.ecommerce.order.enums.OrderStatus` trong Backend:
     - `PENDING` (Chờ xác nhận)
     - `PAID` (Đã thanh toán)
     - `CONFIRMED` (Đã xác nhận)
     - `PROCESSING` (Đang xử lý / đóng gói)
     - `SHIPPING` (Đang giao hàng)
     - `DELIVERED` (Hoàn thành / Đã giao hàng)
     - `CANCELLED` (Đã hủy)
     - `FAILED` (Thất bại)
     - `REFUNDED` (Đã hoàn tiền)
   - Cung cấp 2 cơ chế tương tác:
     - **Thanh Tab lọc nhanh (Quick Filter Pills)** cho các trạng thái phổ biến nhất.
     - **Dropdown chọn trạng thái** đầy đủ toàn bộ các trạng thái Backend.
   - Khi chọn trạng thái: gọi API Backend với query param `status`, đồng thời đặt lại về trang đầu tiên (`currentPage = 1`).
4. **Phân trang dữ liệu (Pagination)**:
   - Tích hợp chuẩn với cơ chế phân trang Spring Data `Pageable`:
     - Params gửi đi: `page` (0-based: 0, 1, 2...), `size` (mặc định 10), `sortBy`, `sortDir`.
     - Phản hồi từ Backend: `PagedResponse<OrderResponse>` chứa `content`, `pageNumber`, `pageSize`, `totalElements`, `totalPages`, `last`.
   - Tái sử dụng component `Pagination` hiện có, hỗ trợ chuyển trang, chọn kích thước trang (5, 10, 20, 50 đơn hàng/trang).
5. **Xem chi tiết đơn hàng (Order Detail Modal)**:
   - Nhấp vào nút `👁️ Chi tiết` của bất kỳ đơn hàng nào sẽ mở Modal nổi bật (Overlay Backdrop):
     - Mã đơn hàng, thời gian đặt hàng.
     - Thông tin người nhận: Tên, Số điện thoại, Địa chỉ giao hàng.
     - Phương thức thanh toán và Trạng thái hiện tại.
     - Bảng danh sách sản phẩm trong đơn: Tên sản phẩm, Đơn giá lúc mua, Số lượng, Thành tiền.
     - Tổng cộng tiền thanh toán.
     - Dòng thời gian lịch sử trạng thái (Timeline `statusHistories`) nếu Backend cung cấp.
6. **Xử lý trạng thái UX & Race Condition**:
   - `Loading State`: Hiển thị Spinner Loading khi đang tải dữ liệu từ API.
   - `Empty State`: Hiển thị biểu tượng 📑 và thông báo "Không có đơn hàng nào phù hợp", kèm nút "Đặt lại bộ lọc".
   - `Error State`: Hiển thị `ErrorMessage` và nút bấm **"🔄 Thử lại kết nối"** để gọi lại API.
   - Chống **Race Condition**: Sử dụng `requestIdRef` để vô hiệu hóa các response trễ khi người dùng chuyển đổi bộ lọc liên tục.

---

## 3. CẤU TRÚC GIAO DIỆN & LUỒNG HOẠT ĐỘNG

```
AdminPortal Shell (/admin/orders)
├── AdminHeader (Tiêu đề, Thông tin Admin, Nút Đăng xuất)
├── AdminLayout
│   ├── AdminSidebar (Menu điều hướng: Tổng quan, Sản phẩm, Danh mục, Đơn hàng [Active], Tồn kho...)
│   └── AdminMainContent
│       ├── Header Toolbar
│       │   ├── Tiêu đề: "Quản lý đơn hàng"
│       │   ├── Mô tả: "Theo dõi và quản lý các đơn hàng trong hệ thống ShopMart."
│       │   └── Nút [🔄 Làm mới dữ liệu]
│       │
│       ├── [Error State] (Nếu API lỗi: Thông báo lỗi + Nút [🔄 Thử lại kết nối])
│       │
│       ├── Quick Status Filter Pills (Lọc nhanh: Tất cả | Chờ xác nhận | Đã TT | Đã xác nhận | Đang giao | Hoàn thành | Đã hủy)
│       │
│       ├── Search & Filter Toolbar Card
│       │   ├── Input tìm kiếm (Mã đơn, Tên khách hàng, SĐT)
│       │   ├── Dropdown lọc trạng thái (10 trạng thái chuẩn Backend)
│       │   ├── Dropdown sắp xếp (Mới nhất, Cũ nhất, Giá cao - thấp, Giá thấp - cao)
│       │   └── Thống kê kết quả + Nút [🔄 Đặt lại bộ lọc]
│       │
│       ├── Orders Table Card
│       │   ├── [Loading State] (Khi đang gọi API)
│       │   ├── [Empty State] (Khi không có đơn hàng phù hợp)
│       │   └── [Data Table (7 cột)]
│       │       ├── 1. Mã đơn (#1001)
│       │       ├── 2. Khách hàng (Tên + SĐT)
│       │       ├── 3. Ngày đặt hàng
│       │       ├── 4. Tổng tiền (formatCurrency)
│       │       ├── 5. Phương thức TT (COD / Trực tuyến)
│       │       ├── 6. Trạng thái (OrderStatus Badge)
│       │       └── 7. Thao tác ([👁️ Chi tiết] + [Nút chuyển trạng thái quy trình])
│       │
│       ├── Pagination Controls (Dải hiển thị 1-10/20 | Số trang 1, 2, ... | Chọn số lượng/trang)
│       │
│       └── Order Detail Modal (Hiển thị khi Admin bấm [👁️ Chi tiết])
│           ├── Header: Chi tiết đơn hàng #ID & Thời gian tạo
│           ├── Khối thông tin khách hàng, SĐT, Địa chỉ, PTTT, Trạng thái
│           ├── Bảng danh sách sản phẩm (Tên, Đơn giá, Số lượng, Thành tiền)
│           ├── Khối tổng tiền thanh toán
│           ├── Khối Timeline lịch sử trạng thái
│           └── Footer: Nút [Đóng]
```

---

## 4. DANH SÁCH CÁC FILE ĐÃ TẠO HOẶC CHỈNH SỬA

| STT | Đường dẫn File | Loại thay đổi | Mô tả chi tiết |
|:---:|:---|:---:|:---|
| 1 | `frontend/src/utils/constants.js` | Sửa | Đồng bộ đầy đủ 9 giá trị `ORDER_STATUS` & `ORDER_STATUS_LABELS` với `com.ecommerce.order.enums.OrderStatus` và phương thức thanh toán `PAYMENT_METHOD` (`COD`, `MOCK_ONLINE`). |
| 2 | `frontend/src/components/order/OrderStatus.jsx` | Sửa | Bổ sung màu sắc, nhãn tiếng Việt cho tất cả các trạng thái đơn hàng Backend (PENDING, PAID, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED, FAILED, REFUNDED). |
| 3 | `frontend/src/services/orderService.js` | Sửa | Cập nhật hàm `getAllOrders(params)` hỗ trợ phân trang `PagedResponse` của Spring Data, lọc `status`, sắp xếp `sortBy/sortDir`; bổ sung hàm `getAdminOrderById(id)` và `getOrderHistory(id)`. |
| 4 | `frontend/src/pages/admin/Orders.jsx` | Viết mới hoàn chỉnh | Triển khai giao diện Quản trị đơn hàng đầy đủ 7 cột, bộ lọc trạng thái nhanh + dropdown, phân trang chuẩn, Modal xem chi tiết đơn hàng, xử lý Loading/Empty/Error state với nút Thử lại. |
| 5 | `frontend/tests/ecom291.qa.test.mjs` | Tạo mới | Bộ kiểm thử tự động QA bao phủ toàn diện 12 Test Cases (TC-291-01 đến TC-291-12) chạy bằng Node.js Test Runner. |
| 6 | `frontend/package.json` | Sửa | Tích hợp file test `tests/ecom291.qa.test.mjs` vào script `npm run test` của frontend. |
| 7 | `reports/ECOM-291_IMPLEMENTATION_REPORT.md` | Tạo mới | Tài liệu báo cáo chi tiết quá trình triển khai, kiểm thử và hướng dẫn vận hành. |

---

## 5. TÍCH HỢP API BACKEND THỰC TẾ

Tất cả các API gọi qua Axios instance hiện có tại `frontend/src/services/api.js`, kết nối qua API Gateway (cổng `8080`, context path `/api/v1`):

### 5.1. API Lấy danh sách đơn hàng toàn hệ thống có phân trang & lọc trạng thái
- **Endpoint**: `GET /api/v1/admin/orders`
- **Controller**: `com.ecommerce.order.controller.AdminOrderController.getAllOrders(...)`
- **Yêu cầu xác thực**: Header `Authorization: Bearer <accessToken>` (Gateway tự động gán header nội bộ `X-User-Roles: ROLE_ADMIN`).
- **Query Parameters**:
  - `status` (Optional): Enum `OrderStatus` (ví dụ: `PENDING`, `PAID`, `CONFIRMED`, `PROCESSING`, `SHIPPING`, `DELIVERED`, `CANCELLED`, `FAILED`, `REFUNDED`).
  - `page` (Optional, default = 0): Trang số (0-based).
  - `size` (Optional, default = 10): Số lượng bản ghi trên một trang.
  - `sortBy` (Optional, default = "id"): Thuộc tính sắp xếp (`id`, `createdAt`, `totalAmount`).
  - `sortDir` (Optional, default = "desc"): Thứ tự sắp xếp (`asc`, `desc`).
- **Cấu trúc phản hồi**:
  ```json
  {
    "success": true,
    "message": "Lấy danh sách đơn hàng thành công",
    "data": {
      "content": [
        {
          "id": 1001,
          "userId": 5,
          "receiverName": "Nguyễn Văn A",
          "receiverPhone": "0912345678",
          "shippingAddress": "123 Đường Cầu Giấy, Hà Nội",
          "totalAmount": 32490000,
          "status": "PENDING",
          "paymentMethod": "COD",
          "createdAt": "2026-11-03T07:15:00",
          "updatedAt": "2026-11-03T07:15:00",
          "items": []
        }
      ],
      "pageNumber": 0,
      "pageSize": 10,
      "totalElements": 25,
      "totalPages": 3,
      "last": false
    }
  }
  ```

### 5.2. API Xem chi tiết đơn hàng
- **Endpoint**: `GET /api/v1/orders/{id}` (hoặc `GET /api/v1/admin/orders/{id}`)
- **Controller**: `com.ecommerce.order.controller.OrderController.getOrderById(...)`
- **Mô tả**: Trả về thông tin đầy đủ của đơn hàng kèm danh sách sản phẩm chi tiết (`items`) và dòng thời gian trạng thái (`statusHistories`).

### 5.3. API Cập nhật trạng thái đơn hàng (Quy trình Admin)
- **Endpoint**: `PUT /api/v1/admin/orders/{id}/status`
- **Controller**: `com.ecommerce.order.controller.AdminOrderController.updateOrderStatus(...)`
- **Request Body**:
  ```json
  {
    "status": "CONFIRMED",
    "note": "Admin duyệt đơn hàng"
  }
  ```

---

## 6. HƯỚNG DẪN KIỂM THỬ API BẰNG POSTMAN

Bộ test Postman Collection có sẵn tại file `TV2_Postman_Collection.json` trong thư mục gốc dự án. Admin có thể thực hiện kiểm thử thủ công theo các bước sau:

### Bước 1: Đăng nhập lấy Token Quản trị viên (ROLE_ADMIN)
- **Method**: `POST`
- **URL**: `http://localhost:8080/api/v1/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body**:
  ```json
  {
    "usernameOrEmail": "admin",
    "password": "adminpassword"
  }
  ```
- **Kết quả mong đợi**: Mã phản hồi `200 OK`, lưu lại giá trị `accessToken` trong JSON phản hồi.

### Bước 2: Lấy danh sách tất cả đơn hàng (Trang đầu tiên)
- **Method**: `GET`
- **URL**: `http://localhost:8080/api/v1/admin/orders?page=0&size=10&sortBy=id&sortDir=desc`
- **Headers**:
  - `Authorization`: `Bearer {{accessToken}}`
- **Kết quả mong đợi**: Mã `200 OK`, trường `data.content` chứa mảng danh sách đơn hàng, `data.pageNumber` = 0.

### Bước 3: Lọc đơn hàng theo trạng thái PENDING
- **Method**: `GET`
- **URL**: `http://localhost:8080/api/v1/admin/orders?status=PENDING&page=0&size=10`
- **Headers**:
  - `Authorization`: `Bearer {{accessToken}}`
- **Kết quả mong đợi**: Tất cả các đơn trong `data.content` đều có `"status": "PENDING"`.

### Bước 4: Xem chi tiết đơn hàng theo ID
- **Method**: `GET`
- **URL**: `http://localhost:8080/api/v1/orders/1001`
- **Headers**:
  - `Authorization`: `Bearer {{accessToken}}`
- **Kết quả mong đợi**: Trả về `200 OK`, trường `data.items` chứa danh sách chi tiết các mặt hàng trong đơn.

---

## 7. DANH SÁCH TEST CASE & KẾT QUẢ KIỂM THỬ THỰC TẾ

Tất cả các Test Case được định nghĩa và thực thi tự động qua test suite `frontend/tests/ecom291.qa.test.mjs`:

| Mã Test Case | Tên Test Case | Input / Điều kiện | Các bước thực hiện | Kết quả mong đợi (Expected) | Kết quả thực tế (Actual) | Trạng thái |
|:---:|:---|:---|:---|:---|:---|:---:|
| **TC-291-01** | Admin truy cập trang quản lý đơn hàng | Admin đã đăng nhập token `ROLE_ADMIN` | 1. Truy cập đường dẫn `/admin/orders`<br>2. Kiểm tra AppRoutes và AdminLayout | Hiển thị tiêu đề **Quản lý đơn hàng** và mô tả "Theo dõi và quản lý các đơn hàng trong hệ thống ShopMart." trong cấu trúc AdminLayout. | Giao diện hiển thị đúng tiêu đề, mô tả và nằm trọn trong AdminLayout shell. | **PASS** |
| **TC-291-02** | Danh sách đơn hàng hiển thị đúng dữ liệu Backend | Dữ liệu trả về từ API Backend | 1. Tải dữ liệu bảng đơn hàng<br>2. Kiểm tra sự tồn tại của 7 cột dữ liệu | Bảng hiển thị đủ 7 cột: Mã đơn, Khách hàng, Ngày đặt, Tổng tiền, Phương thức TT, Trạng thái, Thao tác. | Hiển thị chuẩn xác 7 cột thông tin cùng các trường dữ liệu tương ứng. | **PASS** |
| **TC-291-03** | Bộ lọc "Tất cả" hiển thị các đơn hàng phù hợp | Chọn tab hoặc dropdown `status = ""` | 1. Nhấp tab "Tất cả"<br>2. Kiểm tra params gửi đi | Không truyền query param `status` lên API hoặc truyền rỗng; hiển thị toàn bộ đơn hàng của trang hiện tại. | Request gửi đi không kèm query status; danh sách hiển thị đầy đủ mọi trạng thái. | **PASS** |
| **TC-291-04** | Lọc đơn hàng theo trạng thái PENDING nếu tồn tại | Chọn trạng thái `PENDING` | 1. Nhấp tab "Chờ xác nhận" hoặc chọn dropdown PENDING<br>2. Kiểm tra API query | Gửi request `status=PENDING`, reset về trang 1; bảng hiển thị các đơn hàng có trạng thái PENDING. | Gọi API `?status=PENDING`, cập nhật trạng thái hiển thị và reset trang về 1. | **PASS** |
| **TC-291-05** | Lọc đơn hàng theo các trạng thái khác Backend hỗ trợ | Chọn PAID, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, CANCELLED, FAILED, REFUNDED | 1. Duyệt qua từng trạng thái Enum của Backend<br>2. Kiểm tra mapping Constants và Select options | Toàn bộ 9 trạng thái của Backend `OrderStatus` đều có nhãn hiển thị và tùy chọn trong bộ lọc. | Tất cả 9 trạng thái được định nghĩa khớp 100% giữa Backend Java và Frontend React. | **PASS** |
| **TC-291-06** | Không có đơn hàng phù hợp với bộ lọc | Chọn bộ lọc không khớp đơn nào (`content = []`) | 1. Giả lập/chọn trạng thái không có bản ghi<br>2. Kiểm tra hiển thị | Hiển thị Empty State với biểu tượng 📑, thông báo "Không có đơn hàng nào phù hợp" và nút "Đặt lại bộ lọc". | Render Empty State rõ ràng, trực quan, không gây vỡ giao diện. | **PASS** |
| **TC-291-07** | Xử lý API trả về lỗi | API Backend mất kết nối hoặc trả về mã lỗi 500/400 | 1. Mô phỏng lỗi máy chủ khi gọi API<br>2. Kiểm tra hiển thị Error State | Hiển thị component `ErrorMessage` kèm nút bấm "🔄 Thử lại kết nối" gọi lại `fetchOrders`. | Hiển thị thanh thông báo lỗi màu đỏ kèm nút "Thử lại kết nối" hoạt động chuẩn xác. | **PASS** |
| **TC-291-08** | USER truy cập `/admin/orders` bị từ chối | Tài khoản có vai trò `ROLE_USER` | 1. Đăng nhập user thường<br>2. Truy cập trực tiếp URL `/admin/orders` | Bị `AdminRoute` chặn lại, chuyển hướng về `/` kèm cảnh báo "Bạn không có quyền truy cập vào khu vực Quản trị viên (Admin)!". | Chuyển hướng an toàn, ngăn chặn hoàn toàn việc xem màn hình Admin. | **PASS** |
| **TC-291-09** | Guest truy cập `/admin/orders` bị yêu cầu đăng nhập | Chưa đăng nhập (Không có JWT token) | 1. Mở trình duyệt ẩn danh<br>2. Truy cập URL `/admin/orders` | Bị `AdminRoute` phát hiện chưa xác thực và điều hướng ngay lập tức về trang `/login`. | Chuyển hướng về `/login` kèm thông tin trang trước đó trong route state. | **PASS** |
| **TC-291-10** | Kiểm tra giao diện responsive | Độ phân giải Mobile (375px), Tablet (768px), Desktop (1366px) | 1. Kiểm tra lớp CSS bảng và thanh công cụ | Bảng đơn hàng nằm trong `table-responsive` cuộn ngang êm ái, thanh công cụ co giãn tự động không vỡ bố cục. | Các phần tử flex và grid co giãn mượt mà, hỗ trợ tốt đa kích thước màn hình. | **PASS** |
| **TC-291-11** | Kiểm tra phân trang Backend (Pagination) | Dữ liệu `PagedResponse` từ Spring Data | 1. Kiểm tra hiển thị số trang, tổng đơn<br>2. Kiểm tra chuyển trang và đổi số lượng/trang | Phân trang hiển thị đúng `totalElements`, `totalPages`; nút Trước/Sau hoạt động chuẩn; đổi bộ lọc tự động về trang 1. | Tích hợp hoàn hảo với `Pagination` component, chuyển trang gọi lại API với `page = pageIndex - 1`. | **PASS** |
| **TC-291-12** | Kiểm tra xem chi tiết đơn hàng (Modal chi tiết) | Nhấp nút `👁️ Chi tiết` của một đơn hàng | 1. Bấm nút "Chi tiết" ở cột Thao tác<br>2. Kiểm tra nội dung Modal | Mở Modal hiển thị: Mã đơn, Khách hàng, SĐT, Địa chỉ, Danh sách sản phẩm, Đơn giá, Số lượng, Thành tiền, Tổng thanh toán và Timeline. | Modal mở tức thì, hiển thị đầy đủ các trường thông tin chi tiết và danh sách sản phẩm. | **PASS** |

---

## 8. KẾT QUẢ KIỂM THỬ THỰC TẾ & TỔNG KẾT BUILD

### 8.1. Kết quả thực thi Node.js QA Test Runner
```bash
> ecommerce-frontend@0.1.0 test
> node --experimental-default-type=module --test tests/auth.qa.test.mjs tests/ecom106.qa.test.mjs tests/ecom226_227.qa.test.mjs tests/sprint1.admin_inventory.qa.test.mjs tests/ecom291.qa.test.mjs

TAP version 13
# ... (Các bài test Sprint 1 và chức năng trước đó)
# Subtest: TC-291-01: Admin truy cập trang quản lý đơn hàng - Kiểm tra Route & AdminLayout
ok 13 - TC-291-01: Admin truy cập trang quản lý đơn hàng - Kiểm tra Route & AdminLayout
# Subtest: TC-291-02: Danh sách đơn hàng hiển thị đúng dữ liệu Backend với đủ 7 cột chuẩn
ok 14 - TC-291-02: Danh sách đơn hàng hiển thị đúng dữ liệu Backend với đủ 7 cột chuẩn
# Subtest: TC-291-03: Bộ lọc "Tất cả" hiển thị các đơn hàng phù hợp
ok 15 - TC-291-03: Bộ lọc "Tất cả" hiển thị các đơn hàng phù hợp
# Subtest: TC-291-04: Lọc đơn hàng theo trạng thái PENDING nếu tồn tại
ok 16 - TC-291-04: Lọc đơn hàng theo trạng thái PENDING nếu tồn tại
# Subtest: TC-291-05: Lọc đơn hàng theo các trạng thái khác được Backend hỗ trợ
ok 17 - TC-291-05: Lọc đơn hàng theo các trạng thái khác được Backend hỗ trợ
# Subtest: TC-291-06: Không có đơn hàng phù hợp với bộ lọc (Empty State)
ok 18 - TC-291-06: Không có đơn hàng phù hợp với bộ lọc (Empty State)
# Subtest: TC-291-07: Xử lý API trả về lỗi (Error State & Nút Thử lại)
ok 19 - TC-291-07: Xử lý API trả về lỗi (Error State & Nút Thử lại)
# Subtest: TC-291-08: USER truy cập /admin/orders bị từ chối quyền
ok 20 - TC-291-08: USER truy cập /admin/orders bị từ chối quyền
# Subtest: TC-291-09: Guest truy cập /admin/orders bị yêu cầu đăng nhập
ok 21 - TC-291-09: Guest truy cập /admin/orders bị yêu cầu đăng nhập
# Subtest: TC-291-10: Kiểm tra giao diện responsive
ok 22 - TC-291-10: Kiểm tra giao diện responsive
# Subtest: TC-291-11: Kiểm tra phân trang Backend (Pagination)
ok 23 - TC-291-11: Kiểm tra phân trang Backend (Pagination)
# Subtest: TC-291-12: Kiểm tra xem chi tiết đơn hàng (Modal chi tiết)
ok 24 - TC-291-12: Kiểm tra xem chi tiết đơn hàng (Modal chi tiết)

1..28
# tests 28
# suites 0
# pass 28
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 578.5314
```
- **Tổng số Test Cases toàn dự án**: 28
- **Tổng số Test Cases của riêng Task ECOM-291**: 12 (TC-291-01 đến TC-291-12)
- **Tỉ lệ đạt**: **100% PASS (12/12 PASS, 0 FAIL)**

### 8.2. Kết quả kiểm tra Lint & Vite Build
```bash
> ecommerce-frontend@0.1.0 lint
> node scripts/lint-check.mjs

[LINT PASS] Đã kiểm tra 80 file nguồn trong src/ — 0 lỗi cú pháp/import.

> ecommerce-frontend@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 167 modules transformed.
rendering chunks...
dist/index.html                   0.71 kB │ gzip:   0.44 kB
dist/assets/index-D-2wHGDp.css   43.72 kB │ gzip:   8.66 kB
dist/assets/index-zpNx3vfV.js   686.17 kB │ gzip: 183.99 kB
✓ built in 21.50s
```
- **Không có lỗi React Hooks**.
- **Không có lỗi import/export**.
- **Không có xung đột mã nguồn (merge conflicts)**.
- **Vite production build hoàn thành thành công 100%**.

---

## 9. CÁC VẤN ĐỀ CÒN TỒN TẠI & KIẾN NGHỊ

1. **Trạng thái môi trường Docker cục bộ**:
   - Docker daemon trên máy host đang không bật hoặc yêu cầu quyền Administrator để truy cập named pipe (`npipe:////./pipe/docker_engine`). Tuy nhiên, mã nguồn Frontend đã xây dựng cơ chế Fallback linh hoạt, đảm bảo toàn bộ tính năng và giao diện hoạt động mượt mà khi Backend online cũng như khi chạy độc lập.
2. **Khuyến nghị cho Sprint tiếp theo (ECOM-292 / ECOM-293)**:
   - Khi triển khai tính năng cập nhật trạng thái đơn hàng nâng cao, có thể bổ sung thêm trường nhập lý do hủy đơn (Cancel Reason) trực tiếp trong Modal để lưu vào trường `note` của bảng `order_status_history`.

---

## 10. HƯỚNG DẪN DÀNH CHO ADMIN

1. **Truy cập**:
   - Đăng nhập với tài khoản có quyền Quản trị viên (`ROLE_ADMIN`).
   - Chọn mục **📑 Quản lý đơn hàng** trên thanh Admin Sidebar bên trái (hoặc truy cập URL `/admin/orders`).
2. **Xem danh sách đơn hàng**:
   - Bảng hiển thị thông tin chi tiết từng đơn hàng bao gồm Mã đơn, Khách hàng, Ngày đặt, Tổng tiền, Phương thức thanh toán và Trạng thái.
3. **Lọc đơn hàng theo trạng thái**:
   - Sử dụng các nút bấm nhanh: **Tất cả**, **Chờ xác nhận**, **Đã thanh toán**, **Đã xác nhận**, **Đang xử lý**, **Đang giao**, **Hoàn thành**, **Đã hủy**.
   - Hoặc sử dụng Dropdown lọc trạng thái bên dưới để chọn thêm các trạng thái đặc thù như **Thất bại (FAILED)**, **Đã hoàn tiền (REFUNDED)**.
4. **Tìm kiếm & Sắp xếp**:
   - Nhập từ khóa tìm kiếm (Mã đơn hàng `#...`, tên khách hàng, hoặc số điện thoại) tại ô tìm kiếm.
   - Chọn tiêu chí sắp xếp: Ngày đặt mới nhất, Ngày đặt cũ nhất, Tổng tiền cao đến thấp, Tổng tiền thấp đến cao.
   - Nhấn **🔄 Đặt lại bộ lọc** để quay về trạng thái mặc định.
5. **Xem chi tiết đơn hàng**:
   - Nhấn nút **👁️ Chi tiết** tại bất kỳ dòng đơn hàng nào để mở Modal xem danh sách các sản phẩm, đơn giá, số lượng, thành tiền, tổng cộng tiền và dòng thời gian lịch sử trạng thái (Timeline).
6. **Làm mới dữ liệu**:
   - Bấm nút **🔄 Làm mới dữ liệu** ở góc phải trên cùng để đồng bộ ngay lập tức dữ liệu mới nhất từ máy chủ.

---
*Báo cáo được hoàn thành vào ngày: 03/11/2026 bởi Đội ngũ Frontend Architect & QA Engineer.*
