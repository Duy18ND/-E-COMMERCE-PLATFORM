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
// TEST SUITE: Admin Orders Layout Fix When Sidebar Expanded
// =========================================================================

test('TC-LAYOUT-01: Sidebar width tối ưu và padding gọn gàng khi mở rộng', () => {
  const globalCss = readSrc('styles/global.css');
  assert.match(globalCss, /\.admin-sidebar\s*\{[^}]*width:\s*236px;/s, 'Sidebar width tối ưu 236px');
  assert.match(globalCss, /\.admin-sidebar\s*\{[^}]*padding:\s*1\.15rem\s+0\.75rem;/s, 'Sidebar padding gọn gàng');
});

test('TC-LAYOUT-02: Admin Main Content có min-width: 0 và overflow-x: hidden chống tràn toàn trang', () => {
  const globalCss = readSrc('styles/global.css');
  assert.match(globalCss, /\.admin-main-content\s*\{[^}]*min-width:\s*0;/s, 'Main content phải có min-width: 0');
  assert.match(globalCss, /\.admin-main-content\s*\{[^}]*overflow-x:\s*hidden;/s, 'Main content phải có overflow-x: hidden');
});

test('TC-LAYOUT-03: Cột Tổng tiền luôn hiển thị trên 1 dòng với white-space: nowrap', () => {
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');
  // Header và cell của cột Tổng tiền phải có whiteSpace nowrap
  assert.match(ordersPageCode, /<th[^>]*whiteSpace:\s*'nowrap'[^>]*>Tổng tiền<\/th>/, 'Header cột Tổng tiền phải có whiteSpace: nowrap');
  assert.match(ordersPageCode, /whiteSpace:\s*'nowrap'[^>]*>[^<]*\{formatCurrency\(order\.totalAmount/, 'Giá trị tổng tiền phải được bọc trong container có whiteSpace: nowrap');
});

test('TC-LAYOUT-04: Cột Thao tác thẳng hàng, không bị wrap lộn xộn, chiều cao đồng đều', () => {
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersPageCode, /<th[^>]*minWidth:\s*'240px'[^>]*textAlign:\s*'center'[^>]*whiteSpace:\s*'nowrap'[^>]*>Thao tác<\/th>/, 'Header Thao tác phải có minWidth >= 240px và whiteSpace: nowrap');
  assert.match(ordersPageCode, /display:\s*'inline-flex'[^}]*flexWrap:\s*'nowrap'/, 'Container action buttons phải dùng inline-flex và flexWrap: nowrap');
  assert.match(ordersPageCode, /height:\s*'30px'/, 'Các nút action phải có chiều cao đồng đều 30px');
});

test('TC-LAYOUT-05: Bảng đơn hàng có min-width bảo vệ và cuộn ngang riêng biệt trên table-responsive', () => {
  const globalCss = readSrc('styles/global.css');
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');
  assert.match(globalCss, /\.orders-table\s*\{[^}]*min-width:\s*980px;/s, 'CSS .orders-table phải có min-width 980px');
  assert.match(ordersPageCode, /orders-table/, 'Bảng đơn hàng phải gắn class orders-table');
  assert.match(globalCss, /\.table-responsive\s*\{[^}]*overflow-x:\s*auto;/s, '.table-responsive phải có overflow-x: auto');
});

test('TC-LAYOUT-06: Quick filter pills và Admin Toolbar giữ bố cục co giãn linh hoạt', () => {
  const ordersPageCode = readSrc('pages/admin/Orders.jsx');
  assert.match(ordersPageCode, /className="admin-toolbar-grid"/, 'Toolbar grid phải tồn tại');
  assert.match(ordersPageCode, /flexWrap:\s*'wrap'/, 'Thanh tab lọc nhanh phải có flexWrap: wrap');
});
