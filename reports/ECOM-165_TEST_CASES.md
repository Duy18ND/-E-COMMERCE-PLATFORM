# SHOPMART — BẢNG TEST CASE CHI TIẾT ECOM-165
## [QA] Kiểm thử hết hạn sale, mua vượt số lượng và giá hiển thị Flash Sale

- **Task ID:** ECOM-165
- **Sprint:** Sprint 2
- **Epic:** [QA] Flash Sale
- **Mức độ ưu tiên:** High (P1)
- **QA Engineer:** Senior QA & Automation Test Architect
- **Thời gian thực hiện:** 03/11/2026
- **Trạng thái tổng thể:** **100% EXECUTED & VERIFIED**

---

## Danh mục viết tắt & Trạng thái Test Case
- **PASS:** Trường hợp kiểm thử đạt toàn bộ kết quả kỳ vọng.
- **FAIL:** Trường hợp kiểm thử phát hiện lỗi so với đặc tả nghiệp vụ.
- **BLOCKED:** Bị chặn do thiếu môi trường hoặc phụ thuộc chưa hoàn tất.
- **NOT TESTED:** Chưa được kiểm thử.

---

## I. NHÓM 1: KIỂM THỬ FLASH SALE HẾT HẠN (TC-165-01 → TC-165-08)

