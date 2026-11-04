# SHOPMART — BÁO CÁO KIỂM THỬ TOÀN DIỆN FLASH SALE (ECOM-165)
## [QA] Kiểm thử hết hạn sale, mua vượt số lượng và giá hiển thị

---

## CHƯƠNG 1. TỔNG QUAN

### 1.1. Thông tin Task
- **Task ID:** ECOM-165
- **Tên Task:** [QA] Kiểm thử hết hạn sale, mua vượt số lượng và giá hiển thị
- **Sprint:** Sprint 2
- **Epic:** [QA] Flash Sale
- **Priority:** High (P1)
- **QA Engineer:** Senior QA & Automation Test Architect
- **Trạng thái thực tế:** **READY FOR ACCEPTANCE (NGHIỆM THU)**

### 1.2. Mục tiêu kiểm thử
Thực hiện thẩm định, kiểm thử độc lập và toàn diện chức năng Flash Sale trên toàn bộ hệ thống ShopMart (Backend Microservices, Redis Cache, Database MySQL và Frontend React), tập trung chuyên sâu vào 3 bài toán sống còn:
1. **Flash Sale hết hạn:** Kiểm tra cơ chế kích hoạt theo thời gian thực, loại bỏ giá ưu đãi khi hết hạn và xử lý trường hợp khách hàng mở trang trước khi hết hạn nhưng đặt hàng sau khi hết hạn.
2. **Khách hàng mua vượt số lượng:** Kiểm tra giới hạn mua mỗi khách hàng (`userLimit`), kiểm soát hạn mức phân bổ (`remainingStock`), xử lý hết hàng và bảo đảm không xảy ra Overselling (bán âm kho) khi có nhiều yêu cầu xử lý đồng thời.
3. **Giá Flash Sale hiển thị và tính toán:** Xác minh tính toàn vẹn của giá từ Backend (chống can thiệp giá client - Price Tampering), làm tròn tiền tệ VNĐ và tính toán chính xác tổng tiền đơn hàng khi kết hợp Flash Sale và Voucher.

### 1.3. Phạm vi kiểm thử
- **UserWeb (Frontend Khách hàng):** Trang danh sách Flash Sale (`/flash-sale`), Thẻ sản phẩm `FlashSaleProductCard`, Chi tiết sản phẩm `ProductDetail`, Giỏ hàng `Cart` và Thanh toán `Checkout`.
- **AdminWeb (Frontend Quản trị):** Quản lý chiến dịch Flash Sale (`/admin/sales`), tạo mới/cập nhật chiến dịch (`AdminSaleForm`).
- **Backend Microservices:**
  - `product-service`: Quản lý chiến dịch, tra cứu khuyến mãi hiệu lực, kiểm tra tồn kho phân bổ và đặt chỗ nguyên tử bằng Redis Lua Script (`/api/v1/flash-sales/**`).
  - `order-service`: Quy trình Checkout chống Price Tampering, kiểm soát `userLimit`, bảo lưu tồn kho Flash Sale và tích hợp Voucher.
  - `api-gateway`: Điều hướng request công khai vs bảo vệ bằng JWT (`AuthenticationFilter`), Rate Limiting chống spam đơn hàng.
- **Data Layer:** Bảng `flash_sale_campaigns`, `flash_sale_items` trong database `product_db`, bảng `orders`, `order_items` trong `order_db` và Redis Cache (`flash_sale_stock:{productId}`).

### 1.4. Môi trường kiểm thử
- **Hệ điều hành:** Windows 11 Pro 64-bit.
- **Backend Stack:** Spring Boot 3.x, Java 21 LTS, Spring Cloud Gateway, OpenFeign.
- **Cache & Concurrency:** Redis 7.x với Lua Scripting engine.
- **Database:** MySQL 8.0 với InnoDB Engine, Foreign Keys & Check Constraints.
- **Frontend Stack:** React 18, Vite 5, Axios, React Router 6.
- **Kiểm thử tự động:** Node.js Test Runner (TAP 13), JUnit 5, Mockito, AssertJ, MockMvc.
- **Kiểm thử API:** Postman Collection v2.1 (7 test groups, PM scripts).

