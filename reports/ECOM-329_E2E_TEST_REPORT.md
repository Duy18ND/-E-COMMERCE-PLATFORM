# BÁO CÁO KIỂM THỬ TÍCH HỢP HỆ THỐNG END-TO-END (E2E)
## BÁO CÁO NGHIỆM THU CHẤT LƯỢNG QA — SUB-TASK ECOM-155 (THUỘC ECOM-329)
### Nền tảng Thương mại Điện tử ShopMart

---

## 1. THÔNG TIN CHUNG

- **Mã Task cha:** `ECOM-329`
- **Mã Sub-task:** `ECOM-155`
- **Tên Task:** `[QA] Kiểm thử tích hợp End-to-End và báo cáo test`
- **Người thực hiện (PIC):** `NGÔ PHƯƠNG (QA Lead)`
- **Thời điểm thực hiện:** 09/11/2026
- **Môi trường thực thi:** Node.js 20 LTS, OpenJDK 21, Windows PowerShell / Linux Ubuntu Runner
- **Phạm vi kiểm thử:** Toàn bộ các luồng nghiệp vụ end-to-end từ giao diện người dùng (Storefront) qua API Gateway đến các Microservices (Auth, Product, Order, Payment) và Cơ sở dữ liệu MySQL 8.0.

---

## 2. TỔNG HỢP KẾT QUẢ KIỂM THỬ THỰC TẾ

| Nhóm bài kiểm thử | Số lượng Test Cases | Số Test PASS | Số Test FAIL | Tỷ lệ thành công |
|---|:---:|:---:|:---:|:---:|
| **1. Xác thực & Tài khoản (Auth & Users)** | 27 | 27 | 0 | **100%** |
| **2. Danh mục & Sản phẩm (Catalog & Products)** | 35 | 35 | 0 | **100%** |
| **3. Giỏ hàng (Shopping Cart)** | 27 | 27 | 0 | **100%** |
| **4. Đặt hàng & Trừ kho (Checkout & Inventory)** | 32 | 32 | 0 | **100%** |
| **5. Thanh toán mô phỏng (Mock Payment & Saga)** | 36 | 36 | 0 | **100%** |
| **6. Lịch sử đơn hàng & Hồ sơ (Order History & Profile)** | 30 | 30 | 0 | **100%** |
| **7. Quản lý kho Admin (Inventory & Stock Audit)** | 25 | 25 | 0 | **100%** |
| **8. Quản lý đơn hàng Admin (Admin Orders)** | 25 | 25 | 0 | **100%** |
| **9. Flash Sale & Giới hạn mua (Flash Sale Campaigns)** | 24 | 24 | 0 | **100%** |
| **10. Timeline & Theo dõi đơn (Order Tracking)** | 38 | 38 | 0 | **100%** |
| **11. Thông báo & UI Modals (Notification System)** | 14 | 14 | 0 | **100%** |
| **TỔNG CỘNG HỆ THỐNG** | **313** | **313** | **0** | **100% PASS** |

---

## 3. CHI TIẾT KIỂM THỬ CÁC LUỒNG CHẤP NHẬN (ACCEPTANCE CRITERIA)

### 3.1. Luồng 1: Guest xem danh sách sản phẩm
- **Kịch bản:** Người dùng chưa đăng nhập truy cập trang chủ hoặc `/products`.
- **Thực tế kiểm tra:**
  - Danh sách sản phẩm được tải thông qua `GET /api/v1/products?page=0&size=12`.
  - Hiển thị đầy đủ ProductCard gồm: Ảnh sản phẩm, tên, giá bán định dạng VND (`xx.xxx.xxx đ`), số lượng tồn kho và nhãn trạng thái.
  - Phân trang (Pagination) chuyển trang trước/sau hoạt động chính xác; hiển thị skeleton loading khi đang tải và empty state khi không có dữ liệu.
- **Kết quả:** **PASS** (Kiểm chứng qua `ecom106.qa.test.mjs` - TC-106-01 đến TC-106-16).

### 3.2. Luồng 2: Guest tìm kiếm và lọc sản phẩm
- **Kịch bản:** Tìm kiếm từ khóa trên thanh header hoặc lọc theo danh mục (`categoryId`).
- **Thực tế kiểm tra:**
  - Gửi request `GET /api/v1/products/search?keyword=iPhone`.
  - Kết quả trả về đúng các sản phẩm có tên hoặc mô tả khớp từ khóa.
  - Khi đổi danh mục, hệ thống tự động reset trang về trang 1 để tránh lỗi hiển thị trang rỗng.
- **Kết quả:** **PASS** (Kiểm chứng qua `ecom106.qa.test.mjs` - TC-106-05, TC-106-06).

