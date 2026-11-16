# 🎬 KỊCH BẢN DEMO MVP & BẢO VỆ ĐỒ ÁN (10–15 PHÚT)
## Hệ thống Thương mại Điện tử Microservices — ShopMart E-Commerce Platform

> **Mục tiêu tài liệu:** Hướng dẫn chi tiết từng bước (Step-by-step) để trình diễn trực tiếp (**Live Demo**) toàn bộ tính năng cốt lõi và các điểm sáng kỹ thuật của hệ thống trước Hội đồng Bảo vệ Đồ án / Nghiệm thu MVP trong khung thời gian **10 – 15 phút**, kết hợp nhịp nhàng giữa **Giao diện Web UI (`http://localhost:5173`)** và **Công cụ kiểm thử API Postman (`ECommerce_Microservices_Postman_Collection.json`)**.

---

## 📋 1. Danh mục Chuẩn bị Trước Giờ G (Pre-Demo Checklist)

Trước khi bắt đầu buổi trình bày 5 phút, hãy đảm bảo các thành phần sau đã sẵn sàng trên máy demo:

| STT | Hạng mục kiểm tra | Lệnh / Đường dẫn | Trạng thái kỳ vọng |
| :--- | :--- | :--- | :--- |
| 1 | Hạ tầng Docker (MySQL, Redis, Kafka) | `docker ps` | 4 container `mysql`, `redis`, `zookeeper`, `kafka` đang `Up (healthy)` |
| 2 | Eureka Discovery Dashboard | `http://localhost:8761` | Đủ 5 instances đăng ký `UP`: `API-GATEWAY`, `AUTH-SERVICE`, `PRODUCT-SERVICE`, `ORDER-SERVICE`, `PAYMENT-SERVICE` |
| 3 | Giao diện Web Frontend (React Vite) | `http://localhost:5173` | Mở sẵn **2 cửa sổ trình duyệt**:<br>- **Cửa sổ 1 (Bình thường):** Dành cho **Khách hàng (User)**<br>- **Cửa sổ 2 (Ẩn danh / Incognito):** Dành cho **Quản trị viên (Admin)** |
| 4 | Công cụ Postman | Import file `ECommerce_Microservices_Postman_Collection.json` | Đã cấu hình biến `{{baseUrl}} = http://localhost:8080`, sẵn sàng chạy từng request hoặc **Collection Runner** |

### 🔑 Thông tin Tài khoản Demo

| Vai trò | Email | Mật khẩu | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@ecommerce.com` | `Admin@123456` | Được khởi tạo tự động qua `DataInitializer` khi `auth-service` khởi động |
| **Khách hàng (User)** | `customer@shopmart.com` | `Customer@123` | Đăng ký nhanh trên UI (`/register`) hoặc chạy Request `1.1` trong Postman |

---

## ⏱️ 2. Phân bổ Thời lượng Trình diễn (12–15 Phút)

| Cảnh | Nội dung trình diễn | Thời lượng | Công cụ kết hợp | Điểm nhấn Kỹ thuật chứng minh với Hội đồng |
| :--- | :--- | :---: | :--- | :--- |
| **Cảnh 1** | Khởi động hệ thống & Xác thực đa vai trò | ~2 phút | Eureka + Web UI + Postman (Folder 01) | Service Discovery, API Gateway JWT Filter, Header Mutation (`X-User-Id`, `X-User-Roles`) |
| **Cảnh 2** | Admin Setup: Nhập kho, Tạo Flash Sale & Phát hành Voucher | ~2.5 phút | Web UI Admin + Postman (Folder 03, 04, 05) | Validation nghiệp vụ (`flashSalePrice < originalPrice`), Redis Lua Script Preload Stock |
| **Cảnh 3** | **Happy Path:** Mua hàng Flash Sale, Áp Voucher & Thanh toán VietQR | ~3 phút | Web UI User + QR Modal + Postman (Folder 06) | Anti-Price Tampering, VietQR tự động điền đúng số tiền sau giảm, Kafka Event `PAID` |
| **Cảnh 4** | **Unhappy Path:** Giả lập Lỗi Thanh toán & Chứng minh **Saga Rollback** | ~3 phút | Web UI User + QR Modal + Postman (Folder 07) | **Choreographed Saga Compensation:** Tự động hoàn kho sản phẩm + hoàn lượt dùng Voucher |
| **Cảnh 5** | Theo dõi Hành trình Đơn hàng & Đánh giá Sản phẩm (Verified Purchase) | ~2 phút | Web UI Admin & User + Postman (Folder 07, 08) | Order State Machine, Audit Trail (`statusHistories`), Chặn đánh giá trùng (`409 Conflict`) |
| **Cảnh 6** | Admin Kiểm duyệt Đánh giá (Moderation) & Tính lại Điểm Sao | ~1.5 phút | Web UI Admin & User + Postman (Folder 08) | Ẩn đánh giá vi phạm (`HIDDEN`), tự động tính lại `averageRating` & `reviewCount` tức thì |

---

## 🎥 3. Kịch bản Chi tiết Từng Cảnh (Step-by-Step Live Script)

---

### 🟢 CẢNH 1: Khởi động Hệ thống & Xác thực Đa vai trò (~2 Phút)

#### 🎯 Mục tiêu
Chứng minh kiến trúc Microservices hoạt động thực tế với đầy đủ các service độc lập, cơ chế định tuyến tập trung qua cổng API Gateway (`8080`) và bảo mật JWT RBAC.

#### 🛠️ Thao tác Thực hiện

1. **Bước 1.1 — Kiểm tra sức khỏe hệ thống trên Eureka Dashboard (`http://localhost:8761`):**
   - Mở tab trình duyệt tại `http://localhost:8761`.
   - Chỉ vào bảng **Instances currently registered with Eureka** hiển thị 5 dịch vụ đang ở trạng thái **`UP` (màu xanh)**:
     - `API-GATEWAY` (Port `8080`)
     - `AUTH-SERVICE` (Port `8081`)
     - `PRODUCT-SERVICE` (Port `8082`)
     - `ORDER-SERVICE` (Port `8083`)
     - `PAYMENT-SERVICE` (Port `8084`)

