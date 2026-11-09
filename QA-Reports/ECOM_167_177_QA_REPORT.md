# BÁO CÁO KIỂM THỬ CHẤT LƯỢNG (QA REPORT) — ECOM-167 & ECOM-177

- **Người thực hiện:** Đoàn Mạnh Duy - 28/07/2006
- **Nhánh (Branch):** `BE-Duy`
- **Phạm vi Task (`Status: DONE`):**
  1. **`ECOM-167` (`[BE] Voucher & mã giảm`):** `[BE] API lấy voucher hợp lệ, áp mã, chặn dùng trùng và quá lượt`
  2. **`ECOM-177` (`[BE] Đánh giá sau mua`):** `[BE] API tạo, sửa đánh giá, lấy danh sách đánh giá sản phẩm`

---

## 1. PROJECT OVERVIEW & PHẠM VI MODULE

| Mã Task | Tên Task | Microservice | Các File Liên Quan |
| :--- | :--- | :--- | :--- |
| **`ECOM-167`** | `[BE] API lấy voucher hợp lệ, áp mã, chặn dùng trùng và quá lượt` | `order-service` (`:8083`) | `VoucherController.java`, `VoucherService.java`, `VoucherServiceImpl.java`, `OrderServiceImpl.java`, `VoucherRepository.java`, `VoucherUsageRepository.java`, `Voucher.java`, `VoucherUsage.java`, `VoucherUsageStatus.java`, `ApplyVoucherRequest.java`, `init.sql` |
| **`ECOM-177`** | `[BE] API tạo, sửa đánh giá, lấy danh sách đánh giá sản phẩm` | `product-service` (`:8082`) | `ReviewController.java`, `AdminReviewController.java`, `ReviewService.java`, `ReviewServiceImpl.java`, `ReviewRepository.java`, `OrderPurchaseVerificationClient.java`, `Review.java`, `GlobalExceptionHandler.java`, `init.sql` |

---

## 2. KẾT QUẢ KIỂM THỬ CHI TIẾT (TEST CASES)

### A. `ECOM-167` — API lấy voucher hợp lệ, áp mã, chặn dùng trùng và quá lượt

| Test ID | Kịch bản kiểm thử | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-167-01** | `GET /api/v1/vouchers/active` lấy danh sách voucher đang hiệu lực | HTTP `200 OK`, chỉ trả về voucher `ACTIVE`, trong hạn (`startDate <= today <= endDate`), `usedQuantity < quantity`. | Hoạt động đúng. | **PASS** |
| **TC-167-02** | `GET /api/v1/vouchers` & `GET /api/v1/vouchers/active` kèm `X-User-Id` hoặc `?userId=` | Lọc bỏ các mã voucher mà user đó đã sử dụng (`VoucherUsageStatus.APPLIED`). | Hoạt động đúng. | **PASS** |
| **TC-167-03** | `POST /api/v1/vouchers/apply` với loại `PERCENT` có giới hạn `maxDiscount` | Tính đúng số tiền giảm theo `%`, cắt trần tại `maxDiscount`. | Hoạt động đúng. | **PASS** |
| **TC-167-04** | `POST /api/v1/vouchers/apply` với loại `FIXED` | Tính đúng số tiền giảm cố định, không vượt quá `orderTotal`. | Hoạt động đúng. | **PASS** |
| **TC-167-05** | Chặn voucher không tồn tại, `INACTIVE`, chưa bắt đầu hoặc đã hết hạn | HTTP `400 Bad Request` kèm `errorCode` chuẩn (`INVALID_VOUCHER`, `VOUCHER_INACTIVE`, `VOUCHER_NOT_STARTED`, `VOUCHER_EXPIRED`). | Hoạt động đúng. | **PASS** |
| **TC-167-06** | Chặn đơn hàng chưa đạt giá trị tối thiểu (`orderTotal < minOrderValue`) | HTTP `400 Bad Request` (`MIN_ORDER_NOT_MET`). | Hoạt động đúng. | **PASS** |
| **TC-167-07** | Chặn voucher hết lượt sử dụng (`usedQuantity >= quantity`) | HTTP `400 Bad Request` (`VOUCHER_USAGE_LIMIT_REACHED`). | Hoạt động đúng. | **PASS** |
| **TC-167-08** | Chặn dùng trùng mã voucher trên cùng một tài khoản (`userId`) | HTTP `400 Bad Request` (`VOUCHER_ALREADY_USED`). | Hoạt động đúng ở cả `/apply` và bước tạo đơn (`redeemVoucherForOrder`). | **PASS** |
| **TC-167-09** | Hoàn lại lượt dùng voucher khi hủy đơn hàng hoặc thanh toán thất bại | Giảm `usedQuantity` và chuyển trạng thái `voucher_usages` sang `RESTORED`. | Hoạt động đúng. | **PASS** |
| **TC-167-10** | Bảo mật chống giả mạo `userId` trong body `POST /api/v1/vouchers/apply` (`BUG-167-01` đã vá) | Luôn ưu tiên ghi đè `request.setUserId(userId)` từ header `X-User-Id`. | Đã xác nhận qua `VoucherControllerTest`. | **PASS** |

