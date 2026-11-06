import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderStatus from '../../components/order/OrderStatus';
import OrderTimeline from '../../components/order/OrderTimeline';
import Loading from '../../components/common/Loading';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { ORDER_STATUS } from '../../utils/constants';

/**
 * Trang chi tiết theo dõi đơn hàng (OrderTracking)
 * Triển khai theo task ECOM-312: [FE] Trang chi tiết tracking và trạng thái không có quyền
 * Thuộc Epic: CUSTOMER (Parent: ECOM-308 Theo dõi đơn hàng chi tiết)
 *
 * Chức năng:
 * 1. Hiển thị thông tin tracking kiện hàng: Mã vận đơn, Đơn vị vận chuyển, Mã đơn hàng, Trạng thái.
 * 2. Tích hợp dòng thời gian OrderTimeline (bước xử lý, thời gian thực tế, nhật ký hành trình).
 * 3. Hiển thị thông tin người nhận, địa chỉ giao hàng và tóm tắt kiện hàng.
 * 4. Xử lý trạng thái 403 Forbidden / Không có quyền truy cập (Bảo mật IDOR):
 *    - Ngăn rò rỉ thông tin vận chuyển khi user truy cập ID đơn hàng của người khác.
 *    - Hiển thị giao diện Access Denied an toàn với biểu tượng bảo mật và nút điều hướng về trang an toàn.
 * 5. Xử lý Loading state và Error / 404 Not Found.
 */
