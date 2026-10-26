import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import OrderItem from '../../components/order/OrderItem';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import ErrorMessage from '../../components/common/ErrorMessage';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      // Gọi API Backend thật: GET /api/orders/my-orders
      const data = await orderService.getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="container page-container">
        <Loading message="Đang tải danh sách đơn hàng của bạn..." />
      </div>
    );
  }

  return (
    <div className="container page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Lịch sử đơn hàng của bạn</h1>
        <button
          onClick={fetchOrders}
          style={{
            background: 'none',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            padding: '0.4rem 0.8rem',
            cursor: 'pointer',
            fontSize: '0.85rem',
            color: '#475569'
          }}
        >
          🔄 Làm mới
        </button>
      </div>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {orders.length === 0 ? (
        <EmptyState
          title="Bạn chưa có đơn hàng nào"
          description="Hãy đặt mua sản phẩm đầu tiên để theo dõi tình trạng đơn hàng tại đây."
          actionText="Bắt đầu mua sắm"
          onAction={() => window.location.href = '/products'}
        />
      ) : (
        <div>
          {orders.map((order) => (
            <OrderItem key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
