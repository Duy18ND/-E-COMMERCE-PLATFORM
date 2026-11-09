# TÀI LIỆU ĐẶC TẢ KỸ THUẬT REST API (API DOCUMENTATION)
## HỆ THỐNG THƯƠNG MẠI ĐIỆN TỬ SHOPMART — MICROSERVICES ARCHITECTURE
### Tài liệu bàn giao & Nghiệm thu Kỹ thuật — Sub-task ECOM-156 (thuộc ECOM-329)

---

## 1. THÔNG TIN TỔNG QUAN

- **Cổng truy cập tập trung (Base URL):** `http://localhost:8080` (API Gateway) hoặc `http://localhost` (Nginx Reverse Proxy)
- **Chuẩn trao đổi dữ liệu:** JSON (`Content-Type: application/json; charset=UTF-8`)
- **Cơ chế xác thực (Authentication):** JSON Web Token (JWT) theo chuẩn RFC 7519, truyền qua header:
  ```http
  Authorization: Bearer <jwt_token>
  ```
- **Cấu trúc phản hồi chuẩn (Standard ApiResponse Structure):**
  ```json
  {
    "status": 200,
    "message": "Thao tác thành công",
    "data": { ... },
    "timestamp": "2026-11-09T08:00:00"
  }
  ```
- **Cấu trúc phản hồi lỗi chuẩn (Standard ErrorResponse Structure):**
  ```json
  {
    "status": 400,
    "error": "Validation Failed",
    "message": "Dữ liệu đầu vào không hợp lệ",
    "path": "/api/v1/orders/checkout",
    "validationErrors": {
      "receiverPhone": "Số điện thoại không đúng định dạng"
    },
    "timestamp": "2026-11-09T08:00:00"
  }
  ```

---

## 2. NHÓM 1: AUTHENTICATION & USERS (AUTH SERVICE :8081)

### 2.1. Đăng ký tài khoản mới (Customer Register)
- **Method:** `POST`
- **URL:** `/api/v1/auth/register`
- **Chức năng:** Tạo tài khoản khách hàng mới với quyền mặc định `ROLE_USER`.
- **Authentication:** Không yêu cầu (Public).
- **Request Body:**
  ```json
  {
    "fullName": "Nguyen Van A",
    "email": "customer@shopmart.com",
    "password": "Customer@123",
    "phone": "0987654321",
    "address": "123 Nguyen Trai, Ha Noi"
  }
  ```
- **Response mẫu (201 Created):**
  ```json
  {
    "status": 201,
    "message": "Đăng ký tài khoản thành công",
    "data": {
      "userId": 1,
      "email": "customer@shopmart.com",
      "fullName": "Nguyen Van A",
      "roles": ["ROLE_USER"]
    }
  }
  ```
- **HTTP Status Codes:** `201 Created`, `400 Bad Request` (Dữ liệu không hợp lệ), `409 Conflict` (Email đã tồn tại).

### 2.2. Đăng nhập hệ thống (User / Admin Login)
- **Method:** `POST`
- **URL:** `/api/v1/auth/login`
- **Chức năng:** Xác thực thông tin người dùng và cấp mã JWT token.
- **Authentication:** Không yêu cầu (Public).
- **Request Body:**
  ```json
  {
    "email": "customer@shopmart.com",
    "password": "Customer@123"
  }
  ```
- **Response mẫu (200 OK):**
  ```json
  {
    "status": 200,
    "message": "Đăng nhập thành công",
    "data": {
      "token": "eyJhbGciOiJIUzUxMiJ9...",
      "userId": 1,
      "email": "customer@shopmart.com",
      "fullName": "Nguyen Van A",
      "roles": ["ROLE_USER"]
    }
  }
  ```
- **HTTP Status Codes:** `200 OK`, `401 Unauthorized` (Sai email hoặc mật khẩu).

### 2.3. Lấy thông tin hồ sơ cá nhân (Get User Profile)
- **Method:** `GET`
- **URL:** `/api/v1/users/profile`
- **Chức năng:** Lấy thông tin chi tiết tài khoản của người dùng đang đăng nhập.
- **Authentication:** Yêu cầu `Bearer <token>` (`ROLE_USER` hoặc `ROLE_ADMIN`).
- **Response mẫu (200 OK):**
  ```json
  {
    "status": 200,
    "message": "Thành công",
    "data": {
      "id": 1,
      "email": "customer@shopmart.com",
      "fullName": "Nguyen Van A",
      "phone": "0987654321",
      "status": "ACTIVE"
    }
  }
  ```

