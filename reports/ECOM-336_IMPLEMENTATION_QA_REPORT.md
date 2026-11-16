# BÁO CÁO TRIỂN KHAI & KIỂM THỬ CHẤT LƯỢNG (QA REPORT) – TASK ECOM-336

## 1. Thông tin Task & Tổng quan

| Hạng mục | Chi tiết |
| :--- | :--- |
| **Dự án** | ShopMart E-Commerce Platform |
| **Thư mục dự án** | `C:\IT209\-E-COMMERCE-PLATFORM` |
| **Repository** | `Duy18ND/-E-COMMERCE-PLATFORM` |
| **Branch làm việc** | `devops-phuong` |
| **Task ID** | `ECOM-336` |
| **Tên Task** | `[FE] QA Test - UI, responsive, lỗi và tích hợp` |
| **Phân hệ / Module** | Frontend & QA (UserWeb, AdminWeb, API Integration) |
| **Epic / Feature cha** | `CUSTOMER` (Feature gốc: `ECOM-158 Voucher & mã giảm giá`) |
| **Parent Item (Cấp 2)** | `ECOM-330` – `[FE] Voucher & mã giảm giá` |
| **Tasks Frontend liên quan** | `ECOM-168` (Kho voucher & checkout), `ECOM-184` (Hiển thị điều kiện voucher & lý do không hợp lệ), `ECOM-333` (Form nhập voucher & hiển thị mức giảm), `ECOM-334` (Admin tạo/sửa/ẩn voucher), `ECOM-335` (Admin giới hạn lượt sử dụng) |
| **Tasks Backend & QA liên quan** | `ECOM-166` (Schema vouchers & usages), `ECOM-167` (API áp mã), `ECOM-182` (Lưu voucher vào order), `ECOM-183` (Giữ/hoàn lượt), `ECOM-337` (API validate mã), `ECOM-338` (API quản lý voucher), `ECOM-339` (Admin CRUD controller), `ECOM-170` (QA điều kiện & Flash Sale), `ECOM-185` (QA concurrency & limit), `ECOM-340` (QA Backend) |
| **Người phụ trách (PIC)** | Ngô Phương (`devops-phuong`) |
| **Phối hợp phát triển** | Lê Trung Chiến (Frontend), Đoàn Mạnh Duy (Backend), Trần Ngọc Linh (Backend) |
| **Trạng thái thực thi** | **HOÀN THÀNH (10/10 ECOM-336 Automated Tests PASS, 359/359 Frontend Tests PASS, Build Production PASS)** |
| **Ngày lập báo cáo** | 12/11/2026 |

---

## 2. Mô tả yêu cầu (Task Description & Acceptance Criteria)

Theo Scrum Board (`Ecommerce_Scrum_Board_Can_Bang_Lich_Thoi_Gian_4_Nguoi.xlsx`) và Master Plan (`Ecommerce_Master_Plan_Final.xlsx`), task `ECOM-336` có mô tả: **"Kiểm thử giao diện và luồng chính của chức năng"** thuộc phân hệ `[FE]` và vai trò `QA Test` cho toàn bộ nhóm tính năng Voucher & mã giảm giá:

1. **UserWeb – Kho Voucher (`/vouchers`) & Voucher của tôi (`/my-vouchers`)**:
   - Hiển thị danh sách mã giảm giá đang hoạt động với đầy đủ thông tin: mã code, loại giảm (%, tiền mặt), mức giảm, trần tối đa, đơn tối thiểu, thời hạn sử dụng, số lượt còn lại.
   - Phân loại chính xác trạng thái voucher: `ACTIVE` (đang hoạt động), `UPCOMING` (sắp diễn ra), `EXPIRED` (đã hết hạn), `SOLD_OUT` (hết lượt dùng), `INACTIVE` (tạm dừng).
   - Bộ lọc tabs đa dạng: Tất cả (`ALL`), Đang hoạt động (`ACTIVE`), Giảm % (`PERCENT`), Giảm tiền mặt (`FIXED`), Sắp hết hạn (`EXPIRING` - còn <= 7 ngày), Đã lưu (`SAVED`).
   - Ô tìm kiếm linh hoạt theo mã code hoặc tên voucher.
   - Thao tác Lưu (`saveVoucher`) / Bỏ lưu (`unsaveVoucher`), đồng bộ tức thì với `localStorage` và biểu tượng số lượng mã trên thanh điều hướng Header (`UserHeader.jsx`).
   - Phản hồi trực quan toast khi lưu mã thành công, xử lý trạng thái rỗng (empty state) và nút reset bộ lọc.

