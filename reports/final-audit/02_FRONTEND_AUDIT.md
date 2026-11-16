# 02 – BÁO CÁO KIỂM TRA FRONTEND (FRONTEND AUDIT REPORT)

- **Thời điểm kiểm tra:** 2026-11-16 08:00:00 (GMT+7)
- **Thư mục kiểm tra:** `frontend/` (149 file nguồn, cấu hình và bộ kiểm thử QA)
- **Kết quả Lint:** `npm run lint` -> **PASS** (93 file trong `src/`, 0 lỗi)
- **Kết quả Unit & Integration QA Tests:** `npm test` -> **PASS** (415/415 test cases trong 21 suites, 0 lỗi)
- **Kết quả Production Build:** `npm run build` -> **PASS** (`vite build` hoàn tất trong 2.76s)

---

## 1. DANH MỤC CÁC MODULE FRONTEND ĐÃ KIỂM TRA

| Nhóm Module | File đã kiểm tra | Trạng thái | Nhận xét chi tiết |
|---|---|---|---|
| **Cấu hình & Entry** | `package.json`, `vite.config.js`, `.env`, `.env.example`, `.env.production`, `Dockerfile`, `nginx.conf`, `src/main.jsx`, `src/App.jsx` | **ĐẠT** | Cấu hình Vite proxy `/api`, `.env.production` dùng relative path `/api/v1`. |
| **Routes & Phân quyền** | `src/routes/AppRoutes.jsx`, `ProtectedRoute.jsx`, `AdminRoute.jsx` | **ĐẠT** | Guest routes công khai (`/`, `/products`, `/products/:id`, `/flash-sale`, `/vouchers`, `/cart`); Customer routes bọc `ProtectedRoute` (`/checkout`, `/orders`, `/orders/:id`, `/profile`, `/my-vouchers`); Admin routes bọc `AdminRoute` (`/admin`, `/admin/products`, `/admin/categories`, `/admin/inventory`, `/admin/orders`, `/admin/users`, `/admin/sales`, `/admin/vouchers`, `/admin/reviews`). |
| **Layouts & Navigation** | `UserLayout.jsx`, `AdminLayout.jsx`, `UserHeader.jsx`, `CategoryNav.jsx`, `AdminHeader.jsx`, `AdminSidebar.jsx`, `Footer.jsx` | **ĐẠT (ĐÃ ĐỒNG BỘ)** | `UserHeader.jsx` và `CategoryNav.jsx` đã được nâng cấp gọi `categoryService.getPublicCategories()` lấy danh mục thực từ Backend thay vì chỉ dùng mảng tĩnh `INITIAL_CATEGORIES`. |
| **Context & Hooks** | `AuthContext.jsx`, `CartContext.jsx`, `ToastContext.jsx`, `useAuth.js`, `useCart.js`, `useNotification.js`, `useDebounce.js`, `useFetch.js` | **ĐẠT** | Quản lý trạng thái đăng nhập, JWT, đồng bộ giỏ hàng hai chiều với `/api/v1/cart`, và hệ thống Toast + Confirm Modal thay thế hoàn toàn `window.alert`/`window.confirm`. |
| **API Services** | `api.js`, `authService.js`, `productService.js`, `categoryService.js`, `cartService.js`, `orderService.js`, `paymentService.js`, `voucherService.js`, `saleService.js`, `reviewService.js`, `userService.js` | **ĐẠT (ĐÃ ĐỒNG BỘ)** | `api.js` đã bổ sung `resolveBaseApiUrl()` tự động chuyển `localhost` sang `/api/v1` khi chạy trên domain/IP VPS và hỗ trợ đọc cả `errors` lẫn `validationErrors` từ Backend. |
| **Trang Khách hàng & Guest** | `Home.jsx`, `Products.jsx`, `ProductDetail.jsx`, `Cart.jsx`, `Checkout.jsx`, `Orders.jsx`, `OrderDetail.jsx`, `Profile.jsx`, `FlashSale.jsx`, `Vouchers.jsx`, `MyVouchers.jsx` | **ĐẠT (ĐÃ SỬA LỖI)** | Đã sửa `MyVouchers.jsx` gọi `voucherService.getPublicVouchers()` thay vì `/admin/vouchers`; sửa `ProductDetail.jsx` truyền đúng `targetEndTime` cho `FlashCountdown` và xóa các chuỗi giá/SKU/ảnh MacBook hardcode. |
| **Trang Quản trị (Admin)** | `Dashboard.jsx`, `AdminProducts.jsx`, `ProductForm.jsx`, `AdminCategories.jsx`, `AdminInventory.jsx`, `AdminOrders.jsx`, `AdminUsers.jsx`, `AdminSales.jsx`, `AdminSaleForm.jsx`, `AdminVouchers.jsx`, `AdminReviews.jsx` | **ĐẠT** | Toàn bộ 11 màn hình Admin có đầy đủ Loading State, Empty State, Error State, Pagination, Search/Filter, Form Validation và xác nhận qua `Modal` / `confirmDialog`. |
| **Responsive CSS** | `src/styles/global.css`, `src/styles/responsive.css`, `src/styles/variables.css` | **ĐẠT** | Hỗ trợ đầy đủ Desktop (`1200px+`), Tablet (`768px–1024px`) và Mobile (`375px–640px`), có `.table-responsive` chống tràn ngang cho bảng dữ liệu Admin. |