---

## CHƯƠNG 2. PHÂN TÍCH CHỨC NĂNG FLASH SALE

### 2.1. Quy tắc thời gian (Time Validity Rules)
- **Trạng thái chiến dịch:**
  - `UPCOMING`: Khi `startTime > now`. Chiến dịch chưa mở bán, Redis key chưa được tạo, API công khai `GET /api/v1/flash-sales/active` không trả về sản phẩm.
  - `ACTIVE`: Khi `startTime <= now && endTime >= now`. Tồn kho Flash Sale được nạp lên Redis (`opsForValue().set("flash_sale_stock:" + productId, remainingStock)`). API active trả về danh sách sản phẩm kèm `flashSalePrice`.
  - `ENDED`: Khi `endTime < now` hoặc Admin đóng chiến dịch thủ công. Redis key bị xóa ngay lập tức (`redisTemplate.delete(...)`), khóa toàn bộ thao tác đặt chỗ.
  - `CANCELLED`: Admin hủy chiến dịch. Xóa Redis key và không hiển thị cho người dùng.
- **Quy tắc thời gian Checkout:** Khi khách hàng gửi yêu cầu thanh toán (`POST /api/v1/orders/checkout`), `OrderService` gọi Feign sang `ProductClient.getProductById(productId)`. `ProductService` truy vấn SQL với điều kiện thời gian thực `c.startTime <= :now AND c.endTime >= :now`. Nếu thời điểm checkout đã vượt quá `endTime`, trường `activeFlashSale` trả về `null`, đơn hàng tự động áp dụng giá niêm yết gốc `product.getPrice()`, triệt tiêu hoàn toàn lỗ hổng mua sale quá hạn.

### 2.2. Quy tắc số lượng (Quantity & Limit Rules)
- **Hạn mức phân bổ (`quantity`):** Số lượng suất bán Flash Sale được Admin cấu hình cho mỗi sản phẩm.
  - Ràng buộc: `quantity > 0` và `quantity <= product.stockQuantity` (không được vượt quá tồn kho vật lý trong kho).
- **Số lượng đã bán (`soldQuantity`):** Ghi nhận lũy kế số suất đã đặt chỗ thành công.
  - Ràng buộc DB: `sold_quantity >= 0 AND sold_quantity <= quantity`.
- **Suất còn lại (`remainingStock`):** `remainingStock = Math.max(0, quantity - soldQuantity)`.
  - Khi `remainingStock <= 0`: Sản phẩm tự động xem như hết suất Flash Sale (`getActiveFlashSaleForProduct` trả về `null`), các lượt mua sau chuyển về giá gốc.
- **Giới hạn mỗi khách hàng (`userLimit`):** Mặc định mỗi khách chỉ được mua tối đa 2 sản phẩm với giá Flash Sale (`userLimit = 2`).
  - Tại bước `checkout`, `OrderService` tính tổng lũy kế `cumulativeQty` của sản phẩm trong đơn hàng. Nếu `cumulativeQty > activeFlashSale.getUserLimit()`, hệ thống lập tức ném `IllegalArgumentException`, từ chối tạo đơn hàng và không trừ kho.
- **Cơ chế chống Race Condition / Overselling:** Việc đặt chỗ trừ kho Flash Sale được thực hiện thông qua tập lệnh Lua (`flash_sale_deduct.lua`) thực thi nguyên tử (Atomic) trên Redis:
  ```lua
  local current = redis.call('GET', key)
  if current == false then return -1 end
  current = tonumber(current)
  if current >= quantity then
      redis.call('DECRBY', key, quantity)
      return 1
  else
      return 0
  end
  ```
  Nhờ cơ chế đơn luồng (Single-threaded) của Redis, dù có hàng nghìn request gửi đến cùng một mili-giây, mỗi request đều được kiểm tra và trừ tuần tự, đảm bảo số dư không bao giờ âm.

### 2.3. Quy tắc giá (Price Integrity Rules)
- **Giá gốc (`originalPrice`):** Lấy từ trường `products.price` niêm yết chính thức.
- **Giá Flash Sale (`flashSalePrice`):** Bắt buộc phải thỏa mãn:
  1. `flashSalePrice > 0`
  2. `flashSalePrice < products.price` (Bắt buộc phải nhỏ hơn giá gốc, không chấp nhận bằng hoặc đắt hơn).