2. **UserWeb – Màn hình Thanh toán Checkout (`/checkout`)**:
   - Form nhập mã voucher trực tiếp: Kiểm tra tính hợp lệ qua `voucherService.applyCode`, hiển thị mức giảm thực tế và tổng tiền thanh toán mới `finalTotal = Math.max(0, totalPrice - discountAmount)`.
   - Bắt lỗi validation nghiêm ngặt: mã rỗng, mã không tồn tại, mã hết hạn, mã chưa bắt đầu, mã hết lượt, mã tạm dừng, và đơn hàng chưa đạt giá trị tối thiểu `minOrderValue`.
   - Modal chọn nhanh voucher từ danh sách đã lưu (`VoucherPickerModal`): Phân định trực quan mã nào đủ điều kiện (`canApply`) và mã nào không đủ điều kiện (kèm lý do không hợp lệ cụ thể như "Cần đơn tối thiểu ...đ", "Đã hết hạn", "Hết lượt dùng").
   - Thao tác gỡ bỏ voucher (`handleRemoveVoucher`) với thông báo toast phản hồi, hoàn trả tổng tiền ban đầu.
   - Tương tác với Flash Sale: Sử dụng `totalPrice` (sau khi đã trừ ưu đãi Flash Sale) làm căn cứ kiểm tra `minOrderValue`, ngăn chặn gian lận giá.

3. **AdminWeb – Quản trị Voucher (`/admin/vouchers`)**:
   - 4 Thẻ KPI thống kê: Tổng mã, Đang hoạt động, Đã hết hạn/Hết lượt, Tạm dừng.
   - Bộ lọc tích hợp: Ô tìm kiếm, Dropdown trạng thái, Dropdown loại giảm giá, hiển thị tỷ lệ số mã khớp / tổng số mã.
   - Phân trang chuẩn nghiệp vụ với `Pagination` (5, 10, 20 mã/trang).
   - Form Thêm mới: Validation mã (tự động UPPERCASE, chống trùng lặp), tên chương trình, giá trị giảm > 0 (% <= 100), số lượng > 0, ngày bắt đầu và kết thúc (kết thúc >= bắt đầu).
   - Form Chỉnh sửa: Chặn giảm số lượng phát hành nhỏ hơn số lượt đã dùng (`quantity >= usedQuantity`).
   - Bật / Tắt trạng thái nhanh (`toggleStatus`) cập nhật giao diện lập tức.
   - Xóa voucher an toàn qua Modal xác nhận (cảnh báo đỏ nếu mã đã từng có lượt sử dụng), tuyệt đối không dùng `window.confirm`.
   - Modal xem chi tiết voucher đầy đủ thông tin.

4. **Kiểm thử Responsive & Thiết kế Giao diện (UI)**:
   - Tương thích đa thiết bị: Desktop (>= 1200px), Tablet (768px - 991px), Mobile (375px - 640px).
   - Không bị tràn màn hình ngang (`overflow-x`), bảng dữ liệu Admin có `table-responsive` cuộn ngang riêng biệt.

5. **Tích hợp API Backend & Cơ chế Dự phòng (Fallback)**:
   - Kết nối chuẩn xác REST API Backend `com.ecommerce.order.controller.VoucherController` & `AdminVoucherController`.
   - Fallback an toàn qua `localStorage` khi Backend offline mà không làm gián đoạn trải nghiệm người dùng.
   - Chuẩn hóa ranh giới ngày giờ Việt Nam (`GMT+7`) qua `parseLocalDateBoundary`.
   - Bảo vệ phân quyền truy cập: Route `/admin/vouchers` được bảo vệ bởi `AdminRoute` (chỉ tài khoản có `ROLE_ADMIN` mới được truy cập).

---

## 3. Hiện trạng ban đầu trước khi thực hiện ECOM-336

