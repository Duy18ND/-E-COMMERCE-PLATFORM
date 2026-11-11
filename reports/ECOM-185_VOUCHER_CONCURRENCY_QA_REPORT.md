# BÁO CÁO KIỂM THỬ CHẤT LƯỢNG (QA REPORT) – TASK ECOM-185

---

## 1. Thông tin task

| Hạng mục | Chi tiết |
|---|---|
| **Dự án** | ShopMart E-Commerce Platform (`C:\IT209\-E-COMMERCE-PLATFORM`) |
| **Git Branch** | `devops-phuong` |
| **Task ID** | `ECOM-185` |
| **Task Name** | `[QA] Kiểm thử Voucher – giới hạn lượt sử dụng, concurrency và đơn hàng bị hủy` |
| **Sprint** | Sprint 3 |
| **Parent Epic** | `ECOM-332` – QA Voucher & mã giảm giá |
| **PIC** | Ngô Phương |
| **Vai trò** | QA Engineer |
| **Ngày thực hiện** | 10/11/2026 |
| **Trạng thái** | **HOÀN THÀNH (100% PASS – 29/29 Automated Tests mới cho ECOM-185)** |

---

## 2. Mục tiêu kiểm thử

Thực hiện kiểm thử tự động thực tế (Integration Test với H2 Database thật, Multi-thread Concurrency với `ExecutorService` + `CountDownLatch`, MockMvc API Test và Frontend Node Test Runner) cho 6 mục tiêu cốt lõi:

1. **Giới hạn tổng số lượt sử dụng Voucher (`quantity` / `usedQuantity`):** Kiểm tra khi chưa dùng, còn 1 lượt cuối, đã chạm trần và khi không có cờ không giới hạn.
2. **Giới hạn số lượt sử dụng theo từng người dùng (`voucher_usages`):** Đảm bảo mỗi `userId` chỉ có tối đa 1 bản ghi `status = APPLIED` trên mỗi mã Voucher tại một thời điểm, đồng thời xác thực danh tính từ header `X-User-Id` của Backend/Gateway.
3. **Nhiều người dùng áp dụng Voucher đồng thời (Multi-user Concurrency):** Tranh chấp lượt cuối cùng và tranh chấp khi số lượng request vượt quá số lượt còn lại.
4. **Một người dùng gửi nhiều yêu cầu áp dụng Voucher đồng thời (Same-user Concurrency):** Chặn TOCTOU race condition khi cùng 1 `userId` bắn nhiều request đặt hàng song song.
5. **Xử lý hoàn lượt sử dụng Voucher khi đơn hàng bị hủy (`Order Cancellation & Saga Rollback`):** Kiểm tra hoàn lượt khi khách hủy đơn `PENDING`, khi thanh toán thất bại (`handlePaymentFailed`), khi Admin hủy đơn (`updateOrderStatus(CANCELLED)`), chống hoàn lượt lặp khi hủy nhiều lần liên tiếp hoặc đồng thời, và rollback khi quá trình hủy gặp lỗi giữa chừng.
6. **Đảm bảo tính toàn vẹn dữ liệu trong Database:** `usedQuantity <= quantity`, số bản ghi `VoucherUsage(APPLIED)` khớp chính xác với `usedQuantity` và số đơn hàng hợp lệ, không xảy ra lost update hoặc dữ liệu mồ côi.

---

## 3. Phạm vi source code đã khảo sát

- **Tài liệu quản lý dự án:**
  - `docs/SCRUM_BOARD.md`
  - `docs/SPRINT_3_MASTER_PLAN.md`
- **Database Schema & Migration:**
  - `docker/postgres/init.sql` (Bảng `vouchers` và `voucher_usages`)
- **Backend (`order-service` & `api-gateway`):**
  - `backend/order-service/src/main/java/com/ecommerce/order/entity/Voucher.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/entity/VoucherUsage.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/enums/VoucherStatus.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/enums/VoucherUsageStatus.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/repository/VoucherRepository.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/repository/VoucherUsageRepository.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/service/VoucherService.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/controller/VoucherController.java`
  - `backend/order-service/src/main/java/com/ecommerce/order/controller/OrderController.java`
  - `backend/api-gateway/src/main/java/com/ecommerce/gateway/filter/AuthenticationFilter.java`
