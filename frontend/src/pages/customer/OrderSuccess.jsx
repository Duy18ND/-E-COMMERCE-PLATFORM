import { Link, useLocation } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

const OrderSuccess = () => {
  const location = useLocation();
  const orderId = location.state?.orderId || 1004;
  let order = location.state?.order;

  if (!order) {
    try {
      const stored = JSON.parse(localStorage.getItem('shopmart_orders_mock') || '[]');
      order = stored.find((o) => String(o.id) === String(orderId)) || null;
    } catch {
      order = null;
    }
  }

  const isOnlinePayment = Boolean(
    location.state?.isOnlinePayment ||
    order?.paymentMethod === 'MOCK_ONLINE' ||
    order?.onlinePaymentProvider
  );

  const onlineMethodName =
    location.state?.onlineMethod ||
    order?.onlinePaymentProviderLabel ||
    'MoMo';

  const paymentMethodLabel = isOnlinePayment
    ? `Thanh toán trực tuyến (${onlineMethodName})`
    : 'Thanh toán khi nhận hàng (COD)';

  const paidAmount = order?.totalAmount ?? location.state?.amountPaid ?? 0;

  return (
    <div className="container page-container" style={{ textAlign: 'center', maxWidth: '680px', paddingBottom: '4rem' }}>
      <div
        className="card"
        style={{
          padding: 'clamp(1.5rem, 4vw, 2.5rem) clamp(1rem, 3vw, 2rem)',
          borderRadius: '20px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.06)'
        }}
      >
        {/* Icon thành công */}
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
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 20px rgba(22, 163, 74, 0.2)'
          }}
        >
          ✓
        </div>

        {/* Tiêu đề */}
        <h1 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.85rem)', fontWeight: 900, marginBottom: '0.5rem', color: '#0f172a' }}>
          {isOnlinePayment ? 'Thanh toán thành công' : 'Đặt Hàng Thành Công!'}
        </h1>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', lineHeight: 1.5, fontSize: '0.925rem' }}>
          {isOnlinePayment
            ? 'Giao dịch thanh toán trực tuyến của bạn đã được xác nhận thành công. ShopMart đang tiến hành xử lý và giao hàng tới bạn trong thời gian sớm nhất.'
            : 'Cảm ơn bạn đã tin tưởng mua sắm tại ShopMart. Đơn hàng của bạn đã được tiếp nhận và đang sẵn sàng chuyển sang bước xử lý tiếp theo.'}
        </p>

        {/* Order Receipt Card */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: isOnlinePayment ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '1.75rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Mã đơn hàng:</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2563eb' }}>#{orderId}</span>
          </div>

          <div className="form-grid-2" style={{ gap: '0.75rem', fontSize: '0.85rem' }}>
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
            <div className="col-span-full">
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Địa chỉ nhận hàng:</span>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {order?.shippingAddress || '123 Đường Cầu Giấy, Hà Nội'}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>Phương thức thanh toán:</span>
              <div style={{ fontWeight: 700, color: isOnlinePayment ? '#1e40af' : '#0f172a', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span>{isOnlinePayment ? '💳' : '💵'}</span>
                <span>{paymentMethodLabel}</span>
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                {isOnlinePayment ? 'Trạng thái thanh toán:' : 'Trạng thái đơn hàng:'}
              </span>
              <div>
                {isOnlinePayment ? (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    backgroundColor: '#dcfce7',
                    color: '#16a34a'
                  }}>
                    ● PAID (Đã thanh toán)
                  </span>
                ) : (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    backgroundColor: '#fef3c7',
                    color: '#d97706'
                  }}>
                    ● PENDING (Chờ xác nhận)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Breakdown & Số tiền đã thanh toán */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {order?.subtotal !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                <span>Tiền hàng:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(order.subtotal)}</span>
              </div>
            )}
            {Number(order?.discountAmount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>
                <span>Giảm giá{order.couponCode || order.voucherCode ? ` (${order.couponCode || order.voucherCode})` : ''}:</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            {order?.shippingFee !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
                <span>Phí vận chuyển:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(order.shippingFee)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', paddingTop: '0.4rem', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                {isOnlinePayment ? 'Số tiền đã thanh toán:' : 'Tổng tiền cần thanh toán:'}
              </span>
              <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#dc2626' }}>
                {formatCurrency(paidAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Xem đơn hàng & Tiếp tục mua sắm */}
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
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.15s'
              }}
            >
              <span>📑</span>
              <span>Xem đơn hàng</span>
            </button>
          </Link>

          <Link to="/products" style={{ textDecoration: 'none' }}>
            <button
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9999px',
                padding: '0.75rem 1.35rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                transition: 'all 0.15s'
              }}
            >
              <span>🛍️</span>
              <span>Tiếp tục mua sắm</span>
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
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
