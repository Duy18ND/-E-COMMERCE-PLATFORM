# 08 – BÁO CÁO KIỂM TRA BẢO MẬT (SECURITY AUDIT REPORT)

- **Thời điểm kiểm tra:** 2026-11-16 08:04:00 (GMT+7)
- **Phạm vi:** Xác thực JWT, Mã hóa mật khẩu, Phân quyền RBAC, Chống giả mạo Header qua API Gateway, Bảo vệ Endpoint nội bộ, CORS, SQL Injection, XSS và Quản lý Secret.

---

## 1. BẢNG ĐÁNH GIÁ CÁC HẠNG MỤC BẢO MẬT

| Hạng mục kiểm tra | Cơ chế triển khai trong Source Code | Trạng thái | Bằng chứng xác minh |
|---|---|---|---|
| **1. Mã hóa mật khẩu (BCrypt)** | `SecurityConfig.java` (`auth-service`) sử dụng `BCryptPasswordEncoder`. Mật khẩu lưu trong `auth_db.users.password` luôn ở dạng chuỗi băm BCrypt, và `User.java` gắn `@ToString.Exclude` trên trường `password`. | **AN TOÀN** | `AuthServiceImpl.java`, `UserServiceImpl.java`, `AuthServiceImplTest.java` |
| **2. Chặn tự đăng ký quyền Admin** | `RegisterRequest.java` chỉ gồm `fullName`, `email`, `password`, `phone`, `address` (không có trường `role`). `AuthServiceImpl.register()` luôn gán cứng `ROLE_USER` từ bảng `roles`. | **AN TOÀN** | `RegisterRequest.java`, `AuthServiceImpl.java` (dòng 52–60) |
| **3. Xác thực JWT & Kiểm tra khóa tài khoản** | `JwtTokenProvider` ký/xác thực HMAC-SHA (`HS256`). Khi đăng nhập hoặc refresh token, `AuthServiceImpl` kiểm tra `user.getStatus() == UserStatus.LOCKED` và chặn ngay với HTTP `403 Forbidden`. | **AN TOÀN** | `JwtTokenProvider.java`, `AuthServiceImpl.java`, `AdminUserControllerIntegrationTest.java` |
| **4. Chống giả mạo Header (`X-User-Id`, `X-User-Roles`, `X-Internal-Service-Key`)** | `SpoofedHeaderSanitizationFilter.java` (`Ordered.HIGHEST_PRECEDENCE`) trên `api-gateway` xóa sạch mọi header `X-User-Id`, `X-User-Email`, `X-User-Roles`, `X-Internal-Service-Key` từ client gửi lên trước khi `AuthenticationFilter` giải mã JWT và gắn thông tin thực. Ngoài ra `discovery.locator.enabled: false` chặn truy cập vòng qua `/service-id/**`. | **AN TOÀN** | `SpoofedHeaderSanitizationFilter.java`, `AuthenticationFilter.java`, `AuthenticationFilterTest.java` |
| **5. Chặn gọi trái phép API nội bộ (`/reserve-stock`, `/restore-stock`, `/flash-sales/reserve`)** | Lớp 1: Gateway chặn bằng `BlockExternalAccessGatewayFilterFactory` (`403 Forbidden`). Lớp 2: `ProductController`, `FlashSaleController`, `OrderController`, `AdminUserController` xác thực `X-Internal-Service-Key` bằng `MessageDigest.isEqual` (constant-time comparison chống timing attack). | **AN TOÀN** | `BlockExternalAccessGatewayFilterFactory.java`, `InternalAuthValidator.java` |
| **6. Phân quyền Admin (RBAC) & Kiểm tra chủ sở hữu (IDOR Protection)** | Mọi API `/api/v1/admin/**` kiểm tra `requireAdminRole(roles)` ở Controller. Các API đơn hàng (`/orders/{id}`, `/orders/{id}/history`, `/orders/{id}/cancel`), thanh toán (`/payments/{id}`, `/payments/order/{orderId}`) và địa chỉ (`/users/addresses/{id}`) đều kiểm tra `userId` chủ sở hữu trước khi trả dữ liệu hoặc cho phép thao tác. | **AN TOÀN** | `OrderServiceImpl.java`, `PaymentServiceImpl.java`, `UserServiceImpl.java`, `OrderTrackingIntegrationTest.java` |
| **7. Chống SQL Injection & XSS** | Toàn bộ truy vấn JPA/JPQL sử dụng `@Param(...)` binding; các trường `sortBy` trên `AdminOrderController`, `AdminUserController`, `ProductReviewServiceImpl` đều có whitelist `ALLOWED_SORT_FIELDS`. Giao diện React tự động escape JSX và không dùng `dangerouslySetInnerHTML` với dữ liệu người dùng. | **AN TOÀN** | `ProductRepository.java`, `OrderRepository.java`, `AdminOrderController.java` |
| **8. Quản lý Secret & `.gitignore`** | `.gitignore` đã loại trừ `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key`, `backups/`. Không có file `.env` chứa secret thật của Production hay private key nào bị đưa vào Git; các cấu hình mẫu nằm trong `.env.example` và `.env.prod.example`. | **AN TOÀN** | `.gitignore`, `backend/.env.prod.example` |