- **Frontend (`frontend`):**
  - `frontend/src/services/voucherService.js`
  - `frontend/src/services/api.js`
  - `frontend/src/pages/customer/Checkout.jsx`

---

## 4. Quy tắc nghiệp vụ Voucher và Order hiện tại

1. **Tên trường giới hạn tổng lượt sử dụng:**
   - Trong entity `Voucher` (bảng `vouchers`):
     - `quantity` (`INTEGER NOT NULL`, `@Min(1)`): Tổng số lượt phát hành tối đa của Voucher.
     - `usedQuantity` (`INTEGER NOT NULL DEFAULT 0`, cột DB `used_quantity`): Số lượt đã được sử dụng hiện tại.
     - Ràng buộc DB: `CONSTRAINT chk_vouchers_quantity CHECK (quantity >= 0 AND used_quantity >= 0 AND used_quantity <= quantity)`.
   - Hệ thống **không** có cờ `unlimited` riêng; mọi Voucher đều bắt buộc `quantity >= 1`. Các chiến dịch lớn sử dụng cấu hình `quantity` trần cao (ví dụ `1.000.000`).
2. **Giới hạn lượt sử dụng theo người dùng:**
   - Hệ thống không lưu cột `usagePerUser` động trên bảng `vouchers` mà áp dụng quy tắc cố định **mỗi người dùng (`userId`) tối đa 1 lượt đang có hiệu lực (`status = APPLIED`) trên mỗi mã Voucher**, được theo dõi qua bảng `voucher_usages` (`id`, `voucher_id`, `voucher_code`, `user_id`, `order_id`, `discount_amount`, `status`, `used_at`).
3. **Thời điểm ghi nhận lượt sử dụng:**
   - `POST /api/v1/vouchers/apply` (`VoucherServiceImpl.applyVoucher`) là bước **kiểm tra điều kiện & tính thử (`readOnly = true`)**: kiểm tra trạng thái, thời hạn, `minOrderValue`, `usedQuantity < quantity`, và kiểm tra người dùng chưa có bản ghi `APPLIED` (`validateUserNotAlreadyUsed`), **chưa trừ lượt**.
   - `POST /api/v1/orders/checkout` và `POST /api/v1/orders/from-cart` (`OrderServiceImpl.checkout`) là bước **ghi nhận lượt sử dụng thực tế** trong cùng `@Transactional(rollbackFor = Exception.class)`:
     1. Kiểm tra và giữ khóa theo cặp `(voucherCode, userId)` (`validateUserCanUseVoucher`).
     2. Tăng nguyên tử `usedQuantity = usedQuantity + 1` bằng câu lệnh SQL có điều kiện `WHERE v.id = :id AND v.status = 'ACTIVE' AND v.startDate <= :today AND v.endDate >= :today AND v.usedQuantity < v.quantity` (`incrementUsedQuantityAtomically`).
     3. Trừ tồn kho sản phẩm (`productClient.reserveStock`).
     4. Lưu `Order` (`status = PENDING`).
     5. Lưu bản ghi `VoucherUsage` với `status = VoucherUsageStatus.APPLIED` gắn với `userId` và `orderId` (`recordVoucherUsage`).
4. **Quy tắc hoàn lại lượt sử dụng khi đơn hàng bị hủy:**
   - Khi đơn hàng có `voucherCode != null` bị hủy ở một trong 3 luồng hợp lệ:
     - Khách hàng hủy đơn đang ở trạng thái `PENDING` (`cancelOrder`).
     - Thanh toán thất bại qua Saga event (`handlePaymentFailed` -> chuyển đơn sang `FAILED`).
     - Admin chuyển trạng thái đơn hàng sang `CANCELLED` theo State Machine (`updateOrderStatus`).
   - Hệ thống thực hiện trong cùng transaction sau khi `productClient.restoreStock` thành công:
     - Giảm nguyên tử `usedQuantity = usedQuantity - 1` với điều kiện `usedQuantity > 0` (`decrementUsedQuantityByCode`).
     - Chuyển bản ghi `VoucherUsage` của đúng `orderId` đó từ `APPLIED` sang `RESTORED` (`restoreVoucherUsageForOrder`), cho phép người dùng tái sử dụng lại mã giảm giá ở đơn hàng mới.

---

## 5. Bảng test case E185-01 đến E185-18

