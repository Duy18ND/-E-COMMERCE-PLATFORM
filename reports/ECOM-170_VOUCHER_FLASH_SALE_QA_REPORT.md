# BÁO CÁO KIỂM THỬ CHẤT LƯỢNG (QA REPORT) – TASK ECOM-170

---

## 1. Thông tin Task ECOM-170

| Hạng mục | Chi tiết |
| :--- | :--- |
| **Dự án** | ShopMart E-Commerce Platform |
| **Thư mục dự án** | `C:\IT209\-E-COMMERCE-PLATFORM` |
| **Git Branch** | `devops-phuong` |
| **Task ID** | `ECOM-170` |
| **Tên Task** | `[QA] Kiểm thử điều kiện tối thiểu, hết hạn và kết hợp Flash Sale` |
| **Parent Task** | `ECOM-332 – QA Voucher & mã giảm giá` |
| **Sprint** | Sprint 3 |
| **PIC / Vai trò** | Ngô Phương – QA & DevOps |
| **Ngày thực hiện** | 10/11/2026 |
| **Trạng thái** | **HOÀN THÀNH (45/45 Automated Tests ECOM-170 PASS — 0 FAIL)** |

---

## 2. Phạm vi Kiểm thử (Test Scope)

### 2.1. Trong phạm vi ECOM-170
1. **Nhóm A – Kiểm tra điều kiện giá trị đơn hàng tối thiểu (`minOrderValue`)**:
   - Xác minh điều kiện giá trị đơn hàng tối thiểu (`E170-01` → `E170-06`): đơn dưới ngưỡng (`< 500.000đ`), đúng biên (`= 500.000đ`), trên ngưỡng (`> 500.000đ`), đơn bằng `0đ` (kể cả khi `minOrderValue = 0`), đơn âm không hợp lệ (`< 0`), và giá trị `orderTotal` bị thiếu/`null`.
   - Xác minh số tiền dùng để kiểm tra `minOrderValue` theo đúng nghiệp vụ hiện tại của `OrderServiceImpl.checkout`: kiểm tra dựa trên `subtotalAmount` **sau khi đã áp giá ưu đãi Flash Sale** và **trước khi trừ giảm giá Voucher**.
2. **Nhóm B – Kiểm tra thời hạn sử dụng Voucher & đồng bộ Múi giờ (`startDate`, `endDate`, Timezone)**:
   - Xác minh các trạng thái thời hạn (`E170-07` → `E170-12`): chưa đến ngày bắt đầu (`today < startDate` / `UPCOMING`), đang trong thời hạn (`startDate <= today <= endDate` / `ACTIVE`), đã quá hạn (`today > endDate` / `EXPIRED`), đúng biên ngày bắt đầu (`00:00:00` giờ Việt Nam `GMT+7`), đúng biên ngày kết thúc (`23:59:59` giờ Việt Nam `GMT+7`), và cấu hình sai `startDate > endDate`.
   - Sử dụng `java.time.Clock` injection (`Clock.fixed(..., ZoneId.of("Asia/Ho_Chi_Minh"))`) ở Backend và tham số thời gian cố định ở Frontend để test 100% tất định, không phụ thuộc thời gian thực của máy chạy test.
3. **Nhóm C – Kiểm tra quy tắc kết hợp Voucher với Flash Sale**:
   - Xác minh quy tắc kết hợp (`E170-13` → `E170-18`): sản phẩm Flash Sale đủ điều kiện áp Voucher, sản phẩm Flash Sale làm tổng tiền sau giảm tụt xuống dưới `minOrderValue` của Voucher, giỏ hàng hỗn hợp (sản phẩm Flash Sale + sản phẩm thường), chặn áp dụng trùng nhiều mã giảm giá hoặc giả mạo giá (`Price Tampering`), chặn tạo tổng thanh toán âm khi mệnh giá Voucher vượt tổng tiền hàng (`finalTotalAmount >= 0`), và tự động tính lại / gỡ bỏ Voucher khi thay đổi số lượng sản phẩm.
4. **Nhóm D – Kiểm tra tính chính xác của kết quả tính toán**:
   - Kiểm tra giá gốc (`price`), giá sau Flash Sale (`flashSalePrice`), số tiền giảm của Voucher (`discountAmount` cho cả `FIXED` và `PERCENT` có trần `maxDiscount`), phép làm tròn `RoundingMode.HALF_UP` (2 chữ số thập phân ở Backend) / `Math.round` (ở Frontend), chống `Price Tampering` (Backend tự truy vấn giá từ `ProductClient`, không tin số tiền giảm hay đơn giá từ Frontend gửi lên), và cấu trúc JSON trả về qua REST API.