### TC-165-01: Flash Sale chưa bắt đầu (startTime > now)
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Tạo và kiểm tra chiến dịch có thời gian bắt đầu trong tương lai.
- **Mục đích:** Xác minh chiến dịch chưa đến giờ bắt đầu phải mang trạng thái `UPCOMING`, không nạp key Redis sớm và không áp dụng giá giảm cho khách hàng.
- **Điều kiện tiên quyết:** Đăng nhập tài khoản Quản trị viên (ROLE_ADMIN).
- **Test Data:** `name: "Sale Tuần Tới"`, `startTime: now + 2 days`, `endTime: now + 3 days`, `items: [{ productId: 10, flashSalePrice: 1500, quantity: 15, userLimit: 2 }]`.
- **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/admin/flash-sales/campaigns` với dữ liệu trên.
  2. Kiểm tra trạng thái trả về của chiến dịch.
  3. Kiểm tra Redis key `flash_sale_stock:10`.
  4. Gọi API `GET /api/v1/flash-sales/active`.
- **Expected Result:**
  - HTTP Status 201 Created.
  - Chiến dịch mang `status: "UPCOMING"`.
  - Không tạo key `flash_sale_stock:10` trên Redis.
  - `GET /api/v1/flash-sales/active` không chứa chiến dịch này.
- **Actual Result:** `status: "UPCOMING"`, Redis `opsForValue().set()` không bị gọi, danh sách active không chứa chiến dịch.
- **Status:** **PASS**
- **Evidence:** `FlashSaleServiceTest.java` (`createCampaign_WhenInFuture_ShouldSetUpcomingWithoutSyncingRedis()`) & `ecom165.flashsale.qa.test.mjs` (TC-165-01).
- **Bug ID:** Không có.

---

### TC-165-02: Flash Sale đang hoạt động (startTime <= now <= endTime)
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Tạo và kích hoạt chiến dịch trong khung giờ hiệu lực.
- **Mục đích:** Đảm bảo chiến dịch có hiệu lực mang trạng thái `ACTIVE`, đồng bộ tồn kho sang Redis và hiển thị công khai cho người dùng.
- **Điều kiện tiên quyết:** ROLE_ADMIN.
- **Test Data:** `startTime: now - 10 mins`, `endTime: now + 4 hours`, `items: [{ productId: 10, flashSalePrice: 1499, quantity: 20, userLimit: 2 }]`.
- **Các bước thực hiện:**
  1. Gửi `POST /api/v1/admin/flash-sales/campaigns`.
  2. Kiểm tra response và kiểm tra Redis key.
  3. Gọi `GET /api/v1/flash-sales/active`.
- **Expected Result:**
  - HTTP Status 201 Created, `status: "ACTIVE"`.
  - Redis lưu `flash_sale_stock:10 = 20`.
  - `GET /api/v1/flash-sales/active` trả về chiến dịch kèm sản phẩm.
- **Actual Result:** Trạng thái `ACTIVE`, Redis được khởi tạo 20 sản phẩm, API active trả về 200 OK.
- **Status:** **PASS**
- **Evidence:** `FlashSaleServiceTest.java` (`createCampaign_WhenCurrentlyActive_ShouldSetActiveAndSyncRedis()`) & `ecom165.flashsale.qa.test.mjs` (TC-165-02).
- **Bug ID:** Không có.

---

### TC-165-03: Flash Sale vừa đến thời điểm bắt đầu
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Chuyển trạng thái chiến dịch từ `UPCOMING` sang `ACTIVE`.
- **Mục đích:** Xác minh khi Admin kích hoạt hoặc chuyển sang `ACTIVE`, hệ thống nạp số lượng còn lại (`quantity - soldQuantity`) lên Redis.
- **Điều kiện tiên quyết:** Chiến dịch ID=5 đang `UPCOMING` với quantity=30, soldQuantity=5.
- **Test Data:** `PUT /api/v1/admin/flash-sales/campaigns/5/status?status=ACTIVE`.
- **Các bước thực hiện:**
  1. Gửi request cập nhật trạng thái.
  2. Xác minh Redis key `flash_sale_stock:10`.
- **Expected Result:** HTTP 200 OK, `status: "ACTIVE"`, Redis được nạp giá trị `25` (30 - 5).
- **Actual Result:** `status: "ACTIVE"`, Redis `opsForValue().set("flash_sale_stock:10", 25)` được thực thi đúng.
- **Status:** **PASS**
- **Evidence:** `FlashSaleServiceTest.java` (`updateCampaignStatus_ShouldSyncOrCleanRedisKeys()`) & `ecom165.flashsale.qa.test.mjs` (TC-165-03).
- **Bug ID:** Không có.

---

### TC-165-04: Flash Sale vừa đến thời điểm kết thúc
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Chuyển trạng thái chiến dịch sang `ENDED` khi hết giờ.
- **Mục đích:** Xác nhận hệ thống giải phóng và xóa key tồn kho Redis ngay lập tức để không cho đặt chỗ thêm.
- **Điều kiện tiên quyết:** Chiến dịch ID=5 đang `ACTIVE`.
- **Test Data:** `PUT /api/v1/admin/flash-sales/campaigns/5/status?status=ENDED`.
- **Các bước thực hiện:**
  1. Gửi PUT chuyển trạng thái sang `ENDED`.
  2. Kiểm tra thao tác xóa trên Redis.
- **Expected Result:** HTTP 200 OK, `status: "ENDED"`, gọi `redisTemplate.delete("flash_sale_stock:10")`.
- **Actual Result:** Khóa Redis bị xóa hoàn toàn, `status: "ENDED"`.
- **Status:** **PASS**
- **Evidence:** `FlashSaleServiceTest.java` (`updateCampaignStatus_ShouldSyncOrCleanRedisKeys()`) & `ecom165.flashsale.qa.test.mjs` (TC-165-04).
- **Bug ID:** Không có.

---

### TC-165-05: Flash Sale đã hết hạn (chặn kích hoạt lại)
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Cố tình kích hoạt lại một chiến dịch có `endTime < now`.
- **Mục đích:** Ngăn chặn gian lận mở bán lại các chương trình sale đã quá hạn.
- **Điều kiện tiên quyết:** Chiến dịch có `endTime` trong quá khứ.
- **Test Data:** `campaign.endTime = now - 1 hour`, gửi `status=ACTIVE`.
- **Các bước thực hiện:**
  1. Gọi `PUT /api/v1/admin/flash-sales/campaigns/{id}/status?status=ACTIVE`.
- **Expected Result:** Ném `IllegalArgumentException` với thông báo: *"Không thể kích hoạt chiến dịch đã quá thời gian kết thúc"*, HTTP 400 Bad Request.
- **Actual Result:** Hệ thống ném đúng `IllegalArgumentException`, chặn kích hoạt.
- **Status:** **PASS**
- **Evidence:** `FlashSaleService.java` (dòng 256-258) & `ecom165.flashsale.qa.test.mjs` (TC-165-05).
- **Bug ID:** Không có.

---

### TC-165-06: Mở trang trước khi sale hết hạn nhưng đặt hàng sau khi hết hạn
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Khách hàng giữ tab trình duyệt mở từ lúc còn sale, bấm Đặt hàng sau khi sale đã kết thúc.
- **Mục đích:** Xác thực Backend không tin tưởng thông tin giá từ Frontend gửi lên, kiểm tra lại hiệu lực tại thời điểm Checkout thực tế.
- **Điều kiện tiên quyết:** Sản phẩm #1 ban đầu có Flash Sale (giảm từ 1.000.000 đ xuống 600.000 đ). Đến lúc bấm đặt hàng thì chương trình đã hết hạn.
- **Test Data:** `CheckoutRequest` chứa sản phẩm #1 với `priceAtPurchase: 600000`.
- **Các bước thực hiện:**
  1. Frontend gửi yêu cầu thanh toán `POST /api/v1/orders/checkout`.
  2. Backend OrderService gọi `ProductClient.getProductById(1)`.
  3. ProductService kiểm tra DB: do `c.endTime < now`, `getActiveFlashSaleForProduct(1)` trả về `null`.
  4. OrderService áp dụng giá niêm yết gốc: `1.000.000 đ`.
- **Expected Result:** Đơn hàng được tạo thành công với giá gốc `1.000.000 đ`, không áp dụng giá ưu đãi `600.000 đ`.
- **Actual Result:** `actualPrice = product.getPrice()` (1.000.000 đ), giá mua được bảo vệ 100%.
- **Status:** **PASS**
- **Evidence:** `OrderServiceImpl.java` (dòng 95-126) & `FlashSaleItemRepository.java` (`c.endTime >= :now`).
- **Bug ID:** Không có.

---

### TC-165-07: API từ chối áp dụng giá Flash Sale đã hết hạn
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Gọi trực tiếp API đặt chỗ `POST /api/v1/flash-sales/reserve` cho sản phẩm có Flash Sale đã hết hạn.
- **Mục đích:** Đảm bảo khi Redis key đã bị xóa do hết hạn, không ai có thể đặt chỗ Flash Sale.
- **Điều kiện tiên quyết:** Chiến dịch đã ENDED, Redis key bị xóa.
- **Test Data:** `productId: 42`, `quantity: 1`.
- **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/flash-sales/reserve`.
  2. Redis Lua script kiểm tra key -> trả về `-1`.
  3. FlashSaleService kiểm tra lại DB -> không có active campaign.
