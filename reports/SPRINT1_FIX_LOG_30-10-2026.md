# NHẬT KÝ SỬA LỖI VÀ HOÀN THIỆN SPRINT 1 – NGÀY 30/10/2026
**Dự án:** E-commerce Platform (`C:\IT209\-E-COMMERCE-PLATFORM`)  
**Nhánh làm việc:** `devops-phuong`  
**Vai trò thực hiện:** Senior QA Engineer, Full-stack Developer & DevOps Engineer  

---

## 1. TỔNG QUAN QUY TRÌNH SỬA LỖI

Dựa trên kết quả kiểm thử thực tế tại báo cáo [`reports/SPRINT1_TEST_30-10-2026_LAN1.md`](file:///c:/IT209/-E-COMMERCE-PLATFORM/reports/SPRINT1_TEST_30-10-2026_LAN1.md), toàn bộ **7 lỗi (Bugs)** phát hiện trong Lần 1 (gồm **3 Critical**, **3 High**, **1 Medium**) đã được phân tích nguyên nhân gốc rễ, khắc phục triệt để và kiểm thử lại:

1. **Nguyên tắc an toàn đã tuân thủ tuyệt đối:**
   - Không tự ý chuyển nhánh, pull, merge, reset hoặc push code.
   - Không xóa dữ liệu MySQL hoặc Docker volume.
   - Không ghi đè hay làm hỏng các thay đổi chưa commit của thành viên khác.
   - Giữ nguyên 100% các chức năng đã chạy đúng ở Lần 1 (`ECOM-101`, `ECOM-106`, `ECOM-114`, `ECOM-146`).

---

## 2. DANH SÁCH CHI TIẾT CÁC LỖI ĐÃ SỬA (BUG FIX LOG)

### 2.1. `BUG-S1-01` – [Critical] Lỗi đường dẫn JDK 21 cứng trong `backend/gradle.properties` khiến toàn bộ lệnh build/test Backend thất bại
- **Task liên quan:** `ECOM-204`, `ECOM-213`, `ECOM-222`, `ECOM-231`, `ECOM-240`, `ECOM-249`
- **Nguyên nhân:** File [`backend/gradle.properties`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/gradle.properties) khai báo cứng `org.gradle.java.home=C:/Program Files/Microsoft/jdk-21.0.11.10-hotspot`, nhưng trên máy kiểm thử JDK 21 LTS được cài đặt tại `C:/Program Files/Java/jdk-21`. Khi chạy `.\gradlew.bat test` hoặc `.\gradlew.bat bootJar`, Gradle báo lỗi `Java home supplied is invalid` và dừng ngay lập tức.
- **File đã sửa:**
  - [`backend/gradle.properties`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/gradle.properties#L1)
- **Thay đổi đã thực hiện:**
  - Cập nhật `org.gradle.java.home=C:/Program Files/Java/jdk-21` khớp với đường dẫn Java 21 LTS (`21.0.1+12-LTS-29`) thực tế trên máy.
  - Giữ nguyên `gradle.properties` trong [`backend/.dockerignore`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/.dockerignore) để khi build trong container Linux (`eclipse-temurin:21-jdk-alpine`) không bị ảnh hưởng bởi đường dẫn Windows.
- **Kết quả kiểm tra sau khi sửa:**
  - Chạy `.\gradlew.bat test bootJar --no-daemon` thành công mỹ mãn (**Exit Code 0**, `BUILD SUCCESSFUL`). Toàn bộ 6 microservice (`discovery-server`, `api-gateway`, `auth-service`, `product-service`, `order-service`, `payment-service`) đều biên dịch, đóng gói `bootJar` và vượt qua 100% bài test JUnit 5 + MockMvc + H2 JPA Database.

---

### 2.2. `BUG-S1-02` – [High] Trang Chi tiết sản phẩm (`ProductDetail.jsx`) hiển thị sai tồn kho thực tế và chưa tích hợp API kiểm tra tồn kho (`GET /api/v1/products/{id}/stock`)
- **Task liên quan:** `ECOM-111`, `ECOM-219`
- **Nguyên nhân:**
  - [`frontend/src/services/productService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js) chưa có phương thức `checkStock(id, quantity)` gọi tới endpoint `GET /api/v1/products/{id}/stock` của Backend `ProductController`.
  - [`frontend/src/pages/customer/ProductDetail.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/ProductDetail.jsx) gán cứng `sold = product.sold || 85` và `totalStock = product.stock || 100`, làm sản phẩm có `stockQuantity = 10` bị trừ âm về `0` và không phản ánh đúng số lượng tồn kho từ Backend.
- **File đã sửa:**
  - [`frontend/src/services/productService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L516-L579)
  - [`frontend/src/pages/customer/ProductDetail.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/ProductDetail.jsx#L19-L119)
- **Thay đổi đã thực hiện:**
  - Bổ sung hàm `productService.checkStock(id, quantity = 1)` gọi `GET /api/v1/products/{id}/stock?quantity=...`, trả về đầy đủ `{ productId, productName, stockQuantity, requestedQuantity, status, inStock, sufficientStock, stockStatusMessage }`.
  - Cập nhật `ProductDetail.jsx` gọi `productService.checkStock(id, 1)` ngay khi tải chi tiết sản phẩm, tính toán `actualStockQuantity` từ `stockInfo.stockQuantity ?? product.stockQuantity ?? product.stock`, và hiển thị huy hiệu trạng thái kho trực quan (`data-testid="product-stock-status"`): `🟢 Còn hàng (X sản phẩm có sẵn)` hoặc `🔴 Hết hàng (0 sản phẩm)`.
- **Kết quả kiểm tra sau khi sửa:**
  - Hiển thị chính xác số lượng tồn kho và trạng thái còn hàng/hết hàng cho mọi sản phẩm. Đạt **PASS** trong `sprint1.admin_inventory.qa.test.mjs`.

---

### 2.3. `BUG-S1-03` – [High] Trang Chi tiết sản phẩm (`ProductDetail.jsx`) không khóa nút mua khi sản phẩm hết hàng và không giới hạn số lượng theo tồn kho thực tế
- **Task liên quan:** `ECOM-111`, `ECOM-219`
- **Nguyên nhân:** Nút `"Thêm vào giỏ"` và `"Mua ngay"` trên `ProductDetail.jsx` chỉ kiểm tra `disabled={isAdmin}`, cho phép khách bấm mua cả sản phẩm có `stockQuantity === 0`. Ngoài ra nút tăng số lượng `+` chỉ giới hạn cứng `Math.min(2, q + 1)` mà không kiểm tra `actualStockQuantity`.
- **File đã sửa:**
  - [`frontend/src/pages/customer/ProductDetail.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/ProductDetail.jsx#L112-L195)
- **Thay đổi đã thực hiện:**
  - Tính `isOutOfStock = !stockInfo?.inStock || actualStockQuantity <= 0` và `maxOrderQuantity` dựa trên tồn kho thực tế.
  - Khóa nút tăng/giảm số lượng và khóa cả 2 nút `"Thêm vào giỏ"` / `"Mua ngay"` (`disabled={isAdmin || isOutOfStock}`), đổi nhãn nút sang `"Tạm hết hàng"` / `"SẢN PHẨM ĐÃ HẾT HÀNG"` khi `isOutOfStock === true`.
  - Bổ sung kiểm tra an toàn trong `handleAddToCart` và `handleBuyNow` chặn mua vượt quá `actualStockQuantity`.
- **Kết quả kiểm tra sau khi sửa:**
  - Sản phẩm hết hàng bị khóa nút mua hoàn toàn; sản phẩm còn hàng không thể chọn số lượng vượt quá tồn kho. Đạt **PASS**.

---

### 2.4. `BUG-S1-04` – [High] Admin Quản lý danh mục (`categoryService.js`) chưa gọi API Backend cho các thao tác Thêm, Sửa, Xóa, Tìm kiếm danh mục
- **Task liên quan:** `ECOM-130`, `ECOM-237`
- **Nguyên nhân:** Các hàm `create`, `update`, `delete`, `getById` trong [`frontend/src/services/categoryService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js) chỉ cập nhật `localStorage` cục bộ mà chưa gọi các endpoint `POST /api/v1/products/categories`, `PUT /api/v1/products/categories/{id}`, `DELETE /api/v1/products/categories/{id}`, `GET /api/v1/products/categories/search` của Backend.
- **File đã sửa:**
  - [`frontend/src/services/categoryService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js#L235-L426)
- **Thay đổi đã thực hiện:**
  - Bổ sung hàm `categoryService.search(keyword)` gọi `GET /products/categories/search`.
  - Cập nhật `getById(id)` gọi `GET /products/categories/{id}`.
  - Cập nhật `create(categoryData)` gọi `POST /products/categories` với `{ name, description, imageUrl }` khớp `CategoryRequest.java`.
  - Cập nhật `update(id, categoryData)` gọi `PUT /products/categories/{id}` và `delete(id)` gọi `DELETE /products/categories/{id}`, đồng thời đồng bộ vào `localCategories` để hoạt động mượt mà cả khi online lẫn offline.
- **Kết quả kiểm tra sau khi sửa:**
  - Toàn bộ thao tác CRUD & tìm kiếm danh mục của Admin đã kết nối API Backend và đồng bộ dữ liệu chuẩn xác. Đạt **PASS**.

---

### 2.5. `BUG-S1-05` – [Critical] Trang Admin Danh sách sản phẩm (`src/pages/admin/Products.jsx`) dùng mảng tĩnh hardcode, không kết nối `productService`
- **Task liên quan:** `ECOM-133`, `ECOM-246`
- **Nguyên nhân:** [`frontend/src/pages/admin/Products.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/admin/Products.jsx) khởi tạo state từ mảng tĩnh `INITIAL_MOCK_ADMIN_PRODUCTS` ngay trong component mà không gọi `productService` để lấy danh sách sản phẩm hay xóa sản phẩm.
- **File đã sửa:**
  - [`frontend/src/services/productService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L581-L598)
  - [`frontend/src/pages/admin/Products.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/admin/Products.jsx#L1-L162)
- **Thay đổi đã thực hiện:**
  - Bổ sung `productService.getAdminProducts(params)` gọi `GET /api/v1/products/admin` (fallback về `localProducts` đã chuẩn hóa).
  - Cập nhật `src/pages/admin/Products.jsx` gọi `productService.getAdminProducts()` trong `useEffect`, hiển thị `<Loading />` khi đang tải, đồng bộ `stockQuantity` ↔ `stock`, và gọi `await productService.delete(id)` kèm thông báo Toast khi Admin xóa sản phẩm.
- **Kết quả kiểm tra sau khi sửa:**
  - Trang `/admin/products` tải và xóa sản phẩm thông qua `productService` và đồng bộ tức thời với Storefront/Backend. Đạt **PASS**.

---

### 2.6. `BUG-S1-06` – [Critical] Trang Admin Thêm/Sửa sản phẩm (`src/pages/admin/ProductForm.jsx`) không gọi API lưu sản phẩm và thiếu validation dữ liệu (`price > 0`, `stock >= 0`)
- **Task liên quan:** `ECOM-133`, `ECOM-246`
- **Nguyên nhân:**
  - `ProductForm.jsx` khi mở chế độ sửa (`/admin/products/:id/edit`) chỉ gán dữ liệu giả `Sản phẩm #${id}`, và khi submit chỉ `console.log()` rồi `navigate('/admin/products')`.
  - Thiếu hàm kiểm tra dữ liệu cấp form (`name` không rỗng, `category` không rỗng, `price > 0`, `stock >= 0`).
  - `productService.create()` và `productService.update()` chưa ánh xạ trường `stock` sang `stockQuantity` (trường bắt buộc `@NotNull @Min(0)` trong `ProductCreateRequest.java` và `ProductUpdateRequest.java` của Backend).
- **File đã sửa:**
  - [`frontend/src/pages/admin/ProductForm.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/admin/ProductForm.jsx#L13-L212)
  - [`frontend/src/services/productService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L600-L685)
- **Thay đổi đã thực hiện:**
  - Xây dựng hàm `validateAdminProductForm` trong `ProductForm.jsx` và kiểm tra đầu vào trong `productService.create` / `productService.update` (chặn tên trống, giá `<= 0`, tồn kho `< 0`).
  - Khi ở chế độ sửa (`isEditMode`), gọi `productService.getById(id)` để nạp đúng thông tin sản phẩm hiện tại; nạp danh sách danh mục gợi ý từ `categoryService.getAll()`.
  - Khi submit hợp lệ, gửi payload `{ name, category, price, stock, stockQuantity, description, imageUrl }` qua `productService.create(payload)` hoặc `productService.update(id, payload)`.
- **Kết quả kiểm tra sau khi sửa:**
  - Thêm mới và chỉnh sửa sản phẩm hoạt động hoàn chỉnh, chặn mọi dữ liệu không hợp lệ (`price <= 0`, `stock < 0`) khớp 100% với quy tắc của Backend. Đạt **PASS**.

---

### 2.7. `BUG-S1-07` – [Medium] Trang Admin Quản lý tồn kho (`Inventory.jsx`) & `inventoryService.js` chưa đồng bộ với dữ liệu sản phẩm và API tồn kho
- **Task liên quan:** `ECOM-111`, `ECOM-133`, `ECOM-219`, `ECOM-246`
- **Nguyên nhân:** `inventoryService.js` gọi `/inventory` (endpoint không tồn tại trên Backend) và `Inventory.jsx` chỉ lưu state nội bộ, không gọi `inventoryService`.
- **File đã sửa:**
  - [`frontend/src/services/inventoryService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/inventoryService.js#L1-L91)
  - [`frontend/src/pages/admin/Inventory.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/admin/Inventory.jsx#L1-L155)
- **Thay đổi đã thực hiện:**
  - Cập nhật `inventoryService.js` kết nối trực tiếp với `productService.getAdminProducts()`, `productService.checkStock(productId, quantity)`, `productService.update(productId, ...)` và các API `/products/reserve-stock`, `/products/restore-stock`.
  - Cập nhật `Inventory.jsx` tải danh sách tồn kho từ `inventoryService.getInventory()` và lưu cập nhật số lượng tồn kho (`>= 0`) qua `inventoryService.updateStock(id, parsedStock)`.
- **Kết quả kiểm tra sau khi sửa:**
  - Khi Admin cập nhật số lượng tồn kho tại `/admin/inventory`, số lượng tồn kho của sản phẩm được đồng bộ xuyên suốt sang `productService` và trang chi tiết sản phẩm. Đạt **PASS**.

---

## 3. TỔNG HỢP CÁC FILE ĐÃ CHỈNH SỬA / BỔ SUNG TRONG GIAI ĐOẠN SỬA LỖI

| STT | File | Loại thay đổi | Bug khắc phục |
|:---:|---|---|---|
| 1 | [`backend/gradle.properties`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/gradle.properties) | Sửa đường dẫn `org.gradle.java.home` trỏ tới JDK 21 thực tế (`C:/Program Files/Java/jdk-21`) | `BUG-S1-01` |
| 2 | [`frontend/src/services/productService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js) | Bổ sung `checkStock`, `getAdminProducts`, validate `price > 0` & `stockQuantity >= 0`, đồng bộ `stockQuantity` cho `create`/`update` | `BUG-S1-02`, `BUG-S1-05`, `BUG-S1-06` |
| 3 | [`frontend/src/pages/customer/ProductDetail.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/ProductDetail.jsx) | Tích hợp `productService.checkStock`, hiển thị đúng tồn kho thực tế, giới hạn số lượng mua và khóa nút mua khi hết hàng | `BUG-S1-02`, `BUG-S1-03` |
| 4 | [`frontend/src/services/categoryService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js) | Kết nối `POST`, `PUT`, `DELETE /products/categories`, `GET /products/categories/{id}` và `GET /products/categories/search` | `BUG-S1-04` |
| 5 | [`frontend/src/pages/admin/Products.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/admin/Products.jsx) | Kết nối `productService.getAdminProducts()` và `productService.delete(id)` | `BUG-S1-05` |
| 6 | [`frontend/src/pages/admin/ProductForm.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/admin/ProductForm.jsx) | Kết nối `productService.getById`, `create`, `update` và bổ sung `validateAdminProductForm` | `BUG-S1-06` |
| 7 | [`frontend/src/services/inventoryService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/inventoryService.js) | Đồng bộ tồn kho qua `productService` và các endpoint tồn kho của `/products` | `BUG-S1-07` |
| 8 | [`frontend/src/pages/admin/Inventory.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/admin/Inventory.jsx) | Kết nối `inventoryService.getInventory()` và `inventoryService.updateStock()` kèm validate `stock >= 0` | `BUG-S1-07` |
| 9 | [`frontend/tests/sprint1.admin_inventory.qa.test.mjs`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/tests/sprint1.admin_inventory.qa.test.mjs) | Bổ sung bộ kiểm thử tự động cho `ECOM-111`, `ECOM-130`, `ECOM-133`, `ECOM-146` | Kiểm chứng toàn bộ lỗi đã sửa |
| 10 | [`frontend/package.json`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/package.json) | Tích hợp `sprint1.admin_inventory.qa.test.mjs` vào lệnh `npm test` (tổng cộng 16 test suites) | Regression Test Lần 2 |