1. **Về mã nguồn Frontend**:
   - Các trang `Vouchers.jsx`, `MyVouchers.jsx`, `AdminVouchers.jsx`, và component `VoucherPickerModal` trong `Checkout.jsx` đã được phát triển trong các task `ECOM-168`, `ECOM-184`, `ECOM-333`, `ECOM-334`, `ECOM-335`.
   - Tuy nhiên, chưa có bộ kiểm thử tự động chuyên biệt cho phân hệ Frontend của Voucher để kiểm tra toàn bộ các khía cạnh UI, responsive, validation biên, và tích hợp luồng chính.
   - Form chỉnh sửa trong `AdminVouchers.jsx` chưa có validation trực tiếp ở tầng Frontend để chặn Admin giảm số lượng phát hành nhỏ hơn số lượt đã sử dụng (`quantity < usedQuantity`), dẫn đến nếu Backend offline thì dữ liệu fallback có thể bị sai lệch.
   - Tại màn hình `Checkout.jsx`, hàm `handleRemoveVoucher` chỉ gỡ state mà chưa có thông báo toast phản hồi cho người dùng.

2. **Về cấu hình kiểm thử**:
   - `frontend/package.json` chưa tích hợp suite kiểm thử QA Frontend cho Voucher `ECOM-336`.

---

## 4. Các file đã thêm hoặc sửa đổi

| File | Hành động | Nội dung thay đổi |
| :--- | :---: | :--- |
| `frontend/tests/ecom336.voucher_fe_qa.test.mjs` | **Thêm mới** | Bộ kiểm thử tự động toàn diện gồm 10 Test Cases (TC-336-01 đến TC-336-10) kiểm tra UI, responsive, validation, lỗi và tích hợp Voucher |
| `frontend/src/pages/admin/AdminVouchers.jsx` | **Chỉnh sửa** | Bổ sung validation kiểm tra `quantity >= usedQuantity` khi chỉnh sửa voucher và validate `maxDiscount > 0` |
| `frontend/src/pages/customer/Checkout.jsx` | **Chỉnh sửa** | Bổ sung thông báo toast `notify.info('Đã gỡ bỏ mã giảm giá.')` khi khách hàng nhấn gỡ bỏ voucher |
| `frontend/package.json` | **Chỉnh sửa** | Đăng ký `tests/ecom336.voucher_fe_qa.test.mjs` vào script kiểm thử chuẩn `npm test` |
| `reports/ECOM-336_IMPLEMENTATION_QA_REPORT.md` | **Thêm mới** | Báo cáo kỹ thuật triển khai và nghiệm thu QA toàn diện |

---

## 5. Chức năng đã triển khai & Hoàn thiện

### 5.1. UserWeb – Kho Voucher & Quản lý Voucher cá nhân
- **Trang Kho voucher (`/vouchers`)**:
  - Tải danh sách voucher qua `voucherService.getPublicVouchers()` (kết nối endpoint `GET /api/v1/vouchers/active`).
  - Render thẻ voucher với layout `VoucherCard` sử dụng CSS Grid `repeat(auto-fill, minmax(min(280px, 100%), 1fr))` chống tràn mobile.
  - Phân loại 5 trạng thái hiển thị bằng badge màu sắc:
    - `ACTIVE`: Xanh lá (`#16a34a`), nút "🔖 Lưu mã" hoặc "✓ Đã lưu".
    - `UPCOMING`: Vàng cam (`#d97706`), nhãn "Sắp diễn ra".
    - `EXPIRED`: Xám (`#94a3b8`), nhãn "Đã hết hạn".
    - `SOLD_OUT`: Tím (`#7c3aed`), nhãn "Đã hết lượt".
    - `INACTIVE`: Xám nhạt (`#94a3b8`), nhãn "Không khả dụng".
  - Bộ lọc 6 tabs (`ALL`, `ACTIVE`, `PERCENT`, `FIXED`, `EXPIRING`, `SAVED`) kèm ô tìm kiếm theo chuỗi con.
  - Thông báo Toast cố định góc màn hình khi người dùng bấm Lưu mã.
