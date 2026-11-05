# CẨM NANG HƯỚNG DẪN KIỂM THỬ API POSTMAN
## TASK ECOM-283: FORM ĐIỀU CHỈNH KHO & CẢNH BÁO HẾT HÀNG

---

Tài liệu này hướng dẫn chi tiết cách thiết lập và thực thi kiểm thử các API điều chỉnh tồn kho và cảnh báo hết hàng của ShopMart E-Commerce Platform bằng **Postman**.

---

## 1. THIẾT LẬP BIẾN MÔI TRƯỜNG POSTMAN (ENVIRONMENT)

Tạo một Environment mới trong Postman mang tên `ShopMart_Local` và khai báo các biến sau:

| Tên biến (Variable) | Giá trị mẫu (Sample Value) | Mô tả |
| :--- | :--- | :--- |
| `base_url` | `http://localhost:8080/api/v1` | URL gốc của API Gateway / Backend Services |
| `admin_token` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | JWT Bearer Token của tài khoản Quản trị viên (`ROLE_ADMIN`) |
| `user_token` | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` | JWT Bearer Token của tài khoản Khách hàng (`ROLE_USER`) |
| `product_id` | `1` | Mã định danh sản phẩm dùng để kiểm thử tồn kho |

---

## 2. DANH SÁCH REQUEST KIỂM THỬ CHUẨN

### Request 1: Đăng nhập lấy Admin Token
- **Method:** `POST`
- **URL:** `{{base_url}}/auth/login`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "email": "admin@shopmart.com",
  "password": "Password123!"
}
```
- **Tests Script:**
```javascript
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});
var jsonData = pm.response.json();
var token = jsonData.data ? jsonData.data.accessToken : jsonData.accessToken;
pm.environment.set("admin_token", token);
console.log("Admin token saved successfully.");
```

---

### Request 2: Nhập thêm hàng vào kho (Inbound Stock)
- **Method:** `POST`
- **URL:** `{{base_url}}/products/{{product_id}}/inbound`
- **Headers:**
  - `Authorization: Bearer {{admin_token}}`
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "quantity": 20,
  "note": "Nhập thêm 20 sản phẩm từ lô hàng đợt 2"
}
```
- **Tests Script:**
```javascript
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Tồn kho sau khi nhập thêm phải tăng chính xác", function () {
    var res = pm.response.json();
    var data = res.data || res;
    pm.expect(data.stockQuantity).to.be.at.least(20);
    pm.expect(data.status).to.eql("ACTIVE");
});
```

---

### Request 3: Điều chỉnh kiểm kê tồn kho thực tế (Adjust Stock)
- **Method:** `POST`
- **URL:** `{{base_url}}/products/{{product_id}}/adjust-stock`
- **Headers:**
  - `Authorization: Bearer {{admin_token}}`
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "actualStock": 15,
  "reason": "Điều chỉnh theo biên bản kiểm kê kho định kỳ tháng 11"
}
```
- **Tests Script:**
```javascript
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Số lượng tồn kho thực tế khớp với giá trị gửi lên", function () {
    var res = pm.response.json();
    var data = res.data || res;
    pm.expect(data.stockQuantity).to.eql(15);
});
```

---

### Request 4: Điều chỉnh tồn kho về 0 (Kiểm tra tự động chuyển OUT_OF_STOCK)
- **Method:** `POST`
- **URL:** `{{base_url}}/products/{{product_id}}/adjust-stock`
- **Headers:**
  - `Authorization: Bearer {{admin_token}}`
  - `Content-Type: application/json`
- **Body (raw JSON):**
```json
{
  "actualStock": 0,
  "reason": "Sản phẩm hỏng hoàn toàn trong kho"
}
```
- **Tests Script:**
```javascript
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Tồn kho về 0 và trạng thái sản phẩm chuyển thành OUT_OF_STOCK", function () {
    var res = pm.response.json();
    var data = res.data || res;
    pm.expect(data.stockQuantity).to.eql(0);
    pm.expect(data.status).to.eql("OUT_OF_STOCK");
});
```

---

### Request 5: Kiểm tra trạng thái tồn kho tức thời (Check Stock API)
- **Method:** `GET`
- **URL:** `{{base_url}}/products/{{product_id}}/stock?quantity=1`
- **Headers:** `Accept: application/json`
- **Tests Script:**
```javascript
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Phản hồi chứa đầy đủ cờ inStock và sufficientStock", function () {
    var res = pm.response.json();
    var data = res.data || res;
    pm.expect(data).to.have.property("stockQuantity");
    pm.expect(data).to.have.property("inStock");
    pm.expect(data).to.have.property("sufficientStock");
});
```

---

## 3. CÁC KỊCH BẢN KIỂM THỬ TIÊU CỰC (NEGATIVE TESTS)

### Kịch bản 1: Nhập thêm hàng với số lượng không hợp lệ ($\le 0$)
- **URL:** `POST {{base_url}}/products/{{product_id}}/inbound`
- **Body:** `{"quantity": 0, "note": "Test số 0"}`
- **Kỳ vọng:** Mã lỗi `400 Bad Request`. Backend ném ngoại lệ validation trường `quantity`.

### Kịch bản 2: Điều chỉnh tồn kho thực tế với số âm ($< 0$)
- **URL:** `POST {{base_url}}/products/{{product_id}}/adjust-stock`
- **Body:** `{"actualStock": -5, "reason": "Test số âm"}`
- **Kỳ vọng:** Mã lỗi `400 Bad Request`.

### Kịch bản 3: Điều chỉnh tồn kho nhưng để trống lý do (`reason = ""`)
- **URL:** `POST {{base_url}}/products/{{product_id}}/adjust-stock`
- **Body:** `{"actualStock": 10, "reason": ""}`
- **Kỳ vọng:** Mã lỗi `400 Bad Request`. Vi phạm ràng buộc `@NotBlank`.

### Kịch bản 4: Người dùng không có quyền Admin gọi API điều chỉnh kho
- **Headers:** `Authorization: Bearer {{user_token}}`
- **Kỳ vọng:** Mã lỗi `403 Forbidden`. Hệ thống phân quyền Spring Security ngăn chặn truy cập trái phép.

### Kịch bản 5: Không gửi Authorization Token
- **Headers:** Không có header `Authorization`
- **Kỳ vọng:** Mã lỗi `401 Unauthorized`.
