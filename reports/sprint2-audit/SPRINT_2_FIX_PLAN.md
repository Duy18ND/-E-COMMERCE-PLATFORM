# KẾ HOẠCH HOÀN THIỆN VÀ KHẮC PHỤC (SPRINT 2 FIX PLAN & ROADMAP)

Kế hoạch hành động sắp xếp theo thứ tự ưu tiên nghiêm ngặt từ **P0** đến **P3**, xác định rõ công việc, người phụ trách, thời gian ước tính và tiêu chí chuyển trạng thái DONE.

---

## 1. DANH MỤC CÔNG VIỆC THEO MỨC ĐỘ ƯU TIÊN

### 1.1. Mức độ P0 – BLOCKER (0 hạng mục)
- Không có lỗi P0 nào. Không có lỗi sập hệ thống, không có lỗ hổng bảo mật, không có lỗi CI bắt buộc thất bại.

---

### 1.2. Mức độ P1 – HIGH (1 hạng mục)

#### Hạng mục FIX-01: Tạo Pull Request và Merge commit `44b8a1f` vào nhánh `master`
- **Mã lỗi liên quan:** BUG-S2-01
- **Task ID:** `ECOM-313`, `ECOM-314`, `ECOM-318`
- **Người phụ trách:** Đoàn Mạnh Duy (Repo Owner / Lead) / Ngô Phương (DevOps Lead)
- **Dependency:** Nhánh `devops-phuong` đã pass toàn bộ CI test.
- **Ước lượng thời gian:** **15 phút**
- **Nội dung công việc:**
  1. Truy cập GitHub repository: `https://github.com/Duy18ND/-E-COMMERCE-PLATFORM`.
  2. Tạo Pull Request mới:
     - Base branch: `master`
     - Compare branch: `devops-phuong`
     - Tiêu đề PR: `PR #49: feat: complete ECOM-313 ECOM-314 ECOM-318 (Order Tracking Full Integration & QA)`
  3. Kiểm tra GitHub Actions CI chạy tự động trên PR.
  4. Thực hiện Merge Pull Request vào `master`.
- **Điều kiện chuyển DONE:** Nhánh `master` trên GitHub chứa commit `44b8a1f`, commit history trên `master` hiển thị trạng thái CI xanh.

---

### 1.3. Mức độ P2 – MEDIUM (2 hạng mục)

#### Hạng mục FIX-02: Cập nhật đồng bộ trạng thái trên Scrum Board và Master Plan
- **Mã lỗi liên quan:** BUG-S2-03
- **Task ID:** Toàn bộ 97 Task Sprint 2
- **Người phụ trách:** Ngô Phương (Scrum Master)
- **Dependency:** Bảng kiểm tra `SPRINT_2_TASK_CHECKLIST.md` và file `SPRINT_2_AUDIT_SUMMARY.xlsx`.
- **Ước lượng thời gian:** **30 phút**
- **Nội dung công việc:**
  1. Mở file `Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx`.
  2. Cập nhật cột `Status` của 97 task Sprint 2 từ `Chưa bắt đầu` thành `Hoàn thành` (hoặc `DONE`).
  3. Cập nhật ngày hoàn thành thực tế tương ứng với các commit đã merge.
  4. Đồng bộ tiến độ 100% cho Sprint 2 trong sheet `3. Master Plan`.
- **Điều kiện chuyển DONE:** File Excel phản ánh chính xác 97/97 task Sprint 2 đã hoàn thành.

#### Hạng mục FIX-03: Chuẩn bị kịch bản Demo trực tiếp Sprint 2 (Demo Script)
- **Task ID:** ECOM-117, ECOM-121, ECOM-126, ECOM-136, ECOM-140, ECOM-157, ECOM-159
- **Người phụ trách:** Cả nhóm 4 thành viên (Phương, Chiến, Duy, Linh)
- **Dependency:** Hoàn thành FIX-01 (Merge master).
- **Ước lượng thời gian:** **45 phút**
- **Nội dung công việc:**
  1. Kịch bản Khách hàng:
     - Đăng nhập tài khoản Customer.
     - Vào xem chiến dịch Flash Sale, chọn mua sản phẩm giảm giá.
     - Vào giỏ hàng, tăng giảm số lượng, xem tính tổng tiền.
     - Tiến hành Checkout, nhập địa chỉ, chọn thanh toán trực tuyến `MOCK_ONLINE`.
     - Xác nhận thanh toán thành công, chuyển hướng trang Order Success.
     - Vào xem Lịch sử đơn hàng, bấm xem chi tiết đơn và kiểm tra Timeline Tracking 5 bước.
  2. Kịch bản Quản trị viên (Admin):
     - Đăng nhập tài khoản Admin (`ROLE_ADMIN`).
     - Vào Quản lý tồn kho (Inventory), kiểm tra cảnh báo tồn kho thấp, mở modal nhập kho.
     - Vào Quản trị đơn hàng (Orders), tìm đơn vừa tạo của khách hàng.
     - Chuyển trạng thái đơn từ `CONFIRMED` -> `PROCESSING` -> `SHIPPING` -> `DELIVERED`.
     - Kiểm tra trang của Khách hàng: Timeline tự động cập nhật trạng thái mới theo thời gian thực.
- **Điều kiện chuyển DONE:** Toàn bộ luồng nghiệp vụ chạy trơn tru, không phát sinh lỗi trong quá trình demo.

---

### 1.4. Mức độ P3 – LOW (1 hạng mục)

#### Hạng mục FIX-04: Tối ưu hóa Code Splitting Vite Bundle
- **Mã lỗi liên quan:** BUG-S2-04
- **Người phụ trách:** Lê Trung Chiến (Frontend Lead)
- **Dependency:** Bắt đầu vào đầu Sprint 3.
- **Ước lượng thời gian:** **1 giờ**
- **Nội dung công việc:**
  - Thêm lazy loading cho các trang Admin: `const AdminSales = React.lazy(() => import('./pages/admin/AdminSales'))`.
  - Cấu hình `manualChunks` trong `vite.config.js` để tách riêng `vendor-react` và `vendor-ui`.
- **Điều kiện chuyển DONE:** Chạy `npm run build` không còn cảnh báo chunk size vượt quá 500 kB.

---

## 2. TỔNG KẾT THỜI GIAN THỰC HIỆN

| Mức độ | Số hạng mục | Tổng thời gian ước tính |
|---|---|---|
| **P0 (Blocker)** | 0 | 0 giờ |
| **P1 (High)** | 1 | 0.25 giờ (15 phút) |
| **P2 (Medium)** | 2 | 1.25 giờ (75 phút) |
| **P3 (Low)** | 1 | 1.00 giờ (60 phút) |
| **TỔNG CỘNG** | **4 hạng mục** | **2.50 giờ** |
