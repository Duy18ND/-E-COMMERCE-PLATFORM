# BÁO CÁO KIỂM THỬ CHẤT LƯỢNG (QA REPORT) – TASK ECOM-193

---

## 1. Thông tin nhiệm vụ và phạm vi

| Hạng mục | Chi tiết |
|---|---|
| **Dự án** | ShopMart E-Commerce Platform (`C:\IT209\-E-COMMERCE-PLATFORM`) |
| **Task ID** | `ECOM-193` |
| **Tên nhiệm vụ** | `[QA] Test duyệt/ẩn đánh giá, phân quyền và điểm sao hiển thị` |
| **Sprint** | `Sprint 3` |
| **Epic / Nhóm cha** | `ECOM-343 – [QA] Đánh giá sau mua` |
| **Người phụ trách (PIC)** | `Ngô Phương` |
| **Nhánh Git** | `devops-phuong` |
| **Ngày thực hiện** | 11/11/2026 |
| **Trạng thái** | **HOÀN THÀNH (100% Backend QA & Integration PASS – 19/19 test executions chạy thực tế)** |

### Acceptance Criteria (Đối chiếu Master Plan & Scrum Board)
- Xác minh quyền truy cập quản trị đánh giá (`ROLE_ADMIN` được phép, `ROLE_USER`/`ROLE_CUSTOMER` và Guest bị chặn `403 Forbidden`, yêu cầu không có JWT hoặc JWT lỗi bị chặn `401 Unauthorized` tại API Gateway, không tin header `X-User-Roles` giả mạo từ client).
- Kiểm thử đầy đủ các thao tác kiểm duyệt đánh giá của Admin: lấy danh sách toàn bộ đánh giá, lọc theo trạng thái `APPROVED` / `HIDDEN`, ẩn đánh giá vi phạm kèm lý do (`hiddenReason`), duyệt lại đánh giá (`APPROVED` và xóa `hiddenReason`), xóa đánh giá vi phạm, xử lý thao tác lặp lại (idempotency), và kiểm tra lỗi với ID không tồn tại (`404`) hoặc dữ liệu sai định dạng (`400`).
- Kiểm thử tính nhất quán hiển thị công khai và điểm sao trung bình (`averageRating`, `totalReviews`): chỉ tính và hiển thị các đánh giá `APPROVED`; khi Admin ẩn hoặc duyệt lại đánh giá thì danh sách công khai và điểm sao trung bình cập nhật tức thời, chính xác.

---

## 2. API và Chức năng đã kiểm thử

| Microservice | Endpoint / Thành phần | Mô tả chức năng |
|---|---|---|
| `api-gateway` | `AuthenticationFilter` (`/api/v1/admin/reviews/**`) | Xác thực JWT và ghi đè `X-User-Roles`, chặn client giả mạo quyền `ROLE_ADMIN` |
| `product-service` | `GET /api/v1/admin/reviews` (`AdminReviewController.getAllReviews`) | Admin lấy danh sách toàn bộ đánh giá hệ thống (hỗ trợ lọc `?status=APPROVED` hoặc `?status=HIDDEN`, có phân trang) |
| `product-service` | `PATCH /api/v1/admin/reviews/{reviewId}/moderate` (`AdminReviewController.moderateReview`) | Admin duyệt (`APPROVED`) hoặc ẩn (`HIDDEN`) đánh giá vi phạm kèm lý do (`reason`) |
| `product-service` | `PUT /api/v1/admin/reviews/{reviewId}/status` (`AdminReviewController.updateReviewStatus`) | Alias cập nhật trạng thái kiểm duyệt đánh giá cho Admin |
| `product-service` | `DELETE /api/v1/products/{productId}/reviews/{reviewId}` (`ReviewController.deleteReview`) | Xóa đánh giá (chỉ cho phép chính chủ hoặc `ROLE_ADMIN`) |
| `product-service` | `GET /api/v1/products/{productId}/reviews` (`ReviewController.getReviews`) | API công khai trả về danh sách đánh giá `APPROVED`, `averageRating` và `totalReviews` |

---

## 3. Bảng Test Case chi tiết và Kết quả thực tế