2. **Bước 1.2 — Đăng nhập Admin & Khách hàng trên Postman (`Folder 01. Auth & User Profile Flow`):**
   - Mở Postman, chạy lần lượt:
     - `1.1 Đăng ký tài khoản Khách hàng (Register)` $\rightarrow$ Trả về `201 Created` kèm JWT `accessToken`.
     - `1.2 Đăng nhập Khách hàng (Login User)` $\rightarrow$ Tab **Test Results** báo `PASS (4/4)`, biến `{{userToken}}` tự động được lưu.
     - `1.3 Đăng nhập Quản trị viên (Login Admin)` với `admin@ecommerce.com` / `Admin@123456` $\rightarrow$ Biến `{{adminToken}}` tự động được lưu.
   - Chạy tiếp `1.7 Thêm Địa chỉ giao hàng mới` để tạo sổ địa chỉ mặc định cho khách hàng.

3. **Bước 1.3 — Đăng nhập song song trên Giao diện Web (`http://localhost:5173/login`):**
   - **Cửa sổ 1 (User):** Đăng nhập tài khoản khách hàng $\rightarrow$ Điều hướng về Trang chủ với danh sách sản phẩm và số lượng giỏ hàng trên Header.
   - **Cửa sổ 2 (Admin - Incognito):** Đăng nhập `admin@ecommerce.com` / `Admin@123456` $\rightarrow$ Truy cập bảng điều khiển Quản trị (`/admin`).

> 💡 **Lời thoại nhấn mạnh với Hội đồng:**
> *"Toàn bộ request từ React Frontend và Postman chỉ giao tiếp duy nhất với cổng API Gateway `8080`. Tại đây, `AuthenticationFilter` sẽ xác thực chữ ký JWT, kiểm tra quyền `/api/v1/admin/**` và bóc tách `userId`, `roles` thành các HTTP Header nội bộ (`X-User-Id`, `X-User-Roles`) chuyển xuống các service phía sau. Nhờ đó hệ thống chống triệt để lỗ hổng giả mạo định danh (IDOR)."*

---

### 🟠 CẢNH 2: Admin Setup — Nhập kho, Tạo Flash Sale & Phát hành Voucher (~2.5 Phút)

#### 🎯 Mục tiêu
Trình diễn luồng vận hành của Quản trị viên: Quản lý tồn kho chuẩn xác, kiểm soát ràng buộc nghiệp vụ khi tạo chiến dịch Flash Sale (kèm nạp tồn kho lên Redis cho Lua Script) và phát hành mã giảm giá Voucher.