### 2.2. Phân biệt ranh giới với ECOM-185
- **ECOM-170 (Task hiện tại)**: Tập trung vào điều kiện giá trị đơn hàng tối thiểu (`minOrderValue`), thời hạn hiệu lực (`startDate` / `endDate` / Timezone) và kết hợp Voucher với Flash Sale + độ chính xác tính giá.
- **ECOM-185 (Task riêng biệt)**: Kiểm thử giới hạn sử dụng theo từng người dùng (`voucher_usages`), giới hạn tổng lượt sử dụng (`usedQuantity / quantity`), tranh chấp đồng thời (`concurrency`) và hoàn lượt khi hủy đơn hàng (`restoreVoucherUsageForOrder`). Các kịch bản thuộc `ECOM-185` đã được giữ nguyên trong `VoucherServiceTest.java`, không mở rộng lấn sang phạm vi báo cáo hoàn thành của `ECOM-170`.

---

## 3. Framework và Môi trường Kiểm thử

| Thành phần | Công nghệ / Phiên bản | Vai trò trong Kiểm thử ECOM-170 |
| :--- | :--- | :--- |
| **Backend Runtime** | Java 21 (JDK 21), Spring Boot 3.x, Gradle 8.7 | Thực thi logic `VoucherServiceImpl`, `OrderServiceImpl` |
| **Backend Unit & Integration Test** | JUnit 5 (Jupiter), Mockito, AssertJ | Kiểm thử đơn vị và kiểm thử tích hợp trực tiếp `OrderServiceImpl` + `VoucherServiceImpl` thật (`VoucherFlashSaleEcom170QATest.java`) |
| **Backend API Test** | Spring `@WebMvcTest`, `MockMvc`, Jackson `ObjectMapper`, Jakarta Bean Validation (`@Valid`) | Kiểm thử tích hợp tầng HTTP REST Controller (`VoucherController`, `AdminVoucherController`, `OrderController`) + `VoucherServiceImpl` + `OrderServiceImpl` + `GlobalExceptionHandler` (`VoucherFlashSaleEcom170ApiQATest.java`) |
| **Frontend Runtime & Build** | Node.js ESM, React 18.3.1, Vite 5.4.21 | Thực thi `voucherService.js`, `Checkout.jsx`, `AdminVouchers.jsx` |
| **Frontend Automated Test** | Node.js Test Runner (`node:test`) + `node:assert/strict` | Kiểm thử thực thi hàm thật `parseLocalDateBoundary`, `getVoucherStatus`, `calcDiscount`, `voucherService.applyCode`, `voucherService.create` và tích hợp `Checkout.jsx` (`ecom170.voucher_flashsale.qa.test.mjs`) |

---

## 4. Danh sách Test Case & Kết quả Thực thi Chi tiết

Tổng số test case tự động đã viết mới cho **ECOM-170**: **45 test methods** (gồm **19 JUnit 5 Service/Integration tests** trong `VoucherFlashSaleEcom170QATest.java`, **8 MockMvc HTTP API tests** trong `VoucherFlashSaleEcom170ApiQATest.java`, và **18 Node.js automated tests** trong `frontend/tests/ecom170.voucher_flashsale.qa.test.mjs`), bao phủ toàn bộ 18 mã kiểm thử bắt buộc `E170-01` → `E170-18` và Nhóm D.

### 4.1. Bảng Ma trận Test Case Bắt buộc (E170-01 → E170-18 & Nhóm D)

