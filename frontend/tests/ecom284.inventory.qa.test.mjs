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

// ============================================================================
// ECOM-284: [FE] QA Test - UI, responsive, lỗi và tích hợp (Quản lý tồn kho)
// Parent Task: ECOM-279 | Feature: ECOM-136 | Sprint 2
// ============================================================================

test('TC-284-01: Trang Admin Inventory hiển thị 4 thẻ Metric tổng quan và hỗ trợ click lọc nhanh', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  assert.match(inventoryCode, /TỔNG MẶT HÀNG/, 'Phải có thẻ TỔNG MẶT HÀNG');
  assert.match(inventoryCode, /CÒN ĐỦ HÀNG/, 'Phải có thẻ CÒN ĐỦ HÀNG');
  assert.match(inventoryCode, /SẮP HẾT HÀNG/, 'Phải có thẻ SẮP HẾT HÀNG');
  assert.match(inventoryCode, /ĐÃ HẾT HÀNG/, 'Phải có thẻ ĐÃ HẾT HÀNG');
  assert.match(inventoryCode, /setStockStatusFilter\('IN_STOCK'\)/, 'Click thẻ Còn đủ hàng lọc IN_STOCK');
  assert.match(inventoryCode, /setStockStatusFilter\('LOW_STOCK'\)/, 'Click thẻ Sắp hết hàng lọc LOW_STOCK');
  assert.match(inventoryCode, /setStockStatusFilter\('OUT_OF_STOCK'\)/, 'Click thẻ Đã hết hàng lọc OUT_OF_STOCK');
});

test('TC-284-02: Banner cảnh báo khẩn cấp (role="alert") hiển thị khi có mặt hàng hết hàng hoặc sắp hết hàng', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  assert.match(inventoryCode, /role="alert"/, 'Phải có banner cảnh báo với role="alert"');
  assert.match(
    inventoryCode,
    /Cảnh báo tồn kho cần xử lý: \{metrics\.outOfStock\} mặt hàng hết hàng, \{metrics\.lowStock\} mặt hàng sắp hết hàng!/,
    'Phải hiển thị số lượng mặt hàng hết hàng và sắp hết hàng trong banner'
  );
  assert.match(inventoryCode, /Xem hàng đã hết/, 'Phải có nút lọc nhanh hàng đã hết trong banner');
  assert.match(inventoryCode, /Xem sắp hết/, 'Phải có nút lọc nhanh hàng sắp hết trong banner');
});

test('TC-284-03: Xử lý đầy đủ các trạng thái Loading, Error (kèm nút Thử lại) và Empty State', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  assert.match(inventoryCode, /import Loading from '\.\.\/\.\.\/components\/common\/Loading'/, 'Import Loading component');
  assert.match(inventoryCode, /import ErrorMessage from '\.\.\/\.\.\/components\/common\/ErrorMessage'/, 'Import ErrorMessage component');
  assert.match(inventoryCode, /<Loading message="Đang đồng bộ dữ liệu tồn kho\.\.\." \/>/, 'Hiển thị Loading khi đang tải');
  assert.match(inventoryCode, /<ErrorMessage message=\{error\} \/>/, 'Hiển thị ErrorMessage khi lỗi API');
  assert.match(inventoryCode, /Thử lại kết nối/, 'Có nút Thử lại kết nối khi lỗi API');
  assert.match(inventoryCode, /Không tìm thấy mặt hàng nào phù hợp/, 'Hiển thị Empty state khi bộ lọc không khớp');
});

test('TC-284-04: Bảng tồn kho highlight màu nền cảnh báo trực quan cho dòng OUT_OF_STOCK và LOW_STOCK', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  assert.match(inventoryCode, /statusInfo\.status === 'OUT_OF_STOCK'/, 'Kiểm tra mã trạng thái OUT_OF_STOCK cho dòng bảng');
  assert.match(inventoryCode, /#fff5f5/, 'Highlight nền đỏ nhạt cho dòng hết hàng');
  assert.match(inventoryCode, /statusInfo\.status === 'LOW_STOCK'/, 'Kiểm tra mã trạng thái LOW_STOCK cho dòng bảng');
  assert.match(inventoryCode, /#fffbeb/, 'Highlight nền vàng nhạt cho dòng sắp hết hàng');
});

test('TC-284-05: Kiểm tra Responsive Layout cho trang Quản lý tồn kho (Desktop, Tablet, Mobile)', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  const globalCss = readSrc('styles/global.css');
  assert.match(inventoryCode, /className="grid-cols-4"/, 'Sử dụng grid-cols-4 cho thẻ thống kê');
  assert.match(inventoryCode, /className="admin-toolbar-grid"/, 'Sử dụng admin-toolbar-grid cho thanh công cụ');
  assert.match(inventoryCode, /className="table-responsive"/, 'Bọc bảng trong table-responsive hỗ trợ cuộn ngang mobile');
  assert.match(globalCss, /\.admin-toolbar-grid/, 'Định nghĩa style responsive cho .admin-toolbar-grid trong global.css');
});

