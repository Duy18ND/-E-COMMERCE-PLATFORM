# HƯỚNG DẪN KIỂM THỬ POSTMAN – API ECOM-315: LỊCH SỬ TRẠNG THÁI ĐƠN HÀNG (TIMELINE)
**Dự án:** ShopMart – E-commerce Platform  
**Task liên quan:** ECOM-311 ([FE] Timeline theo dõi trạng thái đơn) & ECOM-315 ([BE] API lấy lịch sử trạng thái theo đơn)  
**Phụ trách Backend (ECOM-315):** Đoàn Mạnh Duy  
**Phụ trách Frontend & QA (ECOM-311):** Ngô Thị Hoài Phương  
**Ngày cập nhật:** 03/11/2026  

---

## 1. TỔNG QUAN ENDPOINT

| Thuộc tính | Chi tiết |
| :--- | :--- |
| **Endpoint khách hàng** | `GET /api/v1/orders/{id}/history` |
| **Endpoint quản trị** | `GET /api/v1/admin/orders/{id}/history` |
| **Base URL** | `http://localhost:8080` (qua API Gateway) hoặc `http://localhost:8083` (Order Service trực tiếp) |
| **Yêu cầu xác thực** | Bắt buộc (Bearer JWT Token) |
| **Quyền truy cập** | Khách hàng sở hữu đơn hàng (`X-User-Id` trùng với chủ đơn) hoặc Quản trị viên (`ROLE_ADMIN`) |
| **Chống IDOR** | HTTP 403 Forbidden nếu người dùng truy cập lịch sử của khách hàng khác |

---

## 2. BIẾN MÔI TRƯỜNG POSTMAN (ENVIRONMENT VARIABLES)

Cấu hình các biến sau trong Postman Environment:

```json
{
  "baseUrl": "http://localhost:8080/api/v1",
  "customerToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "adminToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "attackerToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "validOrderId": "1001",
  "otherUserOrderId": "1002"
}
```

---

## 3. CÁC KỊCH BẢN KIỂM THỬ CHI TIẾT (TEST CASES)

### 3.1. Kịch bản 1: Khách hàng xem lịch sử đơn hàng của chính mình (Thành công)
- **Method:** `GET`
- **URL:** `{{baseUrl}}/orders/{{validOrderId}}/history`
- **Headers:**
  - `Authorization: Bearer {{customerToken}}`
  - `Content-Type: application/json`
- **Expected Status:** `200 OK`
- **Expected Response Body Structure:**
```json
{
  "success": true,
  "message": "Lấy lịch sử trạng thái đơn hàng thành công",
  "data": [
    {
      "id": 1,
      "orderId": 1001,
      "status": "PENDING",
      "statusDescription": "Đơn hàng đã được đặt thành công, đang chờ xác nhận",
      "previousStatus": null,
      "action": "CREATE_ORDER",
      "updatedBy": "customer1@shopmart.com",
      "actorRole": "ROLE_USER",
      "note": "Đặt hàng qua website ShopMart",
      "createdAt": "2026-11-03T10:15:30"
    },
    {
      "id": 2,
      "orderId": 1001,
      "status": "CONFIRMED",
      "statusDescription": "Đơn hàng đã được xác nhận bởi người bán / quản trị viên",
      "previousStatus": "PENDING",
      "action": "CONFIRM_ORDER",
      "updatedBy": "ADMIN:1",
      "actorRole": "ROLE_ADMIN",
      "note": "Xác nhận địa chỉ hợp lệ",
      "createdAt": "2026-11-03T10:30:00"
    }
  ],
  "timestamp": "2026-11-03T11:00:00"
}
```

- **Postman Test Script:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response is successful and contains history list", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.be.an("array");
    pm.expect(jsonData.data.length).to.be.above(0);
});

pm.test("Audit records are sorted chronologically ascending", function () {
    var list = pm.response.json().data;
    for (var i = 1; i < list.length; i++) {
        var prevTime = new Date(list[i-1].createdAt).getTime();
        var currTime = new Date(list[i].createdAt).getTime();
        pm.expect(currTime).to.be.at.least(prevTime);
    }
});
```

---

### 3.2. Kịch bản 2: Bảo mật IDOR – Khách hàng cố tình xem lịch sử đơn của người khác
- **Method:** `GET`
- **URL:** `{{baseUrl}}/orders/{{otherUserOrderId}}/history`
- **Headers:**
  - `Authorization: Bearer {{attackerToken}}`
- **Expected Status:** `403 Forbidden`
- **Expected Response Body Structure:**
```json
{
  "success": false,
  "message": "Bạn không có quyền xem lịch sử đơn hàng của người dùng khác",
  "data": null,
  "timestamp": "2026-11-03T11:05:00"
}
```
- **Postman Test Script:**
```javascript
pm.test("Status code is 403 Forbidden (Chống IDOR)", function () {
    pm.response.to.have.status(403);
});

pm.test("Response conveys permission denied", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.false;
});
```

---

### 3.3. Kịch bản 3: Không có Authorization Header (Chưa đăng nhập)
- **Method:** `GET`
- **URL:** `{{baseUrl}}/orders/{{validOrderId}}/history`
- **Headers:** (Không gửi Header `Authorization`)
- **Expected Status:** `401 Unauthorized` hoặc `403 Forbidden`
- **Postman Test Script:**
```javascript
pm.test("Status code is 401 Unauthorized", function () {
    pm.expect(pm.response.code).to.be.oneOf([401, 403]);
});
```

---

### 3.4. Kịch bản 4: Admin xem lịch sử bất kỳ đơn hàng nào
- **Method:** `GET`
- **URL:** `{{baseUrl}}/admin/orders/{{validOrderId}}/history`
- **Headers:**
  - `Authorization: Bearer {{adminToken}}`
- **Expected Status:** `200 OK`
- **Postman Test Script:**
```javascript
pm.test("Admin can view any order history (200 OK)", function () {
    pm.response.to.have.status(200);
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.be.true;
    pm.expect(jsonData.data).to.be.an("array");
});
```

---

### 3.5. Kịch bản 5: Đơn hàng không tồn tại
- **Method:** `GET`
- **URL:** `{{baseUrl}}/orders/9999999/history`
- **Headers:**
  - `Authorization: Bearer {{adminToken}}`
- **Expected Status:** `404 Not Found`
- **Postman Test Script:**
```javascript
pm.test("Status code is 404 Not Found", function () {
    pm.response.to.have.status(404);
});
```

---

## 4. TỔNG KẾT BẢO ĐẢM TÍNH TOÀN VẸN
1. **Thứ tự mốc thời gian:** Luôn tăng dần từ lúc tạo đơn (`PENDING`) đến trạng thái hiện tại.
2. **Không có dữ liệu suy diễn:** Chỉ hiển thị những mốc trạng thái thực tế đã được lưu trong bảng `order_status_history` của Database.
3. **Đồng bộ Frontend:** DTO trả về khớp 100% với các trường mà component `OrderTimeline.jsx` yêu cầu (`status`, `statusDescription`, `updatedBy`, `actorRole`, `note`, `createdAt`).
