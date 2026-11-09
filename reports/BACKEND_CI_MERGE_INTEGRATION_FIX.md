# BÁO CÁO KHẮC PHỤC LỖI BACKEND CI KHI GỘP NHÁNH (MERGE INTEGRATION)
**Dự án:** ShopMart E-Commerce Platform  
**Workspace:** `C:\IT209\-E-COMMERCE-PLATFORM`  
**Nhánh nguồn:** `devops-phuong`  
**Nhánh đích:** `master`  
**Thời gian thực hiện:** 06/11/2026  

---

## 1. TỔNG QUAN VẤN ĐỀ (PROBLEM OVERVIEW)

Khi tạo Pull Request gộp nhánh phát triển `devops-phuong` vào `master`, GitHub Actions Backend CI chạy trên nhánh ảo kết quả merge (`refs/pull/<pr>/merge`) và báo lỗi thất bại:
```text
PaymentServiceTest > [ECOM-269] mockPay Tests > mockPay - Đã thanh toán trước đó: ném IllegalStateException FAILED
    java.lang.AssertionError: Expected java.lang.IllegalStateException to be thrown, but nothing was thrown.

PaymentServiceTest > [ECOM-269] mockPay Tests > mockPay - Đơn hàng không tồn tại: ném ResourceNotFoundException FAILED
    java.lang.AssertionError: Expected com.ecommerce.payment.exception.ResourceNotFoundException to be thrown, but was java.lang.NullPointerException.
```

Trong khi đó, nếu chạy test riêng rẽ trên commit cục bộ cũ của `devops-phuong`, test vẫn PASS. Điều này cho thấy có sự xung đột logic nghiệp vụ ngầm (semantic conflict) giữa nhánh `master` và nhánh phát triển `devops-phuong`.

---

## 2. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

### 2.1. Lịch sử thay đổi trên nhánh `master`
Qua kiểm tra lịch sử Git:
- Nhánh `master` đã tiếp nhận Pull Request #44 (commit `27a0f41` merge commit `aa838f0` "Fix lỗi đặt hàng trực truyến").
- Trong commit này, file `PaymentServiceImpl.java` và `PaymentController.java` đã được cập nhật logic xử lý cho API `mockPay`:
  1. **Khi chưa có bản ghi thanh toán cho đơn hàng (`orderId`):** Thay vì ném `ResourceNotFoundException`, hệ thống tự động khởi tạo bản ghi `Payment` mới (status `PENDING`, amount = 0, method = `MOCK_ONLINE`) và thực hiện thanh toán ngay để tránh lỗi giao dịch gián đoạn cho khách hàng.
  2. **Khi đơn hàng đã ở trạng thái `SUCCESS`:** Thay vì ném `IllegalStateException`, hệ thống xử lý theo cơ chế **Idempotent** (bảo đảm tính lũy nghiệm), ghi nhận log và trả về `PaymentResponse` với trạng thái `SUCCESS` hiện tại kèm mã giao dịch `transactionCode`, không gửi lại Kafka event trùng lặp.
  3. **Controller `PaymentController.mockPay`:** Thêm `@RequestBody(required = false)` và mặc định `isSuccess = true` khi request body null.

### 2.2. Sự không đồng bộ trên `devops-phuong`
- Nhánh `devops-phuong` được rẽ nhánh trước khi PR #44 được merge vào `master`. Do đó, `PaymentServiceImpl.java` trên `devops-phuong` vẫn giữ logic cũ ném exception.
- Khi triển khai task ECOM-269 trên `devops-phuong`, 2 unit test được thêm vào để kiểm tra hành vi ném `IllegalStateException` và `ResourceNotFoundException`.
- Khi GitHub Actions kiểm thử PR tích hợp vào `master`, Git tự động giải quyết merge code của `PaymentServiceImpl.java` theo phiên bản mới nhất từ `master`, khiến 2 unit test của ECOM-269 (vốn mong đợi exception) bị thất bại với lỗi `AssertionError`.

---

## 3. QUÁ TRÌNH TÁCH BIỆT KIỂM THỬ BẰNG GIT WORKTREE

Theo quy trình QA & DevOps an toàn:
1. **Tạo môi trường độc lập:** Tạo Git worktree tại `C:\IT209\shopmart-merge-test` từ `origin/master`.
2. **Mô phỏng merge:** Chạy `git merge --no-commit --no-ff origin/devops-phuong` trong worktree mà không ảnh hưởng tới working tree chính.
3. **Tái hiện lỗi:** Chạy `./gradlew :payment-service:test --no-daemon` và tái hiện chính xác 2 test thất bại như GitHub Actions.
4. **Kiểm chứng sửa đổi:** Điều chỉnh test cases theo đúng nghiệp vụ thực tế, chạy test và xác nhận `BUILD SUCCESSFUL` trên bản merge.
5. **Dọn dẹp:** Xóa hoàn toàn worktree `shopmart-merge-test` và dọn dẹp Git metadata.

