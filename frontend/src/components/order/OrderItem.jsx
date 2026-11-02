import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderStatus from './OrderStatus';
import Button from '../common/Button';

const OrderItem = ({ order }) => {
  if (!order) return null;

  const subtotal = Number(order.subtotal ?? order.totalPrice ?? order.totalAmount ?? 0);
  const discountAmount = Math.max(0, Number(order.discountAmount ?? 0) || 0);
  const shippingFee = Math.max(0, Number(order.shippingFee ?? 0) || 0);
  const couponCode = order.couponCode || order.voucherCode || null;
  const displayTotalAmount =
    order.subtotal !== undefined || order.discountAmount !== undefined || order.shippingFee !== undefined
      ? Math.max(0, subtotal - discountAmount) + shippingFee
      : Number(order.totalAmount ?? order.totalPrice ?? 0);

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 1.25rem',
        marginBottom: '1rem',
        gap: '1rem'
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 'bold', color: '#0f172a' }}>
            Đơn #{order.id || order.orderNumber}
          </span>
          <OrderStatus status={order.status} />
          {discountAmount > 0 && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#16a34a',
                backgroundColor: '#dcfce7',
                padding: '0.15rem 0.5rem',
                borderRadius: '6px'
              }}
            >
              🎫 {couponCode ? `${couponCode}: ` : ''}-{formatCurrency(discountAmount)}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Ngày đặt: {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : 'Mới đặt'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {order.items?.length || 1} sản phẩm
          </div>
          <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '1.1rem' }}>
            {formatCurrency(displayTotalAmount)}
          </div>
        </div>

        <Link to={`/orders/${order.id || order.orderNumber}`}>
          <Button variant="outline" size="sm">
            Xem chi tiết
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default OrderItem;