const OrderTracking = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  const fetchTrackingData = async () => {
    setLoading(true);
    setError('');
    setIsAccessDenied(false);

    try {
      const data = await orderService.getOrderById(id);
      setOrder(data);
    } catch (err) {
      if (err.response?.status === 403) {
        setIsAccessDenied(true);
        setError('Bạn không có quyền xem thông tin theo dõi của đơn hàng này.');
      } else {
        setError(err.message || 'Không thể tải thông tin theo dõi đơn hàng.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchTrackingData();
    }
  }, [id]);

  // =========================================================================
  // TRẠNG THÁI 1: ĐANG TẢI DỮ LIỆU (LOADING)
  // =========================================================================
  if (loading) {
    return (
      <div className="container page-container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loading message="Đang tải dữ liệu theo dõi đơn hàng..." />
      </div>
    );
  }

  // =========================================================================
  // TRẠNG THÁI 2: KHÔNG CÓ QUYỀN TRUY CẬP (403 FORBIDDEN / BẢO MẬT IDOR)
  // =========================================================================
  if (isAccessDenied) {
    return (
      <div className="container page-container" style={{ padding: '3rem 1rem', maxWidth: '720px', margin: '0 auto' }}>
        <div
          className="card"
          style={{
            padding: '2.5rem 2rem',
            textAlign: 'center',
            borderRadius: '1rem',
            border: '1px solid #fee2e2',
            background: 'linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)',
            boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.1)'
          }}
        >
          {/* Biểu tượng khiên bảo mật / khóa */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.25rem',
              marginBottom: '1.25rem'
            }}
          >
            🛡️
          </div>

          <div
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
              border: '1px solid #fecaca'
            }}
          >
            HTTP 403 Forbidden &bull; IDOR Protection
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#991b1b',
              margin: '0 0 0.75rem 0'
            }}
          >
            Quyền truy cập bị từ chối
          </h1>

          <p
            style={{
              fontSize: '0.95rem',
              color: '#64748b',
              lineHeight: 1.6,
              maxWidth: '540px',
              margin: '0 auto 1.5rem auto'
            }}
          >
            Bạn không có quyền xem thông tin hành trình và theo dõi của đơn hàng <strong>#{id}</strong>.
            Vì lý do bảo mật và bảo vệ quyền riêng tư người dùng (chính sách chống IDOR),
            hệ thống chỉ cho phép chủ sở hữu đơn hàng tra cứu dữ liệu vận chuyển.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}
          >
            <Link to="/orders" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="md">
                Danh sách đơn hàng của bạn
              </Button>
            </Link>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="md">
                Về trang chủ
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TRẠNG THÁI 3: LỖI HỆ THỐNG / 404 KHÔNG TÌM THẤY ĐƠN HÀNG
  // =========================================================================
  if (error || !order) {
    return (
      <div className="container page-container" style={{ padding: '2rem 1rem', maxWidth: '720px', margin: '0 auto' }}>
        <ErrorMessage message={error || `Không tìm thấy thông tin đơn hàng #${id}.`} />
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
          <Button variant="primary" size="sm" onClick={fetchTrackingData}>
            Thử lại
          </Button>
          <Link to="/orders" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" size="sm">
              &larr; Quay lại danh sách đơn hàng
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TRẠNG THÁI 4: HIỂN THỊ CHI TIẾT THEO DÕI ĐƠN HÀNG (ORDER TRACKING SUCCESS)
  // =========================================================================
  const trackingNumber = order.trackingNumber || `SPM-VN-${order.id}-TRK`;
  const carrierName = order.carrier || 'ShopMart Express (Tiêu chuẩn)';
  const receiverName = order.receiverName || order.shippingAddress?.fullName || 'Người nhận';
  const phone = order.receiverPhone || order.shippingAddress?.phone || '---';
  const fullAddress = order.shippingAddress?.fullAddress || order.shippingAddress || 'Chưa cung cấp';
  const items = order.items || [];

  // Tính ngày giao hàng ước tính
  const getEstimatedDelivery = () => {
    if (order.status === ORDER_STATUS.COMPLETED || order.status === ORDER_STATUS.DELIVERED) {
      return 'Đã giao thành công';
    }
    if (order.status === ORDER_STATUS.CANCELLED) {
      return 'Đã hủy đơn hàng';
    }
    if (order.status === ORDER_STATUS.FAILED || order.status === ORDER_STATUS.REFUNDED) {
      return 'Giao hàng không thành công';
    }
    // Ước tính 3 ngày sau ngày đặt
    const orderDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const estDate = new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000);
    return `Dự kiến giao: ${estDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  };

  return (
    <div className="container page-container" style={{ paddingBottom: '3rem' }}>
      {/* Thanh điều hướng quay lại */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link
            to={`/orders/${order.id}`}
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
            <span>&larr;</span> Chi tiết đơn hàng
          </Link>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <Link
            to="/orders"
            style={{
              color: '#64748b',
              fontSize: '0.875rem',
              textDecoration: 'none'
            }}
          >
            Danh sách đơn hàng
          </Link>
        </div>

        <Link to={`/orders/${order.id}`} style={{ textDecoration: 'none' }}>
          <Button variant="outline" size="sm">
            Xem đơn hàng #{order.id}
          </Button>
        </Link>
      </div>

      {/* Thẻ Header Tracking thông tin vận chuyển */}
      <div
        className="card"
        style={{
          padding: '1.5rem',
          marginBottom: '1.5rem',
          borderRadius: '0.75rem',
          background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
          border: '1px solid #bfdbfe'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.25rem' }}>🚚</span>
              <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
                Theo dõi kiện hàng: {trackingNumber}
              </h1>
              <OrderStatus status={order.status} />
            </div>

            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#475569' }}>
              <strong>Đơn hàng:</strong> #{order.id} &bull; <strong>Đơn vị vận chuyển:</strong> {carrierName}
            </p>

            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
              <strong>Thời gian đặt:</strong>{' '}
              {order.createdAt
                ? new Date(order.createdAt).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })
                : 'Mới đặt'}
            </p>
          </div>

          <div
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#ffffff',
              borderRadius: '0.5rem',
              border: '1px solid #e2e8f0',
              textAlign: 'right',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 600 }}>
              Tiến độ vận chuyển
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1d4ed8', marginTop: '0.2rem' }}>
              {getEstimatedDelivery()}
            </div>
          </div>
        </div>
      </div>

      {/* Khối hiển thị Timeline tiến trình vận chuyển (ECOM-173, ECOM-311 & ECOM-312) */}
      <div
        className="card"
        style={{
          padding: '1.75rem',
          marginBottom: '1.5rem',
          borderRadius: '0.75rem',
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
            Hành trình kiện hàng & Lịch sử trạng thái
          </h2>
          <Button variant="secondary" size="sm" onClick={fetchTrackingData}>
            🔄 Làm mới
          </Button>
        </div>

        {/* Nhúng Component OrderTimeline với dữ liệu thực tế */}
        <OrderTimeline
          orderId={order.id}
          currentStatus={order.status}
          historyData={order.statusHistories}
        />
      </div>

      {/* Lưới thông tin: Địa chỉ nhận hàng & Tóm tắt kiện hàng */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}
      >
        {/* Thẻ 1: Thông tin người nhận và địa chỉ */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '0.75rem', backgroundColor: '#ffffff' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📍</span> Thông tin nhận hàng
          </h3>
          <div style={{ fontSize: '0.9rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Người nhận:</span>{' '}
              <strong style={{ color: '#0f172a' }}>{receiverName}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Số điện thoại:</span>{' '}
              <strong style={{ color: '#0f172a' }}>{phone}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Địa chỉ giao hàng:</span>{' '}
              <span style={{ color: '#0f172a' }}>{fullAddress}</span>
            </div>
            {order.note && (
              <div style={{ marginTop: '0.25rem', padding: '0.5rem', backgroundColor: '#f8fafc', borderRadius: '0.375rem', border: '1px dashed #cbd5e1' }}>
                <span style={{ color: '#64748b', fontSize: '0.825rem' }}>Ghi chú:</span>{' '}
                <span style={{ color: '#475569', fontSize: '0.85rem' }}>{order.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Thẻ 2: Tóm tắt kiện hàng */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '0.75rem', backgroundColor: '#ffffff' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📦</span> Kiện hàng ({items.length} sản phẩm)
          </h3>
          <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {items.map((item, idx) => {
              const name = item.productName || item.name || 'Sản phẩm';
              const price = item.priceAtPurchase || item.price || 0;
              const qty = item.quantity || 1;
              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    paddingBottom: '0.5rem',
                    borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none'
                  }}
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={name}
                      style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '0.375rem' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '0.375rem',
                        backgroundColor: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem'
                      }}
                    >
                      🛍️
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      x{qty} &bull; {formatCurrency(price)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              paddingTop: '0.75rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 600 }}>Tổng tiền:</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1d4ed8' }}>
              {formatCurrency(order.totalAmount || order.totalPrice || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