---

## 4. CHI TIẾT SỬA ĐỔI SOURCE CODE

Đã đồng bộ trực tiếp các cải tiến từ `master` vào nhánh làm việc `devops-phuong`:

### 4.1. `backend/payment-service/src/main/java/com/ecommerce/payment/service/impl/PaymentServiceImpl.java`
- Xử lý tự động tạo record khi chưa có payment:
  ```java
  Payment payment = paymentRepository.findByOrderId(orderId)
          .orElseGet(() -> {
              log.info("[Mock Pay] Không tìm thấy bản ghi payment cho orderId {}, tự động khởi tạo bản ghi mới để hoàn tất thanh toán", orderId);
              Payment newPayment = Payment.builder()
                      .orderId(orderId)
                      .amount(BigDecimal.ZERO)
                      .paymentMethod("MOCK_ONLINE")
                      .status(PaymentStatus.PENDING)
                      .build();
              return paymentRepository.save(newPayment);
          });
  ```
- Xử lý Idempotent khi đã thanh toán thành công:
  ```java
  if (payment.getStatus() == PaymentStatus.SUCCESS) {
      log.info("[Mock Pay] Đơn hàng ID {} đã được thanh toán thành công trước đó", orderId);
      return mapToPaymentResponse(payment);
  }
  ```

### 4.2. `backend/payment-service/src/main/java/com/ecommerce/payment/controller/PaymentController.java`
- Chấp nhận request body tùy chọn `(required = false)` và mặc định `isSuccess = true`:
  ```java
  @PostMapping("/mock-pay/{orderId}")
  public ResponseEntity<ApiResponse<PaymentResponse>> mockPay(
          @Parameter(description = "ID của đơn hàng cần thanh toán", example = "101")
          @PathVariable Long orderId,
          @Valid @RequestBody(required = false) MockPaymentRequest request) {
      boolean isSuccess = request == null || request.getSuccess() == null || Boolean.TRUE.equals(request.getSuccess());
  ```

### 4.3. `backend/payment-service/src/test/java/com/ecommerce/payment/service/PaymentServiceTest.java`
- Cập nhật 2 bài test phù hợp với logic nghiệp vụ thực tế:
  1. `testMockPay_AlreadyPaid_Idempotent_ReturnsSuccess`: Xác nhận trả về kết quả `SUCCESS`, giữ nguyên `transactionCode`, không phát lặp sự kiện Kafka.
  2. `testMockPay_OrderNotFound_AutoCreatesPaymentAndProcesses`: Xác nhận tự động lưu bản ghi payment mới và hoàn tất giao dịch thành công.

### 4.4. `frontend/tests/ecom269.checkout_be.qa.test.mjs`
- Cập nhật regex kiểm tra tên phương thức test trong unit test để tương thích linh hoạt cả 2 quy chuẩn.

---

## 5. KẾT QUẢ KIỂM THỬ THỰC TẾ

### 5.1. Backend Unit Test (`payment-service`)
- Lệnh: `./gradlew :payment-service:test --no-daemon`
- Kết quả: **BUILD SUCCESSFUL in 1m 20s**
- Toàn bộ 20/20 test cases của `payment-service` đều **PASS**.

### 5.2. Toàn bộ Backend Microservices
- Lệnh: `./gradlew test --rerun-tasks --no-daemon --max-workers=2`
- Kết quả: **BUILD SUCCESSFUL in 2m 38s**
- **24/24** actionable tasks executed thành công trên tất cả các dịch vụ:
  - `api-gateway`
  - `auth-service`
  - `discovery-server`
  - `order-service`
  - `payment-service`
  - `product-service`

### 5.3. Frontend Test Suite & QA Automation
- Lệnh: `npm --prefix frontend test`
- Kết quả: **# tests 185, # pass 185, # fail 0** (100% PASS)
- Lệnh: `npm --prefix frontend run lint`
- Kết quả: **[LINT PASS] 0 lỗi cú pháp/import**
- Lệnh: `npm --prefix frontend run build`
- Kết quả: **Vite build thành công trong 2.53s**

---

## 6. KẾT LUẬN & TRẠNG THÁI HIỆN TẠI

1. Lỗi Backend CI khi merge `devops-phuong` vào `master` đã được **giải quyết triệt để** bằng cách thống nhất logic nghiệp vụ Idempotent và Auto-create payment.
2. Cả nhánh `devops-phuong` độc lập và trạng thái kết hợp với `origin/master` đều đã được kiểm chứng tự động 100% xanh.
3. Không thực hiện `git commit` hay `git push` tự động, bảo đảm tuân thủ quy tắc an toàn kho mã nguồn. Toàn bộ thay đổi đang ở trạng thái sẵn sàng để review và commit.
