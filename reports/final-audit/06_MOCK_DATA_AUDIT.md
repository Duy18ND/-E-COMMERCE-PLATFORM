# 06 – BÁO CÁO RÀ SOÁT MOCK DATA & DỮ LIỆU GIẢ LẬP (MOCK DATA AUDIT)

- **Thời điểm kiểm tra:** 2026-11-16 08:04:00 (GMT+7)
- **Phạm vi kiểm tra:** Toàn bộ `frontend/src/**` và `backend/**`.

---

## 1. PHÂN LOẠI DỮ LIỆU THEO CHUẨN NGHIỆM THU

| Nhóm dữ liệu | Vị trí | Phân loại | Trạng thái trong Production | Hành động đã thực hiện |
|---|---|---|---|---|
| **Cấu hình Auth Mode** | `frontend/.env`, `frontend/.env.production` (`VITE_USE_MOCK_AUTH=false`), `authService.js` | Cấu hình môi trường | **TẮT MOCK 100%** (Gọi trực tiếp `/api/v1/auth/*`, nếu Backend trả lỗi HTTP thì ném lỗi thật ra UI) | Đã xác minh: không cho phép tạo phiên đăng nhập giả khi Backend từ chối. |
| **Hardcoded UI Strings & Images trong `ProductDetail.jsx`** | `frontend/src/pages/customer/ProductDetail.jsx` | Hardcoded Product / Price trong UI | **ĐÃ LOẠI BỎ** | Đã xóa giá so sánh cứng `42.990.000 đ` / `10.500.000 đ`, xóa 3 ảnh MacBook cứng, xóa SKU cứng `'MBP14-M3P-18-512'` và thương hiệu cứng `'APPLE STORE FLAGSHIP'`. |
| **Danh mục trên `UserHeader.jsx` & `CategoryNav.jsx`** | `frontend/src/components/user/UserHeader.jsx`, `CategoryNav.jsx` | Hardcoded Categories trên Header/Navbar | **ĐÃ ĐỒNG BỘ API THẬT** | Đã cập nhật gọi `categoryService.getPublicCategories()` (`GET /api/v1/products/categories`) khi mount; chỉ dùng `INITIAL_CATEGORIES` làm initial state trước khi API phản hồi. |
| **Trang `MyVouchers.jsx`** | `frontend/src/pages/customer/MyVouchers.jsx` | Lỗi gọi nhầm API Admin | **ĐÃ ĐỒNG BỘ API THẬT** | Đã sửa từ `voucherService.getAll()` (`/admin/vouchers`) sang `voucherService.getPublicVouchers()` (`/vouchers/active`). |
| **Admin Dashboard (`Dashboard.jsx`), `AdminOrders.jsx`, `AdminUsers.jsx`, `AdminReviews.jsx`** | `frontend/src/pages/admin/*.jsx` | Dữ liệu Quản trị & Thống kê | **100% DỮ LIỆU THẬT TỪ API & DB** | `Dashboard.jsx` gọi `orderService.getDashboardStats()` (`GET /api/v1/admin/orders/statistics` + `/api/v1/admin/statistics`); `AdminReviews.jsx` và `reviewService.js` hoàn toàn không dùng `localStorage` hay mock data; khi DB trống hiển thị Empty State (`0` đơn, `0 ₫`). |
| **Phương thức Thanh toán Mô phỏng (`MOCK_ONLINE`, `COD`, `VNPAY`)** | `payment-service` (`PaymentController`, `PaymentServiceImpl`), `Checkout.jsx` | Nghiệp vụ trong phạm vi đề tài (`ECOM-121`, `ECOM-124`) | **LƯU GIAO DỊCH THẬT VÀO `payment_db.payments` & BẮN SỰ KIỆN KAFKA THẬT** | Theo đúng đặc tả `ECOM-121`/`ECOM-124` ("Đặt hàng & Thanh toán mô phỏng"), mọi giao dịch đều tạo bản ghi thực trong bảng `payment_db.payments`, sinh mã giao dịch đối soát và kích hoạt Kafka Saga (`payment-success` / `payment-failed`). |
| **Test Fixtures & Offline Fallback (`src/services/mockData.js`, `src/mock/*.js`)** | `frontend/src/services/mockData.js`, `frontend/src/mock/mock*.js` | Test Fixture cho bộ 32 file Node.js QA Test (`npm test`) | **CHỈ KÍCH HOẠT KHI CHẠY UNIT/QA TEST OFFLINE (KHÔNG CÓ BACKEND)** | Khi Backend hoạt động (Production/Docker), 100% dữ liệu lấy từ REST API. Nếu Backend trả lỗi HTTP (`400`/`401`/`403`/`404`/`409`/`500`), hàm `isHttpResponseError(err)` ném lỗi thật ra UI, tuyệt đối không nuốt lỗi hay trả dữ liệu giả. Giữ lại các file fixture để không phá vỡ 415 bài test tự động trong `frontend/tests/*.test.mjs`. |
| **Backend Database Seed (`init.sql`, `DataInitializer.java`)** | `backend/docker/mysql/init.sql`, `auth-service/DataInitializer.java`, `product-service/DataInitializer.java` | Seed Data khởi tạo ban đầu (`INSERT IGNORE` / `if (count == 0)`) | **AN TOÀN CHO PRODUCTION** | Chỉ khởi tạo tài khoản Admin mặc định, 2 Role (`ROLE_USER`, `ROLE_ADMIN`), 4 danh mục, 6 sản phẩm và 8 voucher mẫu khi bảng hoàn toàn trống; không ghi đè dữ liệu hiện có. |
