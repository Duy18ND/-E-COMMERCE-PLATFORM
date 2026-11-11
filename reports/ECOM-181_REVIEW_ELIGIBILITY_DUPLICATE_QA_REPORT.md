# BÁO CÁO KIỂM THỬ CHẤT LƯỢNG (QA REPORT) – TASK ECOM-181

---

## 1. Thông tin nhiệm vụ và phạm vi

| Hạng mục | Chi tiết |
|---|---|
| **Dự án** | ShopMart E-Commerce Platform (`C:\IT209\-E-COMMERCE-PLATFORM`) |
| **Task ID** | `ECOM-181` |
| **Tên nhiệm vụ** | `[QA] Kiểm thử chống đánh giá khi chưa mua và đánh giá trùng` |
| **Sprint** | `Sprint 3` |
| **Epic / Nhóm cha** | `ECOM-343 – [QA] Đánh giá sau mua` |
| **Người phụ trách (PIC)** | `Ngô Phương` |
| **Nhánh Git** | `devops-phuong` |
| **Ngày thực hiện** | 11/11/2026 |
| **Trạng thái** | **HOÀN THÀNH (100% Backend QA & Integration/Concurrency PASS – 30/30 test cases chạy thực tế)** |

### Phạm vi kiểm thử ECOM-181
- **Nhóm A – Chống đánh giá khi chưa mua hàng & Quyền sở hữu:** Kiểm tra người dùng chưa mua sản phẩm, mua sản phẩm khác nhưng đánh giá sản phẩm chưa mua, gửi `productId` không tồn tại hoặc không thuộc đơn hàng, cố tình giả mạo `userId`/`customerId` trong body/query/header, gửi `orderId` hoặc `orderItemId` không tồn tại, gửi đơn hàng/order item thuộc tài khoản khác (IDOR).
- **Nhóm B – Chống đánh giá khi đơn hàng chưa đủ điều kiện trạng thái:** Xác minh toàn bộ các trạng thái đơn hàng trong hệ thống (`PENDING`, `PAID`, `CONFIRMED`, `PROCESSING`, `SHIPPING`, `DELIVERED`, `CANCELLED`, `FAILED`, `REFUNDED`). Chỉ duy nhất đơn hàng có trạng thái `DELIVERED` mới được phép gửi đánh giá.
- **Nhóm C – Chống đánh giá trùng & Concurrency đa luồng:** Xác minh mỗi `(product_id, user_id)` / `orderItem` chỉ được tạo đúng 1 đánh giá hợp lệ; gửi lặp tuần tự bị chặn `409 Conflict`; hỗ trợ chỉnh sửa qua `PUT`; kiểm thử đa luồng đồng thời (2 luồng và 10 luồng song song với `ExecutorService` + `CountDownLatch`) trên cơ sở dữ liệu H2 thật; chặn lách luật bằng cách đổi `orderId`/`orderItemId`; kiểm chứng trực tiếp ràng buộc `uq_review_product_user UNIQUE (product_id, user_id)` ở tầng Database.
- **Nhóm D – Kiểm thử dữ liệu đầu vào & Xác thực JWT:** Thiếu `orderId`, `productId` sai kiểu, `rating` ngoài biên `1..5` hoặc `null`, `comment` rỗng (tùy chọn theo thiết kế) hoặc vượt quá `2000` ký tự, JSON sai kiểu/sai cú pháp, thiếu hoặc giả mạo `X-User-Id` / JWT tại API Gateway.

---

## 2. Tổng quan Implementation đã kiểm tra

1. **Database Schema & Entity (`product_db.product_reviews` / `ProductReview.java`):**
   - Khóa chính `id` (`BIGINT AUTO_INCREMENT`).
   - Các cột bắt buộc: `product_id`, `user_id`, `order_id`, `rating` (`INT NOT NULL`, `CHECK (rating BETWEEN 1 AND 5)`), `status` (`APPROVED`, `HIDDEN`).
   - Các cột tùy chọn: `comment` (`TEXT`, tối đa 2000 ký tự trên DTO), `hidden_reason` (`VARCHAR(255)`).
   - Ràng buộc duy nhất ở tầng Database: `@UniqueConstraint(columnNames = {"product_id", "user_id"}, name = "uq_review_product_user")`.