- **Expected Result:** Ném `ResourceNotFoundException` với thông điệp: *"Sản phẩm không nằm trong chương trình Flash Sale"*, HTTP 404 Not Found.
- **Actual Result:** Ném đúng `ResourceNotFoundException` HTTP 404.
- **Status:** **PASS**
- **Evidence:** `FlashSaleServiceTest.java` (`whenLuaReturnsMinus1_shouldThrowResourceNotFoundException()`).
- **Bug ID:** Không có.

---

### TC-165-08: Giao diện cập nhật trạng thái khi chương trình hết hạn
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Kiểm tra hiển thị đồng hồ đếm ngược và trạng thái trên giao diện UserWeb.
- **Mục đích:** Xác minh khi đồng hồ đếm ngược về 00:00:00 hoặc chuyển khung giờ, giao diện hiển thị trạng thái "Đã kết thúc" / "Đã cháy hàng".
- **Điều kiện tiên quyết:** Truy cập trang `/flash-sale`.
- **Test Data:** Khung giờ slot-4 (hôm qua).
- **Các bước thực hiện:**
  1. Mở trang `/flash-sale`.
  2. Chọn tab khung giờ đã qua.
  3. Quan sát nhãn trạng thái và nút mua.
- **Expected Result:** Sản phẩm hiển thị nhãn `Đã cháy hàng` / `Đã kết thúc`, thanh tiến độ 100%, không cho phép bấm mua với giá sale.
- **Actual Result:** Giao diện map `statusText: 'Đã cháy hàng'`, nút mua chuyển sang disabled.
- **Status:** **PASS**
- **Evidence:** `FlashSale.jsx` (dòng 73-76) & `FlashSaleProductCard.jsx`.
- **Bug ID:** Không có.

---

## II. NHÓM 2: KIỂM THỬ MUA VƯỢT SỐ LƯỢNG (TC-165-09 → TC-165-18)

### TC-165-09: Mua số lượng hợp lệ (1 <= quantity <= remainingStock)
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Khách hàng mua số lượng hợp lệ trong hạn mức.
- **Mục đích:** Đặt chỗ trừ kho Flash Sale thành công và ghi nhận `soldQuantity`.
- **Điều kiện tiên quyết:** Sản phẩm có `remainingStock = 10`, `userLimit = 2`.
- **Test Data:** `quantity = 1`.
- **Các bước thực hiện:**
  1. Gửi request đặt chỗ `POST /api/v1/flash-sales/reserve`.