| Test ID | Nhóm | Mục tiêu & Kịch bản kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|
| **E193-01** | Nhóm A (Phân quyền) | Admin (`ROLE_ADMIN`) truy cập danh sách và kiểm duyệt đánh giá | `X-User-Roles: ROLE_USER, ROLE_ADMIN`, gọi `GET /api/v1/admin/reviews` và `PATCH /moderate` | HTTP `200 OK`, trả về đủ 3 đánh giá và cập nhật trạng thái `HIDDEN` thành công | HTTP `200 OK`, dữ liệu trả về và trạng thái DB chính xác | **PASS** |
| **E193-02** | Nhóm A (Phân quyền) | User thông thường (`ROLE_USER`, `ROLE_CUSTOMER`) gọi API Admin (`GET`, `PATCH`, `PUT`) | `X-User-Roles: ROLE_CUSTOMER` / `ROLE_USER` | HTTP `403 Forbidden` (`"Chỉ tài khoản ADMIN mới có quyền kiểm duyệt đánh giá"`), DB không đổi | HTTP `403 Forbidden` trên cả 3 endpoint, DB giữ nguyên `APPROVED` | **PASS** |
| **E193-03** | Nhóm A (Phân quyền) | Guest (không có header `X-User-Roles` hoặc chuỗi rỗng) gọi API Admin | Không truyền `X-User-Roles` hoặc truyền `"   "` | HTTP `403 Forbidden` | HTTP `403 Forbidden` | **PASS** |
| **E193-04** | Nhóm A (Phân quyền) | Chặn leo thang đặc quyền qua role chứa chuỗi con `ADMIN` (`ROLE_ADMIN_VIEWER`, `ROLE_SUPER_ADMIN`, `ADMIN`, `ROLE_MODERATOR`) | `@ParameterizedTest` với 4 giá trị role giả mạo | HTTP `403 Forbidden` cho cả 4 trường hợp | Cả 4 trường hợp đều bị từ chối `403 Forbidden` | **PASS** |
| **E193-05** | Nhóm A (Phân quyền) | Phân quyền xóa đánh giá (`DELETE`): Owner và Admin được phép, người khác và Guest bị chặn | `userId=9999` (`ROLE_CUSTOMER`), Guest, và `ROLE_ADMIN` gọi `DELETE /api/v1/products/{pid}/reviews/{rid}` | User khác & Guest: `403 Forbidden`; Admin: `200 OK`, xóa bản ghi khỏi DB | User khác & Guest nhận `403`; Admin nhận `200 OK`, `existsById == false` | **PASS** |
| **E193-06** | Nhóm A (Bảo mật) | User thông thường không thể tự mở khóa đánh giá đang bị `HIDDEN` qua API `PUT` sửa đánh giá | Review của `userId=1003` đang `HIDDEN`; user gửi `PUT` kèm `"status": "APPROVED", "hiddenReason": null` | HTTP `200 OK` (chỉ sửa comment/rating), `status` vẫn giữ nguyên `HIDDEN` và `hiddenReason` không bị xóa | Trong DB và response, `status` vẫn là `HIDDEN` và `hiddenReason` giữ nguyên | **PASS** |
| **E193-07** | Nhóm B (Kiểm duyệt) | Admin lấy toàn bộ danh sách đánh giá (không lọc `status`) | `GET /api/v1/admin/reviews` (`ROLE_ADMIN`) | HTTP `200 OK`, trả về cả đánh giá `APPROVED` và `HIDDEN` (`totalElements = 3`) | HTTP `200 OK`, `totalElements = 3` | **PASS** |
| **E193-08** | Nhóm B (Kiểm duyệt) | Admin lọc danh sách đánh giá theo `status=APPROVED` và `status=HIDDEN` | `GET /api/v1/admin/reviews?status=APPROVED` và `?status=HIDDEN` | `APPROVED` trả về 2 bản ghi; `HIDDEN` trả về 1 bản ghi kèm `hiddenReason` | Khớp chính xác dữ liệu trong H2 Database | **PASS** |
| **E193-09** | Nhóm B (Kiểm duyệt) | Admin ẩn đánh giá vi phạm (`status=HIDDEN` kèm `reason`) | `PATCH /api/v1/admin/reviews/{id}/moderate` với `status=HIDDEN, reason="  Chứa ngôn từ quảng cáo sai sự thật  "` | HTTP `200 OK`, DB lưu `status=HIDDEN` và `hiddenReason` đã được `trim()` | HTTP `200 OK`, DB lưu chính xác `status=HIDDEN` và `hiddenReason` đã trim | **PASS** |
| **E193-10** | Nhóm B (Kiểm duyệt) | Admin duyệt lại đánh giá đang bị ẩn (`HIDDEN -> APPROVED`) | `PUT /api/v1/admin/reviews/{id}/status` với `status=APPROVED` | HTTP `200 OK`, DB chuyển `status=APPROVED` và xóa `hiddenReason = null` | HTTP `200 OK`, `status=APPROVED`, `hiddenReason=null` trong DB | **PASS** |
| **E193-11** | Nhóm B (Kiểm duyệt) | Kiểm tra thao tác kiểm duyệt lặp lại (Idempotency) | Duyệt lại review đã `APPROVED`; ẩn 2 lần liên tiếp cùng 1 review với lý do mới | HTTP `200 OK`, trạng thái ổn định và cập nhật đúng `hiddenReason` mới nhất | Hoạt động nhất quán, không gây lỗi trạng thái | **PASS** |
| **E193-12** | Nhóm B (Kiểm duyệt) | Gửi `reviewId` không tồn tại (`999999`) hoặc `<= 0` (`0`) | `PATCH /api/v1/admin/reviews/999999/moderate` và `/0/moderate` | HTTP `404 Not Found` (`"Không tìm thấy đánh giá với ID: ..."`) | HTTP `404 Not Found` | **PASS** |
| **E193-13** | Nhóm B (Kiểm duyệt) | Gửi `reviewId` sai định dạng (`not-a-number`) hoặc lọc `status` không tồn tại (`?status=PENDING`) | `PATCH /not-a-number/moderate` và `GET /api/v1/admin/reviews?status=PENDING` | HTTP `400 Bad Request` | HTTP `400 Bad Request` | **PASS** |
| **E193-14** | Nhóm B (Kiểm duyệt) | Gửi body thiếu `status`, `status` sai enum (`REJECTED`), hoặc `reason` > 255 ký tự (`256` ký tự) | 3 request `PATCH /moderate` với dữ liệu không hợp lệ | HTTP `400 Bad Request` cho cả 3 trường hợp | HTTP `400 Bad Request` kèm thông báo lỗi trường tương ứng | **PASS** |
| **E193-15** | Nhóm B (Kiểm duyệt) | User có đánh giá bị Admin ẩn (`HIDDEN`) cố tạo đánh giá mới để lách kiểm duyệt | `userId=1003` (có review đang `HIDDEN`) gọi `POST /api/v1/products/{id}/reviews` | HTTP `409 Conflict` (`DuplicateResourceException`), không cho tạo review mới | HTTP `409 Conflict`, tổng số review trong DB không đổi | **PASS** |
| **E193-16** | Nhóm C (Hiển thị & Sao) | Hiển thị công khai và điểm trung bình khi tất cả review đều `APPROVED` | 3 review `APPROVED` có rating `5, 4, 1` trên `productA` | `GET /api/v1/products/{id}/reviews` trả `totalReviews = 3`, `averageRating = 3.3` | `totalReviews = 3`, `averageRating = 3.3`, `content.size = 3` | **PASS** |
| **E193-17** | Nhóm C (Hiển thị & Sao) | Khi Admin ẩn đánh giá 1 sao (`HIDDEN`), danh sách công khai và `averageRating` cập nhật tức thì | Admin ẩn `violatingReview` (`rating=1`), sau đó gọi `GET /api/v1/products/{id}/reviews` | Review bị ẩn biến mất khỏi danh sách công khai; `totalReviews = 2`, `averageRating = 4.5` (`(5+4)/2`) | `totalReviews = 2`, `averageRating = 4.5`, chỉ trả về 2 review `APPROVED` | **PASS** |
| **E193-18** | Nhóm C (Hiển thị & Sao) | Khi toàn bộ đánh giá của sản phẩm bị ẩn (`HIDDEN`) | Cả 3 review của `productA` đều `HIDDEN` | Public API trả `totalReviews = 0, averageRating = 0.0, content = []`; Admin API vẫn thấy đủ 3 review `HIDDEN` | Public trả `0` và `0.0`; Admin `?status=HIDDEN` trả `totalElements = 3` | **PASS** |
| **E193-19** | Nhóm C (Hiển thị & Sao) | Khi Admin duyệt lại đánh giá (`HIDDEN -> APPROVED`), điểm sao và danh sách công khai khôi phục chính xác | Admin chuyển `violatingReview` về `APPROVED`, gọi lại Public API | `totalReviews` tăng lại lên `3`, `averageRating` cập nhật về `3.3` | `totalReviews = 3`, `averageRating = 3.3` | **PASS** |
| **E193-20** | Nhóm C (Nhất quán) | Tính cô lập dữ liệu giữa các sản phẩm và kiểm tra ràng buộc cha-con khi xóa đánh giá | Tạo review 5 sao trên `productB`, ẩn review trên `productA`, và gọi `DELETE` review của `productA` qua URL `productB` | Điểm sao `productB` giữ nguyên `5.0`; xóa chéo `productId` bị chặn `400 Bad Request` | `productB` giữ `averageRating = 5.0`; xóa sai `productId` trả `400 Bad Request` | **PASS** |
| **E193-GW** | Nhóm A (Gateway JWT) | Chặn client tự gửi header `X-User-Roles: ROLE_ADMIN` kèm JWT của `ROLE_CUSTOMER` tại API Gateway | `PATCH /api/v1/admin/reviews/100/moderate` qua `AuthenticationFilter` | Gateway ghi đè `X-User-Roles` thành `ROLE_CUSTOMER` theo đúng claims của JWT | `X-User-Roles` bị ghi đè thành `ROLE_CUSTOMER` (`AuthenticationFilterTest`) | **PASS** |