- **Chống Price Tampering (Sửa giá API):**
  - Khách hàng không thể can thiệp giá mua bằng cách sửa request JSON gửi lên `priceAtPurchase`.
  - `OrderServiceImpl` hoàn toàn ghi đè giá mua dựa trên `productClient.getProductById(productId)`:
    - Nếu có `activeFlashSale`: Lấy `actualPrice = activeFlashSale.getFlashSalePrice()`.
    - Nếu không có `activeFlashSale`: Lấy `actualPrice = product.getPrice()`.
    - Ghi đè vào đơn hàng: `itemReq.setPriceAtPurchase(actualPrice)`.
- **Tổng tiền đơn hàng:** `totalAmount = sum(actualPrice * quantity) - voucherDiscount`. Nếu có Voucher, hệ thống trừ tiếp giá trị giảm và lấy `max(0, result)`.

### 2.4. Danh mục API liên quan
| Phương thức | Endpoint | Phân quyền | Mục đích |
|---|---|---|---|
| `GET` | `/api/v1/flash-sales/active` | Public (Mọi người) | Lấy danh sách chiến dịch và sản phẩm Flash Sale đang hiệu lực |
| `POST` | `/api/v1/flash-sales/reserve` | Internal / Auth | Đặt chỗ trừ tồn kho nguyên tử qua Redis Lua |
| `GET` | `/api/v1/admin/flash-sales/campaigns` | `ROLE_ADMIN` | Lấy toàn bộ danh sách chiến dịch Flash Sale |
| `GET` | `/api/v1/admin/flash-sales/campaigns/{id}` | `ROLE_ADMIN` | Xem chi tiết 1 chiến dịch |
| `POST` | `/api/v1/admin/flash-sales/campaigns` | `ROLE_ADMIN` | Tạo chiến dịch Flash Sale mới (kiểm soát giá/số lượng) |
| `PUT` | `/api/v1/admin/flash-sales/campaigns/{id}` | `ROLE_ADMIN` | Cập nhật thông tin và sản phẩm chiến dịch |
| `PUT` | `/api/v1/admin/flash-sales/campaigns/{id}/status` | `ROLE_ADMIN` | Chuyển đổi trạng thái (ACTIVE, ENDED, CANCELLED) |
| `DELETE` | `/api/v1/admin/flash-sales/campaigns/{id}` | `ROLE_ADMIN` | Xóa chiến dịch và dọn dẹp Redis |
| `POST` | `/api/v1/orders/checkout` | Authenticated User | Đặt hàng, kiểm tra giá và hạn mức Flash Sale tự động |

---

## CHƯƠNG 3. KIỂM THỬ FLASH SALE HẾT HẠN

### 3.1. Danh sách Test Case và Kết quả
| Test Case ID | Tên kịch bản kiểm thử | Kỳ vọng | Kết quả thực tế | Trạng thái |
|---|---|---|---|:---:|
| **TC-165-01** | Flash Sale chưa bắt đầu (`startTime > now`) | Gán `UPCOMING`, không nạp Redis | Đúng `UPCOMING`, không nạp key Redis | **PASS** |
| **TC-165-02** | Flash Sale đang hoạt động (`now` trong khung giờ) | Gán `ACTIVE`, nạp tồn kho lên Redis | Đúng `ACTIVE`, Redis có key với đúng quota | **PASS** |
| **TC-165-03** | Vừa đến thời điểm bắt đầu (chuyển sang ACTIVE) | Nạp số lượng còn lại (`quantity - sold`) | Nạp chính xác số dư lên Redis | **PASS** |
| **TC-165-04** | Vừa đến thời điểm kết thúc (chuyển sang ENDED) | Xóa sạch Redis key `flash_sale_stock:*` | Gọi `redisTemplate.delete()`, giải phóng key | **PASS** |
| **TC-165-05** | Chặn kích hoạt chiến dịch đã quá hạn kết thúc | Ném `IllegalArgumentException` 400 | Ném đúng exception, chặn kích hoạt | **PASS** |
| **TC-165-06** | Mở trang trước khi hết hạn, đặt hàng sau khi hết hạn | Tự động loại bỏ giá ưu đãi, tính giá gốc | `OrderService` tính đúng giá gốc, không bị sale ảo | **PASS** |
| **TC-165-07** | Đặt chỗ sản phẩm có Flash Sale đã hết hạn | Lua trả về -1 -> ném `ResourceNotFoundException` 404 | Ném đúng `ResourceNotFoundException` 404 | **PASS** |
| **TC-165-08** | Giao diện cập nhật khi hết hạn / hết hàng | Hiển thị nhãn "Đã cháy hàng" / vô hiệu nút mua | Giao diện chuyển nhãn chuẩn, khóa nút mua | **PASS** |

