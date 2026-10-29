import { Link, useLocation } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

const OrderSuccess = () => {
  const location = useLocation();
  const orderId = location.state?.orderId || 1004;
  const order = location.state?.order;

  return (
    <div className="container page-container" style={{ textAlign: 'center', maxWidth: '680px', paddingBottom: '4rem' }}>
      <div
        className="card"
        style={{
          padding: '2.5rem 2rem',
          borderRadius: '20px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.06)'
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#dcfce7',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            margin: '0 auto 1.25rem'
          }}
        >
          ✓
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '0.5rem', color: '#0f172a' }}>
          Đặt Hàng Thành Công!
        </h1>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5, fontSize: '0.925rem' }}>
          Cảm ơn bạn đã tin tưởng mua sắm tại ShopMart. Đơn hàng của bạn đã được tiếp nhận và đang sẵn sàng chuyển sang bước xử lý tiếp theo.
        </p>

        {/* Order Receipt Card */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '1.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Mã đơn hàng:</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>#{orderId}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Người nhận:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                {order?.receiverName || 'Nguyễn Văn A'}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Số điện thoại:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                {order?.receiverPhone || '0912 345 678'}
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Địa chỉ nhận hàng:</span>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {order?.shippingAddress || '123 Đường Cầu Giấy, Hà Nội'}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Phương thức:</span>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                {order?.paymentMethod === 'MOCK_ONLINE' ? '💳 Thanh toán Online' : '💵 Thanh toán khi nhận hàng (COD)'}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Trạng thái ban đầu:</span>
              <div style={{ fontWeight: 800, color: order?.status === 'PAID' ? '#16a34a' : '#d97706' }}>
                ● {order?.status || 'PENDING'}
              </div>
            </div>
          </div>

          {order?.totalAmount && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Tổng thanh toán:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#dc2626' }}>
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to={`/orders/${orderId}`} style={{ textDecoration: 'none' }}>
            <button
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.75rem 1.5rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
              }}
            >
              <span>📑</span>
              <span>Xem chi tiết đơn hàng #{orderId}</span>
            </button>
          </Link>

          <Link to="/orders" style={{ textDecoration: 'none' }}>
            <button
              style={{
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '9999px',
                padding: '0.75rem 1.25rem',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Lịch sử đơn hàng
            </button>
          </Link>

          <Link to="/flash-sale" style={{ textDecoration: 'none' }}>
            <button
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '9999px',
                padding: '0.75rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <span>⚡</span>
              <span>Tiếp tục săn Flash Sale</span>
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
