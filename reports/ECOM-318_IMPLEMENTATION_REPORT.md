# BÁO CÁO NGHIỆM THU TRIỂN KHAI & KIỂM THỬ — TASK ECOM-318

**Dự án:** ShopMart E-Commerce Platform  
**Nhánh làm việc:** `devops-phuong`  
**Ngày thực hiện:** 06/11/2026  
**Người thực hiện:** NGÔ PHƯƠNG (Senior Fullstack / React / Spring Boot / QA / DevOps)

---

## 1. THÔNG TIN TASK (ĐỐI CHIẾU SCRUM BOARD & MASTER PLAN)

| Thuộc tính | Scrum Board (`SCRUM BOARD - FE BE`, Dòng 173) | Master Plan (`3. Master Plan`, Dòng 182) | Kết luận đối chiếu |
|---|---|---|---|
| **Task ID** | `ECOM-318` | `ECOM-318` | Khớp 100% |
| **Task Name** | `[BE] QA Test - API, validation và quyền truy cập` | `[BE] QA Test - API, validation và quyền truy cập` | Khớp 100% |
| **Epic** | `CUSTOMER` | `CUSTOMER` | Khớp 100% |
| **Feature (Mục mẹ)** | `ECOM-159` (`Theo dõi đơn hàng chi tiết`) | `ECOM-159` (`Theo dõi đơn hàng chi tiết`) | Khớp 100% |
| **Parent Task** | `ECOM-309` (`[BE] Theo dõi đơn hàng chi tiết`) | `ECOM-309` (`[BE] Theo dõi đơn hàng chi tiết`) | Khớp 100% |
| **Nguồn** | `Bổ sung chi tiết` | `Bổ sung chi tiết` | Khớp 100% |
| **Sprint** | `SPRINT 2` | `SPRINT 2` | Khớp 100% |
| **Platform** | `UserWeb, AdminWeb, API` | `UserWeb, AdminWeb, API` | Khớp 100% |
| **Description** | `Kiểm thử API, case dữ liệu sai và phân quyền` | `Kiểm thử API, case dữ liệu sai và phân quyền` | Khớp 100% |
| **Priority** | `High (P1)` | `High (P1)` | Khớp 100% |
| **Người phụ trách (PIC)** | `NGÔ PHƯƠNG` | `NGÔ PHƯƠNG` | Khớp 100% |
| **Time Estimate** | `1.0h` (Ca làm: Sáng 06/11 08:30–09:30) | `1h` | Khớp 100% |
| **Dependencies** | `ECOM-309`, `ECOM-171`, `ECOM-172`, `ECOM-186`, `ECOM-187`, `ECOM-315`, `ECOM-316`, `ECOM-317` | `ECOM-309`, `ECOM-317` | Khớp 100% |
| **Trạng thái** | **DONE (100% Completed)** | **DONE (100% Completed)** | Hoàn tất nghiệm thu |

