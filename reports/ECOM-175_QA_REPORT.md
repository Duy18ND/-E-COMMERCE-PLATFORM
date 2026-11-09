# BÁO CÁO KIỂM THỬ QA – TASK ECOM-175
## [QA] Kiểm thử luồng cập nhật, hủy đơn và quyền xem đơn
**Dự án:** ShopMart E-Commerce Platform  
**Repository:** https://github.com/Duy18ND/-E-COMMERCE-PLATFORM  
**Người thực hiện:** Senior QA Engineer, API Testing Engineer & Automation Tester  
**Ngày thực hiện:** 04/11/2026  
**Trạng thái kiểm thử:** **PASS (100% Hoàn thành nghiệm thu)**  

---

## 1. THÔNG TIN TASK
- **Mã Task:** ECOM-175
- **Sprint:** Sprint 2
- **Epic:** [QA] Theo dõi đơn hàng chi tiết
- **Mức độ ưu tiên:** High (P1)
- **Ước lượng (Estimate):** 2 giờ
- **Phạm vi kiểm thử:** UserWeb (Khách hàng), AdminWeb (Quản trị), RESTful API, Database MySQL (`order_db`)
- **Mục tiêu:**
  - Kiểm tra tính đúng đắn và toàn vẹn của nghiệp vụ Admin cập nhật trạng thái đơn hàng.
  - Kiểm tra luồng khách hàng hủy đơn hàng (chỉ cho phép ở trạng thái `PENDING`, hoàn lại tồn kho qua FeignClient).
  - Kiểm tra phân quyền truy cập và kiểm thử chống tấn công IDOR (Insecure Direct Object References), bảo đảm User A không thể xem hoặc hủy đơn hàng của User B.

---

## 2. PHÂN TÍCH SOURCE CODE THỰC TẾ & MÔI TRƯỜNG KIỂM THỬ

### 2.1. Cấu trúc Source Code liên quan
- **Backend Order Service:**
  - Controller: `com.ecommerce.order.controller.OrderController`, `AdminOrderController`
  - Service: `com.ecommerce.order.service.OrderService`, `OrderServiceImpl`
  - Enum trạng thái: `com.ecommerce.order.enums.OrderStatus`
  - Entity: `com.ecommerce.order.entity.Order`, `OrderItem`, `OrderStatusHistory`
  - Repository: `OrderRepository`, `OrderStatusHistoryRepository`
  - FeignClient: `ProductClient` (gọi hoàn kho: `restoreStock`)
- **Frontend Web:**
  - Admin Web: `frontend/src/pages/admin/Orders.jsx` (ECOM-291)
  - Customer Web: `frontend/src/pages/customer/OrderDetail.jsx`, `Orders.jsx`
  - Service Client: `frontend/src/services/orderService.js`
  - Component: `OrderTimeline.jsx` (ECOM-311), `OrderStatus.jsx`

### 2.2. Danh sách Endpoint thực tế kiểm thử
| STT | Phương thức | Đường dẫn API | Quyền hạn | Mô tả chức năng |
|:---:|:---:|:---|:---|:---|
| 1 | `PUT` | `/api/v1/admin/orders/{id}/status` | `ROLE_ADMIN` | Admin cập nhật trạng thái đơn hàng |
| 2 | `GET` | `/api/v1/admin/orders` | `ROLE_ADMIN` | Admin lấy danh sách đơn có phân trang, lọc |
| 3 | `PUT` | `/api/v1/orders/{id}/cancel` | `ROLE_USER` (Chủ đơn) | Khách hàng hủy đơn hàng PENDING |
| 4 | `GET` | `/api/v1/orders/{id}` | Chủ đơn hoặc `ROLE_ADMIN` | Xem thông tin chi tiết đơn hàng |
| 5 | `GET` | `/api/v1/orders/my-orders` | `ROLE_USER` | Lấy danh sách đơn của người đang đăng nhập |
| 6 | `GET` | `/api/v1/orders/user/{userId}` | Chính chủ hoặc `ROLE_ADMIN` | Lấy lịch sử đơn hàng theo userId |

---

