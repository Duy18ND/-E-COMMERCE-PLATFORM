import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');

// =========================================================================
// TEST SUITE: NÂNG CẤP TOÀN BỘ HỆ THỐNG THÔNG BÁO THÀNH POPUP CHUYÊN NGHIỆP
// =========================================================================

test('TC-UI-13: Quét sạch 100% không còn alert(), confirm(), prompt() ("localhost says")', () => {
  function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(walk(fullPath));
      } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const files = walk(srcDir);
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      // Loại trừ các dòng comment giải thích
      const cleanLine = line.trim();
      if (cleanLine.startsWith('//') || cleanLine.startsWith('*') || cleanLine.startsWith('/*')) return;
      if (/(?:window\.)?(?:alert|confirm|prompt)\s*\(/.test(cleanLine)) {
        violations.push({
          file: path.relative(srcDir, file),
          line: idx + 1,
          text: cleanLine
        });
      }
    });
  }

  assert.equal(violations.length, 0, `Không được còn lời gọi dialog mặc định của trình duyệt nào. Tìm thấy: ${JSON.stringify(violations)}`);
});

test('TC-UI-01: Đăng nhập thành công hiển thị Toast Notification', () => {
  const loginCode = readSrc('pages/auth/Login.jsx');
  assert.match(loginCode, /useNotification/, 'Login.jsx phải import useNotification');
  assert.match(loginCode, /notify\.success/, 'Login.jsx phải gọi notify.success khi đăng nhập thành công');
});

test('TC-UI-02: Đăng nhập sai thông tin hiển thị Toast Error', () => {
  const loginCode = readSrc('pages/auth/Login.jsx');
  assert.match(loginCode, /notify\.error/, 'Login.jsx phải gọi notify.error khi đăng nhập thất bại');
});

test('TC-UI-03: Đăng ký thành công hiển thị Toast Success', () => {
  const registerCode = readSrc('pages/auth/Register.jsx');
  assert.match(registerCode, /useNotification/, 'Register.jsx phải import useNotification');
  assert.match(registerCode, /notify\.success/, 'Register.jsx phải gọi notify.success khi đăng ký thành công');
});

test('TC-UI-04: Thêm sản phẩm vào giỏ hàng hiển thị Toast Cart', () => {
  const cartContextCode = readSrc('context/CartContext.jsx');
  assert.match(cartContextCode, /showToast\(\s*\{\s*type:\s*'cart'/, 'CartContext phải gọi showToast với type cart');
});

test('TC-UI-05: Đặt hàng thành công hiển thị Toast / Result Modal', () => {
  const checkoutCode = readSrc('pages/customer/Checkout.jsx');
  assert.match(checkoutCode, /useNotification/, 'Checkout.jsx phải import useNotification');
  assert.match(checkoutCode, /notify\.success/, 'Checkout.jsx phải gọi notify.success khi đặt hàng thành công');
});

test('TC-UI-06 & TC-UI-07: Hủy đơn hàng yêu cầu Confirm Modal và không gọi API nếu Hủy', () => {
  const orderDetailCode = readSrc('pages/customer/OrderDetail.jsx');
  assert.match(orderDetailCode, /confirmDialog/, 'OrderDetail.jsx phải dùng confirmDialog thay window.confirm');
  assert.match(orderDetailCode, /if\s*\(!confirmed\)\s*return;/, 'Nếu người dùng bấm Hủy bỏ trong Modal thì dừng lại và không gọi API');
  assert.match(orderDetailCode, /orderService\.cancelOrder/, 'Chỉ gọi API cancelOrder sau khi đã xác nhận');
});

test('TC-UI-08: Cập nhật trạng thái đơn hàng Admin yêu cầu Confirm Modal & Toast', () => {
  const adminOrdersCode = readSrc('pages/admin/Orders.jsx');
  assert.match(adminOrdersCode, /confirmDialog/, 'Orders.jsx phải dùng confirmDialog khi chuyển trạng thái');
  assert.match(adminOrdersCode, /notify\.success/, 'Orders.jsx phải gọi notify.success khi cập nhật thành công');
  assert.match(adminOrdersCode, /notify\.error/, 'Orders.jsx phải gọi notify.error khi cập nhật thất bại');
});

test('TC-UI-09: Xóa sản phẩm yêu cầu Confirm Modal với variant danger', () => {
  const productsCode = readSrc('pages/admin/Products.jsx');
  assert.match(productsCode, /confirmDialog/, 'Products.jsx phải dùng confirmDialog');
  assert.match(productsCode, /variant:\s*'danger'/, 'Thao tác xóa sản phẩm phải có variant danger');
  assert.match(productsCode, /productService\.delete/, 'Chỉ gọi API delete sau khi xác nhận');
});

test('TC-UI-10: API lỗi không hiển thị thành công giả', () => {
  const adminSalesCode = readSrc('pages/admin/AdminSales.jsx');
  assert.match(adminSalesCode, /notify\.error/, 'AdminSales.jsx phải báo lỗi bằng notify.error trong khối catch');
  const adminSaleFormCode = readSrc('pages/admin/AdminSaleForm.jsx');
  assert.match(adminSaleFormCode, /notify\.error/, 'AdminSaleForm.jsx phải báo lỗi bằng notify.error trong khối catch');
});

test('TC-UI-11: Các popup và toast hỗ trợ Responsive trên Mobile', () => {
  const toastCss = readSrc('styles/toast.css');
  assert.match(toastCss, /@media\s*\(max-width:\s*640px\)/, 'toast.css phải có media query cho mobile');
  assert.match(toastCss, /max-width:\s*calc\(100vw\s*-\s*32px\)/, 'Toast trên mobile phải chiếm toàn chiều ngang màn hình');
});

test('TC-UI-12: Hỗ trợ phím Escape và Focus trap trên Modal', () => {
  const confirmModalCode = readSrc('components/common/ConfirmModal.jsx');
  const resultModalCode = readSrc('components/common/ResultModal.jsx');

  assert.match(confirmModalCode, /e\.key\s*===\s*'Escape'/, 'ConfirmModal phải lắng nghe phím Escape');
  assert.match(confirmModalCode, /confirmBtnRef\.current\.focus\(\)/, 'ConfirmModal phải tự động focus nút xác nhận');
  assert.match(resultModalCode, /e\.key\s*===\s*'Escape'/, 'ResultModal phải lắng nghe phím Escape');
});

test('TC-UI-14: Cơ chế chống lặp thông báo (Deduplication)', () => {
  const toastContextCode = readSrc('context/ToastContext.jsx');
  assert.match(toastContextCode, /lastToastRef/, 'ToastContext phải lưu vết thông báo trước đó');
  assert.match(toastContextCode, /now\s*-\s*lastToastRef\.current\.time\s*<\s*800/, 'ToastContext phải ngăn chặn thông báo trùng lặp trong thời gian ngắn');
});

test('TC-UI-15: Chặn nhấn nút liên tục gửi API trùng lặp', () => {
  const confirmModalCode = readSrc('components/common/ConfirmModal.jsx');
  assert.match(confirmModalCode, /disabled=\{loading\}/, 'Nút xác nhận và nút hủy phải bị disabled khi loading = true');
  assert.match(confirmModalCode, /cursor:\s*loading\s*\?\s*'not-allowed'\s*:\s*'pointer'/, 'Con trỏ chuột chuyển sang not-allowed khi đang xử lý');
});
