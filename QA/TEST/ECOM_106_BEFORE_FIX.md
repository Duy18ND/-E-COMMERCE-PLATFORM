# BÁO CÁO KIỂM TRA 5 TASK FRONTEND XEM DANH MỤC & DANH SÁCH SẢN PHẨM (ECOM-106) – SPRINT 1 (LẦN 1: TRƯỚC KHI SỬA)

## 1. Thông tin chung

- **Dự án:** `C:\IT209\-E-COMMERCE-PLATFORM`
- **Phạm vi kiểm tra:** Frontend (`../../frontend`) & đối chiếu tích hợp Backend (`backend/product-service`, `backend/api-gateway`)
- **Sprint:** SPRINT 1
- **Feature:** ECOM-106 – Xem danh mục & danh sách sản phẩm (Guest View Categories & Products)
- **Nhóm task:** `ECOM-109`, `ECOM-110`, `ECOM-208`, `ECOM-209`, `ECOM-210`
- **Nhánh Git kiểm tra:** `devops-phuong` (commit `52680ee`)
- **Vai trò đánh giá:** Senior QA Engineer, React Frontend Tester & Code Reviewer

---

## 2. Bảng tổng hợp kết quả 5 Task (Trạng thái ban đầu trước khi sửa)

| Task ID | Trạng thái Scrum Board | Kết quả kiểm tra thực tế | Bằng chứng | Vấn đề tồn tại | Việc cần làm |
|---|---|---|---|---|---|
| **ECOM-109** | `DONE` | **ĐẠT MỘT PHẦN (PARTIAL PASS)** | - `../../frontend/package.json` (dòng 1–21)<br>- `frontend/vite.config.js` (dòng 1–12)<br>- `frontend/src/routes/AppRoutes.jsx` (dòng 1–162)<br>- `frontend/src/services/api.js` (dòng 1–127)<br>- `frontend/src/components/layout/Header.jsx` (dòng 1–804)<br>- `frontend/src/components/layout/Footer.jsx` (dòng 1–273)<br>- `frontend/src/components/layout/Navbar.jsx` (dòng 1–6) | 1. Mục **"Danh mục"** trên thanh `Header.jsx` (dòng 457–469) chỉ là `<NavLink to="/products">` trùng hệt mục "Sản phẩm", chưa có menu dropdown danh mục.<br>2. File `Navbar.jsx` trả về `null`.<br>3. `../../frontend/package.json` chưa có script `"lint"` (`BUG-106-08`, `BUG-106-09`). | 1. Bổ sung menu dropdown danh mục vào mục "Danh mục" trên `Header.jsx` và thanh danh mục nhanh tại `Navbar.jsx`.<br>2. Bổ sung script `"lint"` trong `../../frontend/package.json`. |
| **ECOM-110** | `DONE` | **CHƯA ĐẠT (FAIL – CHƯA ĐÚNG VỚI TRẠNG THÁI DONE)** | - `../../frontend/src/pages/customer/Home.jsx` (dòng 1–880)<br>- `frontend/src/pages/customer/Products.jsx` (dòng 1–56)<br>- `frontend/src/components/product/ProductGrid.jsx` (dòng 1–22)<br>- `frontend/src/components/product/ProductCard.jsx` (dòng 1–195)<br>- `frontend/src/components/common/Pagination.jsx` (dòng 1–94) | 1. **Mất ảnh sản phẩm trên `/products` (`BUG-106-01`):** `Products.jsx` (dòng 18–23) gán cứng 4 sản phẩm mẫu không có `imageUrl`, làm toàn bộ `ProductCard` chỉ hiện icon `📦`.<br>2. **Lọc danh mục không chạy (`BUG-106-02`):** Chọn danh mục trên `/products` hoặc bấm từ `/` (`/products?category=phones`) không lọc danh sách sản phẩm.<br>3. **Thiếu phân trang (`BUG-106-04`):** Trang `/products` chưa import và chưa hiển thị `<Pagination />`. | 1. Kết nối `Products.jsx` và `Home.jsx` với `productService` & `categoryService` để có đủ hình ảnh `imageUrl`.<br>2. Đọc query param `?category=` bằng `useSearchParams` và lọc danh sách sản phẩm.<br>3. Tích hợp `<Pagination />` vào `Products.jsx`. |
| **ECOM-208** | `DONE` | **CHƯA ĐẠT (FAIL – DỮ LIỆU ĐANG HARDCODE & LỆCH BACKEND)** | - `../../frontend/src/pages/customer/Products.jsx` (dòng 13–45)<br>- `frontend/src/pages/customer/Home.jsx` (dòng 5–108)<br>- `frontend/src/services/productService.js` (dòng 12–31)<br>- `frontend/src/services/categoryService.js` (dòng 34–43)<br>- `backend/product-service/.../ProductController.java` (dòng 41–73) | 1. **Danh mục bất nhất & chưa gọi API (`BUG-106-05`):** `Home.jsx` dùng 4 danh mục (`phones`, `laptops`, `accessories`, `smarthome`), `Products.jsx` gán cứng `['Laptop', 'Điện thoại', 'Phụ kiện']`, còn `categoryService.js` dùng 42 mục `localStorage` mà không gọi `api.get('/products/categories')`.<br>2. **Chưa gọi `productService` (`BUG-106-06`):** `Products.jsx` dùng `setTimeout` 300ms với mảng cứng.<br>3. **Nguy cơ crash `PagedResponse` (`BUG-106-07`):** Backend trả `{ content: [...], pageNumber, totalPages, totalElements }`, truyền thẳng vào `ProductGrid` gây lỗi `TypeError: products.map is not a function`; lệch `stockQuantity` vs `stock` và `keyword` vs `search`. | 1. Cập nhật `categoryService.js` gọi `GET /api/v1/products/categories` và đồng bộ danh mục giữa `Home.jsx`, `Products.jsx`, `Header.jsx`.<br>2. Chuẩn hóa `productService.js` bóc tách `PagedResponse` (`content`, `totalElements`, `totalPages`), ánh xạ `stockQuantity` ↔ `stock` và tham số `keyword`, `category`, `page`, `size`. |
| **ECOM-209** | `DEV IN PROGRESS` | **ĐANG LÀM DỞ (FAIL – THIẾU PHÂN TRANG, LỌC, TÌM KIẾM, ERROR STATE)** | - `../../frontend/src/pages/customer/Products.jsx` (dòng 1–56)<br>- `frontend/src/components/common/Pagination.jsx` (dòng 1–94)<br>- `frontend/src/components/common/Loading.jsx` (dòng 1–35)<br>- `frontend/src/components/common/EmptyState.jsx` (dòng 1–38)<br>- `frontend/src/components/common/ErrorMessage.jsx` (dòng 1–42) | 1. **Chưa có Phân trang trên `/products` (`BUG-106-04`).**<br>2. **Tìm kiếm & Sắp xếp chỉ ghi `console.log` (`BUG-106-03`):** `handleSearch` chỉ gọi `console.log`, `sortOrder` không sắp xếp mảng.<br>3. **Empty State không bao giờ kích hoạt trên `/products`** vì mảng 4 sản phẩm tĩnh không được lọc.<br>4. **Thiếu Error State (`BUG-106-10`):** Không có state `error` và không hiển thị `<ErrorMessage />` khi API lỗi. | 1. Hoàn thiện toàn bộ luồng Lọc danh mục + Tìm kiếm từ khóa + Sắp xếp + Phân trang (`Pagination`) trong `Products.jsx`.<br>2. Hiển thị `<Loading />` khi gọi API, `<EmptyState />` kèm nút xóa bộ lọc khi không có kết quả, và `<ErrorMessage />` kèm nút thử lại khi API lỗi. |
| **ECOM-210** | `READY TO TEST` | **FAIL (12/27 PASS, 14/27 FAIL, 1/27 BLOCKED – 11 BUGS)** | - `../../reports/ECOM_106_FRONTEND_QA_REPORT_BEFORE_FIX.md`<br>- `reports/test-evidence/ecom-106/`<br>- `backend/product-service/.../ProductController.java` (dòng 3, 28, 39) | 1. **Tích hợp Backend bị chặn bởi lỗi biên dịch Java (`BUG-106-11`):** 6 file trong `../../backend/product-service` import sai `main.java.com.ecommerce.product...` và `java.nio.file.AccessDeniedException`.<br>2. Frontend chưa có bộ test tự động cho `ECOM-106` (mới chỉ có `tests/auth.qa.test.mjs`). | 1. Sửa lỗi import Java và bổ sung lọc `category` tại `../../backend/product-service`.<br>2. Sửa toàn bộ 10 lỗi Frontend (`BUG-106-01` → `BUG-106-10`).<br>3. Viết bộ kiểm thử tự động `frontend/tests/ecom106.qa.test.mjs` và thực hiện Re-test toàn diện 27/27 test case. |