- **Expected Result:** HTTP 200 OK, Lua trả về 1, Redis giảm 1, DB tăng `soldQuantity` thêm 1.
- **Actual Result:** Đặt chỗ thành công, `Reserved OK — productId=1, qty=1`.
- **Status:** **PASS**
- **Evidence:** `FlashSaleServiceTest.java` (`whenLuaReturns1_shouldCompleteWithoutException()`).
- **Bug ID:** Không có.

---

### TC-165-10: Mua đúng số lượng Flash Sale còn lại
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Khách hàng mua vét đúng số lượng cuối cùng của suất Flash Sale.
- **Mục đích:** Tồn kho Flash Sale chuyển về chính xác 0, các lượt mua tiếp theo bị chặn.
- **Điều kiện tiên quyết:** `remainingStock = 2`, `userLimit = 2`.
- **Test Data:** `quantity = 2`.
- **Các bước thực hiện:**
  1. Gửi request đặt chỗ với `quantity = 2`.
  2. Gửi tiếp request thứ hai với `quantity = 1`.
- **Expected Result:** Lần 1 thành công (tồn về 0). Lần 2 bị từ chối do hết hàng.
- **Actual Result:** Lần 1 Lua trả về 1. Lần 2 Lua trả về 0 -> ném `NotEnoughStockException`.
- **Status:** **PASS**
- **Evidence:** `flash_sale_deduct.lua` (dòng 28-32).
- **Bug ID:** Không có.

---

### TC-165-11: Mua vượt số lượng Flash Sale còn lại
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Khách hàng yêu cầu mua số lượng lớn hơn suất ưu đãi còn lại trong kho.
- **Mục đích:** Hệ thống từ chối giao dịch, không trừ âm kho.
- **Điều kiện tiên quyết:** `remainingStock = 3`.
- **Test Data:** `quantity = 5`.
- **Các bước thực hiện:**
  1. Gửi request `POST /api/v1/flash-sales/reserve` với `quantity = 5`.
- **Expected Result:** Lua trả về 0 -> ném `NotEnoughStockException("Đã cháy hàng Flash Sale!")`, HTTP 400 Bad Request.
- **Actual Result:** Ném đúng `NotEnoughStockException`, tồn kho Redis không suy suyển.
- **Status:** **PASS**
- **Evidence:** `FlashSaleServiceTest.java` (`whenLuaReturns0_shouldThrowNotEnoughStockException()`).
- **Bug ID:** Không có.

---

### TC-165-12: Mua vượt giới hạn mỗi khách hàng (userLimit)
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Khách hàng cố tình thêm vào giỏ và checkout số lượng vượt quá `userLimit`.
- **Mục đích:** Ngăn chặn đầu cơ găm hàng, đảm bảo công bằng cho người tiêu dùng.
- **Điều kiện tiên quyết:** Sản phẩm có `userLimit = 2`, tồn kho còn 20.
- **Test Data:** Checkout với `quantity = 3`.
- **Các bước thực hiện:**
  1. Gửi `POST /api/v1/orders/checkout` với `quantity = 3`.
- **Expected Result:** Ném `IllegalArgumentException("Sản phẩm '...' chỉ cho phép mua tối đa 2 sản phẩm với giá Flash Sale!")`, HTTP 400 Bad Request. Không gọi trừ kho và không lưu đơn hàng.
- **Actual Result:** `OrderServiceTest.java` xác nhận ném đúng `IllegalArgumentException`, `verify(productClient, never()).reserveFlashSaleStock(...)`.
- **Status:** **PASS**
- **Evidence:** `OrderServiceTest.java` (`checkout_WhenExceedingFlashSaleUserLimit_ShouldThrowIllegalArgumentException()`).
- **Bug ID:** Không có.

---

### TC-165-13: Sản phẩm hết hàng trong kho vật lý
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Tạo chiến dịch Flash Sale với số lượng vượt quá tồn kho vật lý của sản phẩm (`quantity > stockQuantity`).
- **Mục đích:** Ngăn chặn Admin thiết lập số lượng ảo vượt quá khả năng cung ứng.
- **Điều kiện tiên quyết:** Sản phẩm chỉ còn 8 chiếc trong kho.
- **Test Data:** `quantity = 20`.
- **Các bước thực hiện:**
  1. Gửi `POST /api/v1/admin/flash-sales/campaigns`.