#### 🛠️ Thao tác Thực hiện

1. **Bước 2.1 — Admin nhập thêm hàng vào kho (`/inbound`):**
   - **Trên Web UI Admin (`/admin/inventory`) hoặc Postman (`Folder 03 -> 3.2 Admin Nhập hàng vào kho`):**
   - Chọn sản phẩm mục tiêu (ví dụ: *iPhone 16 Pro Max 256GB* hoặc sản phẩm vừa tạo ở `Folder 02`), nhập số lượng thêm: `50` sản phẩm với ghi chú `"Nhập lô hàng chuẩn bị chiến dịch Flash Sale"`.
   - **Kết quả:** Tồn kho sản phẩm tăng thêm `50` đơn vị ngay lập tức (`200 OK`).

2. **Bước 2.2 — Admin tạo Chiến dịch Flash Sale & Chứng minh Bắt lỗi Nghiệp vụ (`Folder 04`):**
   - **Thử nghiệm Bắt lỗi Validation (`Request 4.1`):**
     - Gửi request `POST /api/v1/admin/flash-sales/campaigns` với `originalPrice = 20000000` nhưng cố tình nhập `flashSalePrice = 25000000` (giá sale cao hơn giá gốc!).
     - **Kết quả:** Hệ thống lập tức từ chối với mã **`400 Bad Request`**: *"Giá Flash Sale phải nhỏ hơn giá gốc"*.
   - **Tạo Chiến dịch Hợp lệ & Kích hoạt Redis Lua Stock (`Request 4.2` $\rightarrow$ `4.3` $\rightarrow$ `4.4`):**
     - Tạo chiến dịch hợp lệ: `originalPrice = 20000000`, `flashSalePrice = 15000000` (**giảm 5.000.000đ**), `stockLimit = 20`.
     - Chuyển trạng thái chiến dịch sang **`ACTIVE`** (`PATCH /api/v1/admin/flash-sales/campaigns/{id}/status`).
     - Gọi `POST /api/v1/admin/flash-sales/campaigns/{id}/preload-stock` $\rightarrow$ Hệ thống nạp tồn kho `20` sản phẩm vào **Redis** (`flash_sale:stock:{productId}`).
   - **Kiểm tra phía Khách hàng (`Request 4.5` hoặc Trang chủ Web UI):**
     - Gọi `GET /api/v1/flash-sales/active` $\rightarrow$ Chiến dịch vừa mở xuất hiện ngay lập tức với `remainingStock: 20`.

3. **Bước 2.3 — Admin phát hành Mã giảm giá Voucher (`Folder 05` hoặc `/admin/vouchers`):**
   - Trên trang `/admin/vouchers` (hoặc chạy `Request 5.1 Admin Tạo mã Voucher mới`):
     - Tạo mã Voucher mới (ví dụ: `DEMO50K` hoặc sử dụng mã `GIAM50K` đã seed):
       - Loại giảm giá: `FIXED_AMOUNT` — Giảm **`50,000đ`** cho đơn từ `200,000đ`.
       - Giới hạn lượt dùng (`usageLimit`): `10` lượt.
   - Chạy `Request 5.5 Khách hàng xem danh sách Voucher đang hoạt động` (`GET /api/v1/vouchers/active`) để thấy các mã khả dụng (`GIAM10`, `GIAM50K`, `FREESHIP`, `DEMO50K`).

> 💡 **Lời thoại nhấn mạnh với Hội đồng:**
> *"Đối với bài toán Flash Sale có hàng nghìn người bấm mua cùng lúc, nhóm sử dụng kết hợp 2 lớp bảo vệ chống Overselling: Lớp 1 là **Redis Lua Script** kiểm tra và trừ tồn kho nguyên tử (Atomic) ngay trên RAM với độ trễ dưới 1ms; Lớp 2 là **Optimistic Locking (`@Version`)** tại MySQL để đảm bảo tuyệt đối không bao giờ bán âm kho."*

---

### 🔵 CẢNH 3: Happy Path — Mua hàng Flash Sale, Áp mã Voucher & Thanh toán VietQR (~3 Phút)

