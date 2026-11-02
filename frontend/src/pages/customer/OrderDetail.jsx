import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import paymentService from '../../services/paymentService';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderStatus from '../../components/order/OrderStatus';
import Loading from '../../components/common/Loading';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { ORDER_STATUS } from '../../utils/constants';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const fetchOrderDetail = async () => {
    setLoading(true);
    setError('');
    try {
      // Gọi API Backend: GET /api/orders/{orderId}
      const data = await orderService.getOrderById(id);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Không thể tải chi tiết đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  // Hủy đơn hàng khi đơn còn ở trạng thái PENDING
  const handleCancelOrder = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy đơn hàng này không?')) return;
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const updated = await orderService.cancelOrder(id);
      setOrder(updated);
      setNotice('Đơn hàng đã được hủy thành công!');
    } catch (err) {
      setError(err.message || 'Không thể hủy đơn hàng vào lúc này.');
    } finally {
      setActionLoading(false);
    }
  };

  // Thanh toán mô phỏng nếu đơn còn PENDING
  const handleMockPay = async () => {
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      await paymentService.mockPay(id, true);
      setNotice('Thanh toán thành công! Đang làm mới dữ liệu...');
      await fetchOrderDetail();
    } catch (err) {
      setError(err.message || 'Thanh toán mô phỏng thất bại.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container page-container">
        <Loading message="Đang tải chi tiết đơn hàng..." />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container page-container">
        <ErrorMessage message={error} />
        <Link to="/orders" style={{ color: '#2563eb', fontWeight: 600 }}>
          &larr; Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container page-container">
        <p>Không tìm thấy thông tin đơn hàng #{id}.</p>
        <Link to="/orders" style={{ color: '#2563eb' }}>&larr; Quay lại danh sách</Link>
      </div>
    );
  }

  const items = order.items || [];
  const receiverName = order.receiverName || order.shippingAddress?.fullName || 'Người nhận';
  const receiverPhone = order.receiverPhone || order.shippingAddress?.phone || 'Chưa cập nhật';
  const shippingAddress = typeof order.shippingAddress === 'string'
    ? order.shippingAddress
    : order.shippingAddress?.address || 'Chưa cập nhật';

  const isPending = order.status === ORDER_STATUS.PENDING;

  return (
    <div className="container page-container">
      <Link to="/orders" style={{ display: 'inline-block', marginBottom: '1rem', color: '#64748b' }}>
        &larr; Quay lại danh sách đơn hàng
      </Link>

      {error && <ErrorMessage message={error} onClose={() => setError('')} />}

      {notice && (
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '1rem',
            border: '1px solid #bbf7d0'
          }}
        >
          ✓ {notice}
        </div>
      )}

      <div className="flex-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>Đơn hàng #{order.id}</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Ngày đặt: {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'Mới đặt'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
          <OrderStatus status={order.status} />

          {isPending && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMockPay}
                disabled={actionLoading}
              >
                💳 Thanh toán ngay (Mock)
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleCancelOrder}
                disabled={actionLoading}
              >
                ✕ Hủy đơn hàng
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="layout-split">
        {/* Sản phẩm trong đơn */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Sản phẩm đã đặt ({items.length} món)</h2>
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
                {items.map((item, idx) => {
                  const price = Number(item.priceAtPurchase ?? item.price ?? 0);
                  const qty = Number(item.quantity ?? 1);
                  const subTotal = Number(item.subTotal ?? (price * qty));
                  return (
                    <tr key={item.itemId || item.id || idx}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.productName || item.name}
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }}
                            />
                          )}
                          <span style={{ fontWeight: 600 }}>{item.productName || item.name}</span>
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatCurrency(price)}</td>
                      <td>{qty}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#2563eb', whiteSpace: 'nowrap' }}>
                        {formatCurrency(subTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Thông tin nhận hàng & thanh toán */}
        <div className="card" style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Thông tin giao hàng</h2>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <strong>Người nhận:</strong> {receiverName}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <strong>Số điện thoại:</strong> {receiverPhone}
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            <strong>Địa chỉ giao:</strong> {shippingAddress}
          </p>
          {order.note && (
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem', fontStyle: 'italic' }}>
              <strong>Ghi chú:</strong> {order.note}
            </p>
          )}

          <h3 style={{ fontSize: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginBottom: '0.5rem' }}>
            Tổng kết thanh toán
          </h3>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb', marginTop: '0.5rem' }}>
            Tổng cộng: {formatCurrency(order.totalAmount || 0)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
