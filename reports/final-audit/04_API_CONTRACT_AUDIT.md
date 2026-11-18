# 04 – BÁO CÁO ĐỐI CHIẾU HỢP ĐỒNG API (API CONTRACT AUDIT)

- **Thời điểm kiểm tra:** 2026-11-16 08:03:35 (GMT+7)
- **Phạm vi:** Đối chiếu toàn bộ 11 Frontend Services (`frontend/src/services/*.js`), API Gateway (`backend/api-gateway/src/main/resources/application.yml`) và 12 REST Controllers thuộc 4 Microservices nghiệp vụ (`auth-service`, `product-service`, `order-service`, `payment-service`).

---

## 1. CHUẨN PHẢN HỒI CHUNG (UNIFIED RESPONSE ENVELOPE)

- **Backend `ApiResponse<T>`:**
  ```json
  {
    "success": true,
    "message": "Thông báo kết quả",
    "data": { ... },
    "errors": null,
    "timestamp": "2026-11-16T08:00:00"
  }
  ```
- **Backend `PagedResponse<T>`:**
  ```json
  {
    "content": [ ... ],
    "pageNumber": 0,
    "pageSize": 10,
    "totalElements": 100,
    "totalPages": 10,
    "last": false
  }
  ```
- **Frontend `unwrapApiResponse` (`frontend/src/services/api.js`):** Tự động giải nén `response.data.data`, kiểm tra `payload.success === false`, tự động làm mới JWT qua `POST /api/v1/auth/refresh` khi gặp `401 Unauthorized`, và trích xuất lỗi trường dữ liệu từ cả `responseData.errors` lẫn `responseData.validationErrors`.

---

## 2. BẢNG ĐỐI CHIẾU TOÀN BỘ 62 REST API ENDPOINTS

### 2.1. Auth Service (`auth-service` – Port `8081`)