#### 🎯 Mục tiêu
Chứng minh luồng mua sắm trọn vẹn của khách hàng: Hệ thống tự động áp dụng **giá Flash Sale** từ Server, tính chuẩn số tiền giảm **Voucher**, sinh mã **VietQR động** khớp từng đồng với `finalAmount`, và xử lý thanh toán bất đồng bộ qua **Apache Kafka**.

#### 🛠️ Thao tác Thực hiện

1. **Bước 3.1 — Khách hàng chọn sản phẩm Flash Sale & đưa vào Giỏ hàng:**
   - Trên **Cửa sổ 1 (User Web UI)** hoặc Postman (`Request 6.1 Thêm sản phẩm vào Giỏ hàng`):
   - Chọn sản phẩm đang trong chương trình Flash Sale (Giá gốc `20.000.000đ` $\rightarrow$ Giá Flash Sale **`15.000.000đ`**), số lượng `1`.
   - Chuyển tới màn hình **Thanh toán (`/checkout`)**.

2. **Bước 3.2 — Áp dụng Mã giảm giá Voucher & Kiểm tra Công thức Tính tiền:**
   - Tại ô **Mã giảm giá (Voucher)** trên trang Checkout, nhập mã **`GIAM50K`** (hoặc bấm chọn từ danh sách Voucher đang mở) và bấm **Áp dụng** (`POST /api/v1/vouchers/apply`).
   - Quan sát bảng tổng kết đơn hàng trên màn hình (hoặc JSON trả về ở `Request 6.5 Đặt hàng Online QR`):
     - Tổng tiền hàng (theo giá Flash Sale từ Server): **`15.000.000 ₫`**
     - Giảm giá Voucher (`GIAM50K`): **`-50.000 ₫`**
     - **Tổng thanh toán cuối cùng (`finalAmount`):** **`14.950.000 ₫`**
   - Chọn phương thức thanh toán: **Chuyển khoản Ngân hàng (VietQR / VNPAY)** và bấm **Đặt hàng**.

3. **Bước 3.3 — Kiểm tra Popup Mã QR VietQR Động:**
   - Ngay khi bấm Đặt hàng, **Popup `QrPaymentModal`** bật lên trên màn hình:
     - Hiển thị hình ảnh mã QR chuẩn **VietQR (`MB Bank - 0384123456`)**.
     - Chỉ cho Hội đồng thấy thông tin bên dưới mã QR:
       - **Số tiền cần chuyển:** Hiển thị chính xác **`14.950.000 ₫`** (đã trừ cả ưu đãi Flash Sale lẫn Voucher!).
       - **Nội dung chuyển khoản:** Tự động điền `THANH TOAN DON HANG #<orderId>`.
       - **Đồng hồ đếm ngược:** 15:00 phút giữ đơn.

4. **Bước 3.4 — Xác nhận Chuyển khoản Thành công (Kích hoạt Kafka Happy Path):**
   - Trên Popup QR Modal, bấm vào nút màu xanh:
     > **🟢 Xác nhận đã chuyển khoản (Test Thành Công)**
     *(Hoặc chạy `Request 6.6 Xác nhận Thanh toán VietQR Thành công` trong Postman với `{"success": true}`)*
   - **Quan sát kết quả tức thì:**
     - `payment-service` lưu giao dịch `SUCCESS` và bắn sự kiện `PaymentResultEvent(status = "PAID")` vào Kafka topic `payment-results`.
     - `order-service` lắng nghe Kafka, tự động cập nhật trạng thái đơn hàng từ `PENDING` $\rightarrow$ **`PAID`**!
     - Giao diện Web hiển thị thông báo thành công và chuyển sang trang Chi tiết đơn hàng với huy hiệu **`Đã thanh toán (PAID)`**.

---

### 🔴 CẢNH 4: Unhappy Path — Giả lập Lỗi Thanh toán & Chứng minh Saga Rollback (~3 Phút)

#### 🎯 Mục tiêu
Đây là **điểm nhấn kỹ thuật quan trọng nhất** của kiến trúc Microservices: Chứng minh khi bước thanh toán gặp sự cố ở `payment-service`, mẫu thiết kế **Choreographed Saga** sẽ tự động kích hoạt các giao dịch bù trừ (**Compensating Transactions**) để hoàn trả lại đúng số lượng tồn kho sản phẩm sang `product-service` và hoàn trả lượt dùng mã giảm giá Voucher!

