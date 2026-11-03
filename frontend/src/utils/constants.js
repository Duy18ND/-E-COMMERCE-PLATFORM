export const ROLES = {
  CUSTOMER: 'ROLE_USER',
  ADMIN: 'ROLE_ADMIN'
};

export const STORAGE_KEYS = {
  TOKEN: 'token',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user'
};

// Đồng bộ chính xác với com.ecommerce.order.enums.OrderStatus trong Backend
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  CONFIRMED: 'CONFIRMED',
  PROCESSING: 'PROCESSING',
  SHIPPING: 'SHIPPING',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  // Tương thích ngược với các màn hình cũ
  COMPLETED: 'DELIVERED'
};

export const ORDER_STATUS_LABELS = {
  PENDING: 'Chờ xác nhận',
  PAID: 'Đã thanh toán',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  FAILED: 'Thất bại',
  REFUNDED: 'Đã hoàn tiền',
  COMPLETED: 'Hoàn thành'
};

// Đồng bộ chính xác với com.ecommerce.order.enums.PaymentMethod trong Backend
export const PAYMENT_METHOD = {
  COD: 'COD',
  MOCK_ONLINE: 'MOCK_ONLINE'
};

export const PAYMENT_METHOD_LABELS = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  MOCK_ONLINE: 'Thanh toán trực tuyến'
};