| Test ID | Nhóm | Trường hợp kiểm thử | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|---|
| **E185-01** | Nhóm A (Tổng lượt) | Voucher chưa được sử dụng (`usedQuantity = 0/5`) | Được sử dụng, `usedQuantity` tăng lên `1`, lưu `VoucherUsage(APPLIED)` | **PASS** |
| **E185-02** | Nhóm A (Tổng lượt) | Voucher còn 1 lượt cuối (`usedQuantity = 4/5`) | Yêu cầu hợp lệ cuối cùng được chấp nhận (`usedQuantity = 5/5`) | **PASS** |
| **E185-03** | Nhóm A (Tổng lượt) | Voucher đã đạt giới hạn tổng (`usedQuantity = 5/5`) | Từ chối ở cả `applyVoucher` và `checkout`, Frontend báo `SOLD_OUT` | **PASS** |
| **E185-04** | Nhóm A / C | Hai yêu cầu đồng thời cùng tranh lượt sử dụng cuối (`4/5`) | Đúng 1 thành công, 1 bị từ chối; DB `usedQuantity == 5` | **PASS** |
| **E185-05** | Nhóm A / C | 12 request đồng thời tranh Voucher chỉ có `quantity = 3` (`0/3`) | Đúng 3 thành công, 9 bị chặn; DB `usedQuantity == 3`, `APPLIED == 3` | **PASS** |
| **E185-06** | Nhóm A (Tổng lượt) | Chính sách cấu hình giới hạn tổng (`quantity` null/0 vs trần lớn) | Từ chối `quantity <= 0` hoặc `null`; chấp nhận hạn mức trần lớn (`1.000.000`) | **PASS** |
| **E185-07** | Nhóm B (Theo User) | User chưa sử dụng Voucher (`userId = 501`) | Được áp dụng ở cả `applyVoucher` và `checkout`, lưu `APPLIED` | **PASS** |
| **E185-08** | Nhóm B (Theo User) | User đã sử dụng đủ giới hạn cá nhân (`userId = 502` có `APPLIED`) | Bị từ chối (`"Bạn đã sử dụng mã giảm giá này rồi."`) và ẩn khỏi danh sách khả dụng | **PASS** |
| **E185-09** | Nhóm B (Theo User) | User khác (`userId = 602`) chưa sử dụng Voucher khi còn lượt | Được sử dụng bình thường, ghi nhận bản ghi riêng cho `userId = 602` | **PASS** |
| **E185-10** | Nhóm B / C | Cùng 1 User (`userId = 777`) gửi 8 request đặt hàng đồng thời | Đúng 1 request thành công, 7 request bị chặn; DB chỉ có 1 `APPLIED` | **PASS** |
| **E185-11** | Nhóm B (Bảo mật) | User gửi token giả mạo (`Authorization: Bearer ...` không có `X-User-Id`) hoặc `X-User-Id <= 0` | Backend từ chối `HTTP 403 Forbidden`, không trừ lượt sử dụng | **PASS** |
| **E185-12** | Nhóm B (Bảo mật) | User cố mạo danh `userId` người khác trong body hoặc hủy đơn người khác (IDOR) | Backend ghi đè theo `X-User-Id` xác thực và từ chối (`400` / `403`) | **PASS** |
| **E185-13** | Nhóm D (Hủy đơn) | Đơn hàng `PENDING` bị khách hủy (`cancelOrder`) | `usedQuantity` giảm `1 -> 0`, `VoucherUsage` -> `RESTORED`, user dùng lại được mã | **PASS** |
| **E185-14** | Nhóm D (Hủy đơn) | Đơn bị hủy sau khi ghi nhận lượt (Saga `handlePaymentFailed` & Admin `CANCELLED`) | Cả 2 luồng đều hoàn `usedQuantity` (`-1`) và chuyển `VoucherUsage` sang `RESTORED` | **PASS** |
| **E185-15** | Nhóm D (Hủy đơn) | Hủy cùng một đơn hàng nhiều lần liên tiếp | Lần 2+ ném `IllegalStateException`, chỉ hoàn lượt đúng 1 lần duy nhất | **PASS** |
| **E185-16** | Nhóm D / C | 4 luồng đồng thời cùng hủy 1 đơn hàng `PENDING` | Đúng 1 luồng thành công, 3 luồng bị từ chối; `usedQuantity` và kho chỉ hoàn 1 lần | **PASS** |
| **E185-17** | Nhóm D (Rollback) | Quá trình hủy đơn lỗi giữa chừng (`productClient.restoreStock` ném lỗi) | Rollback toàn bộ: `Order` giữ `PENDING`, `usedQuantity = 1`, `VoucherUsage = APPLIED` | **PASS** |
| **E185-18** | Nhóm D (Quy trình) | Đơn đã hoàn tất (`DELIVERED`) hoặc `PAID` bị yêu cầu hủy trái quy trình | Từ chối (`IllegalStateException`), không hoàn lượt Voucher và không hoàn kho | **PASS** |