---

### B. `ECOM-177` — API tạo, sửa đánh giá, lấy danh sách đánh giá sản phẩm

| Test ID | Kịch bản kiểm thử | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-177-01** | `GET /api/v1/products/{productId}/reviews` lấy danh sách đánh giá có phân trang | HTTP `200 OK`, chỉ trả về review `APPROVED`, kèm `averageRating` và `totalReviews`. | Hoạt động đúng. | **PASS** |
| **TC-177-02** | `GET /api/v1/products/{productId}/reviews` khi sản phẩm chưa có đánh giá | HTTP `200 OK`, `averageRating = 0.0`, `totalReviews = 0`, `reviews = []`. | Hoạt động đúng. | **PASS** |
| **TC-177-03** | `GET /api/v1/products/{productId}/reviews/me` lấy đánh giá của chính mình | HTTP `200 OK` (hoặc `404 Not Found` nếu chưa đánh giá). | Hoạt động đúng. | **PASS** |
| **TC-177-04** | `POST /api/v1/products/{productId}/reviews` sau khi đã mua và nhận hàng | HTTP `201 Created`, tự động `trim()` nội dung `comment`. | Hoạt động đúng. | **PASS** |
| **TC-177-05** | Chặn tạo đánh giá khi chưa mua hàng hoặc đơn chưa hoàn tất | HTTP `403 Forbidden`. | Hoạt động đúng. | **PASS** |
| **TC-177-06** | Chặn đánh giá trùng sản phẩm (`1 user - 1 review / sản phẩm`) | HTTP `409 Conflict`. | Hoạt động đúng. | **PASS** |
| **TC-177-07** | `PUT /api/v1/products/{productId}/reviews/{reviewId}` sửa đánh giá của chính mình & chặn IDOR | Chính chủ: HTTP `200 OK`; khác chủ: HTTP `403 Forbidden`. | Hoạt động đúng. | **PASS** |
| **TC-177-08** | `DELETE /api/v1/products/{productId}/reviews/{reviewId}` xóa đánh giá | Chính chủ hoặc `ROLE_ADMIN`: HTTP `200 OK`; khác chủ: HTTP `403 Forbidden`. | Hoạt động đúng. | **PASS** |
| **TC-177-09** | Kiểm tra dữ liệu đầu vào bất thường (`rating` ngoài `1..5`, `page < 0`, `size <= 0`, JSON lỗi) | HTTP `400 Bad Request`. | Hoạt động đúng. | **PASS** |

---

## 3. TỔNG KẾT CHẤT LƯỢNG

| Hạng mục | Tổng số | Passed | Failed | Blocked |
|---|---:|---:|---:|---:|
| **Voucher Unit & Controller Tests (`ECOM-167`)** | 35 | 35 | 0 | 0 |
| **Review Unit & Controller Tests (`ECOM-177`)** | 37 | 37 | 0 | 0 |
| **Full Backend Regression (`order`, `product`, `auth`, `gateway`)** | 435 | 435 | 0 | 0 |
| **Node.js Backend Contract QA Suite** | 75 | 75 | 0 | 0 |

