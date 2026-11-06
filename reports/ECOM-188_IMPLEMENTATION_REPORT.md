# BÁO CÁO NGHIỆM THU HOÀN THÀNH TASK ECOM-188
## [FE] TRANG CHI TIẾT ĐƠN: NGÀY ĐẶT, MÃ ĐƠN, TIMELINE VÀ TRẠNG THÁI HIỆN TẠI

**Dự án:** ShopMart E-Commerce Platform  
**Sprint:** Sprint 2  
**Epic:** CUSTOMER (Parent item: `ECOM-308 – [FE] Theo dõi đơn hàng chi tiết`)  
**Người phụ trách (PIC):** Ngô Phương (DevOps & QA Lead hỗ trợ Frontend để cân bằng giờ làm)  
**Nhánh Git:** `devops-phuong`  
**Ngày hoàn thành:** 05/11/2026  
**Trạng thái Scrum Board:** **DONE (100% Hoàn thành)**  

---

## 1. TÊN TASK VÀ MỤC TIÊU

- **Mã Task:** `ECOM-188`
- **Tên Task:** `[FE] Trang chi tiết đơn: ngày đặt, mã đơn, timeline và trạng thái hiện tại`
- **Mô tả nghiệp vụ:** *Hiển thị các mốc có thời gian thực tế, không suy diễn trạng thái chưa cập nhật*
- **Mục tiêu:**
  - Hoàn thiện giao diện Trang chi tiết đơn hàng của khách hàng (`OrderDetail.jsx`).
  - Hiển thị nổi bật các thông tin định danh: Mã đơn hàng (`#order.id`), Ngày đặt hàng (`order.createdAt` chuẩn format tiếng Việt), Huy hiệu trạng thái hiện tại (`<OrderStatus />`).
  - Tích hợp Component Timeline (ECOM-173) vào trang chi tiết đơn hàng, bảo đảm nguyên tắc cốt lõi: **chỉ hiển thị các mốc có thời gian thực tế đã xảy ra, không suy diễn mốc thời gian cho các bước trong tương lai chưa cập nhật**.
  - Hiển thị đầy đủ thông tin nhận hàng, phương thức thanh toán, trạng thái thanh toán, danh sách sản phẩm và tổng giá trị đơn hàng.
  - Kiểm soát hành động của khách hàng: Cho phép hủy đơn và thanh toán mô phỏng chỉ khi đơn ở trạng thái `PENDING`, sử dụng modal xác nhận chuyên nghiệp, gọi API Backend hủy đơn và cập nhật ngay lập tức giao diện.
  - Ngăn chặn lỗ hổng IDOR khi người dùng cố truy cập đơn hàng của người khác (bắt lỗi HTTP 403 Forbidden).

---

## 2. EPIC VÀ SPRINT

- **Epic:** `CUSTOMER` (Parent Epic: `ECOM-308 [FE] Theo dõi đơn hàng chi tiết`)
- **Sprint:** `SPRINT 2`
- **Mức độ ưu tiên:** `High (P1)`
- **Thời gian ước tính (Estimate):** 3.5 giờ
- **Thời gian thực tế (Actual):** 3.5 giờ
- **Phân công theo Scrum Board:** Ngô Phương tiếp nhận để hỗ trợ Frontend và cân bằng tải làm việc.

---

## 3. ACCEPTANCE CRITERIA (TIÊU CHÍ NGHIỆM THU)