- **Trang Voucher của tôi (`/my-vouchers`)**:
  - Lấy danh sách ID đã lưu từ `localStorage` (`app_user_saved_vouchers` / `shopmart_saved_vouchers`).
  - Lọc theo 3 tab trạng thái: "Có thể sử dụng", "Sắp hết hạn", "Đã hết hạn / Hết lượt".
  - Nút "Sử dụng ngay →" dẫn thẳng tới `/checkout`.

### 5.2. UserWeb – Áp dụng Voucher tại Checkout
- **Nhập mã thủ công**:
  - Input mã voucher tự động chuyển đổi chữ hoa.
  - Gọi `voucherService.applyCode(code, totalPrice)` để kiểm tra với Backend hoặc LocalStorage fallback.
  - Khi thành công: Hiển thị hộp thông tin xanh với mã code, mức giảm (`Tiết kiệm ...đ cho đơn hàng này`) và nút "Gỡ bỏ".
  - Khi thất bại: Hiển thị `ErrorMessage` đỏ cảnh báo lý do (mã hết hạn, đơn chưa đủ tối thiểu...).
- **Modal chọn nhanh (`VoucherPickerModal`)**:
  - Modal nổi (overlay mờ), hiển thị danh sách voucher mà người dùng đã lưu.
  - Kiểm tra điều kiện trực tiếp với giá trị đơn hàng `orderTotal` hiện tại.
  - Khóa nút chọn và hiển thị cảnh báo `⚠ Cần đơn tối thiểu ...đ` đối với voucher chưa đủ điều kiện.
  - Khi đổi ý, cho phép gỡ mã và thông báo toast `notify.info`.
- **Thứ tự tính giá khi kết hợp Flash Sale**:
  - Giá trị `totalPrice` truyền vào là tổng tiền hàng sau khi đã áp dụng giá ưu đãi Flash Sale, bảo đảm không bị lạm dụng mã giảm giá.

### 5.3. AdminWeb – Quản trị Voucher toàn diện
- **4 Thẻ thống kê KPI**:
  - Tự động tính toán từ danh sách voucher: Tổng mã, Đang hoạt động, Đã hết hạn/Hết lượt, Tạm dừng.
- **Thanh công cụ lọc và tìm kiếm (`.admin-voucher-filter-bar`)**:
  - Tìm kiếm theo mã hoặc tên voucher (real-time filter).
  - Lọc theo trạng thái và loại giảm giá.
  - Hiển thị tỷ lệ số lượng kết quả (`X / Y mã`).
- **Bảng dữ liệu & Phân trang**:
  - 8 Cột dữ liệu: Mã, Tên/Mô tả, Giá trị giảm, Điều kiện, Số lượng (kèm thanh progress bar tiến độ đã dùng/tổng), Thời gian, Trạng thái, Thao tác.
  - Phân trang với component `<Pagination />` hỗ trợ chuyển trang và thay đổi số lượng hiển thị (5, 10, 20).
- **Form Thêm mới & Chỉnh sửa an toàn**:
  - Validate mã không rỗng, tự động UPPERCASE, chặn trùng lặp.
  - Validate giá trị giảm > 0, phần trăm giảm <= 100%.
  - Validate ngày bắt đầu và kết thúc (kết thúc >= bắt đầu).
  - Validate số lượng phát hành > 0 và `quantity >= usedQuantity` khi chỉnh sửa.
  - Bật / Tắt trạng thái nhanh bằng nút Bật/Tắt (thay đổi `status` giữa `ACTIVE` và `INACTIVE`).
  - Modal xác nhận xóa an toàn (`isDeleteOpen`), hiển thị cảnh báo đặc biệt nếu mã đã có lượt dùng.

---

## 6. API & Database liên quan