---

## 6. Chi tiết các test Concurrency

Các bài test Concurrency trong `VoucherConcurrencyEcom185IntegrationTest.java` chạy trên **Spring Boot Context thật (`@SpringBootTest`) với cơ sở dữ liệu quan hệ H2 (`jdbc:h2:mem:ecom185db;LOCK_TIMEOUT=10000`)**, sử dụng `ExecutorService` + 3 chốt chặn `CountDownLatch` (`readyLatch`, `startLatch`, `doneLatch`) để đảm bảo tất cả các luồng xuất phát tại cùng một thời điểm micro-second (tuyệt đối không dùng `Thread.sleep` hay gọi tuần tự):

1. **`e185_04_twoConcurrentRequestsForLastSlot_OnlyOneSucceedsOnRealDatabase` (`E185-04`):**
   - Khởi tạo Voucher `E185_RACE_LAST` (`quantity = 5, usedQuantity = 4`).
   - 2 luồng (`userId = 200`, `userId = 201`) cùng chờ tại `startLatch.await()` và đồng loạt gọi `orderService.checkout(...)`.
   - **Kết quả:** `successCount = 1`, `failCount = 1`, `after.getUsedQuantity() == 5`, `voucherUsageRepository.count() == 1`, `orderRepository.count() == 1`.
2. **`e185_05_twelveConcurrentUsersForThreeSlots_NeverExceedsTotalLimit` (`E185-05`):**
   - Khởi tạo Voucher `E185_LIMIT_3` (`quantity = 3, usedQuantity = 0`).
   - 12 luồng đại diện 12 người dùng khác nhau (`userId = 300..311`) đồng loạt gọi `orderService.checkout(...)`.
   - **Kết quả:** `successCount = 3`, `rejectedCount = 9`, `after.getUsedQuantity() == 3`, đúng 3 bản ghi `VoucherUsage(APPLIED)` và 3 `Order`.
3. **`e185_10_sameUserSendsMultipleConcurrentRequests_OnlyOneSucceeds` (`E185-10`):**
   - Khởi tạo Voucher `E185_SAME_USER_CONC` (`quantity = 20, usedQuantity = 0`).
   - 8 luồng của cùng 1 người dùng (`userId = 777`) đồng loạt gọi `orderService.checkout(...)`.
   - **Kết quả:** `successCount = 1`, `duplicateBlockedCount = 7` (`"Bạn đã sử dụng mã giảm giá này rồi."`), `after.getUsedQuantity() == 1`, đúng 1 bản ghi `VoucherUsage(APPLIED)` cho `userId = 777`.
4. **`e185_c1_mixedMultiUserAndDuplicateUserConcurrency_DatabaseRemainsConsistent` (`E185-C1`):**
   - Khởi tạo Voucher `E185_MIXED_CONC` (`quantity = 4, usedQuantity = 0`).
   - 6 người dùng khác nhau (`userId = 900..905`), mỗi người bắn 2 request đồng thời (tổng 12 luồng song song).
   - **Kết quả:** Đúng 4 đơn hàng thành công từ 4 `userId` phân biệt, 8 request bị từ chối; DB `usedQuantity == 4`, `voucher_usages` == 4, `distinctSuccessfulUsers == 4`.
5. **`e185_c2_checkoutFailsAtStockReservation_ShouldRollbackVoucherUsedQuantity` (`E185-C2`):**
   - Giả lập `productClient.reserveStock` ném `NotEnoughStockException` sau khi `voucherService.redeemVoucherForOrder` đã cộng `usedQuantity` trong DB.
   - **Kết quả:** `@Transactional` rollback hoàn toàn: `usedQuantity` quay về `0`, không lưu `VoucherUsage` và không lưu `Order`.