---

## 2. CÁC LỖI FRONTEND PHÁT HIỆN VÀ ĐÃ SỬA TRONG ĐỢT AUDIT

### 2.1. `BUG-FE-01` [HIGH] – Trang `MyVouchers.jsx` gọi nhầm API Admin `/api/v1/admin/vouchers`
- **Vị trí:** `frontend/src/pages/customer/MyVouchers.jsx` (dòng 150–161)
- **Nguyên nhân gốc:** `useEffect` gọi `voucherService.getAll()` (vốn gọi `GET /api/v1/admin/vouchers` dành riêng cho `ROLE_ADMIN`). Khi khách hàng (`ROLE_USER`) mở `/my-vouchers` với Backend thực, API trả về `403 Forbidden` và không có `catch`, làm hỏng luồng tải trang.
- **Cách sửa:** Đổi sang `voucherService.getPublicVouchers()` kèm khối `try / catch / finally` an toàn.

### 2.2. `BUG-FE-02` [MEDIUM] – `ProductDetail.jsx` truyền sai prop đồng hồ đếm ngược Flash Sale và hardcode thông tin MacBook
- **Vị trí:** `frontend/src/pages/customer/ProductDetail.jsx` (dòng 155–160, 486–490, 567, 627–631)
- **Nguyên nhân gốc:**
  1. `<FlashCountdown targetEndTime={product.saleEndTime} />` nhưng `productService.normalizeProduct` chuẩn hóa thời gian kết thúc vào `product.endTime` / `product.activeFlashSale?.endTime`.
  2. Dòng 629–630 hardcode `"So sánh giá thường ngày: 42.990.000 đ (Rẻ hơn thường lệ 10.500.000 đ)"` cho mọi sản phẩm.
  3. `galleryImages` gắn cứng 3 ảnh Unsplash MacBook cho mọi sản phẩm; header gắn cứng `'APPLE STORE FLAGSHIP'` và `'MBP14-M3P-18-512'`.
- **Cách sửa:**
  1. Truyền `targetEndTime={product.saleEndTime || product.endTime || product.activeFlashSale?.endTime}`.
  2. Tính động từ `formatCurrency(currentOriginalPrice)` và `formatCurrency(savedAmount)`.
  3. Lấy `galleryImages` từ `product.images` hoặc `[product.imageUrl]`, fallback thương hiệu `'SHOPMART OFFICIAL STORE'` và mã SP động `SKU-SP-xxx`.

### 2.3. `BUG-FE-03` [MEDIUM] – `api.js` bảo vệ URL Production và trích xuất `validationErrors`
- **Vị trí:** `frontend/src/services/api.js` (dòng 4–24, 137–142)
- **Nguyên nhân gốc:**
  1. Nếu build thiếu biến môi trường hoặc trình duyệt mở qua IP/domain VPS nhưng `VITE_API_URL` mặc định vẫn chứa `localhost`, trình duyệt sẽ gọi nhầm `localhost` của máy người dùng.
  2. `payment-service` trả lỗi trường dữ liệu trong `validationErrors` trong khi các service khác dùng `errors`.
- **Cách sửa:**
  1. Thêm hàm `resolveBaseApiUrl()` tự động chuyển về `'/api/v1'` khi `window.location.hostname` không phải `localhost`/`127.0.0.1`.
  2. Hỗ trợ `const rawErrors = responseData?.errors || responseData?.validationErrors;`.

### 2.4. `BUG-FE-04` [MEDIUM] – `UserHeader.jsx` và `CategoryNav.jsx` chưa gọi API danh mục thực
- **Vị trí:** `frontend/src/components/user/UserHeader.jsx`, `frontend/src/components/user/CategoryNav.jsx`
- **Nguyên nhân gốc:** Chỉ lặp qua `INITIAL_CATEGORIES` tĩnh từ `mockData.js`.
- **Cách sửa:** Gọi `categoryService.getPublicCategories()` trong `useEffect` khi mount để đồng bộ danh mục thực từ Backend (`GET /api/v1/products/categories`), chỉ giữ `INITIAL_CATEGORIES` làm giá trị khởi tạo ban đầu.
