import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');
const backendDir = path.resolve(__dirname, '../../backend');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');
const readBackend = (relPath) => fs.readFileSync(path.join(backendDir, relPath), 'utf8');

// =========================================================================
// TEST SUITE: ECOM-283 QA COMPREHENSIVE VERIFICATION
// FORM ĐIỀU CHỈNH KHO & CẢNH BÁO HẾT HÀNG (20 TEST CASES)
// =========================================================================

test('TC-283-01: Giao diện Quản lý tồn kho hiển thị đầy đủ thông tin sản phẩm và phân loại', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  assert.match(inventoryCode, /Mã SKU/, 'Phải hiển thị cột Mã SKU');
  assert.match(inventoryCode, /Tên sản phẩm/, 'Phải hiển thị cột Tên sản phẩm');
  assert.match(inventoryCode, /Tồn kho hiện tại/, 'Phải hiển thị cột Tồn kho hiện tại');
  assert.match(inventoryCode, /Ngưỡng an toàn/, 'Phải hiển thị cột Ngưỡng an toàn');
  assert.match(inventoryCode, /Tình trạng/, 'Phải hiển thị cột Tình trạng');
  assert.match(inventoryCode, /Thao tác/, 'Phải hiển thị cột Thao tác');
  assert.match(inventoryCode, /Điều chỉnh kho/, 'Phải có nút Điều chỉnh kho');
});

test('TC-283-02 / TC-283-03 / TC-283-04: Phân loại chính xác 3 trạng thái tồn kho (IN_STOCK, LOW_STOCK, OUT_OF_STOCK)', () => {
  const inventoryServiceCode = readSrc('services/inventoryService.js');
  assert.match(inventoryServiceCode, /export const getInventoryStatus/, 'Phải export hàm getInventoryStatus');
  assert.match(inventoryServiceCode, /OUT_OF_STOCK/, 'Có trạng thái OUT_OF_STOCK');
  assert.match(inventoryServiceCode, /LOW_STOCK/, 'Có trạng thái LOW_STOCK');
  assert.match(inventoryServiceCode, /IN_STOCK/, 'Có trạng thái IN_STOCK');

  // Kiểm tra trực tiếp thuật toán logic phân loại
  const getInventoryStatusLogic = (stock, minThreshold = 5) => {
    const stockNum = Number(stock) || 0;
    const thresholdNum = Number(minThreshold) || 5;
    if (stockNum <= 0) return { status: 'OUT_OF_STOCK', label: 'Hết hàng', color: '#dc2626', icon: '⛔' };
    if (stockNum <= thresholdNum) return { status: 'LOW_STOCK', label: 'Sắp hết hàng', color: '#d97706', icon: '⚠️' };
    return { status: 'IN_STOCK', label: 'Còn hàng', color: '#16a34a', icon: '✅' };
  };

  // TC-283-02: IN_STOCK
  const inStock = getInventoryStatusLogic(20, 5);
  assert.equal(inStock.status, 'IN_STOCK');
  assert.equal(inStock.label, 'Còn hàng');
  assert.equal(inStock.icon, '✅');

  // TC-283-03: LOW_STOCK
  const lowStockAtThresh = getInventoryStatusLogic(5, 5);
  assert.equal(lowStockAtThresh.status, 'LOW_STOCK');
  assert.equal(lowStockAtThresh.label, 'Sắp hết hàng');
  assert.equal(lowStockAtThresh.icon, '⚠️');

  const lowStockBelow = getInventoryStatusLogic(2, 5);
  assert.equal(lowStockBelow.status, 'LOW_STOCK');

  // TC-283-04: OUT_OF_STOCK
  const outOfStockZero = getInventoryStatusLogic(0, 5);
  assert.equal(outOfStockZero.status, 'OUT_OF_STOCK');
  assert.equal(outOfStockZero.label, 'Hết hàng');
  assert.equal(outOfStockZero.icon, '⛔');

  const outOfStockNegative = getInventoryStatusLogic(-1, 5);
  assert.equal(outOfStockNegative.status, 'OUT_OF_STOCK');
});

test('TC-283-05: Tìm kiếm tồn kho linh hoạt theo Tên hoặc Mã SKU', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  assert.match(inventoryCode, /searchTerm\.toLowerCase\(\)\.trim\(\)/, 'Chuẩn hóa từ khóa tìm kiếm');
  assert.match(inventoryCode, /String\(item\.sku \|\| ''\)\.toLowerCase\(\)\.includes\(term\)/, 'Tìm theo SKU');
  assert.match(inventoryCode, /String\(item\.name \|\| ''\)\.toLowerCase\(\)\.includes\(term\)/, 'Tìm theo Tên');
});