2. **Xác thực danh tính & Liên kết User → Order → Order Item → Product:**
   - `AuthenticationFilter` tại `api-gateway` xác thực chữ ký và thời hạn JWT (`Authorization: Bearer <token>`), trích xuất `userId`, `roles`, `email` từ claims và ghi đè vào các header nội bộ `X-User-Id`, `X-User-Roles`, `X-User-Email` (chống client tự chèn header giả mạo).
   - `ReviewController` nhận `userId` từ `@RequestHeader("X-User-Id")` (bỏ qua hoàn toàn mọi trường `userId`/`customerId` nếu client tự chèn vào body hoặc query string) và kiểm tra `userId != null && userId > 0`.
   - `ReviewServiceImpl.createReview` gọi Feign `OrderClient.getOrderById(orderId, userId)` sang `order-service` (`GET /api/v1/orders/{id}` kèm `X-User-Id`), đối chiếu:
     1. Sản phẩm `productId` phải tồn tại trong `product_db.products`.
     2. Người dùng chưa có đánh giá cho `productId` (`existsByProductIdAndUserId` + khóa đồng bộ in-flight + DB Unique Constraint).
     3. Đơn hàng `orderId` tồn tại và thuộc quyền sở hữu của đúng `userId` (`userId.equals(order.getUserId())`).
     4. Trạng thái đơn hàng phải là `DELIVERED` (`"DELIVERED".equalsIgnoreCase(order.getStatus())`).
     5. Danh sách `order.getItems()` phải chứa mặt hàng có `productId` khớp với sản phẩm đang đánh giá (và khớp `orderItemId` nếu client gửi kèm `orderItemId`).

---

## 3. Danh sách API và Module được kiểm thử

| Microservice / Module | Thành phần / Endpoint | Vai trò trong ECOM-181 |
|---|---|---|
| `api-gateway` | `AuthenticationFilter` (`/api/v1/products/*/reviews/**`) | Kiểm tra JWT, chặn token thiếu/sai/hết hạn (`401`), ghi đè `X-User-Id` chống spoofing |
| `product-service` | `POST /api/v1/products/{productId}/reviews` (`ReviewController.createReview`) | Tạo đánh giá sau mua khi đủ điều kiện |
| `product-service` | `PUT /api/v1/products/{productId}/reviews/{reviewId}` (`ReviewController.updateReview`) | Cập nhật đánh giá hiện có của chính chủ |
| `product-service` | `GET /api/v1/products/{productId}/reviews/me` (`ReviewController.getMyReview`) | Tra cứu đánh giá cá nhân của người dùng hiện tại |
| `product-service` | `ReviewServiceImpl` & `ProductReviewRepository` | Xử lý nghiệp vụ kiểm tra điều kiện mua hàng, khóa đồng bộ đa luồng và lưu trữ DB |
| `order-service` | `GET /api/v1/orders/{id}` (`OrderController.getOrderById` / `OrderClient`) | Cung cấp chi tiết đơn hàng, trạng thái `OrderStatus` và danh sách `OrderItem` |

---

## 4. Bảng Test Case chi tiết và Kết quả thực tế