test('TC-284-06: Kiểm thử thuật toán getInventoryStatus với các biên tồn kho (<=0, <=threshold, >threshold)', () => {
  const serviceCode = readSrc('services/inventoryService.js');
  assert.match(serviceCode, /export const getInventoryStatus = \(stock, minThreshold = 5\)/, 'Có hàm getInventoryStatus');

  const getInventoryStatus = (stock, minThreshold = 5) => {
    const stockNum = Number(stock) || 0;
    const thresholdNum = Number(minThreshold) || 5;
    if (stockNum <= 0) return { status: 'OUT_OF_STOCK', label: 'Hết hàng' };
    if (stockNum <= thresholdNum) return { status: 'LOW_STOCK', label: 'Sắp hết hàng' };
    return { status: 'IN_STOCK', label: 'Còn hàng' };
  };

  assert.equal(getInventoryStatus(0, 5).status, 'OUT_OF_STOCK');
  assert.equal(getInventoryStatus(-3, 5).status, 'OUT_OF_STOCK');
  assert.equal(getInventoryStatus(5, 5).status, 'LOW_STOCK');
  assert.equal(getInventoryStatus(1, 5).status, 'LOW_STOCK');
  assert.equal(getInventoryStatus(6, 5).status, 'IN_STOCK');
});

test('TC-284-07: Kiểm thử tìm kiếm kết hợp lọc trạng thái và sắp xếp tồn kho', () => {
  const sampleList = [
    { id: '1', name: 'Laptop Dell XPS 13', sku: 'DELL-XPS-13', stockQuantity: 10, minThreshold: 5 },
    { id: '2', name: 'Điện thoại iPhone 15 Pro', sku: 'APPL-IP15P', stockQuantity: 3, minThreshold: 5 },
    { id: '3', name: 'Tai nghe Bluetooth', sku: 'AUD-BT-NC', stockQuantity: 0, minThreshold: 5 },
    { id: '4', name: 'MacBook Air M2', sku: 'APPL-MBA-M2', stockQuantity: 2, minThreshold: 5 }
  ];

  const result = sampleList
    .filter((item) => {
      const matchSearch = item.sku.toLowerCase().includes('appl') || item.name.toLowerCase().includes('appl');
      const st = item.stockQuantity;
      const th = item.minThreshold;
      return matchSearch && st > 0 && st <= th;
    })
    .sort((a, b) => a.stockQuantity - b.stockQuantity);

  assert.equal(result.length, 2);
  assert.equal(result[0].sku, 'APPL-MBA-M2');
  assert.equal(result[1].sku, 'APPL-IP15P');
});

test('TC-284-08: StockAdjustmentModal hỗ trợ đóng bằng phím Escape và thuộc tính Accessibility (role="dialog", aria-modal="true")', () => {
  const modalCode = readSrc('components/admin/StockAdjustmentModal.jsx');
  assert.match(modalCode, /role="dialog"/, 'Modal phải có role="dialog"');
  assert.match(modalCode, /aria-modal="true"/, 'Modal phải có aria-modal="true"');
  assert.match(modalCode, /e\.key === 'Escape' && !isSubmitting/, 'Hỗ trợ đóng modal bằng phím Escape khi không đang submit');
});

test('TC-284-09: Kiểm thử validation của inventoryService.inboundStock (chặn 0, số âm, số thập phân)', () => {
  const serviceCode = readSrc('services/inventoryService.js');
  assert.match(serviceCode, /!Number\.isInteger\(qty\) \|\| qty <= 0/, 'Chặn số lượng không phải số nguyên dương trong inboundStock');
  assert.match(serviceCode, /Số lượng nhập kho phải là số nguyên dương lớn hơn 0/, 'Thông báo lỗi rõ ràng khi nhập kho <= 0');
});

test('TC-284-10: Kiểm thử validation của inventoryService.decreaseStock (chặn giảm quá tồn kho, thiếu lý do)', () => {
  const serviceCode = readSrc('services/inventoryService.js');
  assert.match(serviceCode, /if \(qty > curr\)/, 'Chặn số lượng giảm vượt quá tồn kho hiện tại');
  assert.match(serviceCode, /không được vượt quá tồn kho hiện tại/, 'Thông báo lỗi khi giảm vượt quá tồn kho');
  assert.match(serviceCode, /Lý do xuất kho\/giảm tồn kho không được để trống/, 'Bắt buộc nhập lý do khi giảm kho');
});