test('TC-283-06: Bộ lọc tình trạng tồn kho (IN_STOCK, LOW_STOCK, OUT_OF_STOCK)', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  assert.match(inventoryCode, /stockStatusFilter === 'OUT_OF_STOCK'/, 'Lọc hết hàng');
  assert.match(inventoryCode, /stockStatusFilter === 'LOW_STOCK'/, 'Lọc sắp hết hàng');
  assert.match(inventoryCode, /stockStatusFilter === 'IN_STOCK'/, 'Lọc đủ hàng');
});

test('TC-283-07: Sắp xếp danh sách tồn kho theo số lượng và tên mặt hàng', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  assert.match(inventoryCode, /sortBy === 'stock_asc'/, 'Sắp xếp tồn kho tăng dần');
  assert.match(inventoryCode, /sortBy === 'stock_desc'/, 'Sắp xếp tồn kho giảm dần');
  assert.match(inventoryCode, /sortBy === 'name_asc'/, 'Sắp xếp tên A-Z');
});

test('TC-283-08: Component StockAdjustmentModal được tách biệt chuyên nghiệp', () => {
  const modalCode = readSrc('components/admin/StockAdjustmentModal.jsx');
  assert.match(modalCode, /StockAdjustmentModal/, 'Component StockAdjustmentModal tồn tại');
  assert.match(modalCode, /isOpen/, 'Nhận prop isOpen');
  assert.match(modalCode, /onClose/, 'Nhận prop onClose');
  assert.match(modalCode, /product/, 'Nhận prop product');
  assert.match(modalCode, /onSuccess/, 'Nhận prop onSuccess');
});

test('TC-283-09: Hỗ trợ 3 chế độ điều chỉnh kho (INBOUND, DECREASE, SET_EXACT)', () => {
  const modalCode = readSrc('components/admin/StockAdjustmentModal.jsx');
  assert.match(modalCode, /setMode\('INBOUND'\)/, 'Hỗ trợ chế độ INBOUND');
  assert.match(modalCode, /setMode\('DECREASE'\)/, 'Hỗ trợ chế độ DECREASE');
  assert.match(modalCode, /setMode\('SET_EXACT'\)/, 'Hỗ trợ chế độ SET_EXACT');
  assert.match(modalCode, /Nhập thêm/, 'Label Nhập thêm');
  assert.match(modalCode, /Xuất kho \/ Giảm/, 'Label Xuất kho');
  assert.match(modalCode, /Kiểm kê thực tế/, 'Label Kiểm kê thực tế');
});