#### 🛠️ Thao tác Thực hiện

1. **Bước 4.1 — Ghi nhận Số liệu Trước khi Đặt đơn (Baseline):**
   - Kiểm tra nhanh trên Postman hoặc UI Admin:
     - Giả sử tồn kho sản phẩm hiện tại (`stock`): **`49`**
     - Số lượt đã dùng của mã Voucher `GIAM50K` (`usedCount`): **`1`**

2. **Bước 4.2 — Khách hàng Đặt một Đơn hàng Mới có Áp mã Voucher (`Request 7.1` hoặc trên Web UI):**
   - Khách hàng đặt mua **`2`** sản phẩm cùng mã Voucher **`GIAM50K`**, chọn thanh toán Online QR.
   - **Ngay tại thời điểm đơn hàng `PENDING` vừa được tạo (Popup QR đang mở):**
     - Kiểm tra lại tồn kho (`Request 3.1`): Tồn kho đã bị giữ tạm (`reserve`), giảm từ `49` xuống **`47`**!
     - Kiểm tra lại Voucher (`Request 5.2`): Lượt dùng `usedCount` của `GIAM50K` đã tăng từ `1` lên **`2`**!

3. **Bước 4.3 — Kích hoạt Lỗi Thanh toán để Chạy Saga Rollback:**
   - Tại màn hình Popup QR Modal trên Web UI, bấm vào nút màu đỏ:
     > **🔴 Giả lập Lỗi / Hủy thanh toán (Test Saga Rollback)**
     *(Hoặc trên Postman, chạy `Request 7.2 Giả lập Lỗi Thanh toán QR` gọi `POST /api/v1/payments/mock-pay/{orderId}` với body `{"success": false, "note": "Khách hàng hủy tại màn hình QR / Giao dịch lỗi"}`)*

4. **Bước 4.4 — Chứng minh Kết quả Bù trừ Tự động (3 Bằng chứng Thép):**
   - **Bằng chứng 1 — Trạng thái Đơn hàng & Lịch sử Saga (`Request 7.3` hoặc trang Chi tiết đơn hàng):**
     - Đơn hàng tự động chuyển từ `PENDING` sang **`FAILED`**.
     - Mở mảng `statusHistories` của đơn hàng để Hội đồng thấy dòng log tự động:
       - `previousStatus: "PENDING"` $\rightarrow$ `newStatus: "FAILED"`
       - `updatedBy: "SYSTEM_KAFKA"`
       - `note: "Thanh toán thất bại qua Payment Service (Đã tự động hoàn kho)"`
   - **Bằng chứng 2 — Tồn kho Sản phẩm đã được Hoàn trả (`Request 3.1` hoặc trang Admin Inventory):**
     - Kiểm tra lại tồn kho sản phẩm: Đã tự động tăng từ `47` trở lại **`49`** (`+2` sản phẩm được `release` thành công)!
   - **Bằng chứng 3 — Lượt dùng Voucher đã được Hoàn trả (`Request 5.2` hoặc trang Admin Vouchers):**
     - Kiểm tra lại mã `GIAM50K`: Chỉ số `usedCount` đã tự động giảm từ `2` về lại **`1`** (không làm mất lượt khuyến mãi của khách)!

> 💡 **Lời thoại nhấn mạnh với Hội đồng:**
> *"Trong môi trường phân tán, chúng ta không thể dùng `@Transactional`跨越 nhiều Database khác nhau. Nhờ áp dụng **Choreographed Saga qua Kafka**, khi `payment-service` báo lỗi `FAILED`, `order-service` lập tức thực hiện 2 giao dịch bù trừ (Compensating Actions): Gọi sang `product-service` giải phóng đúng 2 sản phẩm đang giữ tạm và giảm `usedCount` của Voucher về như cũ, đảm bảo tính nhất quán dữ liệu (Eventual Consistency) 100%."*

---

### 🟣 CẢNH 5: Theo dõi Hành trình Đơn hàng & Đánh giá Sản phẩm (~2 Phút)

#### 🎯 Mục tiêu
Trình diễn vòng đời trạng thái đơn hàng chặt chẽ (**Order State Machine**), lịch sử vết kiểm toán (**Audit Trail Timeline**) và cơ chế chỉ cho phép khách hàng đã nhận hàng thành công (**Verified Purchase - `DELIVERED`**) được gửi đánh giá 1 lần duy nhất.

