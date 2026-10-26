export const ROLES = {
  CUSTOMER: 'ROLE_USER',
  ADMIN: 'ROLE_ADMIN'
};

export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user'
};

// Đồng bộ chính xác với com.re.backend.order.OrderStatus
export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  SHIPPING: 'SHIPPING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
};

export const ORDER_STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  PAID: 'Đã thanh toán',
  SHIPPING: 'Đang giao hàng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy'
};

// Đồng bộ chính xác với com.re.backend.payment.PaymentMethod
export const PAYMENT_METHOD = {
  COD: 'COD',
  MOCK_ONLINE: 'MOCK_ONLINE'
};

export const PAYMENT_METHOD_LABELS = {
  COD: 'Thanh toán khi nhận hàng (COD)',
  MOCK_ONLINE: 'Thanh toán trực tuyến (Mô phỏng)'
};
