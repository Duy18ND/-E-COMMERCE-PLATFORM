# BÁO CÁO NGHIỆM THU HOÀN THÀNH TASK ECOM-173
## [FE] TIMELINE THEO DÕI ĐƠN HÀNG TỪ XÁC NHẬN ĐẾN ĐÃ GIAO

**Dự án:** ShopMart E-Commerce Platform  
**Sprint:** Sprint 2  
**Epic:** CUSTOMER (Parent item: `ECOM-308 – [FE] Theo dõi đơn hàng chi tiết`)  
**Người phụ trách (PIC):** Ngô Phương (DevOps & QA Lead hỗ trợ Frontend để cân bằng giờ làm)  
**Nhánh Git:** `devops-phuong`  
**Ngày hoàn thành:** 05/11/2026  
**Trạng thái Scrum Board:** **DONE (100% Hoàn thành)**  

---

## 1. TÊN TASK VÀ MỤC TIÊU

- **Mã Task:** `ECOM-173`
- **Tên Task:** `[FE] Timeline theo dõi đơn hàng từ xác nhận đến đã giao`
- **Mục tiêu:**
  - Xây dựng và hoàn thiện Component Timeline/Stepper theo dõi toàn diện tiến trình đơn hàng từ khi tạo, xác nhận cho tới khi giao thành công.
  - Phân định rõ ràng các trạng thái bước: Đã hoàn thành (Completed), Đang diễn ra (Active/Current), Chưa diễn ra (Future), và Hủy/Thất bại (Cancelled/Failed).
  - Kết nối với Backend API `ECOM-315` (`GET /api/v1/orders/{id}/history`) để lấy dữ liệu nhật ký sự kiện thực tế.
  - Xử lý các tình huống đặc biệt: Đơn hủy (`CANCELLED`), thất bại (`FAILED`), hoàn tiền (`REFUNDED`), tải trang (Skeleton loading), dữ liệu trống (Empty state), lỗi kết nối kèm nút Thử lại (Retry), và bảo vệ quyền riêng tư chống lỗ hổng IDOR (HTTP 403 Forbidden).
  - Tối ưu hóa hiển thị Responsive trên đa thiết bị (Desktop, Tablet, Mobile) không vỡ khung layout.

---

## 2. EPIC VÀ SPRINT

- **Epic:** `CUSTOMER` (Parent Epic: `ECOM-308 [FE] Theo dõi đơn hàng chi tiết`)
- **Sprint:** `SPRINT 2`
- **Mức độ ưu tiên:** `High (P1)`
- **Thời gian ước tính (Estimate):** 3.0 giờ
- **Thời gian thực tế (Actual):** 3.0 giờ
- **Phân công theo Scrum Board:** Ngô Phương tiếp nhận từ dữ liệu nguồn phân bổ để hỗ trợ Frontend và cân bằng tải công việc của nhóm.

---

## 3. ACCEPTANCE CRITERIA (TIÊU CHÍ NGHIỆM THU)