| Test ID | Nhóm | Trường hợp kiểm thử | Dữ liệu đầu vào (Input) | Kết quả mong đợi (Expected) | Kết quả thực tế (Actual) | Trạng thái |
| :---: | :---: | :--- | :--- | :--- | :--- | :---: |
| **E170-01** | A | Đơn hàng dưới `500.000đ` | Voucher `GIAM50K` (`minOrderValue = 500.000đ`), `orderTotal = 499.999đ` | Không được áp dụng; Backend trả HTTP `400 Bad Request` / `IllegalStateException`; FE `calcDiscount = 0` | Bị từ chối với thông báo `"Đơn hàng tối thiểu 500000.00đ để sử dụng mã này."`, HTTP `400`, FE `discount = 0` | **PASS** |
| **E170-02** | A | Đơn hàng đúng bằng `500.000đ` (biên dưới) | Voucher `GIAM50K` (`FIXED 50.000đ`, `min = 500.000đ`), `orderTotal = 500.000đ` | Được áp dụng; giảm `50.000đ`, còn `450.000đ`, HTTP `200 OK` | `discountAmount = 50000.00`, `finalAmount = 450000.00`, HTTP `200 OK` | **PASS** |
| **E170-03** | A | Đơn hàng trên `500.000đ` | Voucher `FLASH10` (`PERCENT 10%`, `max = 80.000đ`, `min = 500.000đ`), `orderTotal = 750.000đ` | Được áp dụng; giảm `75.000đ`, còn `675.000đ` | `discountAmount = 75000.00`, `finalAmount = 675000.00` | **PASS** |
| **E170-04** | A | Đơn hàng bằng `0` (kể cả khi `minOrderValue = 0`) | Voucher `FREESHIP0D` (`minOrderValue = 0`), `orderTotal = 0` | Không được áp dụng; từ chối cả ở DTO (`@DecimalMin`), Service và FE | Bị từ chối (`HTTP 400` / `IllegalStateException`: `"Tổng tiền đơn hàng phải lớn hơn 0đ"`), FE `discount = 0` | **PASS** |
| **E170-05** | A | Đơn hàng có giá trị âm không hợp lệ | `orderTotal = -150.000đ` / `-100.000đ` / `NaN` | Backend & Frontend từ chối | Bị từ chối (`HTTP 400 Bad Request`, `IllegalStateException`, FE `applyCode` reject) | **PASS** |
| **E170-06** | A | Giá trị đơn hàng thiếu hoặc `null` | `orderTotal = null` / `undefined` / `""` | Xử lý validation từ chối đúng (`@NotNull` HTTP `400`) | Bị từ chối (`HTTP 400 Bad Request`, message `"Tổng tiền đơn hàng không được để trống"`) | **PASS** |
| **E170-07** | B | Voucher chưa đến thời gian bắt đầu | `today = 2026-11-10`, `startDate = 2026-11-11`, `endDate = 2026-11-20` | Không được áp dụng (`UPCOMING`, HTTP `400`) | Backend trả `"Mã giảm giá chưa đến thời gian áp dụng."` (HTTP `400`), FE trả `UPCOMING` & `discount = 0` | **PASS** |
| **E170-08** | B | Voucher đang trong thời hạn | `today = 2026-11-10`, `startDate = 2026-11-01`, `endDate = 2026-11-30` | Được áp dụng nếu đủ điều kiện (`ACTIVE`) | `status = ACTIVE`, `discountAmount = 50000.00`, `finalAmount = 550000.00` | **PASS** |
| **E170-09** | B | Voucher đã hết hạn | `today = 2026-11-10`, `startDate = 2026-11-01`, `endDate = 2026-11-09` | Không được áp dụng (`EXPIRED`, HTTP `400`) | Backend trả `"Mã giảm giá đã hết hạn."` (HTTP `400`), FE trả `EXPIRED` & `discount = 0` | **PASS** |
| **E170-10** | B | Thời điểm đúng bằng thời gian bắt đầu (biên đầu ngày theo giờ Việt Nam `GMT+7`) | `2026-11-10 00:30:00 GMT+7` (`2026-11-09T17:30:00Z` UTC), `startDate = 2026-11-10` | Được áp dụng đúng biên, không bị lệch 7 tiếng do UTC | `LocalDate.now(clock)` tại `Asia/Ho_Chi_Minh` = `2026-11-10`, FE `parseLocalDateBoundary` = `00:00:00.000` local -> `ACTIVE`, giảm `50.000đ` | **PASS** |
| **E170-11** | B | Thời điểm đúng bằng thời gian kết thúc (biên cuối ngày `23:59:59.999` giờ VN) | `2026-11-10 23:59:59 GMT+7` (`2026-11-10T16:59:59Z` UTC), `endDate = 2026-11-10` | Được áp dụng lúc `23:59:59.999`, chuyển `EXPIRED` đúng lúc `00:00:00.000` ngày hôm sau | Lúc `23:59:59` -> `ACTIVE` (`discount = 50.000đ`); sang `00:00:00` ngày `2026-11-11` -> `EXPIRED` (`discount = 0`) | **PASS** |
| **E170-12** | B | Thời gian bắt đầu lớn hơn thời gian kết thúc (`startDate > endDate`) | `startDate = 2026-11-20`, `endDate = 2026-11-10` | Validation từ chối cấu hình sai ở cả Controller, Service và Frontend | DTO `isValidDateRange() = false` (HTTP `400`), Service `createVoucher`/`updateVoucher` ném `IllegalArgumentException`, FE ném lỗi & đánh dấu `INACTIVE` | **PASS** |
| **E170-13** | C | Sản phẩm Flash Sale + Voucher đủ điều kiện sau giảm Flash Sale | SP Flash Sale: giá gốc `800.000đ`, giá Flash Sale `550.000đ`; Voucher `GIAM50K` (`min = 500.000đ`) | Áp giá Flash Sale trước (`550.000đ`), kiểm tra `550.000đ >= 500.000đ`, trừ tiếp Voucher `50.000đ` -> còn `500.000đ` | `subtotalAmount = 550000.00`, `discountAmount = 50000.00`, `totalAmount = 500000.00`, gọi `reserveFlashSaleStock` & `reserveStock` chuẩn xác | **PASS** |
| **E170-14** | C | Sản phẩm Flash Sale làm tổng tiền sau giảm thấp hơn `minOrderValue` của Voucher | SP có giá gốc `600.000đ` (`>= 500.000đ`) nhưng giá Flash Sale là `400.000đ` (`< 500.000đ`), áp mã `GIAM50K` (`min = 500.000đ`) | Backend & Frontend từ chối vì `subtotalAmount` sau Flash Sale (`400.000đ`) chưa đạt `500.000đ`; không trừ kho | Ném `IllegalStateException("Đơn hàng tối thiểu 500000.00đ...")`, không gọi `reserveFlashSaleStock`, không lưu `Order` | **PASS** |
| **E170-15** | C | Giỏ hàng có cả sản phẩm Flash Sale và sản phẩm thường | Item 1 (Flash Sale: gốc `800k` -> sale `550k`) + Item 2 (Thường: `250k`) = `800.000đ` + Voucher `FLASH10` (`10%`, `max 80k`) | Tính giá Flash Sale cho Item 1, giá thường cho Item 2, tổng `subtotal = 800.000đ`, giảm `80.000đ`, thanh toán `720.000đ` | `subtotalAmount = 800000.00`, `discountAmount = 80000.00`, `totalAmount = 720000.00`, chỉ trừ kho Redis Flash Sale cho Item 1 | **PASS** |
| **E170-16** | C | Áp dụng đồng thời nhiều mã giảm giá hoặc giả mạo giá (`Price Tampering`) | Truyền chuỗi nhiều mã `"GIAM50K,FLASH10"` hoặc gửi `priceAtPurchase = 100.000đ` thấp hơn giá Flash Sale `550.000đ` | Không được giảm trùng; từ chối mã ghép và tự ghi đè lại `priceAtPurchase = 550.000đ` từ DB | Mã ghép bị từ chối (`ResourceNotFoundException`); giá giả mạo `100.000đ` bị ghi đè thành `550.000đ`, tổng cuối = `500.000đ` | **PASS** |
| **E170-17** | C | Giá trị giảm của Voucher vượt tổng tiền hàng | Voucher `MEGA500K` (`FIXED 500.000đ`, `min = 100.000đ`) áp cho đơn hàng `250.000đ` | Không tạo tổng tiền âm; `discountAmount` tối đa bằng `250.000đ`, `finalTotalAmount = 0.00` | `discountAmount = 250000.00`, `finalAmount = 0.00`, `order.totalAmount = 0.00` | **PASS** |
| **E170-18** | C | Thay đổi số lượng sau khi áp Voucher | Tăng SL từ `2 -> 3` hoặc giảm SL từ `2 -> 1` (tụt dưới `minOrderValue`), hoặc tăng SL Flash Sale lên `3` (`> userLimit = 2`) | Tính toán lại chính xác theo SL mới; tự gỡ Voucher trên UI khi tụt dưới `minOrderValue`; chặn Checkout khi vượt `userLimit` Flash Sale | SL=2 -> giảm `50k`; SL=3 -> giảm `75k`; SL=1 (`250k < 500k`) -> tự gỡ `appliedVoucher` ở FE & từ chối ở BE; SL Flash Sale=3 -> chặn bởi `userLimit` | **PASS** |
| **Section D** | D | Kiểm tra làm tròn tiền `HALF_UP`, chống giả mạo giá & cấu trúc JSON API | Voucher `SALE15` (`15%`) với đơn `123.456,70đ` (`18.518,505 -> 18.518,51`); Checkout API `/api/v1/orders/checkout` | Làm tròn chuẩn 2 chữ số thập phân `HALF_UP`; HTTP `201 Created` trả đầy đủ `subtotalAmount`, `voucherCode`, `discountAmount`, `totalAmount` | `discountAmount = 18518.51`, `finalAmount = 104938.19`; API Checkout trả HTTP `201` với số liệu khớp tuyệt đối | **PASS** |

