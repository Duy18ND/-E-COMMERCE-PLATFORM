# BÁO CÁO KIỂM THỬ CHẤT LƯỢNG (QA REPORT) — ECOM-183

- **Task ID:** `ECOM-183` (Row 168 trên Scrum Board / `Base Project 20_10.xlsx`)
- **Tên Task:** `[BE] Xử lý đồng thời voucher: giữ lượt, hoàn lượt khi hủy hoặc lỗi thanh toán`
- **Mục mẹ (Parent Story):** `[BE] Voucher & mã giảm` (`ECOM-331`) $\rightarrow$ `Voucher & mã giảm giá`
- **Người phụ trách (PIC):** Đoàn Mạnh Duy - 28/07/2006
- **Nhánh (Branch):** `BE-Duy`
- **Trạng thái:** **SẴN SÀNG CHUYỂN SANG DONE**

---

## 1. MỤC TIÊU & PHẠM VI NGHIỆP VỤ (ECOM-183)

1. **Xử lý đồng thời (Concurrency / Race Condition):**
   - Khi nhiều người dùng cùng áp dụng 1 mã voucher có số lượng giới hạn tại cùng một thời điểm (ví dụ: còn 1 lượt cuối cùng nhưng có 2 hay nhiều giao dịch checkout đồng thời).
   - Sử dụng câu lệnh UPDATE nguyên tử trực tiếp dưới DB (`incrementUsedQuantityAtomically`) kèm điều kiện `usedQuantity < quantity AND status = 'ACTIVE' AND startDate <= today <= endDate`.
   - Đảm bảo tuyệt đối không bị vượt số lượng phát hành (`overselling` / `over-redemption`).

2. **Giữ lượt sử dụng (Hold / Redeem Voucher):**
   - Tại thời điểm tạo đơn hàng (`OrderServiceImpl.checkout`):
     - Kiểm tra tài khoản chưa từng dùng voucher (`validateUserCanUseVoucher` qua `voucher_usages`).
     - Tăng lượt sử dụng nguyên tử (`redeemVoucherForOrder`).
     - Ghi nhận bản ghi vào bảng `voucher_usages` với trạng thái `APPLIED`.

3. **Hoàn lượt sử dụng khi đơn hàng bị hủy hoặc lỗi thanh toán (Rollback / Restore):**
   - **Khi khách hàng hủy đơn hàng (`cancelOrder` / `cancelPendingOrderAndRestoreStock`):**
     - Giảm `usedQuantity` đi 1 (`decrementUsedQuantityByCode` nếu `usedQuantity > 0`).
     - Đổi trạng thái bản ghi `voucher_usages` tương ứng sang `RESTORED` (`restoreVoucherUsageForOrder`), cho phép khách hàng áp dụng lại mã này ở đơn sau.
   - **Khi thanh toán thất bại (Saga rollback qua `handlePaymentFailed`):**
     - Nhận sự kiện Kafka từ `payment-service` $\rightarrow$ hoàn lượt voucher và chuyển bản ghi sang `RESTORED`.
   - **Khi Admin đổi trạng thái đơn sang `CANCELLED` (`updateOrderStatus`):**
     - Tự động hoàn lại lượt voucher và mở khóa trạng thái `RESTORED`.

---

## 2. CÁC FILE LIÊN QUAN CHÍNH