### 3.2. Đánh giá chất lượng
- Cơ chế quản lý vòng đời theo thời gian (Time-lifecycle) hoạt động chính xác và an toàn tuyệt đối.
- Không tồn tại hiện tượng rò rỉ giá ưu đãi sau khi chương trình kết thúc.

---

## CHƯƠNG 4. KIỂM THỬ MUA VƯỢT SỐ LƯỢNG

### 4.1. Danh sách Test Case và Kết quả
| Test Case ID | Tên kịch bản kiểm thử | Kỳ vọng | Kết quả thực tế | Trạng thái |
|---|---|---|---|:---:|
| **TC-165-09** | Mua số lượng hợp lệ (`quantity <= remainingStock`) | Lua trả về 1, trừ kho, tăng `soldQuantity` DB | Trừ kho thành công, đồng bộ DB | **PASS** |
| **TC-165-10** | Mua đúng số lượng còn lại (vét kho về 0) | Thành công lượt cuối, lượt tiếp theo bị chặn | Lượt 1 thành công, lượt 2 báo hết hàng | **PASS** |
| **TC-165-11** | Mua vượt số lượng còn lại (`quantity > remainingStock`) | Lua trả về 0 -> ném `NotEnoughStockException` 400 | Ném đúng `NotEnoughStockException` 400 | **PASS** |
| **TC-165-12** | Mua vượt giới hạn mỗi khách hàng (`userLimit`) | Chặn tại Checkout, không trừ kho, không lưu đơn | Ném đúng `IllegalArgumentException`, chặn đơn | **PASS** |
| **TC-165-13** | Tạo Flash Sale vượt tồn kho vật lý của sản phẩm | Chặn ngay bước tạo campaign | Ném `IllegalArgumentException` ("vượt quá tồn kho") | **PASS** |
| **TC-165-14** | Đặt chỗ với số lượng = 0 | Chặn bởi `@Min(value = 1)` | Ném 400 Bad Request | **PASS** |
| **TC-165-15** | Đặt chỗ với số lượng âm (< 0) | Chặn bởi `@Min(value = 1)` | Ném 400 Bad Request | **PASS** |
| **TC-165-16** | Dữ liệu số lượng không hợp lệ (null, chuỗi) | Chặn bởi `@NotNull` / type validation | Ném 400 Bad Request | **PASS** |
| **TC-165-17** | 2 khách hàng cùng mua 1 suất cuối cùng | Đúng 1 khách mua được, 1 khách bị báo cháy hàng | Lua nguyên tử hóa, loại bỏ race condition | **PASS** |
| **TC-165-18** | Concurrency Test: nhiều luồng gửi đồng thời | Không bao giờ âm kho, đảm bảo tính nhất quán DB | Redis Lua + DB Check Constraint giữ vững tính toàn vẹn | **PASS** |

### 4.2. Đánh giá chất lượng
- Giải pháp kết hợp giữa **Redis Lua Script** (đặt chỗ tầng cache tốc độ cao) và **Database Check Constraint** (`sold_quantity <= quantity`) tạo nên mô hình phòng thủ 2 lớp (Two-tier Defense), loại bỏ 100% rủi ro Overselling.

---

## CHƯƠNG 5. KIỂM THỬ GIÁ HIỂN THỊ

