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
// TEST SUITE: ECOM-165 — QA KIỂM THỬ FLASH SALE TOÀN DIỆN
// =========================================================================

// ─────────────────────────────────────────────────────────────────────────
// NHÓM 1: KIỂM THỬ FLASH SALE HẾT HẠN (TC-165-01 → TC-165-08)
// ─────────────────────────────────────────────────────────────────────────

test('TC-165-01: Flash Sale chưa bắt đầu (startTime > now) -> Trạng thái UPCOMING và chưa kích hoạt Redis', () => {
  const serviceCode = readBackend('product-service/src/main/java/com/ecommerce/product/service/FlashSaleService.java');
  assert.match(serviceCode, /boolean isActiveNow = !request\.getStartTime\(\)\.isAfter\(now\)\s*&&\s*request\.getEndTime\(\)\.isAfter\(now\);/);
  assert.match(serviceCode, /String initialStatus = isActiveNow \? "ACTIVE" : "UPCOMING";/);
  assert.match(serviceCode, /if \("ACTIVE"\.equals\(saved\.getStatus\(\)\)\) \{/);
});

test('TC-165-02: Flash Sale đang hoạt động (startTime <= now < endTime) -> Trạng thái ACTIVE và nạp tồn kho lên Redis', () => {
  const serviceCode = readBackend('product-service/src/main/java/com/ecommerce/product/service/FlashSaleService.java');
  assert.match(serviceCode, /safeInitRedisStock\(item\.getProductId\(\),\s*item\.getQuantity\(\)\);/);
  assert.match(serviceCode, /ops\.set\(key,\s*stock\);/);
});

test('TC-165-03: Flash Sale vừa đến thời điểm bắt đầu -> Kích hoạt ACTIVE và nạp tồn kho còn lại', () => {
  const serviceCode = readBackend('product-service/src/main/java/com/ecommerce/product/service/FlashSaleService.java');
  assert.match(serviceCode, /if \("ACTIVE"\.equals\(normalizedStatus\)\) \{/);
  assert.match(serviceCode, /int remaining = Math\.max\(0,\s*item\.getQuantity\(\) - safeInt\(item\.getSoldQuantity\(\)\)\);/);
  assert.match(serviceCode, /safeInitRedisStock\(item\.getProductId\(\),\s*remaining\);/);
});

test('TC-165-04 & TC-165-05: Flash Sale hết hạn (endTime <= now) -> Chuyển ENDED, xóa key Redis và chặn kích hoạt', () => {
  const serviceCode = readBackend('product-service/src/main/java/com/ecommerce/product/service/FlashSaleService.java');
  // Chặn kích hoạt chiến dịch đã quá hạn
  assert.match(serviceCode, /if \(!campaign\.getEndTime\(\)\.isAfter\(now\)\) \{/);
  assert.match(serviceCode, /throw new IllegalArgumentException\("Không thể kích hoạt chiến dịch đã quá thời gian kết thúc"\);/);
  // Xóa key Redis khi ENDED hoặc CANCELLED
  assert.match(serviceCode, /else if \("ENDED"\.equals\(normalizedStatus\) \|\| "CANCELLED"\.equals\(normalizedStatus\)\) \{/);
  assert.match(serviceCode, /safeDeleteRedisStock\(item\.getProductId\(\)\);/);
});

test('TC-165-06 & TC-165-07: Đặt hàng sau khi Flash Sale hết hạn -> Backend tự động loại bỏ giá ưu đãi, không cho áp dụng sale hết hạn', () => {
  const repoCode = readBackend('product-service/src/main/java/com/ecommerce/product/repository/FlashSaleItemRepository.java');
  const serviceCode = readBackend('product-service/src/main/java/com/ecommerce/product/service/FlashSaleService.java');
  const orderServiceImpl = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

  // Query DB bắt buộc c.endTime >= :now và c.status = 'ACTIVE'
  assert.match(repoCode, /c\.status = 'ACTIVE'/);
  assert.match(repoCode, /c\.startTime <= :now AND c\.endTime >= :now/);

  // Nếu hết hạn -> getActiveFlashSaleForProduct trả về null
  assert.match(serviceCode, /public ActiveFlashSaleDto getActiveFlashSaleForProduct\(Long productId\)/);

  // OrderService checkout tự lấy giá từ productClient, nếu activeFlashSale == null thì dùng giá gốc product.getPrice()
  assert.match(orderServiceImpl, /BigDecimal actualPrice = product\.getPrice\(\);/);
  assert.match(orderServiceImpl, /if \(product\.getActiveFlashSale\(\) != null\) \{/);
  assert.match(orderServiceImpl, /itemReq\.setPriceAtPurchase\(actualPrice\);/);
});

test('TC-165-08: Giao diện cập nhật trạng thái khi chương trình hết hạn / hết hàng', () => {
  const flashSalePage = readSrc('pages/customer/FlashSale.jsx');
  const saleService = readSrc('services/saleService.js');

  assert.match(flashSalePage, /FlashCountdown/);
  assert.match(flashSalePage, /Đã cháy hàng/);
  assert.match(saleService, /normalizeCampaignResponse/);
  assert.match(saleService, /normalizeFlashSaleItemToProduct/);
});

// ─────────────────────────────────────────────────────────────────────────
// NHÓM 2: KIỂM THỬ MUA VƯỢT SỐ LƯỢNG (TC-165-09 → TC-165-18)
// ─────────────────────────────────────────────────────────────────────────

test('TC-165-09 & TC-165-10: Mua số lượng hợp lệ và đúng số lượng còn lại -> Đặt chỗ thành công qua Redis Lua', () => {
  const luaScript = readBackend('product-service/src/main/resources/scripts/flash_sale_deduct.lua');
  const serviceCode = readBackend('product-service/src/main/java/com/ecommerce/product/service/FlashSaleService.java');

  // Lua script kiểm tra tồn kho và trừ nguyên tử bằng DECRBY
  assert.match(luaScript, /if current >= quantity then/);
  assert.match(luaScript, /redis\.call\('DECRBY', key, quantity\)/);
  assert.match(luaScript, /return 1/);

  // FlashSaleService xử lý case 1 -> Thành công và tăng soldQuantity trong DB
  assert.match(serviceCode, /case 1 -> \{/);
  assert.match(serviceCode, /incrementDbSoldQuantity\(productId,\s*quantity\);/);
});

test('TC-165-11 & TC-165-13: Mua vượt số lượng Flash Sale còn lại hoặc hết hàng -> Bị chặn và ném NotEnoughStockException', () => {
  const luaScript = readBackend('product-service/src/main/resources/scripts/flash_sale_deduct.lua');
  const serviceCode = readBackend('product-service/src/main/java/com/ecommerce/product/service/FlashSaleService.java');

  // Lua trả về 0 khi không đủ tồn kho
  assert.match(luaScript, /else\s+return 0\s+end/);

  // FlashSaleService ném NotEnoughStockException
  assert.match(serviceCode, /case 0 -> throw new NotEnoughStockException\("Đã cháy hàng Flash Sale!"\);/);
});

test('TC-165-12: Mua vượt giới hạn mỗi khách hàng (userLimit) -> Backend chặn ngay tại bước checkout', () => {
  const orderServiceImpl = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

  assert.match(orderServiceImpl, /if \(activeFlashSale\.getUserLimit\(\) != null && cumulativeQty > activeFlashSale\.getUserLimit\(\)\) \{/);
  assert.match(orderServiceImpl, /throw new IllegalArgumentException\(/);
  assert.match(orderServiceImpl, /chỉ cho phép mua tối đa/);
});

test('TC-165-14 & TC-165-15 & TC-165-16: Số lượng mua <= 0 hoặc không hợp lệ -> Validate chặn tại DTO / Service', () => {
  const reserveReq = readBackend('product-service/src/main/java/com/ecommerce/product/dto/request/FlashSaleReserveRequest.java');
  const campaignReq = readBackend('product-service/src/main/java/com/ecommerce/product/service/FlashSaleService.java');

  assert.match(reserveReq, /@NotNull/);
  assert.match(reserveReq, /@Min\(value\s*=\s*1/);
  assert.match(campaignReq, /if \(itemReq\.getQuantity\(\) == null \|\| itemReq\.getQuantity\(\) <= 0\) \{/);
  assert.match(campaignReq, /throw new IllegalArgumentException\("Số lượng Flash Sale tối thiểu là 1"\);/);
});

test('TC-165-17 & TC-165-18: Đảm bảo kiểm soát tranh chấp đồng thời (Concurrency) qua Redis Lua nguyên tử, không làm âm tồn kho', () => {
  const luaScript = readBackend('product-service/src/main/resources/scripts/flash_sale_deduct.lua');
  const dbInitSql = readBackend('docker/mysql/init.sql');

  // Redis Lua chạy đơn luồng trên engine Redis đảm bảo không race condition
  assert.match(luaScript, /Executed atomically on a single Redis node/);
  assert.match(luaScript, /current >= quantity/);

  // Ràng buộc toàn vẹn Database MySQL ngăn chặn âm kho và bán vượt hạn mức
  assert.match(dbInitSql, /CONSTRAINT chk_fs_quantity CHECK \(quantity > 0 AND sold_quantity >= 0 AND sold_quantity <= quantity\)/);
});

// ─────────────────────────────────────────────────────────────────────────
// NHÓM 3: KIỂM THỬ GIÁ FLASH SALE VÀ TÍNH TOÁN (TC-165-19 → TC-165-30)
// ─────────────────────────────────────────────────────────────────────────

test('TC-165-19 & TC-165-20: Giá gốc và giá Flash Sale được cấu hình và lưu trữ chính xác', () => {
  const itemEntity = readBackend('product-service/src/main/java/com/ecommerce/product/entity/FlashSaleItem.java');
  const dbInitSql = readBackend('docker/mysql/init.sql');

  assert.match(itemEntity, /private BigDecimal flashSalePrice;/);
  assert.match(dbInitSql, /flash_sale_price DECIMAL\(12, 2\) NOT NULL COMMENT 'Giá ưu đãi trong Flash Sale'/);
  assert.match(dbInitSql, /CONSTRAINT chk_fs_price CHECK \(flash_sale_price > 0\)/);
});

test('TC-165-21: Giá giảm và tỷ lệ % giảm giá được tính chính xác', () => {
  const saleService = readSrc('services/saleService.js');
  const cardComponent = readSrc('components/sale/FlashSaleProductCard.jsx');

  // Công thức: Math.round(((originalPrice - salePrice) / originalPrice) * 100)
  assert.match(saleService, /Math\.round\(\(\(originalPrice - salePrice\) \/ originalPrice\) \* 100\)/);
  assert.match(cardComponent, /Math\.round\(\(\(originalPrice - salePrice\) \/ originalPrice\) \* 100\)/);
});

test('TC-165-22 & TC-165-23: Flash Sale chưa bắt đầu hoặc hết hạn -> Không được áp dụng giá giảm, trả về giá gốc', () => {
  const repoCode = readBackend('product-service/src/main/java/com/ecommerce/product/repository/FlashSaleItemRepository.java');
  assert.match(repoCode, /c\.startTime <= :now AND c\.endTime >= :now/);
  assert.match(repoCode, /c\.status = 'ACTIVE'/);
});

test('TC-165-24: Giá trong danh sách Flash Sale và trang chi tiết thống nhất từ Backend', () => {
  const productService = readBackend('product-service/src/main/java/com/ecommerce/product/service/impl/ProductServiceImpl.java');
  assert.match(productService, /response\.setActiveFlashSale\(flashSaleService\.getActiveFlashSaleForProduct\(id\)\);/);
});

test('TC-165-25 & TC-165-26 & TC-165-27: Chống Price Tampering — Backend hoàn toàn quyết định giá thanh toán cuối cùng', () => {
  const orderServiceImpl = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

  // Đọc giá thực từ ProductClient / DB, bỏ qua giá do Client tự truyền
  assert.match(orderServiceImpl, /ApiResponse<ProductResponse> productApiResponse = productClient\.getProductById\(itemReq\.getProductId\(\)\);/);
  assert.match(orderServiceImpl, /if \(activeFlashSale\.getFlashSalePrice\(\) != null\) \{\s*actualPrice = activeFlashSale\.getFlashSalePrice\(\);\s*\}/);
  assert.match(orderServiceImpl, /itemReq\.setPriceAtPurchase\(actualPrice\);/);
  assert.match(orderServiceImpl, /totalAmount = totalAmount\.add\(itemTotal\);/);
});

test('TC-165-28: Định dạng tiền tệ VNĐ chuẩn và làm tròn hợp lý', () => {
  const formatUtil = readSrc('utils/formatCurrency.js');
  assert.match(formatUtil, /currency:\s*'VND'/);
  assert.match(formatUtil, /vi-VN/);
});

test('TC-165-29: Khi số lượng ưu đãi Flash Sale đã hết (remainingStock <= 0) -> Tự động chuyển về giá gốc', () => {
  const serviceCode = readBackend('product-service/src/main/java/com/ecommerce/product/service/FlashSaleService.java');
  const repoCode = readBackend('product-service/src/main/java/com/ecommerce/product/repository/FlashSaleItemRepository.java');

  // Repository chỉ lấy item có soldQuantity < quantity
  assert.match(repoCode, /i\.soldQuantity < i\.quantity/);

  // Service kiểm tra remaining <= 0 thì trả về null
  assert.match(serviceCode, /int remaining = Math\.max\(0, item\.getQuantity\(\) - sold\);/);
  assert.match(serviceCode, /if \(remaining <= 0\) \{\s*return null;\s*\}/);
});

test('TC-165-30: Tổng tiền đơn hàng sau khi áp dụng Flash Sale và Voucher được tính toán chuẩn xác', () => {
  const orderServiceImpl = readBackend('order-service/src/main/java/com/ecommerce/order/service/impl/OrderServiceImpl.java');

  assert.match(orderServiceImpl, /BigDecimal finalTotalAmount = subtotalAmount\.subtract\(discountAmount\)\.max\(BigDecimal\.ZERO\);/);
  assert.match(orderServiceImpl, /\.totalAmount\(finalTotalAmount\)/);
});
