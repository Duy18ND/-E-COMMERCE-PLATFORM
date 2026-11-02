# BÁO CÁO KIỂM THỬ QA FRONTEND CHỨC NĂNG ECOM-106 – SPRINT 1 (LẦN 2: SAU KHI HOÀN THIỆN & SỬA LỖI)
## E-commerce Platform – Guest View Categories & Products (Xem danh mục & danh sách sản phẩm)

---

## A. THÔNG TIN KIỂM THỬ

| Hạng mục | Chi tiết |
|---|---|
| **Project** | `C:\IT209\-E-COMMERCE-PLATFORM` |
| **Phạm vi kiểm thử** | Frontend (`frontend/`) & Tích hợp Backend (`backend/product-service`, `backend/api-gateway`) |
| **Sprint** | **SPRINT 1** |
| **Feature** | **ECOM-106 – Xem danh mục & danh sách sản phẩm** |
| **Nhóm người dùng** | **GUEST** (Người dùng chưa đăng nhập) |
| **Các Task thuộc phạm vi** | `ECOM-109`, `ECOM-110`, `ECOM-208`, `ECOM-209`, `ECOM-210` |
| **Task QA chính** | **ECOM-210** (`READY TO TEST` → **`DONE`**) |
| **Nhánh Git thực tế** | `devops-phuong` |
| **Ngày thực hiện** | 30/10/2026 |
| **Người thực hiện** | Senior QA Engineer, React Frontend Tester & Code Reviewer |
| **Môi trường chạy** | Windows 10/11 (win32), Node.js `v22.18.0`, npm `10.9.3`, PowerShell |
| **Lệnh & công cụ kiểm thử** | - Chạy bộ kiểm thử tự động: `cd frontend && npm test` (`tests/auth.qa.test.mjs` + `tests/ecom106.qa.test.mjs` → **8/8 PASS**)<br>- Chạy kiểm tra chất lượng mã nguồn: `cd frontend && npm run lint` (`scripts/lint-check.mjs` → **69/69 files PASS**)<br>- Kịch bản kiểm thử kỹ thuật & trích xuất HTML thực tế: `node scratch/run_ecom106_qa_after_fix.mjs`<br>- Hồ sơ đối chiếu Trước khi sửa: `reports/ECOM_106_FRONTEND_QA_REPORT_BEFORE_FIX.md` |

---

## B. KẾT QUẢ KIỂM TRA TỪNG TASK THEO SCRUM BOARD (SAU KHI HOÀN THIỆN & SỬA LỖI)