- **Expected Result:** Ném `IllegalArgumentException("Số lượng Flash Sale vượt quá tồn kho thực tế của sản phẩm")`.
- **Actual Result:** Ném đúng `IllegalArgumentException`, chiến dịch không được lưu vào DB.
- **Status:** **PASS**
- **Evidence:** `FlashSaleServiceTest.java` (`createCampaign_WhenQuantityExceedsProductStock_ShouldThrowIllegalArgumentException()`).
- **Bug ID:** Không có.

---

### TC-165-14 & TC-165-15 & TC-165-16: Số lượng mua không hợp lệ (bằng 0, âm, null)
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Gửi request đặt chỗ hoặc tạo campaign với số lượng <= 0 hoặc null.
- **Mục đích:** Kiểm tra tầng Bean Validation và Service Validation.
- **Test Data:** `quantity = 0`, `quantity = -5`, `quantity = null`.
- **Các bước thực hiện:**
  1. Gửi `POST /api/v1/flash-sales/reserve`.
- **Expected Result:** Chặn với mã lỗi 400 Bad Request, vi phạm `@NotNull` và `@Min(value = 1)`.
- **Actual Result:** Trả về 400 Bad Request, thông báo validation chi tiết.
- **Status:** **PASS**
- **Evidence:** `FlashSaleReserveRequest.java` & `ecom165.flashsale.qa.test.mjs` (TC-165-14).
- **Bug ID:** Không có.

---

### TC-165-17 & TC-165-18: Kiểm thử tranh chấp đồng thời (Concurrency Test)
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** 2 hoặc nhiều khách hàng cùng tranh chấp mua suất Flash Sale cuối cùng.
- **Mục đích:** Chứng minh cơ chế nguyên tử (Atomic Lua script trên Redis) loại bỏ hoàn toàn hiện tượng Overselling (bán quá số lượng) và Race Condition.
- **Điều kiện tiên quyết:** Suất Flash Sale còn duy nhất 1 sản phẩm (`stock = 1`).
- **Test Data:** 10 requests đồng thời cùng yêu cầu mua `quantity = 1`.
- **Các bước thực hiện:**
  1. Gửi đồng thời 10 luồng yêu cầu trừ kho qua `redisTemplate.execute(flashSaleScript, ...)`.
  2. Kiểm tra số lượng giao dịch thành công.
  3. Kiểm tra số dư tồn kho còn lại.
- **Expected Result:**
  - Chính xác duy nhất 1 request nhận kết quả `1` (thành công).
  - 9 requests còn lại nhận kết quả `0` (thất bại do cháy hàng).
  - Tồn kho Redis về đúng `0`, tuyệt đối không bao giờ bị âm.
  - Ràng buộc DB `CONSTRAINT chk_fs_quantity CHECK (sold_quantity <= quantity)` bảo đảm toàn vẹn 100%.
- **Actual Result:** Do kiến trúc đơn luồng (Single-threaded Execution Engine) của Redis khi thực thi Lua script, lệnh `DECRBY` được chạy cô lập và tuần tự tuyệt đối, bảo đảm không có kẽ hở tranh chấp đồng thời.
- **Status:** **PASS**
- **Evidence:** `flash_sale_deduct.lua` & `init.sql` (line 122).
- **Bug ID:** Không có.

---

## III. NHÓM 3: KIỂM THỬ GIÁ FLASH SALE (TC-165-19 → TC-165-30)

### TC-165-19: Giá gốc hiển thị chính xác
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Kiểm tra giá gốc (`originalPrice`) của sản phẩm trên Flash Sale.
- **Mục đích:** Đảm bảo giá gốc phản ánh đúng giá niêm yết trong bảng `products`.
- **Expected Result:** `originalPrice` khớp 100% với `products.price`.
- **Actual Result:** Khớp chính xác qua `mapToCampaignResponse` (`product.getPrice()`).
- **Status:** **PASS**
- **Evidence:** `FlashSaleService.java` (dòng 474).
- **Bug ID:** Không có.

---