6. **`e185_16_concurrentRequestsCancellingSameOrder_OnlyOneSucceedsAndRestoresOnce` (`E185-16`):**
   - Hai đơn hàng của `userId = 1006` và `userId = 1007` cùng áp mã `E185_CONC_CANCEL` (`usedQuantity = 2`).
   - 4 luồng đồng thời cùng gọi `orderService.cancelOrder(order1.getId(), 1006L)`.
   - **Kết quả:** `cancelSuccess = 1`, `cancelRejected = 3`, `usedQuantity` chỉ giảm từ `2` xuống `1` (không bị giảm kép về `0`), `productClient.restoreStock` chỉ được gọi đúng 1 lần.

---

## 7. Trạng thái database trước và sau test

| Kịch bản kiểm thử | Trạng thái DB Trước Test (`vouchers` / `voucher_usages` / `orders`) | Trạng thái DB Sau Test (`vouchers` / `voucher_usages` / `orders`) | Đánh giá tính nhất quán |
|---|---|---|---|
| **E185-01** (Dùng lượt đầu) | `usedQuantity = 0/5`, `usages = 0`, `orders = 0` | `usedQuantity = 1/5`, `usages = 1 (APPLIED)`, `orders = 1 (PENDING)` | Nhất quán 100% |
| **E185-02** (Dùng lượt cuối) | `usedQuantity = 4/5`, `usages = 0`, `orders = 0` | `usedQuantity = 5/5`, `usages = 1 (APPLIED)`, `orders = 1 (PENDING)` | Nhất quán 100% |
| **E185-03** (Đã hết lượt) | `usedQuantity = 5/5`, `usages = 0`, `orders = 0` | `usedQuantity = 5/5`, `usages = 0`, `orders = 0` | Không phát sinh dữ liệu rác |
| **E185-04** (2 luồng tranh lượt cuối) | `usedQuantity = 4/5`, `usages = 0`, `orders = 0` | `usedQuantity = 5/5`, `usages = 1 (APPLIED)`, `orders = 1` | Không vượt `quantity = 5` |
| **E185-05** (12 luồng tranh 3 lượt) | `usedQuantity = 0/3`, `usages = 0`, `orders = 0` | `usedQuantity = 3/3`, `usages = 3 (APPLIED)`, `orders = 3` | Không lost update |
| **E185-10** (1 user bắn 8 luồng) | `usedQuantity = 0/20`, `usages = 0`, `orders = 0` | `usedQuantity = 1/20`, `usages = 1 (APPLIED)`, `orders = 1` | Không vượt giới hạn cá nhân |
| **E185-C1** (6 user x 2 luồng tranh 4 lượt) | `usedQuantity = 0/4`, `usages = 0`, `orders = 0` | `usedQuantity = 4/4`, `usages = 4 (4 user khác nhau)`, `orders = 4` | Đảm bảo cả tổng lượt & cá nhân |
| **E185-C2** (Lỗi kho khi checkout) | `usedQuantity = 0/5`, `usages = 0`, `orders = 0` | `usedQuantity = 0/5`, `usages = 0`, `orders = 0` | Rollback nguyên tử 100% |
| **E185-13** (Hủy đơn PENDING -> Đặt lại) | Sau đặt lần 1: `usedQuantity = 1/1`, `APPLIED = 1` | Sau hủy: `usedQuantity = 0/1`, `RESTORED = 1` -> Đặt lại: `usedQuantity = 1/1`, `APPLIED = 1, RESTORED = 1` | Hoàn lượt & tái sử dụng chuẩn xác |
| **E185-16** (4 luồng cùng hủy 1 đơn) | `usedQuantity = 2/5`, `APPLIED = 2` (2 đơn) | `usedQuantity = 1/5`, `RESTORED = 1`, `APPLIED = 1` | Không hoàn lượt kép |
| **E185-17** (Lỗi giữa chừng khi hủy đơn) | `usedQuantity = 1/5`, `APPLIED = 1`, `Order = PENDING` | `usedQuantity = 1/5`, `APPLIED = 1`, `Order = PENDING` | Rollback khi hủy lỗi |
| **E185-18** (Hủy đơn DELIVERED / PAID) | `usedQuantity = 2/5`, `APPLIED = 2`, `Orders = PAID, DELIVERED` | `usedQuantity = 2/5`, `APPLIED = 2`, `Orders = PAID, DELIVERED` | Chặn hủy trái quy trình |

