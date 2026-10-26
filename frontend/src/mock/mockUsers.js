/**
 * Mock Users phục vụ kiểm thử giao diện và phân quyền trên Frontend
 * Hỗ trợ 2 vai trò: ROLE_USER và ROLE_ADMIN
 */
export const MOCK_USERS = [
  {
    id: 1,
    email: 'user@test.com',
    password: '123456',
    fullName: 'Test User',
    phone: '0912345678',
    address: '123 Đường Cầu Giấy, Hà Nội',
    roles: ['ROLE_USER']
  },
  {
    id: 2,
    email: 'admin@test.com',
    password: '123456',
    fullName: 'Test Admin',
    phone: '0987654321',
    address: 'Tòa nhà Quản trị, Ba Đình, Hà Nội',
    roles: ['ROLE_ADMIN']
  }
];

export default MOCK_USERS;
