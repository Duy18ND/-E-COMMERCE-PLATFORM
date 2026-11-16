# 07 – BÁO CÁO CHẤT LƯỢNG MÃ NGUỒN & ĐỒNG NHẤT KIẾN TRÚC (CODE QUALITY AUDIT)

- **Thời điểm kiểm tra:** 2026-11-16 08:04:00 (GMT+7)
- **Kết quả kiểm tra tĩnh:**
  - Frontend Lint (`node scripts/lint-check.mjs`): **93/93 file trong `src/` PASS, 0 lỗi**.
  - Backend Compiler (`javac` Java 21 qua Gradle): **6/6 Microservices biên dịch thành công, 0 lỗi**.

---

## 1. KẾT QUẢ RÀ SOÁT CLEAN CODE & KIẾN TRÚC

| Tiêu chí | Frontend (`frontend/src`) | Backend (`backend/*`) | Đánh giá & Xử lý |
|---|---|---|---|
| **Code trùng lặp / Service trùng lặp** | Đã hợp nhất layout qua `UserHeader.jsx` và `CategoryNav.jsx` (các file `Header.jsx`/`Navbar.jsx` chỉ là re-export 5 dòng để giữ tương thích test `ECOM-109`). | Đã phát hiện và xử lý `PaymentConsumer.java` trùng `@KafkaListener` với `KafkaPaymentConsumer.java` trong `order-service` (`BUG-BE-01`). | **ĐẠT** |
| **Không dùng `window.alert` / `window.confirm` / `window.prompt`** | 0 lần gọi trong toàn bộ `src/` (đã thay thế 100% bằng `useNotification` / `ToastContext` và `Modal`). | N/A | **ĐẠT** |
| **Xử lý ngoại lệ (Exception Handling)** | `api.js` chuẩn hóa lỗi mạng, timeout (408), lỗi 400/401/403/404/500 và field validation errors. | Cả 4 service nghiệp vụ đều có `@RestControllerAdvice GlobalExceptionHandler` trả về đúng cấu trúc `ApiResponse<T>`. | **ĐẠT** |
| **Chống lỗi N+1 Query & Tối ưu hiệu năng** | Hỗ trợ debounce tìm kiếm (`350ms`), phân trang server-side và client-side hợp lý. | Sử dụng `@Query("... LEFT JOIN FETCH c.items ...")` trong `FlashSaleCampaignRepository`, gom batch `productRepository.findAllById(productIds)`, và cache Redis `@Cacheable("products")` kèm `@CacheEvict` đầy đủ (`BUG-BE-02`). | **ĐẠT** |
| **An toàn đồng thời (Concurrency & Transaction)** | Khoá nút bấm khi đang `submitting` / `loading`. | Optimistic Locking (`@Version`) + Atomic SQL update cho tồn kho sản phẩm, lượt dùng voucher và suất Flash Sale; Redis Lua script nguyên tử cho Flash Sale. | **ĐẠT** |
| **Hardcoded Config** | Đã thêm `resolveBaseApiUrl()` trong `api.js` chống gọi nhầm `localhost` trên Production (`BUG-FE-03`). | Đã cập nhật `DataInitializer.java` trong `auth-service` đọc `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` từ biến môi trường (`BUG-BE-05`). | **ĐẠT** |