---

## 8. Các file test đã tạo hoặc cập nhật

### File test mới tạo cho ECOM-185:
1. `backend/order-service/src/test/java/com/ecommerce/order/service/VoucherConcurrencyEcom185IntegrationTest.java` (20 integration & multi-threaded concurrency tests trên H2 DB thật).
2. `frontend/tests/ecom185.voucher_concurrency.qa.test.mjs` (9 automated tests kiểm tra trạng thái `SOLD_OUT`, giới hạn lượt dùng và đối chiếu đồng bộ Backend/Frontend; đã đăng ký vào `frontend/package.json`).

### File source code Backend đã khắc phục lỗi Race Condition / Concurrency cho ECOM-185:
1. `backend/order-service/src/main/java/com/ecommerce/order/repository/VoucherRepository.java`
2. `backend/order-service/src/main/java/com/ecommerce/order/service/impl/VoucherServiceImpl.java`
3. `backend/order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java`
4. `backend/order-service/src/main/java/com/ecommerce/order/controller/VoucherController.java`
5. `backend/order-service/src/main/java/com/ecommerce/order/controller/OrderController.java`

---

## 9. Các lệnh đã thực thi

```powershell
# 1. Chạy bộ Integration & Concurrency Test của ECOM-185 trên H2 Database thật
Set-Location c:\IT209\-E-COMMERCE-PLATFORM\backend
.\gradlew.bat :order-service:test --tests "com.ecommerce.order.service.VoucherConcurrencyEcom185IntegrationTest" --no-daemon --max-workers=2

# 2. Chạy toàn bộ test suite của toàn bộ các microservice Backend
Set-Location c:\IT209\-E-COMMERCE-PLATFORM\backend
.\gradlew.bat test --no-daemon --max-workers=2

# 3. Chạy bộ test Frontend ECOM-185 và toàn bộ test suite + lint + build của Frontend
Set-Location c:\IT209\-E-COMMERCE-PLATFORM\frontend
node --experimental-default-type=module --test tests/ecom185.voucher_concurrency.qa.test.mjs
npm test
npm run lint
npm run build

# 4. Kiểm tra định dạng git diff và trạng thái nhánh
Set-Location c:\IT209\-E-COMMERCE-PLATFORM
git diff --check
git status
```

---

## 10. Kết quả PASS/FAIL từng test case

### A. Backend Integration & Concurrency Test (`VoucherConcurrencyEcom185IntegrationTest.java` – 20/20 PASS)
- `e185_01_unusedVoucher_ShouldSucceedAndIncrementDatabaseCount`: **PASS**
- `e185_02_oneSlotRemaining_LastValidRequestShouldBeAccepted`: **PASS**
- `e185_03_reachedTotalLimit_ShouldRejectBothApplyAndCheckout`: **PASS**
- `e185_04_twoConcurrentRequestsForLastSlot_OnlyOneSucceedsOnRealDatabase`: **PASS**
- `e185_05_twelveConcurrentUsersForThreeSlots_NeverExceedsTotalLimit`: **PASS**
- `e185_06_noUnlimitedFlagPolicy_RequiresPositiveQuantityAndSupportsHighCeiling`: **PASS**
- `e185_07_userHasNotUsedVoucher_ShouldBeAllowed`: **PASS**
- `e185_08_userAlreadyUsedVoucher_ShouldBeRejectedAndFilteredOut`: **PASS**
- `e185_09_differentUserWhoHasNotUsedVoucher_ShouldBeAllowed`: **PASS**
- `e185_10_sameUserSendsMultipleConcurrentRequests_OnlyOneSucceeds`: **PASS**
- `e185_11_invalidTokenOrInvalidHeaderUserId_ShouldBeRejected403`: **PASS**
- `e185_12_userAttemptsToSpoofAnotherUsersIdentityOrCancelOthersOrder_ShouldBeRejected`: **PASS**
- `e185_c1_mixedMultiUserAndDuplicateUserConcurrency_DatabaseRemainsConsistent`: **PASS**
- `e185_c2_checkoutFailsAtStockReservation_ShouldRollbackVoucherUsedQuantity`: **PASS**
- `e185_13_unpaidOrderCancelledByCustomer_RestoresVoucherAndAllowsReuse`: **PASS**
- `e185_14_orderCancelledByPaymentFailureOrAdmin_RestoresVoucherUsageCorrectly`: **PASS**
- `e185_15_cancelSameOrderMultipleTimesSequentially_NeverRestoresMultipleTimes`: **PASS**
- `e185_16_concurrentRequestsCancellingSameOrder_OnlyOneSucceedsAndRestoresOnce`: **PASS**
- `e185_17_orderCancellationFailsMidTransaction_ShouldRollbackAndKeepVoucherApplied`: **PASS**
- `e185_18_completedOrPaidOrderCancelledOutOfProcess_ShouldBeRejectedAndKeepVoucherUsed`: **PASS**