---

## 3. Thống kê kết quả 27 Test Case (Lần 1 – Trước khi sửa)

| Chỉ số | Số lượng | Tỷ lệ | Chi tiết Test Case |
|---|:---:|:---:|---|
| **Tổng số Test Case** | **27** | **100%** | `TC-106-01` → `TC-106-27` |
| **PASS** | **12** | **44.44%** | `TC-106-01`, `02`, `03`, `04`, `07`, `08`, `17`, `18`, `19`, `20`, `21`, `26` |
| **FAIL** | **14** | **51.85%** | `TC-106-05`, `06`, `09`, `10`, `11`, `12`, `13`, `14`, `15`, `22`, `23`, `24`, `25`, `27` |
| **BLOCKED** | **1** | **3.70%** | `TC-106-16` (Bị chặn do trang `/products` chưa gắn `<Pagination />`) |
| **NOT TESTED** | **0** | **0.00%** | Đã kiểm tra thực tế 27/27 test case |
| **Tổng số Bug phát hiện** | **11 Bugs** | — | **4 Critical** (`BUG-106-02`, `06`, `07`, `11`), **4 High** (`BUG-106-01`, `03`, `04`, `05`), **1 Medium** (`BUG-106-10`), **2 Low** (`BUG-106-08`, `09`) |