### 2.4. Đăng xuất hệ thống (Logout)
- **Method:** `POST`
- **URL:** `/api/v1/auth/logout`
- **Chức năng:** Thu hồi token và đưa vào danh sách đen (Blacklist) trong Redis.
- **Authentication:** Yêu cầu `Bearer <token>`.
- **Response mẫu (200 OK):**
  ```json
  {
    "status": 200,
    "message": "Đăng xuất thành công"
  }
  ```

---

## 3. NHÓM 2: PRODUCTS & CATALOG (PRODUCT SERVICE :8082)

### 3.1. Lấy danh sách sản phẩm phân trang & bộ lọc
- **Method:** `GET`
- **URL:** `/api/v1/products?page=0&size=12&categoryId=1&minPrice=1000000&maxPrice=50000000&sort=price,asc`
- **Chức năng:** Danh sách sản phẩm cho khách duyệt kèm bộ lọc danh mục và khoảng giá.
- **Authentication:** Không yêu cầu (Public).
- **Response mẫu (200 OK):**
  ```json
  {
    "status": 200,
    "message": "Thành công",
    "data": {
      "content": [
        {
          "id": 1,
          "name": "iPhone 15 Pro Max 256GB",
          "description": "Titan Tự Nhiên, Chip A17 Pro",
          "price": 29990000,
          "stock": 25,
          "categoryId": 1,
          "categoryName": "Điện thoại",
          "imageUrl": "https://images.unsplash.com/photo-1695048133142-1a20484d2569",
          "status": "ACTIVE"
        }
      ],
      "totalPages": 5,
      "totalElements": 60,
      "currentPage": 0,
      "pageSize": 12
    }
  }
  ```

### 3.2. Lấy thông tin chi tiết một sản phẩm
- **Method:** `GET`
- **URL:** `/api/v1/products/{id}`
- **Chức năng:** Xem thông số kỹ thuật, mô tả và tồn kho của sản phẩm theo ID.
- **Authentication:** Không yêu cầu (Public).
- **Response mẫu (200 OK):**
  ```json
  {
    "status": 200,
    "message": "Thành công",
    "data": {
      "id": 1,
      "name": "iPhone 15 Pro Max 256GB",
      "price": 29990000,
      "stock": 25,
      "description": "Chi tiết sản phẩm..."
    }
  }
  ```
- **HTTP Status Codes:** `200 OK`, `404 Not Found` (Sản phẩm không tồn tại).

### 3.3. Tìm kiếm sản phẩm theo từ khóa
- **Method:** `GET`
- **URL:** `/api/v1/products/search?keyword=iPhone&page=0&size=10`
- **Chức năng:** Tìm kiếm full-text theo tên hoặc mô tả sản phẩm.
- **Authentication:** Không yêu cầu (Public).

### 3.4. Kiểm tra tồn kho sản phẩm (Stock Check)
- **Method:** `GET`
- **URL:** `/api/v1/products/{id}/stock`
- **Chức năng:** Lấy số lượng hàng tồn tức thời để phục vụ giỏ hàng và kiểm tra trước khi đặt.
- **Response mẫu (200 OK):**
  ```json
  {
    "status": 200,
    "data": {
      "productId": 1,
      "stock": 25,
      "isAvailable": true
    }
  }
  ```

---

## 4. NHÓM 3: SHOPPING CART (ORDER SERVICE :8083)

### 4.1. Lấy thông tin giỏ hàng của người dùng
- **Method:** `GET`
- **URL:** `/api/v1/cart`
- **Chức năng:** Xem toàn bộ sản phẩm đang có trong giỏ hàng và tổng tiền tạm tính.
- **Authentication:** Yêu cầu `Bearer <token>` (`ROLE_USER`).
- **Response mẫu (200 OK):**
  ```json
  {
    "status": 200,
    "message": "Thành công",
    "data": {
      "id": 10,
      "userId": 1,
      "items": [
        {
          "id": 101,
          "productId": 1,
          "productName": "iPhone 15 Pro Max 256GB",
          "quantity": 2,
          "unitPrice": 29990000,
          "subtotal": 59980000,
          "imageUrl": "https://..."
        }
      ],
      "totalAmount": 59980000
    }
  }
  ```