| STT | Mã AC | Nội dung tiêu chí nghiệm thu | Trạng thái |
|:---:|:---:|:---|:---:|
| 1 | **AC-188-01** | **Thông tin định danh trên Header:** Hiển thị rõ ràng Mã đơn hàng dạng `Đơn hàng #{order.id}`, Ngày đặt hàng `order.createdAt` định dạng tiếng Việt chuẩn (`dd/MM/yyyy HH:mm:ss`), và Huy hiệu trạng thái `<OrderStatus status={order.status} />`. | **PASS** |
| 2 | **AC-188-02** | **Tích hợp Timeline tiến trình:** Tích hợp component `<OrderTimeline />` truyền đầy đủ props `orderId={order.id}`, `currentStatus={order.status}`, `historyData={order.statusHistories}`. | **PASS** |
| 3 | **AC-188-03** | **Nguyên tắc cốt lõi về thời gian thực tế:** Chỉ những bước nào đã diễn ra trong thực tế (được ghi nhận trong `order_status_history` của Backend) mới hiển thị thời gian. Các bước tương lai tuyệt đối không hiển thị mốc thời gian giả định hay suy diễn. | **PASS** |
| 4 | **AC-188-04** | **Thông tin người nhận & giao hàng:** Hiển thị Tên người nhận (`receiverName`), Số điện thoại (`receiverPhone`), Địa chỉ giao hàng đầy đủ (`fullAddress`), và Ghi chú đơn hàng nếu có. | **PASS** |
| 5 | **AC-188-05** | **Khối thanh toán:** Hiển thị rõ phương thức thanh toán (COD hoặc Thanh toán trực tuyến mô phỏng) và Trạng thái thanh toán ("Đã thanh toán" / "Chưa thanh toán"). | **PASS** |
| 6 | **AC-188-06** | **Danh sách sản phẩm đã đặt:** Hiển thị từng sản phẩm với Ảnh (hoặc icon placeholder nếu không có ảnh), Tên sản phẩm, Đơn giá x Số lượng, Thành tiền từng món, và Tổng số tiền toàn đơn hàng (`formatCurrency`). | **PASS** |
| 7 | **AC-188-07** | **Quyền hủy đơn của khách hàng:** Nút "Hủy đơn hàng" chỉ hiển thị khi đơn hàng đang ở trạng thái `PENDING`. Khi đơn đã sang `CONFIRMED`, `SHIPPING`, `DELIVERED`, `CANCELLED` thì ẩn nút hủy đơn. | **PASS** |
| 8 | **AC-188-08** | **Modal xác nhận hủy đơn (Không dùng popup native):** Khi bấm hủy đơn, hiển thị `confirmDialog` với tiêu đề, nội dung cảnh báo hoàn kho và nút Hủy đơn/Quay lại. Tuyệt đối không dùng `window.confirm()` hoặc `window.alert()`. | **PASS** |
| 9 | **AC-188-09** | **Gọi API hủy đơn & cập nhật tức thì:** Gọi `orderService.cancelOrder(id)`, cập nhật state `order` sang `CANCELLED`, hiển thị toast thông báo thành công và Stepper chuyển ngay sang bước Hủy màu đỏ. | **PASS** |
| 10 | **AC-188-10** | **Thanh toán mô phỏng:** Hỗ trợ nút "Thanh toán ngay" khi đơn hàng chọn `MOCK_ONLINE` và đang ở trạng thái `PENDING`. | **PASS** |
| 11 | **AC-188-11** | **Bảo mật chống IDOR:** Bắt mã lỗi 403 Forbidden khi khách cố tình đổi Order ID trên URL xem đơn của người khác, hiển thị thông báo lỗi bảo mật rõ ràng, không làm lộ thông tin đơn hàng. | **PASS** |
| 12 | **AC-188-12** | **Xử lý trạng thái trang:** Hiển thị `<Loading />` khi đang tải dữ liệu từ API, hiển thị `<ErrorMessage />` khi đơn hàng không tồn tại hoặc gặp lỗi, kèm nút điều hướng quay lại `/orders`. | **PASS** |

---

## 4. TÌNH TRẠNG TRƯỚC KHI TRIỂN KHAI

1. **Hiển thị thời gian:**
   - Trước khi tinh chỉnh, ngày đặt hàng hiển thị qua hàm `new Date().toLocaleString()` mặc định không chỉ định rõ các tham số ngày, tháng, năm, giờ, phút, giây tiếng Việt.
   - Chưa có sự liên kết chặt chẽ giữa `historyData` của đơn hàng với Stepper để đảm bảo nguyên tắc "không suy diễn trạng thái chưa cập nhật".
2. **Khả năng phòng vệ IDOR:**
   - Khi API `GET /api/v1/orders/{id}` trả về lỗi 403 Forbidden, `orderService.getOrderById` trước đây có nguy cơ fallback về danh sách đơn mẫu cục bộ nếu không kiểm tra mã trạng thái HTTP 403.
   - Giao diện `OrderDetail.jsx` chưa phân biệt rõ giữa lỗi mất mạng thông thường và lỗi từ chối truy cập do vi phạm quyền sở hữu (IDOR).
3. **Bộ test hồi quy:**
   - Chưa có bộ test tự động riêng biệt kiểm tra toàn diện các tiêu chí của trang chi tiết đơn hàng `OrderDetail.jsx`.

---

## 5. CÁC FILE ĐÃ TẠO HOẶC SỬA