| HTTP Method | Endpoint | Gateway Route | Auth / Role | Frontend Caller | Backend Controller | Trạng thái |
|---|---|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | `auth-service` | Public | `authService.register` | `AuthController.register` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/auth/login` | `auth-service` | Public | `authService.login` | `AuthController.login` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/auth/refresh` | `auth-service` | Public | `api.js` (401 interceptor), `authService.refreshToken` | `AuthController.refreshToken` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/auth/logout` | `auth-service` | Authenticated | `authService.logout` | `AuthController.logout` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/users/profile` | `auth-service-protected` | `ROLE_USER` / `ROLE_ADMIN` | `userService.getProfile` | `UserController.getProfile` | **ĐỒNG BỘ 100%** |
| `PUT` | `/api/v1/users/profile` | `auth-service-protected` | `ROLE_USER` / `ROLE_ADMIN` | `userService.updateProfile` | `UserController.updateProfile` | **ĐỒNG BỘ 100%** |
| `PUT` | `/api/v1/users/password` | `auth-service-protected` | `ROLE_USER` / `ROLE_ADMIN` | `userService.changePassword` | `UserController.changePassword` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/users/addresses` | `auth-service-protected` | `ROLE_USER` / `ROLE_ADMIN` | `userService.getAddresses` | `UserController.getUserAddresses` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/users/addresses` | `auth-service-protected` | `ROLE_USER` / `ROLE_ADMIN` | `userService.addAddress` | `UserController.addAddress` | **ĐỒNG BỘ 100%** |
| `PUT` | `/api/v1/users/addresses/{id}` | `auth-service-protected` | `ROLE_USER` / `ROLE_ADMIN` | `userService.updateAddress` | `UserController.updateAddress` | **ĐỒNG BỘ 100%** |
| `DELETE` | `/api/v1/users/addresses/{id}` | `auth-service-protected` | `ROLE_USER` / `ROLE_ADMIN` | `userService.deleteAddress` | `UserController.deleteAddress` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/customers` (và `/admin/users`) | `auth-service-protected` | `ROLE_ADMIN` | `userService.getAllUsers` | `AdminUserController.getAllUsers` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/customers/{id}` (và `/admin/users/{id}`) | `auth-service-protected` | `ROLE_ADMIN` | `userService.getUserById` | `AdminUserController.getUserById` | **ĐỒNG BỘ 100%** |
| `PUT` / `PATCH` | `/api/v1/admin/customers/{id}/status` | `auth-service-protected` | `ROLE_ADMIN` | `userService.updateUserStatus` | `AdminUserController.updateUserStatus` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/customers/count` | Internal / `auth-service-protected` | `X-Internal-Service-Key` / `ROLE_ADMIN` | `order-service` (`AuthClient`) | `AdminUserController.countTotalCustomers` | **ĐỒNG BỘ 100%** |

### 2.2. Product Service (`product-service` – Port `8082`)

| HTTP Method | Endpoint | Gateway Route | Auth / Role | Frontend Caller | Backend Controller | Trạng thái |
|---|---|---|---|---|---|---|
| `GET` | `/api/v1/products` | `product-service-public` | Public | `productService.getAll`, `getCatalog` | `ProductController.getProducts` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/products/{id}` | `product-service-public` | Public | `productService.getById` | `ProductController.getProductById` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/products/{id}/stock` | `product-service-public` | Public | `productService.checkStock` | `ProductController.checkProductStock` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/products/search` | `product-service-public` | Public | `productService.search` | `ProductController.searchProducts` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/products/categories` | `product-service-public` | Public | `categoryService.getPublicCategories`, `getAll` | `ProductController.getCategories` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/products/categories/{id}` | `product-service-public` | Public | `categoryService.getById` | `ProductController.getCategoryById` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/products/categories/search` | `product-service-admin` | `ROLE_ADMIN` | `categoryService.search` | `ProductController.searchCategories` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/products/categories` | `product-service-mutation` | `ROLE_ADMIN` | `categoryService.create` | `ProductController.createCategory` | **ĐỒNG BỘ 100%** |
| `PUT` | `/api/v1/products/categories/{id}` | `product-service-mutation` | `ROLE_ADMIN` | `categoryService.update` | `ProductController.updateCategory` | **ĐỒNG BỘ 100%** |
| `DELETE` | `/api/v1/products/categories/{id}` | `product-service-mutation` | `ROLE_ADMIN` | `categoryService.delete` | `ProductController.deleteCategory` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/products/admin` | `product-service-admin` | `ROLE_ADMIN` | `productService.getAdminProducts` | `ProductController.getAdminProducts` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/products` | `product-service-mutation` | `ROLE_ADMIN` | `productService.create` | `ProductController.createProduct` | **ĐỒNG BỘ 100%** |
| `PUT` | `/api/v1/products/{id}` | `product-service-mutation` | `ROLE_ADMIN` | `productService.update` | `ProductController.updateProduct` | **ĐỒNG BỘ 100%** |
| `DELETE` | `/api/v1/products/{id}` | `product-service-mutation` | `ROLE_ADMIN` | `productService.delete` | `ProductController.deleteProduct` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/products/{id}/inbound` | `product-service-mutation` | `ROLE_ADMIN` | `productService.inboundStock` | `ProductController.inboundStock` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/products/{id}/adjust-stock` | `product-service-mutation` | `ROLE_ADMIN` | `productService.adjustStock` | `ProductController.adjustStock` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/products/low-stock/count` | `product-service-admin` / Internal | `ROLE_ADMIN` / `X-Internal-Service-Key` | `order-service` (`ProductClient`) | `ProductController.countLowStockProducts` | **ĐÃ ĐỒNG BỘ (`BUG-BE-03`)** |
| `POST` | `/api/v1/products/reserve-stock` | Blocked External | `X-Internal-Service-Key` | `order-service` (`ProductClient`) | `ProductController.reserveStock` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/products/restore-stock` | Blocked External | `X-Internal-Service-Key` | `order-service` (`ProductClient`) | `ProductController.restoreStock` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/flash-sales/active` | `product-service-public` | Public | `saleService.getActiveFlashProducts` | `FlashSaleController.getActiveCampaigns` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/flash-sales/products/{productId}/active` | `product-service-public` | Public / Internal | `order-service` (`ProductClient`) | `FlashSaleController.getActiveFlashSaleForProduct` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/flash-sales/campaigns` | `product-service-admin` | `ROLE_ADMIN` | `saleService.getAllCampaigns` | `FlashSaleController.getAllCampaigns` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/flash-sales/campaigns/{id}` | `product-service-admin` | `ROLE_ADMIN` | `saleService.getCampaignById` | `FlashSaleController.getCampaignById` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/admin/flash-sales/campaigns` | `product-service-mutation` | `ROLE_ADMIN` | `saleService.saveCampaign` | `FlashSaleController.createCampaign` | **ĐỒNG BỘ 100%** |
| `PUT` | `/api/v1/admin/flash-sales/campaigns/{id}` | `product-service-mutation` | `ROLE_ADMIN` | `saleService.saveCampaign` | `FlashSaleController.updateCampaign` | **ĐỒNG BỘ 100%** |
| `PATCH` | `/api/v1/admin/flash-sales/campaigns/{id}/status` | `product-service-mutation` | `ROLE_ADMIN` | `saleService.toggleCampaignStatus` | `FlashSaleController.updateCampaignStatus` | **ĐỒNG BỘ 100%** |
| `DELETE` | `/api/v1/admin/flash-sales/campaigns/{id}` | `product-service-mutation` | `ROLE_ADMIN` | `saleService.deleteCampaign` | `FlashSaleController.deleteCampaign` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/products/{productId}/reviews` | `product-service-public` | Public | `reviewService.getProductReviews` | `ProductReviewController.getProductReviews` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/products/{productId}/reviews/me` | `product-service-user-reviews` | Authenticated | `reviewService.getMyReviewForProduct` | `ProductReviewController.getMyReview` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/products/{productId}/reviews` | `product-service-mutation` | `ROLE_USER` | `reviewService.createReview` | `ProductReviewController.createReview` | **ĐỒNG BỘ 100%** |
| `PUT` | `/api/v1/products/{productId}/reviews/{reviewId}` | `product-service-mutation` | `ROLE_USER` | `reviewService.updateReview` | `ProductReviewController.updateReview` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/reviews` | `product-service-admin` | `ROLE_ADMIN` | `reviewService.getAdminReviews` | `ProductReviewController.getAdminReviews` | **ĐỒNG BỘ 100%** |
| `PATCH` | `/api/v1/admin/reviews/{reviewId}/moderate` | `product-service-mutation` | `ROLE_ADMIN` | `reviewService.moderateReview` | `ProductReviewController.moderateReview` | **ĐỒNG BỘ 100%** |

### 2.3. Order Service (`order-service` – Port `8083`)

| HTTP Method | Endpoint | Gateway Route | Auth / Role | Frontend Caller | Backend Controller | Trạng thái |
|---|---|---|---|---|---|---|
| `GET` | `/api/v1/cart` | `order-service` | Authenticated | `cartService.getCart` | `CartController.getCart` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/cart/items` | `order-service` | Authenticated | `cartService.addItem` | `CartController.addToCart` | **ĐỒNG BỘ 100%** |
| `PUT` | `/api/v1/cart/items/{productId}` | `order-service` | Authenticated | `cartService.updateItemQuantity` | `CartController.updateCartItem` | **ĐỒNG BỘ 100%** |
| `DELETE` | `/api/v1/cart/items/{productId}` | `order-service` | Authenticated | `cartService.removeItem` | `CartController.removeCartItem` | **ĐỒNG BỘ 100%** |
| `DELETE` | `/api/v1/cart` | `order-service` | Authenticated | `cartService.clearCart` | `CartController.clearCart` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/orders/checkout` (và `POST /api/v1/orders`) | `order-service-checkout` | Authenticated | `orderService.createOrder` | `OrderController.checkout`, `createOrder` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/orders` (và `/orders/my-orders`) | `order-service` | Authenticated | `orderService.getMyOrders` | `OrderController.getUserOrders`, `getMyOrders` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/orders/{id}` | `order-service` | Owner / `ROLE_ADMIN` | `orderService.getOrderById` | `OrderController.getOrderById` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/orders/{id}/history` | `order-service` | Owner / `ROLE_ADMIN` | `orderService.getOrderHistory` | `OrderController.getOrderStatusHistory` | **ĐỒNG BỘ 100%** |
| `PUT` / `POST` | `/api/v1/orders/{id}/cancel` | `order-service` | Owner / `ROLE_ADMIN` | `orderService.cancelOrder` | `OrderController.cancelOrder` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/orders` | `order-service` | `ROLE_ADMIN` | `orderService.getAllOrders` | `AdminOrderController.getAllOrders` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/orders/{id}` | `order-service` | `ROLE_ADMIN` | `orderService.getAdminOrderById` | `AdminOrderController.getOrderByIdForAdmin` | **ĐÃ ĐỒNG BỘ (`BUG-BE-04`)** |
| `PUT` | `/api/v1/admin/orders/{id}/status` | `order-service` | `ROLE_ADMIN` | `orderService.updateOrderStatus` | `AdminOrderController.updateOrderStatus` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/orders/{id}/history` | `order-service` | `ROLE_ADMIN` | `orderService.getAdminOrderHistory` | `AdminOrderController.getOrderStatusHistory` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/orders/customer/{userId}` | `order-service` | `ROLE_ADMIN` | `orderService.getOrdersByCustomer` | `AdminOrderController.getOrdersByCustomer` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/admin/orders/statistics` (và `/stats`, `/api/v1/admin/statistics`) | `order-service` | `ROLE_ADMIN` | `orderService.getDashboardStats` | `AdminOrderController.getOrderStatistics`, `AdminStatisticsController.getSystemStatistics` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/vouchers/active` (và `/api/v1/vouchers`) | `order-service-public-vouchers` | Public (Optional JWT) | `voucherService.getPublicVouchers`, `MyVouchers.jsx` | `VoucherController.getActiveVouchers` | **ĐÃ ĐỒNG BỘ (`BUG-FE-01`, `BUG-BE-06`)** |
| `POST` | `/api/v1/vouchers/apply` | `order-service` | Authenticated | `voucherService.applyCode` | `VoucherController.applyVoucher` | **ĐỒNG BỘ 100%** |
| `GET/POST/PUT/PATCH/DELETE` | `/api/v1/admin/vouchers` | `order-service` | `ROLE_ADMIN` | `voucherService.getAll`, `create`, `update`, `toggleStatus`, `delete` | `AdminVoucherController` | **ĐỒNG BỘ 100%** |

### 2.4. Payment Service (`payment-service` – Port `8084`)

| HTTP Method | Endpoint | Gateway Route | Auth / Role | Frontend Caller | Backend Controller | Trạng thái |
|---|---|---|---|---|---|---|
| `POST` | `/api/v1/payments/process` | `payment-service` | Authenticated | `paymentService.processPayment` | `PaymentController.processPayment` | **ĐỒNG BỘ 100%** |
| `POST` | `/api/v1/payments/mock` | `payment-service` | Authenticated | `paymentService.processMockPayment` | `PaymentController.processMockPayment` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/payments/order/{orderId}` | `payment-service` | Owner / `ROLE_ADMIN` | `paymentService.getPaymentByOrderId` | `PaymentController.getPaymentByOrderId` | **ĐỒNG BỘ 100%** |
| `GET` | `/api/v1/payments/{id}` | `payment-service` | Owner / `ROLE_ADMIN` | `paymentService.getPaymentById` | `PaymentController.getPaymentById` | **ĐỒNG BỘ 100%** |