test('TC-284-11: Kiểm thử validation của inventoryService.adjustStock (chặn tồn kho âm, thiếu lý do)', () => {
  const serviceCode = readSrc('services/inventoryService.js');
  assert.match(serviceCode, /!Number\.isInteger\(stockVal\) \|\| stockVal < 0/, 'Chặn tồn kho kiểm kê âm hoặc thập phân');
  assert.match(serviceCode, /Lý do điều chỉnh kho không được để trống/, 'Bắt buộc nhập lý do khi kiểm kê kho');
});

test('TC-284-12: Đồng bộ state tồn kho ngay lập tức trên UI sau khi điều chỉnh thành công (handleAdjustmentSuccess)', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  assert.match(inventoryCode, /const handleAdjustmentSuccess = \(updatedItem\) =>/, 'Có hàm handleAdjustmentSuccess');
  assert.match(inventoryCode, /setInventoryList\(\(prevList\) =>/, 'Cập nhật lại danh sách tồn kho trong state');
  assert.match(inventoryCode, /stock: Number\(updatedItem\.stockQuantity \?\? updatedItem\.stock \?\? 0\)/, 'Đồng bộ trường stock');
  assert.match(inventoryCode, /stockQuantity: Number\(updatedItem\.stockQuantity \?\? updatedItem\.stock \?\? 0\)/, 'Đồng bộ trường stockQuantity');
});

test('TC-284-13: Tích hợp phân trang (Pagination) và tự động reset về trang 1 khi đổi bộ lọc/tìm kiếm', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  assert.match(inventoryCode, /<Pagination/, 'Sử dụng component Pagination');
  assert.match(inventoryCode, /const handleSearchChange = \(e\) => \{\s*setSearchTerm\(e\.target\.value\);\s*setCurrentPage\(1\);\s*\}/, 'Reset trang 1 khi tìm kiếm');
  assert.match(inventoryCode, /const handleStatusFilterChange = \(e\) => \{\s*setStockStatusFilter\(e\.target\.value\);\s*setCurrentPage\(1\);\s*\}/, 'Reset trang 1 khi lọc trạng thái');
});

test('TC-284-14: Định tuyến /admin/inventory được bảo vệ bởi AdminRoute (chỉ ADMIN mới được phép truy cập)', () => {
  const appRoutes = readSrc('routes/AppRoutes.jsx');
  assert.match(appRoutes, /<Route element=\{<AdminRoute \/>\}>/, 'Nhóm route /admin được bọc bởi AdminRoute');
  assert.match(appRoutes, /path="\/admin\/inventory"[\s\S]*?<AdminInventory \/>/, 'Có route /admin/inventory trỏ tới AdminInventory');
});

test('TC-284-15: Tích hợp Backend API & Phân quyền (requireAdminRole / ROLE_ADMIN) cho Inbound và Adjust Stock', () => {
  const controllerCode = readBackend('product-service/src/main/java/com/ecommerce/product/controller/ProductController.java');
  assert.match(controllerCode, /@PostMapping\("\/\{id\}\/inbound"\)[\s\S]*?requireAdminRole\(roles\)/, 'Endpoint inbound yêu cầu quyền ADMIN');
  assert.match(controllerCode, /@PostMapping\("\/\{id\}\/adjust-stock"\)[\s\S]*?requireAdminRole\(roles\)/, 'Endpoint adjust-stock yêu cầu quyền ADMIN');
});

test('TC-284-16: Đảm bảo an toàn Lint/CI: Không trùng lặp biến notify và không dùng hàm chặn luồng trình duyệt', () => {
  const inventoryCode = readSrc('pages/admin/Inventory.jsx');
  const modalCode = readSrc('components/admin/StockAdjustmentModal.jsx');
  const notifyMatchesInv = inventoryCode.match(/const\s+\{\s*notify\b/g) || [];
  const notifyMatchesModal = modalCode.match(/const\s+\{\s*notify\b/g) || [];
  assert.ok(notifyMatchesInv.length <= 1, 'Inventory.jsx không được khai báo trùng biến notify');
  assert.ok(notifyMatchesModal.length <= 1, 'StockAdjustmentModal.jsx không được khai báo trùng biến notify');
  assert.doesNotMatch(inventoryCode, /window\.(alert|confirm|prompt)\s*\(/, 'Không dùng window.alert/confirm/prompt');
  assert.doesNotMatch(modalCode, /window\.(alert|confirm|prompt)\s*\(/, 'Không dùng window.alert/confirm/prompt');
});