### B. Frontend Automated QA Test (`frontend/tests/ecom185.voucher_concurrency.qa.test.mjs` – 9/9 PASS)
- Tất cả 9/9 test case kiểm tra `SOLD_OUT`, giới hạn lượt dùng, xác thực danh tính và hoàn lượt khi hủy đơn đều **PASS**.

---

## 11. Các bug hoặc rủi ro race condition phát hiện được

Trong quá trình khảo sát source code và chạy kiểm thử Concurrency trên Database thật, QA đã phát hiện **5 lỗi (Bugs / Race Conditions)** thực tế:

1. **BUG-185-01 (High – TOCTOU Race Condition khi cùng 1 người dùng gửi nhiều request đặt hàng đồng thời – `E185-10`):**
   - **Nguyên nhân:** Trong `OrderServiceImpl.checkout`, hệ thống gọi `voucherService.validateUserCanUseVoucher(code, userId)` (chỉ thực hiện `SELECT existsByVoucherCodeIgnoreCaseAndUserIdAndStatus`) ở đầu hàm, còn việc lưu bản ghi `voucher_usages` (`recordVoucherUsage`) nằm ở cuối hàm sau khi lưu `Order`. Khi 1 người dùng gửi 8 request đồng thời, cả 8 luồng đều đọc thấy `exists == false` trước khi bất kỳ giao dịch nào kịp commit, dẫn tới 1 người dùng áp được mã giảm giá nhiều lần.
2. **BUG-185-02 (High – Race Condition khi nhiều request hủy cùng 1 đơn hàng đồng thời – `E185-16`):**
   - **Nguyên nhân:** `OrderServiceImpl.cancelOrder`, `handlePaymentFailed` và `updateOrderStatus` đọc `orderRepository.findByIdWithItems(orderId)` mà không có khóa đồng bộ theo `orderId`. Khi nhiều request hủy cùng 1 đơn `PENDING` chạy song song, các luồng cùng thấy `status == PENDING` và gọi `voucherService.restoreVoucherUsage` + `productClient.restoreStock` lặp nhiều lần, làm giảm lố `usedQuantity` của các đơn hàng khác.
3. **BUG-185-03 (Medium – Thứ tự thực thi khi hủy đơn hàng và fallback sai trong `restoreVoucherUsageForOrder` – `E185-15`, `E185-17`):**
   - **Nguyên nhân:**
     - Trong `cancelPendingOrderAndRestoreStock` và `updateOrderStatus(CANCELLED)`, hệ thống cập nhật trạng thái đơn và gọi `restoreVoucherUsage` **trước** khi gọi `productClient.restoreStock(restoreItems)`.
     - Trong `VoucherServiceImpl.restoreVoucherUsageForOrder(code, userId, orderId)`, nếu tìm theo `orderId` không thấy bản ghi `APPLIED` (do đơn đó đã được hoàn trước đó), code cũ lại fallback sang tìm theo `userId`, có nguy cơ làm `RESTORED` nhầm bản ghi `APPLIED` của một đơn hàng mới khác của cùng user.
4. **BUG-185-04 (Medium – Stale Persistence Context sau `@Modifying` query trong `VoucherRepository`):**
   - **Nguyên nhân:** `incrementUsedQuantityAtomically` và `decrementUsedQuantityByCode` sử dụng `@Modifying` mặc định (`clearAutomatically = false`), khiến Hibernate L1 Cache giữ nguyên giá trị `usedQuantity` cũ nếu thực thể `Voucher` đã được nạp trong cùng persistence context.