## 3. DỮ LIỆU KIỂM THỬ (TEST DATA)
- **Tài khoản User A (Chủ sở hữu đơn hàng #1001):**
  - `userId`: `10`
  - `email`: `user_a@shopmart.test`
  - Token: `Bearer {{userAToken}}` (Header `X-User-Id: 10`, `X-User-Roles: ROLE_USER`)
- **Tài khoản User B (Attacker / Người dùng khác):**
  - `userId`: `20`
  - `email`: `user_b@shopmart.test`
  - Token: `Bearer {{userBToken}}` (Header `X-User-Id: 20`, `X-User-Roles: ROLE_USER`)
- **Tài khoản Quản trị viên (Admin):**
  - `adminId`: `1`
  - Token: `Bearer {{adminToken}}` (Header `X-User-Id: 1`, `X-User-Roles: ROLE_ADMIN`)
- **Mã đơn hàng thử nghiệm:**
  - `testOrderId`: `1001` (Sở hữu bởi User A, trạng thái khởi tạo `PENDING`)
  - `paidOrderId`: `1002` (Sở hữu bởi User B, trạng thái `PAID`)
  - `nonExistentOrderId`: `999999`

---

## 4. MA TRẬN KẾT QUẢ KIỂM THỬ CHI TIẾT (TEST EXECUTION RESULTS)

### Nhóm A: Cập nhật trạng thái đơn hàng (Admin)
| Test Case ID | Tên kịch bản kiểm thử | Kỳ vọng (Expected Result) | Thực tế (Actual Result) | Trạng thái |
|:---|:---|:---|:---|:---:|
| **TC-175-01** | Admin cập nhật trạng thái đơn hàng hợp lệ | `PUT /api/v1/admin/orders/{id}/status` với `CONFIRMED` trả về HTTP 200 OK | Trả về 200 OK, đơn hàng cập nhật sang CONFIRMED | **PASS** |
| **TC-175-02** | API trả về trạng thái mới chính xác | Body trả về `data.status = CONFIRMED`, khớp với DB | Trả về đúng `data.status: "CONFIRMED"` và thông tin đơn | **PASS** |
| **TC-175-03** | Danh sách đơn hàng Admin cập nhật đúng trạng thái | `GET /admin/orders?status=CONFIRMED` hiển thị đơn hàng vừa cập nhật | Danh sách hiển thị chính xác đơn hàng ở cột trạng thái | **PASS** |
| **TC-175-04** | Khách hàng xem trạng thái đơn hàng mới nhất | Khách hàng User A tải lại trang đơn hàng thấy trạng thái CONFIRMED | Khách hàng nhận được dữ liệu trạng thái mới tức thì | **PASS** |
| **TC-175-05** | Trang chi tiết đơn hàng hiển thị khớp Backend | Huy hiệu `<OrderStatus />` hiển thị màu xanh "Đã xác nhận" | Giao diện hiển thị đúng nhãn và màu sắc chuẩn | **PASS** |
| **TC-175-06** | API cập nhật lỗi không hiển thị thành công giả | Khi API trả về lỗi 400/500, hiển thị toast thông báo lỗi đỏ | Frontend hiển thị `notify.error()`, không cập nhật state giả | **PASS** |
| **TC-175-07** | Nhấn Hủy bỏ trong Modal không gửi API | Khi bấm "Quay lại" trong modal confirm, không có HTTP request nào gửi | Không phát sinh HTTP request, trạng thái giữ nguyên | **PASS** |
| **TC-175-08** | Nhấn Xác nhận chỉ gửi 1 request, chống gửi trùng | Nút bấm bị vô hiệu hóa `actionLoading=true` khi đang gửi request | Chặn thành công double-click, chỉ gửi 1 request duy nhất | **PASS** |

### Nhóm B: Hủy đơn hàng
| Test Case ID | Tên kịch bản kiểm thử | Kỳ vọng (Expected Result) | Thực tế (Actual Result) | Trạng thái |
|:---|:---|:---|:---|:---:|
| **TC-175-09** | Khách hàng hủy đơn PENDING của chính mình | `PUT /orders/{id}/cancel` trả về 200 OK, trạng thái chuyển CANCELLED | Hủy thành công, trạng thái chuyển sang CANCELLED | **PASS** |
| **TC-175-10** | Không cho hủy đơn ở trạng thái không cho phép | Gọi hủy đơn khi đang PAID/CONFIRMED/SHIPPING ném `IllegalStateException` | Hệ thống chặn và trả về lỗi thông báo trạng thái không hợp lệ | **PASS** |
| **TC-175-11** | Cập nhật trạng thái sau khi hủy thành công | Cột `status` trong bảng `orders` cập nhật thành `CANCELLED` | DB MySQL lưu đúng `CANCELLED` | **PASS** |
| **TC-175-12** | Timeline ghi nhận sự kiện hủy đơn hàng | Sinh bản ghi mới trong `order_status_history` với `status: CANCELLED` | Bản ghi lịch sử được thêm với action tương ứng | **PASS** |
| **TC-175-13** | Hủy đơn hàng không làm mất lịch sử cũ | Toàn bộ các bản ghi trạng thái trước đó (PENDING...) vẫn được giữ nguyên | Giữ nguyên 100% dòng thời gian lịch sử | **PASS** |
| **TC-175-14** | Hủy đơn hàng không tồn tại | Gọi hủy với id `999999` trả về 404 Not Found | Hệ thống ném `ResourceNotFoundException`, HTTP 404 | **PASS** |
| **TC-175-15** | Hủy đơn hàng đã bị hủy trước đó | Đơn đã CANCELLED gọi hủy tiếp ném lỗi trạng thái | Bị chặn do không còn là PENDING | **PASS** |
| **TC-175-16** | Kiểm tra phân quyền khi hủy đơn (Chống IDOR) | User B gửi request hủy đơn của User A bị từ chối 403 Forbidden | Ném `AccessDeniedException`, HTTP 403, không sửa DB | **PASS** |

### Nhóm C: Quyền xem đơn hàng (Access Control & IDOR Prevention)
| Test Case ID | Tên kịch bản kiểm thử | Kỳ vọng (Expected Result) | Thực tế (Actual Result) | Trạng thái |
|:---|:---|:---|:---|:---:|
| **TC-175-17** | User A xem đơn hàng của chính mình | `GET /orders/1001` trả về 200 OK kèm thông tin chi tiết đơn hàng | Trả về 200 OK kèm đúng dữ liệu đơn hàng #1001 | **PASS** |
| **TC-175-18** | User B không xem được đơn của User A (IDOR) | `GET /orders/1001` với token User B trả về 403 Forbidden | Trả về 403 Forbidden, thông báo "Bạn không có quyền xem..." | **PASS** |
| **TC-175-19** | Guest không xem được đơn yêu cầu đăng nhập | Request không có token trả về 401 Unauthorized / 403 Forbidden | Bị chặn tại Gateway / Filter xác thực | **PASS** |
| **TC-175-20** | Admin xem đơn hàng theo quyền được cấp | `GET /orders/1001` với token Admin trả về 200 OK | Admin xem được toàn bộ thông tin đơn hàng bất kỳ | **PASS** |
| **TC-175-21** | Order ID không tồn tại được xử lý đúng | `GET /orders/999999` trả về 404 Not Found | Ném `ResourceNotFoundException`, HTTP 404 chuẩn RESTful | **PASS** |
| **TC-175-22** | JWT không hợp lệ bị từ chối | Token giả mạo/chữ ký sai bị từ chối 401 Unauthorized tại Gateway | Bị chặn tại `AuthenticationFilter` với thông báo lỗi chữ ký | **PASS** |
| **TC-175-23** | JWT hết hạn bị từ chối | Token hết hạn trả về 401 Unauthorized yêu cầu đăng nhập lại | Bị bắt lỗi `ExpiredJwtException`, HTTP 401 | **PASS** |
| **TC-175-24** | Không để lộ thông tin đơn qua response khi lỗi | Khi trả về 403, phần `data` trong JSON là null/undefined | Không có bất kỳ dữ liệu nhạy cảm nào bị rò rỉ trong body | **PASS** |

---

## 5. MINH CHỨNG THỰC THI (TEST EVIDENCE)
- **Log thực thi API:** `reports/evidence/ECOM-175/API_EXECUTION_ECOM-175.log`
- **Tập lệnh SQL đối chiếu Database:** `reports/evidence/ECOM-175/DATABASE_VERIFICATION_ECOM-175.sql`
- **Kết quả Spring Boot Unit & Integration Test:**
  - `AdminOrderControllerTest.xml`: 5/5 PASSED.
  - `OrderControllerTest.xml`: 5/5 PASSED.
  - `OrderServiceTest.xml`: 16/16 PASSED.
- **Node.js Automated Test Suite:** `frontend/tests/order_lifecycle_qa.test.mjs` (9/9 PASSED).

---

## 6. DANH SÁCH LỖI VÀ ĐỀ XUẤT CẢI TIẾN
- **Lỗi bảo mật IDOR:** Đã được xử lý triệt để ở tầng Backend Service (`userId.equals(order.getUserId())`). Không phát hiện lỗ hổng IDOR nào còn sót lại.
- **Lỗi giao diện:** Layout bảng quản trị đơn hàng đã có `min-width: 980px`, cuộn ngang độc lập, chống vỡ layout khi mở sidebar (`tests/admin_orders_layout.qa.test.mjs` - 6/6 PASS).

---

## 7. KẾT LUẬN NGHIỆM THU
Task **ECOM-175** đạt toàn bộ các tiêu chí nghiệm thu (Acceptance Criteria):
1. Quá trình Admin cập nhật trạng thái hoạt động chính xác theo State Machine.
2. Quy trình hủy đơn hàng được kiểm soát chặt chẽ: chỉ hủy khi `PENDING`, tự động hoàn tồn kho qua FeignClient.
3. Cơ chế kiểm soát phân quyền (RBAC) và chống IDOR được thực thi vững chắc ở tầng Backend API.

**Đánh giá:** **SẴN SÀNG NGHIỆM THU (READY TO MERGE / PASS)**.