---

## 5. Lệnh Chạy Test

### 5.1. Chạy riêng bộ test ECOM-170 ở Backend
```bash
cd backend
./gradlew :order-service:test --tests "com.ecommerce.order.service.VoucherFlashSaleEcom170QATest" --tests "com.ecommerce.order.controller.VoucherFlashSaleEcom170ApiQATest" --no-daemon --max-workers=2
```

### 5.2. Chạy toàn bộ test suite của Backend
```bash
cd backend
./gradlew test --no-daemon --max-workers=2
```

### 5.3. Chạy riêng bộ test ECOM-170 ở Frontend
```bash
cd frontend
node --experimental-default-type=module --test tests/ecom170.voucher_flashsale.qa.test.mjs
```

### 5.4. Chạy toàn bộ test suite, Lint và Build của Frontend
```bash
cd frontend
npm test
npm run lint
npm run build
```

---

## 6. Tổng hợp Kết quả PASS / FAIL / BLOCKED / NOT RUN

| Bộ kiểm thử (Test Suite) | Tổng số Test | PASS | FAIL | BLOCKED | NOT RUN | Thời gian chạy |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Backend – `VoucherFlashSaleEcom170QATest.java`** (Service & Flash Sale Integration) | 19 | **19** | 0 | 0 | 0 | ~1.8s |
| **Backend – `VoucherFlashSaleEcom170ApiQATest.java`** (MockMvc REST API Integration) | 8 | **8** | 0 | 0 | 0 | ~4.2s |
| **Frontend – `ecom170.voucher_flashsale.qa.test.mjs`** (Node.js Automated QA Test) | 18 | **18** | 0 | 0 | 0 | ~3.9s |
| **Tổng cộng riêng phạm vi ECOM-170** | **45** | **45** | **0** | **0** | **0** | **~9.9s** |
| **Toàn bộ Regression Test Frontend (`npm test`)** | 331 | **331** | 0 | 0 | 0 | ~5.8s |
| **Toàn bộ Regression Test Backend (`./gradlew test`)** | Toàn bộ Suite | **100% PASS** | 0 | 0 | 0 | ~65s |