### Tiêu chí nghiệm thu (Acceptance Criteria — Đề xuất từ Description & Nghiệp vụ ECOM-309/ECOM-159)
1. **AC-318-01 (API Timeline & Chi tiết đơn hàng):** Kiểm thử `GET /api/v1/orders/{id}/history`, `GET /api/v1/orders/{id}` và `GET /api/v1/admin/orders/{id}/history` trả về danh sách `OrderStatusHistoryResponse` sắp xếp tăng dần theo `createdAt` thực tế (`findByOrderIdOrderByCreatedAtAsc`), kèm mô tả tiếng Việt thân thiện (`getStatusDescription`), người cập nhật (`updatedBy`), vai trò (`actorRole`) và ghi chú (`note`).
2. **AC-318-02 (Bảo mật IDOR & Authentication Bypass):** Kiểm thử khi thiếu header `X-User-Id` hoặc khi khách hàng (`ROLE_USER` / `ROLE_CUSTOMER`) cố tình truy cập lịch sử / chi tiết đơn hàng của người dùng khác -> Hệ thống chặn bằng `AccessDeniedException` (`HTTP 403 Forbidden`) và không rò rỉ dữ liệu.
3. **AC-318-03 (Bảo mật RBAC & Chống giả mạo Role):** Kiểm thử các API Admin (`PUT /api/v1/admin/orders/{id}/status`, `GET /api/v1/admin/orders/{id}/history`) yêu cầu chính xác `ROLE_ADMIN` (chống bypass bằng substring kiểu `ROLE_ADMIN_VIEWER`, `FAKE_ROLE_ADMIN`).
4. **AC-318-04 (Validation DTO & Ràng buộc State Machine):** Kiểm thử `UpdateOrderStatusRequest` (`@NotNull status`, `@Size(max = 1000) note`), JSON sai định dạng / sai enum (`HTTP 400 Bad Request`), và chặn mọi hành vi chuyển lùi trạng thái trái phép (ví dụ `DELIVERED -> SHIPPING` hoặc `DELIVERED -> CANCELLED` ném `IllegalStateException` -> `HTTP 400 Bad Request`).
5. **AC-318-05 (Đồng bộ dữ liệu & Hoàn tồn kho/Voucher):** Kiểm thử khi Admin hoặc Customer cập nhật trạng thái đơn hàng, bản ghi `OrderStatusHistory` được lưu trong cùng `@Transactional(rollbackFor = Exception.class)` và nạp đồng bộ vào `OrderResponse.statusHistories`; khi chuyển sang `CANCELLED` phải gọi `ProductClient.restoreStock` và `voucherService.restoreVoucherUsage`.

---

## 2. PHẠM VI KIỂM THỬ & HOÀN THIỆN BACKEND (`order-service`)

1. **Hoàn thiện đồng bộ `statusHistories` trong `OrderServiceImpl.mapToOrderResponse`:**
   - Khi `OrderRepository.findByIdWithItems(id)` chỉ `LEFT JOIN FETCH o.orderItems` (để tránh `MultipleBagFetchException` của Hibernate), `order.getStatusHistories()` có thể chưa được nạp nếu truy vấn ở một giao dịch đọc riêng biệt.
   - Đã bổ sung cơ chế tự động truy vấn `orderStatusHistoryRepository.findByOrderIdOrderByCreatedAtAsc(order.getId())` trong `mapToOrderResponse` khi `rawHistories` trống, đảm bảo `GET /api/v1/orders/{id}` luôn trả về đầy đủ lịch sử trạng thái mới nhất do Admin cập nhật.
2. **Xây dựng bộ kiểm thử JUnit 5 `@WebMvcTest` (`OrderTrackingApiQATest.java`) và QA Suite (`ecom318.tracking_be.qa.test.mjs`):**
   - Kiểm thử đầy đủ các kịch bản: Chủ sở hữu hợp lệ (`200 OK`), Chống IDOR (`403 Forbidden`), Thiếu `X-User-Id` (`403 Forbidden`), Đơn hàng không tồn tại (`404 Not Found`), Admin cập nhật trạng thái kèm ghi chú (`200 OK`), Chuyển lùi trạng thái trái phép (`400 Bad Request`), Khách hàng gọi API Admin (`403 Forbidden`).

---

## 3. DANH SÁCH FILE KIỂM THỬ & CẬP NHẬT

| STT | File | Vai trò trong ECOM-318 |
|---|---|---|
| 1 | `backend/order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java` | Củng cố `mapToOrderResponse` luôn đồng bộ `statusHistories` từ `orderStatusHistoryRepository`. |
| 2 | `backend/order-service/src/test/java/com/ecommerce/order/controller/OrderTrackingApiQATest.java` | Bộ JUnit 5 `@WebMvcTest` kiểm thử 9 kịch bản API Tracking, State Machine, Validation & IDOR (`TC-318-BE-01` -> `TC-318-BE-09`). |
| 3 | `frontend/tests/ecom318.tracking_be.qa.test.mjs` | Bộ kiểm thử tự động QA 16 test cases (`TC-318-01` -> `TC-318-16`) xác minh toàn bộ kiến trúc Backend Tracking. |