| STT | Đường dẫn File | Loại thay đổi | Chi tiết nội dung |
|:---:|:---|:---:|:---|
| 1 | `frontend/src/pages/customer/OrderDetail.jsx` | **Cập nhật** | Tinh chỉnh hiển thị ngày đặt chuẩn `vi-VN`, bắt lỗi IDOR 403 Forbidden riêng biệt, liên kết chặt chẽ với Timeline ECOM-173 |
| 2 | `frontend/src/services/orderService.js` | **Cập nhật** | Bổ sung kiểm tra HTTP 403 Forbidden trong `getOrderById` và `cancelOrder` để ném lỗi ngay về giao diện |
| 3 | `frontend/tests/ecom188.order_detail.qa.test.mjs` | **Tạo mới** | Bộ kiểm thử tự động 18 Test Cases (TC-188-01 ➔ TC-188-18) cho ECOM-188 |
| 4 | `frontend/package.json` | **Cập nhật** | Bổ sung `tests/ecom188.order_detail.qa.test.mjs` vào lệnh test của dự án |
| 5 | `reports/ECOM-188_IMPLEMENTATION_REPORT.md` | **Tạo mới** | Báo cáo nghiệm thu hoàn chỉnh task ECOM-188 |

---

## 6. CHI TIẾT CHỨC NĂNG VÀ API

### 6.1. Kiến trúc trang chi tiết đơn hàng
```mermaid
flowchart TD
    User["Khách hàng"] -->|Mở /orders/:id| OrderDetail["Trang OrderDetail.jsx"]
    OrderDetail -->|orderService.getOrderById(id)| API["GET /api/v1/orders/{id}"]
    API -->|403 Forbidden IDOR| OrderDetailError["Hiển thị Cảnh báo Bảo mật IDOR"]
    API -->|200 OK: OrderResponse| OrderDetailView["Render Giao diện Chi tiết Đơn hàng"]
    
    OrderDetailView --> Header["Header: Mã đơn #id, Ngày đặt (vi-VN), OrderStatus"]
    OrderDetailView --> Timeline["<OrderTimeline orderId={id} currentStatus={status} />"]
    OrderDetailView --> Shipping["📍 Thông tin nhận hàng (Tên, SĐT, Địa chỉ, Note)"]
    OrderDetailView --> Payment["💳 Thông tin thanh toán (COD / Mock Online, Trạng thái)"]
    OrderDetailView --> Items["📦 Danh sách sản phẩm (Ảnh, Tên, Đơn giá x SL, Tổng tiền)"]
    
    OrderDetailView -->|Nếu status === PENDING| Actions["Nút Hủy đơn / Thanh toán ngay"]
    Actions -->|Bấm Hủy đơn| ConfirmModal["Confirm Modal (useNotification)"]
    ConfirmModal -->|Xác nhận hủy| CancelAPI["PUT /api/v1/orders/{id}/cancel"]
    CancelAPI -->|Thành công| UpdateState["Cập nhật status = CANCELLED & Toast xanh"]
```

### 6.2. Minh họa nguyên tắc cốt lõi: "Không suy diễn trạng thái chưa cập nhật"
- Khi đơn hàng vừa tạo (`PENDING`):
  - Stepper chỉ active tại bước 1: `📝 Đặt hàng thành công` (kèm thời gian thực tế `05/11/2026 10:00:00`).
  - Các bước tiếp theo: `📋 Đã xác nhận`, `📦 Đang chuẩn bị hàng`, `🚚 Đang vận chuyển`, `🎉 Giao thành công` hiển thị màu xám mờ và **hoàn toàn không có mốc thời gian**.
- Khi Admin xác nhận đơn hàng (`CONFIRMED`):
  - Bước 1 chuyển sang màu xanh lá (`✓`).
  - Bước 2 sáng đèn xanh dương highlight (kèm thời gian thực tế `05/11/2026 10:15:00`).
  - Các bước 3, 4, 5 vẫn giữ màu xám và **không hiển thị thời gian**.
- Khi đơn hàng bị hủy (`CANCELLED`):
  - Stepper dừng lại ngay tại mốc `❌ Đơn hàng đã hủy` màu đỏ.
  - Các bước vận chuyển phía sau bị ngắt bỏ hoàn toàn, không tạo cảm giác giả định cho người dùng.

---

## 7. TEST CASES (MA TRẬN KIỂM THỬ)

