import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      export async function resolve(specifier, context, nextResolve) {
        try {
          return await nextResolve(specifier, context);
        } catch (err) {
          if (specifier.startsWith('.') && !specifier.endsWith('.js')) {
            return await nextResolve(specifier + '.js', context);
          }
          throw err;
        }
      }
    `),
  import.meta.url
);

const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => (storageMap.has(key) ? storageMap.get(key) : null),
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear()
};
globalThis.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.CustomEvent = class CustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
};

const { default: api } = await import('../src/services/api.js');
const { default: authService, normalizeAuthPayload } = await import('../src/services/authService.js');
const { default: userService } = await import('../src/services/userService.js');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

const readSrc = (relPath) => fs.readFileSync(path.join(srcDir, relPath), 'utf8');

const createRealJwt = (claims) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS512', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  return `${header}.${payload}.real_sig`;
};

const normalizeTextSegment = (val) =>
  String(val || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();

const buildStreetAddressFromDto = (addr) => {
  if (!addr || typeof addr !== 'object') return '';
  const cityNorm = normalizeTextSegment(addr.city);
  const rawParts = [addr.addressLine, addr.ward, addr.district]
    .map((part) => (part ? String(part).trim() : ''))
    .filter(Boolean);

  const uniqueParts = [];
  for (const part of rawParts) {
    const partNorm = normalizeTextSegment(part);
    if (cityNorm && partNorm === cityNorm) continue;
    if (!uniqueParts.some((existing) => normalizeTextSegment(existing) === partNorm)) {
      uniqueParts.push(part);
    }
  }
  return uniqueParts.join(', ');
};

const composeFullShippingAddress = (streetAddress, city) => {
  const cleanStreet = String(streetAddress || '').trim().replace(/,+\s*$/, '');
  const cleanCity = String(city || '').trim();
  if (!cleanCity) return cleanStreet;
  if (!cleanStreet) return cleanCity;

  const streetNorm = normalizeTextSegment(cleanStreet);
  const cityNorm = normalizeTextSegment(cleanCity);
  const streetSegments = cleanStreet.split(',').map((s) => normalizeTextSegment(s)).filter(Boolean);
  const lastSegment = streetSegments[streetSegments.length - 1] || '';

  if (
    streetNorm === cityNorm ||
    lastSegment === cityNorm ||
    streetNorm.endsWith(`, ${cityNorm}`)
  ) {
    return cleanStreet;
  }
  return `${cleanStreet}, ${cleanCity}`;
};

test('FIX-CHECKOUT-01: normalizeAuthPayload trong chế độ Backend thật KHÔNG khớp MOCK_USERS theo ID (2 hoặc 12) và không lấy ShopMart Tower', () => {
  localStorage.clear();
  const realJwtUser2 = createRealJwt({
    sub: 'letrungchien195@gmail.com',
    userId: 2,
    fullName: 'Lê Trung Chiến',
    roles: ['ROLE_USER'],
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  // Trước khi fix, userId: 2 khớp với MOCK_USERS[1] (admin@test.com -> "Tòa nhà Quản trị ShopMart Tower, Ba Đình, Hà Nội")
  const normalizedUser2 = normalizeAuthPayload(
    {
      accessToken: realJwtUser2,
      refreshToken: 'real-refresh-token',
      userId: 2,
      email: 'letrungchien195@gmail.com',
      fullName: 'Lê Trung Chiến',
      roles: ['ROLE_USER']
    },
    { email: 'letrungchien195@gmail.com' }
  );

  assert.equal(normalizedUser2.id, 2);
  assert.equal(normalizedUser2.email, 'letrungchien195@gmail.com');
  assert.equal(normalizedUser2.phone, '', 'Không tự gán SĐT mock 0987654321 hay 0912345678 khi API /login chưa trả');
  assert.equal(normalizedUser2.address, '', 'Không lấy nhầm ShopMart Tower từ MOCK_USERS id=2');
  assert.ok(!normalizedUser2.address.includes('ShopMart Tower'));
  assert.ok(!normalizedUser2.address.includes('Cầu Giấy'));

  // Kiểm tra tương tự với userId: 12 (trùng ID với baotran.admin@shopmart.vn trong MOCK_USERS)
  const realJwtUser12 = createRealJwt({
    sub: 'khach12@gmail.com',
    userId: 12,
    roles: ['ROLE_USER'],
    exp: Math.floor(Date.now() / 1000) + 3600
  });
  const normalizedUser12 = normalizeAuthPayload(
    {
      accessToken: realJwtUser12,
      userId: 12,
      email: 'khach12@gmail.com',
      fullName: 'Khách Mười Hai',
      roles: ['ROLE_USER']
    },
    {},
    { isMock: false }
  );

  assert.equal(normalizedUser12.phone, '');
  assert.equal(normalizedUser12.address, '');
});

test('FIX-CHECKOUT-02: authService.login và getCurrentUser với Backend thật dùng dữ liệu API, không bị localStorage cũ ghi đè ShopMart Tower', async () => {
  localStorage.clear();
  const realJwt = createRealJwt({
    sub: 'letrungchien195@gmail.com',
    userId: 2,
    fullName: 'Lê Trung Chiến',
    roles: ['ROLE_USER'],
    exp: Math.floor(Date.now() / 1000) + 3600
  });

  // Giả lập localStorage['user'] bị nhiễm dữ liệu giả từ phiên trước đó
  localStorage.setItem(
    'user',
    JSON.stringify({
      id: 2,
      userId: 2,
      email: 'letrungchien195@gmail.com',
      fullName: 'Lê Trung Chiến',
      phone: '0987654321',
      address: 'Tòa nhà Quản trị ShopMart Tower, Ba Đình, Hà Nội'
    })
  );
  localStorage.setItem('token', realJwt);

  const originalPost = api.post;
  const originalGet = api.get;
  try {
    api.post = async (url) => {
      assert.equal(url, '/auth/login');
      return {
        accessToken: realJwt,
        refreshToken: 'refresh-real',
        userId: 2,
        email: 'letrungchien195@gmail.com',
        fullName: 'Lê Trung Chiến',
        roles: ['ROLE_USER']
      };
    };
    api.get = async (url) => {
      if (url === '/auth/me') {
        return {
          id: 2,
          email: 'letrungchien195@gmail.com',
          fullName: 'Lê Trung Chiến',
          phone: '0862739003',
          authorities: [{ authority: 'ROLE_USER' }]
        };
      }
      throw new Error(`Unexpected GET ${url}`);
    };

    const loginResult = await authService.login({
      email: 'letrungchien195@gmail.com',
      password: 'Password123!'
    });
    assert.equal(loginResult.address, '');
    assert.equal(loginResult.phone, '');

    const meResult = await authService.getCurrentUser();
    assert.equal(meResult.phone, '0862739003', 'Phải lấy đúng SĐT thật từ API /auth/me thay vì localStorage cũ');
    assert.equal(meResult.address, '', 'Không giữ ShopMart Tower từ localStorage["user"] cũ');
  } finally {
    api.post = originalPost;
    api.get = originalGet;
  }
});

test('FIX-CHECKOUT-03: Chế độ Mock Auth (USE_MOCK_AUTH / mock-auth-token) vẫn hoạt động bình thường', async () => {
  localStorage.clear();
  const mockLoginPayload = normalizeAuthPayload(
    {
      accessToken: 'mock-auth-token-1-123456',
      userId: 1,
      email: 'user@test.com',
      fullName: 'Nguyễn Văn A (Test User)',
      roles: ['ROLE_USER']
    },
    {},
    { isMock: true }
  );

  assert.equal(mockLoginPayload.phone, '0912345678');
  assert.equal(mockLoginPayload.address, '123 Đường Cầu Giấy, Dịch Vọng, Cầu Giấy, Hà Nội');

  // Test mock getCurrentUser với mock token
  localStorage.setItem('token', 'mock-auth-token-2-9999');
  localStorage.setItem(
    'user',
    JSON.stringify({
      id: 2,
      userId: 2,
      email: 'admin@test.com',
      fullName: 'Quản Trị Viên Hệ Thống'
    })
  );
  const currentMockUser = await authService.getCurrentUser();
  assert.equal(currentMockUser.email, 'admin@test.com');
  assert.equal(currentMockUser.phone, '0987654321');
});

test('FIX-CHECKOUT-04: userService.getProfile và getAddresses gọi đúng API thật, không fallback về localStorage.address giả khi Backend thật lỗi hoặc rỗng', async () => {
  localStorage.clear();
  localStorage.setItem('token', createRealJwt({ sub: 'user@real.com', userId: 5, exp: Math.floor(Date.now() / 1000) + 3600 }));
  localStorage.setItem('user', JSON.stringify({ id: 5, email: 'user@real.com', address: '123 Đường Cầu Giấy, Hà Nội' }));

  const originalGet = api.get;
  try {
    api.get = async (url) => {
      if (url === '/users/profile') {
        return {
          id: 5,
          email: 'user@real.com',
          fullName: 'Trần Minh Thực',
          phone: '0901234567',
          defaultAddress: null,
          addresses: []
        };
      }
      if (url === '/users/me/addresses') {
        return [];
      }
      throw new Error(`Unexpected GET ${url}`);
    };

    const profile = await userService.getProfile();
    const addresses = await userService.getAddresses();
    assert.equal(profile.phone, '0901234567');
    assert.equal(profile.defaultAddress, null);
    assert.deepEqual(addresses, []);

    // Khi BE /users/profile lỗi trong chế độ Backend thật: KHÔNG trả address từ localStorage
    api.get = async () => {
      const err = new Error('500 Server Error');
      err.response = { status: 500 };
      throw err;
    };
    await assert.rejects(() => userService.getProfile(), /500/);
  } finally {
    api.get = originalGet;
  }
});

test('FIX-CHECKOUT-05: Logic ánh xạ AddressResponse và ghép shippingAddress không lặp Tỉnh/Thành phố', () => {
  const dto = {
    id: 10,
    receiverName: 'Lê Trung Chiến',
    phone: '0862739003',
    addressLine: 'Số 25 Ngõ 68 Xuân Thủy',
    ward: 'Phường Dịch Vọng Hậu',
    district: 'Quận Cầu Giấy',
    city: 'Hà Nội',
    isDefault: true
  };

  const street = buildStreetAddressFromDto(dto);
  assert.equal(street, 'Số 25 Ngõ 68 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy');
  assert.equal(
    composeFullShippingAddress(street, dto.city),
    'Số 25 Ngõ 68 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội'
  );

  // Trường hợp addressLine đã chứa sẵn "Hà Nội"
  const dupDto = {
    addressLine: 'Số 10 Phố Huế, Hai Bà Trưng, Hà Nội',
    ward: '',
    district: '',
    city: 'Hà Nội'
  };
  const dupStreet = buildStreetAddressFromDto(dupDto);
  assert.equal(
    composeFullShippingAddress(dupStreet, 'Hà Nội'),
    'Số 10 Phố Huế, Hai Bà Trưng, Hà Nội',
    'Không được ghép "Hà Nội" hai lần'
  );
});

test('FIX-CHECKOUT-06: Kiểm tra mã nguồn Checkout.jsx, AuthContext.jsx và OrderSuccess.jsx đã loại bỏ hardcode và giới hạn nút test theo import.meta.env.DEV', () => {
  const checkoutSrc = readSrc('pages/customer/Checkout.jsx');
  const authContextSrc = readSrc('context/AuthContext.jsx');
  const orderSuccessSrc = readSrc('pages/customer/OrderSuccess.jsx');

  // 1. Checkout khởi tạo state rỗng thay vì giá trị hardcode
  assert.match(
    checkoutSrc,
    /useState\(\{\s*receiverName:\s*'',\s*receiverPhone:\s*'',\s*streetAddress:\s*'',\s*city:\s*'',\s*note:\s*'',/,
    'Checkout.jsx phải khởi tạo receiverName, receiverPhone, streetAddress, city, note bằng chuỗi rỗng'
  );
  assert.doesNotMatch(
    checkoutSrc,
    /const\s+\[formData,\s*setFormData\]\s*=\s*useState\(\{[^}]*?(Giao trong giờ hành chính|city:\s*'Hà Nội'|123 Đường Cầu Giấy|0912 345 678|Nguyễn Văn A)[^}]*\}\)/,
    'Không được hardcode receiverName, phone, streetAddress, city Hà Nội hoặc note mẫu trong useState'
  );

  // 2. Checkout gọi userService.getProfile() và userService.getAddresses()
  assert.match(checkoutSrc, /userService\.getProfile\(\)/);
  assert.match(checkoutSrc, /userService\.getAddresses\(\)/);
  assert.match(checkoutSrc, /id="saved-address-select"/, 'Checkout phải hỗ trợ chọn từ sổ địa chỉ khi có địa chỉ lưu');

  // 3. Nút điền nhanh thông tin test chỉ xuất hiện/chạy trong DEV
  assert.match(checkoutSrc, /\{import\.meta\.env\.DEV\s*&&\s*\(/, 'Nút test chỉ render khi import.meta.env.DEV = true');
  assert.match(checkoutSrc, /if\s*\(!import\.meta\.env\.DEV\)\s*return;/, 'handleFillTestData phải chặn ngoài môi trường DEV');

  // 4. AuthContext ưu tiên dữ liệu API (freshProfile / freshUser) trước localStorage['user']
  assert.match(authContextSrc, /freshProfile\?\.phone\s*\?\?\s*freshUser\.phone\s*\?\?\s*''/);
  assert.match(authContextSrc, /userService\.getProfile\(\)/);

  // 5. OrderSuccess không hiển thị thông tin giả
  assert.doesNotMatch(orderSuccessSrc, /123 Đường Cầu Giấy/);
  assert.doesNotMatch(orderSuccessSrc, /0912 345 678/);
});
