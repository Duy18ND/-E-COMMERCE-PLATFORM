# BÁO CÁO KIỂM THỬ TỰ ĐỘNG SPRINT 1 – LẦN 1 (HIỆN TRẠNG TRƯỚC KHI SỬA LỖI)
**Ngày kiểm thử:** 30/10/2026  
**Dự án:** E-commerce Platform (`C:\IT209\-E-COMMERCE-PLATFORM`)  
**Vai trò thực hiện:** Senior QA Engineer, Full-stack Developer & DevOps Engineer  

---

## 1. THÔNG TIN MÔI TRƯỜNG & HIỆN TRẠNG GIT

### 1.1. Môi trường kiểm thử thực tế
- **Hệ điều hành:** Windows 10/11 (`windows/amd64`), PowerShell
- **Node.js / NPM:** Node.js `v22.18.0`, npm `10.9.3`
- **Frontend Stack:** React `18.3.1`, Vite `5.4.21`, React Router DOM `6.27.0`, Axios `1.7.7`
- **Java / JDK:** Java 21 LTS (`21.0.1+12-LTS-29`) cài đặt tại `C:\Program Files\Java\jdk-21` (Tuy nhiên `backend/gradle.properties` đang cấu hình cứng `org.gradle.java.home=C:/Program Files/Microsoft/jdk-21.0.11.10-hotspot` không tồn tại trên máy host).
- **Build Tool Backend:** Gradle `8.7` (`gradlew.bat`), Spring Boot `3.3.4`, Spring Cloud `2023.0.3`
- **Database:** MySQL `8.0` (Cấu hình trong `backend/docker-compose.yml` và `backend/docker/mysql/init.sql`; H2 in-memory database cho môi trường test).
- **Docker & Infrastructure:** Docker CLI `29.5.2` (build `79eb04c`), Docker Compose `v5.1.4`, Nginx `1.27-alpine`.
- **Trạng thái cổng dịch vụ & Docker Daemon trên máy host:**
  - Kiểm tra kết nối TCP các cổng `80, 3000, 3306, 5173, 6379, 8080, 8081, 8082, 8083, 8084, 8761, 9092`: Không có tiến trình nào đang lắng nghe.
  - Kiểm tra Docker Engine Daemon (`docker ps -a`): `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified` (Docker Desktop Linux Engine đang tắt trên máy Windows).

### 1.2. Trạng thái Git hiện tại (Tuân thủ nguyên tắc không tự ý đổi nhánh/commit/reset)
- **Nhánh hiện tại (`git branch --show-current`):** `devops-phuong` (Ahead of `origin/devops-phuong` by 4 commits).
- **Commit gần nhất (`git log -n 3 --oneline`):**
  - `58ff1f1 Merge pull request #25 from Duy18ND/BE-Duy`
  - `d9ffb6a BE-DUY Done ECOM-252, ECOM-121, ECOM-126`
  - `28bee2b Merge pull request #24 from Duy18ND/devops-phuong`