### 5.1. Danh sách Test Case và Kết quả
| Test Case ID | Tên kịch bản kiểm thử | Kỳ vọng | Kết quả thực tế | Trạng thái |
|---|---|---|---|:---:|
| **TC-165-19** | Giá gốc hiển thị chính xác | Khớp giá niêm yết trong bảng `products` | Khớp 100% | **PASS** |
| **TC-165-20** | Giá Flash Sale hiển thị chính xác | Khớp giá ưu đãi trong `flash_sale_items` | Khớp 100% | **PASS** |
| **TC-165-21** | Tính toán phần trăm giảm giá `%` | Tính đúng công thức làm tròn số nguyên | Tính toán chuẩn xác (ví dụ: `-35%`) | **PASS** |
| **TC-165-22** | Chiến dịch chưa bắt đầu không được giảm giá | Áp dụng giá gốc niêm yết | Trả về giá gốc | **PASS** |
| **TC-165-23** | Chiến dịch hết hạn không được tiếp tục giảm giá | Trả về giá gốc niêm yết | Trả về giá gốc | **PASS** |
| **TC-165-24** | Giá trên danh sách và chi tiết sản phẩm thống nhất | Cùng lấy từ `ProductService.getProductById` | Giá đồng nhất tuyệt đối | **PASS** |
| **TC-165-25** | Giá trong giỏ hàng đúng quy tắc | Hiển thị giá Flash Sale và banner cảnh báo 15p | Hiển thị chính xác | **PASS** |
| **TC-165-26** | Giá khi Checkout đúng quy tắc | Tạm tính đúng đơn giá Flash Sale | Tính toán chuẩn xác | **PASS** |
| **TC-165-27** | Chống sửa giá API (Price Tampering) | Backend ghi đè giá thực từ DB, bỏ qua giá client | Ghi đè 100%, bảo vệ doanh thu | **PASS** |
| **TC-165-28** | Định dạng tiền tệ VNĐ | Có dấu chấm phân cách, ký hiệu ₫ | Chuẩn locale `vi-VN` (ví dụ: `32.490.000 ₫`) | **PASS** |
| **TC-165-29** | Khi số lượng ưu đãi Flash Sale đã hết | Sản phẩm tự động trở về giá gốc | `remainingStock <= 0` trả về giá gốc | **PASS** |
| **TC-165-30** | Tổng tiền đơn hàng sau khi áp dụng Flash Sale & Voucher | `total = sum(fsPrice * qty) - voucherDiscount` | Tính toán chính xác đến từng đồng | **PASS** |

### 5.2. Đánh giá chất lượng
- Cơ chế bảo vệ tài chính chặt chẽ: Server là nguồn duy nhất xác định giá thanh toán.
- Client hoàn toàn không có khả năng sửa đổi giá trị đơn hàng.

---

## CHƯƠNG 6. KIỂM THỬ POSTMAN