### 4.2. Thêm sản phẩm vào giỏ hàng
- **Method:** `POST`
- **URL:** `/api/v1/cart/items`
- **Request Body:**
  ```json
  {
    "productId": 1,
    "quantity": 1
  }
  ```
- **HTTP Status Codes:** `200 OK`, `400 Bad Request` (Số lượng vượt quá tồn kho), `401 Unauthorized`.

### 4.3. Cập nhật số lượng sản phẩm trong giỏ
- **Method:** `PUT`
- **URL:** `/api/v1/cart/items/{itemId}`
- **Request Body:**
  ```json
  {
    "quantity": 3
  }
  ```

### 4.4. Xóa một sản phẩm khỏi giỏ
- **Method:** `DELETE`
- **URL:** `/api/v1/cart/items/{itemId}`
- **Response:** `200 OK`.

---

## 5. NHÓM 4: CHECKOUT & ORDERS (ORDER SERVICE :8083)

### 5.1. Tạo đơn hàng mới (Checkout)
- **Method:** `POST`
- **URL:** `/api/v1/orders/checkout`
- **Chức năng:** Tạo đơn hàng từ giỏ hàng hoặc mua ngay, gọi OpenFeign giữ tồn kho và kích hoạt Saga.
- **Authentication:** Yêu cầu `Bearer <token>` (`ROLE_USER`).
- **Request Body:**
  ```json
  {
    "items": [
      {
        "productId": 1,
        "quantity": 1,
        "unitPrice": 29990000
      }
    ],
    "shippingAddress": "123 Nguyen Trai, Thanh Xuan, Ha Noi",
    "receiverName": "Nguyen Van A",
    "receiverPhone": "0987654321",
    "paymentMethod": "COD",
    "note": "Giao hang gio hanh chinh"
  }
  ```
- **Response mẫu (201 Created):**
  ```json
  {
    "status": 201,
    "message": "Đặt hàng thành công",
    "data": {
      "id": 5001,
      "orderCode": "ORD-20261109-5001",
      "status": "PENDING",
      "totalAmount": 29990000,
      "shippingFee": 0,
      "paymentMethod": "COD",
      "receiverName": "Nguyen Van A",
      "receiverPhone": "0987654321",
      "createdAt": "2026-11-09T08:15:00"
    }
  }
  ```
- **HTTP Status Codes:** `201 Created`, `400 Bad Request` (Hết hàng hoặc dữ liệu sai), `429 Too Many Requests` (Spam rate limit).

### 5.2. Lịch sử đơn hàng của người dùng
- **Method:** `GET`
- **URL:** `/api/v1/orders?page=0&size=10&status=PENDING`
- **Chức năng:** Lấy danh sách các đơn hàng đã đặt của người dùng đang đăng nhập.

### 5.3. Xem chi tiết đơn hàng
- **Method:** `GET`
- **URL:** `/api/v1/orders/{id}`
- **Authentication:** Yêu cầu xác thực chủ sở hữu đơn hàng (Chống truy cập trái phép IDOR).
- **HTTP Status Codes:** `200 OK`, `403 Forbidden` (Không có quyền xem đơn hàng của người khác), `404 Not Found`.

### 5.4. Theo dõi Timeline tiến trình đơn hàng
- **Method:** `GET`
- **URL:** `/api/v1/orders/{id}/timeline`
- **Response mẫu (200 OK):**
  ```json
  {
    "status": 200,
    "data": {
      "orderId": 5001,
      "currentStatus": "CONFIRMED",
      "timelineSteps": [
        { "status": "PENDING", "label": "Đã đặt hàng", "timestamp": "2026-11-09T08:15:00", "completed": true },
        { "status": "CONFIRMED", "label": "Đã xác nhận", "timestamp": "2026-11-09T08:20:00", "completed": true, "current": true },
        { "status": "PROCESSING", "label": "Đang chuẩn bị", "timestamp": null, "completed": false },
        { "status": "SHIPPING", "label": "Đang giao hàng", "timestamp": null, "completed": false },
        { "status": "DELIVERED", "label": "Đã giao hàng", "timestamp": null, "completed": false }
      ]
    }
  }
  ```

### 5.5. Hủy đơn hàng (Customer Cancel)
- **Method:** `POST`
- **URL:** `/api/v1/orders/{id}/cancel`
- **Request Body:**
  ```json
  {
    "reason": "Khách hàng đổi ý muốn mua sản phẩm khác"
  }
  ```
