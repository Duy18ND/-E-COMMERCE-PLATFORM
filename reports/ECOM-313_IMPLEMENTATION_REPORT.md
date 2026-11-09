# BÁO CÁO NGHIỆM THU TRIỂN KHAI & KIỂM THỬ — TASK ECOM-313

**Dự án:** ShopMart E-Commerce Platform  
**Nhánh làm việc:** `devops-phuong`  
**Ngày thực hiện:** 06/11/2026  
**Người thực hiện:** NGÔ PHƯƠNG (Senior Fullstack / React / Spring Boot / QA / DevOps)

---

## 1. THÔNG TIN TASK (ĐỐI CHIẾU SCRUM BOARD & MASTER PLAN)

| Thuộc tính | Scrum Board (`SCRUM BOARD - FE BE`, Dòng 163) | Master Plan (`3. Master Plan`, Dòng 172) | Kết luận đối chiếu |
|---|---|---|---|
| **Task ID** | `ECOM-313` | `ECOM-313` | Khớp 100% |
| **Task Name** | `[FE] Đồng bộ cập nhật trạng thái Admin với trang Customer` | `[FE] Đồng bộ cập nhật trạng thái Admin với trang Customer` | Khớp 100% |
| **Epic** | `CUSTOMER` | `CUSTOMER` | Khớp 100% |
| **Feature (Mục mẹ)** | `ECOM-159` (`Theo dõi đơn hàng chi tiết`) | `ECOM-159` (`Theo dõi đơn hàng chi tiết`) | Khớp 100% |
| **Parent Task** | `ECOM-308` (`[FE] Theo dõi đơn hàng chi tiết`) | `ECOM-308` (`[FE] Theo dõi đơn hàng chi tiết`) | Khớp 100% |
| **Nguồn** | `Tách từ ECOM-174` | `Tách từ ECOM-174` | Khớp 100% |
| **Sprint** | `SPRINT 2` | `SPRINT 2` | Khớp 100% |
| **Platform** | `UserWeb, AdminWeb, API` | `UserWeb, AdminWeb, API` | Khớp 100% |
| **Description** | `Phần giao diện/tích hợp: Đồng bộ cập nhật trạng thái Admin với trang Customer` | `Phần giao diện/tích hợp: Đồng bộ cập nhật trạng thái Admin với trang Customer` | Khớp 100% |
| **Priority** | `High (P1)` | `High (P1)` | Khớp 100% |
| **Người phụ trách (PIC)** | `NGÔ PHƯƠNG` | `NGÔ PHƯƠNG` | Khớp 100% |
| **Time Estimate** | `1.5h` (Ca làm: Chiều 05/11 15:00–16:30) | `1.5h` | Khớp 100% |
| **Dependencies** | `ECOM-308`, `ECOM-173`, `ECOM-188`, `ECOM-311`, `ECOM-312`, `ECOM-292/293`, `ECOM-317` | `ECOM-308`, `ECOM-317` | Khớp 100% |
| **Trạng thái** | **DONE (100% Completed)** | **DONE (100% Completed)** | Hoàn tất nghiệm thu |

### Tiêu chí nghiệm thu (Acceptance Criteria — Đề xuất từ Description & Nghiệp vụ ECOM-159/ECOM-308)
1. **AC-313-01 (Đồng bộ API & Sự kiện thời gian thực):** Khi Admin cập nhật trạng thái đơn hàng (`PUT /api/v1/admin/orders/{id}/status`) kèm ghi chú, hệ thống phát tín hiệu đồng bộ qua 3 kênh: `CustomEvent` (`shopmart:order-status-updated`) trong cùng tab, `StorageEvent` (`shopmart_order_sync_signal` / `shopmart_orders_mock`) giữa nhiều tab trình duyệt, và sự kiện `focus` khi người dùng chuyển về tab Customer.
2. **AC-313-02 (Đồng bộ Trang danh sách đơn hàng Customer `/orders`):** Trang `Orders.jsx` tự động lắng nghe tín hiệu đồng bộ để tải lại danh sách đơn hàng và hỗ trợ lọc đầy đủ các trạng thái mà Admin chuyển đổi (`PENDING`, `PAID`, `CONFIRMED`, `PROCESSING`, `SHIPPING`, `COMPLETED`/`DELIVERED`, `CANCELLED`).
3. **AC-313-03 (Đồng bộ Trang chi tiết đơn hàng Customer `/orders/:id`):** Trang `OrderDetail.jsx` tự động cập nhật trạng thái đơn hàng, ẩn nút `Hủy đơn hàng` ngay khi Admin đã chuyển đơn khỏi `PENDING`, cập nhật `OrderTimeline` và cung cấp nút `🔄 Làm mới` thủ công.
4. **AC-313-04 (Đồng bộ Trang theo dõi kiện hàng `/orders/:id/tracking` & `OrderTimeline`):** Trang `OrderTracking.jsx` và component `OrderTimeline.jsx` tự động làm mới tiến trình vận chuyển, ngày dự kiến giao và nhật ký trạng thái chi tiết (gồm người cập nhật `ROLE_ADMIN`, thời gian thực tế `createdAt` và ghi chú `note`).
5. **AC-313-05 (Đồng bộ chiều ngược lại Customer -> Admin):** Khi Customer hủy đơn hàng ở trạng thái `PENDING` (`PUT /api/v1/orders/{id}/cancel`), trạng thái `CANCELLED` và bản ghi lịch sử hủy đơn được đồng bộ tức thời sang giao diện Admin.