---

## 7. Kết quả Tính toán Giá và Voucher (Price & Discount Verification)

Qua quá trình khảo sát source code và kiểm thử thực tế trên `OrderServiceImpl`, `VoucherServiceImpl` và `voucherService.js`, quy tắc tính giá kết hợp giữa **Flash Sale** và **Voucher** được xác minh như sau:

1. **Thứ tự ưu tiên tính giá (Price Calculation Pipeline)**:
   - **Bước 1 (Xác định đơn giá thực tế từng sản phẩm)**: Backend gọi `productClient.getProductById(productId)`. Nếu sản phẩm có `activeFlashSale != null` và số lượng mua không vượt `activeFlashSale.getUserLimit()`, đơn giá thực tế được gán bằng `actualPrice = activeFlashSale.getFlashSalePrice()`; ngược lại dùng giá gốc `product.getPrice()`. Mọi đơn giá do Client gửi lên trong `itemReq.priceAtPurchase` đều bị ghi đè bởi `actualPrice`.
   - **Bước 2 (Tính tổng tiền hàng sau Flash Sale – `subtotalAmount`)**:
     $$\text{subtotalAmount} = \sum_{i=1}^{n} (\text{actualPrice}_i \times \text{quantity}_i)$$
   - **Bước 3 (Kiểm tra điều kiện tối thiểu của Voucher – `minOrderValue`)**:
     Backend kiểm tra `subtotalAmount > 0` và `subtotalAmount >= voucher.minOrderValue`. Như vậy, điều kiện đơn hàng tối thiểu được so sánh với **tổng tiền hàng sau khi đã giảm Flash Sale** (không lấy giá gốc trước Flash Sale để lách điều kiện tối thiểu).
   - **Bước 4 (Tính số tiền giảm của Voucher – `discountAmount`)**:
     - Nếu `discountType == FIXED`: $\text{discount} = \text{discountValue}$.
     - Nếu `discountType == PERCENT`:
       $$\text{discount} = \text{round\_half\_up}\left(\frac{\text{subtotalAmount} \times \text{discountValue}}{100}, 2\right)$$
       Nếu có `maxDiscount != null` và $\text{discount} > \text{maxDiscount}$ thì $\text{discount} = \text{maxDiscount}$.
     - Giới hạn không vượt quá tổng tiền đơn hàng:
       $$\text{discountAmount} = \min(\text{discount}, \text{subtotalAmount})$$
   - **Bước 5 (Tính tổng tiền thanh toán cuối cùng – `finalTotalAmount`)**:
     $$\text{finalTotalAmount} = \max(0, \text{subtotalAmount} - \text{discountAmount})$$

2. **Bảng đối chiếu các kịch bản tính toán tiêu biểu đã kiểm thử**:

| Kịch bản | Giá gốc | Giá sau Flash Sale (`subtotalAmount`) | Cấu hình Voucher | Giảm giá Voucher (`discountAmount`) | Tổng thanh toán cuối (`finalTotalAmount`) |
| :--- | ---: | ---: | :--- | ---: | ---: |
| Đơn đúng biên tối thiểu (`E170-02`) | `500.000,00đ` | `500.000,00đ` | `FIXED 50.000đ` (`min 500.000đ`) | `50.000,00đ` | `450.000,00đ` |
| SP Flash Sale + Voucher `FIXED` (`E170-13`) | `800.000,00đ` | `550.000,00đ` | `FIXED 50.000đ` (`min 500.000đ`) | `50.000,00đ` | `500.000,00đ` |
| SP Flash Sale tụt dưới `minOrderValue` (`E170-14`) | `600.000,00đ` | `400.000,00đ` | `FIXED 50.000đ` (`min 500.000đ`) | `0,00đ` *(Từ chối)* | *Chặn đặt hàng (HTTP 400)* |
| Giỏ hỗn hợp Flash Sale + SP thường (`E170-15`) | `1.050.000,00đ` | `800.000,00đ` (`550k + 250k`) | `PERCENT 10%`, `max 80.000đ` (`min 500.000đ`) | `80.000,00đ` | `720.000,00đ` |
| Mệnh giá Voucher vượt tổng đơn (`E170-17`) | `250.000,00đ` | `250.000,00đ` | `FIXED 500.000đ` (`min 100.000đ`) | `250.000,00đ` | `0,00đ` *(Không âm)* |
| Làm tròn lẻ `HALF_UP` (`Section D`) | `123.456,70đ` | `123.456,70đ` | `PERCENT 15%` (`min 100.000đ`) | `18.518,51đ` (`18518.505`) | `104.938,19đ` |

---

## 8. Bug Phát hiện và Cách Khắc phục (Bugs Found & Fixed)

Trong quá trình kiểm thử thực tế cho `ECOM-170`, 4 lỗi nghiệp vụ thuộc đúng phạm vi `ECOM-170` đã được phát hiện và khắc phục triệt để:

