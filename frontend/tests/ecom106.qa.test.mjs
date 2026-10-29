import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from '../src/services/mockData.js';
import { formatCurrency } from '../src/utils/formatCurrency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');
const backendDir = path.resolve(__dirname, '../../backend');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');
const readBackend = (relPath) => fs.readFileSync(path.join(backendDir, relPath), 'utf8');

test('ECOM-109 (TC-106-01, TC-106-02, TC-106-07, TC-106-08): Khởi tạo Vite, React Router, Axios, Layout Header/Footer và Menu danh mục cho Guest', () => {
  const pkgJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'));
  const appRoutesCode = readSrc('routes/AppRoutes.jsx');
  const headerCode = readSrc('components/layout/Header.jsx');
  const footerCode = readSrc('components/layout/Footer.jsx');
  const navbarCode = readSrc('components/layout/Navbar.jsx');

  // 1. Kiểm tra Vite, Dependencies & Scripts (bao gồm lint & test)
  assert.ok(pkgJson.dependencies.react, 'Phải có dependency react');
  assert.ok(pkgJson.dependencies['react-router-dom'], 'Phải có dependency react-router-dom');
  assert.ok(pkgJson.dependencies.axios, 'Phải có dependency axios');
  assert.ok(pkgJson.scripts.dev, 'Phải có script dev');
  assert.ok(pkgJson.scripts.build, 'Phải có script build');
  assert.ok(pkgJson.scripts.lint, 'Phải có script lint (đã sửa BUG-106-09)');
  assert.ok(pkgJson.scripts.test, 'Phải có script test');

  // 2. Kiểm tra Route công khai cho Guest (TC-106-01, TC-106-07, TC-106-08)
  const publicSection = appRoutesCode.split('<Route element={<ProtectedRoute')[0];
  assert.match(publicSection, /path="\/"\s+element=\{<Home \/>\}/, 'Route / phải mở công khai cho Guest');
  assert.match(publicSection, /path="\/products"\s+element=\{<Products \/>\}/, 'Route /products phải mở công khai cho Guest');
  assert.match(publicSection, /path="\/products\/:id"\s+element=\{<ProductDetail \/>\}/, 'Route /products/:id phải mở công khai cho Guest');

  // 3. Kiểm tra Header, Footer và Menu Danh mục (TC-106-02, BUG-106-08)
  assert.match(headerCode, /ShopMart/, 'Header phải hiển thị thương hiệu ShopMart');
  assert.match(headerCode, /isCategoryMenuOpen/, 'Header phải có dropdown menu Danh mục (đã sửa BUG-106-08)');
  assert.match(headerCode, /\/products\?category=/, 'Dropdown Danh mục trên Header phải điều hướng lọc theo category');
  assert.match(navbarCode, /\/products\?category=/, 'Navbar phải hiển thị thanh danh mục nhanh');
  assert.match(footerCode, /<footer/, 'Footer phải hiển thị đầy đủ thông tin chân trang');
});

