import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import orderService from '../../services/orderService';
import paymentService from '../../services/paymentService';
import { formatCurrency } from '../../utils/formatCurrency';
import OrderStatus from '../../components/order/OrderStatus';
import Loading from '../../components/common/Loading';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import { ORDER_STATUS } from '../../utils/constants';
import useNotification from '../../hooks/useNotification';
import OrderTimeline from '../../components/order/OrderTimeline';
import QrPaymentModal from '../../components/order/QrPaymentModal';

// Số lần thử đồng bộ lại trạng thái đơn (mỗi 1 giây) sau khi xác nhận thanh toán QR, chờ Kafka cập nhật
const MAX_PAYMENT_SYNC_ATTEMPTS = 8;

/**
 * Trang chi tiết đơn hàng (OrderDetail)
 * Triển khai theo task ECOM-188 (và ECOM-311/ECOM-308)
 * [FE] Trang chi tiết đơn: ngày đặt, mã đơn, timeline và trạng thái hiện tại
 * Hiển thị các mốc có thời gian thực tế, không suy diễn trạng thái chưa cập nhật
 */
const OrderDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const { notify, confirmDialog } = useNotification();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  // Trạng thái đơn đang chờ đồng bộ sau thanh toán QR (PAID / FAILED) — truyền từ Checkout qua navigation state
  const [awaitingStatus, setAwaitingStatus] = useState(location.state?.expectedStatus || null);
  const syncAttemptsRef = useRef(0);

  const fetchOrderDetail = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      // Gọi API Backend: GET /api/orders/{orderId}
      const data = await orderService.getOrderById(id);
      setOrder(data);
    } catch (err) {
      if (silent) return;
      if (err.response?.status === 403) {
        setError('Bạn không có quyền xem thông tin đơn hàng này (Bảo mật IDOR).');
      } else {
        setError(err.message || 'Không thể tải chi tiết đơn hàng.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
    // [Task ECOM-313] Lắng nghe đồng bộ cập nhật trạng thái từ trang Admin (cùng tab, đa tab, focus)
    if (typeof orderService.subscribeOrderStatusSync === 'function') {
      return orderService.subscribeOrderStatusSync(() => {
        fetchOrderDetail();
      }, id);
    }
    return undefined;
  }, [id]);

  // Sau khi xác nhận thanh toán QR: đồng bộ lại trạng thái đơn mỗi 1 giây cho tới khi Kafka cập nhật
  // (PENDING -> PAID / FAILED) hoặc hết số lần thử, tránh hiển thị trạng thái PENDING cũ.
  useEffect(() => {
    if (!awaitingStatus || !order) return undefined;
    if (order.status !== ORDER_STATUS.PENDING || syncAttemptsRef.current >= MAX_PAYMENT_SYNC_ATTEMPTS) {
      setAwaitingStatus(null);
      syncAttemptsRef.current = 0;
      return undefined;
    }
    const timer = setTimeout(() => {
      syncAttemptsRef.current += 1;
      fetchOrderDetail({ silent: true });
    }, 1000);
    return () => clearTimeout(timer);
  }, [awaitingStatus, order]);

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

  // Thanh toán mô phỏng qua màn hình QR nếu đơn còn PENDING
  // Gọi API POST /payments/mock-pay/{orderId} với body { success, note }
  const handleMockPay = (success = true, note = '') => paymentService.mockPay(id, success, note);

  const startPaymentSync = (expectedStatus) => {
    syncAttemptsRef.current = 0;
    setAwaitingStatus(expectedStatus);
    fetchOrderDetail({ silent: true });
  };

  const handleQrPaid = () => {
    setQrOpen(false);
    setOrder((prev) => (prev ? { ...prev, status: ORDER_STATUS.PAID } : prev));
    notify.success(`Thanh toán thành công! Đơn hàng #${id} đã chuyển sang ĐÃ THANH TOÁN (PAID).`);
    startPaymentSync(ORDER_STATUS.PAID);
  };

  const handleQrFailed = () => {
    setQrOpen(false);
    setOrder((prev) => (prev ? { ...prev, status: ORDER_STATUS.FAILED } : prev));
    notify.error(`Thanh toán đơn hàng #${id} thất bại. Hệ thống đã hoàn lại tồn kho và lượt sử dụng Voucher (Saga Rollback).`);
    startPaymentSync(ORDER_STATUS.FAILED);
  };

  if (loading) {
    return (
      <div className="container page-container">
        <Loading message="Đang tải chi tiết đơn hàng..." />
      </div>
    );
  }

  if (error && !order) {
    const is403 = error.includes('403') || error.includes('IDOR') || error.includes('quyền xem');
    return (
      <div className="container page-container" style={{ padding: '2rem 1rem', maxWidth: '640px', margin: '0 auto' }}>
        {is403 ? (
          <div
            className="card"
            style={{
              padding: '2.5rem 2rem',
              textAlign: 'center',
              borderRadius: '1rem',
              border: '1px solid #fee2e2',
              background: 'linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🛡️</div>
            <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.75rem', border: '1px solid #fecaca' }}>
              HTTP 403 Forbidden &bull; IDOR Protection
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#991b1b', margin: '0 0 0.75rem 0' }}>
              Quyền truy cập bị từ chối
            </h2>
            <p style={{ fontSize: '0.925rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              {error}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link to="/orders" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">Danh sách đơn hàng của bạn</Button>
              </Link>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="sm">Về trang chủ</Button>
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ErrorMessage message={error} />
            <Link to="/orders" style={{ color: '#2563eb', fontWeight: 600 }}>
              &larr; Quay lại danh sách đơn hàng
            </Link>
          </>
        )}
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
  // Nếu vừa xác nhận từ màn hình QR nhưng Kafka ở Backend đang trên đường cập nhật, ưu tiên hiển thị trạng thái vừa xác nhận
  const effectiveStatus = order.status === ORDER_STATUS.PENDING && awaitingStatus ? awaitingStatus : order.status;
  const isPending = effectiveStatus === ORDER_STATUS.PENDING;
  // Mọi phương thức khác COD (MOCK_ONLINE, VNPAY, MOMO, BANK_TRANSFER, QR_CODE...) đều thanh toán qua mã QR
  const isOnlinePayment = order.paymentMethod === 'MOCK_ONLINE' || (!!order.paymentMethod && order.paymentMethod !== 'COD');
  const canPayByQr = isPending && isOnlinePayment;
  const isPaidStatus =
    effectiveStatus === ORDER_STATUS.PAID ||
    effectiveStatus === ORDER_STATUS.COMPLETED ||
    effectiveStatus === ORDER_STATUS.DELIVERED ||
    (isOnlinePayment && (
      effectiveStatus === ORDER_STATUS.CONFIRMED ||
      effectiveStatus === ORDER_STATUS.PROCESSING ||
      effectiveStatus === ORDER_STATUS.SHIPPING
    ));
  const isFailedStatus = effectiveStatus === ORDER_STATUS.FAILED;
  const isSyncingPayment = !!awaitingStatus && order.status === ORDER_STATUS.PENDING;

  return (
    <div className="container page-container" style={{ paddingBottom: '3rem' }}>
      {/* Màn hình quét mã QR thanh toán (VietQR) — mở lại bất cứ lúc nào khi đơn online còn PENDING */}
      <QrPaymentModal
        isOpen={qrOpen && canPayByQr}
        order={order}
        onPay={handleMockPay}
        onPaid={handleQrPaid}
        onFailed={handleQrFailed}
        onPayLater={() => setQrOpen(false)}
      />
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
            Đặt ngày: {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            }) : '---'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={loading || actionLoading}
            onClick={fetchOrderDetail}
          >
            🔄 Làm mới
          </Button>

          <Link to={`/orders/${order.id}/tracking`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">
              🚚 Theo dõi kiện hàng
            </Button>
          </Link>

          {/* Nút thao tác khách hàng: Hủy đơn hoặc Thanh toán ngay qua mã QR */}
          {isPending && (
            <>
              <Button
                variant="danger"
                size="sm"
                disabled={actionLoading}
                onClick={handleCancelOrder}
              >
                {actionLoading ? 'Đang xử lý...' : 'Hủy đơn hàng'}
              </Button>

              {canPayByQr && (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={actionLoading || isSyncingPayment}
                  onClick={() => setQrOpen(true)}
                >
                  📱 Thanh toán QR ngay
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Đang đồng bộ trạng thái thanh toán từ Kafka (sau khi xác nhận trên màn hình QR) */}
      {isSyncingPayment && (
        <div
          className="card"
          style={{
            padding: '0.85rem 1.1rem', marginBottom: '1.5rem', fontSize: '0.875rem',
            border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', color: '#1e40af',
            display: 'flex', alignItems: 'center', gap: '0.6rem'
          }}
        >
          <span>⏳</span>
          <span>
            Đang đồng bộ kết quả thanh toán ({awaitingStatus === ORDER_STATUS.PAID ? 'ĐÃ THANH TOÁN' : 'THẤT BẠI'}) từ hệ thống...
          </span>
        </div>
      )}

      {/* Nhắc thanh toán cho đơn online còn PENDING */}
      {canPayByQr && !isSyncingPayment && (
        <div
          className="card"
          style={{
            padding: '1rem 1.25rem', marginBottom: '1.5rem',
            border: '1px solid #fde68a', backgroundColor: '#fffbeb',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem'
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, color: '#92400e', fontSize: '0.95rem' }}>
              ⏰ Đơn hàng đang chờ thanh toán
            </div>
            <div style={{ fontSize: '0.825rem', color: '#a16207', marginTop: '0.2rem' }}>
              Quét mã VietQR để thanh toán {formatCurrency(order.totalAmount || 0)} và hoàn tất đơn hàng.
            </div>
          </div>
          <Button variant="primary" size="sm" disabled={actionLoading} onClick={() => setQrOpen(true)}>
            📱 Thanh toán QR ngay
          </Button>
        </div>
      )}

      {/* Dòng thời gian tiến trình trạng thái đơn hàng (ECOM-173 / ECOM-188 / ECOM-311 / ECOM-315) */}
      <OrderTimeline
        orderId={order.id}
        currentStatus={order.status}
        historyData={order.statusHistories}
      />

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
                {isOnlinePayment ? 'Thanh toán trực tuyến (Chuyển khoản QR)' : 'Thanh toán khi nhận hàng (COD)'}
              </strong>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Trạng thái thanh toán:</span>{' '}
              <span style={{ fontWeight: 600, color: isPaidStatus ? '#16a34a' : isFailedStatus ? '#dc2626' : '#d97706' }}>
                {isPaidStatus
                  ? 'Đã thanh toán'
                  : isFailedStatus
                    ? 'Thanh toán thất bại (đã hoàn kho & hoàn Voucher)'
                    : 'Chưa thanh toán'}
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