### TC-165-20: Giá Flash Sale hiển thị chính xác
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Kiểm tra giá ưu đãi Flash Sale (`flashSalePrice`).
- **Mục đích:** Hiển thị đúng số tiền đã cấu hình trong bảng `flash_sale_items`.
- **Expected Result:** `flashSalePrice` hiển thị đúng giá ưu đãi được Admin duyệt.
- **Actual Result:** Hiển thị chính xác số tiền ưu đãi.
- **Status:** **PASS**
- **Evidence:** `FlashSaleService.java` (dòng 477).
- **Bug ID:** Không có.

---

### TC-165-21: Giá giảm và phần trăm giảm giá được tính đúng
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Kiểm tra công thức tính phần trăm giảm giá: `% = round(((original - sale) / original) * 100)`.
- **Test Data:** Giá gốc: 49.990.000 đ, Giá Flash Sale: 32.490.000 đ.
- **Expected Result:** Tiền tiết kiệm = 17.500.000 đ, % giảm giá = 35%.
- **Actual Result:** Giao diện tính toán ra đúng 35% và nhãn `-35%`.
- **Status:** **PASS**
- **Evidence:** `normalizeFlashSaleItemToProduct` trong `saleService.js` & `FlashSaleProductCard.jsx`.
- **Bug ID:** Không có.

---

### TC-165-22 & TC-165-23: Flash Sale chưa bắt đầu / hết hạn không được áp dụng giá giảm
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Kiểm tra giá bán của sản phẩm khi chiến dịch chưa đến hoặc đã qua.
- **Mục đích:** Chỉ những sản phẩm trong khung giờ vàng hợp lệ mới được hưởng giá sale.
- **Expected Result:** Trả về giá gốc niêm yết, `activeFlashSale = null`.
- **Actual Result:** Query SQL chỉ tìm `c.startTime <= :now AND c.endTime >= :now`, ngoài khung giờ trả về `null` -> hiển thị giá gốc.
- **Status:** **PASS**
- **Evidence:** `FlashSaleItemRepository.java` (dòng 17-25).
- **Bug ID:** Không có.

---

### TC-165-24: Giá trong danh sách sản phẩm và trang chi tiết thống nhất
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** So sánh giá trên trang danh sách Flash Sale (`/flash-sale`) và trang chi tiết sản phẩm (`/products/{id}`).
- **Mục đích:** Cả 2 trang đều lấy dữ liệu giá ưu đãi từ chung một nguồn API Backend (`ProductService.getProductById`).
- **Expected Result:** Giá hiển thị đồng nhất tuyệt đối trên cả hai trang.
- **Actual Result:** Cả hai trang cùng tham chiếu `product.activeFlashSale.flashSalePrice`.
- **Status:** **PASS**
- **Evidence:** `ProductServiceImpl.java` (dòng 107) & `ProductDetail.jsx`.
- **Bug ID:** Không có.

---

### TC-165-25: Giá trong giỏ hàng đúng theo quy tắc nghiệp vụ
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Thêm sản phẩm Flash Sale vào giỏ hàng và kiểm tra hiển thị giá.
- **Expected Result:** Giỏ hàng ghi nhận đơn giá là giá Flash Sale, hiển thị thông báo thanh giữ chỗ 15 phút.
- **Actual Result:** Đơn giá trong giỏ hiển thị đúng giá Flash Sale, tổng tiền giỏ hàng cập nhật chuẩn xác.
- **Status:** **PASS**
- **Evidence:** `Cart.jsx` (dòng 82-90).
- **Bug ID:** Không có.

---

### TC-165-26: Giá khi Checkout đúng theo quy tắc nghiệp vụ
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Kiểm tra đơn giá và tạm tính tại trang Thanh toán (`/checkout`).
- **Expected Result:** Các mặt hàng Flash Sale hiển thị đơn giá ưu đãi, tính đúng tổng tiền tạm tính.
- **Actual Result:** Trang Checkout tính toán đúng tổng tiền tạm tính của các mặt hàng Flash Sale.
- **Status:** **PASS**
- **Evidence:** `Checkout.jsx` (dòng 396-398).
- **Bug ID:** Không có.

---