Bộ kiểm thử `frontend/tests/ecom188.order_detail.qa.test.mjs` bao gồm **18 Test Cases**:

| Test Case ID | Tên kịch bản kiểm thử | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái |
|:---|:---|:---|:---|:---:|
| **TC-188-01** | Tồn tại component OrderDetail.jsx với đầy đủ khối chức năng | Có component OrderDetail, dùng useParams lấy id | Khớp 100% | **PASS** |
| **TC-188-02** | Hiển thị mã đơn hàng (`#order.id`) trên tiêu đề | Tiêu đề chứa `Đơn hàng #{order.id}` | Khớp 100% | **PASS** |
| **TC-188-03** | Hiển thị ngày đặt hàng (`order.createdAt`) chuẩn tiếng Việt | Nhãn "Đặt ngày:", format theo locale `vi-VN` | Khớp 100% | **PASS** |
| **TC-188-04** | Hiển thị huy hiệu trạng thái hiện tại bằng OrderStatus | Render `<OrderStatus status={order.status} />` | Khớp 100% | **PASS** |
| **TC-188-05** | Tích hợp Component OrderTimeline để hiển thị tiến trình | Import và render `<OrderTimeline />` | Khớp 100% | **PASS** |
| **TC-188-06** | Truyền đúng props orderId, currentStatus, historyData | Đầy đủ `orderId`, `currentStatus`, `historyData` | Khớp 100% | **PASS** |
| **TC-188-07** | Chỉ hiển thị các mốc có thời gian thực tế, không suy diễn mốc tương lai | Hàm `getStepCompletedTime` chỉ lấy thời gian từ history thực | Khớp 100% | **PASS** |
| **TC-188-08** | Hiển thị đầy đủ Thông tin nhận hàng | Có người nhận, số điện thoại, địa chỉ, ghi chú | Khớp 100% | **PASS** |
| **TC-188-09** | Hiển thị đầy đủ khối Thanh toán | Có phương thức và trạng thái thanh toán | Khớp 100% | **PASS** |
| **TC-188-10** | Hiển thị danh sách sản phẩm | Lặp qua `items.map`, có số lượng, ảnh, đơn giá, thành tiền | Khớp 100% | **PASS** |
| **TC-188-11** | Hiển thị Tổng tiền đơn hàng qua formatCurrency | Sử dụng hàm `formatCurrency(order.totalAmount)` | Khớp 100% | **PASS** |
| **TC-188-12** | Khách hàng chỉ được phép hủy đơn khi trạng thái là PENDING | Kiểm tra `isPending` và `ORDER_STATUS.PENDING` | Khớp 100% | **PASS** |
| **TC-188-13** | Quy trình hủy đơn sử dụng confirmDialog | Không dùng window.alert() hay window.confirm() | Khớp 100% | **PASS** |
| **TC-188-14** | Gọi API cancelOrder, cập nhật state và thông báo Toast | Gọi `orderService.cancelOrder`, `setOrder`, `notify.success` | Khớp 100% | **PASS** |
| **TC-188-15** | Hỗ trợ thanh toán mô phỏng khi MOCK_ONLINE & PENDING | Có nút "Thanh toán ngay" và gọi `handleMockPay` | Khớp 100% | **PASS** |
| **TC-188-16** | Xử lý bảo mật IDOR (HTTP 403 Forbidden) | Bắt lỗi 403 và thông báo phân quyền bảo mật | Khớp 100% | **PASS** |
| **TC-188-17** | Xử lý Loading state và Error state | Render `<Loading />` và `<ErrorMessage />` | Khớp 100% | **PASS** |
| **TC-188-18** | Cung cấp liên kết quay lại danh sách đơn hàng | Có `<Link to="/orders">Quay lại danh sách</Link>` | Khớp 100% | **PASS** |

---

## 8. KẾT QUẢ KIỂM THỬ THỰC TẾ

1. **Kiểm thử tự động Frontend (`npm test`):**
   - Bộ test `tests/ecom188.order_detail.qa.test.mjs`: **18/18 test cases PASS (100%)**.
   - Tổng thể toàn bộ frontend: **117/117 test cases PASS (100%)**, 3 test suites.
2. **Kiểm tra cú pháp & import (`npm run lint`):**
   - `[LINT PASS] Đã kiểm tra 85 file nguồn trong src/ — 0 lỗi cú pháp/import`.
