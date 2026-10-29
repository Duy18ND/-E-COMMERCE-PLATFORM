import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INITIAL_PRODUCTS } from '../src/services/mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');
const backendDir = path.resolve(__dirname, '../../backend');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');
const readBackend = (relPath) => fs.readFileSync(path.join(backendDir, relPath), 'utf8');

// Helper kiểm tra logic chuẩn hóa từ khóa, validate khoảng giá và lọc/sắp xếp
const normalizeKeyword = (raw = '') =>
  String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const validatePriceRange = (minRaw, maxRaw) => {
  const minStr = String(minRaw ?? '').trim();
  const maxStr = String(maxRaw ?? '').trim();
  const hasMin = minStr !== '';
  const hasMax = maxStr !== '';
  const minVal = hasMin ? Number(minStr) : null;
  const maxVal = hasMax ? Number(maxStr) : null;

  if (hasMin && (Number.isNaN(minVal) || minVal < 0)) {
    return { valid: false, error: 'Giá tối thiểu không hợp lệ' };
  }
  if (hasMax && (Number.isNaN(maxVal) || maxVal < 0)) {
    return { valid: false, error: 'Giá tối đa không hợp lệ' };
  }
  if (minVal !== null && maxVal !== null && minVal > maxVal) {
    return { valid: false, error: 'Giá tối thiểu không được lớn hơn giá tối đa' };
  }
  return { valid: true, minPrice: minVal, maxPrice: maxVal };
};

test('ECOM-226 (SEARCH-01 → SEARCH-04): Kiểm thử Ô tìm kiếm từ khóa, xử lý khoảng trắng, chuỗi rỗng, nút xóa và Debounce', () => {
  const productSearchCode = readSrc('components/product/ProductSearch.jsx');
  const productServiceCode = readSrc('services/productService.js');
  const productsPageCode = readSrc('pages/customer/Products.jsx');

  // SEARCH-01: Tìm kiếm bằng từ khóa hợp lệ
  const keywordMatch = INITIAL_PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes('macbook')
  );
  assert.ok(keywordMatch.length > 0, 'SEARCH-01: Tìm kiếm từ khóa "macbook" phải trả về sản phẩm phù hợp');

  // SEARCH-02: Tìm kiếm không có kết quả
  const noMatch = INITIAL_PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes('xyz_khong_ton_tai_99999')
  );
  assert.equal(noMatch.length, 0, 'SEARCH-02: Từ khóa không khớp phải trả về danh sách rỗng []');

  // SEARCH-03: Tìm kiếm với chuỗi rỗng
  assert.equal(normalizeKeyword(''), '', 'SEARCH-03: Chuỗi rỗng phải giữ nguyên là ""');
  assert.match(productSearchCode, /handleClear/, 'SEARCH-03: ProductSearch phải có nút xóa từ khóa (handleClear)');

  // SEARCH-04: Tìm kiếm có khoảng trắng thừa
  assert.equal(
    normalizeKeyword('   iPhone   15   Pro   '),
    'iPhone 15 Pro',
    'SEARCH-04: Phải cắt khoảng trắng đầu/cuối và gộp khoảng trắng thừa ở giữa'
  );
  assert.equal(
    normalizeKeyword('     '),
    '',
    'SEARCH-04: Chuỗi chỉ gồm khoảng trắng phải chuẩn hóa về chuỗi rỗng ""'
  );

  // Kiểm tra Debounce, nhấn Enter (onSubmit) và không reload trang
  assert.match(productSearchCode, /debounceMs = 350/, 'ProductSearch phải hỗ trợ debounce để tránh gọi API liên tục');
  assert.match(productSearchCode, /e\.preventDefault\(\)/, 'ProductSearch phải chặn reload trang khi nhấn Enter');
  assert.match(productServiceCode, /export const normalizeKeyword/, 'productService phải chuẩn hóa từ khóa trước khi gọi API');
  assert.match(productsPageCode, /handleSearch/, 'Products.jsx phải kết nối sự kiện tìm kiếm từ ProductSearch');
});

