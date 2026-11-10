# BÁO CÁO DANH SÁCH LỖI VÀ VẤN ĐỀ TỒN ĐỌNG (SPRINT 2 BUG & ISSUE REPORT)

## BẢNG TỔNG HỢP LỖI PHÁT HIỆN

| Bug ID | Task ID liên quan | Module | Severity | Mô tả ngắn |
|---|---|---|---|---|
| **BUG-S2-01** | ECOM-313, ECOM-314, ECOM-318 | Git / DevOps | **P1 - HIGH** | Commit `44b8a1f` đã push lên nhánh `devops-phuong` nhưng chưa tạo Pull Request merge vào `master`. |
| **BUG-S2-02** | ECOM-313, ECOM-314, ECOM-318 | Git History | **P2 - MEDIUM** | Commit message của commit `44b8a1f` ghi sai tiêu đề: dùng lại tiêu đề `feat: complete ECOM-284 ECOM-293 ECOM-303` thay vì `ECOM-313 ECOM-314 ECOM-318`. |
| **BUG-S2-03** | Toàn bộ 97 Task Sprint 2 | Quản lý dự án | **P2 - MEDIUM** | File Scrum Board Excel gốc chưa cập nhật trạng thái thực tế (toàn bộ 97 task vẫn hiển thị "Chưa bắt đầu"). |
| **BUG-S2-04** | Frontend Build | Frontend / Vite | **P3 - LOW** | Vite cảnh báo kích thước chunk `dist/assets/index-BelwHaJv.js` (769 kB > 500 kB), chưa tách dynamic import (`manualChunks`). |

---

## CHI TIẾT TỪNG LỖI

### BUG-S2-01: Commit `44b8a1f` chưa được merge vào nhánh `master`
- **Mức độ nghiêm trọng:** **P1 - HIGH**
- **Task ID:** `ECOM-313`, `ECOM-314`, `ECOM-318`
- **Module:** Git Branching / Deployment
- **Mô tả hiện tượng:**
  - Nhánh `devops-phuong` có commit mới nhất là `44b8a1f`, chứa mã nguồn đồng bộ trạng thái đơn hàng realtime, bộ kiểm thử frontend và bộ kiểm thử JUnit 5 backend `OrderTrackingApiQATest.java`.
  - Nhánh `origin/master` đang dừng ở commit `7935d5e` (Merge PR #48).
  - Nếu triển khai hoặc nghiệm thu dựa trên nhánh `master`, các tính năng của 3 task trên sẽ bị thiếu.
- **Expected Result:** Nhánh `master` phải chứa đầy đủ mọi commit hoàn thành của Sprint 2.
- **Actual Result:** `devops-phuong` đi trước `master` 1 commit (`44b8a1f`).
- **Hướng khắc phục:** Tạo Pull Request #49 từ `devops-phuong` vào `master` trên GitHub repository và thực hiện merge.

---

### BUG-S2-02: Commit message của `44b8a1f` bị trùng tiêu đề gây hiểu nhầm lịch sử
- **Mức độ nghiêm trọng:** **P2 - MEDIUM**
- **Task ID:** `ECOM-313`, `ECOM-314`, `ECOM-318`
- **Module:** Git Commit Message
- **Mô tả hiện tượng:**
  - Commit `44b8a1f` có nội dung thực tế gồm 15 file (OrderTrackingApiQATest.java, OrderServiceImpl.java, orderService.js, test mjs, reports...).
  - Tuy nhiên, commit message lại ghi: `feat: complete ECOM-284 ECOM-293 ECOM-303`.
  - Điều này khiến việc tra cứu commit theo Task ID bằng lệnh `git log --grep="ECOM-318"` trên Git không tìm thấy commit, dù code thực tế đã nằm trong repository.
- **Expected Result:** Commit message phải phản ánh đúng các Task ID được xử lý: `feat: complete ECOM-313 ECOM-314 ECOM-318`.
- **Actual Result:** Commit message bị sao chép từ commit trước đó (`6179eae`).
- **Hướng khắc phục:** Khi tạo Pull Request #49 lên `master`, đặt tên PR rõ ràng: `PR #49: feat: complete ECOM-313 ECOM-314 ECOM-318 (Order Tracking Full Integration & QA)`. Không thực hiện amend commit local để tránh xung đột lịch sử nhánh đã push.

---

### BUG-S2-03: Trạng thái trong file Scrum Board Excel chưa đồng bộ với tiến độ thực tế
- **Mức độ nghiêm trọng:** **P2 - MEDIUM**
- **Task ID:** Toàn bộ 97 Task Sprint 2
- **Module:** Project Management Documentation
- **Mô tả hiện tượng:**
  - Tại sheet `SCRUM BOARD - FE BE` của file `Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx`, cột `Status` của toàn bộ 97 dòng Sprint 2 đều là `Chưa bắt đầu`.
  - Tiến độ thực tế trên code và test tự động đã hoàn thành 100%.
- **Expected Result:** Cột Status hiển thị `DONE` (hoặc phân loại theo giai đoạn) kèm tiến độ tương ứng.
- **Actual Result:** Cột Status vẫn giữ nguyên giá trị ban đầu khi khởi tạo kế hoạch.
- **Hướng khắc phục:** Cung cấp file Excel tổng hợp kiểm toán mới `reports/sprint2-audit/SPRINT_2_AUDIT_SUMMARY.xlsx` thể hiện trạng thái `DONE` chính xác của 97 task, để nhóm trưởng cập nhật vào file chính thức.

---

### BUG-S2-04: Cảnh báo kích thước tệp bundle JavaScript (Vite Chunk Size > 500kB)
- **Mức độ nghiêm trọng:** **P3 - LOW**
- **Module:** Frontend Build Asset Optimization
- **Mô tả hiện tượng:**
  - Khi chạy `npm --prefix frontend run build`, Vite cảnh báo chunk `dist/assets/index-BelwHaJv.js` có kích thước 769.14 kB (vượt ngưỡng gợi ý 500 kB).
  - Không gây lỗi runtime hoặc lỗi build, nhưng có thể làm tăng nhẹ thời gian tải trang ban đầu trên mạng di động chậm.
- **Expected Result:** Tách nhỏ các route Admin và Customer bằng `React.lazy()` và cấu hình `rollupOptions.output.manualChunks`.
- **Actual Result:** Hiện tại toàn bộ ứng dụng được đóng gói thành một single vendor bundle.
- **Hướng khắc phục:** Đưa vào kế hoạch tối ưu hóa hiệu năng (Optimization) của Sprint 3.