#### 🛠️ Thao tác Thực hiện

1. **Bước 5.1 — Admin duyệt Đơn hàng theo State Machine (`PAID` $\rightarrow$ `CONFIRMED` $\rightarrow$ `SHIPPING` $\rightarrow$ `DELIVERED`):**
   - Quay lại đơn hàng đã thanh toán thành công (`PAID`) ở **Cảnh 3**.
   - **Trên Cửa sổ 2 (Admin Web UI - `/admin/orders`) hoặc Postman (`Request 7.6` $\rightarrow$ `7.7` $\rightarrow$ `7.8`):**
     - Admin bấm cập nhật trạng thái lần 1: `PAID` $\rightarrow$ **`CONFIRMED`** (*"Admin xác nhận đơn hàng và đóng gói"*).
     - Admin bấm cập nhật trạng thái lần 2: `CONFIRMED` $\rightarrow$ **`SHIPPING`** (*"Đã bàn giao cho đơn vị vận chuyển GiaoHangNhanh"*).
     - Admin bấm cập nhật trạng thái lần 3: `SHIPPING` $\rightarrow$ **`DELIVERED`** (*"Giao hàng thành công tới tay khách hàng"*).
   - *(Tùy chọn)* Thử chuyển ngược từ `DELIVERED` về `CANCELLED` $\rightarrow$ Hệ thống chặn ngay với lỗi `400 Bad Request` do vi phạm State Machine!

2. **Bước 5.2 — Khách hàng Xem Timeline Hành trình Đơn hàng (`statusHistories`):**
   - Trên **Cửa sổ 1 (User Web UI - `/orders/{id}`)** hoặc Postman (`Request 7.9`):
   - Chỉ cho Hội đồng thấy **Timeline Hành trình Đơn hàng** hiển thị đầy đủ 5 mốc thời gian từ lúc đặt đơn (`PENDING`) $\rightarrow$ `PAID` (`SYSTEM_KAFKA`) $\rightarrow$ `CONFIRMED` $\rightarrow$ `SHIPPING` $\rightarrow$ `DELIVERED` kèm tên người duyệt và ghi chú chi tiết.

3. **Bước 5.3 — Khách hàng Gửi Đánh giá 5 Sao & Chứng minh Chặn Đánh giá Trùng (`Folder 08`):**
   - Khi đơn hàng đã đạt `DELIVERED`, khách hàng mở trang Chi tiết sản phẩm (hoặc chạy `Request 8.1 Khách hàng Gửi đánh giá 5 sao`):
     - Chọn **5 sao (`rating: 5`)**, nhập nhận xét: *"Sản phẩm chính hãng tuyệt vời, đóng gói kỹ, giao hàng siêu tốc!"* $\rightarrow$ Gửi thành công (`201 Created`).
     - Điểm trung bình sao (`averageRating`) của sản phẩm lập tức cập nhật lên **`5.0`** (`reviewCount: 1`).
   - **Chứng minh Chặn Spam / Đánh giá trùng (`Request 8.2`):**
     - Khách hàng cố tình gửi thêm một đánh giá thứ 2 cho cùng sản phẩm đó.
     - **Kết quả:** Hệ thống chặn ngay lập tức với mã lỗi **`409 Conflict`**: *"Bạn đã đánh giá sản phẩm này rồi"*.

---

### 🟡 CẢNH 6: Admin Kiểm duyệt Đánh giá (Moderation) & Tính lại Điểm Sao (~1.5 Phút)

#### 🎯 Mục tiêu
Khép lại bài Demo bằng tính năng Quản trị chất lượng nội dung: Admin kiểm duyệt, ẩn đánh giá vi phạm tiêu chuẩn cộng đồng và hệ thống tự động tính toán lại điểm xếp hạng (`averageRating`) theo thời gian thực.

#### 🛠️ Thao tác Thực hiện

1. **Bước 6.1 — Admin Rà soát Danh sách Đánh giá (`/admin/reviews` hoặc `Request 8.5`):**
   - Trên **Cửa sổ 2 (Admin Web UI)** hoặc Postman (`GET /api/v1/admin/reviews`), Admin xem toàn bộ danh sách đánh giá của khách hàng trên hệ thống.