### 6.1. REST API Contract Backend
| Phương thức | Endpoint | Phân quyền | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/vouchers/active` (hoặc `/api/v1/vouchers`) | `PUBLIC / USER` | Lấy danh sách voucher đang có hiệu lực |
| `POST` | `/api/v1/vouchers/apply` | `USER` | Kiểm tra và tính số tiền giảm của mã tại Checkout |
| `GET` | `/api/v1/admin/vouchers` | `ROLE_ADMIN` | Lấy toàn bộ danh sách voucher hệ thống |
| `GET` | `/api/v1/admin/vouchers/{id}` | `ROLE_ADMIN` | Lấy thông tin chi tiết một voucher |
| `POST` | `/api/v1/admin/vouchers` | `ROLE_ADMIN` | Tạo mới voucher |
| `PUT` | `/api/v1/admin/vouchers/{id}` | `ROLE_ADMIN` | Cập nhật thông tin voucher |
| `PATCH` | `/api/v1/admin/vouchers/{id}/toggle-status` | `ROLE_ADMIN` | Bật / Tắt trạng thái hoạt động của voucher |
| `DELETE` | `/api/v1/admin/vouchers/{id}` | `ROLE_ADMIN` | Xóa voucher khỏi hệ thống |

### 6.2. Cấu trúc Database liên quan (MySQL `shopmart_order_db`)
- Bảng `vouchers`:
  - `id` (BIGINT, PK, Auto Increment)
  - `code` (VARCHAR(50), UNIQUE, NOT NULL)
  - `name` (VARCHAR(255), NOT NULL)
  - `description` (TEXT)
  - `discount_type` (VARCHAR(20), `PERCENT` hoặc `FIXED`)
  - `discount_value` (DECIMAL(12,2), NOT NULL)
  - `max_discount` (DECIMAL(12,2), NULL nếu không giới hạn)
  - `min_order_value` (DECIMAL(12,2), NOT NULL, default 0)
  - `quantity` (INT, NOT NULL)
  - `used_quantity` (INT, NOT NULL, default 0)
  - `start_date` (DATETIME, NOT NULL)
  - `end_date` (DATETIME, NOT NULL)
  - `status` (VARCHAR(20), `ACTIVE` hoặc `INACTIVE`)
- Bảng `voucher_usages`:
  - `id` (BIGINT, PK, Auto Increment)
  - `voucher_id` (BIGINT, FK -> vouchers.id)
  - `user_id` (BIGINT, NOT NULL)
  - `order_id` (BIGINT, NOT NULL)
  - `used_at` (DATETIME, NOT NULL)

---

## 7. Chi tiết Test Cases & Kết quả Thực tế

Bộ kiểm thử tự động `frontend/tests/ecom336.voucher_fe_qa.test.mjs` được xây dựng và thực thi thành công 100%:

| Test Case | Phạm vi kiểm thử | Mục tiêu kiểm tra | Kết quả |
| :--- | :--- | :--- | :---: |
| **TC-336-01** | Kho voucher (`/vouchers`) | Hiển thị đầy đủ thông tin voucher (loại, mức giảm, trần tối đa, đơn tối thiểu, số lượt còn lại) và phân loại 5 trạng thái `ACTIVE`, `UPCOMING`, `EXPIRED`, `SOLD_OUT`, `INACTIVE` qua `getVoucherStatus` | **PASS** |
| **TC-336-02** | Bộ lọc & Tìm kiếm | 6 tab lọc (`ALL`, `ACTIVE`, `PERCENT`, `FIXED`, `EXPIRING`, `SAVED`) và tìm kiếm theo mã hoặc tên voucher lọc chính xác danh sách | **PASS** |
| **TC-336-03** | Lưu / Bỏ lưu voucher | Lưu mã vào `localStorage`, bỏ lưu, chặn duplicate, phát event `app_saved_vouchers_changed` để cập nhật badge số lượng trên `UserHeader` | **PASS** |
| **TC-336-04** | Tính toán giảm giá | Áp voucher `FIXED` và `PERCENT` có trần `maxDiscount`, đảm bảo tính đúng số tiền giảm và không làm âm tổng thanh toán | **PASS** |
| **TC-336-05** | Validation Checkout | Chặn mã rỗng, mã không tồn tại, mã hết hạn, mã hết lượt, và đơn hàng chưa đạt giá trị tối thiểu `minOrderValue` | **PASS** |
| **TC-336-06** | Modal chọn nhanh | `VoucherPickerModal` phân định rõ mã đủ điều kiện và mã không đủ điều kiện (kèm lý do), hỗ trợ chọn mã và gỡ bỏ mã kèm toast notification | **PASS** |
| **TC-336-07** | Admin Dashboard | `AdminVouchers` hiển thị 4 thẻ KPI thống kê, phân trang với `Pagination` (5, 10, 20) và bộ lọc đa tiêu chí | **PASS** |
| **TC-336-08** | Admin Form Validation | Bắt lỗi mã rỗng, tên rỗng, giá trị giảm <= 0 (% > 100), số lượng <= 0, ngày kết thúc < ngày bắt đầu, chặn trùng mã và chặn giảm `quantity < usedQuantity` khi sửa; Modal xóa an toàn không dùng `window.confirm` | **PASS** |
| **TC-336-09** | Responsive Layout | Tương thích đa màn hình: Desktop (KPI 4 cột, filter bar 4 phần tử ngang), Tablet (KPI 2x2, search full width hàng 1), Mobile (xếp chồng 1 cột dọc, bảng có `table-responsive` cuộn ngang riêng biệt) | **PASS** |
| **TC-336-10** | Tích hợp Backend & Fallback | `voucherService.js` map 100% đúng contract các endpoint Backend (`/vouchers/active`, `/vouchers/apply`, `/admin/vouchers`), fallback an toàn qua LocalStorage, xử lý date boundary GMT+7 và bảo vệ route `AdminRoute` | **PASS** |

---

## 8. Build & Test Logs Thực tế

### 8.1. Kết quả thực thi Node.js Test Runner toàn bộ Frontend
```bash
> ecommerce-frontend@0.1.0 test
> node --experimental-default-type=module --test tests/auth.qa.test.mjs tests/ecom106.qa.test.mjs tests/ecom226_227.qa.test.mjs tests/sprint1.admin_inventory.qa.test.mjs tests/ecom291.qa.test.mjs tests/notification_system.qa.test.mjs tests/admin_orders_layout.qa.test.mjs tests/ecom165.flashsale.qa.test.mjs tests/ecom170.voucher_flashsale.qa.test.mjs tests/ecom185.voucher_concurrency.qa.test.mjs tests/ecom311.timeline.qa.test.mjs tests/ecom173.timeline.qa.test.mjs tests/ecom188.order_detail.qa.test.mjs tests/ecom257.cart.qa.test.mjs tests/ecom266.checkout.qa.test.mjs tests/ecom312.tracking.qa.test.mjs tests/ecom260.cart_be.qa.test.mjs tests/ecom269.checkout_be.qa.test.mjs tests/ecom275.profile_order_history.qa.test.mjs tests/ecom278.profile_order_be.qa.test.mjs tests/ecom284.inventory.qa.test.mjs tests/ecom293.admin_orders.qa.test.mjs tests/ecom303.flashsale_fe.qa.test.mjs tests/ecom313.status_sync.qa.test.mjs tests/ecom314.tracking_fe.qa.test.mjs tests/ecom318.tracking_be.qa.test.mjs tests/ecom324.customer_statistics_fe.qa.test.mjs tests/ecom336.voucher_fe_qa.test.mjs

