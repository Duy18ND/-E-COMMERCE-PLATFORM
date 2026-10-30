# BÁO CÁO KIỂM THỬ QA FRONTEND ECOM-106 – SPRINT 1
## E-Commerce Platform – Guest View Categories & Products (Xem danh mục & danh sách sản phẩm)

---

## A. THÔNG TIN KIỂM THỬ

| Hạng mục | Chi tiết |
|---|---|
| **Dự án (Project)** | `C:\IT209\-E-COMMERCE-PLATFORM` |
| **Phạm vi kiểm thử** | Frontend (`frontend/`) & Tích hợp Backend (`backend/product-service`, `backend/api-gateway`) |
| **Sprint** | `SPRINT 1` |
| **Feature** | `ECOM-106` – Xem danh mục & danh sách sản phẩm (Guest View Categories & Products) |
| **Nhóm người dùng** | `GUEST` (Khách vãng lai chưa đăng nhập) |
| **Task QA chính** | `ECOM-210` (Trạng thái trên Scrum Board: `READY TO TEST`) |
| **Các Task liên quan** | `ECOM-109` (`DONE`), `ECOM-110` (`DONE`), `ECOM-208` (`DONE`), `ECOM-209` (`DEV IN PROGRESS`), `ECOM-210` (`READY TO TEST`) |
| **Ngày thực hiện** | `30/10/2026` |
| **Nhánh Git thực tế** | `devops-phuong` (tracking `origin/devops-phuong`, HEAD commit `52680ee`) |
| **Môi trường chạy** | - OS: Windows 10/11 (PowerShell Sandbox Environment)<br>- Runtime: Node.js (`--experimental-default-type=module --test`), Vite `^5.4.11`, React `^18.3.1`, React Router DOM `^6.28.0`, Axios `^1.7.9`<br>- Backend Stack: Spring Boot `3.3.4`, Spring Cloud `2023.0.3` (`api-gateway :8080`, `product-service :8082`, Java 21) |
| **Lệnh và công cụ kiểm thử** | - Kiểm tra trạng thái Git & nhánh: `git status -sb`, `git branch -a`, `git log -n 5 --oneline`<br>- Kiểm thử tự động Node Test Runner: `cd frontend && npm test` (lưu tại `reports/test-evidence/ecom-106/npm-test.log`)<br>- Kiểm tra build Frontend: `cd frontend && npm run build` (lưu tại `reports/test-evidence/ecom-106/npm-build.log`)<br>- Kiểm thử thực thi logic, hợp đồng tích hợp API & xuất giao diện HTML/Responsive (`375px`, `768px`, `1366px`): `node scratch/run_ecom106_qa.mjs` (lưu tại `reports/test-evidence/ecom-106/ecom-106-qa-execution.log`, `ecom-106-technical-analysis.json`, `rendered-home.html`, `rendered-products.html`) |

> **Lưu ý về môi trường kỹ thuật khi thực thi:**
> 1. **Dependencies & Build (`frontend/`):** Thư mục `frontend/node_modules` chưa được cài sẵn trên workspace hiện tại và môi trường Sandbox chặn kết nối mạng ra `registry.npmjs.org` (`ENOTFOUND registry.npmjs.org`), nên lệnh `vite build` báo thiếu binary `vite` cục bộ (`npm-build.log`). Tuy nhiên, Node.js runtime hoạt động bình thường, cho phép chạy trực tiếp bộ test tự động (`npm test` PASS 4/4 suite hiện có) và script kiểm thử thực thi `run_ecom106_qa.mjs`.
> 2. **Lint (`frontend/`):** Trong `frontend/package.json` (dòng 6–11) **chưa cấu hình script `"lint"`** (chỉ có `dev`, `build`, `preview`, `test`).
> 3. **Backend (`backend/product-service`):** Các container Docker (`:8080`, `:8082`, `:3306`, `:6379`) hiện đang dừng. Đặc biệt, kiểm tra biên dịch mã nguồn `backend/product-service` sau khi merge PR `#17` (`BE-Linh`) phát hiện **lỗi biên dịch Java nghiêm trọng** do sai đường dẫn package `import main.java.com.ecommerce.product...` và import nhầm Checked Exception `java.nio.file.AccessDeniedException` tại 6 file nguồn của `product-service`.

---

## B. KẾT QUẢ TỪNG TASK THEO SCRUM BOARD