5. **BUG-185-05 (Medium – Xác thực Header & Chống giả mạo `userId` trong Body – `E185-11`, `E185-12`):**
   - **Nguyên nhân:** `VoucherController.applyVoucher` chưa ghi đè `request.setUserId(null)` khi không có `X-User-Id` (cho phép client tự truyền `userId` của người khác trong body) và chưa chặn request mang `Authorization: Bearer ...` chưa qua xác thực Gateway hoặc `X-User-Id <= 0`.

---

## 12. Cách xử lý hoặc đề xuất xử lý

Tất cả 5 lỗi trên đã được khắc phục triệt để và xác minh bằng Automated Test:

1. **Khắc phục BUG-185-01 (`VoucherServiceImpl.java`):**
   - Bổ sung `ConcurrentHashMap<String, ReentrantLock> userVoucherLocks` kết hợp tập `Set<String> inFlightUserVouchers` theo dõi các cặp `CODE#userId` đang trong giao dịch mở, tự động giải phóng qua `TransactionSynchronization.afterCompletion` khi transaction commit hoặc rollback.
2. **Khắc phục BUG-185-02 (`OrderServiceImpl.java`):**
   - Bổ sung `ConcurrentHashMap<Long, ReentrantLock> orderLocks` (`acquireOrderLock(orderId)`) giữ khóa xuyên suốt vòng đời transaction hủy/cập nhật đơn hàng, đảm bảo khi có nhiều request hủy cùng 1 đơn đồng thời thì chỉ đúng 1 request đầu tiên thực thi, các request sau thấy trạng thái `CANCELLED` và bị từ chối ngay.
3. **Khắc phục BUG-185-03 (`OrderServiceImpl.java` & `VoucherServiceImpl.java`):**
   - Đưa lệnh gọi `productClient.restoreStock(restoreItems)` lên trước khi cập nhật `Order.status = CANCELLED` và trước khi gọi `voucherService.restoreVoucherUsage(...)`.
   - Trong `restoreVoucherUsageForOrder`, khi `orderId != null` chỉ truy vấn chính xác theo `(code, orderId, APPLIED)`, không fallback sang `userId`.
4. **Khắc phục BUG-185-04 (`VoucherRepository.java`):**
   - Cấu hình `@Modifying(clearAutomatically = true, flushAutomatically = true)` cho `incrementUsedQuantityAtomically` và `decrementUsedQuantityByCode`.
5. **Khắc phục BUG-185-05 (`VoucherController.java` & `OrderController.java`):**
   - Luôn gán `request.setUserId(userId)` từ header `X-User-Id` đã xác thực, từ chối `X-User-Id <= 0` hoặc header `Authorization` không kèm `X-User-Id` hợp lệ với `AccessDeniedException` (`403 Forbidden`).

---

## 13. Rủi ro còn tồn tại

1. **Môi trường Multi-Instance (Horizontal Scaling nhiều container `order-service`):**
   - Đối với tổng lượt sử dụng (`usedQuantity`), câu lệnh SQL `UPDATE Voucher v SET v.usedQuantity = v.usedQuantity + 1 WHERE ... AND v.usedQuantity < v.quantity` thực thi trực tiếp ở tầng Database nên **an toàn tuyệt đối kể cả khi chạy nhiều instance**.
   - Đối với khóa theo cặp `(voucherCode, userId)` (`inFlightUserVouchers`) và khóa theo `orderId` (`orderLocks`) hiện đang dùng in-memory lock trên JVM. Khi triển khai nhiều replica `order-service` song song trong môi trường Production, đề xuất bổ sung thêm `UNIQUE INDEX` một phần trên PostgreSQL (`CREATE UNIQUE INDEX uq_voucher_usage_active_user ON voucher_usages (voucher_id, user_id) WHERE status = 'APPLIED'`) hoặc khóa phân tán Redis (`SET NX PX`) để bảo vệ ở cấp độ liên tiến trình.

---

## 14. Kết luận QA

- Toàn bộ **18/18 kịch bản bắt buộc (`E185-01` đến `E185-18`)** và các kịch bản Concurrency nâng cao (`E185-C1`, `E185-C2`) đã được viết automated test thực sự trên H2 Database thật, thực thi thành công và đạt kết quả **100% PASS**.
- Nghiệp vụ giới hạn tổng lượt sử dụng, giới hạn mỗi người dùng, xử lý đa luồng đồng thời và hoàn lượt khi hủy đơn hàng hoạt động chính xác, an toàn và nhất quán dữ liệu.