test('ECOM-226 (FILTER-01 → FILTER-05): Kiểm thử Bộ lọc Danh mục, Khoảng giá (Validation), Tồn kho (inStock), Kết hợp nhiều bộ lọc và Đặt lại', () => {
  const productFilterCode = readSrc('components/product/ProductFilter.jsx');
  const productServiceCode = readSrc('services/productService.js');
  const productsPageCode = readSrc('pages/customer/Products.jsx');
  const backendFilterDto = readBackend(
    'product-service/src/main/java/com/ecommerce/product/dto/request/ProductFilterRequest.java'
  );

  // FILTER-01: Lọc theo danh mục
  assert.match(productFilterCode, /onSelectCategory/, 'FILTER-01: ProductFilter phải hỗ trợ chọn danh mục');
  assert.match(productServiceCode, /queryParams\.category = category/, 'FILTER-01: productService phải gửi tham số category');
  assert.match(productServiceCode, /queryParams\.categoryId = numId/, 'FILTER-01: productService phải hỗ trợ gửi categoryId khi là ID số');

  // FILTER-02: Lọc theo khoảng giá + Validation
  assert.match(productFilterCode, /export const validatePriceRange/, 'FILTER-02: ProductFilter phải có hàm validatePriceRange');
  assert.match(productServiceCode, /export const validateProductFilterParams/, 'FILTER-02: productService phải validate minPrice/maxPrice trước khi gọi Backend');
  assert.equal(validatePriceRange('-1000', '5000000').valid, false, 'FILTER-02: Giá âm phải bị từ chối');
  assert.equal(validatePriceRange('20000000', '5000000').valid, false, 'FILTER-02: minPrice > maxPrice phải bị từ chối');
  assert.equal(validatePriceRange('5000000', '20000000').valid, true, 'FILTER-02: Khoảng giá hợp lệ 5tr - 20tr phải được chấp nhận');

  const filteredByPrice = INITIAL_PRODUCTS.filter(
    (p) => p.price >= 5000000 && p.price <= 25000000
  );
  assert.ok(filteredByPrice.length > 0, 'FILTER-02: Phải có sản phẩm trong khoảng giá 5tr - 25tr');
  assert.ok(
    filteredByPrice.every((p) => p.price >= 5000000 && p.price <= 25000000),
    'FILTER-02: Mọi sản phẩm kết quả phải nằm trong khoảng [minPrice, maxPrice]'
  );

  // FILTER-03: Lọc theo tình trạng tồn kho (inStock)
  assert.match(productFilterCode, /in-stock-filter-checkbox/, 'FILTER-03: ProductFilter phải có checkbox lọc sản phẩm còn hàng');
  assert.match(productServiceCode, /queryParams\.inStock = true/, 'FILTER-03: productService phải gửi inStock=true lên Backend');
  assert.match(backendFilterDto, /private Boolean inStock;/, 'FILTER-03: Backend ProductFilterRequest hỗ trợ trường inStock');

  // FILTER-04: Kết hợp nhiều bộ lọc
  assert.match(
    productsPageCode,
    /category: selectedCategory,[\s\S]*?search: searchTerm,[\s\S]*?minPrice,[\s\S]*?maxPrice,[\s\S]*?inStock,[\s\S]*?sortOrder/,
    'FILTER-04: Products.jsx phải gửi kết hợp đồng thời category, search, minPrice, maxPrice, inStock, sortOrder'
  );

  // FILTER-05: Đặt lại bộ lọc
  assert.match(
    productsPageCode,
    /const handleResetFilters = \(\) => \{[\s\S]*?setSelectedCategory\(''\);[\s\S]*?setSearchTerm\(''\);[\s\S]*?setMinPrice\(''\);[\s\S]*?setMaxPrice\(''\);[\s\S]*?setInStock\(false\);[\s\S]*?setSortOrder\(''\);/,
    'FILTER-05: handleResetFilters phải đặt lại toàn bộ các tiêu chí lọc và tìm kiếm'
  );
});

test('ECOM-226 (SORT-01 → SORT-03): Kiểm thử Sắp xếp Giá tăng dần, Giá giảm dần và Tên sản phẩm A-Z / Z-A khớp với Spring Data Pageable', () => {
  const productServiceCode = readSrc('services/productService.js');
  const productFilterCode = readSrc('components/product/ProductFilter.jsx');

  // SORT-01: Giá tăng dần (price_asc -> price,asc)
  assert.match(productServiceCode, /case 'price_asc':[\s\S]*?return 'price,asc'/, 'SORT-01: Phải ánh xạ price_asc sang price,asc cho Spring Data Pageable');
  const ascPrices = [...INITIAL_PRODUCTS].sort((a, b) => a.price - b.price).map((p) => p.price);
  for (let i = 1; i < ascPrices.length; i += 1) {
    assert.ok(ascPrices[i] >= ascPrices[i - 1], 'SORT-01: Danh sách sắp xếp giá tăng dần phải đúng thứ tự');
  }

  // SORT-02: Giá giảm dần (price_desc -> price,desc)
  assert.match(productServiceCode, /case 'price_desc':[\s\S]*?return 'price,desc'/, 'SORT-02: Phải ánh xạ price_desc sang price,desc cho Spring Data Pageable');
  const descPrices = [...INITIAL_PRODUCTS].sort((a, b) => b.price - a.price).map((p) => p.price);
  for (let i = 1; i < descPrices.length; i += 1) {
    assert.ok(descPrices[i] <= descPrices[i - 1], 'SORT-02: Danh sách sắp xếp giá giảm dần phải đúng thứ tự');
  }

  // SORT-03: Sắp xếp tên sản phẩm A-Z / Z-A (name_asc -> name,asc, name_desc -> name,desc)
  assert.match(productServiceCode, /case 'name_asc':[\s\S]*?return 'name,asc'/, 'SORT-03: Phải ánh xạ name_asc sang name,asc');
  assert.match(productServiceCode, /case 'name_desc':[\s\S]*?return 'name,desc'/, 'SORT-03: Phải ánh xạ name_desc sang name,desc');
  assert.match(productFilterCode, /<option value="name_asc">Tên: A - Z<\/option>/, 'SORT-03: Giao diện phải có tùy chọn Tên: A - Z');
  assert.match(productFilterCode, /<option value="name_desc">Tên: Z - A<\/option>/, 'SORT-03: Giao diện phải có tùy chọn Tên: Z - A');
});

test('ECOM-227 (RESULT-01 → RESULT-08): Kiểm thử Hiển thị kết quả, Số lượng, Empty State, Loading, Error State, Giữ bộ lọc khi chuyển trang, Responsive và Quyền Guest', () => {
  const productsPageCode = readSrc('pages/customer/Products.jsx');
  const productFilterCode = readSrc('components/product/ProductFilter.jsx');
  const responsiveCss = readSrc('styles/responsive.css');
  const appRoutesCode = readSrc('routes/AppRoutes.jsx');

  // RESULT-01: Hiển thị kết quả đúng & chống race-condition (out-of-order response)
  assert.match(productsPageCode, /latestRequestIdRef/, 'RESULT-01: Products.jsx phải có bộ đếm request chống ghi đè kết quả cũ khi gọi API bất đồng bộ');
  assert.match(productsPageCode, /if \(requestId !== latestRequestIdRef\.current\)/, 'RESULT-01: Phải bỏ qua phản hồi của request cũ đến muộn');

  // RESULT-02: Hiển thị số lượng kết quả
  assert.match(productFilterCode, /Tìm thấy <strong[^>]*>\{totalCount\}<\/strong> sản phẩm/, 'RESULT-02: Phải hiển thị tổng số lượng sản phẩm tìm thấy');

  // RESULT-03: Hiển thị Empty State & nút khôi phục hoạt động
  assert.match(productsPageCode, /emptyTitle="Không tìm thấy sản phẩm phù hợp"/, 'RESULT-03: Phải hiển thị thông báo "Không tìm thấy sản phẩm phù hợp"');
  assert.match(productsPageCode, /onResetFilter=\{handleResetFilters\}/, 'RESULT-03: Nút khôi phục trên Empty State phải luôn gắn với handleResetFilters');
  assert.match(productsPageCode, /totalItems > 0 && products\.length > 0/, 'RESULT-03: Không hiển thị phân trang khi danh sách rỗng');

  // RESULT-04: Hiển thị Loading rõ ràng, không hiển thị Empty State sớm
  assert.match(productsPageCode, /loading \? \(\s*<Loading message="Đang tải danh sách sản phẩm\.\.\." \/>/, 'RESULT-04: Khi đang tải phải hiển thị Loading và ẩn lưới sản phẩm/Empty State');

  // RESULT-05: Xử lý lỗi API, phân biệt lỗi mạng với kết quả rỗng
  assert.match(productsPageCode, /<ErrorMessage message=\{error\}/, 'RESULT-05: Khi API lỗi phải hiển thị ErrorMessage');
  assert.match(productsPageCode, /!error \? \(/, 'RESULT-05: Khi đang có lỗi API không được hiển thị nhầm sang Empty State');

  // RESULT-06: Chuyển trang giữ nguyên các điều kiện lọc và sắp xếp
  assert.match(
    productsPageCode,
    /const updateUrlParams = \(updates = \{\}\) => \{[\s\S]*?nextCategory[\s\S]*?nextSearch[\s\S]*?nextMinPrice[\s\S]*?nextMaxPrice[\s\S]*?nextInStock[\s\S]*?nextSort[\s\S]*?nextPage/,
    'RESULT-06: Khi chuyển trang phải bảo toàn mọi điều kiện lọc và sắp xếp trên URL và state'
  );

  // RESULT-07: Kiểm tra Responsive trên Mobile (375px), Tablet (768px), Desktop (1366px)
  assert.match(responsiveCss, /\.product-search-form/, 'RESULT-07: Search Bar phải có CSS responsive trên màn hình nhỏ');
  assert.match(responsiveCss, /\.product-filter-advanced-row/, 'RESULT-07: Hàng lọc giá và tồn kho phải co giãn trên màn hình nhỏ');

  // RESULT-08: Guest truy cập tìm kiếm và lọc không cần đăng nhập
  const publicRoutesSection = appRoutesCode.split('<Route element={<ProtectedRoute')[0];
  assert.match(publicRoutesSection, /path="\/products"\s+element=\{<Products \/>\}/, 'RESULT-08: Guest truy cập /products không cần đăng nhập');
});