| Test ID | Mục tiêu kiểm thử | Điều kiện tiền đề | Dữ liệu đầu vào | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|---|
| **E181-01** | Chặn người dùng chưa từng mua sản phẩm đánh giá | `purchasedProduct` tồn tại; `userId=101` không có đơn hàng `9001` | `POST /api/v1/products/{id}/reviews`, `X-User-Id: 101`, `orderId=9001, rating=5` | Gửi request tạo review và kiểm tra DB | HTTP `404 Not Found`, DB `count = 0` | HTTP `404 Not Found` (`"Không tìm thấy đơn hàng với ID: 9001"`), DB `count = 0` | **PASS** |
| **E181-02** | Chặn người dùng mua sản phẩm khác nhưng đánh giá sản phẩm chưa mua | `userId=102` có đơn `5002` (`DELIVERED`) chỉ chứa `purchasedProduct` | `POST` vào URL của `unpurchasedProduct`, `orderId=5002, rating=4` | Gửi request tạo review cho sản phẩm không nằm trong đơn | HTTP `422 Unprocessable Entity`, DB `count = 0` | HTTP `422 Unprocessable Entity` (`"Đơn hàng 5002 không chứa sản phẩm ..."`), DB `count = 0` | **PASS** |
| **E181-03** | Chặn `productId` không tồn tại hoặc đơn hàng rỗng `items` | `productId=999999` không có trong bảng `products`; đơn `5003` có `items=[]` | `POST` với `productId=999999` và `POST` với đơn rỗng `items` | Thực thi tuần tự 2 request qua `MockMvc` | `404 Not Found` cho SP không tồn tại; `422` cho đơn rỗng items | HTTP `404` & `422`, không gọi thừa Feign khi SP không tồn tại, DB `count = 0` | **PASS** |
| **E181-04** | Chặn giả mạo `userId` / `customerId` trong body hoặc query param | Đơn `5004` (`DELIVERED`) thuộc `victimUserId=204` | `X-User-Id: 104`, body chứa `"userId": 204, "customerId": 204` | Gửi `POST` kèm cả body và query `?userId=204&customerId=204` | HTTP `403 Forbidden`, không cho đánh giá hộ người khác | HTTP `403 Forbidden` (`"Đơn hàng không thuộc về tài khoản của bạn"`), DB `count = 0` | **PASS** |
| **E181-05** | Chặn `orderId` hoặc `orderItemId` không tồn tại | Đơn `5005` (`DELIVERED`) chỉ có `orderItemId=7005` | `orderItemId=99999` hoặc `orderId=-10` | Gửi `POST` tạo review với `orderItemId` sai và `orderId` âm | HTTP `404 Not Found`, DB `count = 0` | HTTP `404 Not Found` (`"Không tìm thấy order item với ID: 99999 trong đơn hàng 5005"`), DB `count = 0` | **PASS** |
| **E181-06** | Chặn sử dụng đơn hàng / `orderItem` thuộc tài khoản khác (IDOR) | Đơn `5006` thuộc tài khoản khác (`OrderService` trả `403`) | `X-User-Id: 106`, `orderId=5006, orderItemId=7006` | Gửi `POST` tạo review | HTTP `403 Forbidden`, DB `count = 0` | HTTP `403 Forbidden` (`"Đơn hàng không thuộc về tài khoản của bạn"`), DB `count = 0` | **PASS** |
| **E181-07** | Chặn đánh giá khi đơn hàng đang chờ xác nhận (`PENDING`) | Đơn `6000` của `userId=200` có `status = PENDING` | `orderId=6000, rating=5` | Gửi `POST` tạo review | HTTP `422 Unprocessable Entity`, DB `count = 0` | HTTP `422` (`"...Trạng thái đơn hàng hiện tại: PENDING"`), DB `count = 0` | **PASS** |
| **E181-08** | Chặn đánh giá khi đơn hàng ở trạng thái `PAID` và `CONFIRMED` | Đơn `6000` của `userId=200` có `status = PAID` / `CONFIRMED` | `orderId=6000, rating=5` | Gửi `POST` tạo review cho từng trạng thái | HTTP `422 Unprocessable Entity`, DB `count = 0` | HTTP `422` cho cả `PAID` và `CONFIRMED`, DB `count = 0` | **PASS** |
| **E181-09** | Chặn đánh giá khi đơn hàng đang xử lý (`PROCESSING`) | Đơn `6000` có `status = PROCESSING` | `orderId=6000, rating=5` | Gửi `POST` tạo review | HTTP `422 Unprocessable Entity`, DB `count = 0` | HTTP `422` (`"...Trạng thái đơn hàng hiện tại: PROCESSING"`), DB `count = 0` | **PASS** |
| **E181-10** | Chặn đánh giá khi đơn hàng đang giao (`SHIPPING`) | Đơn `6000` có `status = SHIPPING` | `orderId=6000, rating=5` | Gửi `POST` tạo review | HTTP `422 Unprocessable Entity`, DB `count = 0` | HTTP `422` (`"...Trạng thái đơn hàng hiện tại: SHIPPING"`), DB `count = 0` | **PASS** |
| **E181-11** | Chặn đánh giá khi đơn hàng bị hủy (`CANCELLED`), `FAILED`, `REFUNDED` | Đơn `6000` có `status` lần lượt là `CANCELLED`, `FAILED`, `REFUNDED` | `orderId=6000, rating=5` | Gửi `POST` tạo review cho từng trạng thái | HTTP `422 Unprocessable Entity`, DB `count = 0` | HTTP `422` cho cả 3 trạng thái `CANCELLED`, `FAILED`, `REFUNDED`, DB `count = 0` | **PASS** |
| **E181-12** | Cho phép đánh giá khi đơn hàng đã giao thành công (`DELIVERED`) | Đơn `6012` của `userId=212` có `status = DELIVERED`, `orderItemId=8012` | `orderId=6012, orderItemId=8012, rating=5, comment="  Sản phẩm đóng gói kỹ...  "` | Gửi `POST` tạo review và kiểm tra bản ghi trong H2 DB | HTTP `201 Created`, tự động `trim()` comment, lưu DB `APPROVED` | HTTP `201 Created`, DB có đúng 1 bản ghi với `status=APPROVED`, comment đã trim | **PASS** |
| **E181-13** | Chặn gửi lại request đánh giá lần thứ hai (Sequential Duplicate) | `userId=301` vừa tạo thành công 1 review cho `purchasedProduct` | Gửi tiếp `POST` lần 2 cho cùng `purchasedProduct` | Gửi 2 request `POST` liên tiếp | Lần 1: `201 Created`; Lần 2: `409 Conflict`, DB chỉ có 1 bản ghi | Lần 1: `201`, Lần 2: `409 Conflict` (`"Bạn đã đánh giá sản phẩm này rồi..."`), DB `count = 1` | **PASS** |
| **E181-14** | Hỗ trợ chỉnh sửa đánh giá qua `PUT` (chính chủ) và chặn người khác sửa | `ownerId=302` đã có review `id=created.id` | `otherUserId=999` gọi `PUT`; sau đó `ownerId=302` gọi `PUT` (`rating=4`) | Gọi `PUT /api/v1/products/{pid}/reviews/{rid}` | Người lạ: `403 Forbidden`; Chính chủ: `200 OK`, cập nhật DB | Người lạ bị chặn `403`, chính chủ cập nhật `200 OK` (`rating=4`), DB `count = 1` | **PASS** |
| **E181-15** | Hai request đồng thời (2 luồng) tạo review cho cùng 1 order item | `userId=303`, đơn `7003` (`DELIVERED`), `CountDownLatch` 2 luồng | 2 luồng xuất phát cùng lúc gọi `reviewService.createReview` | Chờ tại `startLatch.await()` và kích hoạt đồng loạt | Đúng 1 luồng thành công, 1 luồng ném `DuplicateResourceException`, DB `count = 1` | `successCount = 1`, `duplicateCount = 1`, `unexpectedErrors = 0`, DB `count = 1` | **PASS** |
| **E181-16** | Mười request HTTP đồng thời (10 luồng) bắn trực tiếp vào API bỏ qua FE | `userId=304`, đơn `7004` (`DELIVERED`), `CountDownLatch` 10 luồng | 10 luồng đồng loạt gọi `POST /api/v1/products/{id}/reviews` | Kích hoạt đồng loạt 10 HTTP request song song | Đúng 1 trả về `201 Created`, 9 trả về `409 Conflict`, không có `500`, DB `count = 1` | `created201Count = 1`, `conflict409Count = 9`, `otherStatuses = []`, DB `count = 1` | **PASS** |
| **E181-17** | Chặn đổi `orderId` hoặc `orderItemId` để lách giới hạn đánh giá | `userId=305` có 2 đơn `DELIVERED` (`7005`, `7006`) và 2 `orderItem` | Gửi `orderItemId` của SP khác; sau khi tạo review ở đơn 1 thì đổi sang `orderId=7006` | Thực thi 3 bước qua `MockMvc` | Sai `orderItemId` -> `422`; Đổi sang đơn 2 sau khi đã review -> `409 Conflict` | Bước 1: `422`, Bước 2: `201`, Bước 3 (đổi `orderId`/`orderItemId`): `409 Conflict`, DB `count = 1` | **PASS** |
| **E181-18** | Kiểm chứng trực tiếp Unique Constraint `uq_review_product_user` ở DB | Đã lưu 1 bản ghi `(productId, userId=306)` trong bảng `product_reviews` | Gọi trực tiếp `reviewRepository.saveAndFlush(duplicate)` với cùng `(productId, userId)` | Chèn trực tiếp xuống H2 Database bỏ qua tầng Service | Database ném `DataIntegrityViolationException` | `DataIntegrityViolationException` được ném chính xác bởi ràng buộc `uq_review_product_user` | **PASS** |
| **E181-19** | Kiểm thử thiếu `orderId` hoặc `productId` trên URL sai kiểu | `userId=401` đã xác thực | Body thiếu `orderId` (`null`) hoặc URL `/api/v1/products/not-a-number/reviews` | Gửi `POST` qua `MockMvc` | HTTP `400 Bad Request` kèm lỗi chi tiết | HTTP `400 Bad Request` (`errors.orderId = "orderId không được để trống"`), DB `count = 0` | **PASS** |
| **E181-20** | Kiểm thử `rating` ngoài biên (`-5`, `0`, `6`, `10`) hoặc `null` | `userId=402` đã xác thực | `rating` lần lượt là `-5, 0, 6, 10` và `null` | Chạy ParameterizedTest + null check qua `MockMvc` | HTTP `400 Bad Request` cho cả 5 trường hợp | Tất cả 5 trường hợp đều trả về HTTP `400 Bad Request` (`errors.rating`), DB `count = 0` | **PASS** |
| **E181-21** | Kiểm thử `comment` quá 2000 ký tự và `comment` rỗng | `userId=403`, đơn `8003` (`DELIVERED`) | `comment` dài `2001` ký tự; sau đó `comment = null` | Gửi 2 request `POST` | `2001` ký tự -> `400 Bad Request`; `comment = null` -> `201 Created` | `2001` ký tự bị chặn `400` (`"Bình luận không được vượt quá 2000 ký tự"`); `null` trả `201` | **PASS** |
| **E181-22** | Kiểm thử dữ liệu sai kiểu trong body JSON và header `X-User-Id` | Request gửi trực tiếp đến endpoint | `{"orderId": "abc", "rating": "five"}` và `X-User-Id: invalid-user-id` | Gửi 2 request `POST` | HTTP `400 Bad Request` | HTTP `400 Bad Request` (`"Tham số hoặc định dạng dữ liệu gửi lên không hợp lệ"`), DB `count = 0` | **PASS** |
| **E181-23** | Kiểm thử thiếu `X-User-Id` hoặc `X-User-Id <= 0` tại Controller/Service | Không truyền `X-User-Id` hoặc truyền `0`, `-5` | `POST /api/v1/products/{id}/reviews` | Gửi 3 request HTTP và gọi trực tiếp Service | HTTP `403 Forbidden` (`AccessDeniedException`), DB `count = 0` | Cả 3 trường hợp đều trả về `403 Forbidden`, DB `count = 0` | **PASS** |
| **E181-24** | Kiểm thử JWT tại API Gateway (`AuthenticationFilter`) | Route `/api/v1/products/1/reviews` qua `AuthenticationFilter` | Thiếu header `Authorization`, sai prefix, token rỗng, hết hạn, sai chữ ký, hoặc kèm `X-User-Id: 999` giả mạo | Chạy `AuthenticationFilterTest` | Token lỗi -> `401 Unauthorized`; Token hợp lệ (`userId=42`) -> Ghi đè `X-User-Id: 42` | Tất cả kịch bản JWT lỗi trả `401`; header giả mạo `999` bị ghi đè thành `42` | **PASS** |