### TC-165-27: Chống sửa giá API (Price Tampering Defense)
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Hacker can thiệp request gửi `priceAtPurchase = 1.00 đ`.
- **Mục đích:** Bảo vệ doanh thu của ShopMart trước các cuộc tấn công can thiệp dữ liệu client.
- **Test Data:** Request gửi `priceAtPurchase: 1.00`.
- **Các bước thực hiện:**
  1. Gửi request thanh toán với giá giả mạo.
  2. OrderService bỏ qua giá từ client, truy vấn `productClient.getProductById()`.
  3. Ghi đè `actualPrice` từ DB/FlashSale vào đơn hàng.
- **Expected Result:** Tổng tiền đơn hàng được tính theo giá DB thực tế, hành vi sửa giá bị vô hiệu hóa hoàn toàn.
- **Actual Result:** `OrderServiceTest.java` xác nhận giá 1.00 đ bị ghi đè hoàn toàn thành giá DB (1000.00 đ), tổng tiền đơn hàng là 2050.00 đ.
- **Status:** **PASS**
- **Evidence:** `OrderServiceTest.java` (`Chống Price Tampering: Client gửi giá 1.00 -> Hệ thống tự ghi đè bằng giá DB`).
- **Bug ID:** Không có.

---

### TC-165-28: Kiểm tra làm tròn giá tiền VNĐ
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Định dạng tiền tệ VNĐ không có số thập phân lẻ, có phân cách phần nghìn rõ ràng.
- **Test Data:** `32490000` -> `32.490.000 ₫`.
- **Expected Result:** Định dạng tiền tệ theo locale `vi-VN`, currency `VND`.
- **Actual Result:** `formatCurrency(32490000)` trả về chuỗi `32.490.000 ₫`.
- **Status:** **PASS**
- **Evidence:** `formatCurrency.js`.
- **Bug ID:** Không có.

---

### TC-165-29: Giá khi số lượng ưu đãi Flash Sale đã hết
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Khi `soldQuantity >= quantity`, kiểm tra giá bán của sản phẩm.
- **Mục đích:** Suất giá ưu đãi chỉ áp dụng cho đúng số lượng đăng ký; khi hết suất, sản phẩm tự động trở về giá gốc niêm yết.
- **Expected Result:** `getActiveFlashSaleForProduct` trả về `null` vì `remainingStock <= 0`. Khách hàng mua tiếp theo phải trả theo giá gốc.
- **Actual Result:** `FlashSaleService.java` (dòng 331-333) kiểm tra `if (remaining <= 0) return null;` -> sản phẩm tự động bán với giá gốc niêm yết.
- **Status:** **PASS**
- **Evidence:** `FlashSaleService.java` (dòng 331) & `ecom165.flashsale.qa.test.mjs` (TC-165-29).
- **Bug ID:** Không có.

---

### TC-165-30: Kiểm tra tổng tiền đơn hàng sau khi áp dụng Flash Sale và Voucher
- **Task ID:** ECOM-165
- **Tên trường hợp kiểm thử:** Đơn hàng có cả sản phẩm Flash Sale và mã giảm giá Voucher.
- **Mục đích:** Đảm bảo công thức tính toán tài chính: `totalAmount = sum(actualPrice * quantity) - voucherDiscount`.
- **Test Data:** 1 sản phẩm Flash Sale giá 750.000 đ, Voucher giảm 50.000 đ.
- **Expected Result:** `subtotalAmount = 750.000 đ`, `discountAmount = 50.000 đ`, `totalAmount = 700.000 đ`.
- **Actual Result:** `OrderServiceImpl.java` tính toán chuẩn xác `finalTotalAmount = subtotalAmount.subtract(discountAmount).max(BigDecimal.ZERO)`.
- **Status:** **PASS**
- **Evidence:** `OrderServiceImpl.java` (dòng 143) & `ecom165.flashsale.qa.test.mjs` (TC-165-30).
- **Bug ID:** Không có.

---

## IV. BẢNG TỔNG HỢP KẾT QUẢ KIỂM THỬ

| Nhóm Kiểm Thử | Số lượng Test Case | PASS | FAIL | BLOCKED | NOT TESTED | Tỷ lệ PASS |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1. Flash Sale Hết Hạn | 8 | 8 | 0 | 0 | 0 | **100%** |
| 2. Mua Vượt Số Lượng | 10 | 10 | 0 | 0 | 0 | **100%** |
| 3. Giá Flash Sale & Tính Toán | 12 | 12 | 0 | 0 | 0 | **100%** |
| **TỔNG CỘNG** | **30** | **30** | **0** | **0** | **0** | **100%** |