---

## 4. Kết luận (Lần 1 – Trước khi sửa)

1. **ECOM-106 đã hoạt động hoàn chỉnh chưa?** → **CHƯA.** Mới hiển thị được giao diện khung trên `/` và `/products`, còn các chức năng cốt lõi trên `/products` (ảnh sản phẩm, lọc danh mục, tìm kiếm, sắp xếp, phân trang, xử lý lỗi và gọi API thật) đều đang lỗi hoặc chưa hoàn thiện.
2. **ECOM-109, ECOM-110, ECOM-208 thực sự đạt yêu cầu chưa?** → `ECOM-109` đạt khoảng 85%; `ECOM-110` và `ECOM-208` **CHƯA ĐẠT** dù trên Scrum Board đã để `DONE`.
3. **ECOM-209 còn thiếu những gì?** → Thiếu tích hợp `<Pagination />` vào `/products`, thiếu lọc/tìm kiếm/sắp xếp thực tế để kích hoạt `<EmptyState />`, thiếu gắn `<Loading />` với API thật và thiếu `<ErrorMessage />` khi API lỗi.
4. **Đã đủ điều kiện demo Sprint 1 và merge vào `master` chưa?** → **CHƯA ĐỦ ĐIỀU KIỆN.** Cần hoàn thiện các phần còn dở và sửa toàn bộ 11 bug trước khi kiểm thử nghiệm thu lần 2.