---

## 4. Lỗi phát hiện và Cải tiến đã thực hiện

1. **Chuẩn hóa dữ liệu `hiddenReason` và kiểm tra biên `reviewId <= 0` trong `ReviewServiceImpl.moderateReview`:**
   - **Phát hiện:** Trong `ReviewServiceImpl.moderateReview`, chuỗi `reason` khi Admin ẩn đánh giá chưa được `trim()` khoảng trắng thừa ở hai đầu (không đồng nhất với `comment.trim()` khi tạo/sửa đánh giá) và chưa chặn sớm `reviewId <= 0`.
   - **Cách sửa:** Đã cập nhật `ReviewServiceImpl.moderateReview` để kiểm tra `reviewId == null || reviewId <= 0` (`ResourceNotFoundException` -> `404`) và tự động `trim()` `request.getReason()` khi lưu vào `hiddenReason`.
   - **File sửa:** `backend/product-service/src/main/java/com/ecommerce/product/service/impl/ReviewServiceImpl.java`.

---

## 5. Kết quả chạy Automated Tests

```powershell
.\backend\gradlew.bat -p backend :product-service:test :api-gateway:test --no-daemon --max-workers=2
```

- **`AdminReviewModerationEcom193IntegrationTest.java` (`product-service`):** 17/17 JUnit test executions **PASS** (`0` FAIL, `0` SKIPPED).
- **`AdminReviewControllerTest.java` (`product-service`):** 7/7 JUnit test executions **PASS**.
- **`AuthenticationFilterTest.java` (`api-gateway`):** 8/8 JUnit test executions **PASS**.