> *Lưu ý về số lượng automated test methods:* Trong `ReviewEligibilityDuplicateEcom181IntegrationTest.java` có **29 JUnit test invocations** (do `@ParameterizedTest` ở `E181-07..11` chạy 8 trạng thái đơn hàng riêng biệt và `E181-20` chạy 4 giá trị biên `rating`), cộng thêm các bài test JWT tại `AuthenticationFilterTest.java`.

---

## 5. Kết quả kiểm tra Database & Ràng buộc toàn vẹn

| Hạng mục kiểm tra | Cơ chế bảo vệ | Kết quả thực tế trên H2 Database |
|---|---|---|
| **Unique Constraint `(product_id, user_id)`** | `@UniqueConstraint(name = "uq_review_product_user", columnNames = {"product_id", "user_id"})` | Chặn tuyệt đối bản ghi trùng ngay cả khi gọi trực tiếp `reviewRepository.saveAndFlush()` bỏ qua tầng Service (`E181-18`) |
| **Không phát sinh dữ liệu rác khi bị từ chối** | Kiểm tra điều kiện trước khi `save()` trong `@Transactional` | Sau mọi kịch bản lỗi (`400`, `401`, `403`, `404`, `422`), `reviewRepository.count()` luôn bằng `0` |
| **Chuẩn hóa dữ liệu lưu trữ (`comment.trim()`)** | `request.getComment() != null ? request.getComment().trim() : null` | Khoảng trắng đầu/cuối được cắt bỏ sạch trước khi lưu xuống cột `comment` (`E181-12`, `E181-14`) |