test('ECOM-110 & ECOM-208 (TC-106-03, TC-106-04, TC-106-05, TC-106-06): Hiển thị Danh mục, Lưới sản phẩm, ProductCard (Tên, Giá, Ảnh) và Lọc theo danh mục', () => {
  const homeCode = readSrc('pages/customer/Home.jsx');
  const productsCode = readSrc('pages/customer/Products.jsx');
  const productCardCode = readSrc('components/product/ProductCard.jsx');
  const productGridCode = readSrc('components/product/ProductGrid.jsx');
  const productFilterCode = readSrc('components/product/ProductFilter.jsx');

  // 1. Kiểm tra danh mục chuẩn (TC-106-03)
  assert.equal(INITIAL_CATEGORIES.length, 4, 'Phải có 4 danh mục chuẩn trên giao diện');
  for (const cat of INITIAL_CATEGORIES) {
    assert.ok(cat.id && cat.name && cat.imageUrl, `Danh mục ${cat.id} phải có đủ id, name, imageUrl`);
  }

  // 2. Kiểm tra sản phẩm có đầy đủ tên, giá bán hợp lệ và hình ảnh (TC-106-04, TC-106-05, BUG-106-01)
  assert.ok(INITIAL_PRODUCTS.length >= 8, 'Danh sách sản phẩm khởi tạo phải có tối thiểu 8 sản phẩm để kiểm thử phân trang');
  for (const prod of INITIAL_PRODUCTS) {
    assert.ok(prod.id && prod.name, 'Sản phẩm phải có id và tên');
    assert.ok(typeof prod.price === 'number' && prod.price > 0, 'Sản phẩm phải có giá bán > 0');
    assert.ok(prod.imageUrl && prod.imageUrl.startsWith('http'), `Sản phẩm ${prod.name} phải có imageUrl hợp lệ (đã sửa BUG-106-01)`);
    assert.match(formatCurrency(prod.price), /₫/, 'Giá bán phải định dạng tiền tệ VND');
  }

  // 3. Kiểm tra ProductCard luôn có ảnh fallback và xử lý lỗi ảnh (TC-106-05)
  assert.match(productCardCode, /DEFAULT_FALLBACK_IMAGE/, 'ProductCard phải có ảnh dự phòng khi thiếu ảnh');
  assert.match(productCardCode, /onError=\{\(\) => setImgError\(true\)\}/, 'ProductCard phải xử lý sự kiện onError của thẻ <img>');
  assert.match(productCardCode, /formatCurrency\(effectivePrice\)/, 'ProductCard phải định dạng giá bán bằng formatCurrency');

  // 4. Kiểm tra Home.jsx và Products.jsx gọi service thật thay vì mảng tĩnh không ảnh (BUG-106-01, BUG-106-06)
  assert.match(homeCode, /categoryService\s*\.getPublicCategories\(\)/, 'Home.jsx phải gọi categoryService.getPublicCategories()');
  assert.match(homeCode, /productService\s*\.getAll/, 'Home.jsx phải gọi productService.getAll()');
  assert.match(productsCode, /categoryService\s*\.getPublicCategories\(\)/, 'Products.jsx phải gọi categoryService.getPublicCategories()');
  assert.match(productsCode, /productService\s*\.getCatalog/, 'Products.jsx phải gọi productService.getCatalog()');

  // 5. Kiểm tra lọc theo danh mục & đồng bộ URL query params (TC-106-06, BUG-106-02)
  assert.match(productsCode, /useSearchParams/, 'Products.jsx phải sử dụng useSearchParams để đọc ?category= và ?search=');
  assert.match(productsCode, /handleSelectCategory/, 'Products.jsx phải xử lý sự kiện chọn danh mục');
  assert.match(productFilterCode, /onSelectCategory/, 'ProductFilter.jsx phải cho phép chọn danh mục');
  assert.match(productGridCode, /Array\.isArray\(products\)/, 'ProductGrid.jsx phải kiểm tra an toàn mảng sản phẩm');
});