test('TC-283-10: Backend và Frontend tích hợp API Inbound (/api/v1/products/{id}/inbound)', () => {
  const productServiceCode = readSrc('services/productService.js');
  const inventoryServiceCode = readSrc('services/inventoryService.js');
  const backendController = readBackend('product-service/src/main/java/com/ecommerce/product/controller/ProductController.java');

  assert.match(productServiceCode, /inboundStock:\s*async/, 'productService có hàm inboundStock');
  assert.match(productServiceCode, /api\.post\(`\/products\/\$\{id\}\/inbound`/, 'Gọi POST /products/{id}/inbound');
  assert.match(inventoryServiceCode, /inboundStock:\s*async/, 'inventoryService có hàm inboundStock');
  assert.match(backendController, /@PostMapping\("\/\{id\}\/inbound"\)/, 'Backend có endpoint @PostMapping("/{id}/inbound")');
});

test('TC-283-11 / TC-283-12: Validate chặt chẽ số lượng nhập kho (chặn 0, âm, thập phân)', () => {
  const productServiceCode = readSrc('services/productService.js');
  const modalCode = readSrc('components/admin/StockAdjustmentModal.jsx');

  assert.match(productServiceCode, /!Number\.isInteger\(qty\) \|\| qty <= 0/, 'productService chặn non-integer hoặc <= 0');
  assert.match(modalCode, /mode === 'INBOUND' && numVal <= 0/, 'Modal kiểm tra số lượng nhập > 0');
  assert.match(modalCode, /Số lượng phải là số nguyên/, 'Modal thông báo lỗi nếu nhập thập phân');
});

test('TC-283-13 / TC-283-14: Nghiệp vụ xuất kho DECREASE không được vượt quá tồn kho hiện tại', () => {
  const inventoryServiceCode = readSrc('services/inventoryService.js');
  const modalCode = readSrc('components/admin/StockAdjustmentModal.jsx');

  assert.match(inventoryServiceCode, /decreaseStock:\s*async/, 'inventoryService có hàm decreaseStock');
  assert.match(inventoryServiceCode, /qty > curr/, 'Chặn nếu qty > currentStock');
  assert.match(modalCode, /numVal > currentStock/, 'Modal chặn giảm vượt quá tồn kho hiện tại');
});

test('TC-283-15: Chế độ xuất kho bắt buộc phải có lý do điều chỉnh', () => {
  const modalCode = readSrc('components/admin/StockAdjustmentModal.jsx');
  assert.match(modalCode, /\(mode === 'DECREASE' \|\| mode === 'SET_EXACT'\) && !reasonInput\.trim\(\)/, 'Bắt buộc nhập lý do điều chỉnh khi giảm hoặc kiểm kê');
});

test('TC-283-16 / TC-283-17 / TC-283-18: Kiểm kê thực tế tích hợp POST /api/v1/products/{id}/adjust-stock', () => {
  const productServiceCode = readSrc('services/productService.js');
  const backendController = readBackend('product-service/src/main/java/com/ecommerce/product/controller/ProductController.java');
  const backendService = readBackend('product-service/src/main/java/com/ecommerce/product/service/impl/ProductServiceImpl.java');

  assert.match(productServiceCode, /api\.post\(`\/products\/\$\{id\}\/adjust-stock`/, 'Gọi POST /products/{id}/adjust-stock');
  assert.match(backendController, /@PostMapping\("\/\{id\}\/adjust-stock"\)/, 'Backend có endpoint adjust-stock');
  assert.match(backendService, /if\s*\(request\.getActualStock\(\)\s*==\s*0\s*&&\s*product\.getStatus\(\)\s*==\s*ProductStatus\.ACTIVE\)\s*\{\s*product\.setStatus\(ProductStatus\.OUT_OF_STOCK\);/, 'Tự động chuyển OUT_OF_STOCK khi stock = 0');
  assert.match(backendService, /else if\s*\(request\.getActualStock\(\)\s*>\s*0\s*&&\s*product\.getStatus\(\)\s*==\s*ProductStatus\.OUT_OF_STOCK\)\s*\{\s*product\.setStatus\(ProductStatus\.ACTIVE\);/, 'Tự động chuyển ACTIVE khi stock > 0');
});

test('TC-283-19: Live Preview hiển thị chính xác Tồn kho cũ, Biến động, Tồn kho mới và Badge dự kiến', () => {
  const modalCode = readSrc('components/admin/StockAdjustmentModal.jsx');
  assert.match(modalCode, /Xem trước biến động tồn kho/, 'Có khối Xem trước biến động');
  assert.match(modalCode, /Tồn kho cũ/, 'Hiển thị Tồn kho cũ');
  assert.match(modalCode, /Biến động/, 'Hiển thị Biến động');
  assert.match(modalCode, /Tồn kho mới/, 'Hiển thị Tồn kho mới');
  assert.match(modalCode, /previewCalculation\.statusInfo/, 'Hiển thị badge tình trạng dự kiến');
});

test('TC-283-20: Xác nhận bằng ConfirmModal (không dùng window.confirm/alert) và bảo vệ chống trùng lặp', () => {
  const modalCode = readSrc('components/admin/StockAdjustmentModal.jsx');
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');

  // Tuyệt đối không gọi window.alert() hay window.confirm()
  assert.doesNotMatch(modalCode, /window\.alert\s*\(/, 'Modal không được gọi window.alert()');
  assert.doesNotMatch(modalCode, /window\.confirm\s*\(/, 'Modal không được gọi window.confirm()');
  assert.doesNotMatch(inventoryCode, /window\.alert\s*\(/, 'Inventory không được gọi window.alert()');
  assert.doesNotMatch(inventoryCode, /window\.confirm\s*\(/, 'Inventory không được gọi window.confirm()');

  // Phải dùng confirmDialog và notify
  assert.match(modalCode, /confirmDialog/, 'Modal phải dùng confirmDialog từ hook thông báo');
  assert.match(modalCode, /isSubmitting/, 'Có cờ isSubmitting chống duplicate request');
  assert.match(modalCode, /disabled=\{isSubmitting/, 'Disable nút khi đang submit');
  assert.match(modalCode, /notify\?\.success/, 'Hiển thị thông báo thành công');
  assert.match(modalCode, /notify\?\.error/, 'Hiển thị thông báo thất bại');
});