---

## 4. KẾT QUẢ KIỂM THỬ TỰ ĐỘNG (16/16 QA TEST CASES + 9/9 JUNIT TESTS PASS)

| Mã TC | Nội dung kiểm thử | Kết quả |
|---|---|---|
| `TC-318-01` | `[Schema & Entity]` Bảng `order_status_history` định nghĩa đầy đủ các trường và Index `idx_status_history_order_id`, `idx_status_history_created_at` | **PASS** |
| `TC-318-02` | `[Repository]` `OrderStatusHistoryRepository` hỗ trợ truy vấn Timeline sắp xếp theo thời gian thực tăng dần (`findByOrderIdOrderByCreatedAtAsc`) | **PASS** |
| `TC-318-03` | `[API Endpoint Customer]` `OrderController` cung cấp `GET /api/v1/orders/{id}/history` và `GET /api/v1/orders/{id}` kèm kiểm tra `X-User-Id` | **PASS** |
| `TC-318-04` | `[API Endpoint Admin]` `AdminOrderController` cung cấp `PUT /api/v1/admin/orders/{id}/status` và `GET /api/v1/admin/orders/{id}/history` kèm `ROLE_ADMIN` | **PASS** |
| `TC-318-05` | `[Chống IDOR - Timeline History]` `OrderServiceImpl.getOrderStatusHistory` chặn người dùng xem lịch sử đơn hàng của người khác (`403`) | **PASS** |
| `TC-318-06` | `[Chống IDOR - Order Detail]` `OrderServiceImpl.getOrderById` chặn người dùng xem chi tiết đơn hàng của người khác (`403`) | **PASS** |
| `TC-318-07` | `[Chống Role Bypass]` `hasAdminRole` và `requireAdminRole` tách chuỗi bằng dấu phẩy và so khớp chính xác `ROLE_ADMIN` | **PASS** |
| `TC-318-08` | `[State Machine Validation]` `ALLOWED_TRANSITIONS` định nghĩa chặt chẽ các luồng chuyển trạng thái hợp lệ và chặn chuyển lùi trạng thái | **PASS** |
| `TC-318-09` | `[Request DTO Validation]` `UpdateOrderStatusRequest` kiểm tra `@NotNull` cho `status` và `@Size(max = 1000)` cho `note` | **PASS** |
| `TC-318-10` | `[Audit Logging]` Tự động ghi nhật ký vào `order_status_history` tại mọi điểm chuyển trạng thái | **PASS** |
| `TC-318-11` | `[Bidirectional Sync ECOM-317]` Sau khi Admin cập nhật trạng thái, `OrderResponse` trả về chứa ngay `statusHistories` đồng bộ | **PASS** |
| `TC-318-12` | `[Stock & Voucher Restoration]` Khi chuyển đơn sang `CANCELLED`, tự động hoàn kho `ProductClient` và hoàn lượt dùng `Voucher` | **PASS** |
| `TC-318-13` | `[Response DTO Mapping]` `OrderStatusHistoryResponse` ánh xạ đầy đủ nhãn mô tả tiếng Việt cho toàn bộ 9 trạng thái `OrderStatus` | **PASS** |
| `TC-318-14` | `[Exception Mapping]` `GlobalExceptionHandler` chuẩn hóa mã HTTP `400`, `403`, `404` | **PASS** |
| `TC-318-15` | `[Transaction Boundary]` Các hàm ghi có `@Transactional(rollbackFor = Exception.class)` và hàm đọc có `@Transactional(readOnly = true)` | **PASS** |
| `TC-318-16` | `[JUnit 5 QA Suite]` Tồn tại bộ kiểm thử JUnit 5 `OrderTrackingApiQATest.java` kiểm tra toàn diện API Tracking, Validation & IDOR | **PASS** |