- **Điều kiện:** Chỉ cho phép hủy khi đơn ở trạng thái `PENDING` hoặc `CONFIRMED`. Tự động hoàn lại số lượng tồn kho.

---

## 6. NHÓM 5: PAYMENT (PAYMENT SERVICE :8084)

### 6.1. Xác nhận thanh toán mô phỏng (Mock Pay)
- **Method:** `POST`
- **URL:** `/api/v1/payments/mock-pay/{orderId}`
- **Chức năng:** Mô phỏng giao dịch thanh toán trực tuyến thành công hoặc thất bại.
- **Request Body:**
  ```json
  {
    "success": true,
    "note": "Xác thực OTP ngân hàng thành công"
  }
  ```
- **Response mẫu (200 OK - Thanh toán thành công):**
  ```json
  {
    "status": 200,
    "message": "Xác nhận thanh toán mô phỏng thành công",
    "data": {
      "paymentId": 201,
      "orderId": 5001,
      "status": "SUCCESS",
      "transactionCode": "TXN-20261109-8899",
      "amount": 29990000
    }
  }
  ```
- **Xử lý Saga:**
  - `success: true` $\rightarrow$ Bắn `PaymentSuccessEvent` sang Kafka $\rightarrow$ Order cập nhật `PAID`.
  - `success: false` $\rightarrow$ Bắn `PaymentFailedEvent` sang Kafka $\rightarrow$ Order cập nhật `FAILED` $\rightarrow$ Kích hoạt hoàn kho bù trừ.

---

## 7. NHÓM 6: ADMIN MANAGEMENT (ROLE_ADMIN)

### 7.1. Admin tạo sản phẩm mới
- **Method:** `POST`
- **URL:** `/api/v1/products`
- **Authentication:** `ROLE_ADMIN`.
- **Request Body:**
  ```json
  {
    "name": "Samsung Galaxy Z Fold 6",
    "description": "Điện thoại màn hình gập cao cấp 2024",
    "price": 43990000,
    "stock": 30,
    "categoryId": 1,
    "imageUrl": "https://..."
  }
  ```

### 7.2. Admin cập nhật số lượng tồn kho
- **Method:** `PATCH`
- **URL:** `/api/v1/products/{id}/stock`
- **Request Body:**
  ```json
  {
    "stock": 100
  }
  ```

### 7.3. Admin duyệt & chuyển trạng thái đơn hàng
- **Method:** `PUT`
- **URL:** `/api/v1/admin/orders/{id}/status`
- **Authentication:** `ROLE_ADMIN`.
- **Request Body:**
  ```json
  {
    "status": "PROCESSING",
    "note": "Kho đang tiến hành đóng gói kiện hàng"
  }
  ```
- **Quy tắc chuyển đổi trạng thái hợp lệ:**
  - `PENDING` $\rightarrow$ `CONFIRMED` $\rightarrow$ `PROCESSING` $\rightarrow$ `SHIPPING` $\rightarrow$ `DELIVERED`
  - Bất kỳ trạng thái nào trước `SHIPPING` $\rightarrow$ `CANCELLED`

---

## 8. BẢNG MÃ LỖI HTTP & ERROR HANDLING

| Mã HTTP | Tên chuẩn | Ý nghĩa trong hệ thống ShopMart |
|:---:|---|---|
| **200** | OK | Thao tác truy vấn hoặc cập nhật thành công |
| **201** | Created | Tạo mới tài nguyên thành công (Đăng ký, Đặt hàng, Tạo sản phẩm) |
| **400** | Bad Request | Dữ liệu đầu vào sai, vi phạm validation hoặc chuyển trạng thái không hợp lệ |
| **401** | Unauthorized | Thiếu JWT token, token sai hoặc token đã hết hạn |
| **403** | Forbidden | Người dùng không đủ quyền hạn (`ROLE_ADMIN`) hoặc vi phạm IDOR |
| **404** | Not Found | Không tìm thấy tài nguyên (ID sản phẩm, ID đơn hàng không tồn tại) |
| **409** | Conflict | Xung đột dữ liệu (Email đã được đăng ký) |
| **429** | Too Many Requests | Vượt quá ngưỡng gửi yêu cầu cho phép của Redis Rate Limiter |
| **500** | Internal Server Error | Lỗi nội bộ không mong muốn từ Backend |
| **503** | Service Unavailable | Circuit Breaker kích hoạt khi một Microservice bị sự cố |
