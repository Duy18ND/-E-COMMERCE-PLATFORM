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
// ECOM-303: [FE] QA Test - UI, responsive, lỗi và tích hợp (Flash Sale)
// Parent Task: ECOM-297 | Feature: ECOM-157 | Sprint 2
// ============================================================================

test('TC-303-01: Trang Khách hàng FlashSale.jsx hiển thị Banner, Đồng hồ đếm ngược, Khung giờ và Lưới sản phẩm', () => {
  const flashSalePage = readSrc('pages/customer/FlashSale.jsx');
  assert.match(flashSalePage, /import FlashCountdown from '\.\.\/\.\.\/components\/sale\/FlashCountdown'/, 'Import FlashCountdown');
  assert.match(flashSalePage, /import FlashSaleProductCard from '\.\.\/\.\.\/components\/sale\/FlashSaleProductCard'/, 'Import FlashSaleProductCard');
  assert.match(flashSalePage, /saleService\.getActiveFlashProducts\(/, 'Tải danh sách sản phẩm Flash Sale từ saleService');
  assert.match(flashSalePage, /saleService\.getTimeSlots\(/, 'Hiển thị các khung giờ Flash Sale (Time Slots)');
  assert.match(flashSalePage, /<FlashCountdown/, 'Render đồng hồ đếm ngược FlashCountdown');
  assert.match(flashSalePage, /<FlashSaleProductCard/, 'Render thẻ sản phẩm FlashSaleProductCard');
});

test('TC-303-02: Đồng hồ đếm ngược FlashCountdown.jsx tính toán thời gian thực, chặn số âm và dọn dẹp bộ nhớ (clearInterval)', () => {
  const countdownCode = readSrc('components/sale/FlashCountdown.jsx');
  assert.match(countdownCode, /difference <= 0/, 'Chặn thời gian đếm ngược không bị âm khi hết giờ');
  assert.match(countdownCode, /setInterval\(/, 'Sử dụng setInterval cập nhật mỗi giây');
  assert.match(countdownCode, /clearInterval\(timer\)/, 'Dọn dẹp timer trong cleanup useEffect tránh rò rỉ bộ nhớ');
  assert.match(countdownCode, /padStart\(2,\s*'0'\)/, 'Định dạng Giờ - Phút - Giây 2 chữ số');
});

test('TC-303-03: Thẻ sản phẩm FlashSaleProductCard.jsx hiển thị Giá gốc, Giá giảm, % Giảm và Thanh tiến độ (Progress Bar)', () => {
  const cardCode = readSrc('components/sale/FlashSaleProductCard.jsx');
  assert.match(cardCode, /formatCurrency\(salePrice\)/, 'Hiển thị giá Flash Sale');
  assert.match(cardCode, /formatCurrency\(originalPrice\)/, 'Hiển thị giá gốc gạch ngang');
  assert.match(cardCode, /-\{discountPercent\}%/, 'Hiển thị badge phần trăm giảm giá');
  assert.match(cardCode, /Đã bán \{sold\}\/\{totalStock\}/, 'Hiển thị số lượng đã bán / tổng suất');
  assert.match(cardCode, /width:\s*`\$\{progressPercent\}%`/, 'Hiển thị thanh tiến độ phần trăm đã bán');
});

test('TC-303-04: FlashSaleProductCard.jsx khóa nút Mua ngay và Thêm vào giỏ khi sản phẩm hết suất (isSoldOut) hoặc tài khoản Admin', () => {
  const cardCode = readSrc('components/sale/FlashSaleProductCard.jsx');
  assert.match(cardCode, /const isSoldOut =/, 'Tính toán cờ isSoldOut khi hết suất Flash Sale');
  assert.match(cardCode, /sold >= totalStock \|\|/, 'Kiểm tra sold >= totalStock');
  assert.match(cardCode, /disabled=\{isAdmin \|\| isSoldOut\}/, 'Disable nút khi là Admin hoặc đã hết suất');
  assert.match(cardCode, /\{isSoldOut \? 'Đã cháy hàng' : 'Mua ngay'\}/, 'Hiển thị nhãn Đã cháy hàng khi hết suất');
});

test('TC-303-05: Sửa lỗi nghiêm trọng ReferenceError trong AdminSales.jsx — Khai báo đầy đủ const { notify, confirmDialog } = useNotification()', () => {
  const adminSalesCode = readSrc('pages/admin/AdminSales.jsx');
  assert.match(adminSalesCode, /import useNotification from '\.\.\/\.\.\/hooks\/useNotification'/, 'Import useNotification');
  assert.match(adminSalesCode, /const\s+\{\s*notify,\s*confirmDialog\s*\}\s*=\s*useNotification\(\)/, 'Phải destructure notify và confirmDialog từ useNotification()');
  const notifyDecls = adminSalesCode.match(/const\s+\{\s*notify\b/g) || [];
  assert.equal(notifyDecls.length, 1, 'Chỉ khai báo notify đúng 1 lần trong AdminSales.jsx');
});

test('TC-303-06: Sửa lỗi nghiêm trọng ReferenceError trong AdminSaleForm.jsx — Khai báo đầy đủ const { notify } = useNotification()', () => {
  const adminSaleFormCode = readSrc('pages/admin/AdminSaleForm.jsx');
  assert.match(adminSaleFormCode, /import useNotification from '\.\.\/\.\.\/hooks\/useNotification'/, 'Import useNotification');
  assert.match(adminSaleFormCode, /const\s+\{\s*notify\s*\}\s*=\s*useNotification\(\)/, 'Phải destructure notify từ useNotification() trong AdminSaleForm');
  const notifyDecls = adminSaleFormCode.match(/const\s+\{\s*notify\b/g) || [];
  assert.equal(notifyDecls.length, 1, 'Chỉ khai báo notify đúng 1 lần trong AdminSaleForm.jsx');
});

test('TC-303-07: AdminSales.jsx hỗ trợ quản lý danh sách chiến dịch, thống kê, bật/tắt trạng thái và xóa chiến dịch có xác nhận', () => {
  const adminSalesCode = readSrc('pages/admin/AdminSales.jsx');
  assert.match(adminSalesCode, /saleService\.getAllCampaigns\(\)/, 'Tải danh sách chiến dịch');
  assert.match(adminSalesCode, /saleService\.toggleCampaignStatus\(/, 'Hỗ trợ bật/tắt trạng thái chiến dịch');
  assert.match(adminSalesCode, /saleService\.deleteCampaign\(/, 'Hỗ trợ xóa chiến dịch');
  assert.match(adminSalesCode, /await confirmDialog\(/, 'Xác nhận bằng confirmDialog trước khi xóa');
});

test('TC-303-08: AdminSaleForm.jsx kiểm tra hợp lệ chặt chẽ Thời gian bắt đầu/kết thúc, Giới hạn mua, Giá giảm và Số suất (Quota)', () => {
  const formCode = readSrc('pages/admin/AdminSaleForm.jsx');
  assert.match(formCode, /if \(!formData\.name\.trim\(\)\)/, 'Kiểm tra tên chiến dịch không rỗng');
  assert.match(formCode, /if \(new Date\(formData\.endTime\) <= new Date\(formData\.startTime\)\)/, 'Kiểm tra endTime > startTime');
  assert.match(formCode, /Number\(formData\.userLimit\) < 1/, 'Kiểm tra giới hạn mua >= 1');
  assert.match(formCode, /Number\(p\.salePrice\) <= 0 \|\| Number\(p\.salePrice\) >= Number\(p\.originalPrice\)/, 'Kiểm tra 0 < salePrice < originalPrice');
  assert.match(formCode, /Number\(p\.quota\) < 1/, 'Kiểm tra số suất Flash Sale (quota) >= 1');
});

test('TC-303-09: AdminSaleForm.jsx cho phép chỉnh sửa trực tiếp cả Giá Flash Sale và Số suất (Quota) cho từng sản phẩm', () => {
  const formCode = readSrc('pages/admin/AdminSaleForm.jsx');
  assert.match(formCode, /const handlePriceChange = \(prodId, newSalePrice\) =>/, 'Có hàm cập nhật giá giảm handlePriceChange');
  assert.match(formCode, /const handleQuotaChange = \(prodId, newQuota\) =>/, 'Có hàm cập nhật số suất handleQuotaChange');
  assert.match(formCode, />SỐ SUẤT \(QUOTA\)</, 'Hiển thị cột SỐ SUẤT (QUOTA) trong bảng chọn sản phẩm');
});

test('TC-303-10: Tích hợp saleService.js đồng bộ dữ liệu hai chiều giữa Frontend và Backend API (/flash-sales, /admin/flash-sales)', () => {
  const serviceCode = readSrc('services/saleService.js');
  assert.match(serviceCode, /api\.get\('\/flash-sales\/active'\)/, 'Gọi GET /flash-sales/active');
  assert.match(serviceCode, /api\.get\('\/admin\/flash-sales\/campaigns'\)/, 'Gọi GET /admin/flash-sales/campaigns');
  assert.match(serviceCode, /api\.post\('\/admin\/flash-sales\/campaigns'/, 'Gọi POST /admin/flash-sales/campaigns khi tạo chiến dịch');
  assert.match(serviceCode, /\/admin\/flash-sales\/campaigns\/\$\{/, 'Gọi API cập nhật/trạng thái/xóa chiến dịch theo ID');
});

test('TC-303-11: Kiểm thử logic ánh xạ DTO buildBackendCampaignRequest và normalizeCampaignResponse trong saleService.js', () => {
  const serviceCode = readSrc('services/saleService.js');
  assert.match(serviceCode, /const buildBackendCampaignRequest = \(campaignData\) =>/, 'Có hàm buildBackendCampaignRequest chuẩn hóa request gửi lên Backend');
  assert.match(serviceCode, /flashSalePrice:\s*Number\(item\.flashSalePrice \?\? item\.salePrice/, 'Ánh xạ salePrice sang flashSalePrice cho Backend');
  assert.match(serviceCode, /quantity:\s*Math\.max\(1,\s*Number\(item\.quantity \?\? item\.quota/, 'Ánh xạ quota sang quantity cho Backend');
  assert.match(serviceCode, /export const normalizeCampaignResponse = \(camp\) =>/, 'Có hàm normalizeCampaignResponse ánh xạ response từ Backend');
});

test('TC-303-12: Kiểm tra Responsive Layout cho Trang Flash Sale Khách hàng và Trang Quản lý Sale Admin', () => {
  const customerPage = readSrc('pages/customer/FlashSale.jsx');
  const adminForm = readSrc('pages/admin/AdminSaleForm.jsx');
  const globalCss = readSrc('styles/global.css');
  assert.match(customerPage, /className="product-grid"/, 'Sử dụng lưới responsive product-grid cho danh sách sản phẩm Flash Sale');
  assert.match(adminForm, /className="table-responsive"/, 'Bảng chọn sản phẩm trong AdminSaleForm có table-responsive');
  assert.match(globalCss, /\.product-grid/, 'Có định nghĩa responsive cho .product-grid trong global.css');
});

test('TC-303-13: Định tuyến Public (/flash-sale) và Admin (/admin/sales, /admin/sales/new, /admin/sales/:id/edit) trong AppRoutes.jsx', () => {
  const appRoutes = readSrc('routes/AppRoutes.jsx');
  assert.match(appRoutes, /<Route path="\/flash-sale" element=\{<FlashSale \/>\} \/>/, 'Có route public /flash-sale');
  assert.match(appRoutes, /path="\/admin\/sales"[\s\S]*?<AdminSales \/>/, 'Có route /admin/sales trong AdminRoute');
  assert.match(appRoutes, /path="\/admin\/sales\/new"[\s\S]*?<AdminSaleForm \/>/, 'Có route /admin/sales/new trong AdminRoute');
  assert.match(appRoutes, /path="\/admin\/sales\/:id\/edit"[\s\S]*?<AdminSaleForm \/>/, 'Có route /admin/sales/:id/edit trong AdminRoute');
});

test('TC-303-14: Tích hợp Backend FlashSaleController (Public & Admin endpoints yêu cầu ROLE_ADMIN)', () => {
  const controllerCode = readBackend('product-service/src/main/java/com/ecommerce/product/controller/FlashSaleController.java');
  assert.match(controllerCode, /@GetMapping\("\/api\/v1\/flash-sales\/active"\)/, 'FlashSaleController có endpoint public /api/v1/flash-sales/active');
  assert.match(controllerCode, /@PostMapping\("\/api\/v1\/admin\/flash-sales\/campaigns"\)/, 'FlashSaleController có endpoint tạo chiến dịch cho Admin');
  assert.match(controllerCode, /requireAdminRole\(userRoles\)/, 'Kiểm tra quyền ROLE_ADMIN qua requireAdminRole');
});

test('TC-303-15: Xử lý Empty State trên trang FlashSale Khách hàng khi bộ lọc không có sản phẩm phù hợp', () => {
  const customerPage = readSrc('pages/customer/FlashSale.jsx');
  assert.match(customerPage, /Không có sản phẩm trong bộ lọc này/, 'Hiển thị thông báo Empty state khi không có sản phẩm khớp bộ lọc');
  assert.match(customerPage, /Xem tất cả sản phẩm/, 'Có nút Xem tất cả sản phẩm để khôi phục danh sách deal');
});

test('TC-303-16: Đảm bảo an toàn Lint/CI cho toàn bộ module Flash Sale (không dùng window.alert/confirm, không khai báo trùng notify)', () => {
  for (const relPath of [
    'pages/customer/FlashSale.jsx',
    'pages/admin/AdminSales.jsx',
    'pages/admin/AdminSaleForm.jsx',
    'components/sale/FlashCountdown.jsx',
    'components/sale/FlashSaleProductCard.jsx'
  ]) {
    const code = readSrc(relPath);
    assert.doesNotMatch(code, /window\.(alert|confirm|prompt)\s*\(/, `${relPath} không được dùng window.alert/confirm/prompt`);
    const notifyMatches = code.match(/const\s+\{\s*notify\b/g) || [];
    assert.ok(notifyMatches.length <= 1, `${relPath} không được khai báo trùng biến notify`);
  }
});