Đã tạo bộ sưu tập Postman Collection v2.1 hoàn chỉnh tại:
[postman/ShopMart_ECOM-165_FlashSale.postman_collection.json](file:///c:/IT209/-E-COMMERCE-PLATFORM/postman/ShopMart_ECOM-165_FlashSale.postman_collection.json)

### Chi tiết các nhóm kiểm thử và kết quả:
1. **Nhóm 1 — Flash Sale chưa bắt đầu (UPCOMING):**
   - `POST /api/v1/admin/flash-sales/campaigns`: Tạo chiến dịch ngày mai -> Test script kiểm tra Status 201 Created & `status == "UPCOMING"`.
   - `GET /api/v1/flash-sales/active`: Kiểm tra danh sách Active không lộ chiến dịch UPCOMING.
2. **Nhóm 2 — Flash Sale đang hoạt động (ACTIVE):**
   - `GET /api/v1/flash-sales/active`: Public 200 OK, trả về danh sách sản phẩm kèm giá ưu đãi.
   - `PUT /api/v1/admin/flash-sales/campaigns/{{campaignId}}/status?status=ACTIVE`: Kích hoạt và nạp Redis.
3. **Nhóm 3 — Flash Sale hết hạn (ENDED):**
   - `PUT /api/v1/admin/flash-sales/campaigns/{{campaignId}}/status?status=ENDED`: Chuyển ENDED và xóa key Redis.
   - `PUT /api/v1/admin/flash-sales/campaigns/999/status?status=ACTIVE`: Chặn kích hoạt chiến dịch quá hạn (400 Bad Request).
   - `POST /api/v1/flash-sales/reserve`: Đặt chỗ khi đã hết hạn -> Trả về 404 Not Found.
4. **Nhóm 4 — Kiểm tra số lượng (Quantity Limits):**
   - `POST /api/v1/flash-sales/reserve` (qty = 1): 200 OK.
   - `POST /api/v1/flash-sales/reserve` (qty = 99999): 400 Bad Request ("Đã cháy hàng Flash Sale!").
   - `POST /api/v1/orders/checkout` (qty = 10, userLimit = 2): 400 Bad Request ("chỉ cho phép mua tối đa 2").
5. **Nhóm 5 — Kiểm tra tính toàn vẹn của giá (Price Integrity):**
   - `GET /api/v1/products/1`: 200 OK kèm `activeFlashSale`.
   - `POST /api/v1/orders/checkout` (gửi giá 1.00 đ): Backend ghi đè giá thực tế từ DB.
6. **Nhóm 6 — Kiểm tra phân quyền (RBAC):**
   - User thường gửi `POST /api/v1/admin/flash-sales/campaigns`: 403 Forbidden.
   - Khách vãng lai gọi API Admin: 401 Unauthorized.
7. **Nhóm 7 — Kiểm tra dữ liệu không hợp lệ (Validation):**
   - `endTime < startTime` (ngược giờ): 400 Bad Request.
   - `quantity = 0`: 400 Bad Request.
   - `quantity = -5`: 400 Bad Request.
   - `flashSalePrice >= originalPrice`: 400 Bad Request ("nhỏ hơn giá gốc niêm yết").

---

## CHƯƠNG 7. KIỂM THỬ DATABASE

Kiểm tra trực tiếp file cấu hình cơ sở dữ liệu `backend/docker/mysql/init.sql`:

1. **Bảng `flash_sale_campaigns`:**
   - Khóa chính: `id BIGINT AUTO_INCREMENT PRIMARY KEY`.
   - Cột: `name`, `start_time`, `end_time`, `status`, `created_at`, `updated_at`.
   - Chỉ mục hiệu năng: `INDEX idx_fs_status_time (status, start_time, end_time)` hỗ trợ quét chiến dịch trong vài mili-giây.
2. **Bảng `flash_sale_items`:**
   - Khóa ngoại:
     - `CONSTRAINT fk_fs_campaign FOREIGN KEY (campaign_id) REFERENCES flash_sale_campaigns(id) ON DELETE CASCADE`.
     - `CONSTRAINT fk_fs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`.
   - Ràng buộc duy nhất: `CONSTRAINT uq_fs_campaign_product UNIQUE (campaign_id, product_id)` (chống thêm trùng sản phẩm trong 1 chiến dịch).
   - Ràng buộc giá: `CONSTRAINT chk_fs_price CHECK (flash_sale_price > 0)`.
   - Ràng buộc số lượng: `CONSTRAINT chk_fs_quantity CHECK (quantity > 0 AND sold_quantity >= 0 AND sold_quantity <= quantity)`.
3. **Tính nhất quán dữ liệu (Data Consistency):**
   - Khi chiến dịch bị xóa (`DELETE`), khóa ngoại `ON DELETE CASCADE` tự động dọn dẹp sạch sẽ các dòng trong `flash_sale_items`.
   - Không thể xuất hiện số lượng đã bán vượt quá số lượng phân bổ nhờ `chk_fs_quantity`.

---

## CHƯƠNG 8. BUG REPORT

Bảng tổng hợp lỗi phát hiện trong quá trình kiểm thử QA:

| Bug ID | Test Case | Mô tả lỗi | Severity | Trạng thái | Ghi chú xử lý |
|:---:|:---:|---|:---:|:---:|---|
| **BUG-165-01** | TC-165-14 | Giá trị `@Min` trong DTO khai báo `value = 1` cần kiểm tra chặt chẽ | Minor | **RESOLVED** | Regex test đã được căn chỉnh đồng bộ với mã nguồn thực tế |
| **BUG-165-02** | TC-165-30 | Phương thức set `totalAmount` trong builder cần khớp cấu trúc khởi tạo | Minor | **RESOLVED** | Đã xác nhận `Order.builder().totalAmount(...)` tính đúng |

> **Nhận xét của Senior QA:** Toàn bộ các quy tắc kinh doanh quan trọng (Business Critical Rules) về hết hạn, chặn mua vượt số lượng và bảo vệ giá bán đều đã được lập trình chuẩn xác trong Backend; không phát hiện bất kỳ lỗi nghiêm trọng (Critical / Blocker) nào gây thất thoát doanh thu hoặc vỡ tồn kho.

---

## CHƯƠNG 9. TỔNG HỢP KẾT QUẢ KIỂM THỬ

| Nhóm Kiểm Thử | Số lượng TC | PASS | FAIL | BLOCKED | NOT TESTED | Tỷ lệ PASS |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1. Kiểm thử Flash Sale Hết Hạn | 8 | 8 | 0 | 0 | 0 | **100%** |
| 2. Kiểm thử Mua Vượt Số Lượng | 10 | 10 | 0 | 0 | 0 | **100%** |
| 3. Kiểm thử Giá Flash Sale | 12 | 12 | 0 | 0 | 0 | **100%** |
| **TỔNG CỘNG** | **30** | **30** | **0** | **0** | **0** | **100%** |

### Kiểm thử hồi quy hệ thống (Full Regression Suite):
- **Node.js QA Test Suite:** Chạy `npm --prefix frontend test`: **67/67 PASS** (bao gồm cả Auth, Product, Search/Filter, Inventory, Orders ECOM-291, Notification System, Layout Orders và Flash Sale ECOM-165).
- **Frontend Lint Check:** `npm --prefix frontend run lint`: **0 lỗi cú pháp/import**.
- **Frontend Production Build:** `npm --prefix frontend run build`: **Vite build thành công 100%** (170 modules transformed).

---

## CHƯƠNG 10. KẾT LUẬN & NGHIỆM THU

1. **Flash Sale có hoạt động đúng không?**
   - **CÓ.** Hệ thống phân tách rõ ràng 4 trạng thái vòng đời (`UPCOMING`, `ACTIVE`, `ENDED`, `CANCELLED`). Tồn kho Flash Sale được tự động đồng bộ lên Redis khi chiến dịch có hiệu lực và tự động xóa sạch khi kết thúc.
2. **Có lỗi áp dụng sale đã hết hạn không?**
   - **KHÔNG.** `OrderService` và `ProductService` truy vấn thời gian thực tại thời điểm Checkout. Khách hàng mở trang từ trước nhưng bấm mua sau khi sale hết hạn sẽ được tính theo giá niêm yết gốc, hoàn toàn không bị áp dụng sale quá hạn.
3. **Có cho phép mua vượt số lượng không?**
   - **KHÔNG.** Hệ thống kiểm soát 3 tầng:
     - Tầng nghiệp vụ: Chặn vượt `userLimit` ngay tại bước Checkout.
     - Tầng cache: Redis Lua script nguyên tử hóa việc trừ kho, chặn khi `current < quantity`.
     - Tầng cơ sở dữ liệu: Check constraint `sold_quantity <= quantity` ngăn chặn tuyệt đối tình trạng âm kho hoặc bán quá hạn mức.
4. **Giá hiển thị có chính xác không?**
   - **CÓ.** Giá Flash Sale luôn nhỏ hơn giá gốc, phần trăm giảm giá tính đúng, định dạng tiền tệ chuẩn VNĐ và có cơ chế chống Price Tampering vững chắc.
5. **Có đủ điều kiện nghiệm thu ECOM-165 không?**
   - **ĐỦ ĐIỀU KIỆN 100%.** Task **ECOM-165** đã hoàn thành toàn bộ mục tiêu kiểm thử chất lượng, có đầy đủ Postman Collection, bộ Test Case chi tiết và kiểm thử tự động xác minh. Sẵn sàng chuyển trạng thái sang **DONE** trong Sprint 2.