test('ECOM-209 (TC-106-09 → TC-106-16): Kiểm thử Phân trang (Pagination), Chuyển trang Trước/Sau, Đổi danh mục reset trang 1, Loading, Empty State và Error State', () => {
  const productsCode = readSrc('pages/customer/Products.jsx');
  const paginationCode = readSrc('components/admin/Pagination.jsx');
  const emptyStateCode = readSrc('components/common/EmptyState.jsx');
  const errorMessageCode = readSrc('components/common/ErrorMessage.jsx');

  // 1. Kiểm tra tích hợp Pagination trên trang /products (TC-106-09, TC-106-10, TC-106-11, BUG-106-04)
  assert.match(productsCode, /import Pagination from '\.\.\/\.\.\/components\/common\/Pagination'/, 'Products.jsx phải import Pagination');
  assert.match(productsCode, /<Pagination[\s\S]*?currentPage=\{currentPage\}[\s\S]*?totalItems=\{totalItems\}[\s\S]*?itemsPerPage=\{itemsPerPage\}/, 'Products.jsx phải render <Pagination /> với đầy đủ props');
  assert.match(paginationCode, /handlePrev/, 'Pagination phải hỗ trợ nút Quay về trang trước (TC-106-11)');
  assert.match(paginationCode, /handleNext/, 'Pagination phải hỗ trợ nút Chuyển sang trang kế tiếp (TC-106-10)');

  // 2. Kiểm tra đổi danh mục / tìm kiếm / sắp xếp tự động reset về trang 1 (TC-106-12)
  assert.match(
    productsCode,
    /const handleSelectCategory = \(categoryValue\) => \{\s*setSelectedCategory\(categoryValue\);\s*setCurrentPage\(1\);/,
    'Khi đổi danh mục phải reset currentPage về 1 (TC-106-12)'
  );
  assert.match(
    productsCode,
    /const handleSearch = \(term\) => \{[\s\S]*?setCurrentPage\(1\);/,
    'Khi tìm kiếm từ khóa phải reset currentPage về 1'
  );

  // 3. Kiểm tra trạng thái Loading, Empty State và Error State (TC-106-13, TC-106-14, TC-106-15, BUG-106-10)
  assert.match(productsCode, /<Loading message="Đang tải danh sách sản phẩm\.\.\." \/>/, 'Phải hiển thị Loading khi đang gọi API (TC-106-13)');
  assert.match(productsCode, /emptyTitle="Không tìm thấy sản phẩm phù hợp"/, 'Phải cấu hình Empty State khi không có sản phẩm khớp (TC-106-14)');
  assert.match(emptyStateCode, /actionText && onAction/, 'EmptyState phải hỗ trợ nút hành động xóa bộ lọc');
  assert.match(productsCode, /<ErrorMessage message=\{error\}/, 'Products.jsx phải hiển thị ErrorMessage khi API gặp lỗi (TC-106-15, BUG-106-10)');
  assert.match(errorMessageCode, /⚠️/, 'ErrorMessage phải hiển thị cảnh báo trực quan');

  // 4. Kiểm tra thuật toán phân trang không trùng lặp hoặc thiếu dữ liệu (TC-106-16)
  const pageSize = 4;
  const page1 = INITIAL_PRODUCTS.slice(0, pageSize);
  const page2 = INITIAL_PRODUCTS.slice(pageSize, pageSize * 2);
  const idsPage1 = new Set(page1.map((p) => p.id));
  const overlap = page2.filter((p) => idsPage1.has(p.id));
  assert.equal(overlap.length, 0, 'Dữ liệu giữa trang 1 và trang 2 không được trùng lặp ID (TC-106-16)');
  assert.equal(page1.length + page2.length, 8, 'Tổng số phần tử qua 2 trang phải khớp chính xác');
});

test('ECOM-210 (TC-106-17 → TC-106-27): Kiểm thử Responsive (375px, 768px, 1366px) và Tích hợp API Backend thật (ProductController, PagedResponse, Gateway CORS/Guest)', () => {
  const responsiveCss = readSrc('styles/responsive.css');
  const categoryServiceCode = readSrc('services/categoryService.js');
  const productServiceCode = readSrc('services/productService.js');
  const gatewayYaml = readBackend('api-gateway/src/main/resources/application.yml');
  const productControllerJava = readBackend('product-service/src/main/java/com/ecommerce/product/controller/ProductController.java');
  const productRepoJava = readBackend('product-service/src/main/java/com/ecommerce/product/repository/ProductRepository.java');

  // 1. Kiểm tra Responsive tại Mobile (375px), Tablet (768px), Desktop (1366px) (TC-106-17 → TC-106-21)
  assert.match(responsiveCss, /@media \(max-width: 1024px\)/, 'Phải có breakpoint cho Tablet');
  assert.match(responsiveCss, /@media \(max-width: 768px\)/, 'Phải có breakpoint cho Mobile');
  assert.match(responsiveCss, /@media \(max-width: 480px\)/, 'Phải có breakpoint cho Mobile nhỏ (375px)');
  assert.match(responsiveCss, /\.header-main-row/, 'Header phải co giãn không tràn ngang trên Mobile');

  // 2. Kiểm tra gọi API thật `/products/categories` và `/products` (TC-106-22, TC-106-23, BUG-106-05, BUG-106-06)
  assert.match(categoryServiceCode, /api\.get\('\/products\/categories'\)/, 'categoryService phải gọi GET /products/categories');
  assert.match(productServiceCode, /api\.get\('\/products'/, 'productService phải gọi GET /products');

  // 3. Kiểm tra xử lý PagedResponse từ Backend & ánh xạ stockQuantity / keyword / category (TC-106-24, TC-106-25, BUG-106-07)
  assert.match(productServiceCode, /extractPagedProducts/, 'productService phải bóc tách PagedResponse ({ content, pageNumber, pageSize, totalElements, totalPages })');
  assert.match(productServiceCode, /product\.stockQuantity \?\? product\.stock/, 'productService phải ánh xạ trường stockQuantity của Backend sang stock');
  assert.match(productServiceCode, /queryParams\.keyword = keyword/, 'productService phải gửi tham số keyword khớp với Backend ProductController');
  assert.match(productServiceCode, /queryParams\.category = category/, 'productService phải gửi tham số category khớp với Backend ProductController');

  // 4. Kiểm tra Backend ProductController đã sửa lỗi import Java và hỗ trợ lọc category (BUG-106-11)
  assert.doesNotMatch(productControllerJava, /import main\.java\./, 'ProductController.java không được chứa import sai main.java.* (đã sửa BUG-106-11)');
  assert.doesNotMatch(productControllerJava, /java\.nio\.file\.AccessDeniedException/, 'ProductController.java phải dùng com.ecommerce.product.exception.AccessDeniedException');
  assert.match(productControllerJava, /@RequestParam\(value = "category", required = false\) String category/, 'ProductController.java phải hỗ trợ lọc theo @RequestParam category');
  assert.match(productRepoJava, /searchActiveProductsByKeywordAndCategory/, 'ProductRepository.java phải có truy vấn lọc kết hợp keyword và category');

  // 5. Kiểm tra quyền truy cập Guest không cần JWT và cấu hình CORS trên API Gateway (TC-106-26)
  assert.match(gatewayYaml, /id: product-service-public[\s\S]*?Path=\/api\/v1\/products\/\*\*[\s\S]*?Method=GET/, 'API Gateway phải mở public GET /api/v1/products/** cho Guest không cần JWT');
  assert.match(gatewayYaml, /http:\/\/localhost:5173/, 'API Gateway phải cấu hình CORS cho phép Frontend');
});