### 3.3. Luồng 3: Người dùng thêm sản phẩm vào giỏ hàng
- **Kịch bản:** Người dùng đã đăng nhập nhấn "Thêm vào giỏ" từ ProductCard hoặc trang chi tiết sản phẩm.
- **Thực tế kiểm tra:**
  - Gửi request `POST /api/v1/cart/items` kèm `productId` và `quantity`.
  - Kiểm tra giới hạn tồn kho: Nếu số lượng yêu cầu vượt quá tồn kho thực tế của `product-service`, hệ thống chặn lại và hiển thị Toast thông báo lỗi.
  - Badge số lượng giỏ hàng trên Header cập nhật theo thời gian thực.
  - Cho phép tăng/giảm số lượng (tối thiểu 1, tối đa bằng tồn kho) và hiển thị modal xác nhận trước khi xóa sản phẩm khỏi giỏ.
- **Kết quả:** **PASS** (Kiểm chứng qua `ecom257.cart.qa.test.mjs` và `ecom260.cart_be.qa.test.mjs`).

### 3.4. Luồng 4 & 5: Đặt hàng (Checkout) và Backend tạo đơn hàng
- **Kịch bản:** Người dùng chuyển từ giỏ hàng sang màn hình Checkout, điền thông tin người nhận và chọn phương thức thanh toán.
- **Thực tế kiểm tra:**
  - Form Checkout tự động điền sẵn tên, số điện thoại, địa chỉ từ hồ sơ cá nhân của người dùng.
  - Kiểm tra xác thực (Validation): Bắt buộc nhập đầy đủ người nhận, số điện thoại (10-11 số), địa chỉ chi tiết.
  - Khi nhấn "Đặt hàng", gửi request `POST /api/v1/orders/checkout`.
  - Backend `order-service` bọc trong transaction `@Transactional(rollbackFor = Exception.class)`, gọi Feign Client sang `product-service` để giữ và trừ số lượng tồn kho tương ứng.
  - Đơn hàng được tạo trong bảng `orders` ở trạng thái ban đầu là `PENDING`.
- **Kết quả:** **PASS** (Kiểm chứng qua `ecom266.checkout.qa.test.mjs` và `ecom269.checkout_be.qa.test.mjs`).

### 3.5. Luồng 6: Kiểm tra cập nhật tồn kho (Inventory Stock Deduction)
- **Kịch bản:** So sánh số lượng tồn kho của sản phẩm trước và sau khi đặt hàng.
- **Thực tế kiểm tra:**
  - Sản phẩm A ban đầu có tồn kho 10.
  - Người dùng đặt mua 2 sản phẩm A.
  - Sau khi đơn hàng được tạo, gọi `GET /api/v1/products/{id}/stock` ghi nhận tồn kho giảm còn 8.
  - Nếu sản phẩm có tồn kho bằng 0, nút "Thêm vào giỏ" trên giao diện tự động bị vô hiệu hóa kèm nhãn "Hết hàng".
- **Kết quả:** **PASS** (Kiểm chứng qua `inventory_stock_qa.test.mjs` và `ecom284.inventory.qa.test.mjs`).

### 3.6. Luồng 7: Thanh toán mô phỏng (Simulated Payment - Saga Pattern)
- **Kịch bản:** Xử lý thanh toán mô phỏng COD hoặc Chuyển khoản / Thẻ mô phỏng (Mock Online).
- **Thực tế kiểm tra:**
  - **Happy Path:** Gửi `POST /api/v1/payments/mock-pay/{orderId}` với `{"success": true}`. Payment Service cập nhật `status: SUCCESS`, sinh mã giao dịch `TXN-...`, bắn event `PaymentSuccessEvent` sang Kafka. Order Service nhận event và cập nhật trạng thái đơn thành `PAID`.
  - **Saga Compensating Rollback:** Khi thanh toán thất bại `{"success": false}`, Payment Service cập nhật `status: FAILED`, bắn event `PaymentFailedEvent` sang Kafka. Order Service cập nhật đơn hàng thành `FAILED` và tự động gọi API `restoreStock` của `product-service` để hoàn trả lại số lượng tồn kho đã giữ.
- **Kết quả:** **PASS** (Kiểm chứng qua `TV2_Postman_Collection.json` - Folder 04 & 05; JUnit test `PaymentServiceTest.java`).

### 3.7. Luồng 8: Admin xem và duyệt đơn hàng
- **Kịch bản:** Tài khoản `admin@shopmart.com` đăng nhập vào bảng điều khiển quản trị `/admin/orders`.
- **Thực tế kiểm tra:**
  - API Gateway kiểm tra JWT có chứa vai trò `ROLE_ADMIN`.
  - Lấy danh sách toàn bộ đơn hàng của khách qua `GET /api/v1/admin/orders`.
  - Admin duyệt đơn hàng sang `CONFIRMED`, `PROCESSING`, `SHIPPING`, `DELIVERED` bằng `PUT /api/v1/admin/orders/{id}/status`.
  - Mỗi thao tác cập nhật trạng thái đều yêu cầu Modal xác nhận và tự động ghi log vào bảng `order_status_history`.
- **Kết quả:** **PASS** (Kiểm chứng qua `ecom293.admin_orders.qa.test.mjs` và `admin_order_be_qa.test.mjs`).

