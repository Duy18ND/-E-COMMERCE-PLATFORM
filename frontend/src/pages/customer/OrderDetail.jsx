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
import useNotification from '../../hooks/useNotification';

const OrderDetail = () => {
  const { id } = useParams();
  const { notify, confirmDialog } = useNotification();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

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
    const confirmed = await confirmDialog({
      title: 'Xác nhận hủy đơn hàng',
      message: `Bạn có chắc chắn muốn hủy đơn hàng #${id} không? Thao tác này sẽ hoàn trả tồn kho và không thể hoàn tác.`,
      variant: 'danger',
      confirmText: 'Hủy đơn hàng',
      cancelText: 'Quay lại'
    });
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const updated = await orderService.cancelOrder(id);
      setOrder(updated);
      notify.success(`Đơn hàng #${id} đã được hủy thành công!`);
    } catch (err) {
      notify.error(err.message || 'Không thể hủy đơn hàng vào lúc này.');
    } finally {
      setActionLoading(false);
    }
  };

  // Thanh toán mô phỏng nếu đơn còn PENDING
  const handleMockPay = async () => {
    setActionLoading(true);
    try {
      await paymentService.mockPay(id, true);
      notify.success('Thanh toán thành công! Đang làm mới dữ liệu...');
      await fetchOrderDetail();
    } catch (err) {
      notify.error(err.message || 'Thanh toán mô phỏng thất bại.');
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
  const phone = order.receiverPhone || order.shippingAddress?.phone || '---';
  const fullAddress = order.shippingAddress?.fullAddress || order.shippingAddress || 'Chưa cung cấp';
  const isPending = order.status === ORDER_STATUS.PENDING;

  return (
    <div className="container page-container" style={{ paddingBottom: '3rem' }}>
      {/* Nút quay lại */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link
          to="/orders"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#2563eb',
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none'
          }}
        >
          <span>&larr;</span> Quay lại danh sách đơn hàng
        </Link>
      </div>

      {/* Header chi tiết đơn */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              Đơn hàng #{order.id}
            </h1>
            <OrderStatus status={order.status} />
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
            Đặt ngày: {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '---'}
          </p>
        </div>

        {/* Nút thao tác khách hàng: Hủy đơn hoặc Thanh toán mô phỏng */}
        {isPending && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button
              variant="danger"
              size="sm"
              disabled={actionLoading}
              onClick={handleCancelOrder}
            >
              {actionLoading ? 'Đang xử lý...' : 'Hủy đơn hàng'}
            </Button>

            {order.paymentMethod === 'MOCK_ONLINE' && (
              <Button
                variant="primary"
                size="sm"
                disabled={actionLoading}
                onClick={handleMockPay}
              >
                {actionLoading ? 'Đang xử lý...' : 'Thanh toán ngay'}
              </Button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Thông tin giao nhận */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            📍 Thông tin nhận hàng
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Người nhận:</span>{' '}
              <strong style={{ color: '#0f172a' }}>{receiverName}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Số điện thoại:</span>{' '}
              <span style={{ color: '#0f172a' }}>{phone}</span>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Địa chỉ:</span>{' '}
              <span style={{ color: '#0f172a' }}>{fullAddress}</span>
            </div>
            {order.note && (
              <div>
                <span style={{ color: '#64748b' }}>Ghi chú:</span>{' '}
                <span style={{ color: '#0f172a', fontStyle: 'italic' }}>{order.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Phương thức thanh toán */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
            💳 Thanh toán
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Phương thức:</span>{' '}
              <strong style={{ color: '#0f172a' }}>
                {order.paymentMethod === 'MOCK_ONLINE' ? 'Thanh toán trực tuyến (Mô phỏng)' : 'Thanh toán khi nhận hàng (COD)'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Trạng thái thanh toán:</span>{' '}
              <span style={{ fontWeight: 600, color: order.status === ORDER_STATUS.PAID || order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.DELIVERED ? '#16a34a' : '#d97706' }}>
                {order.status === ORDER_STATUS.PAID || order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.DELIVERED ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Danh sách sản phẩm */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
          📦 Sản phẩm đã đặt ({items.length})
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: idx === items.length - 1 ? 0 : '1rem',
                borderBottom: idx === items.length - 1 ? 'none' : '1px solid #f1f5f9',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name || item.productName}
                    style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                ) : (
                  <div style={{ width: '56px', height: '56px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                    🛍️
                  </div>
                )}
                <div>
                  <h4 style={{ margin: '0 0 0.25rem', fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>
                    {item.name || item.productName}
                  </h4>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Số lượng: <strong>{item.quantity}</strong> &times; {formatCurrency(item.price || item.priceAtPurchase || 0)}
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                {formatCurrency(item.subTotal || ((item.price || item.priceAtPurchase || 0) * item.quantity))}
              </div>
            </div>
          ))}
        </div>

        {/* Tổng kết tiền */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '2px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Tổng số tiền:</span>
          <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb' }}>
            {formatCurrency(order.totalAmount || 0)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
