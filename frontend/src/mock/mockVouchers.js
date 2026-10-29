/**
 * Mock data cho Voucher / Mã giảm giá
 * discountType: 'PERCENT' | 'FIXED'
 * status: 'ACTIVE' | 'INACTIVE'
 */
export const INITIAL_VOUCHERS = [
  {
    id: 1,
    code: 'GIAM20K',
    name: 'Giảm 20K đơn đầu ngày',
    description: 'Giảm 20.000đ cho đơn hàng từ 200.000đ',
    discountType: 'FIXED',
    discountValue: 20000,
    maxDiscount: null,
    minOrderValue: 200000,
    quantity: 500,
    usedQuantity: 64,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'ACTIVE'
  },
  {
    id: 2,
    code: 'GIAM50K',
    name: 'Ưu đãi mua sắm 50K',
    description: 'Giảm 50.000đ cho đơn hàng từ 500.000đ',
    discountType: 'FIXED',
    discountValue: 50000,
    maxDiscount: null,
    minOrderValue: 500000,
    quantity: 300,
    usedQuantity: 128,
    startDate: '2026-10-15',
    endDate: '2026-11-30',
    status: 'ACTIVE'
  },
  {
    id: 3,
    code: 'SALE10',
    name: 'Siêu sale công nghệ 10%',
    description: 'Giảm 10% tối đa 100.000đ cho đơn từ 300.000đ',
    discountType: 'PERCENT',
    discountValue: 10,
    maxDiscount: 100000,
    minOrderValue: 300000,
    quantity: 1000,
    usedQuantity: 285,
    startDate: '2026-10-20',
    endDate: '2026-11-25',
    status: 'ACTIVE'
  },
  {
    id: 4,
    code: 'TECHVIP',
    name: 'Đặc quyền Tech VIP 15%',
    description: 'Giảm 15% tối đa 300.000đ cho đơn từ 1.000.000đ',
    discountType: 'PERCENT',
    discountValue: 15,
    maxDiscount: 300000,
    minOrderValue: 1000000,
    quantity: 250,
    usedQuantity: 198,
    startDate: '2026-10-01',
    endDate: '2026-11-15',
    status: 'ACTIVE'
  },
  {
    id: 5,
    code: 'FREESHIP',
    name: 'Miễn phí vận chuyển toàn quốc',
    description: 'Giảm 30.000đ phí giao hàng cho đơn từ 150.000đ',
    discountType: 'FIXED',
    discountValue: 30000,
    maxDiscount: null,
    minOrderValue: 150000,
    quantity: 1500,
    usedQuantity: 620,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'ACTIVE'
  },
  {
    id: 6,
    code: 'WELCOME100',
    name: 'Chào mừng thành viên mới',
    description: 'Giảm ngay 100.000đ cho đơn hàng đầu tiên từ 800.000đ',
    discountType: 'FIXED',
    discountValue: 100000,
    maxDiscount: null,
    minOrderValue: 800000,
    quantity: 400,
    usedQuantity: 73,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'ACTIVE'
  }
];
