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

export const ONLINE_PAYMENT_PROVIDERS = {
  MOMO: 'MOMO',
  ZALOPAY: 'ZALOPAY',
  BANK_TRANSFER: 'BANK_TRANSFER',
  CREDIT_CARD: 'CREDIT_CARD'
};

export const ONLINE_PAYMENT_METHODS_LIST = [
  {
    id: ONLINE_PAYMENT_PROVIDERS.MOMO,
    name: 'MoMo',
    title: 'Ví điện tử MoMo',
    description: 'Thanh toán tức thì qua ứng dụng MoMo hoặc quét mã QR',
    icon: '🌸',
    color: '#a50064'
  },
  {
    id: ONLINE_PAYMENT_PROVIDERS.ZALOPAY,
    name: 'ZaloPay',
    title: 'Ví điện tử ZaloPay',
    description: 'Thanh toán siêu tốc, an toàn và tiện lợi với ví ZaloPay',
    icon: '⚡',
    color: '#0068ff'
  },
  {
    id: ONLINE_PAYMENT_PROVIDERS.BANK_TRANSFER,
    name: 'Chuyển khoản ngân hàng / QR Code',
    title: 'Chuyển khoản ngân hàng / QR Code',
    description: 'Quét mã VietQR chuyển khoản tức thì qua 40+ ngân hàng nội địa',
    icon: '🏦',
    color: '#059669'
  },
  {
    id: ONLINE_PAYMENT_PROVIDERS.CREDIT_CARD,
    name: 'Visa / Mastercard',
    title: 'Thẻ quốc tế Visa / Mastercard',
    description: 'Hỗ trợ thẻ tín dụng & ghi nợ quốc tế Visa, Mastercard, JCB',
    icon: '💳',
    color: '#1e40af'
  }
];