| Task ID | Trạng thái Scrum | Kết quả kiểm tra thực tế | Bằng chứng | Vấn đề tồn tại |
|---|---|---|---|---|
| **ECOM-109** | `DONE` | **ĐẠT MỘT PHẦN (PARTIAL PASS – CÓ LỖI NHỎ)** | - [package.json](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/package.json#L1-L22)<br>- [vite.config.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/vite.config.js#L1-L11)<br>- [main.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/main.jsx#L1-L27)<br>- [App.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/App.jsx#L1-L44)<br>- [AppRoutes.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/routes/AppRoutes.jsx#L47-L157)<br>- [api.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/api.js#L1-L130)<br>- [Header.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Header.jsx#L102-L800)<br>- [Navbar.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Navbar.jsx#L1-L6)<br>- [Footer.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Footer.jsx#L1-L108) | 1. Đã khởi tạo Vite + React 18, cấu hình `BrowserRouter`, `AppRoutes`, Axios instance (`baseURL = http://localhost:8080/api/v1` + `unwrapApiResponse`) và layout `Header`/`Footer`.<br>2. **Vấn đề 1 (`BUG-106-08`):** Component `Navbar.jsx` trả về `null`; trên `Header.jsx` (dòng 457–469) mục **"Danh mục"** chỉ là một `<NavLink to="/products">` trùng hệt đường dẫn với mục **"Sản phẩm"** (dòng 421–433), hoàn toàn **không có menu danh mục (dropdown/mega-menu)** để Guest chọn nhanh danh mục từ thanh điều hướng.<br>3. **Vấn đề 2 (`BUG-106-09`):** Thiếu script `"lint"` trong `frontend/package.json`. |
| **ECOM-110** | `DONE` | **CHƯA ĐẠT (FAIL – CHƯA ĐÚNG VỚI TRẠNG THÁI DONE)** | - [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L4-L752)<br>- [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L1-L56)<br>- [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L1-L24)<br>- [ProductCard.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductCard.jsx#L1-L283)<br>- [ProductFilter.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductFilter.jsx#L1-L58) | 1. **Thiếu hình ảnh trên trang `/products` (`BUG-106-01`):** Trong `Products.jsx` (dòng 18–23), cả 4 sản phẩm mẫu đều **thiếu trường `imageUrl`**, khiến `ProductCard` trên trang `/products` không hiển thị được bất kỳ ảnh sản phẩm nào (chỉ hiển thị icon `📦`).<br>2. **Chưa có Phân trang trên trang `/products` (`BUG-106-04`):** Dù tiêu chí của `ECOM-110` có "Phân trang" và task được đánh dấu `DONE`, nhưng `Products.jsx` hoàn toàn chưa import và chưa hiển thị `<Pagination />`.<br>3. **Lọc danh mục, Tìm kiếm và Sắp xếp không hoạt động (`BUG-106-02`, `BUG-106-03`):** Chọn danh mục hoặc sắp xếp trên `/products` không làm thay đổi danh sách 4 sản phẩm cứng; tìm kiếm chỉ `console.log`. |
| **ECOM-208** | `DONE` | **CHƯA ĐẠT (FAIL – DỮ LIỆU GIẢ CỐ ĐỊNH & LỆCH NHAU)** | - [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L5-L108)<br>- [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L13-L49)<br>- [ProductCard.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductCard.jsx#L22-L199)<br>- [categoryService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js#L34-L42)<br>- [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L10-L31) | 1. **Dữ liệu danh mục bất nhất & hardcoded (`BUG-106-05`):** Trang chủ `Home.jsx` hiển thị 4 danh mục cứng (`phones`, `laptops`, `accessories`, `smarthome`), trong khi `Products.jsx` lại truyền cứng 3 chuỗi `['Laptop', 'Điện thoại', 'Phụ kiện']`. Khi bấm danh mục từ `Home.jsx` sang `/products?category=phones`, trang `/products` bỏ qua query param trên URL.<br>2. **Chưa kết nối Service/API (`BUG-106-05`, `BUG-106-06`):** `Products.jsx` chỉ dùng `setTimeout` 300ms với 4 object thiếu `imageUrl`, chưa gọi `productService.getAll()` hay `categoryService.getAll()`.<br>3. **Lỗi tiềm ẩn khi nối API thật (`BUG-106-07`):** Backend trả về `PagedResponse` (`{ content: [...], pageNumber, ... }`), nhưng `ProductGrid` gọi thẳng `products.map(...)` → sẽ gây crash `TypeError: products.map is not a function` nếu truyền dữ liệu từ API `GET /api/v1/products`. |
| **ECOM-209** | `DEV IN PROGRESS` | **CHƯA HOÀN THÀNH (INCOMPLETE / FAIL)** | - [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L8-L53)<br>- [Loading.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/Loading.jsx#L1-L33)<br>- [EmptyState.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/EmptyState.jsx#L1-L37)<br>- [Pagination.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/Pagination.jsx#L1) | 1. **Phân trang (Pagination):** Đã có component `components/common/Pagination.jsx` (dùng trong Admin), nhưng **chưa được tích hợp vào `Products.jsx`** cho Guest.<br>2. **Loading:** Có component `<Loading />` hiển thị trong 300ms `setTimeout` ở `Products.jsx`, nhưng chưa gắn với lời gọi API thực tế; `Home.jsx` không có trạng thái Loading.<br>3. **Empty State:** `ProductGrid.jsx` đã bọc `<EmptyState />` khi `products.length === 0`, nhưng do `Products.jsx` luôn nạp cứng 4 sản phẩm và không lọc theo danh mục/từ khóa nên Empty State không bao giờ xuất hiện khi tìm kiếm/lọc không có kết quả.<br>4. **Error State:** Hoàn toàn chưa có xử lý hiển thị lỗi khi API thất bại trên `Products.jsx` và `Home.jsx`. |
| **ECOM-210** | `READY TO TEST` | **ĐÃ THỰC HIỆN KIỂM THỬ QA – KẾT LUẬN: REJECT / CẦN FIX LỖI** | - Báo cáo `reports/ECOM_106_FRONTEND_QA_REPORT.md`<br>- Bộ bằng chứng tại `reports/test-evidence/ecom-106/` | Qua kiểm thử thực tế 27 Test Cases của `ECOM-106`: phát hiện **11 lỗi (Bugs)** trải rộng ở cả Giao diện, Lọc/Tìm kiếm, Phân trang/Empty/Error State, Tích hợp API Frontend–Backend và lỗi biên dịch tại `backend/product-service`. Chức năng **chưa đạt yêu cầu nghiệm thu**. |

---

## C. KẾT QUẢ CHI TIẾT 27 TEST CASE (TC-106-01 ĐẾN TC-106-27)

### Nhóm 1: Kiểm thử Giao diện (TC-106-01 → TC-106-08)

#### TC-106-01: Guest mở trang mua sắm
- **Tên:** Guest mở trang mua sắm (`/` và `/products`).
- **Các bước thực hiện:**
  1. Xóa toàn bộ dữ liệu xác thực trong `localStorage` (đóng vai trò `GUEST`).
  2. Mở trang chủ mua sắm tại đường dẫn `/` (`Home.jsx`).
  3. Chuyển sang trang danh sách sản phẩm tại `/products` (`Products.jsx`).
- **Kết quả mong đợi:** Trang chủ `/` và trang mua sắm `/products` tải thành công, hiển thị bố cục cửa hàng công nghệ ShopMart mà không gặp lỗi trắng trang hay bị chặn quyền.
- **Kết quả thực tế:** Cả hai route `/` và `/products` được khai báo trong nhóm `Public Customer Routes` tại `AppRoutes.jsx` (dòng 51–52), tải thành công và hiển thị giao diện trang chủ (Hero Banner, Flash Sale Banner, Danh mục sản phẩm, Sản phẩm tiêu biểu) cùng trang Danh sách sản phẩm.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [AppRoutes.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/routes/AppRoutes.jsx#L50-L55), [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L110-L749), [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L34-L53), `reports/test-evidence/ecom-106/rendered-home.html`, `reports/test-evidence/ecom-106/rendered-products.html`.
- **Ghi chú / Bug ID:** Giao diện mở được bình thường nhưng dữ liệu bên trong đang dùng mock cố định.

---

#### TC-106-02: Header/Footer hiển thị chính xác
- **Tên:** Kiểm tra hiển thị Header, Navbar và Footer cho Guest.
- **Các bước thực hiện:**
  1. Truy cập `/` và `/products` với tư cách Guest (`isAuthenticated = false`, `isAdmin = false`).
  2. Kiểm tra các thành phần trên `Header`: Logo `ShopMart`, ô tìm kiếm, từ khóa xu hướng, thanh điều hướng (`Trang chủ`, `Sản phẩm`, `Flash Sale`, `Danh mục`, `Đơn hàng`), nút Giỏ hàng, nút `Đăng nhập` và `Đăng ký`.
  3. Kiểm tra `Navbar` và `Footer` ở cuối trang.
- **Kết quả mong đợi:** Header và Footer hiển thị đầy đủ, rõ ràng, đúng thiết kế dành cho khách vãng lai; menu danh mục hoạt động rõ ràng.
- **Kết quả thực tế:** Header và Footer hiển thị đầy đủ các khối thương hiệu, thanh tìm kiếm, liên kết nhanh, chính sách hỗ trợ và hotline `1900 8888`. Tuy nhiên `Navbar.jsx` trả về `null`, và mục `Danh mục` trên `Header.jsx` (dòng 457–469) chỉ trỏ cứng tới `/products` (giống hệt mục `Sản phẩm`) chứ chưa có menu xổ xuống danh mục.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [App.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/App.jsx#L26-L40), [Header.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Header.jsx#L102-L799), [Navbar.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Navbar.jsx#L1-L6), [Footer.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Footer.jsx#L3-L106).
- **Ghi chú / Bug ID:** Ghi nhận vấn đề nhỏ tại `BUG-106-08` (link "Danh mục" trên Header trùng `/products`, không có dropdown danh mục).

---

#### TC-106-03: Danh mục sản phẩm hiển thị
- **Tên:** Kiểm tra hiển thị danh mục sản phẩm trên trang chủ và bộ lọc trang sản phẩm.
- **Các bước thực hiện:**
  1. Mở trang chủ `/` và quan sát khu vực "Danh Mục Sản Phẩm".
  2. Mở trang `/products` và quan sát bộ lọc `<ProductFilter />`.
  3. Đối chiếu danh sách danh mục hiển thị giữa 2 trang.
- **Kết quả mong đợi:** Danh mục sản phẩm hiển thị đầy đủ, đồng nhất giữa trang chủ `/` và bộ lọc trên trang `/products`.
- **Kết quả thực tế:**
  - Trên trang chủ `/` (`Home.jsx` dòng 5–73): Hiển thị 4 thẻ danh mục (`Điện thoại & Tablet`, `Laptop & Workstation`, `Phụ Kiện & Âm Thanh`, `Nhà Thông Minh & Gia Dụng`).
  - Trên trang `/products` (`Products.jsx` dòng 44): Dropdown danh mục chỉ hiển thị 3 mục cứng `['Laptop', 'Điện thoại', 'Phụ kiện']` (thiếu danh mục thứ 4 và lệch tên/ID so với trang chủ).
- **Trạng thái:** **PASS** *(Xét riêng việc hiển thị khối UI danh mục trên màn hình; lỗi lệch dữ liệu & lọc được ghi nhận tại TC-106-06 và TC-106-22).*
- **Bằng chứng:** [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L5-L73), [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L43-L49), [ProductFilter.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductFilter.jsx#L15-L34).
- **Ghi chú / Bug ID:** Liên quan `BUG-106-05` (Danh mục bị gán cứng và không đồng bộ giữa `Home.jsx` và `Products.jsx`).

---

#### TC-106-04: Danh sách sản phẩm hiển thị
- **Tên:** Kiểm tra hiển thị lưới danh sách sản phẩm (`ProductGrid`).
- **Các bước thực hiện:**
  1. Truy cập `/` và cuộn xuống mục "Sản Phẩm Công Nghệ Tiêu Biểu".
  2. Truy cập `/products` và chờ 300ms sau khi trang tải.
- **Kết quả mong đợi:** Lưới sản phẩm (`ProductGrid`) hiển thị danh sách các thẻ sản phẩm (`ProductCard`) theo bố cục grid.
- **Kết quả thực tế:**
  - Tại `/`: `ProductGrid` hiển thị 4 sản phẩm tiêu biểu.
  - Tại `/products`: Sau 300ms `setTimeout`, `ProductGrid` hiển thị 4 sản phẩm mẫu (`Laptop Dell XPS 13`, `Điện thoại iPhone 15 Pro`, `Bàn phím cơ không dây`, `Tai nghe Bluetooth chống ồn`).
- **Trạng thái:** **PASS**
- **Bằng chứng:** [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L75-L108), [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L18-L24), [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L4-L22).
- **Ghi chú / Bug ID:** Lưới hiển thị nhưng chỉ có 4 sản phẩm mẫu tĩnh (`BUG-106-06`).

---

#### TC-106-05: ProductCard hiển thị đúng tên, giá và ảnh sản phẩm
- **Tên:** Kiểm tra `ProductCard` hiển thị đầy đủ Tên, Giá bán (VND) và Hình ảnh sản phẩm.
- **Các bước thực hiện:**
  1. Mở trang `/products` (`Products.jsx`).
  2. Kiểm tra từng thẻ `ProductCard` trong lưới sản phẩm về 3 thông tin bắt buộc: Tên sản phẩm, Giá bán định dạng tiền tệ, và Hình ảnh sản phẩm (`<img>`).
- **Kết quả mong đợi:** Mỗi `ProductCard` trên trang `/products` đều hiển thị đúng tên sản phẩm, giá bán định dạng VND (`28.990.000 ₫`, ...) và ảnh sản phẩm thực tế (`<img src={product.imageUrl} />`).
- **Kết quả thực tế:**
  - Tên và giá bán hiển thị đúng định dạng VND.
  - **LỖI:** Cả 4 sản phẩm trong `Products.jsx` (dòng 18–23) **đều không có thuộc tính `imageUrl`**:
    `{ id: '1', name: 'Laptop Dell XPS 13', price: 28990000, category: 'Laptop', stock: 10 }`
  - Do `product.imageUrl` là `undefined`, `ProductCard.jsx` (dòng 70–85) rơi vào nhánh fallback `<span style={{ fontSize: '3rem', color: '#cbd5e1' }}>📦</span>`. Toàn bộ 4 sản phẩm trên trang `/products` **không có hình ảnh sản phẩm**!
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L18-L23), [ProductCard.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductCard.jsx#L70-L85), `reports/test-evidence/ecom-106/rendered-products.html`.
- **Ghi chú / Bug ID:** **`BUG-106-01`** (Mức độ: High/Major).

---

#### TC-106-06: Người dùng chọn danh mục và danh sách được cập nhật tương ứng
- **Tên:** Kiểm tra lọc sản phẩm khi người dùng chọn danh mục.
- **Các bước thực hiện:**
  1. Tại trang `/products`, chọn danh mục `"Laptop"` trên dropdown `<ProductFilter />`.
  2. Quan sát danh sách sản phẩm sau khi chọn.
  3. Chọn tiếp danh mục `"Điện thoại"` hoặc `"Phụ kiện"`.
  4. Từ trang chủ `/`, bấm vào thẻ danh mục `"Điện thoại & Tablet"` (`/products?category=phones`).
- **Kết quả mong đợi:**
  - Khi chọn `"Laptop"`, chỉ hiển thị các sản phẩm thuộc danh mục `Laptop`.
  - Khi đi từ trang chủ `/products?category=phones`, bộ lọc tự động nhận danh mục từ URL và chỉ hiển thị sản phẩm thuộc danh mục đó.
- **Kết quả thực tế:**
  - Trong `Products.jsx` (dòng 13–28), mặc dù `selectedCategory` nằm trong dependency array `[selectedCategory, sortOrder]` của `useEffect`, nhưng bên trong `useEffect` lại chỉ gán cứng `setProducts([...4 sản phẩm cố định...])` mà **hoàn toàn không có logic `.filter()` theo `selectedCategory` hay gọi API lọc**!
  - Khi bấm từ trang chủ sang `/products?category=phones`, `Products.jsx` không sử dụng `useSearchParams()` để đọc tham số `category` trên URL.
  - Kết quả là dù chọn bất kỳ danh mục nào, danh sách vẫn luôn hiển thị nguyên vẹn cả 4 sản phẩm thuộc mọi danh mục.
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L10-L28), [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L575-L578).
- **Ghi chú / Bug ID:** **`BUG-106-02`** (Mức độ: Critical/High).

---

#### TC-106-07: Điều hướng bằng React Router hoạt động
- **Tên:** Kiểm tra điều hướng SPA bằng React Router giữa các trang.
- **Các bước thực hiện:**
  1. Từ `/`, bấm nút `"Khám phá bộ sưu tập ➔"` hoặc mục `"Sản phẩm"` trên Header để chuyển sang `/products`.
  2. Từ `/products`, bấm vào tên sản phẩm hoặc nút `"Xem"` trên `ProductCard` để chuyển sang `/products/1` (`ProductDetail.jsx`).
  3. Tại `/products/1`, bấm breadcrumb `"Trang chủ"` hoặc `"Sản phẩm"` để quay lại.
  4. Truy cập một đường dẫn không tồn tại `/duong-dan-khong-ton-tai`.
- **Kết quả mong đợi:** Chuyển trang mượt mà bằng React Router (`<Link>`, `<NavLink>`, `<Routes>`) không reload toàn trang; đường dẫn lạ tự động chuyển hướng về `/`.
- **Kết quả thực tế:** Các liên kết `<Link>` và `<NavLink>` điều hướng chính xác giữa `/`, `/products`, `/products/:id`, `/flash-sale`, `/login`, `/register`; route `*` tại `AppRoutes.jsx` (dòng 154) redirect về `/` đúng thiết kế.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [AppRoutes.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/routes/AppRoutes.jsx#L47-L155), [ProductCard.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductCard.jsx#L176-L183), [ProductDetail.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/ProductDetail.jsx#L173-L179).
- **Ghi chú / Bug ID:** Điều hướng Route hoạt động tốt (riêng việc đọc query string `?category=` và `?search=` tại `/products` bị thiếu – đã ghi nhận ở `BUG-106-02`, `BUG-106-03`).

---

#### TC-106-08: Guest truy cập trang sản phẩm mà không cần đăng nhập
- **Tên:** Kiểm tra quyền truy cập công khai của Guest vào các trang xem sản phẩm.
- **Các bước thực hiện:**
  1. Đảm bảo `localStorage` không có `token` và `user` (`isAuthenticated === false`).
  2. Truy cập lần lượt `/`, `/products`, `/products/1`, `/flash-sale`.
- **Kết quả mong đợi:** Guest xem được toàn bộ các trang danh mục, danh sách sản phẩm và chi tiết sản phẩm mà không bị đẩy về `/login`.
- **Kết quả thực tế:** Trong `AppRoutes.jsx` (dòng 50–55), các route `/`, `/products`, `/products/:id`, `/flash-sale` đều đặt ngoài `<ProtectedRoute />`. Guest truy cập tự do không cần đăng nhập.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [AppRoutes.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/routes/AppRoutes.jsx#L50-L65).
- **Ghi chú / Bug ID:** Không có lỗi.

---

### Nhóm 2: Kiểm thử Phân trang, Loading, Empty State (ECOM-209: TC-106-09 → TC-106-16)

#### TC-106-09: Có nhiều sản phẩm thì phân trang hoạt động
- **Tên:** Kiểm tra hiển thị và hoạt động của thanh phân trang khi có nhiều sản phẩm.
- **Các bước thực hiện:**
  1. Mở trang `/products` (`Products.jsx`).
  2. Kiểm tra sự tồn tại của component `<Pagination />` và các state quản lý phân trang (`currentPage`, `itemsPerPage`, `totalItems`).
- **Kết quả mong đợi:** Khi danh sách có nhiều sản phẩm, trang `/products` hiển thị thanh phân trang (`Pagination`) cho phép chia trang và hiển thị tổng số sản phẩm.
- **Kết quả thực tế:**
  - Mặc dù dự án đã có sẵn component [Pagination.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/Pagination.jsx#L1) (re-export từ `components/admin/Pagination.jsx`), nhưng file [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L1-L56) **hoàn toàn chưa import và chưa sử dụng `<Pagination />`**.
  - Dữ liệu trong `Products.jsx` chỉ có 4 phần tử cố định, không có state `currentPage` hay `itemsPerPage`.
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L1-L56), [Pagination.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/Pagination.jsx#L1).
- **Ghi chú / Bug ID:** **`BUG-106-04`** (Mức độ: High – `ECOM-110` đã báo `DONE` và `ECOM-209` đang `DEV IN PROGRESS` nhưng trang `/products` của Guest chưa có phân trang).

---

#### TC-106-10: Chuyển sang trang kế tiếp hiển thị đúng dữ liệu
- **Tên:** Kiểm tra chuyển sang trang kế tiếp (Next Page) trên danh sách sản phẩm.
- **Các bước thực hiện:**
  1. Mở trang `/products`.
  2. Tìm nút `"Sau →"` hoặc nút số trang `2` để chuyển sang trang kế tiếp.
- **Kết quả mong đợi:** Bấm nút trang kế tiếp sẽ cập nhật `currentPage = 2` và hiển thị danh sách sản phẩm của trang 2.
- **Kết quả thực tế:** Không có thanh phân trang và không có nút chuyển trang kế tiếp trên trang `/products`.
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L34-L53).
- **Ghi chú / Bug ID:** **`BUG-106-04`**.

---

#### TC-106-11: Quay về trang trước hoạt động
- **Tên:** Kiểm tra quay về trang trước (Previous Page) trên danh sách sản phẩm.
- **Các bước thực hiện:**
  1. Từ trang 2 của `/products`, bấm nút `"← Trước"` hoặc số trang `1`.
- **Kết quả mong đợi:** Quay về trang trước và hiển thị đúng dữ liệu sản phẩm của trang trước.
- **Kết quả thực tế:** Trang `/products` chưa tích hợp component phân trang nên không thể thực hiện thao tác quay về trang trước.
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L34-L53).
- **Ghi chú / Bug ID:** **`BUG-106-04`**.

---

#### TC-106-12: Đổi danh mục thì phân trang được xử lý đúng
- **Tên:** Kiểm tra tự động đưa phân trang về trang 1 (`currentPage = 1`) và cập nhật tổng số trang khi đổi danh mục.
- **Các bước thực hiện:**
  1. Mở `/products`, chuyển sang trang > 1.
  2. Chọn một danh mục khác trên `<ProductFilter />`.
- **Kết quả mong đợi:** Khi đổi danh mục, trang hiện tại được reset về `1` và tổng số trang/sản phẩm được tính lại theo danh mục mới.
- **Kết quả thực tế:** Trên `Products.jsx`, cả chức năng lọc theo danh mục lẫn chức năng phân trang đều chưa được triển khai.
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L7-L28).
- **Ghi chú / Bug ID:** **`BUG-106-02`**, **`BUG-106-04`**.

---

#### TC-106-13: Khi gọi API có trạng thái Loading
- **Tên:** Kiểm tra hiển thị trạng thái `Loading` trong lúc chờ API trả dữ liệu.
- **Các bước thực hiện:**
  1. Mở trang `/products` và `/products/1`.
  2. Kiểm tra xem state `loading` có được bật trước khi gọi API thật và tắt trong khối `finally` sau khi nhận phản hồi không.
- **Kết quả mong đợi:** Khi gọi API danh mục và danh sách sản phẩm, giao diện hiển thị `<Loading />` thực sự gắn với tiến trình bất đồng bộ của API.
- **Kết quả thực tế:**
  - Component [Loading.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/Loading.jsx#L1-L33) đã được xây dựng và được render tại `Products.jsx` (dòng 51: `{loading ? <Loading message="Đang tải danh sách sản phẩm..." /> : <ProductGrid products={products} />}`).
  - Tuy nhiên, trong `Products.jsx` (dòng 15–26), `loading` chỉ đang bọc một `setTimeout` giả lập 300ms chứ **chưa gọi API thực tế**. Ngoài ra, trang chủ `Home.jsx` không có trạng thái `loading`.
- **Trạng thái:** **FAIL** *(Đã có UI `<Loading />`, nhưng chưa gắn với lời gọi API danh sách sản phẩm/danh mục thực tế trên `Products.jsx` và `Home.jsx`).*
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L13-L28), [Loading.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/Loading.jsx#L1-L33).
- **Ghi chú / Bug ID:** **`BUG-106-06`**.

---

#### TC-106-14: Khi không có sản phẩm hiển thị Empty State
- **Tên:** Kiểm tra hiển thị `EmptyState` khi danh mục hoặc kết quả tìm kiếm không có sản phẩm nào.
- **Các bước thực hiện:**
  1. Mở trang `/products`.
  2. Nhập từ khóa không tồn tại (ví dụ `"xyz_khong_ton_tai_999"`) vào ô tìm kiếm `ProductSearch` và bấm `"Tìm kiếm"`.
  3. Hoặc chọn một danh mục không có sản phẩm.
- **Kết quả mong đợi:** Danh sách sản phẩm rỗng (`products.length === 0`) và giao diện hiển thị `<EmptyState title="Không tìm thấy sản phẩm nào" description="Thử thay đổi bộ lọc hoặc tìm kiếm từ khóa khác." />`.
- **Kết quả thực tế:**
  - Component `ProductGrid.jsx` (dòng 5–7) đã viết sẵn câu lệnh điều kiện trả về `<EmptyState />` khi `products.length === 0`.
  - **NHƯNG trên thực tế tại `/products`:** Hàm `handleSearch` (dòng 30–32 của `Products.jsx`) chỉ gọi `console.log('Tìm kiếm sản phẩm:', term)` và `useEffect` luôn nạp cứng 4 sản phẩm mẫu không qua bộ lọc. Do đó `products.length` trên `/products` luôn bằng `4`, khiến **Empty State không bao giờ được hiển thị** khi người dùng tìm kiếm hoặc lọc không có kết quả!
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L13-L32), [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L4-L7), [EmptyState.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/EmptyState.jsx#L3-L35).
- **Ghi chú / Bug ID:** **`BUG-106-02`**, **`BUG-106-03`**.

---

#### TC-106-15: Khi API lỗi có phản hồi phù hợp
- **Tên:** Kiểm tra hiển thị thông báo lỗi hoặc giao diện xử lý lỗi khi API trả về lỗi (HTTP 500/503/Network Error).
- **Các bước thực hiện:**
  1. Kiểm tra cơ chế bắt lỗi (`try/catch`, state `error`, `<ErrorMessage />`, toast) trong `Products.jsx`, `Home.jsx`, `productService.js` và `categoryService.js` khi API Backend gặp lỗi.
- **Kết quả mong đợi:** Khi API lỗi, giao diện hiển thị thông báo lỗi thân thiện (hoặc cảnh báo đang hiển thị dữ liệu dự phòng) và nút "Thử lại".
- **Kết quả thực tế:**
  - `Products.jsx` và `Home.jsx` không gọi API và cũng **không có state `error`** hay component `<ErrorMessage />`.
  - Trong `productService.js` (dòng 15–30), khối `catch (err)` nuốt toàn bộ lỗi từ `api.get('/products')` và âm thầm trả về `localProducts` mà không phát bất kỳ thông báo nào cho UI.
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L1-L56), [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L12-L30).
- **Ghi chú / Bug ID:** **`BUG-106-10`** (Mức độ: Medium).

---

#### TC-106-16: Không xuất hiện dữ liệu trùng hoặc thiếu khi phân trang
- **Tên:** Kiểm tra tính toàn vẹn dữ liệu (không trùng lặp, không bỏ sót bản ghi) khi chuyển qua các trang.
- **Các bước thực hiện:**
  1. Kiểm tra logic cắt trang trên Frontend (`Products.jsx`) và logic phân trang/cache trên Backend (`ProductController.java`, `ProductServiceImpl.java`).
- **Kết quả mong đợi:** Các trang liên tiếp (`page=0`, `page=1`, ...) hiển thị các tập sản phẩm rời nhau, đủ tổng số `totalElements`, không trùng hoặc thiếu.
- **Kết quả thực tế:**
  - Trên Frontend (`Products.jsx`): Chưa triển khai phân trang nên bị chặn (Blocked) kiểm thử thao tác chuyển trang trên UI.
  - Trên Backend (`ProductController.java` dòng 39): Phát hiện lỗi `@Cacheable(value = "products", key = "#pageable.pageNumber + '-' + #pageable.pageSize")` **không đưa `#keyword` và `#pageable.sort` vào cache key**, dẫn đến khi người dùng tìm kiếm hoặc đổi sắp xếp ở cùng trang `pageNumber`/`pageSize` sẽ nhận nhầm dữ liệu cache của truy vấn trước đó (gây sai lệch/thiếu dữ liệu).
- **Trạng thái:** **BLOCKED** *(trên UI do `Products.jsx` chưa có phân trang; kèm lỗi cache key ở Backend `BUG-106-11`).*
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L1-L56), [ProductController.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/controller/ProductController.java#L38-L47).
- **Ghi chú / Bug ID:** **`BUG-106-04`**, **`BUG-106-11`**.

---

### Nhóm 3: Kiểm thử Responsive (TC-106-17 → TC-106-21)

#### TC-106-17: Mobile (375px) không tràn nội dung
- **Tên:** Kiểm tra giao diện trên màn hình Mobile (`375px`) không bị tràn ngang.
- **Các bước thực hiện:**
  1. Render giao diện trang chủ `/` và trang `/products` ở kích thước khung nhìn `375px × 900px`.
  2. Kiểm tra quy tắc CSS tại `App.jsx` (`overflowX: 'hidden'`), `responsive.css` (`@media (max-width: 768px)` và `@media (max-width: 640px)`), `ProductGrid.jsx` (`repeat(auto-fill, minmax(240px, 1fr))`).
- **Kết quả mong đợi:** Các khối Header, Thanh tìm kiếm, Bộ lọc và Lưới sản phẩm tự động xuống dòng thành 1 cột (`1fr`), không gây thanh cuộn ngang trang.
- **Kết quả thực tế:**
  - Tại `375px`: `.grid-cols-4`, `.grid-cols-3`, `.grid-cols-2` chuyển về `1fr !important` (`responsive.css` dòng 66–71); `.header-trending-tags` ẩn đi (`display: none !important`); `.header-search-wrapper` xuống dòng (`order: 3; width: 100%`); `ProductGrid` (`minmax(240px, 1fr)`) hiển thị 1 cột vừa khít khung nhìn `375px` (rộng nội dung `343px`).
- **Trạng thái:** **PASS**
- **Bằng chứng:** [responsive.css](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/styles/responsive.css#L3-L88), [App.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/App.jsx#L26), `reports/test-evidence/ecom-106/rendered-products.html`.
- **Ghi chú / Bug ID:** Không có lỗi tràn ngang trên trang `/` và `/products`.

---

#### TC-106-18: Tablet (768px) hiển thị lưới sản phẩm phù hợp
- **Tên:** Kiểm tra hiển thị lưới danh mục và lưới sản phẩm trên màn hình Tablet (`768px`).
- **Các bước thực hiện:**
  1. Render giao diện `/` và `/products` ở kích thước `768px × 1024px`.
  2. Kiểm tra số cột của `.grid-cols-4` (danh mục trang chủ) và `ProductGrid` (`repeat(auto-fill, minmax(240px, 1fr))`).
- **Kết quả mong đợi:** Trên màn hình Tablet `768px`, danh mục và lưới sản phẩm chia thành 2 cột cân đối, khoảng cách `gap: 1.5rem` rõ ràng.
- **Kết quả thực tế:**
  - Tại `768px`, quy tắc `@media (max-width: 768px)` trong `responsive.css` (dòng 28–32) đặt `.grid-cols-4` thành `repeat(2, 1fr) !important`.
  - Lưới `ProductGrid` với container `768px` (trừ padding `32px` còn `736px`) tự động chia thành **2 cột** (`2 × 240px + 24px gap <= 736px`), hiển thị cân đối.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [responsive.css](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/styles/responsive.css#L28-L36), [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L10-L16).
- **Ghi chú / Bug ID:** Không có lỗi.

---

#### TC-106-19: Desktop (1366px) hiển thị đầy đủ nội dung
- **Tên:** Kiểm tra hiển thị đầy đủ nội dung trên màn hình Desktop (`1366px`).
- **Các bước thực hiện:**
  1. Render giao diện `/` và `/products` ở kích thước `1366px × 900px`.
  2. Kiểm tra container (`max-width: 1240px`), Hero 2 cột, Danh mục 4 cột và Lưới sản phẩm 4 cột.
- **Kết quả mong đợi:** Hiển thị đầy đủ tất cả thành phần trên 4 cột sản phẩm/danh mục, căn giữa trong `.container` (`1240px`).
- **Kết quả thực tế:** Tại `1366px`, `.container` giới hạn `1240px` căn giữa; Hero section hiển thị 2 cột (`1.15fr 0.85fr`); Danh mục sản phẩm và Lưới sản phẩm hiển thị 4 cột đầy đủ.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [global.css](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/styles/global.css#L35-L40), [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L120-L129), [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L10-L16).
- **Ghi chú / Bug ID:** Không có lỗi bố cục ở `1366px`.

---

#### TC-106-20: Menu điều hướng hoạt động trên các kích thước màn hình
- **Tên:** Kiểm tra thanh điều hướng (`Header`) hoạt động trên Mobile (`375px`), Tablet (`768px`) và Desktop (`1366px`).
- **Các bước thực hiện:**
  1. Kiểm tra `.header-main-row`, `.header-nav-links`, `.header-actions` tại 3 kích thước `375px`, `768px`, `1366px`.
  2. Kiểm tra khả năng bấm vào các mục `Trang chủ`, `Sản phẩm`, `Flash Sale`, `Danh mục`, `Đơn hàng`, `Giỏ hàng`, `Đăng nhập`, `Đăng ký`.
- **Kết quả mong đợi:** Các liên kết điều hướng không bị ẩn mất hoặc chồng lấn lên nhau trên cả 3 kích thước màn hình.
- **Kết quả thực tế:** Nhờ các rule trong `responsive.css` (dòng 8–18, 51–63), trên Tablet/Mobile phần `.header-main-row` tự động `flex-wrap: wrap`, `.header-nav-links` cho phép cuộn ngang mượt (`overflow-x: auto; max-width: 100%`) và ô tìm kiếm đẩy xuống hàng dưới (`order: 3; flex-basis: 100%`). Các liên kết đều có thể tương tác trên mọi kích thước.
- **Trạng thái:** **PASS**
- **Bằng chứng:** [Header.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Header.jsx#L114-L531), [responsive.css](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/styles/responsive.css#L8-L64).
- **Ghi chú / Bug ID:** Bố cục responsive của Header hoạt động tốt.

---

#### TC-106-21: Hình ảnh, nút bấm và giá sản phẩm không bị che khuất
- **Tên:** Kiểm tra khung ảnh, giá bán và nút thao tác trên `ProductCard` không bị che khuất hoặc cắt chữ sai trên các kích thước màn hình.
- **Các bước thực hiện:**
  1. Kiểm tra cấu trúc CSS của `ProductCard.jsx` ở `375px`, `768px`, `1366px`: khung ảnh (`height: 190px`, badge giảm giá/chính hãng `position: absolute`), tên sản phẩm (`WebkitLineClamp: 2`), giá bán (`flexWrap: 'wrap'`) và cụm nút `+ Thêm vào giỏ` / `Xem`.
- **Kết quả mong đợi:** Các nút bấm, giá tiền và khung ảnh không bị chồng chéo hoặc che khuất nhau ở mọi kích thước màn hình.
- **Kết quả thực tế:** Về mặt bố cục CSS, các phần tử trong `ProductCard` sử dụng `display: flex; flexDirection: column; justifyContent: space-between` nên giá tiền và nút bấm luôn tách biệt rõ ràng, không bị che khuất ở cả 3 kích thước màn hình. *(Lưu ý: riêng trên `/products`, ảnh sản phẩm không hiển thị do dữ liệu trong `Products.jsx` thiếu trường `imageUrl` như đã nêu ở TC-106-05 / `BUG-106-01`).*
- **Trạng thái:** **PASS** *(về mặt bố cục Responsive CSS không che khuất phần tử).*
- **Bằng chứng:** [ProductCard.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductCard.jsx#L28-L279).
- **Ghi chú / Bug ID:** Xem thêm `BUG-106-01` về việc thiếu dữ liệu `imageUrl` tại `Products.jsx`.

---

### Nhóm 4: Kiểm thử Tích hợp Backend (TC-106-22 → TC-106-27)

#### TC-106-22: Frontend gọi API danh mục thành công
- **Tên:** Kiểm tra Frontend gọi API lấy danh mục sản phẩm từ Backend (`GET /api/v1/products/categories`).
- **Các bước thực hiện:**
  1. Kiểm tra Backend `ProductController.java` (dòng 126–131): xác nhận endpoint thật là `GET /api/v1/products/categories` trả về `ApiResponse<List<CategoryResponse>>`.
  2. Kiểm tra `frontend/src/services/categoryService.js`, `Home.jsx` và `Products.jsx` xem có gọi `api.get('/products/categories')` hay không.
- **Kết quả mong đợi:** `categoryService.getAll()` gọi `api.get('/products/categories')` qua Axios instance và `Home.jsx` / `Products.jsx` sử dụng dữ liệu danh mục từ API.
- **Kết quả thực tế:**
  - **Frontend hoàn toàn CHƯA gọi API danh mục của Backend:**
    1. Trong [categoryService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js#L1-L43), file này **thậm chí không import `api` (Axios)** mà chỉ đọc/ghi `localStorage` với `MOCK_CATEGORIES` (42 danh mục giả phục vụ trang Admin)!
    2. Trong [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L5-L73) và [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L44), danh mục được khai báo mảng tĩnh ngay trong component, không gọi bất kỳ service hay API nào.
  - **Backend `product-service` bị lỗi biên dịch ở chính tính năng Category (`BUG-106-11`):** Trong `ProductController.java` (dòng 28), `ProductService.java` (dòng 13), `ProductServiceImpl.java` (dòng 30–31), `DataInitializer.java` (dòng 15–16), `CategoryResponse.java` (dòng 6), `CategoryRepository.java` (dòng 8) đều ghi sai câu lệnh `import main.java.com.ecommerce.product...` khiến `product-service` không thể biên dịch!
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [categoryService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js#L1-L43), [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L43-L49), [ProductController.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/controller/ProductController.java#L28).
- **Ghi chú / Bug ID:** **`BUG-106-05`**, **`BUG-106-11`**.

---

#### TC-106-23: Frontend gọi API danh sách sản phẩm thành công
- **Tên:** Kiểm tra trang mua sắm Frontend gọi API lấy danh sách sản phẩm (`GET /api/v1/products`).
- **Các bước thực hiện:**
  1. Kiểm tra `Products.jsx` (dòng 13–28) và `Home.jsx` (dòng 75–108).
  2. Kiểm tra `productService.js` (dòng 12–31).
- **Kết quả mong đợi:** Khi Guest mở trang `/products` (hoặc `/`), Frontend gọi `productService.getAll(params)` → gửi HTTP request `GET http://localhost:8080/api/v1/products` tới API Gateway.
- **Kết quả thực tế:**
  - Trong `Products.jsx` (dòng 13–28), lập trình viên mới chỉ để lại dòng comment:
    `// Sẵn sàng kết nối với productService.getAll() khi Backend sẵn sàng`
    và dùng `setTimeout` 300ms để `setProducts([...4 sản phẩm mẫu...])`. **Không có bất kỳ lời gọi `productService.getAll()` hay request HTTP nào được gửi đi khi mở trang `/products` hoặc `/`!**
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L13-L28), [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L75-L108).
- **Ghi chú / Bug ID:** **`BUG-106-06`** (Mức độ: Critical).

---

#### TC-106-24: Dữ liệu từ Backend hiển thị đúng lên UI
- **Tên:** Kiểm tra tính tương thích cấu trúc dữ liệu (Schema Mapping) giữa Backend `ProductResponse` / `PagedResponse` và Frontend UI.
- **Các bước thực hiện:**
  1. Đối chiếu cấu trúc trả về của Backend `GET /api/v1/products`:
     `ApiResponse<PagedResponse<ProductResponse>>` → sau khi đi qua `unwrapApiResponse` trong `api.js` (dòng 32–47), giá trị trả về là đối tượng `PagedResponse`:
     `{ content: [ { id, name, description, price, stockQuantity, category, imageUrl, status, ... } ], pageNumber, pageSize, totalElements, totalPages, last }`.
  2. Chạy thử nghiệm truyền kết quả này vào `productService.getAll()` và `<ProductGrid products={data} />` (trong `scratch/run_ecom106_qa.mjs`).
- **Kết quả mong đợi:** Frontend trích xuất đúng mảng `data.content` cùng thông tin phân trang (`pageNumber`, `totalPages`, `totalElements`) và ánh xạ đúng `stockQuantity` ↔ `stock` để hiển thị lên `ProductGrid`, `ProductCard`, `ProductDetail`.
- **Kết quả thực tế:**
  - **Lỗi Crash Runtime (`BUG-106-07`):** `productService.getAll()` trả thẳng object `PagedResponse` (không bóc `.content`). Khi truyền vào `ProductGrid({ products })`, điều kiện `!products || products.length === 0` trả về `false` (do `{ content: [...] }.length` là `undefined`), sau đó gọi `products.map(...)` gây lỗi **crash trắng trang: `TypeError: products.map is not a function`**!
  - **Lệch tên trường tồn kho:** Backend `ProductResponse.java` (dòng 24) trả về `stockQuantity`, nhưng Frontend (`ProductDetail.jsx` dòng 91) lại đọc `product.stock` (luôn bị fallback về `100`).
  - **Lệch tham số lọc:** Backend `ProductController.java` (dòng 42) nhận `@RequestParam(value = "keyword", required = false)`, trong khi Frontend `productService.js` (dòng 18, 23) lại truyền `params.category` và `params.search`.
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [ProductController.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/controller/ProductController.java#L41-L47), [PagedResponse.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/dto/response/PagedResponse.java#L14-L35), [ProductResponse.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/dto/response/ProductResponse.java#L20-L31), [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L12-L30), [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L4-L20), `reports/test-evidence/ecom-106/ecom-106-technical-analysis.json`.
- **Ghi chú / Bug ID:** **`BUG-106-07`** (Mức độ: Critical).

---

#### TC-106-25: API hỗ trợ phân trang đúng với giao diện
- **Tên:** Kiểm tra đồng bộ tham số phân trang giữa giao diện Frontend và API Backend.
- **Các bước thực hiện:**
  1. Kiểm tra tham số phân trang của Backend `ProductController.getProducts`: sử dụng Spring `Pageable` (`page` 0-indexed: `0, 1, 2...`, `size`: mặc định `10`, `sort`: `createdAt,desc`) và trả về `PagedResponse` (`pageNumber`, `pageSize`, `totalElements`, `totalPages`, `last`).
  2. Kiểm tra `Products.jsx` và `Pagination.jsx` trên Frontend.
- **Kết quả mong đợi:** Khi người dùng chọn trang `currentPage` (1-based) trên UI, Frontend gọi API với `page = currentPage - 1` và `size = itemsPerPage`, đồng thời nhận `totalElements` từ `PagedResponse` để truyền vào `<Pagination totalItems={totalElements} />`.
- **Kết quả thực tế:**
  - Backend đã hỗ trợ `Pageable` và `PagedResponse`.
  - Tuy nhiên Frontend (`Products.jsx` và `productService.js`) **chưa truyền tham số `page`, `size`**, chưa chuyển đổi chỉ số trang `1-based` ↔ `0-based`, và chưa gắn `<Pagination />` vào trang `/products`.
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [ProductController.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/controller/ProductController.java#L41-L47), [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L1-L56).
- **Ghi chú / Bug ID:** **`BUG-106-04`**, **`BUG-106-07`**.

---

#### TC-106-26: Guest truy cập API công khai mà không cần JWT
- **Tên:** Kiểm tra cấu hình phân quyền tại API Gateway và Request Interceptor của Frontend cho phép Guest gọi API sản phẩm/danh mục không cần JWT.
- **Các bước thực hiện:**
  1. Kiểm tra `backend/api-gateway/src/main/resources/application.yml` (dòng 56–68, 135–151).
  2. Kiểm tra `frontend/src/services/api.js` (dòng 16–26).
- **Kết quả mong đợi:**
  - API Gateway mở public (không gắn `AuthenticationFilter`) cho toàn bộ phương thức `GET /api/v1/products/**` (bao gồm `GET /api/v1/products`, `GET /api/v1/products/{id}`, `GET /api/v1/products/categories`) và cấu hình CORS cho phép origin `http://localhost:3000`, `http://localhost:5173`.
  - Frontend `api.js` khi không có token trong `localStorage` vẫn gửi request bình thường mà không gắn header `Authorization` rỗng.
- **Kết quả thực tế:**
  - Trong `api-gateway/src/main/resources/application.yml` (dòng 57–67), route `product-service-public` với `Path=/api/v1/products/**` và `Method=GET` **không yêu cầu `AuthenticationFilter`**, đồng thời `globalcors` (dòng 135–151) đã cho phép origin `http://localhost:3000` và `http://localhost:5173`.
  - Trong `frontend/src/services/api.js` (dòng 18–23), chỉ khi `if (token)` có giá trị mới gắn `Authorization: Bearer ${token}`.
  - Tuy nhiên do `backend/product-service` đang bị lỗi biên dịch Java (`import main.java.com.ecommerce.product...` tại `ProductController.java`) và Frontend `Products.jsx` chưa gọi API, nên mới chỉ đạt ở tầng cấu hình Gateway & Axios Interceptor.
- **Trạng thái:** **PASS** *(Xét về cấu hình bảo mật route công khai trên API Gateway `application.yml` và Axios Interceptor `api.js` cho Guest).*
- **Bằng chứng:** [application.yml](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/api-gateway/src/main/resources/application.yml#L56-L68), [api.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/api.js#L16-L26).
- **Ghi chú / Bug ID:** Cấu hình Gateway & Axios cho Guest đúng chuẩn; cần sửa lỗi compile ở `product-service` (`BUG-106-11`) để chạy runtime.

---

#### TC-106-27: Khi Backend ngừng hoạt động, Frontend xử lý lỗi phù hợp
- **Tên:** Kiểm tra phản ứng của Frontend khi Backend ngừng hoạt động (Connection Refused / HTTP 503 Fallback).
- **Các bước thực hiện:**
  1. Giữ Backend ở trạng thái ngừng hoạt động (cổng `8080` đóng).
  2. Mở trang `/products` và `/products/1`.
  3. Kiểm tra cách `Products.jsx`, `ProductDetail.jsx`, `productService.js` xử lý khi không kết nối được tới `http://localhost:8080/api/v1`.
- **Kết quả mong đợi:** Frontend bắt được lỗi kết nối (`ERR_CONNECTION_REFUSED` hoặc `503 Service Unavailable` từ `FallbackController`), hiển thị thông báo rõ ràng cho người dùng (hoặc cảnh báo đang dùng dữ liệu ngoại tuyến) và không làm crash ứng dụng.
- **Kết quả thực tế:**
  - Tại `/products/1` (`ProductDetail.jsx` dòng 30–44): Gọi `productService.getById('1')` → khi cổng `8080` đóng, `productService.getById` bắt lỗi trong `catch` và trả về sản phẩm từ `localProducts` để trang không bị crash.
  - **NHƯNG tại `/products` (`Products.jsx`):** Trang `/products` thậm chí không gọi `productService.getAll()`, và trong `productService.js` (dòng 15–30) khi Backend ngừng hoạt động, hàm `getAll()` âm thầm nuốt lỗi mà không có bất kỳ cơ chế thông báo lỗi hay trạng thái lỗi (`ErrorMessage` / Toast) nào cho người dùng biết máy chủ đang ngừng hoạt động.
- **Trạng thái:** **FAIL**
- **Bằng chứng:** [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L13-L28), [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L12-L30), [FallbackController.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/api-gateway/src/main/java/com/ecommerce/gateway/controller/FallbackController.java#L27-L33).
- **Ghi chú / Bug ID:** **`BUG-106-06`**, **`BUG-106-10`**.

---

## D. DANH SÁCH LỖI PHÁT HIỆN (BUG LIST)

### `BUG-106-01` – Toàn bộ thẻ sản phẩm trên trang `/products` bị mất hình ảnh (chỉ hiện icon `📦`)
- **Mức độ nghiêm trọng:** **High (Major)**
- **Task liên quan:** `ECOM-110`, `ECOM-208`
- **Cách tái hiện:**
  1. Mở trang danh sách sản phẩm tại `/products`.
  2. Quan sát 4 thẻ sản phẩm (`Laptop Dell XPS 13`, `Điện thoại iPhone 15 Pro`, `Bàn phím cơ không dây`, `Tai nghe Bluetooth chống ồn`).
- **Kết quả mong đợi:** Mỗi thẻ sản phẩm (`ProductCard`) hiển thị hình ảnh thực tế của sản phẩm (`<img src={product.imageUrl} />`).
- **Kết quả thực tế:** Cả 4 sản phẩm đều không có ảnh, chỉ hiển thị biểu tượng hộp carton `📦` trên nền xám.
- **File code liên quan:**
  - [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L18-L23)
  - [ProductCard.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductCard.jsx#L70-L85)
- **Đề xuất khắc phục:** Kết nối `Products.jsx` với `productService.getAll()` (trong `INITIAL_PRODUCTS` của `mockData.js` và `DataInitializer.java` của Backend đều đã có đầy đủ trường `imageUrl`).

---

### `BUG-106-02` – Chọn danh mục trên trang `/products` và từ trang chủ `/` không lọc danh sách sản phẩm
- **Mức độ nghiêm trọng:** **Critical**
- **Task liên quan:** `ECOM-110`, `ECOM-208`, `ECOM-209`
- **Cách tái hiện:**
  1. Mở `/products`, chọn danh mục `"Laptop"` hoặc `"Điện thoại"` trên thanh `<ProductFilter />`.
  2. Hoặc từ trang chủ `/`, bấm vào thẻ danh mục `"Điện thoại & Tablet"` (điều hướng tới `/products?category=phones`).
- **Kết quả mong đợi:** Danh sách sản phẩm chỉ hiển thị các sản phẩm thuộc danh mục đã chọn.
- **Kết quả thực tế:** Danh sách vẫn giữ nguyên cả 4 sản phẩm thuộc tất cả các danh mục; `Products.jsx` không lọc theo `selectedCategory` và cũng không đọc query param `?category=` từ URL.
- **File code liên quan:**
  - [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L10-L28)
  - [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L575-L578)
- **Đề xuất khắc phục:** Sử dụng `useSearchParams()` trong `Products.jsx` để đồng bộ tham số `category` trên URL, đồng thời lọc danh sách sản phẩm theo danh mục (hoặc truyền tham số lọc xuống API `productService.getAll()`).

---

### `BUG-106-03` – Chức năng Tìm kiếm (`ProductSearch`) và Sắp xếp (`sortOrder`) trên trang `/products` không hoạt động
- **Mức độ nghiêm trọng:** **High (Major)**
- **Task liên quan:** `ECOM-110`, `ECOM-208`, `ECOM-209`
- **Cách tái hiện:**
  1. Tại `/products`, nhập từ khóa vào ô `"Tìm kiếm sản phẩm theo tên..."` và bấm `"Tìm kiếm"`.
  2. Chọn mục `"Sắp xếp: Giá: Thấp đến Cao"` hoặc `"Tên: A - Z"`.
  3. Hoặc tìm kiếm từ thanh `Header` (`/products?search=iPhone`).
- **Kết quả mong đợi:** Danh sách sản phẩm được lọc theo từ khóa tìm kiếm (nếu không khớp thì hiển thị `EmptyState`) và được sắp xếp đúng thứ tự đã chọn.
- **Kết quả thực tế:** Hàm `handleSearch` trong `Products.jsx` (dòng 30–32) chỉ gọi `console.log('Tìm kiếm sản phẩm:', term)`; biến `sortOrder` không được xử lý `.sort()`; query param `?search=` từ `Header` bị bỏ qua.
- **File code liên quan:**
  - [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L11-L32)
  - [Header.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Header.jsx#L52-L57)
- **Đề xuất khắc phục:** Đọc `searchParams.get('search')`, cập nhật state `searchTerm`, gọi API với tham số `keyword` và thực hiện sắp xếp theo `sortOrder`.

---

### `BUG-106-04` – Trang `/products` của Guest hoàn toàn chưa có Phân trang (`Pagination`)
- **Mức độ nghiêm trọng:** **High (Major)**
- **Task liên quan:** `ECOM-110`, `ECOM-209`
- **Cách tái hiện:**
  1. Mở trang `/products`.
  2. Cuộn xuống cuối lưới sản phẩm để tìm thanh phân trang.
- **Kết quả mong đợi:** Hiển thị thanh phân trang `<Pagination />` cho phép chuyển trang Trước/Sau, chọn số trang và tự động về trang 1 khi đổi danh mục/tìm kiếm.
- **Kết quả thực tế:** Không có thanh phân trang trên `/products` (mặc dù component `components/common/Pagination.jsx` đã tồn tại trong codebase).
- **File code liên quan:**
  - [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L34-L54)
  - [Pagination.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/common/Pagination.jsx#L1)
- **Đề xuất khắc phục:** Import `Pagination` từ `../../components/common/Pagination` vào `Products.jsx`, quản lý state `currentPage`, `itemsPerPage`, `totalItems` và reset `currentPage = 1` khi đổi bộ lọc.

---

### `BUG-106-05` – Danh mục sản phẩm bị gán cứng (hardcoded), bất nhất giữa các trang và `categoryService.js` chưa kết nối Axios API
- **Mức độ nghiêm trọng:** **High (Major)**
- **Task liên quan:** `ECOM-110`, `ECOM-208`, `ECOM-210`
- **Cách tái hiện:**
  1. So sánh danh mục trên `Home.jsx` (`Điện thoại & Tablet`, `Laptop & Workstation`, `Phụ Kiện & Âm Thanh`, `Nhà Thông Minh & Gia Dụng` với ID `phones`, `laptops`, `accessories`, `smarthome`), danh mục trên `Products.jsx` (`['Laptop', 'Điện thoại', 'Phụ kiện']`), và danh mục trong `categoryService.js` (`CAT001`..`CAT042`).
  2. Kiểm tra `categoryService.js` xem có gọi `GET /api/v1/products/categories` của Backend không.
- **Kết quả mong đợi:** `categoryService.getAll()` gọi `api.get('/products/categories')` từ Backend (fallback về danh mục chuẩn khi offline), và cả `Home.jsx` lẫn `Products.jsx` dùng chung nguồn dữ liệu danh mục đồng nhất.
- **Kết quả thực tế:** `categoryService.js` chỉ dùng `localStorage` + `MOCK_CATEGORIES`, không import `api`; `Home.jsx` và `Products.jsx` mỗi nơi tự gõ cứng một mảng danh mục khác nhau.
- **File code liên quan:**
  - [categoryService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/categoryService.js#L34-L43)
  - [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L5-L73)
  - [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L43-L45)
- **Đề xuất khắc phục:** Cập nhật `categoryService.getAll()` gọi `await api.get('/products/categories')` và nạp danh mục động vào `Home.jsx` và `Products.jsx`.

---

### `BUG-106-06` – Trang `Products.jsx` và `Home.jsx` đang dùng dữ liệu giả cố định, chưa gọi `productService.getAll()`
- **Mức độ nghiêm trọng:** **Critical**
- **Task liên quan:** `ECOM-110`, `ECOM-208`, `ECOM-209`, `ECOM-210`
- **Cách tái hiện:**
  1. Mở DevTools → tab Network (lọc `Fetch/XHR`).
  2. Truy cập `/` và `/products`.
- **Kết quả mong đợi:** Frontend gửi request `GET /api/v1/products` và `GET /api/v1/products/categories` để lấy dữ liệu thật từ Backend.
- **Kết quả thực tế:** Không có bất kỳ request XHR/Fetch nào gọi tới `/api/v1/products` khi mở `/` hoặc `/products` vì `Products.jsx` chỉ dùng `setTimeout` với 4 sản phẩm tĩnh.
- **File code liên quan:**
  - [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L13-L28)
  - [Home.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Home.jsx#L75-L108)
- **Đề xuất khắc phục:** Thay thế `setTimeout` trong `Products.jsx` (và `Home.jsx`) bằng lời gọi bất đồng bộ `await productService.getAll(...)`.

---

### `BUG-106-07` – Lệch cấu trúc dữ liệu giữa Backend (`PagedResponse`, `stockQuantity`, `keyword`) và Frontend (`Array`, `stock`, `category`/`search`) gây nguy cơ Crash UI
- **Mức độ nghiêm trọng:** **Critical**
- **Task liên quan:** `ECOM-208`, `ECOM-209`, `ECOM-210`
- **Cách tái hiện:**
  1. Xem phản hồi của Backend `ProductController.getProducts`: trả về `ApiResponse<PagedResponse<ProductResponse>>`.
  2. Sau khi `unwrapApiResponse` trong `api.js` mở bọc `.data`, kết quả trả về từ `api.get('/products')` là object `{ content: [...], pageNumber, pageSize, totalElements, totalPages, last }`.
  3. Truyền kết quả này vào `<ProductGrid products={products} />`.
- **Kết quả mong đợi:** `productService.getAll()` và `Products.jsx` trích xuất mảng `response.content` cho `ProductGrid`, đọc đúng `stockQuantity` và gửi đúng query param `keyword`, `page`, `size`.
- **Kết quả thực tế:**
  - `ProductGrid` gọi `products.map(...)` trên object `PagedResponse` gây lỗi runtime: **`TypeError: products.map is not a function`**!
  - Backend nhận param `keyword`, nhưng `productService.js` truyền `search` và `category`.
  - Backend trả trường `stockQuantity`, nhưng Frontend đọc `product.stock`.
- **File code liên quan:**
  - [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L12-L31)
  - [ProductGrid.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/product/ProductGrid.jsx#L4-L20)
  - [ProductController.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/controller/ProductController.java#L41-L47)
  - [ProductResponse.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/dto/response/ProductResponse.java#L20-L31)
- **Đề xuất khắc phục:** Chuẩn hóa dữ liệu trong `productService.getAll()` để luôn trả về `{ items, pageNumber, pageSize, totalElements, totalPages }` (hoặc mảng kèm metadata) và ánh xạ `stock: item.stockQuantity ?? item.stock`, đồng thời gửi đúng tham số `keyword`, `page`, `size`.

---

### `BUG-106-08` – Mục "Danh mục" trên thanh `Header.jsx` chỉ trỏ cứng về `/products`, thiếu menu danh mục và `Navbar.jsx` rỗng
- **Mức độ nghiêm trọng:** **Low (Minor)**
- **Task liên quan:** `ECOM-109`
- **Cách tái hiện:**
  1. Quan sát thanh điều hướng trên `Header.jsx` (dòng 421–469).
  2. Bấm vào mục `"Danh mục"`.
- **Kết quả mong đợi:** Hiển thị menu xổ xuống (dropdown) liệt kê các danh mục sản phẩm hoặc cuộn tới khu vực danh mục.
- **Kết quả thực tế:** Mục `"Danh mục"` chỉ là `<NavLink to="/products">` trùng hệt đường dẫn với mục `"Sản phẩm"` kế bên; `Navbar.jsx` trả về `null`.
- **File code liên quan:**
  - [Header.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Header.jsx#L457-L469)
  - [Navbar.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/components/layout/Navbar.jsx#L1-L6)
- **Đề xuất khắc phục:** Bổ sung dropdown danh mục vào mục `"Danh mục"` trên `Header.jsx` (hoặc triển khai trong `Navbar.jsx`).

---

### `BUG-106-09` – Thiếu cấu hình lệnh `"lint"` trong `frontend/package.json`
- **Mức độ nghiêm trọng:** **Low (Minor)**
- **Task liên quan:** `ECOM-109`, `ECOM-210`
- **Cách tái hiện:**
  1. Kiểm tra mục `"scripts"` trong `frontend/package.json` hoặc chạy `npm run lint`.
- **Kết quả mong đợi:** Có script `"lint"` để kiểm tra quy chuẩn code tự động.
- **Kết quả thực tế:** `package.json` chỉ có `"dev"`, `"build"`, `"preview"`, `"test"`, chưa có `"lint"`.
- **File code liên quan:**
  - [package.json](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/package.json#L6-L11)
- **Đề xuất khắc phục:** Bổ sung cấu hình ESLint và script `"lint"` vào `frontend/package.json`.

---

### `BUG-106-10` – Thiếu xử lý và hiển thị thông báo lỗi (Error State) khi API danh mục/sản phẩm gặp sự cố
- **Mức độ nghiêm trọng:** **Medium**
- **Task liên quan:** `ECOM-209`, `ECOM-210`
- **Cách tái hiện:**
  1. Khi Backend ngừng hoạt động hoặc trả về lỗi HTTP 500/503, mở trang `/products`.
- **Kết quả mong đợi:** Hiển thị thông báo lỗi `<ErrorMessage />` (hoặc toast cảnh báo khi chuyển sang dữ liệu dự phòng) và nút "Thử lại".
- **Kết quả thực tế:** `Products.jsx` không có state `error` và không render `<ErrorMessage />`; `productService.getAll()` nuốt mọi lỗi trong `catch` mà không báo cho người dùng.
- **File code liên quan:**
  - [Products.jsx](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/pages/customer/Products.jsx#L1-L56)
  - [productService.js](file:///c:/IT209/-E-COMMERCE-PLATFORM/frontend/src/services/productService.js#L12-L30)
- **Đề xuất khắc phục:** Bổ sung state `error` cùng component `<ErrorMessage />` vào `Products.jsx`.

---

### `BUG-106-11` – Lỗi biên dịch Java nghiêm trọng và lỗi cấu hình `@Cacheable` tại Backend `product-service`
- **Mức độ nghiêm trọng:** **Critical (Blocker cho Backend Integration)**
- **Task liên quan:** `ECOM-210` (Tích hợp Backend `product-service`)
- **Cách tái hiện:**
  1. Kiểm tra các câu lệnh `import` trong 6 file của `backend/product-service` vừa được merge từ nhánh `BE-Linh` (commit `52680ee`).
  2. Kiểm tra `@Cacheable` tại `ProductController.java` (dòng 39).
- **Kết quả mong đợi:** `product-service` biên dịch thành công (`compileJava` PASS), hỗ trợ lọc theo danh mục và cache đúng theo từng tổ hợp tham số.
- **Kết quả thực tế:**
  1. **Sai package import `main.java.com.ecommerce.product...`** tại 6 file:
     - `ProductController.java` (dòng 28): `import main.java.com.ecommerce.product.dto.response.CategoryResponse;`
     - `ProductService.java` (dòng 13): `import main.java.com.ecommerce.product.dto.response.CategoryResponse;`
     - `ProductServiceImpl.java` (dòng 30–31): `import main.java.com.ecommerce.product.dto.response.CategoryResponse;` và `import main.java.com.ecommerce.product.repository.CategoryRepository;`
     - `DataInitializer.java` (dòng 15–16): `import main.java.com.ecommerce.product.entity.Category;` và `import main.java.com.ecommerce.product.repository.CategoryRepository;`
     - `CategoryResponse.java` (dòng 6): `import main.java.com.ecommerce.product.entity.Category;`
     - `CategoryRepository.java` (dòng 8): `import main.java.com.ecommerce.product.entity.Category;`
  2. **Import nhầm Checked Exception:** `ProductController.java` (dòng 3) import `java.nio.file.AccessDeniedException` (checked exception kế thừa `IOException`) thay vì `com.ecommerce.product.exception.AccessDeniedException` (runtime exception), làm hàm `requireAdminRole` (dòng 101–104) báo lỗi biên dịch `unreported exception java.nio.file.AccessDeniedException; must be caught or declared to be thrown`.
  3. **Lỗi `@Cacheable` trên `ProductController.getProducts` (dòng 39):** Đặt `@Cacheable` trực tiếp trên метод trả về `ResponseEntity` (không `Serializable` với Redis) và key `#pageable.pageNumber + '-' + #pageable.pageSize` bỏ qua `#keyword`.
- **File code liên quan:**
  - [ProductController.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/controller/ProductController.java#L3-L47)
  - [ProductService.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/service/ProductService.java#L13)
  - [ProductServiceImpl.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/service/impl/ProductServiceImpl.java#L30-L31)
  - [DataInitializer.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/config/DataInitializer.java#L15-L16)
  - [CategoryResponse.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/dto/response/CategoryResponse.java#L6)
  - [CategoryRepository.java](file:///c:/IT209/-E-COMMERCE-PLATFORM/backend/product-service/src/main/java/com/ecommerce/product/repository/CategoryRepository.java#L8)
- **Đề xuất khắc phục:** Xóa tiền tố `main.java.` khỏi tất cả các câu lệnh import trên; đổi `java.nio.file.AccessDeniedException` thành `com.ecommerce.product.exception.AccessDeniedException`; bỏ `@Cacheable` ở tầng `ProductController` (vì đã có `@Cacheable` ở `ProductServiceImpl`).

---

## E. THỐNG KÊ KẾT QUẢ KIỂM THỬ

| Chỉ số thống kê | Số lượng | Tỷ lệ | Ghi chú |
|---|:---:|:---:|---|
| **Tổng số Test Case** | **27** | **100%** | `TC-106-01` → `TC-106-27` |
| **PASS** | **12** | **44.44%** | `TC-106-01`, `02`, `03`, `04`, `07`, `08`, `17`, `18`, `19`, `20`, `21`, `26` |
| **FAIL** | **14** | **51.85%** | `TC-106-05`, `06`, `09`, `10`, `11`, `12`, `13`, `14`, `15`, `22`, `23`, `24`, `25`, `27` |
| **BLOCKED** | **1** | **3.70%** | `TC-106-16` (Bị chặn kiểm thử UI phân trang do `Products.jsx` chưa có Pagination) |
| **NOT TESTED** | **0** | **0.00%** | Toàn bộ 27/27 Test Case đã được kiểm tra thực tế |
| **Tỷ lệ PASS trên các test đã thực thi** | **12 / 27** | **44.44%** | (Nếu tính trên 26 test không bị Blocked: `12 / 26 = 46.15%`) |
| **Tổng số Bug phát hiện** | **11 Bugs** | — | **4 Critical** (`BUG-106-02`, `06`, `07`, `11`), **4 High** (`BUG-106-01`, `03`, `04`, `05`), **1 Medium** (`BUG-106-10`), **2 Low** (`BUG-106-08`, `09`) |

---

## F. KẾT LUẬN & KHUYẾN NGHỊ QUẢN TRỊ DỰ ÁN

### Trả lời 10 câu hỏi trọng tâm:

1. **ECOM-106 đã hoạt động hoàn chỉnh chưa?**
   - **CHƯA.** Mặc dù khung giao diện cơ bản (Trang chủ, Lưới sản phẩm, Responsive 3 kích thước, Route công khai cho Guest) đã hiển thị được, nhưng các luồng chức năng cốt lõi của `ECOM-106` trên trang `/products` (hiển thị ảnh sản phẩm, lọc theo danh mục, tìm kiếm, sắp xếp, phân trang, xử lý lỗi và kết nối API thật) đều chưa hoạt động.

2. **ECOM-109, ECOM-110, ECOM-208 thực sự đạt yêu cầu chưa?**
   - **`ECOM-109` (Khởi tạo Vite, Router, Axios, Layout Header/Footer):** **Đạt phần lớn (khoảng 85%)**, cấu trúc nền tảng và Axios interceptor tốt, chỉ còn thiếu dropdown danh mục thực sự ở link `"Danh mục"` trên `Header.jsx` (`BUG-106-08`) và script `"lint"` (`BUG-106-09`).
   - **`ECOM-110` (Giao diện trang mua sắm cho Guest, danh mục, lưới sản phẩm, tên/giá/ảnh, phân trang):** **CHƯA ĐẠT.** Đánh dấu `DONE` trên Scrum Board là chưa chính xác vì trên trang `/products`, 4 sản phẩm bị mất hình ảnh (`BUG-106-01`), lọc danh mục không hoạt động (`BUG-106-02`), và hoàn toàn chưa có phân trang (`BUG-106-04`).
   - **`ECOM-208` (Hiển thị danh mục, thẻ sản phẩm, kiểm tra dữ liệu và cách hiển thị):** **CHƯA ĐẠT.** Dữ liệu danh mục và sản phẩm vẫn đang gán cứng (hardcoded) và lệch nhau giữa `Home.jsx` và `Products.jsx` (`BUG-106-05`, `BUG-106-06`), đồng thời chưa xử lý cấu trúc `PagedResponse` của Backend (`BUG-106-07`).

3. **ECOM-209 còn thiếu những gì?**
   - Task `ECOM-209` (`DEV IN PROGRESS`) trên trang `/products` còn thiếu:
     1. Tích hợp component `<Pagination />` vào `Products.jsx` và xử lý chuyển trang Trước/Sau, chọn trang, reset về trang 1 khi đổi danh mục/từ khóa.
     2. Gắn trạng thái `<Loading />` với lời gọi API thực tế thay vì `setTimeout` 300ms giả lập.
     3. Kết nối logic lọc danh mục và tìm kiếm từ khóa để `<EmptyState />` trong `ProductGrid` thực sự hiển thị khi không có sản phẩm khớp.
     4. Bổ sung trạng thái báo lỗi (`<ErrorMessage />` + nút thử lại) khi gọi API thất bại.

4. **ECOM-210 đã hoàn thành QA chưa?**
   - **ĐÃ HOÀN THÀNH lượt kiểm thử QA (Round 1)** với đầy đủ 27/27 test case, bằng chứng kỹ thuật và danh sách 11 bug chi tiết. Tuy nhiên xét về kết quả nghiệm thu sản phẩm, `ECOM-210` **CHƯA PASS** và cần thực hiện **Re-test (Round 2)** sau khi đội Dev khắc phục các lỗi đã nêu.

5. **Guest đã xem và lọc sản phẩm được chưa?**
   - **Xem sản phẩm:** Guest đã truy cập và xem được trang `/` và `/products` mà không cần đăng nhập, nhưng trên `/products` chỉ thấy 4 sản phẩm mẫu không có hình ảnh.
   - **Lọc sản phẩm:** **CHƯA LỌC ĐƯỢC.** Chọn danh mục trên `/products` hoặc bấm vào danh mục từ trang chủ `/` đều không làm thay đổi danh sách sản phẩm (`BUG-106-02`).

6. **Phân trang, Loading, Empty State hoạt động chưa?**
   - **Phân trang:** **CHƯA HOẠT ĐỘNG** trên trang `/products` (chưa gắn component `<Pagination />`).
   - **Loading:** Component `<Loading />` hiển thị được trên UI trong 300ms đầu khi mở `/products`, nhưng mới chỉ là `setTimeout` giả lập, chưa gắn với API.
   - **Empty State:** Component `<EmptyState />` đã được bọc trong `ProductGrid.jsx`, nhưng trên `/products` **CHƯA HOẠT ĐỘNG** trong thực tế vì bộ lọc và tìm kiếm chưa lọc mảng `products`.

7. **API Frontend và Backend đã tích hợp thành công chưa?**
   - **CHƯA TÍCH HỢP THÀNH CÔNG.**
     - Phía Frontend: `Products.jsx` và `Home.jsx` đang dùng dữ liệu tĩnh; `categoryService.js` chỉ dùng `localStorage` mà không gọi Axios; `productService.js` chưa bóc tách `.content` từ `PagedResponse` của Backend.
     - Phía Backend: `product-service` đang gặp lỗi biên dịch Java tại 6 file do sai import `main.java.com.ecommerce.product...` và `java.nio.file.AccessDeniedException` (`BUG-106-11`).

8. **Có đủ điều kiện demo Sprint 1 chưa?**
   - **CHƯA ĐỦ ĐIỀU KIỆN DEMO.** Nếu demo trực tiếp trang `/products`, người xem sẽ thấy ngay 4 thẻ sản phẩm không có ảnh, chọn bộ lọc danh mục không có tác dụng, bấm tìm kiếm không phản hồi và không có phân trang.

9. **Có đủ điều kiện merge vào `master` chưa?**
   - **TUYỆT ĐỐI CHƯA ĐỦ ĐIỀU KIỆN MERGE VÀO `master`.** Cần sửa triệt để 4 lỗi Critical (`BUG-106-02`, `BUG-106-06`, `BUG-106-07`, `BUG-106-11`) và 4 lỗi High (`BUG-106-01`, `BUG-106-03`, `BUG-106-04`, `BUG-106-05`) trước khi tạo Pull Request.

10. **Cần cập nhật trạng thái nào trên Lark Base / Scrum Board cho từng task?**
    - **`ECOM-109`:** Giữ `DONE` (hoặc chuyển `IN PROGRESS` nếu muốn bổ sung luôn dropdown Danh mục trên Header).
    - **`ECOM-110`:** Cần chuyển từ `DONE` sang **`REOPENED` / `DEV IN PROGRESS`** (do thiếu ảnh trên `/products`, lọc danh mục không chạy và thiếu phân trang).
    - **`ECOM-208`:** Cần chuyển từ `DONE` sang **`REOPENED` / `DEV IN PROGRESS`** (do dữ liệu danh mục/sản phẩm vẫn đang hardcoded, lệch nhau và chưa khớp `PagedResponse` của Backend).
    - **`ECOM-209`:** Giữ trạng thái **`DEV IN PROGRESS`** để hoàn thiện Phân trang, Empty State khi lọc/tìm kiếm, Loading gắn API thật và Error State.
    - **`ECOM-210`:** Chuyển từ `READY TO TEST` sang **`TESTING` / `FAILED QA (WAITING FOR FIX)`** và gắn link báo cáo này để Dev xử lý.