---

## 2. PHÂN TÍCH HIỆN TRẠNG & CÁC VẤN ĐỀ ĐÃ XỬ LÝ

1. **Vấn đề 1 — Thiếu cơ chế phát tín hiệu đồng bộ đa trang / đa tab khi Admin cập nhật trạng thái:**
   - Trước khi xử lý, `orderService.updateOrderStatus(id, status, note)` chỉ gọi API hoặc cập nhật trường `status` đơn thuần mà không ghi nhận bản ghi lịch sử mới vào `statusHistories` ở chế độ fallback, cũng như không bắn sự kiện thông báo cho các trang Customer đang mở.
   - **Giải pháp:** Bổ sung `ORDER_STATUS_SYNC_EVENT = 'shopmart:order-status-updated'`, hàm `notifyOrderStatusSync` và `subscribeOrderStatusSync(onSync, targetOrderId)` hỗ trợ đồng bộ qua `CustomEvent`, `localStorage` (`storage` event) và `window` (`focus` event).
2. **Vấn đề 2 — Component `OrderTimeline.jsx` không gọi `fetchHistory()` khi `propHistory` là mảng rỗng `[]`:**
   - Trong `OrderTimeline.jsx`, điều kiện cũ `if (propHistory && Array.isArray(propHistory))` khiến khi `order.statusHistories` trả về mảng rỗng `[]` (do lazy loading ở một số luồng), component không gọi `orderService.getOrderStatusHistory(orderId)`.
   - **Giải pháp:** Sửa điều kiện thành `if (propHistory && Array.isArray(propHistory) && propHistory.length > 0)` và bổ sung `propStatus` vào dependency array cùng `subscribeOrderStatusSync` để tự động làm mới lịch sử khi trạng thái đơn thay đổi.
3. **Vấn đề 3 — Bộ lọc trạng thái trên trang Customer `Orders.jsx` thiếu tab `CONFIRMED` và `PROCESSING`:**
   - Khi Admin chuyển đơn hàng sang `CONFIRMED` (`Đã xác nhận`) hoặc `PROCESSING` (`Đang xử lý`), trang `/orders` của Customer trước đây chưa có tab lọc riêng cho 2 trạng thái này.
   - **Giải pháp:** Bổ sung tab `CONFIRMED` (`Đã xác nhận`) và `PROCESSING` (`Đang xử lý`) vào `FILTER_TABS` trong `frontend/src/pages/customer/Orders.jsx`.

---

## 3. DANH SÁCH FILE THAY ĐỔI & TẠO MỚI