| STT | Mã AC | Nội dung tiêu chí nghiệm thu | Trạng thái |
|:---:|:---:|:---|:---:|
| 1 | **AC-173-01** | **Chuỗi Stepper chuẩn 5 bước:** Biểu diễn trực quan đầy đủ từ xác nhận đến đã giao: Đặt hàng (`PENDING`) ➔ Đã xác nhận (`CONFIRMED`) ➔ Chuẩn bị hàng (`PROCESSING`) ➔ Vận chuyển (`SHIPPING`) ➔ Giao thành công (`DELIVERED`/`COMPLETED`). | **PASS** |
| 2 | **AC-173-02** | **Phân loại 4 nhóm trạng thái màu sắc:**<br>- *Completed:* Nền xanh nhạt `#ecfdf5`, viền xanh lục `#10b981`, icon checkmark `✓`.<br>- *Current/Active:* Nền `#eff6ff`, viền xanh dương `#2563eb`, vòng ring highlight `0 0 0 4px rgba(37, 99, 235, 0.15)`.<br>- *Future:* Màu xám trung tính `#cbd5e1`/`#f1f5f9`.<br>- *Cancelled/Failed:* Nền đỏ `#fef2f2`, viền đỏ `#ef4444`, icon `❌`/`⚠️`. | **PASS** |
| 3 | **AC-173-03** | **Định dạng thời gian chuẩn tiếng Việt:** Mọi mốc thời gian hiển thị theo định dạng `dd/MM/yyyy HH:mm:ss` thông qua hàm `formatTimelineDate` sử dụng locale `vi-VN`. | **PASS** |
| 4 | **AC-173-04** | **Dòng thời gian chi tiết (Audit Log - Tầng 2):** Hiển thị danh sách dọc theo thứ tự thời gian tăng dần (`createdAt ASC`), bao gồm badge vai trò người thực hiện (`Admin`, `Khách hàng`, `Hệ thống`), mô tả trạng thái và ghi chú (note). | **PASS** |
| 5 | **AC-173-05** | **Xử lý đơn hàng bị HỦY (`CANCELLED`):** Ngắt chuỗi tiến trình ngay tại mốc Hủy với màu đỏ cảnh báo, không suy diễn hoặc vẽ tiếp các bước giao hàng sau đó. Hiển thị thông báo lý do hủy. | **PASS** |
| 6 | **AC-173-06** | **Tích hợp API Backend ECOM-315:** Gọi qua `orderService.getOrderStatusHistory(orderId)` tới endpoint `GET /api/v1/orders/{id}/history`. | **PASS** |
| 7 | **AC-173-07** | **Bảo mật phân quyền & Chống IDOR:** Bắt mã lỗi HTTP `403 Forbidden` khi người dùng cố truy cập lịch sử đơn hàng của người khác, hiển thị banner bảo mật rõ ràng, không làm lộ dữ liệu. | **PASS** |
| 8 | **AC-173-08** | **Xử lý các trạng thái giao diện:** Hỗ trợ Loading dạng Skeleton Animation (`pulse`), Empty state khi chưa có lịch sử, Error state kèm nút "🔄 Thử lại". | **PASS** |
| 9 | **AC-173-09** | **Responsive đa thiết bị:** Media query `@media (max-width: 640px)` chuyển Stepper từ dạng ngang sang dạng dọc (Vertical Stepper), không tràn viền, không tạo cuộn ngang toàn trang. | **PASS** |
| 10 | **AC-173-10** | **Không dùng alert()/confirm():** Tương thích 100% với Notification System của dự án, hỗ trợ prop `compact` để nhúng vào modal Admin. | **PASS** |

---

## 4. TÌNH TRẠNG TRƯỚC KHI TRIỂN KHAI

1. **Giao diện người dùng:**
   - Trước khi có ECOM-173, khách hàng chỉ nhìn thấy một dòng trạng thái text hoặc badge đơn giản, không hình dung được đơn hàng đang ở công đoạn nào trong quy trình từ xác nhận đến giao hàng.
   - Không có giao diện trực quan thể hiện sự khác biệt giữa các bước đã xong, đang xử lý và chưa tới.
2. **Khả năng phản ánh dữ liệu lịch sử:**
   - Chưa có component Stepper 2 tầng (Tầng 1 Stepper tổng quan + Tầng 2 Audit log chi tiết).
   - Khi đơn bị hủy, hệ thống chưa có cơ chế ngắt chuỗi bước thông minh và hiển thị cảnh báo riêng.
3. **Bảo mật IDOR:**
   - Chưa có xử lý đặc thù cho lỗi 403 Forbidden khi tải lịch sử trạng thái đơn hàng.

---

## 5. CÁC FILE ĐÃ TẠO HOẶC SỬA