### BUG-170-01: Đơn hàng có giá trị bằng `0đ` vẫn áp dụng được Voucher nếu `minOrderValue = 0` (`E170-04`)
- **Test case phát hiện**: `E170-04` (`Đơn hàng bằng 0 -> Không được áp dụng`).
- **Nguyên nhân gốc**:
  - Trong `ApplyVoucherRequest.java`: annotation `@DecimalMin(value = "0.00")` mặc định có `inclusive = true`, cho phép `orderTotal = 0.00` đi qua tầng Controller.
  - Trong `VoucherServiceImpl.calculateAndValidateDiscount`: chỉ kiểm tra `orderTotal.compareTo(voucher.getMinOrderValue()) < 0`. Khi một voucher có `minOrderValue = 0` (giá trị mặc định), đơn hàng `0đ` không bị chặn.
  - Tương tự ở Frontend `voucherService.js`: `calcDiscount` và `applyCode` không chặn `orderTotal <= 0` khi `minOrderValue = 0`.
- **File bị ảnh hưởng**:
  - `backend/order-service/src/main/java/com/ecommerce/order/dto/request/ApplyVoucherRequest.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java`
  - `frontend/src/services/voucherService.js`
- **Cách khắc phục**:
  - Đặt `@DecimalMin(value = "0.00", inclusive = false, message = "Tổng tiền đơn hàng phải lớn hơn 0")` trong `ApplyVoucherRequest.java`.
  - Bổ sung kiểm tra `if (orderTotal == null || orderTotal.compareTo(BigDecimal.ZERO) <= 0)` trong `VoucherServiceImpl.calculateAndValidateDiscount` và trong `voucherService.js` (`calcDiscount`, `applyCode`).

### BUG-170-02: Lệch múi giờ UTC và giờ Việt Nam (`GMT+7`) khi kiểm tra biên `startDate` / `endDate` (`E170-10`, `E170-11`)
- **Test case phát hiện**: `E170-10` và `E170-11` (`Thời điểm đúng bằng thời gian bắt đầu / kết thúc`).
- **Nguyên nhân gốc**:
  - Ở Frontend (`frontend/src/services/voucherService.js`), hàm `getVoucherStatus` sử dụng `new Date(voucher.startDate)` với chuỗi ISO date-only `"YYYY-MM-DD"`. Theo chuẩn ECMAScript, chuỗi `"YYYY-MM-DD"` được parse thành **UTC midnight (`00:00:00Z`)**, tức là **07:00:00 sáng giờ Việt Nam (`GMT+7`)**. Do đó, từ `00:00` đến `06:59:59` sáng ngày bắt đầu tại Việt Nam, `now < start` trả về `true` và voucher bị nhận nhầm là `UPCOMING` (chưa bắt đầu)!
  - Ở Backend (`VoucherServiceImpl.java`), `LocalDate.now()` gọi trực tiếp đồng hồ hệ thống mà không chỉ định múi giờ `Asia/Ho_Chi_Minh` và không hỗ trợ `Clock` injection.
- **File bị ảnh hưởng**:
  - `frontend/src/services/voucherService.js`
  - `frontend/src/pages/customer/Checkout.jsx`
  - `backend/order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java`
- **Cách khắc phục**:
  - Xây dựng hàm `parseLocalDateBoundary(dateInput, isEndOfDay)` trong `voucherService.js` để tách `[year, month, day]` và khởi tạo `new Date(year, month - 1, day, 0, 0, 0, 0)` (đầu ngày) hoặc `new Date(year, month - 1, day, 23, 59, 59, 999)` (cuối ngày) theo đúng giờ địa phương.
  - Bổ sung `Clock` (`Clock.system(ZoneId.of("Asia/Ho_Chi_Minh"))` mặc định kèm `setClock(Clock)`) trong `VoucherServiceImpl.java` và dùng `LocalDate.now(clock)` tại tất cả các điểm kiểm tra ngày hiệu lực.

### BUG-170-03: Thiếu kiểm tra `startDate > endDate` ở tầng Service khi tạo/cập nhật hoặc áp dụng Voucher (`E170-12`)
- **Test case phát hiện**: `E170-12` (`Thời gian bắt đầu lớn hơn thời gian kết thúc -> Validation từ chối cấu hình sai`).
- **Nguyên nhân gốc**:
  - `VoucherRequest.java` có `@AssertTrue isValidDateRange()`, nhưng `VoucherServiceImpl.createVoucher`, `updateVoucher` và `calculateAndValidateDiscount` cũng như `voucherService.create`/`update` ở Frontend chưa kiểm tra `endDate.isBefore(startDate)` nếu được gọi qua tầng Service.
- **File bị ảnh hưởng**:
  - `backend/order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java`
  - `frontend/src/services/voucherService.js`
- **Cách khắc phục**:
  - Bổ sung hàm `validateDateRange(startDate, endDate)` trong `VoucherServiceImpl.createVoucher` và `updateVoucher` (ném `IllegalArgumentException("Ngày kết thúc phải bằng hoặc sau ngày bắt đầu")`), đồng thời chặn cấu hình ngày lỗi trong `calculateAndValidateDiscount` và `voucherService.js`.