- **Entity & Schema:**
  - [`backend/docker/mysql/init.sql`](file:///d:/BAITAP/Project_Team/-E-COMMERCE-PLATFORM/backend/docker/mysql/init.sql): Bảng `vouchers` và `voucher_usages` (`status` ENUM `'APPLIED'`, `'RESTORED'`).
  - [`backend/order-service/src/main/java/com/ecommerce/order/entity/Voucher.java`](file:///d:/BAITAP/Project_Team/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/entity/Voucher.java)
  - [`backend/order-service/src/main/java/com/ecommerce/order/entity/VoucherUsage.java`](file:///d:/BAITAP/Project_Team/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/entity/VoucherUsage.java)
- **Repository:**
  - [`backend/order-service/src/main/java/com/ecommerce/order/repository/VoucherRepository.java`](file:///d:/BAITAP/Project_Team/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/repository/VoucherRepository.java): Query `incrementUsedQuantityAtomically` & `decrementUsedQuantityByCode`.
  - [`backend/order-service/src/main/java/com/ecommerce/order/repository/VoucherUsageRepository.java`](file:///d:/BAITAP/Project_Team/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/repository/VoucherUsageRepository.java): Tra cứu & cập nhật bản ghi sử dụng theo `orderId` và `userId`.
- **Service:**
  - [`backend/order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java`](file:///d:/BAITAP/Project_Team/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java): `redeemVoucherForOrder`, `restoreVoucherUsage`, `restoreVoucherUsageForOrder`, `recordVoucherUsage`.
  - [`backend/order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java`](file:///d:/BAITAP/Project_Team/-E-COMMERCE-PLATFORM/backend/order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java): Tích hợp giữ lượt lúc `checkout`, hoàn lượt lúc `cancelPendingOrderAndRestoreStock`, `handlePaymentFailed`, và `updateOrderStatus(CANCELLED)`.
- **Test Suites:**
  - [`backend/order-service/src/test/java/com/ecommerce/order/service/VoucherServiceTest.java`](file:///d:/BAITAP/Project_Team/-E-COMMERCE-PLATFORM/backend/order-service/src/test/java/com/ecommerce/order/service/VoucherServiceTest.java): Test concurrency đa luồng (`redeemVoucherForOrder_TwoUsersCompetingForLastSlot_OnlyOneSucceeds`) & hoàn lượt (`restoreVoucherUsageForOrder_TransitionsToRestoredAndAllowsReuse`).
  - [`backend/order-service/src/test/java/com/ecommerce/order/service/OrderServiceTest.java`](file:///d:/BAITAP/Project_Team/-E-COMMERCE-PLATFORM/backend/order-service/src/test/java/com/ecommerce/order/service/OrderServiceTest.java): Test tích hợp Checkout, Hủy đơn, Payment Failed, và Admin Cancelled.
  - [`frontend/tests/ecom183.voucher_concurrency_be.qa.test.mjs`](file:///d:/BAITAP/Project_Team/-E-COMMERCE-PLATFORM/frontend/tests/ecom183.voucher_concurrency_be.qa.test.mjs): Bộ 11 test case QA tự động.

---

## 3. KẾT QUẢ KIỂM THỬ CHI TIẾT (TEST CASES)

| Test ID | Kịch bản kiểm thử | Kỳ vọng (Expected Result) | Thực tế (Actual Result) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **TC-183-01** | Query `incrementUsedQuantityAtomically` trong `VoucherRepository` | Có `@Modifying`, câu lệnh UPDATE nguyên tử `usedQuantity = usedQuantity + 1`, chặn `usedQuantity < quantity`. | Khớp 100%. | **PASS** |
| **TC-183-02** | Query `decrementUsedQuantityByCode` trong `VoucherRepository` | Giảm `usedQuantity = usedQuantity - 1` khi `usedQuantity > 0` chống số âm. | Khớp 100%. | **PASS** |
| **TC-183-03** | Khả năng truy vấn trạng thái `VoucherUsage` | Tìm kiếm bản ghi theo `voucherCode`, `orderId`, `status = APPLIED` để hoàn lượt. | Khớp 100%. | **PASS** |
| **TC-183-04** | Atomic increment trong `VoucherServiceImpl.redeemVoucherForOrder` | Gọi `incrementUsedQuantityAtomically`, nếu trả về `0` (hết lượt) thì ném `IllegalStateException`. | Khớp 100%. | **PASS** |
| **TC-183-05** | Chuyển trạng thái `RESTORED` trong `restoreVoucherUsageForOrder` | Chuyển bản ghi sang `RESTORED`, lưu DB và gọi `decrementUsedQuantityByCode`. | Khớp 100%. | **PASS** |
| **TC-183-06** | Checkout giữ lượt & ghi nhận `voucher_usages` | Kiểm tra `validateUserCanUseVoucher`, giữ lượt nguyên tử, lưu `VoucherUsage` (`APPLIED`). | Khớp 100%. | **PASS** |
| **TC-183-07** | Hủy đơn PENDING hoàn lại lượt voucher | Gọi cả `restoreVoucherUsage` và `restoreVoucherUsageForOrder`. | Khớp 100%. | **PASS** |
| **TC-183-08** | Thanh toán thất bại (Saga rollback) hoàn lại lượt voucher | Gọi `restoreVoucherUsage` và `restoreVoucherUsageForOrder` khi nhận sự kiện `payment-failed`. | Khớp 100%. | **PASS** |
| **TC-183-09** | Admin chuyển trạng thái sang CANCELLED hoàn lại voucher | Tự động hoàn lại số lượt và đổi trạng thái `voucher_usages` sang `RESTORED`. | Khớp 100%. | **PASS** |
| **TC-183-10** | **Kiểm thử Concurrency đa luồng (2 threads tranh 1 slot cuối cùng)** | Sử dụng `ExecutorService`, `CountDownLatch`, chỉ duy nhất 1 thread thành công, 1 thread bị từ chối với lỗi hết lượt. | Đã kiểm chứng trong `VoucherServiceTest`. | **PASS** |
| **TC-183-11** | Kiểm thử tích hợp `OrderServiceTest` với Voucher | Xác minh toàn bộ luồng Checkout, CancelOrder, PaymentFailed và Admin Cancelled. | Đã kiểm chứng trong `OrderServiceTest`. | **PASS** |

---

## 4. TỔNG KẾT & KẾT LUẬN

- **Node.js QA Contract Test Suite (`ecom183.voucher_concurrency_be.qa.test.mjs`):** **11 / 11 PASS** (100%).
- **JUnit 5 Unit & Concurrency Test Suites:** PASS 100%.
- **Đánh giá:** Task **`ECOM-183`** đã được triển khai hoàn chỉnh, an toàn đồng thời, phòng chống race condition và hỗ trợ rollback toàn diện khi hủy đơn hoặc lỗi thanh toán.
- **Khuyến nghị:** **ĐỦ ĐIỀU KIỆN 100% ĐỂ CHUYỂN TRẠNG THÁI SANG DONE TRÊN BẢNG CÔNG VIỆC.**