| STT | Đường dẫn File | Loại thay đổi | Chi tiết nội dung |
|:---:|:---|:---:|:---|
| 1 | `frontend/src/components/order/OrderTimeline.jsx` | **Cập nhật** | Hoàn thiện Component OrderTimeline chuẩn ECOM-173, sửa logic index cho `PAID`/`COMPLETED`, tích hợp alias, tối ưu hiển thị 4 nhóm màu |
| 2 | `frontend/src/services/orderService.js` | **Cập nhật** | Hoàn thiện hàm `getOrderStatusHistory` và `getOrderById`, bổ sung cơ chế bắt và ném lỗi 403 Forbidden trực tiếp |
| 3 | `frontend/tests/ecom173.timeline.qa.test.mjs` | **Tạo mới** | Bộ kiểm thử tự động 16 Test Cases (TC-173-01 ➔ TC-173-16) cho ECOM-173 |
| 4 | `frontend/package.json` | **Cập nhật** | Bổ sung `tests/ecom173.timeline.qa.test.mjs` vào lệnh test của dự án |
| 5 | `reports/ECOM-173_IMPLEMENTATION_REPORT.md` | **Tạo mới** | Báo cáo nghiệm thu hoàn chỉnh task ECOM-173 |

---

## 6. CHI TIẾT CHỨC NĂNG VÀ API

### 6.1. Kiến trúc luồng dữ liệu ECOM-173
```mermaid
flowchart TD
    Client["Khách hàng / Quản trị viên"] -->|Truy cập chi tiết đơn hàng| OrderDetail["Trang OrderDetail / Modal Admin"]
    OrderDetail -->|Truyền orderId, currentStatus, historyData| OrderTimeline["OrderTimeline.jsx"]
    OrderTimeline -->|Gọi orderService.getOrderStatusHistory(orderId)| API["orderService.js"]
    API -->|GET /api/v1/orders/{id}/history| Gateway["Spring Cloud Gateway :8080"]
    Gateway -->|Header X-User-Id, X-User-Roles| OrderService["Order Service :8083"]
    OrderService -->|Kiểm tra quyền & truy vấn order_status_history| MySQL[(order_db)]
    MySQL -->|Danh sách mốc thời gian tăng dần| OrderService
    OrderService -->|ApiResponse<List<OrderStatusHistoryResponse>>| OrderTimeline
    OrderTimeline -->|Render Tầng 1| Stepper["Stepper Tiến trình (5 bước chuẩn / Đơn hủy)"]
    OrderTimeline -->|Render Tầng 2| AuditList["Nhật ký trạng thái chi tiết (vi-VN, Actor, Note)"]
```