### BUG-170-04: Giảm số lượng sản phẩm sau khi đã chọn Voucher làm tổng tiền tụt dưới `minOrderValue` nhưng UI Checkout không tự gỡ Voucher (`E170-18`)
- **Test case phát hiện**: `E170-18` (`Thay đổi số lượng sau khi áp Voucher -> Tính toán lại chính xác`).
- **Nguyên nhân gốc**:
  - Trong `frontend/src/pages/customer/Checkout.jsx`, `useEffect` lắng nghe `[totalPrice]` chỉ tính `newDiscount = calcDiscount(appliedVoucher.voucher, totalPrice)` và cập nhật `discountAmount: 0`, nhưng vẫn giữ `appliedVoucher` ở trạng thái `"✓ Đã áp dụng - Tiết kiệm 0đ"` và gửi `voucherCode` lên Backend khi bấm Đặt hàng, dẫn tới lỗi HTTP 400 lúc Checkout.
- **File bị ảnh hưởng**:
  - `frontend/src/pages/customer/Checkout.jsx`
- **Cách khắc phục**:
  - Cập nhật `useEffect([totalPrice])` và `handleSelectVoucher` trong `Checkout.jsx`: khi `totalPrice <= 0` hoặc `totalPrice < minOrderValue` hoặc `status !== 'ACTIVE'`, tự động gọi `setAppliedVoucher(null)` để gỡ mã không còn đủ điều kiện.

---

## 9. Kiểm thử Hồi quy (Regression Testing)

Sau khi sửa 4 lỗi trên và bổ sung bộ kiểm thử mới cho `ECOM-170`, toàn bộ các test có sẵn của hệ thống đã được chạy lại:
- **Backend Regression**:
  - `VoucherServiceTest` (18/18 PASS – bao gồm CRUD, áp mã, atomic update, chặn dùng trùng và hoàn lượt).
  - `VoucherControllerTest` (12/12 PASS).
  - `OrderServiceTest` & `OrderControllerTest` (100% PASS).
  - `VoucherFlashSaleEcom170QATest` (19/19 PASS).
  - `VoucherFlashSaleEcom170ApiQATest` (8/8 PASS).
- **Frontend Regression**:
  - Toàn bộ 25 file test trong `frontend/tests/*.mjs` đạt **331/331 PASS (0 FAIL)**.
  - Kiểm tra cú pháp và liên kết import (`npm run lint`): **87/87 file nguồn PASS — 0 lỗi**.
  - Kiểm tra đóng gói bản dựng (`npm run build`): **Build thành công (174 modules transformed)**.

---

## 10. Bằng chứng Thực thi (Execution Log Evidence)

### 10.1. Log chạy JUnit 5 & MockMvc cho ECOM-170 ở Backend
```text
> Task :order-service:compileJava UP-TO-DATE
> Task :order-service:processResources UP-TO-DATE
> Task :order-service:classes UP-TO-DATE
> Task :order-service:compileTestJava
> Task :order-service:testClasses
> Task :order-service:test

BUILD SUCCESSFUL in 1m 4s
4 actionable tasks: 2 executed, 2 up-to-date
(27/27 tests completed, 0 failed in VoucherFlashSaleEcom170QATest & VoucherFlashSaleEcom170ApiQATest)
```