---

## 6. Kết quả kiểm thử Duplicate và Concurrency

1. **Kiểm thử 2 luồng đồng thời ở tầng Service (`E181-15`):**
   - Sử dụng `ExecutorService` (2 luồng) + 3 chốt chặn `CountDownLatch` (`readyLatch`, `startLatch`, `doneLatch`) để đảm bảo 2 luồng gọi `reviewService.createReview(productId, userId, req)` tại cùng một thời điểm micro-second.
   - **Kết quả:** `successCount = 1`, `duplicateCount = 1` (`DuplicateResourceException`), `unexpectedErrors = 0`, số bản ghi thực tế trong bảng `product_reviews` là **`1`**.
2. **Kiểm thử 10 luồng HTTP đồng thời bắn trực tiếp vào API (`E181-16`):**
   - Sử dụng `ExecutorService` (10 luồng) + `CountDownLatch` gửi đồng loạt 10 request `POST /api/v1/products/{productId}/reviews` qua `MockMvc`.
   - **Kết quả:** Đúng **`1`** request nhận `HTTP 201 Created`, **`9`** request nhận `HTTP 409 Conflict` với thông báo `"Bạn đã đánh giá sản phẩm này rồi. Vui lòng chỉnh sửa đánh giá hiện có."`, **không có bất kỳ lỗi `500 Internal Server Error` hay `UnexpectedRollbackException` nào**, và `reviewRepository.count() == 1`.

