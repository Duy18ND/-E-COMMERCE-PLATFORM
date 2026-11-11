# BÁO CÁO KIỂM THỬ CHẤT LƯỢNG (QA REPORT) — ECOM-339

- **Task ID:** `ECOM-339` (Row 171 trên Scrum Board / `Base Project 20_10.xlsx`)
- **Tên Task:** `[BE] Admin tạo, sửa, ẩn voucher, giới hạn lượt sử dụng`
- **Mục mẹ (Parent Story):** `[BE] Voucher & mã giảm` (`ECOM-331`) $\rightarrow$ `Voucher & mã giảm giá`
- **Người phụ trách (PIC):** Đoàn Mạnh Duy - 28/07/2006
- **Nhánh (Branch):** `BE-Duy`
- **Trạng thái:** **SẴN SÀNG CHUYỂN SANG DONE**

---

## 1. MỤC TIÊU & PHẠM VI NGHIỆP VỤ (ECOM-339)

1. **Quản lý danh sách & chi tiết Voucher cho Quản trị viên:**
   - `GET /api/v1/admin/vouchers`: Lấy toàn bộ danh sách voucher hệ thống, sắp xếp mới nhất lên đầu.
   - `GET /api/v1/admin/vouchers/{id}`: Xem thông tin chi tiết cấu hình của một voucher.
   - Bắt buộc header `X-User-Roles` chứa quyền `ROLE_ADMIN` (so khớp chính xác, chống substring bypass).

2. **Tạo mới Voucher (`POST /api/v1/admin/vouchers`):**
   - Ràng buộc dữ liệu qua `VoucherRequest`: mã voucher (`code`), loại giảm (`PERCENT` / `FIXED`), giá trị giảm > 0, ngày bắt đầu và kết thúc (`startDate <= endDate`), số lượng phát hành (`quantity >= 1`).
   - Chặn trùng mã voucher không phân biệt hoa thường (`DuplicateResourceException` $\rightarrow$ HTTP `409 Conflict`).

3. **Cập nhật Voucher (`PUT /api/v1/admin/vouchers/{id}`):**
   - Cho phép cập nhật tên, mô tả, mức giảm, giá trị đơn tối thiểu, thời hạn và số lượng.
   - Chặn trùng mã với các voucher khác đang có trong hệ thống (`existsByCodeIgnoreCaseAndIdNot`).
   - **Quy tắc nghiệp vụ bảo vệ:** Chặn không cho sửa số lượng phát hành (`quantity`) nhỏ hơn số lượt người dùng đã sử dụng thực tế (`usedQuantity`) để tránh xung đột số liệu.

4. **Ẩn / Hiện Voucher linh hoạt (`PATCH /api/v1/admin/vouchers/{id}/toggle-status`):**
   - Đảo trạng thái giữa `ACTIVE` và `INACTIVE` nhanh chóng mà không cần xóa dữ liệu.
   - Khi `INACTIVE`, voucher lập tức biến mất khỏi danh sách khách hàng và không thể áp dụng tại bước Checkout.

5. **Xóa Voucher (`DELETE /api/v1/admin/vouchers/{id}`):**
   - Xóa bỏ voucher khỏi hệ thống khi không còn sử dụng.

---

## 2. KẾT QUẢ KIỂM THỬ CHI TIẾT (TEST CASES)

| Test ID | Kịch bản kiểm thử | Kỳ vọng (Expected Result) | Thực tế (Actual Result) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **TC-339-01** | `GET /api/v1/admin/vouchers` không có `ROLE_ADMIN` | HTTP `403 Forbidden` (`Chỉ tài khoản ADMIN mới có quyền...`). | Khớp 100%. | **PASS** |
| **TC-339-02** | `GET /api/v1/admin/vouchers` có `ROLE_ADMIN` | HTTP `200 OK`, trả về danh sách voucher đầy đủ. | Khớp 100%. | **PASS** |
| **TC-339-03** | `GET /api/v1/admin/vouchers/{id}` có `ROLE_ADMIN` | HTTP `200 OK`, trả về chi tiết voucher theo ID. | Khớp 100%. | **PASS** |
| **TC-339-04** | `POST /api/v1/admin/vouchers` hợp lệ | HTTP `201 Created`, lưu voucher với `usedQuantity = 0`, `status = ACTIVE`. | Khớp 100%. | **PASS** |
| **TC-339-05** | `POST /api/v1/admin/vouchers` trùng mã voucher | HTTP `409 Conflict` (`Mã voucher '...' đã tồn tại trong hệ thống`). | Khớp 100%. | **PASS** |
| **TC-339-06** | `POST /api/v1/admin/vouchers` dữ liệu không hợp lệ (`code` rỗng, `quantity = 0`, `discountValue < 0`) | HTTP `400 Bad Request`. | Khớp 100%. | **PASS** |
| **TC-339-07** | `PUT /api/v1/admin/vouchers/{id}` hợp lệ | HTTP `200 OK`, cập nhật thành công các trường thông tin. | Khớp 100%. | **PASS** |
| **TC-339-08** | `PUT /api/v1/admin/vouchers/{id}` sửa `quantity < usedQuantity` | Ném `IllegalStateException` (`Số lượng mã không được nhỏ hơn số lượt đã dùng...`). | Khớp 100%. | **PASS** |
| **TC-339-09** | `PATCH /api/v1/admin/vouchers/{id}/toggle-status` | HTTP `200 OK`, chuyển đổi đảo trạng thái `ACTIVE` $\leftrightarrow$ `INACTIVE`. | Khớp 100%. | **PASS** |
| **TC-339-10** | `DELETE /api/v1/admin/vouchers/{id}` | HTTP `200 OK`, xóa voucher thành công. | Khớp 100%. | **PASS** |

---

## 3. TỔNG KẾT & KẾT LUẬN

- **Node.js QA Contract Test Suite (`ecom339.admin_voucher_be.qa.test.mjs`):** **7 / 7 PASS** (100%).
- **JUnit 5 Controller & Service Test Suites:** PASS 100%.
- **Đánh giá:** Task **`ECOM-339`** đã hoàn thiện toàn bộ các chức năng Admin tạo, sửa, ẩn/hiện, xóa và giới hạn lượt sử dụng voucher, phân quyền chặt chẽ.
- **Khuyến nghị:** **ĐỦ ĐIỀU KIỆN 100% ĐỂ CHUYỂN TRẠNG THÁI SANG DONE TRÊN BẢNG CÔNG VIỆC.**