### 10.2. Log chạy Node.js Automated Test cho ECOM-170 ở Frontend
```text
TAP version 13
# Subtest: ECOM-170: KIỂM THỬ ĐIỀU KIỆN TỐI THIỂU, THỜI HẠN VOUCHER VÀ KẾT HỢP FLASH SALE
    # Subtest: A. Kiểm tra điều kiện giá trị đơn hàng tối thiểu (minOrderValue = 500.000đ)
        ok 1 - E170-01: Đơn hàng dưới 500.000đ (499.999đ) -> Không được áp dụng (giảm 0đ và ném lỗi khi applyCode)
        ok 2 - E170-02: Đơn hàng đúng bằng 500.000đ -> Được áp dụng thành công
        ok 3 - E170-03: Đơn hàng trên 500.000đ (800.000đ) -> Được áp dụng chính xác
        ok 4 - E170-04: Đơn hàng bằng 0 (kể cả khi minOrderValue = 0) -> Không được áp dụng
        ok 5 - E170-05: Đơn hàng có giá trị âm không hợp lệ (-200.000đ, NaN) -> Bị từ chối
        ok 6 - E170-06: Giá trị đơn hàng thiếu, null, undefined hoặc chuỗi rỗng -> Xử lý validation đúng
        1..6
    ok 1 - A. Kiểm tra điều kiện giá trị đơn hàng tối thiểu (minOrderValue = 500.000đ)
    # Subtest: B. Kiểm tra thời hạn sử dụng Voucher và biên ngày theo múi giờ Local (GMT+7)
        ok 1 - E170-07: Voucher chưa đến thời gian bắt đầu -> Trạng thái UPCOMING, không được áp dụng
        ok 2 - E170-08: Voucher đang trong thời hạn -> Trạng thái ACTIVE, được áp dụng
        ok 3 - E170-09: Voucher đã hết hạn -> Trạng thái EXPIRED, không được áp dụng
        ok 4 - E170-10: Thời điểm đúng bằng 00:00:00.000 ngày bắt đầu (Local Time, không bị lệch 7h UTC) -> ACTIVE và áp dụng được
        ok 5 - E170-11: Thời điểm đúng bằng 23:59:59.999 ngày kết thúc -> ACTIVE, sang 00:00:00.000 ngày kế tiếp -> EXPIRED
        ok 6 - E170-12: Thời gian bắt đầu lớn hơn thời gian kết thúc (startDate > endDate) -> Từ chối cấu hình sai
        1..6
    ok 2 - B. Kiểm tra thời hạn sử dụng Voucher và biên ngày theo múi giờ Local (GMT+7)
    # Subtest: C & D. Kiểm tra kết hợp Voucher với Flash Sale và độ chính xác tính giá
        ok 1 - E170-13: Sản phẩm Flash Sale đủ điều kiện đơn tối thiểu sau giảm Flash Sale -> Áp dụng đúng quy tắc
        ok 2 - E170-14: Sản phẩm Flash Sale làm tổng tiền sau Flash Sale (400.000đ) thấp hơn minOrderValue (500.000đ) -> Từ chối áp Voucher
        ok 3 - E170-15: Giỏ hàng hỗn hợp có sản phẩm Flash Sale và sản phẩm thường -> Tính giảm giá đúng phạm vi
        ok 4 - E170-16: Chỉ cho phép 1 Voucher duy nhất trên mỗi đơn hàng, chọn mã mới tự động thay thế mã cũ
        ok 5 - E170-17: Giá trị giảm của Voucher vượt tổng tiền hàng -> Không tạo tổng tiền âm (finalTotal = 0)
        ok 6 - E170-18: Thay đổi số lượng sau khi áp Voucher -> Tự động tính lại tiền giảm và tự gỡ Voucher nếu tụt dưới minOrderValue
        1..6
    ok 3 - C & D. Kiểm tra kết hợp Voucher với Flash Sale và độ chính xác tính giá
    1..3
ok 1 - ECOM-170: KIỂM THỬ ĐIỀU KIỆN TỐI THIỂU, THỜI HẠN VOUCHER VÀ KẾT HỢP FLASH SALE
# tests 18
# suites 4
# pass 18
# fail 0
```

### 10.3. Log chạy Full Frontend Test Suite, Lint và Build
```text
# tests 331
# suites 17
# pass 331
# fail 0

[LINT PASS] Đã kiểm tra 87 file nguồn trong src/ — 0 lỗi cú pháp/import.

vite v5.4.21 building for production...
✓ 174 modules transformed.
✓ built in 4.84s
```

---

## 11. Kết luận và Phần còn tồn tại

### 11.1. Kết luận
- Toàn bộ **18/18 kịch bản bắt buộc (`E170-01` → `E170-18`)** và các kiểm tra tính chính xác số học của **Nhóm D** đã được tự động hóa bằng **45 test methods** (Backend JUnit 5 + MockMvc và Frontend `node:test`) và đạt kết quả **100% PASS (45/45 PASS)**.
- 4 lỗi biên về đơn hàng `0đ`, lệch múi giờ UTC/GMT+7, kiểm tra `startDate > endDate` ở tầng Service và tự động gỡ Voucher khi giảm số lượng dưới `minOrderValue` đã được khắc phục kèm regression test đầy đủ.
- Task **ECOM-170** đáp ứng toàn bộ Acceptance Criteria.

### 11.2. Phần còn tồn tại / Lưu ý ngoài phạm vi
- Hiện tại schema bảng `vouchers` và entity `Voucher` chưa có cờ cấu hình riêng để tắt/bật kết hợp Flash Sale theo từng mã (`allowFlashSaleCombination`); theo thiết kế hiện hành của hệ thống, mọi Voucher đang `ACTIVE` đều được phép kết hợp trên tổng tiền hàng sau giảm Flash Sale (`subtotalAmount`) miễn là `subtotalAmount >= minOrderValue`.
- Kiểm thử E2E trên trình duyệt thật (Playwright) với toàn bộ cụm Docker микро-services (`MySQL + Redis + Kafka + Eureka + API Gateway + Product Service + Order Service`) không chạy trực tiếp trong phiên unit/slice test cục bộ này; thay vào đó, luồng tích hợp giữa Controller, `OrderServiceImpl` và `VoucherServiceImpl` đã được kiểm thử thông qua `@WebMvcTest` (`MockMvc`) và JUnit 5 Integration Test.
- Các kịch bản giới hạn lượt dùng theo từng user, giới hạn tổng lượt dùng khi tải đồng thời (`concurrency`) và hoàn lượt khi hủy đơn thuộc phạm vi task **ECOM-185**.
