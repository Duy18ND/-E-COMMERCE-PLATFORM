# PHÂN TÍCH NHỮNG PHẦN CÒN THIẾU VÀ BỊ BỎ SÓT (SPRINT 2 MISSING TASKS & GAP ANALYSIS)

## 1. TỔNG HỢP THEO PHÂN LOẠI YÊU CẦU

### 1.1. Task chưa làm (Not Started)
- **Số lượng:** **0 Task**
- **Đánh giá:** Không có task nào trong tổng số 97 task của Sprint 2 bị bỏ qua hoàn toàn. Tất cả 7 Feature (Level 1), 16 Group (Level 2), và 74 Subtask (Level 3) đều đã có code thực thi.

### 1.2. Task làm dở / Chưa merge vào master (Partial / Unmerged)
- **Số lượng:** **3 Tasks**
  1. **ECOM-313:** `[FE] Đồng bộ cập nhật trạng thái Admin với trang Customer`
     - **Hiện trạng:** Code đã hoàn thành tại `frontend/src/services/orderService.js` (BroadcastChannel & storage event signal), đã được kiểm thử với 10/10 test case trong `ecom313.status_sync.qa.test.mjs`.
     - **Vấn đề:** Nằm trong commit `44b8a1f` trên nhánh `devops-phuong`, chưa được merge vào nhánh `master`.
  2. **ECOM-314:** `[FE] QA Test - UI, responsive, lỗi và tích hợp (Order Tracking)`
     - **Hiện trạng:** Bộ test hoàn chỉnh tại `frontend/tests/ecom314.tracking_fe.qa.test.mjs` (12/12 PASS).
     - **Vấn đề:** Nằm trong commit `44b8a1f` trên `devops-phuong`, chưa merge vào `master`.
  3. **ECOM-318:** `[BE] QA Test - API, validation và quyền truy cập (Theo dõi đơn hàng chi tiết)`
     - **Hiện trạng:** Bộ test JUnit 5 tại `backend/order-service/src/test/java/com/ecommerce/order/controller/OrderTrackingApiQATest.java` (16 test cases PASS) và bài test node `frontend/tests/ecom318.tracking_be.qa.test.mjs` (16 test cases PASS).
     - **Vấn đề:** Nằm trong commit `44b8a1f` trên `devops-phuong`, chưa merge vào `master`.

### 1.3. Task thiếu chức năng theo Description
- **Số lượng:** **0 Task**
- Tất cả các yêu cầu về nghiệp vụ:
  - Giỏ hàng (tăng giảm, xóa, giỏ trống, tính tiền server, kiểm tra tồn kho).
  - Checkout & Mock Payment (form địa chỉ, chọn COD / Online, mock thanh toán, trừ kho @Transactional, tạo đơn, xóa giỏ).
  - Lịch sử đơn hàng & Profile (danh sách đơn, chi tiết, hủy đơn hoàn kho khi PENDING, cập nhật hồ sơ, bảo vệ IDOR).
  - Quản lý tồn kho (cảnh báo tồn kho thấp, modal nhập/xuất/điều chỉnh kho, khóa số lượng không âm, chống race condition).
  - Quản trị đơn hàng Admin (danh sách, bộ lọc trạng thái, form chuyển trạng thái hợp lệ, phân quyền admin).
  - Flash Sale (trang flash sale đếm ngược, thanh % đã bán, giới hạn mua 1 khách, admin CRUD & kích hoạt sale, kiểm thử hết hạn).
  - Theo dõi đơn hàng (timeline 5 bước trực quan, bảng lịch sử order_status_history, ghi actor_role và note, kiểm tra quyền sở hữu đơn).
  đều đã được cài đặt đầy đủ logic trong code.

### 1.4. Task thiếu API Backend hoặc Frontend chưa tích hợp
- **Số lượng:** **0 Task**
- Không có hiện tượng "chỉ có UI mà không có API" hoặc "có API mà FE không gọi".
- Mọi service Frontend (`cartService.js`, `orderService.js`, `paymentService.js`, `saleService.js`, `productService.js`, `authService.js`) đều định tuyến gọi trực tiếp các REST API của Backend qua Axios Client (`/api/v1/...`).

### 1.5. Chức năng có Mock Data và Cơ chế Fallback
- **Hiện trạng kiểm tra:** Có 28 tệp trong Frontend chứa từ khóa `mock` hoặc `fallback`.
- **Bản chất kỹ thuật:**
  1. `paymentService.js`: Chức năng thanh toán trực tuyến mô phỏng (`MOCK_ONLINE`) gọi API Backend `/api/v1/payments/mock-pay/{orderId}`. Đây là yêu cầu nghiệp vụ bắt buộc của Sprint 2 (mô phỏng cổng thanh toán trước khi tích hợp cổng thực VNPay trong Sprint 3).
  2. `cartService.js`, `orderService.js`, `saleService.js`: Thiết kế mẫu **Offline-First / Graceful Degradation**. Khi Backend API đang hoạt động, Frontend luôn gửi và nhận dữ liệu thật từ Backend. Khi môi trường demo không bật server Backend hoặc mất mạng, hệ thống có cơ chế fallback sang `localStorage` để giao diện không bị sập (tránh màn hình trắng).
  3. Cờ môi trường `VITE_USE_MOCK_AUTH`: Mặc định tắt (`'false'`) trong CI và cấu hình production.

### 1.6. Vấn đề cập nhật tài liệu Scrum Board (Documentation Lag)
- **Vấn đề phát hiện:** File Excel `Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx` (Sheet: `SCRUM BOARD - FE BE`) hiển thị trạng thái của toàn bộ 97 task là `Chưa bắt đầu`.
- **Nguyên nhân:** Đội ngũ phát triển tập trung vào viết code, test tự động và báo cáo Markdown trong thư mục `reports/`, chưa cập nhật đồng bộ ngược lại file Excel gốc.
- **Rủi ro:** Khi các bên liên quan chỉ mở file Excel mà không kiểm tra Git và Workspace, sẽ có hiểu nhầm là dự án chưa bắt đầu Sprint 2.