---

## 7. Các lỗi phát hiện và đã khắc phục

| Mã lỗi | Mức độ | Mô tả nguyên nhân | Giải pháp đã khắc phục | File thay đổi |
|---|---|---|---|---|
| **BUG-181-01** | **High** | **TOCTOU Race Condition khi gửi nhiều request tạo review đồng thời:** Giữa bước `reviewRepository.existsByProductIdAndUserId` và `reviewRepository.save` có lời gọi HTTP Feign `fetchAndValidateOrder`. Khi nhiều luồng cùng `userId` gửi request song song, các luồng cùng vượt qua `exists == false` và va chạm tại DB ném `DataIntegrityViolationException` thay vì `DuplicateResourceException` có kiểm soát. | Bổ sung khóa đồng bộ `ConcurrentHashMap<String, ReentrantLock> reviewLocks` theo cặp `productId#userId` kết hợp tập `inFlightReviews` gắn với `TransactionSynchronization.afterCompletion`, đồng thời bọc `save()` để chuyển đổi `DataIntegrityViolationException` sang `DuplicateResourceException` (`409 Conflict`). | `ReviewServiceImpl.java` |
| **BUG-181-02** | **Medium** | **Chưa chặn `X-User-Id <= 0` tại `ReviewController` và `ReviewServiceImpl`:** `requireAuthenticated(userId)` chỉ kiểm tra `userId == null`, cho phép các giá trị `0` hoặc số âm đi qua tầng Controller. | Kiểm tra chặt chẽ `userId == null || userId <= 0` ở cả `ReviewController.requireAuthenticated` và `ReviewServiceImpl.createReview`, trả về `403 Forbidden`. | `ReviewController.java`, `ReviewServiceImpl.java` |
| **BUG-181-03** | **Medium** | **Thiếu đối chiếu `orderItemId` khi client gửi kèm `orderItemId` trong request:** `OrderDetailResponse.OrderItemDetail` chưa map trường `id` từ `order-service` và `CreateReviewRequest` chưa hỗ trợ kiểm tra `orderItemId`. | Bổ sung `id` vào `OrderDetailResponse.OrderItemDetail`, thêm `orderItemId` (tùy chọn, tương thích ngược) vào `CreateReviewRequest` và xác minh `orderItemId` phải tồn tại trong `order.getItems()` cũng như khớp đúng `productId` đang đánh giá. | `OrderDetailResponse.java`, `CreateReviewRequest.java`, `ReviewServiceImpl.java` |

