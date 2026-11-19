import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('ECOM-ONLINE-PAYMENT QA SUITE', async (t) => {
  const constantsSrc = fs.readFileSync(path.join(rootDir, 'src/utils/constants.js'), 'utf8');
  const checkoutSrc = fs.readFileSync(path.join(rootDir, 'src/pages/customer/Checkout.jsx'), 'utf8');
  const orderSuccessSrc = fs.readFileSync(path.join(rootDir, 'src/pages/customer/OrderSuccess.jsx'), 'utf8');
  const orderServiceSrc = fs.readFileSync(path.join(rootDir, 'src/services/orderService.js'), 'utf8');
  const paymentServiceSrc = fs.readFileSync(path.join(rootDir, 'src/services/paymentService.js'), 'utf8');
  const orderDetailSrc = fs.readFileSync(path.join(rootDir, 'src/pages/customer/OrderDetail.jsx'), 'utf8');

  await t.test('TC-PAY-01: Cấu hình hằng số 4 phương thức thanh toán trực tuyến', () => {
    assert.match(constantsSrc, /ONLINE_PAYMENT_PROVIDERS\s*=/);
    assert.match(constantsSrc, /MOMO:\s*['"]MOMO['"]/);
    assert.match(constantsSrc, /ZALOPAY:\s*['"]ZALOPAY['"]/);
    assert.match(constantsSrc, /BANK_TRANSFER:\s*['"]BANK_TRANSFER['"]/);
    assert.match(constantsSrc, /CREDIT_CARD:\s*['"]CREDIT_CARD['"]/);

    assert.match(constantsSrc, /ONLINE_PAYMENT_METHODS_LIST\s*=/);
    assert.match(constantsSrc, /name:\s*['"]MoMo['"]/);
    assert.match(constantsSrc, /name:\s*['"]ZaloPay['"]/);
    assert.match(constantsSrc, /Chuyển khoản ngân hàng \/ QR Code/);
    assert.match(constantsSrc, /Visa \/ Mastercard/);
  });

  await t.test('TC-PAY-02: Checkout giữ nguyên 2 phương thức chính (COD & Trực tuyến)', () => {
    assert.match(checkoutSrc, /PAYMENT_METHOD\.COD/);
    assert.match(checkoutSrc, /PAYMENT_METHOD\.MOCK_ONLINE/);
    assert.match(checkoutSrc, /PAYMENT_METHOD_LABELS/);
  });

  await t.test('TC-PAY-03: Khi chọn Thanh toán trực tuyến, hiển thị 4 cổng MoMo, ZaloPay, QR/Bank, Visa/Master', () => {
    assert.match(checkoutSrc, /ONLINE_PAYMENT_METHODS_LIST\.map/);
    assert.match(checkoutSrc, /name="onlinePaymentProvider"/);
    assert.match(checkoutSrc, /type="radio"/);
    assert.match(checkoutSrc, /selectedOnlineMethod/);
  });

  await t.test('TC-PAY-04: COD không hiển thị danh sách phương thức trực tuyến & giữ nguyên luồng', () => {
    // Sub-methods list is strictly guarded by formData.paymentMethod === PAYMENT_METHOD.MOCK_ONLINE
    assert.match(checkoutSrc, /formData\.paymentMethod === PAYMENT_METHOD\.MOCK_ONLINE\s*&&\s*\(/);
  });

  await t.test('TC-PAY-05: Xác nhận thanh toán - Hiển thị phương thức đã chọn & Tổng tiền cần thanh toán', () => {
    assert.match(checkoutSrc, /Phương thức đã chọn:/);
    assert.match(checkoutSrc, /Tổng tiền cần thanh toán:/);
    assert.match(checkoutSrc, /fmtMoney\(totalAmount\)/);
  });

  await t.test('TC-PAY-06: Nút submit hiển thị đúng "Xác nhận thanh toán" (Online) và "Xác nhận Đặt hàng" (COD)', () => {
    assert.match(checkoutSrc, /isOnlineMethod \? ['"]Xác nhận thanh toán['"] : ['"]Xác nhận Đặt hàng['"]/);
    assert.match(checkoutSrc, /isOnlineMethod \? ['"]Đang xử lý thanh toán\.\.\.['"] : ['"]Đang xác nhận đơn hàng\.\.\.['"]/);
    assert.match(checkoutSrc, /disabled=\{loading \|\| cartItems\.length === 0\}/);
  });

  await t.test('TC-PAY-07: Màn hình OrderSuccess hiển thị Tiêu đề "Thanh toán thành công" và trạng thái PAID cho Online', () => {
    assert.match(orderSuccessSrc, /isOnlinePayment \? ['"]Thanh toán thành công['"] : ['"]Đặt Hàng Thành Công!['"]/);
    assert.match(orderSuccessSrc, /Mã đơn hàng:/);
    assert.match(orderSuccessSrc, /#\{orderId\}/);
    assert.match(orderSuccessSrc, /Phương thức thanh toán:/);
    assert.match(orderSuccessSrc, /PAID/);
    assert.match(orderSuccessSrc, /Số tiền đã thanh toán:/);
    assert.match(orderSuccessSrc, /Xem đơn hàng/);
    assert.match(orderSuccessSrc, /Tiếp tục mua sắm/);
  });

  await t.test('TC-PAY-08: orderService & paymentService lưu trữ thông tin nhà cung cấp và trạng thái thanh toán', () => {
    assert.match(orderServiceSrc, /onlinePaymentProvider/);
    assert.match(orderServiceSrc, /onlinePaymentProviderLabel/);
    assert.match(paymentServiceSrc, /mockPay/);
    assert.match(paymentServiceSrc, /ORDER_STATUS\.PAID/);
  });

  await t.test('TC-PAY-09: Tuyệt đối không dùng alert, confirm, prompt', () => {
    const files = [checkoutSrc, orderSuccessSrc, orderServiceSrc, paymentServiceSrc, orderDetailSrc];
    for (const f of files) {
      assert.doesNotMatch(f, /\balert\(/);
      assert.doesNotMatch(f, /\bconfirm\(/);
      assert.doesNotMatch(f, /\bprompt\(/);
    }
  });
});

