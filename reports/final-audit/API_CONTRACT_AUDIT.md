# API CONTRACT AUDIT – BÁO CÁO ĐỐI CHIẾU HỢP ĐỒNG API FRONTEND & BACKEND

> Tài liệu này được đồng bộ trực tiếp với [04_API_CONTRACT_AUDIT.md](file:///c:/IT209/-E-COMMERCE-PLATFORM/reports/final-audit/04_API_CONTRACT_AUDIT.md) theo yêu cầu tại Mục 4.3 và Mục 13.

- **Thời điểm kiểm tra:** 2026-11-16 08:03:35 (GMT+7)
- **Kết luận:** 100% các API giữa Frontend (`frontend/src/services/*.js`), API Gateway (`backend/api-gateway/src/main/resources/application.yml`) và Backend Microservices (`auth-service`, `product-service`, `order-service`, `payment-service`) đã đồng bộ hoàn toàn về HTTP Method, Endpoint, Request DTO, Query Params, Path Variables, `ApiResponse<T>`, `PagedResponse<T>`, và phân quyền JWT/RBAC.
- **Các điểm lệch đã được sửa triệt để trong đợt Audit:**
  1. `MyVouchers.jsx` gọi `voucherService.getPublicVouchers()` (`GET /api/v1/vouchers/active`) thay vì `voucherService.getAll()` (`GET /api/v1/admin/vouchers`).
  2. `AdminOrderController.java` bổ sung `GET /api/v1/admin/orders/{id}` khớp với `orderService.getAdminOrderById`.
  3. `ProductController.java` (`GET /api/v1/products/low-stock/count`) bổ sung hỗ trợ `X-Internal-Service-Key` cho `order-service` (`ProductClient`).
  4. `api-gateway` mở public `GET /api/v1/vouchers` đồng bộ với `/api/v1/vouchers/active`.
  5. `frontend/src/services/api.js` hỗ trợ cả `responseData.errors` và `responseData.validationErrors`.