### 3.8. Luồng 9: Kiểm tra trạng thái đơn hàng & Timeline
- **Kịch bản:** Khách hàng vào trang chi tiết đơn hàng `/orders/{id}` hoặc `/orders/{id}/tracking` để theo dõi tiến trình.
- **Thực tế kiểm tra:**
  - Thành phần `OrderTimeline` hiển thị trực quan các bước: Đã đặt hàng $\rightarrow$ Đã xác nhận $\rightarrow$ Đang chuẩn bị $\rightarrow$ Đang giao $\rightarrow$ Đã giao hàng.
  - Bước hiện tại có hiệu ứng pulse nổi bật kèm thời gian và ghi chú của nhân viên xử lý.
  - Đồng bộ trạng thái đa tab giữa trang Admin và trang Customer thông qua cơ chế BroadcastChannel / Storage Event.
- **Kết quả:** **PASS** (Kiểm chứng qua `ecom173.timeline.qa.test.mjs`, `ecom311.timeline.qa.test.mjs`, `ecom313.status_sync.qa.test.mjs`).

---

## 4. BÁO CÁO CÁC TEST CASES TIÊU CỰC (NEGATIVE TEST CASES)

| Mã kiểm thử | Kịch bản tiêu cực | Hành vi kỳ vọng | Kết quả thực tế | Đánh giá |
|---|---|---|---|:---:|
| **TC-NEG-01** | Dữ liệu đầu vào không hợp lệ (Email sai cú pháp, bỏ trống SĐT) | Form chặn gửi, hiển thị lỗi màu đỏ dưới từng trường; API trả 400 Bad Request | Frontend hiển thị lỗi fieldErrors, Backend trả JSON validationErrors chuẩn | **PASS** |
| **TC-NEG-02** | Mua vượt số lượng tồn kho của sản phẩm | Chặn nút thêm vào giỏ, thông báo "Số lượng trong giỏ đã đạt mức tối đa" | Toast thông báo hiển thị, số lượng không vượt quá stock | **PASS** |
| **TC-NEG-03** | Giỏ hàng trống nhưng cố tình truy cập Checkout | Tự động chuyển hướng về trang `/cart`, hiển thị Empty Cart State kèm nút "Tiếp tục mua sắm" | Giao diện hiển thị minh họa giỏ trống, không cho phép checkout | **PASS** |
| **TC-NEG-04** | Người dùng chưa đăng nhập truy cập `/checkout`, `/orders` | Chặn truy cập (401 Unauthorized), chuyển hướng sang `/login` kèm `redirectUrl` | ProtectedRoute chuyển hướng chuẩn xác, giữ nguyên url trước đó | **PASS** |
| **TC-NEG-05** | Khách hàng A cố tình xem hoặc hủy đơn hàng của khách hàng B (IDOR) | API Gateway / Service chặn và trả về HTTP 403 Forbidden | Trả về 403 Forbidden, giao diện hiển thị trạng thái "Không có quyền truy cập" | **PASS** |
| **TC-NEG-06** | Xem chi tiết đơn hàng có mã ID không tồn tại (ID 999999) | Trả về HTTP 404 Not Found kèm thông báo lỗi rõ ràng | Giao diện hiển thị trạng thái Order Not Found thân thiện | **PASS** |
| **TC-NEG-07** | Chuyển đổi trạng thái đơn hàng không hợp lệ (Ví dụ: Từ DELIVERED sang PENDING) | Ném `IllegalStateException`, HTTP 400 Bad Request, giữ nguyên trạng thái cũ | Backend chặn thông qua map `ALLOWED_TRANSITIONS`, dữ liệu bảo toàn | **PASS** |
| **TC-NEG-08** | Khách hàng cố tình hủy đơn hàng đã ở trạng thái SHIPPING hoặc DELIVERED | Ẩn nút "Hủy đơn" trên giao diện; nếu gọi API trực tiếp trả về HTTP 400 | Backend từ chối hủy đơn, ném lỗi trạng thái không cho phép | **PASS** |
| **TC-NEG-09** | Gửi liên tiếp 5 request checkout cùng lúc (Spamming / Bot) | Redis Rate Limiter kích hoạt, trả về HTTP 429 Too Many Requests | Kiểm thử E2E xác thực trả về 429 sau ngưỡng burst capacity | **PASS** |
| **TC-NEG-10** | Downstream service bị sập hoặc timeout | Resilience4j Circuit Breaker kích hoạt, Gateway trả về HTTP 503 Fallback | FallbackController trả về JSON ApiResponse có cấu trúc rõ ràng | **PASS** |

---

## 5. KẾT LUẬN & ĐÁNH GIÁ CỦA QA LEAD

1. Toàn bộ 313 test cases tự động đều vượt qua với tỷ lệ thành công 100%.
2. Không có bất kỳ lỗi logic nào liên quan đến trừ tồn kho, tính tổng tiền, trạng thái đơn hàng và phân quyền bảo mật.
3. Không sử dụng mock data để che giấu lỗi trong môi trường kiểm thử tích hợp.
4. **ĐÁNH GIÁ CHUNG:** **HỆ THỐNG ĐẠT CHUẨN CHẤT LƯỢNG NGHIỆM THU E2E (PASS 100%)**.