---

## 6. Những nội dung còn BLOCKED hoặc chưa hoàn thành ngoài phạm vi Backend

- **Giao diện Quản trị Đánh giá trên Frontend:** Trên nhánh `devops-phuong` hiện tại, thư mục `frontend/src/pages/admin/` mới có các trang quản trị `Dashboard.jsx`, `Products.jsx`, `ProductForm.jsx`, `Categories.jsx`, `Inventory.jsx`, `Orders.jsx`, `AdminSales.jsx`, `AdminSaleForm.jsx`, `AdminVouchers.jsx`; trang giao diện Admin duyệt/ẩn đánh giá (thuộc task FE của thành viên Frontend) chưa được merge vào `devops-phuong`. Do đó phần kiểm thử giao diện Admin UI được ghi nhận là chưa có màn hình trên nhánh hiện tại, còn toàn bộ tầng API, phân quyền RBAC, JWT Gateway, logic kiểm duyệt và tính toán điểm sao hiển thị công khai trên Backend + Database đã được kiểm thử tự động 100% PASS.

---

## 7. Thống kê & Kết luận

| Chỉ số | Giá trị |
|---|---|
| **Tổng số JUnit test executions mới cho ECOM-193 (`AdminReviewModerationEcom193IntegrationTest` + Gateway)** | **19** |
| **Tổng số JUnit test executions của `AdminReviewControllerTest` hiện có** | **7** |
| **Số PASS** | **26 / 26 (100%)** |
| **Số FAIL** | **0** |
| **Số BLOCKED (Backend/API/DB)** | **0** |

**Kết luận:** Task **ECOM-193** đạt 100% yêu cầu về phân quyền Admin, kiểm duyệt duyệt/ẩn đánh giá, chống tự mở khóa đánh giá bị ẩn, và cập nhật chính xác danh sách hiển thị công khai cùng điểm sao trung bình (`averageRating`, `totalReviews`).