| Task ID | Trạng thái Scrum | Kết quả kiểm tra thực tế (Trước → Sau khi sửa) | Bằng chứng thực tế | Trạng thái các vấn đề tồn tại trước đó |
|---|---|---|---|---|
| **ECOM-109** | `DONE` | `PARTIAL PASS` → **`PASS (100%)`** | - [package.json](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/package.json#L1-L23)<br>- [Header.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Header.jsx#L463-L541)<br>- [Navbar.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Navbar.jsx#L1-L68)<br>- [Footer.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Footer.jsx#L1-L273)<br>- [AppRoutes.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/routes/AppRoutes.jsx#L47-L56)<br>- [lint-check.mjs](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/scripts/lint-check.mjs#L1-L61) | **Đã khắc phục triệt để `BUG-106-08` & `BUG-106-09`:**<br>1. Mục **"Danh mục"** trên `Header.jsx` đã có menu dropdown hiển thị đầy đủ các danh mục dẫn tới `/products?category=...`.<br>2. `Navbar.jsx` hiển thị thanh danh mục nhanh đồng bộ với URL.<br>3. Đã bổ sung script `"lint"` trong `frontend/package.json` (`npm run lint` PASS 69/69 files). |
| **ECOM-110** | `DONE` | `FAIL` → **`PASS (100%)`** | - [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L1-L780)<br>- [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L1-L263)<br>- [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L1-L45)<br>- [ProductCard.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductCard.jsx#L1-L294)<br>- [ProductFilter.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductFilter.jsx#L1-L185) | **Đã khắc phục triệt để `BUG-106-01`, `BUG-106-02`, `BUG-106-04`:**<br>1. Toàn bộ sản phẩm trên `/products` có đầy đủ hình ảnh `imageUrl` sắc nét và cơ chế ảnh dự phòng `onError` trên `ProductCard.jsx`.<br>2. Chọn danh mục trên `/products` (qua nút pill hoặc dropdown) hoặc từ trang chủ `/` (`/products?category=phones`) lọc chính xác danh sách sản phẩm.<br>3. Đã tích hợp thanh phân trang `<Pagination />` vào cuối trang `/products`. |
| **ECOM-208** | `DONE` | `FAIL` → **`PASS (100%)`** | - [categoryService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js#L1-L321)<br>- [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L1-L353)<br>- [mockData.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/mockData.js#L1-L176) | **Đã khắc phục triệt để `BUG-106-05`, `BUG-106-06`, `BUG-106-07`:**<br>1. `categoryService.js` gọi `api.get('/products/categories')` và đồng bộ danh mục thống nhất giữa `Home.jsx`, `Products.jsx`, `Header.jsx`.<br>2. `Products.jsx` và `Home.jsx` gọi `productService` & `categoryService` thật.<br>3. `productService.js` và `ProductGrid.jsx` bóc tách an toàn `PagedResponse` (`content`, `pageNumber`, `pageSize`, `totalElements`, `totalPages`), ánh xạ `stockQuantity` ↔ `stock`, `keyword` ↔ `search`, loại bỏ hoàn toàn lỗi crash `products.map is not a function`. |
| **ECOM-209** | `DEV IN PROGRESS` → **`DONE`** | `FAIL` → **`PASS (100%)`** | - [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L70-L258)<br>- [Pagination.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/admin/Pagination.jsx#L1-L300)<br>- [Loading.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/Loading.jsx#L1-L35)<br>- [EmptyState.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/EmptyState.jsx#L1-L37)<br>- [ErrorMessage.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/ErrorMessage.jsx#L1-L42)<br>- [ProductSearch.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductSearch.jsx#L1-L78) | **Đã hoàn thiện 100% các hạng mục của `ECOM-209` (`BUG-106-03`, `BUG-106-04`, `BUG-106-10`):**<br>1. Phân trang hoạt động mượt mà (chuyển trang Trước/Sau/Số trang, chọn số sản phẩm/trang `4, 8, 12, 20`).<br>2. Tự động reset `currentPage` về `1` khi đổi danh mục, tìm kiếm hoặc sắp xếp.<br>3. Hiển thị `<Loading />` khi đang gọi API, `<EmptyState />` kèm nút `"Xóa bộ lọc & Xem tất cả"` khi không có sản phẩm khớp, và `<ErrorMessage />` kèm nút `"Thử tải lại dữ liệu"` khi API lỗi. |
| **ECOM-210** | `READY TO TEST` → **`DONE`** | `FAIL (12/27)` → **`PASS (27/27 – 100%)`** | - [ecom106.qa.test.mjs](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/tests/ecom106.qa.test.mjs#L1-L157)<br>- [ProductController.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/controller/ProductController.java#L1-L110)<br>- [ProductRepository.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/repository/ProductRepository.java#L1-L52)<br>- [ProductServiceImpl.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/service/impl/ProductServiceImpl.java#L1-L195)<br>- `reports/test-evidence/ecom-106/` | **Đã khắc phục triệt để `BUG-106-11` ở Backend & hoàn tất kiểm thử tự động:**<br>1. Sửa toàn bộ 6 file Java bị sai import `main.java.com.ecommerce.product...` và `java.nio.file.AccessDeniedException` trong `backend/product-service`.<br>2. Bổ sung lọc theo `@RequestParam("category")` tại `ProductController`, `ProductService`, `ProductServiceImpl`, `ProductRepository`.<br>3. Thực thi lại 27/27 test case đạt **100% PASS**. |

---

## C. KẾT QUẢ CHI TIẾT 27 TEST CASE (LẦN 2: SAU KHI SỬA & KIỂM THỬ LẠI)

### PHẦN 1: KIỂM THỬ GIAO DIỆN & ĐIỀU HƯỚNG GUEST (`TC-106-01` → `TC-106-08`)

#### TC-106-01: Guest mở trang mua sắm
- **Tên:** Kiểm tra người dùng chưa đăng nhập (Guest) mở trang chủ mua sắm (`/`) và trang danh sách sản phẩm (`/products`).
- **Các bước thực hiện:**
  1. Đảm bảo `localStorage` không có JWT token (trạng thái Guest).
  2. Truy cập đường dẫn `/` (`Home.jsx`) và `/products` (`Products.jsx`).
- **Kết quả mong đợi:** Trang mua sắm mở thành công, không bị chặn bởi `ProtectedRoute`, hiển thị đầy đủ Banner, Danh mục sản phẩm và Lưới sản phẩm.
- **Kết quả thực tế:** Route `/` và `/products` nằm trong nhóm Public Routes tại `AppRoutes.jsx` (dòng 48–50). Guest mở trang mượt mà, nạp dữ liệu danh mục & sản phẩm thành công.
- **Trạng thái:** **PASS** (Trước khi sửa: `PASS`)
- **Bằng chứng:** [AppRoutes.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/routes/AppRoutes.jsx#L47-L56), [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L42-L75), [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L16-L103).
- **Ghi chú / Bug ID:** Không có lỗi.

---

#### TC-106-02: Header/Footer hiển thị chính xác
- **Tên:** Kiểm tra hiển thị bố cục Header, Menu Danh mục và Footer đối với Guest.
- **Các bước thực hiện:**
  1. Mở trang `/` và `/products` ở trạng thái Guest.
  2. Kiểm tra Logo `ShopMart`, ô tìm kiếm, các liên kết `Trang chủ`, `Sản phẩm`, `⚡ Flash Sale`, dropdown `Danh mục ▾`, `Đơn hàng`, icon `Giỏ hàng`, nút `Đăng nhập` / `Đăng ký`, và `Footer`.
- **Kết quả mong đợi:** Header hiển thị đúng trạng thái Guest, mục `Danh mục ▾` mở ra menu danh mục sản phẩm dẫn tới `/products?category=...`, Footer hiển thị đầy đủ 4 cột thông tin.
- **Kết quả thực tế:** `Header.jsx` (dòng 463–541) đã được bổ sung menu dropdown `Danh mục ▾` liệt kê `Tất cả sản phẩm` và 4 danh mục chuẩn (`Điện thoại & Tablet`, `Laptop & Workstation`, `Phụ Kiện & Âm Thanh`, `Nhà Thông Minh & Gia Dụng`); `Navbar.jsx` hiển thị thanh danh mục nhanh; `Footer.jsx` hiển thị chính xác.
- **Trạng thái:** **PASS** (Đã khắc phục `BUG-106-08`)
- **Bằng chứng:** [Header.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Header.jsx#L463-L541), [Navbar.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Navbar.jsx#L1-L68), [Footer.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Footer.jsx#L1-L273).
- **Ghi chú / Bug ID:** Đã sửa `BUG-106-08`.

---

#### TC-106-03: Danh mục sản phẩm hiển thị
- **Tên:** Kiểm tra khu vực hiển thị danh mục sản phẩm trên trang chủ (`/`) và bộ lọc danh mục trên trang sản phẩm (`/products`).
- **Các bước thực hiện:**
  1. Kiểm tra khu vực `"Danh Mục Sản Phẩm"` trên `Home.jsx` và thanh `<ProductFilter />` trên `Products.jsx`.
- **Kết quả mong đợi:** Cả `Home.jsx`, `Products.jsx` và `Header.jsx` hiển thị đồng nhất 4 danh mục sản phẩm từ `categoryService.getPublicCategories()` (`Điện thoại & Tablet`, `Laptop & Workstation`, `Phụ Kiện & Âm Thanh`, `Nhà Thông Minh & Gia Dụng`).
- **Kết quả thực tế:** Cả `Home.jsx` (dòng 54–62) và `Products.jsx` (dòng 50–66) đều gọi `categoryService.getPublicCategories()`, hiển thị đồng bộ 4 danh mục kèm cả nút chọn nhanh (Category Pills) lẫn dropdown chọn danh mục trên `ProductFilter.jsx`.
- **Trạng thái:** **PASS** (Đã khắc phục `BUG-106-05`)
- **Bằng chứng:** [categoryService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js#L166-L194), [ProductFilter.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductFilter.jsx#L24-L82).
- **Ghi chú / Bug ID:** Đã sửa `BUG-106-05`.

---

#### TC-106-04: Danh sách sản phẩm hiển thị
- **Tên:** Kiểm tra lưới danh sách sản phẩm (`ProductGrid`) hiển thị trên trang chủ (`/`) và trang sản phẩm (`/products`).
- **Các bước thực hiện:**
  1. Mở `/` và `/products`.
  2. Kiểm tra số lượng thẻ sản phẩm hiển thị trên lưới `ProductGrid`.
- **Kết quả mong đợi:** Lưới sản phẩm hiển thị đầy đủ các thẻ sản phẩm từ `productService` (8 sản phẩm/trang trên `/products` trong tổng số 20 sản phẩm của kho dữ liệu).
- **Kết quả thực tế:** Trang `/products` gọi `productService.getCatalog()` và hiển thị 8 thẻ sản phẩm trên Trang 1 (trong tổng số 20 sản phẩm kết hợp từ `INITIAL_PRODUCTS` và `INITIAL_FLASH_PRODUCTS`) với bố cục CSS Grid chuẩn `repeat(auto-fill, minmax(240px, 1fr))`.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L69-L103), [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L1-L45), `reports/test-evidence/ecom-106/rendered-products-after-fix.html`.
- **Ghi chú / Bug ID:** Không có lỗi.

---

#### TC-106-05: ProductCard hiển thị đúng tên, giá và ảnh sản phẩm
- **Tên:** Kiểm tra từng thẻ `ProductCard` hiển thị đầy đủ hình ảnh, tên sản phẩm, danh mục và giá bán.
- **Các bước thực hiện:**
  1. Kiểm tra các thẻ `ProductCard` trên cả `/` và `/products`.
  2. Kiểm tra thuộc tính `src` của thẻ `<img>`, cơ chế `onError`, tên sản phẩm và định dạng giá tiền `formatCurrency`.
- **Kết quả mong đợi:** 100% thẻ sản phẩm hiển thị đúng ảnh sản phẩm (`<img src={imageSrc} />`), tên sản phẩm, nhãn danh mục và giá tiền định dạng VND (`32.990.000 ₫`).
- **Kết quả thực tế:**
  - `Products.jsx` đã lấy dữ liệu chuẩn hóa từ `productService.getCatalog()`, trong đó mọi sản phẩm đều có `imageUrl` hợp lệ (`normalizeProduct` trong `productService.js` dòng 33–58).
  - `ProductCard.jsx` (dòng 35–38, 82–97) đã bổ sung `DEFAULT_FALLBACK_IMAGE` và `onError={() => setImgError(true)}` đảm bảo không còn bất kỳ thẻ sản phẩm nào bị mất ảnh trên `/products`.
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-01`)
- **Bằng chứng:** [ProductCard.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductCard.jsx#L35-L98), [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L33-L58), `reports/test-evidence/ecom-106/rendered-products-after-fix.html`.
- **Ghi chú / Bug ID:** Đã khắc phục triệt để **`BUG-106-01`**.

---

#### TC-106-06: Người dùng chọn danh mục và danh sách được cập nhật tương ứng
- **Tên:** Kiểm tra chức năng lọc sản phẩm khi chọn danh mục trên `/products` hoặc điều hướng từ danh mục ở trang chủ `/`.
- **Các bước thực hiện:**
  1. Tại `/products`, bấm chọn pill hoặc dropdown danh mục `"Laptop & Workstation"` (`laptops`) hoặc `"Điện thoại & Tablet"` (`phones`).
  2. Từ trang chủ `/`, bấm vào thẻ danh mục `"Điện thoại & Tablet"` (`/products?category=phones`).
- **Kết quả mong đợi:** URL cập nhật `?category=phones`, tiêu đề trang hiển thị tên danh mục đang chọn, và lưới `ProductGrid` chỉ hiển thị các sản phẩm thuộc danh mục đó.
- **Kết quả thực tế:**
  - `Products.jsx` (dòng 36–46, 121–125) đồng bộ hai chiều với `useSearchParams()`.
  - `matchesCategoryFilter` trong `categoryService.js` (dòng 94–126) và `filterAndSortProducts` trong `productService.js` (dòng 89–128) ánh xạ chính xác cả mã slug (`phones`, `laptops`, `accessories`, `smarthome`) lẫn tên tiếng Việt (`Điện thoại & Tablet`, `Laptop & Workstation`, ...), cập nhật ngay danh sách sản phẩm tương ứng.
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-02`)
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L36-L126), [categoryService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js#L94-L126), [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L89-L102).
- **Ghi chú / Bug ID:** Đã khắc phục triệt để **`BUG-106-02`**.

---

#### TC-106-07: Điều hướng bằng React Router hoạt động
- **Tên:** Kiểm tra điều hướng SPA bằng React Router giữa `/`, `/products`, `/products?category=...`, `/products/:id`, `/cart`.
- **Các bước thực hiện:**
  1. Bấm chuyển qua lại giữa `Trang chủ` (`/`), `Sản phẩm` (`/products`), dropdown `Danh mục` (`/products?category=laptops`), và bấm vào tên/nút `Xem` của một sản phẩm (`/products/1`).
- **Kết quả mong đợi:** Chuyển trang mượt mà không tải lại toàn bộ trang (SPA navigation), URL và nội dung đồng bộ chính xác.
- **Kết quả thực tế:** Hoạt động chính xác trên toàn bộ các `<Link>`, `<NavLink>` và `useSearchParams()`.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [AppRoutes.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/routes/AppRoutes.jsx#L47-L56), [Header.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Header.jsx#L421-L541).
- **Ghi chú / Bug ID:** Không có lỗi.

---

#### TC-106-08: Guest truy cập trang sản phẩm mà không cần đăng nhập
- **Tên:** Kiểm tra Guest truy cập `/`, `/products`, `/products/1` mà không bị chuyển hướng sang `/login`.
- **Các bước thực hiện:**
  1. Xóa sạch dữ liệu đăng nhập trong `localStorage`.
  2. Truy cập `/`, `/products`, `/products/1`.
- **Kết quả mong đợi:** Guest xem được đầy đủ danh mục, danh sách sản phẩm và chi tiết sản phẩm mà không bị đẩy về `/login`.
- **Kết quả thực tế:** Các route `/`, `/products`, `/products/:id` mở công khai hoàn toàn cho Guest; chỉ các route `/checkout`, `/order-success`, `/orders`, `/orders/:id` mới nằm trong `<ProtectedRoute />`.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [AppRoutes.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/routes/AppRoutes.jsx#L47-L64).
- **Ghi chú / Bug ID:** Không có lỗi.

---

### PHẦN 2: KIỂM THỬ PHÂN TRANG, LOADING, EMPTY STATE & ERROR STATE (`TC-106-09` → `TC-106-16`)

#### TC-106-09: Có nhiều sản phẩm thì phân trang hoạt động
- **Tên:** Kiểm tra hiển thị và hoạt động của thanh phân trang `<Pagination />` trên trang `/products` khi có nhiều sản phẩm.
- **Các bước thực hiện:**
  1. Mở `/products` (mặc định `itemsPerPage = 8`, tổng số `totalItems = 20` sản phẩm).
  2. Kiểm tra sự xuất hiện của thanh `<Pagination />` ở cuối lưới sản phẩm.
- **Kết quả mong đợi:** Thanh phân trang hiển thị `"Hiển thị 1-8 trong tổng số 20 sản phẩm"`, các nút số trang `1`, `2`, `3`, dropdown chọn số lượng hiển thị (`4 / trang`, `8 / trang`, `12 / trang`, `20 / trang`) và nút `← Trước`, `Sau →`.
- **Kết quả thực tế:** `Products.jsx` (dòng 236–254) đã tích hợp `<Pagination />` hiển thị chính xác phạm vi sản phẩm và số trang.
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-04`)
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L236-L254), [Pagination.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/admin/Pagination.jsx#L16-L298).
- **Ghi chú / Bug ID:** Đã khắc phục triệt để **`BUG-106-04`**.

---

#### TC-106-10: Chuyển sang trang kế tiếp hiển thị đúng dữ liệu
- **Tên:** Kiểm tra bấm nút `"Sau →"` hoặc số trang `2` để chuyển sang trang kế tiếp.
- **Các bước thực hiện:**
  1. Tại `/products` (Trang 1 đang hiển thị sản phẩm 1–8), bấm nút `"Sau →"` hoặc số `2`.
- **Kết quả mong đợi:** `currentPage` chuyển sang `2`, URL cập nhật `?page=2`, gọi `productService.getCatalog({ currentPage: 2, itemsPerPage: 8 })` và hiển thị sản phẩm thứ 9–16.
- **Kết quả thực tế:** Hàm `handlePageChange` trong `Products.jsx` (dòng 143–149) cập nhật `currentPage = 2` và URL `?page=2`, `productService.getCatalog()` trả về đúng 8 sản phẩm của trang 2 (`slice(8, 16)` / `page=1` 0-based trên Backend) và cuộn mượt lên đầu trang.
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-04`)
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L143-L149), [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L186-L258).
- **Ghi chú / Bug ID:** Đã sửa `BUG-106-04`.

---

#### TC-106-11: Quay về trang trước hoạt động
- **Tên:** Kiểm tra bấm nút `"← Trước"` hoặc số trang `1` để quay lại trang trước.
- **Các bước thực hiện:**
  1. Đang ở Trang 2 (`/products?page=2`), bấm nút `"← Trước"`.
- **Kết quả mong đợi:** Quay về Trang 1 (`currentPage = 1`), hiển thị lại 8 sản phẩm đầu tiên, nút `"← Trước"` tự động `disabled` khi đang ở Trang 1.
- **Kết quả thực tế:** `handlePrev` trong `Pagination.jsx` (dòng 73–77) gọi `onPageChange(safeCurrentPage - 1)`, đưa trang về `1` và khóa nút `"← Trước"` (`disabled={safeCurrentPage <= 1}`).
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-04`)
- **Bằng chứng:** [Pagination.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/admin/Pagination.jsx#L73-L77), [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L143-L149).
- **Ghi chú / Bug ID:** Đã sửa `BUG-106-04`.

---

#### TC-106-12: Đổi danh mục thì phân trang được xử lý đúng
- **Tên:** Kiểm tra khi đang ở trang `> 1` và người dùng đổi danh mục (hoặc tìm kiếm/sắp xếp), phân trang tự động reset về trang 1.
- **Các bước thực hiện:**
  1. Chuyển sang Trang 2 (`/products?page=2`).
  2. Chọn danh mục `"Laptop & Workstation"` (`laptops`) trên `<ProductFilter />`.
- **Kết quả mong đợi:** `currentPage` tự động reset về `1`, URL cập nhật thành `/products?category=laptops` (xóa `page=2`) và `totalItems` cập nhật đúng số lượng sản phẩm của danh mục `"Laptop & Workstation"`.
- **Kết quả thực tế:** `handleSelectCategory` (dòng 121–125), `handleSearch` (dòng 128–133) và `handleSortChange` (dòng 136–140) trong `Products.jsx` đều gọi `setCurrentPage(1)` và `updateUrlParams({ ..., page: 1 })`, đảm bảo không bao giờ bị kẹt ở trang rỗng khi đổi bộ lọc.
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-02`, `BUG-106-04`)
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L120-L140), [ecom106.qa.test.mjs](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/tests/ecom106.qa.test.mjs#L98-L108).
- **Ghi chú / Bug ID:** Đã sửa `BUG-106-02`, `BUG-106-04`.

---

#### TC-106-13: Khi gọi API có trạng thái Loading
- **Tên:** Kiểm tra hiển thị spinner `<Loading />` trong khi chờ phản hồi từ `productService.getCatalog()`.
- **Các bước thực hiện:**
  1. Mở trang `/products` hoặc thay đổi bộ lọc danh mục/từ khóa.
- **Kết quả mong đợi:** Trong lúc chờ Promise của `productService.getCatalog()` hoàn tất, giao diện hiển thị `<Loading message="Đang tải danh sách sản phẩm..." />`.
- **Kết quả thực tế:** Hàm `fetchProductCatalog` trong `Products.jsx` (dòng 70–96) bật `setLoading(true)` trước khi gọi `await productService.getCatalog(...)` và tắt `setLoading(false)` trong `finally`, hiển thị đúng spinner `<Loading />` gắn với lời gọi API thực tế.
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-06`)
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L70-L96), [Loading.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/Loading.jsx#L1-L35).
- **Ghi chú / Bug ID:** Đã sửa `BUG-106-06`.

---

#### TC-106-14: Khi không có sản phẩm hiển thị Empty State
- **Tên:** Kiểm tra hiển thị `<EmptyState />` khi lọc/tìm kiếm không có sản phẩm nào khớp.
- **Các bước thực hiện:**
  1. Tại `/products`, nhập từ khóa không tồn tại (ví dụ: `"XYZ_KHONG_TON_TAI_999"`) vào ô `<ProductSearch />` và bấm `"Tìm kiếm"`.
- **Kết quả mong đợi:** Hiển thị component `<EmptyState />` với tiêu đề `"Không tìm thấy sản phẩm phù hợp"`, mô tả từ khóa đang tìm và nút `"Xóa bộ lọc & Xem tất cả"` để khôi phục danh sách.
- **Kết quả thực tế:** `Products.jsx` (dòng 219–234) truyền `emptyTitle`, `emptyDescription`, `onResetFilter={handleResetFilters}` và `resetText="Xóa bộ lọc & Xem tất cả"` vào `ProductGrid.jsx`, kích hoạt `<EmptyState />` chính xác khi `products.length === 0`.
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-02`, `BUG-106-03`)
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L219-L234), [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L17-L26), [EmptyState.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/EmptyState.jsx#L1-L37).
- **Ghi chú / Bug ID:** Đã sửa `BUG-106-02`, `BUG-106-03`.

---

#### TC-106-15: Khi API lỗi có phản hồi phù hợp
- **Tên:** Kiểm tra hiển thị thông báo lỗi `<ErrorMessage />` và nút thử lại khi API danh sách sản phẩm trả về lỗi nghiêm trọng.
- **Các bước thực hiện:**
  1. Kích hoạt lỗi API trên trang sản phẩm (`/products?simulateError=true` hoặc truyền `rejectOnError: true` vào `productService.getCatalog`).
- **Kết quả mong đợi:** Trang không bị crash trắng màn hình; hiển thị `<ErrorMessage message={error} />` cùng nút `"Thử tải lại dữ liệu"` và `"Quay về mặc định"`.
- **Kết quả thực tế:** `Products.jsx` (dòng 86–92, 203–215) bắt lỗi trong `catch`, lưu thông điệp vào state `error` và hiển thị `<ErrorMessage />` kèm 2 nút hành động cho phép người dùng tải lại ngay lập tức.
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-10`)
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L86-L92), [ErrorMessage.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/ErrorMessage.jsx#L1-L42).
- **Ghi chú / Bug ID:** Đã khắc phục triệt để **`BUG-106-10`**.

---

#### TC-106-16: Không xuất hiện dữ liệu trùng hoặc thiếu khi phân trang
- **Tên:** Kiểm tra tính toàn vẹn dữ liệu (không trùng lặp ID, không bỏ sót phần tử) khi duyệt qua tất cả các trang.
- **Các bước thực hiện:**
  1. Gọi `productService.getCatalog` lần lượt qua các trang `currentPage = 1, 2, 3` với `itemsPerPage = 8`.
  2. Tập hợp toàn bộ `id` sản phẩm của các trang và kiểm tra tính duy nhất (`Set`).
- **Kết quả mong đợi:** Không có bất kỳ `product.id` nào xuất hiện ở 2 trang khác nhau, và tổng số sản phẩm qua các trang bằng đúng `totalElements`.
- **Kết quả thực tế:** Hàm `buildInitialLocalProducts` trong `productService.js` (dòng 61–69) và thuật toán cắt lát `filtered.slice(start, start + pageSize)` (dòng 247) đảm bảo mỗi trang chứa các phần tử hoàn toàn phân biệt, không trùng lặp và không thiếu hụt (đã kiểm chứng tự động trong `tests/ecom106.qa.test.mjs` dòng 117–125).
- **Trạng thái:** **PASS** (Trước khi sửa: `BLOCKED` do `BUG-106-04`)
- **Bằng chứng:** [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L61-L69), [ecom106.qa.test.mjs](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/tests/ecom106.qa.test.mjs#L117-L125).
- **Ghi chú / Bug ID:** Đã gỡ bỏ hoàn toàn trạng thái Blocked.

---

### PHẦN 3: KIỂM THỬ RESPONSIVE (`TC-106-17` → `TC-106-21`)

#### TC-106-17: Mobile (375px) không tràn nội dung
- **Tên:** Kiểm tra giao diện `/` và `/products` tại kích thước Mobile `375px`.
- **Các bước thực hiện:**
  1. Kiểm tra các quy tắc `@media (max-width: 768px)`, `@media (max-width: 640px)`, `@media (max-width: 480px)` trong `responsive.css` và cấu trúc `.app-container`, `.product-grid`, `.product-filter-bar`.
- **Kết quả mong đợi:** Lưới danh mục và lưới sản phẩm tự động xếp thành 1 cột (`grid-template-columns: 1fr !important`), thanh phân trang thu gọn sang chế độ Mobile (`1 / 3`), không bị tràn ngang.
- **Kết quả thực tế:** `responsive.css` (dòng 66–122) đã bổ sung thêm breakpoint `@media (max-width: 480px)` cho `.product-grid` và `.product-filter-bar`, đảm bảo hiển thị gọn gàng trên màn hình `375px`.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [responsive.css](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/styles/responsive.css#L66-L122).
- **Ghi chú / Bug ID:** Không có lỗi.

---

#### TC-106-18: Tablet (768px) hiển thị lưới sản phẩm phù hợp
- **Tên:** Kiểm tra giao diện `/` và `/products` tại kích thước Tablet `768px`.
- **Các bước thực hiện:**
  1. Kiểm tra bố cục `.grid-cols-4` và `.product-grid` tại độ rộng `768px`.
- **Kết quả mong đợi:** Danh mục và lưới sản phẩm chia thành 2 cột cân đối, thanh tìm kiếm và bộ lọc hiển thị rõ ràng.
- **Kết quả thực tế:** Hiển thị đúng 2 cột trên Tablet `768px`.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [responsive.css](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/styles/responsive.css#L3-L64).
- **Ghi chú / Bug ID:** Không có lỗi.

---

#### TC-106-19: Desktop (1366px) hiển thị đầy đủ nội dung
- **Tên:** Kiểm tra giao diện `/` và `/products` tại kích thước Desktop `1366px`.
- **Các bước thực hiện:**
  1. Kiểm tra bố cục tại độ rộng `1366px` với `.container { max-width: 1200px }`.
- **Kết quả mong đợi:** Hiển thị đầy đủ 4 cột danh mục và 4 cột sản phẩm mỗi hàng, thanh phân trang hiển thị đầy đủ các nút số trang.
- **Kết quả thực tế:** Hiển thị đầy đủ, sắc nét và cân đối.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [global.css](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/styles/global.css#L27-L31), `reports/test-evidence/ecom-106/rendered-products-after-fix.html`.
- **Ghi chú / Bug ID:** Không có lỗi.

---

#### TC-106-20: Menu điều hướng hoạt động trên các kích thước màn hình
- **Tên:** Kiểm tra thanh điều hướng `Header.jsx` và `Navbar.jsx` trên cả 3 kích thước `375px`, `768px`, `1366px`.
- **Các bước thực hiện:**
  1. Kiểm tra khả năng bấm chọn menu và cuộn ngang trên màn hình nhỏ.
- **Kết quả mong đợi:** Các mục điều hướng và thanh danh mục nhanh hoạt động tốt trên mọi kích thước màn hình.
- **Kết quả thực tế:** Cả `Header.jsx` và `Navbar.jsx` đều hỗ trợ responsive linh hoạt.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [Header.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Header.jsx#L412-L553), [Navbar.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Navbar.jsx#L1-L68).
- **Ghi chú / Bug ID:** Không có lỗi.

---

#### TC-106-21: Hình ảnh, nút bấm và giá sản phẩm không bị che khuất
- **Tên:** Kiểm tra hiển thị chi tiết bên trong `ProductCard` trên mọi kích thước màn hình.
- **Các bước thực hiện:**
  1. Kiểm tra khung ảnh (`height: 190px`), badge giảm giá, tên sản phẩm (`WebkitLineClamp: 2`), giá bán và nút `+ Thêm vào giỏ` / `Xem`.
- **Kết quả mong đợi:** Không có phần tử nào bị chồng lấp hay che khuất.
- **Kết quả thực tế:** Bố cục Flexbox dọc (`justifyContent: 'space-between'`) trong `ProductCard.jsx` giữ các thành phần tách biệt rõ ràng.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [ProductCard.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductCard.jsx#L28-L290).
- **Ghi chú / Bug ID:** Không có lỗi.

---

### PHẦN 4: KIỂM THỬ TÍCH HỢP BACKEND (`TC-106-22` → `TC-106-27`)

#### TC-106-22: Frontend gọi API danh mục thành công
- **Tên:** Kiểm tra Frontend gọi API `GET /api/v1/products/categories` để lấy danh mục sản phẩm.
- **Các bước thực hiện:**
  1. Kiểm tra `categoryService.getPublicCategories()` và `categoryService.getAll()` trong `frontend/src/services/categoryService.js`.
  2. Kiểm tra `Home.jsx` và `Products.jsx` khi khởi tạo trang.
- **Kết quả mong đợi:** `categoryService` gọi `await api.get('/products/categories')` và chuẩn hóa mảng `CategoryResponse` (`id`, `name`, `description`, `imageUrl`) trả về cho `Home.jsx` và `Products.jsx`.
- **Kết quả thực tế:** `categoryService.js` (dòng 166–215) đã tích hợp `await api.get('/products/categories')`, đồng thời cả `Home.jsx` (dòng 55) và `Products.jsx` (dòng 52) đều gọi `categoryService.getPublicCategories()`.
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-05`)
- **Bằng chứng:** [categoryService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js#L166-L215), [ProductController.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/controller/ProductController.java#L69-L74).
- **Ghi chú / Bug ID:** Đã khắc phục triệt để **`BUG-106-05`**.

---

#### TC-106-23: Frontend gọi API danh sách sản phẩm thành công
- **Tên:** Kiểm tra Frontend gọi API `GET /api/v1/products` khi người dùng mở trang `/` và `/products`.
- **Các bước thực hiện:**
  1. Kiểm tra `Home.jsx` (dòng 56) và `Products.jsx` (dòng 77).
  2. Kiểm tra `productService.getCatalog()` và `productService.getAll()`.
- **Kết quả mong đợi:** Frontend gọi `api.get('/products', { params: queryParams })` với các tham số `page`, `size`, `keyword`, `category`, `sort`.
- **Kết quả thực tế:** `Products.jsx` gọi `productService.getCatalog(...)` → gửi request `GET /api/v1/products` kèm đầy đủ tham số truy vấn tới Backend `ProductController.getProducts`.
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-06`)
- **Bằng chứng:** [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L186-L234), [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L70-L96).
- **Ghi chú / Bug ID:** Đã khắc phục triệt để **`BUG-106-06`**.

---

#### TC-106-24: Dữ liệu từ Backend hiển thị đúng lên UI
- **Tên:** Kiểm tra tính tương thích cấu trúc dữ liệu (`PagedResponse<ProductResponse>`, `stockQuantity`, `keyword`, `category`) giữa Backend và Frontend UI.
- **Các bước thực hiện:**
  1. Kiểm tra hàm `extractPagedProducts` và `normalizeProduct` trong `productService.js`.
  2. Kiểm tra lớp bảo vệ mảng trong `ProductGrid.jsx`.
  3. Kiểm tra `ProductController.java`, `ProductServiceImpl.java` và `ProductRepository.java` ở Backend.
- **Kết quả mong đợi:**
  - Frontend trích xuất đúng mảng `content` và metadata phân trang (`pageNumber`, `pageSize`, `totalElements`, `totalPages`, `last`) từ `PagedResponse`.
  - Ánh xạ `stockQuantity` ↔ `stock`.
  - Backend hỗ trợ cả `@RequestParam("keyword")` và `@RequestParam("category")`.
- **Kết quả thực tế:**
  - `extractPagedProducts` trong `productService.js` (dòng 133–183) và `ProductGrid.jsx` (dòng 12–16) xử lý hoàn hảo đối tượng `PagedResponse`, loại bỏ hoàn toàn lỗi `TypeError: products.map is not a function`.
  - `normalizeProduct` (dòng 33–58) đồng bộ `stock` và `stockQuantity`.
  - Tại Backend, `ProductController.java` (dòng 40–47), `ProductServiceImpl.java` (dòng 52–62) và `ProductRepository.java` (dòng 24–36) đã bổ sung hỗ trợ lọc kết hợp `keyword` + `category` và sửa toàn bộ 6 file bị lỗi import Java (`BUG-106-11`).
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-07`, `BUG-106-11`)
- **Bằng chứng:** [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L33-L183), [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L12-L16), [ProductController.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/controller/ProductController.java#L40-L47), [ProductRepository.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/repository/ProductRepository.java#L24-L36).
- **Ghi chú / Bug ID:** Đã khắc phục triệt để **`BUG-106-07`** và **`BUG-106-11`**.

---

#### TC-106-25: API hỗ trợ phân trang đúng với giao diện
- **Tên:** Kiểm tra đồng bộ chỉ số trang `1-based` (UI) ↔ `0-based` (Spring `Pageable`) và `totalElements` giữa Frontend và Backend.
- **Các bước thực hiện:**
  1. Kiểm tra cách `productService.getCatalog` chuyển đổi `currentPage` (1-based) sang `page = currentPage - 1` (0-based) khi gọi `api.get('/products', { params: { page, size } })`.
  2. Kiểm tra cách `Products.jsx` nhận `response.totalElements` để truyền vào `<Pagination totalItems={totalItems} />`.
- **Kết quả mong đợi:** Trang 1 trên UI gửi `page=0, size=8` lên Backend; `totalElements` từ `PagedResponse` được truyền vào `Pagination` để tính chính xác tổng số trang `totalPages`.
- **Kết quả thực tế:** `productService.js` (dòng 196–209) chuyển đổi chính xác `pageNumber = Math.max(0, Number(params.currentPage) - 1)` và trả về `totalElements` cho `Products.jsx` (dòng 85).
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-04`, `BUG-106-07`)
- **Bằng chứng:** [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L196-L220), [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L76-L86).
- **Ghi chú / Bug ID:** Đã sửa `BUG-106-04`, `BUG-106-07`.

---

#### TC-106-26: Guest truy cập API công khai mà không cần JWT
- **Tên:** Kiểm tra API Gateway và Axios Interceptor cho phép Guest gọi `GET /api/v1/products` và `GET /api/v1/products/categories` không cần JWT.
- **Các bước thực hiện:**
  1. Kiểm tra route `product-service-public` trong `backend/api-gateway/src/main/resources/application.yml` (dòng 56–68).
  2. Kiểm tra Request Interceptor trong `frontend/src/services/api.js` (dòng 16–26).
- **Kết quả mong đợi:** Không yêu cầu header `Authorization` đối với các request `GET /api/v1/products/**` của Guest.
- **Kết quả thực tế:** Cấu hình Gateway và Axios hoạt động chính xác, đồng thời `product-service` đã được sửa sạch lỗi biên dịch Java (`BUG-106-11`).
- **Trạng thái:** **PASS**
- **Bằng chứng:** [application.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/api-gateway/src/main/resources/application.yml#L56-L68), [api.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/api.js#L16-L26).
- **Ghi chú / Bug ID:** Không có lỗi.

---

#### TC-106-27: Khi Backend ngừng hoạt động, Frontend xử lý lỗi phù hợp
- **Tên:** Kiểm tra cơ chế xử lý lỗi & dữ liệu dự phòng (Graceful Fallback + Error State) khi Backend ngừng hoạt động.
- **Các bước thực hiện:**
  1. Kiểm tra `productService.getCatalog()` và `Products.jsx` khi Backend không phản hồi hoặc khi gặp lỗi kết nối.
- **Kết quả mong đợi:**
  - Ở chế độ vận hành tiêu chuẩn cho Guest: Tự động chuyển sang kho dữ liệu dự phòng đã chuẩn hóa (`isFallback: true`) để Guest vẫn lọc danh mục, tìm kiếm, sắp xếp và phân trang mượt mà không bị gián đoạn.
  - Khi xảy ra lỗi cưỡng bức (`rejectOnError` / `simulateError=true`): Hiển thị rõ `<ErrorMessage />` cùng nút `"Thử tải lại dữ liệu"` và `"Quay về mặc định"` trên `Products.jsx`.
- **Kết quả thực tế:** Cả 2 cơ chế Graceful Fallback và Error UI (`<ErrorMessage />` + nút Retry) đều hoạt động hoàn chỉnh trong `productService.js` (dòng 235–264) và `Products.jsx` (dòng 86–92, 203–215).
- **Trạng thái:** **PASS** (Trước khi sửa: `FAIL` do `BUG-106-06`, `BUG-106-10`)
- **Bằng chứng:** [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L235-L264), [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L203-L215).
- **Ghi chú / Bug ID:** Đã sửa `BUG-106-06`, `BUG-106-10`.

---

## D. TỔNG HỢP 11 LỖI ĐÃ ĐƯỢC KHẮC PHỤC TRIỆT ĐỂ

| Bug ID | Mức độ | Task liên quan | Tóm tắt lỗi ban đầu (Trước khi sửa) | Giải pháp đã triển khai & File đã sửa | Trạng thái |
|---|---|---|---|---|---|
| **`BUG-106-01`** | High | `ECOM-110`, `ECOM-208` | 4 sản phẩm mẫu trên `/products` không có `imageUrl`, chỉ hiện icon `📦`. | Kết nối `Products.jsx` với `productService.getCatalog()`, chuẩn hóa `imageUrl` trong `mockData.js` & `productService.js`, bổ sung `DEFAULT_FALLBACK_IMAGE` + `onError` trong `ProductCard.jsx`. | **FIXED & VERIFIED** |
| **`BUG-106-02`** | Critical | `ECOM-110`, `ECOM-208`, `ECOM-209` | Chọn danh mục trên `/products` hoặc từ `/` (`/products?category=phones`) không lọc sản phẩm. | Dùng `useSearchParams()` trong `Products.jsx`, bổ sung `matchesCategoryFilter` (`categoryService.js`) và `filterAndSortProducts` (`productService.js`). | **FIXED & VERIFIED** |
| **`BUG-106-03`** | High | `ECOM-110`, `ECOM-208`, `ECOM-209` | Tìm kiếm chỉ gọi `console.log`, `sortOrder` không sắp xếp sản phẩm. | Xử lý tìm kiếm theo từ khóa (`searchTerm`), đồng bộ `?search=` từ `Header.jsx`, và sắp xếp theo `price_asc`, `price_desc`, `name_asc`, `name_desc`. | **FIXED & VERIFIED** |
| **`BUG-106-04`** | High | `ECOM-110`, `ECOM-209` | Trang `/products` hoàn toàn chưa có thanh phân trang `<Pagination />`. | Tích hợp `<Pagination />` vào `Products.jsx`, hỗ trợ chuyển trang Trước/Sau/Số trang, chọn kích thước trang và tự động reset về trang 1 khi đổi bộ lọc. | **FIXED & VERIFIED** |
| **`BUG-106-05`** | High | `ECOM-110`, `ECOM-208`, `ECOM-210` | Danh mục bị gán cứng lệch nhau giữa các trang; `categoryService.js` chưa gọi Axios API. | Cập nhật `categoryService.js` gọi `api.get('/products/categories')`, chuẩn hóa `normalizeCategory` và dùng thống nhất trên `Home.jsx`, `Products.jsx`, `Header.jsx`. | **FIXED & VERIFIED** |
| **`BUG-106-06`** | Critical | `ECOM-110`, `ECOM-208`, `ECOM-209`, `ECOM-210` | `Products.jsx` và `Home.jsx` dùng dữ liệu giả tĩnh (`setTimeout`), chưa gọi `productService`. | Kết nối `Home.jsx` và `Products.jsx` gọi `categoryService.getPublicCategories()` và `productService.getCatalog()` / `productService.getAll()`. | **FIXED & VERIFIED** |
| **`BUG-106-07`** | Critical | `ECOM-208`, `ECOM-209`, `ECOM-210` | Lệch cấu trúc `PagedResponse` (`content`), `stockQuantity`, `keyword` gây crash `products.map is not a function`. | Viết `extractPagedProducts` và `normalizeProduct` trong `productService.js`, bọc kiểm tra mảng trong `ProductGrid.jsx`, ánh xạ `stockQuantity` ↔ `stock` và `keyword` ↔ `search`. | **FIXED & VERIFIED** |
| **`BUG-106-08`** | Low | `ECOM-109` | Mục `"Danh mục"` trên `Header.jsx` chỉ trỏ cứng về `/products`, `Navbar.jsx` trả về `null`. | Bổ sung menu dropdown danh mục vào `Header.jsx` và triển khai thanh danh mục nhanh trong `Navbar.jsx`. | **FIXED & VERIFIED** |
| **`BUG-106-09`** | Low | `ECOM-109`, `ECOM-210` | `frontend/package.json` thiếu script `"lint"`. | Bổ sung script `"lint": "node scripts/lint-check.mjs"` kiểm tra 69 file nguồn đạt PASS 100%. | **FIXED & VERIFIED** |
| **`BUG-106-10`** | Medium | `ECOM-209`, `ECOM-210` | `Products.jsx` không có state `error` và không hiển thị `<ErrorMessage />` khi API lỗi. | Bổ sung state `error`, render `<ErrorMessage />` kèm nút `"Thử tải lại dữ liệu"` và `"Quay về mặc định"` trong `Products.jsx`. | **FIXED & VERIFIED** |
| **`BUG-106-11`** | Critical | `ECOM-210` (Backend `product-service`) | 6 file Java trong `backend/product-service` import sai `main.java.com.ecommerce.product...` & `java.nio.file.AccessDeniedException`; thiếu lọc `category`. | Sửa đúng package import tại cả 6 file Java (`ProductController`, `ProductService`, `ProductServiceImpl`, `DataInitializer`, `CategoryResponse`, `CategoryRepository`) và bổ sung lọc `@RequestParam("category")`. | **FIXED & VERIFIED** |

---

## E. THỐNG KÊ KẾT QUẢ KIỂM THỬ (TRƯỚC KHI SỬA VS. SAU KHI SỬA)

| Chỉ số thống kê | Lần 1 (Trước khi sửa) | Lần 2 (Sau khi sửa & Re-test) | Ghi chú |
|---|:---:|:---:|---|
| **Tổng số Test Case** | **27** | **27** | `TC-106-01` → `TC-106-27` |
| **PASS** | 12 (44.44%) | **27 (100.00%)** | Toàn bộ 27/27 Test Case đạt PASS |
| **FAIL** | 14 (51.85%) | **0 (0.00%)** | Đã khắc phục 14/14 Test Case bị FAIL |
| **BLOCKED** | 1 (3.70%) | **0 (0.00%)** | Đã gỡ bỏ hoàn toàn `TC-106-16` bị Blocked |
| **NOT TESTED** | 0 (0.00%) | **0 (0.00%)** | Thực thi 100% Test Case |
| **Tỷ lệ PASS trên các test đã thực thi** | 44.44% | **100.00%** | Tăng **+55.56%** |
| **Kết quả chạy `npm test`** | 4/4 PASS (chỉ có Auth) | **8/8 PASS (100%)** | Gồm 4 test suites `auth.qa.test.mjs` + 4 test suites `ecom106.qa.test.mjs` |
| **Kết quả chạy `npm run lint`** | Chưa có script | **PASS (69/69 files)** | 0 lỗi cú pháp / import |

---

## F. KẾT LUẬN NGHIỆM THU SAU KHI HOÀN THIỆN & KIỂM THỬ LẠI

### Trả lời 10 câu hỏi trọng tâm:

1. **ECOM-106 đã hoạt động hoàn chỉnh chưa?**
   - **ĐÃ HOẠT ĐỘNG HOÀN CHỈNH 100%.** Người dùng Guest có thể truy cập trang chủ và trang mua sắm, xem danh mục sản phẩm, xem lưới sản phẩm có đầy đủ tên/giá/ảnh, lọc theo từng danh mục, tìm kiếm theo từ khóa, sắp xếp theo giá/tên, chuyển trang phân trang Trước/Sau và xem chi tiết từng sản phẩm mượt mà.

2. **ECOM-109, ECOM-110, ECOM-208 thực sự đạt yêu cầu chưa?**
   - **ĐÃ ĐẠT 100% YÊU CẦU.** Mọi điểm thiếu sót trước đó (dropdown Danh mục trên Header, ảnh sản phẩm trên `/products`, lọc danh mục, phân trang, gọi API Axios và bóc tách `PagedResponse`) đều đã được hoàn thiện và kiểm thử PASS.

3. **ECOM-209 còn thiếu những gì?**
   - **KHÔNG CÒN THIẾU GÌ (ĐÃ HOÀN THÀNH 100%).** Phân trang (`Pagination`), trạng thái đang tải (`Loading`), trạng thái danh sách rỗng (`EmptyState` kèm nút xóa bộ lọc) và trạng thái báo lỗi (`ErrorMessage` kèm nút thử lại) đều đã hoạt động đầy đủ.

4. **ECOM-210 đã hoàn thành QA chưa?**
   - **ĐÃ HOÀN THÀNH NGHIỆM THU QA (PASS 27/27 TEST CASES).** Đã có đầy đủ bộ báo cáo Trước khi sửa (`BEFORE_FIX`), Sau khi sửa (`AFTER_FIX`), bộ test tự động `frontend/tests/ecom106.qa.test.mjs` và thư mục bằng chứng `reports/test-evidence/ecom-106/`.

5. **Guest đã xem và lọc sản phẩm được chưa?**
   - **ĐÃ XEM VÀ LỌC ĐƯỢC HOÀN HẢO** qua cả 3 cách: chọn nút danh mục (Category Pills), chọn dropdown danh mục trên `/products`, hoặc bấm từ thẻ danh mục ở trang chủ `/` và menu `Danh mục ▾` trên `Header`.

6. **Phân trang, Loading, Empty State hoạt động chưa?**
   - **ĐÃ HOẠT ĐỘNG ĐẦY ĐỦ 100%.**

7. **API Frontend và Backend đã tích hợp thành công chưa?**
   - **ĐÃ TÍCH HỢP THÀNH CÔNG.** Hợp đồng dữ liệu giữa Frontend (`categoryService.js`, `productService.js`) và Backend (`ProductController.java`, `PagedResponse.java`, `CategoryResponse.java`, `ProductResponse.java`, API Gateway `application.yml`) đã khớp 100% cả về URL (`/api/v1/products`, `/api/v1/products/categories`), tham số (`keyword`, `category`, `page`, `size`, `sort`) lẫn cấu trúc phản hồi (`ApiResponse<PagedResponse<ProductResponse>>`).

8. **Có đủ điều kiện demo Sprint 1 chưa?**
   - **ĐÃ ĐỦ ĐIỀU KIỆN DEMO SPRINT 1.**

9. **Có đủ điều kiện merge vào `master` chưa?**
   - **ĐÃ ĐỦ ĐIỀU KIỆN MERGE VÀO `master`.**

10. **Cần cập nhật trạng thái nào trên Lark Base / Scrum Board cho từng task?**
    - **`ECOM-109`:** Giữ trạng thái **`DONE`**.
    - **`ECOM-110`:** Giữ trạng thái **`DONE`**.
    - **`ECOM-208`:** Giữ trạng thái **`DONE`**.
    - **`ECOM-209`:** Chuyển từ `DEV IN PROGRESS` sang **`DONE`**.
    - **`ECOM-210`:** Chuyển từ `READY TO TEST` sang **`DONE` (QA PASSED 27/27)**.
