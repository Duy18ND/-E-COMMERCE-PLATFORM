import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderStatus from './OrderStatus';
import Button from '../common/Button';

const OrderItem = ({ order }) => {
  if (!order) return null;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ fontWeight: 'bold', color: '#0f172a' }}>
            Đơn #{order.id || order.orderNumber}
          </span>
          <OrderStatus status={order.status} />
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
            {formatCurrency(order.totalAmount || order.totalPrice || 0)}
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