TAP version 13
...
# Subtest: TC-336-01: Kho voucher (/vouchers) hiển thị đầy đủ thông tin chi tiết của từng mã giảm giá và tính toán số ngày còn lại chuẩn xác
ok 124 - TC-336-01: Kho voucher (/vouchers) hiển thị đầy đủ thông tin chi tiết của từng mã giảm giá và tính toán số ngày còn lại chuẩn xác
# Subtest: TC-336-02: Bộ lọc tabs và ô tìm kiếm tại trang Kho voucher hoạt động chính xác với mọi tiêu chí
ok 125 - TC-336-02: Bộ lọc tabs và ô tìm kiếm tại trang Kho voucher hoạt động chính xác với mọi tiêu chí
# Subtest: TC-336-03: Thao tác Lưu và Bỏ lưu voucher đồng bộ tức thì với localStorage và Header Navigation
ok 126 - TC-336-03: Thao tác Lưu và Bỏ lưu voucher đồng bộ tức thì với localStorage và Header Navigation
# Subtest: TC-336-04: Áp dụng mã giảm giá FIXED và PERCENT có trần maxDiscount tính toán chuẩn xác không làm âm tổng thanh toán
ok 127 - TC-336-04: Áp dụng mã giảm giá FIXED và PERCENT có trần maxDiscount tính toán chuẩn xác không làm âm tổng thanh toán
# Subtest: TC-336-05: Checkout bắt lỗi validation chặt chẽ khi nhập mã voucher rỗng, sai mã, hết hạn, hết lượt hoặc đơn chưa đủ điều kiện tối thiểu
ok 128 - TC-336-05: Checkout bắt lỗi validation chặt chẽ khi nhập mã voucher rỗng, sai mã, hết hạn, hết lượt hoặc đơn chưa đủ điều kiện tối thiểu
# Subtest: TC-336-06: Modal VoucherPickerModal hiển thị danh sách mã đã lưu, phân định rõ ràng điều kiện áp dụng và cho phép gỡ bỏ voucher khi cần
ok 129 - TC-336-06: Modal VoucherPickerModal hiển thị danh sách mã đã lưu, phân định rõ ràng điều kiện áp dụng và cho phép gỡ bỏ voucher khi cần
# Subtest: TC-336-07: AdminVouchers hiển thị 4 thẻ KPI thống kê, hỗ trợ phân trang và bộ lọc tìm kiếm đa tiêu chí
ok 130 - TC-336-07: AdminVouchers hiển thị 4 thẻ KPI thống kê, hỗ trợ phân trang và bộ lọc tìm kiếm đa tiêu chí
# Subtest: TC-336-08: AdminVouchers validation Form chặt chẽ khi Thêm/Sửa: chặn mã trùng, chặn sửa số lượng nhỏ hơn số lượng đã dùng
ok 131 - TC-336-08: AdminVouchers validation Form chặt chẽ khi Thêm/Sửa: chặn mã trùng, chặn sửa số lượng nhỏ hơn số lượng đã dùng
# Subtest: TC-336-09: Giao diện Admin và Customer tương thích hoàn hảo trên Desktop (1200px+), Tablet (768px-991px) và Mobile (375px-640px)
ok 132 - TC-336-09: Giao diện Admin và Customer tương thích hoàn hảo trên Desktop (1200px+), Tablet (768px-991px) và Mobile (375px-640px)
# Subtest: TC-336-10: voucherService.js map 100% đúng contract các endpoint Backend và có cơ chế fallback an toàn qua LocalStorage
ok 133 - TC-336-10: voucherService.js map 100% đúng contract các endpoint Backend và có cơ chế fallback an toàn qua LocalStorage
...
1..151
# tests 359
# suites 20
# pass 359
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 3006.1448
```

### 8.2. Kết quả build Production (`vite build`)
```bash
> ecommerce-frontend@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 175 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.71 kB │ gzip:   0.44 kB
dist/assets/index-CxLaaq15.css   44.99 kB │ gzip:   8.92 kB
dist/assets/index-DTNnagCM.js   830.18 kB │ gzip: 219.24 kB
✓ built in 2.93s
```

---

## 9. Lỗi còn tồn tại (Known Issues / Limitations)

- **Không có lỗi tồn tại (0 Bugs / 0 Failures)**. Toàn bộ 359 test cases kiểm thử tự động của Frontend đều vượt qua.
- **Lưu ý triển khai thực tế**: Khi kết nối trực tiếp với cụm Microservices thật trên môi trường VPS/Production, API Gateway cần cấu hình chuyển tiếp đầy đủ header `X-User-Id` và `X-User-Roles` từ JWT token xuống `order-service` để kích hoạt cơ chế lọc voucher theo cá nhân người dùng (`getAvailableVouchersForUser`).

---

## 10. Đánh giá Tiêu chí Nghiệm thu (Acceptance Criteria Evaluation)

| Tiêu chí nghiệm thu | Trạng thái | Ghi chú đánh giá thực tế |
| :--- | :---: | :--- |
| **1. Giao diện Kho voucher & Voucher của tôi** | **ĐẠT (PASS)** | Hiển thị đầy đủ thông tin, 5 trạng thái, 6 tabs bộ lọc, tìm kiếm, lưu/bỏ lưu và đồng bộ Header badge |
| **2. Tích hợp áp mã tại Checkout** | **ĐẠT (PASS)** | Form nhập mã trực tiếp, Modal chọn mã đã lưu, hiển thị lý do không hợp lệ, tính đúng tiền giảm, không âm tiền, cho phép gỡ bỏ |
| **3. Quản trị Admin Voucher** | **ĐẠT (PASS)** | 4 Thẻ KPI, bộ lọc đa tiêu chí, phân trang, CRUD form validation (chống trùng mã, chống giảm số lượng nhỏ hơn số đã dùng), toggle status, Modal xóa an toàn |
| **4. Tính tương thích Responsive** | **ĐẠT (PASS)** | Hoạt động trơn tru trên Desktop (1200px+), Tablet (768px-991px), Mobile (375px-640px) với `table-responsive` chống tràn |
| **5. Kết nối REST API & Fallback** | **ĐẠT (PASS)** | Map đúng 100% endpoint Backend, cơ chế dự phòng LocalStorage an toàn khi offline, chuẩn hóa múi giờ GMT+7, bảo vệ route `AdminRoute` |
| **6. Kiểm thử tự động & Build** | **ĐẠT (PASS)** | 10/10 test cases ECOM-336 PASS, 359/359 test cases tổng Frontend PASS, `vite build` 0 cảnh báo lỗi cú pháp |

---

## 11. Minh họa Cấu trúc Giao diện (ASCII & Flow Wireframe)

### 11.1. Luồng chọn và áp dụng Voucher tại Checkout
```
+--------------------------------------------------------------------------+
|                            CHECKOUT PAGE                                 |
+--------------------------------------------------------------------------+
|  [THÔNG TIN GIAO HÀNG]           |  [TỔNG TẮT ĐƠN HÀNG]                   |
|  Người nhận: Nguyễn Văn A        |  Tạm tính (2 món):       500.000đ     |
|  SĐT: 0912 345 678               |  Giảm Flash Sale:        -50.000đ     |
|  Địa chỉ: 123 Cầu Giấy, HN       |  Phí vận chuyển:              0đ      |
|                                  |  ------------------------------------  |
|  [MÃ GIẢM GIÁ / VOUCHER]         |  Đơn hàng sau sale:      450.000đ     |
|  +-----------------------+-----+ |                                        |
|  | GIAM50K               | ÁP  | |  [ÁP DỤNG THÀNH CÔNG]                  |
|  +-----------------------+-----+ |  🎫 Voucher (GIAM50K):    -50.000đ     |
|  [ Hoặc chọn từ 3 mã đã lưu 🎟️ ]  |  ------------------------------------  |
|                                  |  TỔNG THANH TOÁN:        400.000đ     |
|  [x] COD  ( ) Online Payment     |  [  ĐẶT HÀNG NGAY (400.000đ)  ]       |
+--------------------------------------------------------------------------+
```

### 11.2. Màn hình Quản trị Admin Voucher (`/admin/vouchers`)
```
+--------------------------------------------------------------------------+
| [ADMIN] QUẢN LÝ MÃ GIẢM GIÁ                       [ + Thêm mã mới ]      |
+--------------------------------------------------------------------------+
| [ 🎫 Tổng mã: 12 ] [ ✅ Hoạt động: 8 ] [ ⏰ Hết hạn: 3 ] [ ⏸️ Tạm dừng: 1 ]|
+--------------------------------------------------------------------------+
| [🔍 Tìm theo mã hoặc tên...  ] [ Tất cả trạng thái v ] [ Tất cả loại v ] |
+--------------------------------------------------------------------------+
| MÃ        | TÊN CHƯƠNG TRÌNH | GIÁ TRỊ | ĐIỀU KIỆN | ĐÃ DÙNG | HẠN DÙNG  | THAO TÁC |
| GIAM50K   | Giảm 50K cho đơn | 50.000đ | Đơn 300K  | [== 12/50] | 30/11/2026| Xem Sửa Bật Xóa |
| FREESHIP  | Miễn phí ship    | 30.000đ | Đơn 200K  | [==== 45/50]| 15/11/2026| Xem Sửa Bật Xóa |
+--------------------------------------------------------------------------+
| Hiển thị 1 - 10 trong 12 mã              < Trang Trước [ 1 ] 2 Trang Sau >|
+--------------------------------------------------------------------------+
```