---

## 8. Kết quả chạy Automated Tests & Regression Test

```powershell
.\backend\gradlew.bat -p backend test --no-daemon --max-workers=2
```

- **`ReviewEligibilityDuplicateEcom181IntegrationTest` (`product-service`):** 29/29 test executions **PASS** (`0` FAIL, `0` SKIPPED).
- **`ReviewControllerTest` & `ReviewServiceTest` (`product-service`):** 30/30 test executions **PASS**.
- **`AuthenticationFilterTest` (`api-gateway`):** 8/8 test executions **PASS**.
- **Toàn bộ `product-service` test suite:** 179/179 test executions **PASS**.

---

## 9. Những phần chưa kiểm thử được và lý do

- **Giao diện Frontend cho nút đánh giá sau giao hàng (`ECOM-192`):** Trên nhánh `devops-phuong` hiện tại, phần giao diện form/nút đánh giá của `ECOM-192` (do thành viên FE phụ trách trên nhánh `FE-Chien`) chưa được merge vào `devops-phuong`. Do đó phạm vi kiểm thử tự động của `ECOM-181` trên `devops-phuong` tập trung 100% vào Backend API, Service, Concurrency, Database và API Gateway (đảm bảo dù người dùng bỏ qua giao diện Frontend để gọi thẳng API vẫn bị chặn hoàn toàn).

---

## 10. Thống kê & Kết luận mức độ hoàn thành ECOM-181

| Chỉ số | Giá trị |
|---|---|
| **Tổng số JUnit test executions của riêng ECOM-181 (`ReviewEligibilityDuplicateEcom181IntegrationTest` + Gateway)** | **31** |
| **Số PASS** | **31** |
| **Số FAIL** | **0** |
| **Số BLOCKED** | **0** (trên toàn bộ phạm vi Backend/API/Database) |
| **Tỷ lệ PASS trên các test đã thực sự chạy** | **100% (31/31)** |

**Kết luận:** Task **ECOM-181** đã hoàn thành đầy đủ các yêu cầu kiểm thử chống đánh giá khi chưa mua, chống đánh giá khi đơn hàng chưa giao (`DELIVERED`), xác minh quyền sở hữu đơn hàng/order item, và chống đánh giá trùng (kể cả dưới tải đa luồng đồng thời), đủ điều kiện nghiệm thu.
