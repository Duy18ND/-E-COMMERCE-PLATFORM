import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderStatus from '../../components/order/OrderStatus';
import Loading from '../../components/common/Loading';
import { ORDER_STATUS } from '../../utils/constants';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sẵn sàng kết nối orderService.getOrderById(id)
    const timer = setTimeout(() => {
      setOrder({
        id,
        createdAt: new Date().toISOString(),
        status: ORDER_STATUS.PROCESSING,
        shippingAddress: {
          fullName: 'Nguyễn Văn A',
          phone: '0912345678',
          address: '123 Đường Cầu Giấy, Hà Nội'
        },
        paymentMethod: 'COD',
        items: [
          { id: 1, name: 'Laptop Dell XPS 13', price: 28990000, quantity: 1 }
        ],
        totalAmount: 28990000
      });
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [id]);

  if (loading) {
    return (
      <div className="container page-container">
        <Loading message="Đang tải chi tiết đơn hàng..." />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container page-container">
        <p>Không tìm thấy đơn hàng.</p>
        <Link to="/orders">Quay lại danh sách</Link>
      </div>
    );
  }

  return (
    <div className="container page-container">
      <Link to="/orders" style={{ display: 'inline-block', marginBottom: '1rem', color: '#64748b' }}>
        &larr; Quay lại danh sách đơn hàng
      </Link>

      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Đơn hàng #{order.id}</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}
          </p>
        </div>
        <OrderStatus status={order.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Sản phẩm trong đơn */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Sản phẩm đã đặt</h2>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Đơn giá</th>
                  <th>Số lượng</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{formatCurrency(item.price)}</td>
                    <td>{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Thông tin nhận hàng & thanh toán */}
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Thông tin giao hàng</h2>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <strong>Người nhận:</strong> {order.shippingAddress.fullName}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <strong>Số điện thoại:</strong> {order.shippingAddress.phone}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
            <strong>Địa chỉ:</strong> {order.shippingAddress.address}
          </p>

          <h3 style={{ fontSize: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginBottom: '0.5rem' }}>
            Thanh toán
          </h3>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            <strong>Phương thức:</strong> {order.paymentMethod}
          </p>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb' }}>
            Tổng cộng: {formatCurrency(order.totalAmount)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