### 6.2. Đặc tả API tích hợp
- **Endpoint:** `GET /api/v1/orders/{id}/history`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer <JWT>`, `X-User-Id`, `X-User-Roles` (do Gateway tự động đính kèm).
- **Mã phản hồi:**
  - `200 OK`: Trả về mảng danh sách `OrderStatusHistoryResponse` sắp xếp theo thời gian tăng dần.
  - `403 Forbidden`: Người dùng không có quyền xem đơn hàng của người khác (Chống tấn công IDOR).
  - `404 Not Found`: Đơn hàng không tồn tại.

---

## 7. TEST CASES (MA TRẬN KIỂM THỬ)

Bộ kiểm thử `frontend/tests/ecom173.timeline.qa.test.mjs` bao gồm **16 Test Cases**:

| Test Case ID | Tên kịch bản kiểm thử | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái |
|:---|:---|:---|:---|:---:|
| **TC-173-01** | Tồn tại component OrderTimeline với 5 bước chuẩn | Định nghĩa đầy đủ `STANDARD_STEPS`: PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED | Khớp 100% | **PASS** |
| **TC-173-02** | Phân loại 4 nhóm trạng thái màu sắc và biểu tượng | Đầy đủ mã màu chuẩn: Xanh lá (Completed), Xanh dương (Active), Xám (Future), Đỏ (Cancelled/Failed) | Khớp 100% | **PASS** |
| **TC-173-03** | Định dạng ngày giờ chuẩn tiếng Việt (`vi-VN`) | Hàm `formatTimelineDate` sử dụng locale `vi-VN` với định dạng ngày giờ | Khớp 100% | **PASS** |
| **TC-173-04** | Hiển thị mô tả, người thực hiện (actorRole), ghi chú | Render đúng `statusDescription`, `actorRole`, `note` | Khớp 100% | **PASS** |
| **TC-173-05** | Xử lý đơn hàng bị HỦY (`CANCELLED`) | Ngắt chuỗi tiến trình, gắn bước Hủy màu đỏ, hiển thị banner cảnh báo | Khớp 100% | **PASS** |
| **TC-173-06** | Xử lý trạng thái FAILED và REFUNDED trên Stepper | Thêm bước thất bại hoặc hoàn tiền tương ứng | Khớp 100% | **PASS** |
| **TC-173-07** | Xử lý Loading state dạng Skeleton Animation | Render khối skeleton loading với animation `pulse` | Khớp 100% | **PASS** |
| **TC-173-08** | Xử lý Empty state khi không có lịch sử trạng thái | Hiển thị thông báo "Chưa có dữ liệu lịch sử trạng thái" | Khớp 100% | **PASS** |
| **TC-173-09** | Xử lý Error state và nút Thử lại (Retry) | Hiển thị khung cảnh báo lỗi và nút "🔄 Thử lại" gọi lại API | Khớp 100% | **PASS** |
| **TC-173-10** | Tích hợp API Backend ECOM-315 trong orderService | Tồn tại hàm `getOrderStatusHistory` kết nối endpoint `/orders/${id}/history` | Khớp 100% | **PASS** |
| **TC-173-11** | Chống IDOR và bảo vệ phân quyền (403 Forbidden) | Bắt mã lỗi 403 và hiển thị cảnh báo bảo mật IDOR | Khớp 100% | **PASS** |
| **TC-173-12** | Hỗ trợ Responsive đa thiết bị (mobile < 640px) | Có media query `@media (max-width: 640px)` chuyển sang cột dọc | Khớp 100% | **PASS** |
| **TC-173-13** | Ánh xạ chính xác trạng thái alias PAID và COMPLETED | Bảng `STEP_ORDER_INDEX` ánh xạ PAID ➔ index 1, COMPLETED ➔ index 4 | Khớp 100% | **PASS** |
| **TC-173-14** | Không dùng alert()/confirm()/prompt() | Kiểm tra toàn bộ mã nguồn không chứa các popup native | Khớp 100% | **PASS** |
| **TC-173-15** | Sắp xếp các mốc lịch sử theo thời gian tăng dần | Đảm bảo sắp xếp tăng dần theo `createdAt` | Khớp 100% | **PASS** |
| **TC-173-16** | Hỗ trợ thuộc tính compact cho modal quản trị Admin | Nhận prop `compact` và thu gọn padding/font size | Khớp 100% | **PASS** |

---

## 8. KẾT QUẢ KIỂM THỬ THỰC TẾ

1. **Kiểm thử tự động Frontend (`npm test`):**
   - Bộ test `tests/ecom173.timeline.qa.test.mjs`: **16/16 test cases PASS (100%)**.
   - Tổng thể toàn bộ frontend: **117/117 test cases PASS (100%)**, 3 test suites.
2. **Kiểm tra cú pháp & import (`npm run lint`):**
   - `[LINT PASS] Đã kiểm tra 85 file nguồn trong src/ — 0 lỗi cú pháp/import`.
3. **Kiểm tra đóng gói sản phẩm (`npm run build`):**
   - Vite Production Build thành công 100% (`built in 20.84s`).

---

## 9. NHỮNG LỖI ĐÃ KHẮC PHỤC

1. **Khắc phục lỗi tính `activeIndex` khi gặp trạng thái `PAID` hoặc `COMPLETED`:**
   - *Vấn đề:* Trước đây, hàm tính `activeIndex` sử dụng `stepperSteps.findIndex((s) => s.key === activeStatus)`. Khi trạng thái đơn hàng là `PAID` hoặc `COMPLETED` (không nằm trực tiếp trong 5 key chính của `stepperSteps`), `findIndex` trả về `-1`, dẫn tới `activeIndex` bị gán về `0` (quay lại bước Đặt hàng PENDING).
   - *Khắc phục:* Bổ sung fallback đối chiếu qua bảng `STEP_ORDER_INDEX[activeStatus]`, giúp đơn hàng `PAID` hiển thị đúng mốc xác nhận (index 1) và `COMPLETED` hiển thị đúng mốc giao hàng thành công (index 4).
2. **Khắc phục lỗi lấy mốc thời gian hoàn thành của alias state:**
   - *Vấn đề:* Mốc thời gian hoàn thành của `DELIVERED` không lấy được nếu Backend ghi nhận sự kiện dưới tên `COMPLETED`.
   - *Khắc phục:* Mở rộng điều kiện trong `getStepCompletedTime` để chấp nhận alias tương ứng.
3. **Bảo mật IDOR trong `orderService.js`:**
   - *Vấn đề:* Khi gọi `getOrderStatusHistory` hoặc `getOrderById` bị trả về mã 403 Forbidden (người dùng cố tình xem đơn của người khác), hàm fallback cục bộ trước đây có thể vô tình lấy dữ liệu mẫu.
   - *Khắc phục:* Kiểm tra nghiêm ngặt `if (err.response?.status === 403) throw err;` để ném lỗi ngay lập tức về giao diện hiển thị thông báo chặn truy cập.

---

## 10. NHỮNG HẠN CHẾ CÒN LẠI

- Hiện tại hệ thống cập nhật Timeline khi khách hàng mở trang hoặc nhấn nút "🔄 Cập nhật". Trong tương lai có thể bổ sung WebSocket / SSE (Server-Sent Events) để cập nhật realtime mà không cần người dùng tải lại trang.

---

## 11. TRẠNG THÁI PASS/FAIL TỪNG TIÊU CHÍ

| STT | Tiêu chí đánh giá | Trạng thái | Ghi chú |
|:---:|:---|:---:|:---|
| 1 | Stepper 5 bước chuẩn từ xác nhận đến giao hàng | **PASS** | Đầy đủ 5 mốc, icon và mô tả trực quan |
| 2 | Phân loại màu sắc theo 4 nhóm trạng thái | **PASS** | Đã hoàn thành (xanh lá), Hiện tại (xanh dương), Chưa đến (xám), Hủy (đỏ) |
| 3 | Định dạng ngày giờ tiếng Việt vi-VN | **PASS** | Hiển thị chuẩn `dd/MM/yyyy HH:mm:ss` |
| 4 | Dòng thời gian Audit Log chi tiết | **PASS** | Đầy đủ badge Admin/Khách hàng, mô tả và ghi chú |
| 5 | Xử lý ngắt chuỗi khi đơn bị HỦY | **PASS** | Dừng tại mốc Hủy, không suy diễn mốc tiếp theo |
| 6 | Kết nối API Backend ECOM-315 | **PASS** | Tích hợp thành công qua `orderService.getOrderStatusHistory` |
| 7 | Chống lỗ hổng IDOR (403 Forbidden) | **PASS** | Chặn đứng hành vi xem trộm đơn và cảnh báo rõ ràng |
| 8 | Xử lý Loading, Empty, Error state | **PASS** | Skeleton pulse mượt mà, hỗ trợ nút Retry |
| 9 | Responsive trên thiết bị di động | **PASS** | Chuyển sang Vertical Stepper trên màn hình < 640px |
| 10 | Tuân thủ kiến trúc và kiểm thử tự động | **PASS** | 16/16 Test Cases PASS, Lint PASS, Build PASS |

**KẾT LUẬN CHUNG:** Task **ECOM-173** đạt kết quả **PASS 100%**, sẵn sàng đóng task trên Scrum Board Sprint 2.
