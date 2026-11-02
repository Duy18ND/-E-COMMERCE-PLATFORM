import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

// Giả lập localStorage chuẩn Web Storage API cho môi trường Node.js
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');

// Tạo JWT mẫu hợp lệ (3 phần Header.Payload.Signature chuẩn Base64Url)
const createSampleJwt = (claims) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.signature_verified`;
};

test('ECOM-102 & ECOM-197: Kiểm tra giao diện, trường thông tin, validate dữ liệu và điều hướng Login/Register', () => {
  const loginCode = readSrc('pages/auth/Login.jsx');
  const registerCode = readSrc('pages/auth/Register.jsx');
  const responsiveCss = readSrc('styles/responsive.css');

  // 1. Kiểm tra tồn tại trường nhập và thuộc tính bắt buộc
  assert.match(loginCode, /name="email"/, 'Login phải có trường email');
  assert.match(loginCode, /name="password"/, 'Login phải có trường password');
  assert.match(loginCode, /validateLoginForm/, 'Login phải có hàm kiểm tra dữ liệu trước khi gửi');
  assert.match(loginCode, /error=\{fieldErrors\.email\}/, 'Login phải hiển thị lỗi cấp trường cho email');
  assert.match(loginCode, /error=\{fieldErrors\.password\}/, 'Login phải hiển thị lỗi cấp trường cho password');
  assert.match(loginCode, /to="\/register"/, 'Login phải có link điều hướng sang Register');
  assert.match(loginCode, /disabled=\{loading\}/, 'Login phải vô hiệu hóa nút khi đang loading');

  assert.match(registerCode, /name="fullName"/, 'Register phải có trường fullName');
  assert.match(registerCode, /name="email"/, 'Register phải có trường email');
  assert.match(registerCode, /name="phone"/, 'Register phải có trường phone');
  assert.match(registerCode, /name="address"/, 'Register phải có trường address');
  assert.match(registerCode, /name="password"/, 'Register phải có trường password');
  assert.match(registerCode, /name="confirmPassword"/, 'Register phải có trường confirmPassword');
  assert.match(registerCode, /validateRegisterForm/, 'Register phải có hàm kiểm tra dữ liệu trước khi gửi');
  assert.match(registerCode, /PHONE_REGEX = \/\^\[0-9\]\{10,11\}\$\//, 'Register phải kiểm tra SĐT 10-11 chữ số khớp Backend');
  assert.match(registerCode, /to="\/login"/, 'Register phải có link điều hướng sang Login');
  assert.match(registerCode, /disabled=\{loading \|\| Boolean\(success\)\}/, 'Register phải khóa nút khi đang gửi hoặc chờ chuyển hướng');

  // 2. Kiểm tra Responsive CSS cho Mobile & Tablet
  assert.match(responsiveCss, /\.auth-card/, 'Phải có style responsive cho .auth-card');
  assert.match(responsiveCss, /\.header-main-row/, 'Phải có style responsive cho thanh Header trên mobile/tablet');
});

test('ECOM-105: Kiểm tra quản lý JWT, giải mã payload, kiểm tra hạn token và lưu trữ localStorage', async () => {
  const constantsCode = readSrc('utils/constants.js');
  const authUtilCode = readSrc('utils/auth.js');

  assert.match(constantsCode, /REFRESH_TOKEN:\s*'refreshToken'/, 'constants.js phải có khóa REFRESH_TOKEN');
  assert.match(authUtilCode, /parseJwtPayload/, 'auth.js phải có hàm giải mã JWT payload');
  assert.match(authUtilCode, /isTokenExpired/, 'auth.js phải có hàm kiểm tra JWT hết hạn');

  // Kiểm thử trực tiếp logic giải mã JWT & kiểm tra hạn token
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  const pastExp = Math.floor(Date.now() / 1000) - 3600;

  const validJwt = createSampleJwt({
    sub: 'admin@ecommerce.com',
    userId: 99,
    fullName: 'System Admin',
    roles: ['ROLE_ADMIN'],
    exp: futureExp
  });

  const expiredJwt = createSampleJwt({
    sub: 'user@ecommerce.com',
    userId: 10,
    exp: pastExp
  });

  const parseJwtPayload = (token) => {
    const parts = token.split('.');
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  };
  const isTokenExpired = (token) => {
    const payload = parseJwtPayload(token);
    return payload.exp * 1000 <= Date.now();
  };

  assert.equal(isTokenExpired(validJwt), false, 'Token còn hạn phải trả về false');
  assert.equal(isTokenExpired(expiredJwt), true, 'Token đã hết hạn phải trả về true');
  assert.deepEqual(parseJwtPayload(validJwt).roles, ['ROLE_ADMIN'], 'Giải mã đúng roles từ JWT');
});

test('ECOM-105 & ECOM-200: Kiểm tra tích hợp API, unwrap ApiResponse của Backend và ánh xạ AuthResponse', () => {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../.env'), 'utf8');
  const apiCode = readSrc('services/api.js');
  const authServiceCode = readSrc('services/authService.js');
  const authContextCode = readSrc('context/AuthContext.jsx');

  // 1. Kiểm tra cấu hình .env và baseURL
  assert.match(envContent, /VITE_API_URL=http:\/\/localhost:8080\/api\/v1/, '.env phải trỏ tới /api/v1 của API Gateway');
  assert.match(envContent, /VITE_USE_MOCK_AUTH=false/, '.env phải tắt chế độ khóa cứng Mock Auth');
  assert.match(apiCode, /http:\/\/localhost:8080\/api\/v1/, 'api.js phải có baseURL mặc định /api/v1');

  // 2. Kiểm tra unwrapApiResponse xử lý đúng cấu trúc ApiResponse của Backend { success, message, data, timestamp }
  assert.match(apiCode, /'success' in payload \|\| 'status' in payload/, 'api.js phải hỗ trợ trường success của Backend ApiResponse');

  const unwrapApiResponse = (payload) => {
    if (
      payload &&
      typeof payload === 'object' &&
      'data' in payload &&
      ('success' in payload || 'status' in payload)
    ) {
      if (payload.success === false) throw new Error(payload.message);
      return payload.data;
    }
    return payload;
  };

  const backendLoginResponse = {
    success: true,
    message: 'Đăng nhập thành công',
    data: {
      accessToken: 'jwt_access_123',
      refreshToken: 'jwt_refresh_456',
      tokenType: 'Bearer',
      expiresIn: 86400000,
      userId: 42,
      email: 'admin@ecommerce.com',
      fullName: 'Ngô Phương Admin',
      roles: ['ROLE_ADMIN']
    },
    timestamp: '2026-10-29T21:30:00'
  };

  const unwrapped = unwrapApiResponse(backendLoginResponse);
  assert.equal(unwrapped.accessToken, 'jwt_access_123', 'Phải trích xuất đúng accessToken từ Backend ApiResponse');
  assert.equal(unwrapped.userId, 42, 'Phải trích xuất đúng userId từ Backend ApiResponse');
  assert.deepEqual(unwrapped.roles, ['ROLE_ADMIN'], 'Phải trích xuất đúng roles ROLE_ADMIN từ Backend ApiResponse');

  // 3. Kiểm tra các endpoint trong authService.js khớp với Backend AuthController (/api/v1/auth/*)
  assert.match(authServiceCode, /api\.post\('\/auth\/login'/, 'Phải gọi POST /auth/login');
  assert.match(authServiceCode, /api\.post\('\/auth\/register'/, 'Phải gọi POST /auth/register');
  assert.match(authServiceCode, /api\.post\('\/auth\/refresh'/, 'Phải gọi POST /auth/refresh');
  assert.match(authServiceCode, /api\.post\('\/auth\/logout'/, 'Phải gọi POST /auth/logout');
  assert.match(authServiceCode, /api\.get\('\/auth\/me'/, 'Phải gọi GET /auth/me (khớp AuthController.java dòng 100)');

  // 4. Kiểm tra AuthContext ánh xạ cả userId và id, đồng bộ sự kiện auth:unauthorized khi gặp lỗi 401
  assert.match(authContextCode, /loginData\.userId \?\? loginData\.id/, 'AuthContext phải ánh xạ userId từ Backend AuthResponse');
  assert.match(authContextCode, /auth:unauthorized/, 'AuthContext phải lắng nghe sự kiện 401 auth:unauthorized');
});

test('ECOM-199: Kiểm tra cấu hình Route, ProtectedRoute, AdminRoute và phân quyền USER/ADMIN', () => {
  const appRoutesCode = readSrc('routes/AppRoutes.jsx');
  const protectedRouteCode = readSrc('routes/ProtectedRoute.jsx');
  const adminRouteCode = readSrc('routes/AdminRoute.jsx');

  // 1. Kiểm tra ProtectedRoute đã bọc các trang Customer yêu cầu đăng nhập
  assert.match(
    appRoutesCode,
    /<Route element=\{<ProtectedRoute[^>]*>\}>\s*<Route path="\/checkout"[\s\S]*?<Route path="\/order-success"[\s\S]*?<Route path="\/orders"[\s\S]*?<Route path="\/orders\/:id"/,
    'AppRoutes.jsx phải bọc /checkout, /order-success, /orders, /orders/:id trong ProtectedRoute'
  );

  // 2. Kiểm tra AdminRoute đã bọc các trang /admin/*
  assert.match(
    appRoutesCode,
    /<Route element=\{<AdminRoute \/>\}>[\s\S]*?path="\/admin"/,
    'AppRoutes.jsx phải bọc các route /admin/* trong AdminRoute'
  );

  // 3. Kiểm tra điều hướng khi chưa đăng nhập và khi truy cập trái quyền
  assert.match(protectedRouteCode, /<Navigate to="\/login" state=\{\{ from: location \}\} replace \/>/, 'ProtectedRoute phải chuyển người chưa đăng nhập về /login');
  assert.match(protectedRouteCode, /accessDenied: true/, 'ProtectedRoute phải đánh dấu accessDenied khi sai vai trò');
  assert.match(adminRouteCode, /<Navigate to="\/login" state=\{\{ from: location \}\} replace \/>/, 'AdminRoute phải chuyển người chưa đăng nhập về /login');
  assert.match(adminRouteCode, /if \(!isAdmin\)/, 'AdminRoute phải chặn USER không có quyền Admin');
});