2. **Bước 6.2 — Admin Ẩn Đánh giá Vi phạm sang `HIDDEN` (`Request 8.6`):**
   - Admin chọn đánh giá cần xử lý, bấm **Ẩn đánh giá** (gọi `PATCH /api/v1/admin/reviews/{reviewId}/moderate` với body):
     ```json
     {
       "status": "HIDDEN",
       "reason": "Nội dung chứa từ ngữ quảng cáo spam không phù hợp tiêu chuẩn cộng đồng"
     }
     ```
   - **Kết quả:** Trạng thái đánh giá chuyển sang `HIDDEN` kèm lưu vết `moderationReason`.

3. **Bước 6.3 — Chứng minh Đánh giá Biến mất Công khai & `averageRating` Cập nhật Tức thì (`Request 8.7`):**
   - Quay lại **Cửa sổ 1 (Trang Chi tiết sản phẩm của Khách hàng)** hoặc chạy `Request 8.7 Kiểm tra lại Danh sách công khai & Điểm trung bình sao`:
     - **Bằng chứng 1:** Đánh giá vừa bị ẩn (`HIDDEN`) **biến mất hoàn toàn** khỏi danh sách đánh giá công khai (`GET /api/v1/products/{id}/reviews`).
     - **Bằng chứng 2:** Thuộc tính `averageRating` và `reviewCount` trên bảng `Product` được hàm `recalculateProductRating()` tính toán lại ngay lập tức (chỉ tính các review có `status = APPROVED`).
   - *(Tùy chọn)* Admin chạy `Request 8.8 Khôi phục Đánh giá (APPROVED)` $\rightarrow$ Đánh giá hiển thị trở lại và điểm sao sản phẩm về lại **`5.0`**!

---

## 🏆 4. Tổng kết & Câu hỏi Thường gặp từ Hội đồng (Q&A Cheat Sheet)

Khi kết thúc Cảnh 6, bạn có thể mở tab **Postman Collection Runner**, bấm chạy tự động toàn bộ 8 Folder (`ECommerce_Microservices_Postman_Collection.json`) để Hội đồng thấy **100% Test Assertions (`pm.test`) đều xanh (`PASS`)**, đồng thời sẵn sàng trả lời các câu hỏi phản biện chuyên sâu:

| Câu hỏi từ Hội đồng | Câu trả lời cốt lõi (Key Architectural Answer) |
| :--- | :--- |
| **1. Làm sao ngăn chặn khách hàng sửa giá sản phẩm hoặc sửa tổng tiền ở phía Frontend khi đặt hàng?** | Trong `OrderServiceImpl.checkout()`, `order-service` **không nhận trường giá từ Frontend**. Hệ thống gọi nội bộ sang `product-service` để lấy giá gốc / giá Flash Sale đang `ACTIVE`, tự nhân số lượng và tự gọi `VoucherService` để trừ khuyến mãi. |
| **2. Nếu 1.000 người cùng bấm mua sản phẩm Flash Sale cuối cùng thì hệ thống xử lý thế nào?** | Hệ thống chặn ở 2 tầng: Tầng 1 dùng **Redis Lua Script** (`DECRBY` có điều kiện) thực thi đơn luồng nguyên tử trên RAM; Tầng 2 dùng **Optimistic Locking (`@Version`)** trong MySQL bảng `products`. Chỉ đúng 1 request thành công, 999 request còn lại nhận `409 Conflict` ngay lập tức. |
| **3. Tại sao chọn Choreographed Saga qua Kafka thay vì 2-Phase Commit (2PC)?** | 2PC gây khóa tài nguyên đồng bộ (Blocking) làm giảm hiệu năng nghiêm trọng. Với **Choreographed Saga qua Kafka**, `order-service` và `payment-service` giao tiếp bất đồng bộ qua sự kiện (`payment-results`), chịu lỗi cao và tự động chạy giao dịch bù trừ (hoàn kho + hoàn Voucher) khi thanh toán thất bại. |
| **4. Làm sao các Microservice phía sau biết Request đến từ User nào mà không cần giải mã lại JWT?** | Cổng **API Gateway (`AuthenticationFilter`)** đảm nhận xác thực chữ ký JWT tập trung, chặn sẵn cácheader giả mạo từ bên ngoài, sau đó gắn `X-User-Id`, `X-User-Email`, `X-User-Roles` vào request nội bộ chuyển tới các service con. |

