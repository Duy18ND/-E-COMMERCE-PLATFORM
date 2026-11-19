import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeCrc16Ccitt,
  buildVietQrPayload,
  createQrMatrix,
  generateQrSvg,
  generateQrSvgDataUri
} from '../src/utils/qrCodeGenerator.js';
import {
  extractMaxPriceFromText,
  extractMinPriceFromText,
  extractCleanSearchKeyword,
  extractOrderIdFromQuestion,
  extractComparisonTerms
} from '../src/utils/chatbotHelpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(frontendRoot, '..');

const readFrontend = (rel) => fs.readFileSync(path.join(frontendRoot, rel), 'utf8');
const readRepo = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

test('CHATBOT & VIETQR BUGFIX QA SUITE', async (t) => {
  await t.test('TC-QR-01: buildVietQrPayload tạo chuỗi EMVCo NAPAS 247 hợp lệ kèm CRC-16/CCITT-FALSE', () => {
    // Known EMVCo check vector ("123456789" -> 0x29B1 in CRC-16/CCITT-FALSE)
    assert.equal(computeCrc16Ccitt('123456789'), '29B1');

    const dynamicPayload = buildVietQrPayload({
      bankId: 'MB',
      accountNo: '0838169181',
      amount: 150000,
      addInfo: 'THANH TOAN DON #456'
    });

    assert.match(dynamicPayload, /^000201010212/);
    assert.ok(dynamicPayload.includes('A000000727'));
    assert.ok(dynamicPayload.includes('970422'));
    assert.ok(dynamicPayload.includes('0838169181'));
    assert.ok(dynamicPayload.includes('5303704'));
    assert.ok(dynamicPayload.includes('5406150000'));
    assert.ok(dynamicPayload.includes('5802VN'));
    assert.ok(dynamicPayload.includes('THANH TOAN DON 456'));

    const bodyWithoutCrc = dynamicPayload.slice(0, -4);
    const tailCrc = dynamicPayload.slice(-4);
    assert.equal(tailCrc, computeCrc16Ccitt(bodyWithoutCrc));
    assert.ok(dynamicPayload.slice(-8).startsWith('6304'));

    const staticPayload = buildVietQrPayload({
      bankId: 'MB',
      accountNo: '0838169181',
      amount: 0,
      addInfo: 'Chuyển khoản đơn'
    });
    assert.match(staticPayload, /^000201010211/);
    assert.ok(!staticPayload.includes('5401'));
    assert.ok(staticPayload.includes('Chuyen khoan don'));
  });

  await t.test('TC-QR-02: createQrMatrix & generateQrSvgDataUri render đúng ma trận QR chuẩn ISO/IEC 18004 offline', () => {
    const payload = buildVietQrPayload({
      bankId: 'MB',
      accountNo: '0838169181',
      amount: 24990000,
      addInfo: 'THANH TOAN DON 999999'
    });

    const grid = createQrMatrix(payload);
    assert.equal((grid.size - 17) % 4, 0);
    const version = (grid.size - 17) / 4;
    assert.ok(version >= 5 && version <= 9, `VietQR phải vừa khít phiên bản QR 5..9 (actual V${version})`);

    // Kiểm tra 3 Finder Patterns (7x7 ngoài cùng tối, viền trong sáng, tâm 3x3 tối)
    const finderCorners = [
      [0, 0],
      [0, grid.size - 7],
      [grid.size - 7, 0]
    ];
    for (const [top, left] of finderCorners) {
      assert.equal(grid.modules[top][left], 1);
      assert.equal(grid.modules[top + 1][left + 1], 0);
      assert.equal(grid.modules[top + 3][left + 3], 1);
      assert.equal(grid.modules[top + 6][left + 6], 1);
    }

    // Kiểm tra Dark Module bắt buộc tại (4*version + 9, 8)
    assert.equal(grid.modules[4 * version + 9][8], 1);

    // Kiểm tra Timing Pattern tại hàng 6 xen kẽ 1-0-1
    assert.equal(grid.modules[6][8], 1);
    assert.equal(grid.modules[6][9], 0);
    assert.equal(grid.modules[6][10], 1);

    const svg = generateQrSvg(payload);
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 \d+ \d+"/);
    assert.ok(svg.includes('<path d="M'));

    const dataUri = generateQrSvgDataUri(payload);
    assert.ok(dataUri.startsWith('data:image/svg+xml;charset=utf-8,'));
  });

  await t.test('TC-QR-03: QrPaymentModal, Checkout, orderService & paymentService fix toàn diện lỗi QR & Checkout', () => {
    const qrModalSrc = readFrontend('src/components/order/QrPaymentModal.jsx');
    const checkoutSrc = readFrontend('src/pages/customer/Checkout.jsx');
    const orderServiceSrc = readFrontend('src/services/orderService.js');
    const paymentServiceSrc = readFrontend('src/services/paymentService.js');

    // QrPaymentModal không còn phụ thuộc api.qrserver.com và dùng VietQR SVG offline dự phòng
    assert.ok(!qrModalSrc.includes('api.qrserver.com'), 'Phải loại bỏ fallback phụ thuộc api.qrserver.com');
    assert.match(qrModalSrc, /buildVietQrPayload/);
    assert.match(qrModalSrc, /generateQrSvgDataUri/);
    assert.match(qrModalSrc, /encodeURIComponent/);
    assert.match(qrModalSrc, /shippingFee/, 'payableAmount phải bảo toàn shippingFee khi có voucher');
    assert.match(qrModalSrc, /qrBroken\s*\|\|\s*!qrSrc/, 'Không render <img src=""> trống khi qrSrc rỗng');
    assert.match(qrModalSrc, /Thử tải lại QR/);

    // Checkout & orderService chuẩn hóa số điện thoại khỏi khoảng trắng trước @Pattern BE
    assert.ok(!checkoutSrc.includes("'0912 345 678'"), 'Test phone trong Checkout không được chứa dấu cách');
    assert.match(orderServiceSrc, /normalizedReceiverPhone/);

    // paymentService hỗ trợ retry ngắn khi gặp HTTP 404 lúc Kafka vừa tạo Payment
    assert.match(paymentServiceSrc, /status === 404/);
    assert.match(paymentServiceSrc, /retryDelays/);
  });

  await t.test('TC-BOT-01: chatbotHelpers giữ nguyên mã model số và tách đúng giá/đơn hàng/so sánh', () => {
    assert.equal(extractMaxPriceFromText('gợi ý laptop dưới 30 triệu'), 30_000_000);
    assert.equal(extractMaxPriceFromText('tìm tai nghe tầm 500k'), 500_000);
    assert.equal(extractMaxPriceFromText('macbook dưới 25.5tr'), 25_500_000);
    assert.equal(extractMinPriceFromText('điện thoại từ 15 triệu'), 15_000_000);

    // Giữ nguyên số model sản phẩm ("15", "990", "M2", "2m")
    assert.equal(extractCleanSearchKeyword('Tìm mua iPhone 15 Pro Max dưới 35 triệu'), 'iPhone 15 Pro Max');
    assert.equal(extractCleanSearchKeyword('Kiểm tra tồn kho SSD 990 Pro'), 'SSD 990 Pro');
    assert.equal(extractCleanSearchKeyword('Gợi ý laptop dưới 30 triệu'), 'laptop');
    assert.equal(extractCleanSearchKeyword('Cáp HDMI 2m'), 'Cáp HDMI 2m');

    // Tách mã đơn & từ khóa so sánh
    assert.equal(extractOrderIdFromQuestion('Kiểm tra đơn hàng #202 giúp mình'), 202);
    assert.equal(extractOrderIdFromQuestion('Tra cứu đơn số 88'), 88);
    assert.deepEqual(
      extractComparisonTerms('So sánh Dell XPS 15 và MacBook Air M2'),
      ['Dell XPS 15', 'MacBook Air M2']
    );
  });

  await t.test('TC-BOT-02: chatbotService, useChatbot, ChatWindow & Backend Chatbot fix toàn diện các lỗi', () => {
    const chatbotServiceSrc = readFrontend('src/services/chatbotService.js');
    const useChatbotSrc = readFrontend('src/hooks/useChatbot.js');
    const chatWindowSrc = readFrontend('src/components/chat/ChatWindow.jsx');

    // Sửa TypeError productService.getProducts -> productService.getCatalog
    assert.ok(!chatbotServiceSrc.includes('productService.getProducts('), 'Phải thay productService.getProducts (không tồn tại) bằng getCatalog');
    assert.match(chatbotServiceSrc, /productService\.getCatalog\(/);
    assert.match(chatbotServiceSrc, /voucherService\.getPublicVouchers/);
    assert.match(chatbotServiceSrc, /isLocalFallbackConv/);

    // Reset session khi chuyển guest <-> user để không dính lỗi 403 mismatch
    assert.match(useChatbotSrc, /prevUserIdRef/);
    assert.match(useChatbotSrc, /setConversationId\(null\)/);
    assert.ok(!chatWindowSrc.includes("q.replace(/^[^\\s]+\\s/, '')"), 'Không cắt nhầm từ tiếng Việt đầu tiên trong QUICK_PROMPTS');
    assert.match(chatWindowSrc, /onSend\(q\)/);

    // Backend Gemini model config phải dùng model hợp lệ (gemini-3.1-flash-lite) thay vì model lỗi 404
    const botYml = readRepo('backend/chatbot-service/src/main/resources/application.yml');
    const composeYml = readRepo('backend/docker-compose.yml');
    const envExample = readRepo('backend/.env.example');
    const chatServiceJava = readRepo('backend/chatbot-service/src/main/java/com/ecommerce/chatbot/service/impl/ChatServiceImpl.java');

    assert.ok(!botYml.includes('gemini-3.5-flash'), 'application.yml không được dùng gemini-3.5-flash');
    assert.ok(!composeYml.includes('gemini-3.5-flash'), 'docker-compose.yml không được dùng gemini-3.5-flash');
    assert.ok(!envExample.includes('gemini-3.5-flash'), '.env.example không được dùng gemini-3.5-flash');
    assert.ok(botYml.includes('gemini-3.1-flash-lite'));
    assert.match(
      chatServiceJava,
      /if \(products\.isEmpty\(\) && StringUtils\.hasText\(keyword\)\) \{\s*products = productTools\.searchProducts\(keyword, null, minPrice, maxPrice, null, sort, 6\);/
    );
  });
});