3. **Kiểm tra đóng gói sản phẩm (`npm run build`):**
   - Vite Production Build thành công 100% (`built in 20.84s`).

---

## 9. NHỮNG LỖI ĐÃ KHẮC PHỤC

1. **Khắc phục lỗi định dạng ngày tháng chưa đồng bộ tiếng Việt:**
   - *Vấn đề:* Ngày đặt hàng trên header dùng format mặc định của trình duyệt, có thể hiển thị theo format US tùy máy tính người dùng (`11/5/2026, 10:00:00 AM`).
   - *Khắc phục:* Chỉ định tường minh các options `{ hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }` với locale `vi-VN`, tạo sự đồng bộ hoàn hảo với dòng thời gian Timeline bên dưới.
2. **Khắc phục lỗ hổng xử lý 403 Forbidden trong `fetchOrderDetail`:**
   - *Vấn đề:* Khi người dùng B mở URL `/orders/1001` thuộc sở hữu của người dùng A, Backend trả về 403 Forbidden. Trước đây giao diện hiển thị thông báo lỗi chung chung ("Không thể tải chi tiết đơn hàng").
   - *Khắc phục:* Bắt chính xác mã trạng thái `err.response?.status === 403` và hiển thị thông báo bảo mật chuyên nghiệp: *"Bạn không có quyền xem thông tin đơn hàng này (Bảo mật IDOR)"*.
3. **Đồng bộ trạng thái sau khi Hủy đơn:**
   - *Vấn đề:* Sau khi khách hàng hủy đơn hàng thành công, nếu chỉ cập nhật badge trạng thái mà không truyền dữ liệu cập nhật xuống Timeline, Timeline có thể giữ mốc cũ.
   - *Khắc phục:* Khi `setOrder(updated)` được gọi với đơn hàng đã cập nhật trạng thái `CANCELLED`, `OrderTimeline` nhận prop `currentStatus={order.status}` mới và tức thì cập nhật giao diện sang bước Hủy màu đỏ.

---

## 10. NHỮNG HẠN CHẾ CÒN LẠI

- Giao diện hiện tại hỗ trợ thanh toán mô phỏng nội bộ (`MOCK_ONLINE`). Trong tương lai khi tích hợp cổng thanh toán thực tế (VNPAY / VNPay QR / MoMo), luồng thanh toán sẽ chuyển hướng sang trang thanh toán của ngân hàng đối tác.

---

## 11. TRẠNG THÁI PASS/FAIL TỪNG TIÊU CHÍ

| STT | Tiêu chí đánh giá | Trạng thái | Ghi chú |
|:---:|:---|:---:|:---|
| 1 | Hiển thị mã đơn, ngày đặt vi-VN, OrderStatus badge | **PASS** | Header hiển thị đầy đủ, rõ ràng và thẩm mỹ |
| 2 | Tích hợp Timeline theo dõi tiến trình đơn hàng | **PASS** | Tích hợp hoàn hảo với component OrderTimeline |
| 3 | Hiển thị mốc thời gian thực tế, không suy diễn mốc tương lai | **PASS** | Chỉ hiển thị thời gian khi có bản ghi lịch sử thực tế |
| 4 | Hiển thị Thông tin người nhận, địa chỉ, ghi chú | **PASS** | Đầy đủ dữ liệu, responsive co giãn linh hoạt |
| 5 | Hiển thị Phương thức và Trạng thái thanh toán | **PASS** | Phân biệt rõ COD và MOCK_ONLINE |
| 6 | Hiển thị Danh sách sản phẩm và Tổng số tiền | **PASS** | Hiển thị ảnh, tên, số lượng, đơn giá, tổng tiền VND |
| 7 | Hủy đơn hàng PENDING qua Confirm Modal | **PASS** | Không dùng confirm() của trình duyệt, cập nhật tức thì |
| 8 | Thanh toán mô phỏng MOCK_ONLINE | **PASS** | Hoạt động trơn tru với paymentService |
| 9 | Bảo mật chống IDOR (HTTP 403 Forbidden) | **PASS** | Chặn truy cập trộm đơn hàng, hiển thị thông báo an toàn |
| 10 | Tuân thủ kiến trúc và kiểm thử tự động | **PASS** | 18/18 Test Cases PASS, Lint PASS, Build PASS |

**KẾT LUẬN CHUNG:** Task **ECOM-188** đạt kết quả **PASS 100%**, sẵn sàng đóng task trên Scrum Board Sprint 2.