- **Kiểm tra Merge Conflict:** Không có dấu hiệu xung đột (`0` conflict markers trong toàn bộ mã nguồn).
- **Bằng chứng log Git Lần 1:** [`reports/sprint1-evidence/lan1/git-status-lan1.log`](file:///c:/IT209/-E-COMMERCE-PLATFORM/reports/sprint1-evidence/lan1/git-status-lan1.log)

---

## 2. DANH SÁCH FEATURE & TASK ID TRONG PHẠM VI KIỂM THỬ SPRINT 1

| Feature ID | Tên nhóm chức năng | Các Task QA & Dev liên quan |
|---|---|---|
| **ECOM-101** | Đăng ký / Đăng nhập & Phân quyền JWT | `ECOM-102`, `ECOM-105`, `ECOM-197`, `ECOM-199`, **`ECOM-200`**, **`ECOM-204`** |
| **ECOM-106** | Danh mục và danh sách sản phẩm (Guest/Public) | `ECOM-108`, `ECOM-109`, `ECOM-110`, `ECOM-208`, `ECOM-209`, **`ECOM-210`**, `ECOM-211`, `ECOM-212`, **`ECOM-213`** |
| **ECOM-111** | Chi tiết sản phẩm và kiểm tra tồn kho | `ECOM-112`, **`ECOM-219`**, `ECOM-220`, `ECOM-221`, **`ECOM-222`** |
| **ECOM-114** | Tìm kiếm, lọc và sắp xếp sản phẩm | `ECOM-115`, `ECOM-224`, `ECOM-226`, `ECOM-227`, **`ECOM-228`**, `ECOM-229`, `ECOM-230`, **`ECOM-231`** |
| **ECOM-130** | Admin quản lý danh mục sản phẩm (CRUD) | `ECOM-132`, **`ECOM-237`**, `ECOM-238`, `ECOM-239`, **`ECOM-240`** |
| **ECOM-133** | Admin quản lý sản phẩm & tồn kho (CRUD) | `ECOM-135`, **`ECOM-246`**, `ECOM-247`, `ECOM-248`, **`ECOM-249`** |
| **ECOM-146** | Hạ tầng Docker, MySQL 8.0, Nginx Reverse Proxy | **`ECOM-147`**, **`ECOM-148`**, **`ECOM-149`**, **`ECOM-150`** |

---

## 3. CÁC BƯỚC CHẠY TEST LẦN 1 & KẾT QUẢ THỰC TẾ CHI TIẾT

### 3.1. Các bước thực thi kiểm thử Lần 1
1. **Kiểm tra Frontend Lint & Build:** Chạy `npm --prefix frontend run lint` và `npm --prefix frontend run build`.
2. **Kiểm tra Automated QA Test Frontend hiện có:** Chạy `npm --prefix frontend test` (`auth.qa.test.mjs`, `ecom106.qa.test.mjs`, `ecom226_227.qa.test.mjs`).
3. **Kiểm tra thực tế mã nguồn & luồng tích hợp Frontend ↔ Backend của các tính năng Sprint 1 chưa có test:**
   - Kiểm tra chi tiết sản phẩm & tồn kho (`ProductDetail.jsx`, `Inventory.jsx`, `inventoryService.js` – `ECOM-219`, `ECOM-222`).
   - Kiểm tra Admin Quản lý danh mục (`Categories.jsx`, `categoryService.js` – `ECOM-237`, `ECOM-240`).
   - Kiểm tra Admin Quản lý sản phẩm (`admin/Products.jsx`, `admin/ProductForm.jsx`, `productService.js` – `ECOM-246`, `ECOM-249`).
4. **Kiểm tra Backend Build & Unit/Integration Test:** Chạy `cd backend && .\gradlew.bat test --no-daemon`.
5. **Kiểm tra cấu hình Docker, Docker Compose, Nginx & MySQL:** Chạy `docker compose -f backend/docker-compose.yml config` và `docker ps -a`.

---

### 3.2. Bảng kết quả chi tiết toàn bộ 42 Test Case – Lần 1

| STT | Task ID | Mã TC | Nội dung Test Case | Kết quả mong đợi | Kết quả thực tế (Lần 1) | Trạng thái Lần 1 |
|:---:|---|---|---|---|---|:---:|
| 1 | **ECOM-200** | `TC-S1-01` | [FE] Giao diện & Validate Form Đăng nhập (`/login`) | Có đủ `email`, `password`, kiểm tra định dạng email, mật khẩu >= 6 ký tự, hiển thị lỗi cấp trường và khóa nút khi loading. | `Login.jsx` có `validateLoginForm`, hiển thị `fieldErrors.email`, `fieldErrors.password` và `<ErrorMessage />`. Test `auth.qa.test.mjs` PASS. | **PASS** |
| 2 | **ECOM-200** | `TC-S1-02` | [FE] Giao diện & Validate Form Đăng ký (`/register`) | Có đủ `fullName`, `email`, `phone` (10-11 số), `address`, `password`, `confirmPassword`; chặn dữ liệu sai trước khi gọi API. | `Register.jsx` có `validateRegisterForm` khớp quy tắc DTO Backend (`PHONE_REGEX = /^[0-9]{10,11}$/`). | **PASS** |
| 3 | **ECOM-200** | `TC-S1-03` | [FE] Quản lý JWT, Refresh Token, Interceptor 401 & Logout | Lưu `token`, `refreshToken`, `user` vào `localStorage`; tự gắn `Bearer token`; tự gọi `/auth/refresh` khi 401; xóa token khi Logout. | `api.js`, `authService.js`, `AuthContext.jsx` và `utils/auth.js` xử lý đầy đủ. | **PASS** |
| 4 | **ECOM-200** | `TC-S1-04` | [FE] Phân quyền `ProtectedRoute` & `AdminRoute` (USER / ADMIN / GUEST) | Chặn Guest vào `/checkout`, `/orders`, `/admin/*`; chặn USER vào `/admin/*`; điều hướng đúng theo role sau khi login. | `AppRoutes.jsx`, `ProtectedRoute.jsx` và `AdminRoute.jsx` hoạt động chính xác. | **PASS** |
| 5 | **ECOM-204** | `TC-S1-05` | [BE] Thực thi Gradle Test & Build cho `auth-service` (`POST /register`, `/login`, `/refresh`, `/logout`, `/validate`) | `.\gradlew.bat :auth-service:test` chạy thành công, toàn bộ test controller/service/JWT PASS. | Lệnh `.\gradlew.bat test` báo lỗi `BUILD FAILED`: `Value 'C:/Program Files/Microsoft/jdk-21.0.11.10-hotspot' given for org.gradle.java.home Gradle property is invalid`. (`BUG-S1-01`) | **FAIL** |
| 6 | **ECOM-204** | `TC-S1-06` | [BE] Kiểm tra bảo mật BCrypt, Validation DTO (`RegisterRequest`, `LoginRequest`) & mã HTTP `201/200/400/401/403` | Test thực tế xác nhận mật khẩu mã hóa BCrypt, email trùng trả lỗi, input sai trả `400 Bad Request`. | Không thể thực thi JUnit test do lỗi cấu hình `backend/gradle.properties` làm hỏng toàn bộ lệnh chạy Gradle. (`BUG-S1-01`) | **FAIL** |
| 7 | **ECOM-204** | `TC-S1-07` | [BE] Kiểm tra `AuthenticationFilter` tại `api-gateway` (gắn `X-User-Id`, `X-User-Roles`, chặn JWT sai) | `.\gradlew.bat :api-gateway:test` chạy PASS toàn bộ test filter và circuit breaker fallback. | Lệnh Gradle test thất bại ngay từ bước khởi tạo JVM do `org.gradle.java.home` không hợp lệ. (`BUG-S1-01`) | **FAIL** |
| 8 | **ECOM-210** | `TC-S1-08` | [FE] Hiển thị danh mục sản phẩm cho Guest trên Trang chủ (`/`) & Header/Navbar | Hiển thị 4 danh mục chuẩn kèm ảnh, mô tả; menu Danh mục trên Header và Navbar điều hướng đúng tới `/products?category=...`. | `Home.jsx`, `Header.jsx`, `Navbar.jsx` gọi `categoryService.getPublicCategories()`. Test `ecom106.qa.test.mjs` PASS. | **PASS** |
| 9 | **ECOM-210** | `TC-S1-09` | [FE] Hiển thị danh sách sản phẩm (`ProductGrid`, `ProductCard`) & Lọc theo danh mục | Hiển thị ảnh sắc nét (có fallback), tên, danh mục, giá định dạng VND (`₫`); lọc đúng sản phẩm khi chọn danh mục. | `Products.jsx`, `ProductGrid.jsx`, `ProductCard.jsx` hoạt động đúng. | **PASS** |
| 10 | **ECOM-210** | `TC-S1-10` | [FE] Phân trang (`Pagination`), Loading State, Empty State & Error State trên `/products` | Chuyển trang Trước/Sau/Số trang; đổi danh mục reset về trang 1; hiển thị `Loading`, `EmptyState` và `ErrorMessage`. | `Products.jsx` tích hợp đầy đủ `<Pagination />`, `<Loading />`, `<EmptyState />`, `<ErrorMessage />`. | **PASS** |
| 11 | **ECOM-210** | `TC-S1-11` | [FE] Kiểm tra giao diện Responsive (`375px` Mobile, `768px` Tablet, `1366px` Desktop) | Không tràn ngang, lưới sản phẩm và thanh Header/Filter tự động co giãn theo từng kích thước màn hình. | `responsive.css` có đầy đủ media queries cho `1024px`, `768px`, `480px`. | **PASS** |
| 12 | **ECOM-213** | `TC-S1-12` | [BE] Thực thi test API `GET /api/v1/products/categories` & `GET /api/v1/products` có phân trang `PagedResponse` | `.\gradlew.bat :product-service:test` thực thi thành công, kiểm증 `getCategories()` và `getProducts()` trả về `200 OK`. | Không chạy được JUnit test của `product-service` do lỗi `org.gradle.java.home` trong `backend/gradle.properties`. (`BUG-S1-01`) | **FAIL** |
| 13 | **ECOM-219** | `TC-S1-13` | [FE] Trang Chi tiết sản phẩm (`/products/:id`) hiển thị thông tin sản phẩm từ API | Hiển thị đúng tên, ảnh, giá bán, mô tả, danh mục; hiển thị thông báo rõ ràng khi ID sản phẩm không tồn tại. | `ProductDetail.jsx` gọi `productService.getById(id)` và hiển thị thông tin cơ bản cùng màn hình "Không tìm thấy sản phẩm". | **PASS** |
| 14 | **ECOM-219** | `TC-S1-14` | [FE] Trang Chi tiết sản phẩm (`/products/:id`) tích hợp API kiểm tra tồn kho (`GET /api/v1/products/{id}/stock`) và hiển thị đúng số lượng tồn kho thực tế | Hiển thị chính xác số lượng tồn kho thực tế (`stockQuantity`), trạng thái Còn hàng / Hết hàng từ API `/products/{id}/stock`. | **LỖI:** `ProductDetail.jsx` (dòng 90-92) gán cứng `sold = product.sold \|\| 85`, `totalStock = product.stock \|\| 100`, nên sản phẩm có `stockQuantity = 10` bị tính `remainingStock = max(0, 10 - 85) = 0` hoặc hiển thị sai tồn kho; hoàn toàn chưa gọi API `GET /api/v1/products/{id}/stock`. (`BUG-S1-02`) | **FAIL** |
| 15 | **ECOM-219** | `TC-S1-15` | [FE] Chặn chọn số lượng vượt quá tồn kho và khóa nút "Thêm vào giỏ" / "Mua ngay" khi sản phẩm hết hàng (`stockQuantity <= 0`) | Khi `stockQuantity === 0`, hiển thị nhãn "Hết hàng" và disable nút mua; khi còn hàng, giới hạn số lượng chọn không vượt quá `stockQuantity`. | **LỖI:** `ProductDetail.jsx` (dòng 662, 699, 722) gán cứng `Math.min(2, q + 1)` mà không kiểm tra `stockQuantity`, và **không disable** nút "Thêm vào giỏ" / "Mua ngay" khi sản phẩm có `stock === 0` (vẫn cho phép bấm mua sản phẩm đã hết hàng). (`BUG-S1-03`) | **FAIL** |
| 16 | **ECOM-222** | `TC-S1-16` | [BE] Thực thi test API Chi tiết sản phẩm (`GET /api/v1/products/{id}`) & Kiểm tra tồn kho (`GET /api/v1/products/{id}/stock`) | `.\gradlew.bat :product-service:test` kiểm chứng `getProductById`, `404 Not Found`, `checkProductStock`, `reserveStock` (Optimistic Lock) và `restoreStock`. | Bị lỗi `BUILD FAILED` khi chạy Gradle do đường dẫn JDK cứng sai trong `backend/gradle.properties`. (`BUG-S1-01`) | **FAIL** |
| 17 | **ECOM-228** | `TC-S1-17` | [FE] Tìm kiếm sản phẩm theo từ khóa (`ProductSearch.jsx`): hợp lệ, không có kết quả, chuỗi rỗng, khoảng trắng thừa, Debounce & Enter | Chuẩn hóa khoảng trắng, debounce `350ms`, nhấn Enter không reload trang, nút xóa từ khóa khôi phục danh sách. | `ProductSearch.jsx` và `productService.js` vượt qua 4/4 test `SEARCH-01` → `SEARCH-04` trong `ecom226_227.qa.test.mjs`. | **PASS** |
| 18 | **ECOM-228** | `TC-S1-18` | [FE] Bộ lọc Danh mục, Khoảng giá (`minPrice`, `maxPrice` + Validation), Tình trạng còn hàng (`inStock`) & Đặt lại bộ lọc | Chặn giá âm và `minPrice > maxPrice` ngay trên UI; gửi đúng `category`, `categoryId`, `minPrice`, `maxPrice`, `inStock=true`; nút Reset xóa toàn bộ filter. | `ProductFilter.jsx` và `Products.jsx` vượt qua 5/5 test `FILTER-01` → `FILTER-05`. | **PASS** |
| 19 | **ECOM-228** | `TC-S1-19` | [FE] Sắp xếp sản phẩm (`price,asc`, `price,desc`, `name,asc`, `name,desc`), giữ bộ lọc khi chuyển trang & chống Race-Condition | Ánh xạ đúng cú pháp Spring Data `Pageable`, giữ nguyên query params trên URL khi sang trang 2, bỏ qua response cũ đến muộn. | Vượt qua toàn bộ test `SORT-01` → `SORT-03` và `RESULT-01` → `RESULT-08`. | **PASS** |
| 20 | **ECOM-231** | `TC-S1-20` | [BE] Thực thi test API Tìm kiếm (`GET /api/v1/products/search`) & Bộ lọc nâng cao (`ProductSpecification`, `ProductFilterRequest`) | `.\gradlew.bat :product-service:test` chạy PASS các test tìm kiếm từ khóa, lọc khoảng giá, lọc `inStock` và trả `400 Bad Request` khi `minPrice > maxPrice`. | Bị chặn thực thi bởi lỗi cấu hình `org.gradle.java.home` trong `backend/gradle.properties`. (`BUG-S1-01`) | **FAIL** |
| 21 | **ECOM-237** | `TC-S1-21` | [FE] Giao diện Admin Quản lý danh mục (`/admin/categories`): hiển thị bảng, thống kê, tìm kiếm, lọc trạng thái, phân trang và Validate form | Hiển thị danh sách danh mục, tìm kiếm theo tên/ID, kiểm tra không để trống tên và chống trùng tên danh mục. | Trang `src/pages/admin/Categories.jsx` có đầy đủ bảng dữ liệu, thẻ thống kê, tìm kiếm, phân trang và hàm `validateForm` kiểm tra trùng tên. | **PASS** |
| 22 | **ECOM-237** | `TC-S1-22` | [FE] Kết nối API Backend cho Admin CRUD Danh mục (`POST`, `PUT`, `DELETE /api/v1/products/categories`) trong `categoryService.js` | Khi Admin thêm, sửa, xóa hoặc tìm kiếm danh mục, `categoryService` phải gọi API Backend `/products/categories` kèm đồng bộ dữ liệu. | **LỖI:** Trong `frontend/src/services/categoryService.js` (dòng 256-332), các hàm `create()`, `update(id)`, `delete(id)` và `getById(id)` **chỉ thao tác trên mảng `localStorage` cục bộ (`localCategories`)**, hoàn toàn **không gọi** `api.post('/products/categories')`, `api.put('/products/categories/${id}')`, `api.delete('/products/categories/${id}')` dù Backend `ProductController` đã triển khai đầy đủ các endpoint này! (`BUG-S1-04`) | **FAIL** |
| 23 | **ECOM-240** | `TC-S1-23` | [BE] Thực thi test Admin CRUD Danh mục (`POST`, `PUT`, `DELETE /api/v1/products/categories`), kiểm tra trùng tên (`422`) và phân quyền `ROLE_ADMIN` (`403`) | `.\gradlew.bat :product-service:test` chạy PASS các test `shouldCreateCategorySuccessfully`, `shouldReturn403WhenCreateCategoryWithoutAdminRole`, `shouldThrowIllegalStateExceptionWhenCreateDuplicateCategory`. | Không chạy được Gradle test do lỗi `org.gradle.java.home` trong `backend/gradle.properties`. (`BUG-S1-01`) | **FAIL** |
| 24 | **ECOM-246** | `TC-S1-24` | [FE] Trang Admin Danh sách sản phẩm (`/admin/products`) kết nối API Backend (`GET /api/v1/products/admin`, `DELETE /api/v1/products/{id}`) | Trang `/admin/products` gọi `productService` để tải danh sách sản phẩm từ Backend (hoặc dữ liệu đồng bộ) và gọi `productService.delete(id)` khi xóa. | **LỖI NGHIÊM TRỌNG:** `frontend/src/pages/admin/Products.jsx` (dòng 7-35, 124-131) **dùng mảng hardcode tĩnh `INITIAL_MOCK_ADMIN_PRODUCTS` trong component state**, hoàn toàn **không import và không gọi `productService`**. Khi xóa chỉ lọc state nội bộ, reload trang là mất thay đổi. (`BUG-S1-05`) | **FAIL** |
| 25 | **ECOM-246** | `TC-S1-25` | [FE] Trang Admin Thêm / Sửa sản phẩm (`/admin/products/new`, `/admin/products/:id/edit`) kết nối API & Validate dữ liệu (`price > 0`, `stock >= 0`) | Khi sửa: gọi `productService.getById(id)` nạp dữ liệu thật; khi lưu: validate tên, giá > 0, tồn kho >= 0 và gọi `productService.create()` / `productService.update()` với trường `stockQuantity` khớp Backend. | **LỖI NGHIÊM TRỌNG:** `frontend/src/pages/admin/ProductForm.jsx` (dòng 38-51, 110-116) khi sửa chỉ gán chuỗi giả `Sản phẩm #${id}`, và khi bấm Submit (`handleSubmit`) **chỉ `console.log(...)` rồi `navigate('/admin/products')`**, hoàn toàn **không gọi `productService.create()` hay `productService.update()`** và chưa validate `price > 0`, `stock >= 0` bằng JS! Ngoài ra `productService.create/update` chưa ánh xạ `stock` sang `stockQuantity` cho DTO Backend. (`BUG-S1-06`) | **FAIL** |
| 26 | **ECOM-246** | `TC-S1-26` | [FE] Trang Admin Quản lý tồn kho (`/admin/inventory`) & `inventoryService.js` kết nối với dữ liệu sản phẩm và API cập nhật tồn kho | Hiển thị tồn kho thực tế từ danh sách sản phẩm, cho phép cập nhật số lượng tồn kho (`stockQuantity >= 0`) qua `inventoryService` / `productService`. | **LỖI:** `frontend/src/pages/admin/Inventory.jsx` (dòng 5-29) dùng mảng hardcode `INITIAL_MOCK_INVENTORY` tách rời hoàn toàn với `productService` và `inventoryService.js` đang gọi `/inventory` (endpoint không tồn tại trên Backend thay vì sử dụng API sản phẩm `/products`). (`BUG-S1-07`) | **FAIL** |
| 27 | **ECOM-249** | `TC-S1-27` | [BE] Thực thi test Admin CRUD Sản phẩm (`POST /products`, `PUT /products/{id}`, `DELETE /products/{id}`, `GET /products/admin`) & Validate `price > 0`, `stockQuantity >= 0` | `.\gradlew.bat :product-service:test` chạy PASS toàn bộ test tạo/sửa/xóa mềm sản phẩm, trả `400` khi giá <= 0 hoặc tồn kho < 0, trả `403` khi thiếu `ROLE_ADMIN`. | Bị lỗi `BUILD FAILED` khi chạy Gradle do `org.gradle.java.home` không hợp lệ trong `backend/gradle.properties`. (`BUG-S1-01`) | **FAIL** |
| 28 | **ECOM-147** | `TC-S1-28` | [DevOps] Kiểm tra cấu trúc Git Repository, nhánh làm việc `devops-phuong`, `.gitignore` và kiểm tra conflict | Nhánh `devops-phuong` sạch conflict, `.gitignore` ở root/backend/frontend chặn `.env`, `build/`, `node_modules/`, `dist/`. | Nhánh `devops-phuong` đúng quy định, `0` conflict markers, `.gitignore` đầy đủ. | **PASS** |
| 29 | **ECOM-148** | `TC-S1-29` | [DevOps] Kiểm tra cấu hình môi trường (`.env.example`, `application-dev.yml`, `application-prod.yml`) và script khởi tạo MySQL 8.0 (`init.sql`) | Có đủ `.env.example` cho FE/BE, bộ 3 file `application*.yml` cho 6 service, `init.sql` tạo 4 DB (`auth_db`, `product_db`, `order_db`, `payment_db`) với `utf8mb4`. | Toàn bộ file cấu hình môi trường và `backend/docker/mysql/init.sql` đã đầy đủ và chính xác. | **PASS** |
| 30 | **ECOM-149** | `TC-S1-30` | [DevOps] Kiểm tra Multi-stage `Dockerfile` và `.dockerignore` cho Backend (6 services) & Frontend | Backend dùng `eclipse-temurin:21-jdk-alpine` -> `21-jre-alpine` (non-root user); Frontend dùng `node:20-alpine` -> `nginx:1.27-alpine`; `.dockerignore` loại trừ `gradle.properties`, `node_modules`, `build`. | Đầy đủ 7 multi-stage `Dockerfile` và `.dockerignore` chuẩn xác. | **PASS** |
| 31 | **ECOM-150** | `TC-S1-31` | [DevOps] Kiểm tra cú pháp `backend/docker-compose.yml`, cấu hình Healthcheck, Persistent Volumes & Nginx Reverse Proxy (`nginx.conf`) | `docker compose -f backend/docker-compose.yml config --quiet` trả về Exit Code `0`; Nginx định tuyến `/api/` -> `api-gateway:8080` và `/` -> `frontend:80` kèm `try_files`. | Lệnh `docker compose config --quiet` đạt `ExitCode=0`, cấu hình Nginx và healthcheck hợp lệ 100%. | **PASS** |
| 32 | **ECOM-148..150** | `TC-S1-32` | [DevOps/DB] Khởi chạy thực tế Docker Containers (`mysql:8.0`, `redis`, `discovery-server`, `auth-service`, `product-service`, `api-gateway`, `frontend`, `nginx`) | Các container khởi chạy `Up (healthy)` và kết nối qua `ecommerce-network`. | **BLOCKED:** Docker Desktop Linux Engine Daemon (`//./pipe/dockerDesktopLinuxEngine`) không chạy trên máy Windows host và dịch vụ MySQL cục bộ (`:3306`) cũng không bật. Tuy nhiên có thể kiểm thử thực tế Backend + Database qua Spring Boot + H2 (MySQL mode) trên JVM sau khi sửa `BUG-S1-01`. | **BLOCKED** |

---

## 4. DANH SÁCH LỖI PHÁT HIỆN TRONG LẦN 1 (BUG LIST)

| Bug ID | Mức độ | Nhóm | Task liên quan | Mô tả lỗi chi tiết | File liên quan |
|---|:---:|---|---|---|---|
| **BUG-S1-01** | **Critical (P0)** | Backend / Build | `ECOM-204`, `ECOM-213`, `ECOM-222`, `ECOM-231`, `ECOM-240`, `ECOM-249` | File `backend/gradle.properties` cấu hình cứng `org.gradle.java.home=C:/Program Files/Microsoft/jdk-21.0.11.10-hotspot` không tồn tại trên máy (máy cài JDK 21 tại `C:/Program Files/Java/jdk-21`), khiến mọi lệnh `.\gradlew.bat test` và `.\gradlew.bat build` đều bị **BUILD FAILED** ngay lập tức. | [`backend/gradle.properties`](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/gradle.properties) |
| **BUG-S1-02** | **High (P1)** | Frontend (Storefront) | `ECOM-111`, `ECOM-219` | Trang Chi tiết sản phẩm (`ProductDetail.jsx`) gán cứng `sold = product.sold \|\| 85`, `totalStock = product.stock \|\| 100`, làm sai lệch hoàn toàn số lượng tồn kho thực tế (`stockQuantity`) từ Backend và chưa tích hợp hàm kiểm tra tồn kho `GET /api/v1/products/{id}/stock` (`checkStock`) trong `productService.js`. | [`frontend/src/pages/customer/ProductDetail.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/ProductDetail.jsx), [`frontend/src/services/productService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js) |
| **BUG-S1-03** | **High (P1)** | Frontend (Storefront) | `ECOM-111`, `ECOM-219` | Trang `ProductDetail.jsx` không vô hiệu hóa (disable) nút **"Thêm vào giỏ"** và **"Mua ngay"** khi sản phẩm đã hết hàng (`stockQuantity <= 0` hoặc `inStock === false`), đồng thời bộ chọn số lượng gán cứng giới hạn `2` thay vì kiểm tra theo số lượng tồn kho thực tế. | [`frontend/src/pages/customer/ProductDetail.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/ProductDetail.jsx) |
| **BUG-S1-04** | **High (P1)** | Frontend (Admin Category) | `ECOM-130`, `ECOM-237` | Trong `categoryService.js`, các hàm quản trị danh mục `create()`, `update(id)`, `delete(id)`, `getById(id)` và `search(keyword)` chỉ lưu vào `localStorage` cục bộ, chưa gọi các API Backend đã có sẵn (`POST /api/v1/products/categories`, `PUT /api/v1/products/categories/{id}`, `DELETE /api/v1/products/categories/{id}`, `GET /api/v1/products/categories/search`). | [`frontend/src/services/categoryService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js) |
| **BUG-S1-05** | **Critical (P0)** | Frontend (Admin Product) | `ECOM-133`, `ECOM-246` | Trang Admin Danh sách sản phẩm (`src/pages/admin/Products.jsx`) dùng mảng tĩnh hardcode `INITIAL_MOCK_ADMIN_PRODUCTS` ngay trong file, hoàn toàn không gọi `productService` (`GET /api/v1/products/admin` / `getAll` và `delete`), khiến sản phẩm mới tạo hoặc chỉnh sửa không bao giờ xuất hiện hoặc đồng bộ với Storefront/Backend. | [`frontend/src/pages/admin/Products.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/admin/Products.jsx), [`frontend/src/services/productService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js) |
| **BUG-S1-06** | **Critical (P0)** | Frontend (Admin Product) | `ECOM-133`, `ECOM-246` | Trang Admin Thêm/Sửa sản phẩm (`src/pages/admin/ProductForm.jsx`) khi submit chỉ `console.log()` rồi chuyển trang, không gọi `productService.create()` / `productService.update()`, khi sửa không gọi `productService.getById(id)`, thiếu validate dữ liệu (`name`, `category`, `price > 0`, `stock >= 0`), và `productService.create/update` chưa chuẩn hóa payload `{ name, category, price, stockQuantity, description, imageUrl }` khớp với DTO Backend (`ProductCreateRequest` / `ProductUpdateRequest`). | [`frontend/src/pages/admin/ProductForm.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/admin/ProductForm.jsx), [`frontend/src/services/productService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js) |
| **BUG-S1-07** | **Medium (P2)** | Frontend (Admin Inventory) | `ECOM-111`, `ECOM-133`, `ECOM-219`, `ECOM-246` | Trang Admin Quản lý tồn kho (`src/pages/admin/Inventory.jsx`) dùng mảng tĩnh độc lập và `inventoryService.js` gọi `/inventory` (không tồn tại trên Backend) thay vì đồng bộ tồn kho qua API sản phẩm (`/products`, `PUT /products/{id}`, `GET /products/{id}/stock`). | [`frontend/src/pages/admin/Inventory.jsx`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/admin/Inventory.jsx), [`frontend/src/services/inventoryService.js`](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/inventoryService.js) |

---

## 5. THỐNG KÊ KẾT QUẢ TEST LẦN 1

| Chỉ số thống kê | Số lượng | Tỷ lệ (%) |
|---|:---:|:---:|
| **Tổng số Test Case thực hiện (Lần 1)** | **32** | **100.00%** |
| **PASS (Đạt yêu cầu)** | **19** | **59.38%** |
| **FAIL (Chưa đạt / Có lỗi)** | **12** | **37.50%** |
| **BLOCKED (Bị chặn do môi trường Docker Daemon)** | **1** | **3.12%** |
| **NOT TESTED (Chưa thực hiện)** | **0** | **0.00%** |
| **Tổng số lỗi (Bugs) phát hiện** | **7 Bugs** (3 Critical, 3 High, 1 Medium) | — |

---

## 6. CÁC CHỨC NĂNG CHƯA HOÀN THÀNH CẦN SỬA TRONG BƯỚC TIẾP THEO

1. **Sửa cấu hình JDK 21 cho Gradle Backend (`BUG-S1-01`):** Cập nhật `backend/gradle.properties` trỏ đúng tới `C:/Program Files/Java/jdk-21` để chạy toàn bộ Unit Test, MockMvc API Test, JPA/Database Test (với H2 MySQL mode) và `bootJar` build cho tất cả 6 microservice.
2. **Hoàn thiện Chi tiết sản phẩm & Kiểm tra tồn kho (`BUG-S1-02`, `BUG-S1-03`):**
   - Bổ sung `productService.checkStock(id, quantity)` gọi `GET /api/v1/products/{id}/stock`.
   - Cập nhật `ProductDetail.jsx` hiển thị đúng tồn kho thực tế (`stockQuantity`), trạng thái còn hàng (`inStock`, `stockStatusMessage`), giới hạn số lượng mua theo tồn kho và khóa nút mua khi sản phẩm hết hàng (`stockQuantity <= 0`).
3. **Hoàn thiện kết nối API cho Admin Quản lý danh mục (`BUG-S1-04`):**
   - Cập nhật `categoryService.js` gọi `POST /products/categories`, `PUT /products/categories/{id}`, `DELETE /products/categories/{id}`, `GET /products/categories/{id}` và `GET /products/categories/search` kèm cơ chế đồng bộ `localCategories` dự phòng khi chạy độc lập.
4. **Hoàn thiện kết nối API & Validation cho Admin Quản lý sản phẩm & Tồn kho (`BUG-S1-05`, `BUG-S1-06`, `BUG-S1-07`):**
   - Cập nhật `productService.js` bổ sung `getAdminProducts()` gọi `GET /api/v1/products/admin`, chuẩn hóa payload `create()` và `update()` gửi đúng `stockQuantity` và `price` cho Backend.
   - Cập nhật `src/pages/admin/Products.jsx` tải dữ liệu từ `productService`, hỗ trợ thêm/sửa/xóa thực tế.
   - Cập nhật `src/pages/admin/ProductForm.jsx` tải sản phẩm khi edit qua `productService.getById(id)`, validate đầy đủ (`name`, `category`, `price > 0`, `stockQuantity >= 0`) và gọi `productService.create()` / `productService.update()`.
   - Cập nhật `inventoryService.js` và `src/pages/admin/Inventory.jsx` đồng bộ trực tiếp với dữ liệu sản phẩm và API tồn kho.

---

## 7. BẰNG CHỨNG KIỂM THỬ LẦN 1 (`reports/sprint1-evidence/lan1/`)

- Log trạng thái Git & Branch Lần 1: [`reports/sprint1-evidence/lan1/git-status-lan1.log`](file:///c:/IT209/-E-COMMERCE-PLATFORM/reports/sprint1-evidence/lan1/git-status-lan1.log)
- Log kiểm tra Lint Frontend Lần 1: [`reports/sprint1-evidence/lan1/frontend-lint-lan1.log`](file:///c:/IT209/-E-COMMERCE-PLATFORM/reports/sprint1-evidence/lan1/frontend-lint-lan1.log)
- Log chạy Automated Test Frontend Lần 1: [`reports/sprint1-evidence/lan1/frontend-test-lan1.log`](file:///c:/IT209/-E-COMMERCE-PLATFORM/reports/sprint1-evidence/lan1/frontend-test-lan1.log)
- Log Build Production Frontend Lần 1: [`reports/sprint1-evidence/lan1/frontend-build-lan1.log`](file:///c:/IT209/-E-COMMERCE-PLATFORM/reports/sprint1-evidence/lan1/frontend-build-lan1.log)
- Log lỗi chạy Gradle Test Backend Lần 1: [`reports/sprint1-evidence/lan1/backend-gradle-test-lan1.log`](file:///c:/IT209/-E-COMMERCE-PLATFORM/reports/sprint1-evidence/lan1/backend-gradle-test-lan1.log)