| STT | File | Loại thay đổi | Mô tả chi tiết |
|---|---|---|---|
| 1 | `frontend/src/services/orderService.js` | Chỉnh sửa | Thêm `ORDER_STATUS_SYNC_EVENT`, `notifyOrderStatusSync`, `subscribeOrderStatusSync`, đồng bộ `statusHistories` trong `updateOrderStatus`, `cancelOrder` và `getOrderStatusHistory`. |
| 2 | `frontend/src/components/order/OrderTimeline.jsx` | Chỉnh sửa | Sửa lỗi kiểm tra `propHistory.length > 0`, thêm lắng nghe `subscribeOrderStatusSync` và cập nhật khi `propStatus` thay đổi. |
| 3 | `frontend/src/pages/customer/Orders.jsx` | Chỉnh sửa | Bổ sung tab lọc `CONFIRMED`, `PROCESSING` và đăng ký `subscribeOrderStatusSync` tự động làm mới danh sách đơn. |
| 4 | `frontend/src/pages/customer/OrderDetail.jsx` | Chỉnh sửa | Đăng ký `subscribeOrderStatusSync` theo `id` đơn hàng và thêm nút `🔄 Làm mới` trên thanh thao tác. |
| 5 | `frontend/src/pages/customer/OrderTracking.jsx` | Chỉnh sửa | Đăng ký `subscribeOrderStatusSync` theo `id` đơn hàng để tự động đồng bộ hành trình kiện hàng. |
| 6 | `backend/order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java` | Chỉnh sửa | Đảm bảo `mapToOrderResponse` tự động nạp `statusHistories` từ `orderStatusHistoryRepository` nếu danh sách trong entity chưa được khởi tạo. |
| 7 | `frontend/tests/ecom313.status_sync.qa.test.mjs` | Tạo mới | Bộ kiểm thử tự động QA gồm 16 test cases (`TC-313-01` -> `TC-313-16`) cho ECOM-313. |

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (16/16 TEST CASES PASS)

| Mã TC | Nội dung kiểm thử | Kết quả |
|---|---|---|
| `TC-313-01` | Định nghĩa sự kiện đồng bộ `ORDER_STATUS_SYNC_EVENT` và kênh tín hiệu đa tab trong `orderService.js` | **PASS** |
| `TC-313-02` | Hàm `subscribeOrderStatusSync` hỗ trợ 3 kênh đồng bộ (`CustomEvent`, `StorageEvent`, `Window Focus`) | **PASS** |
| `TC-313-03` | Khi Admin gọi `updateOrderStatus(id, status, note)`, gọi `PUT /admin/orders/{id}/status` và phát tín hiệu đồng bộ | **PASS** |
| `TC-313-04` | Chế độ Fallback của `updateOrderStatus` lưu bản ghi lịch sử mới kèm `actorRole: ROLE_ADMIN`, `note` và `createdAt` | **PASS** |
| `TC-313-05` | Khi Customer hủy đơn (`cancelOrder`), đồng bộ trạng thái `CANCELLED` và ghi nhận lịch sử hủy đơn | **PASS** |
| `TC-313-06` | Hàm `getOrderStatusHistory` hợp nhất các bản ghi cập nhật thực tế từ Admin trong `statusHistories` | **PASS** |
| `TC-313-07` | Trang Customer `Orders.jsx` tự động lắng nghe `subscribeOrderStatusSync` và làm mới danh sách đơn hàng | **PASS** |
| `TC-313-08` | Bộ lọc trạng thái trên trang Customer `Orders.jsx` đồng bộ đầy đủ các trạng thái Admin cập nhật | **PASS** |
| `TC-313-09` | Trang Customer `OrderDetail.jsx` lắng nghe `subscribeOrderStatusSync` theo `id` đơn hàng và có nút Làm mới | **PASS** |
| `TC-313-10` | Trang Customer `OrderDetail.jsx` tự động ẩn nút Hủy đơn hàng khi Admin đã chuyển trạng thái khỏi `PENDING` | **PASS** |
| `TC-313-11` | Trang Customer `OrderTracking.jsx` lắng nghe `subscribeOrderStatusSync` và cập nhật tiến độ giao hàng | **PASS** |
| `TC-313-12` | Component `OrderTimeline.jsx` tự động tải lại lịch sử khi `propStatus` thay đổi hoặc nhận sự kiện đồng bộ | **PASS** |
| `TC-313-13` | Trang Admin `Orders.jsx` đồng bộ `ORDER_TRANSITIONS` khớp với State Machine và cập nhật ngay modal Timeline | **PASS** |
| `TC-313-14` | Đồng bộ danh mục hằng số `ORDER_STATUS` và `ORDER_STATUS_LABELS` giữa Admin, Customer và Backend | **PASS** |
| `TC-313-15` | Kiểm thử thực thi luồng đồng bộ sự kiện từ `updateOrderStatus` tới subscriber của Customer | **PASS** |
| `TC-313-16` | An toàn mã nguồn: không có biến `notify` khai báo trùng lặp hoặc conflict marker trong các file đồng bộ | **PASS** |
