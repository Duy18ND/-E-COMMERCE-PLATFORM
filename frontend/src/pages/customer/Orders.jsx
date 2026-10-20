import { useState, useEffect } from 'react';
import OrderItem from '../../components/order/OrderItem';
import EmptyState from '../../components/common/EmptyState';
import Loading from '../../components/common/Loading';
import { ORDER_STATUS } from '../../utils/constants';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sẵn sàng kết nối orderService.getMyOrders()
    const timer = setTimeout(() => {
      setOrders([
        {
          id: '1001',
          createdAt: new Date().toISOString(),
          status: ORDER_STATUS.PROCESSING,
          totalAmount: 28990000,
          items: [{ name: 'Laptop Dell XPS 13', quantity: 1 }]
        },
        {
          id: '1002',
          createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
          status: ORDER_STATUS.DELIVERED,
          totalAmount: 1850000,
          items: [{ name: 'Bàn phím cơ không dây', quantity: 1 }]
        }
      ]);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="container page-container">
        <Loading message="Đang tải danh sách đơn hàng..." />
      </div>
    );
  }

  return (
    <div className="container page-container">
      <h1 className="page-title">Lịch sử đơn hàng của bạn</h1>

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
