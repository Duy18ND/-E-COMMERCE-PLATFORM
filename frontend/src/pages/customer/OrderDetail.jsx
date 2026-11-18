import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
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
import ProductReviewForm from '../../components/product/ProductReviewForm';
import reviewService, {
  isOrderCompletedForReview,
  evaluateOrderItemReviewEligibility
} from '../../services/reviewService';

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
  const { user, isAuthenticated } = useAuth();
  const { notify, confirmDialog } = useNotification();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  // Trạng thái đơn đang chờ đồng bộ sau thanh toán QR (PAID / FAILED) — truyền từ Checkout qua navigation state
  const [awaitingStatus, setAwaitingStatus] = useState(location.state?.expectedStatus || null);
  const syncAttemptsRef = useRef(0);

  // State đánh giá sản phẩm sau mua ngay tại trang Chi tiết đơn hàng
  const [itemReviewsMap, setItemReviewsMap] = useState({});
  const [checkingReviews, setCheckingReviews] = useState(false);
  const [reviewCheckErrorsMap, setReviewCheckErrorsMap] = useState({});
  const [reviewModalItem, setReviewModalItem] = useState(null);

  const fetchOrderDetail = async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      // Gọi API Backend: GET /api/orders/{orderId}
      const data = await orderService.getOrderById(id);
      if (isOrderCompletedForReview(data?.status)) {
        setCheckingReviews(true);
      }
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

  // Tải thông tin đánh giá hiện có của người dùng cho từng sản phẩm trong đơn hàng đã giao thành công
  const loadExistingItemReviews = useCallback(async () => {
    if (!order || !Array.isArray(order.items) || order.items.length === 0) {
      setCheckingReviews(false);
      return;
    }
    if (!isOrderCompletedForReview(order.status) || !isAuthenticated || !user) {
      setItemReviewsMap({});
      setReviewCheckErrorsMap({});
      setCheckingReviews(false);
      return;
    }

    const productIds = [
      ...new Set(
        order.items
          .map((it) => it?.productId ?? it?.id)
          .filter((pid) => pid !== undefined && pid !== null)
      )
    ];
    if (productIds.length === 0) {
      setCheckingReviews(false);
      return;
    }

    setCheckingReviews(true);
    setReviewCheckErrorsMap({});

    try {
      const results = await Promise.all(
        productIds.map(async (pid) => {
          try {
            const rev = await reviewService.getMyReview(pid);
            return { pid: String(pid), rev, error: '' };
          } catch (err) {
            return {
              pid: String(pid),
              rev: null,
              error:
                err?.response?.data?.message ||
                err?.message ||
                'Không thể kiểm tra trạng thái đánh giá.'
            };
          }
        })
      );

      const nextMap = {};
      const nextErrMap = {};
      results.forEach(({ pid, rev, error: revErr }) => {
        if (revErr) {
          nextErrMap[pid] = revErr;
        } else if (rev && rev.id) {
          nextMap[pid] = rev;
        }
      });
      setItemReviewsMap(nextMap);
      setReviewCheckErrorsMap(nextErrMap);
    } finally {
      setCheckingReviews(false);
    }
  }, [order, isAuthenticated, user]);

  useEffect(() => {
    loadExistingItemReviews();
  }, [loadExistingItemReviews]);

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
  const isPending = order.status === ORDER_STATUS.PENDING;
  // Nếu vừa xác nhận từ màn hình QR nhưng Kafka ở Backend đang trên đường cập nhật, ưu tiên hiển thị trạng thái vừa xác nhận
  const effectiveStatus = isPending && awaitingStatus ? awaitingStatus : order.status;
  // Mọi phương thức khác COD (MOCK_ONLINE, VNPAY, MOMO, BANK_TRANSFER, QR_CODE...) đều thanh toán qua mã QR
  const isOnlinePayment = order.paymentMethod === 'MOCK_ONLINE' || (!!order.paymentMethod && order.paymentMethod !== 'COD');
  const canPayByQr = isPending && !awaitingStatus && isOnlinePayment;
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
  const canReviewOrderItems = isOrderCompletedForReview(effectiveStatus);

  // Tính toán chi tiết tiền hàng, giảm giá, phí vận chuyển và tổng thanh toán
  // Công thức: totalAmount = subtotal - discountAmount + shippingFee
  const computedItemsSubtotal = items.reduce((sum, item) => {
    const price = Number(item.priceAtPurchase ?? item.price ?? 0);
    const qty = Number(item.quantity ?? 1);
    return sum + Number(item.subTotal ?? price * qty);
  }, 0);

  const subtotal =
    order.subtotal !== undefined && order.subtotal !== null
      ? Number(order.subtotal)
      : order.subtotalAmount !== undefined && order.subtotalAmount !== null
        ? Number(order.subtotalAmount)
        : computedItemsSubtotal || Number(order.totalAmount || 0);
  const discountAmount = Math.max(0, Number(order.discountAmount ?? 0) || 0);
  const shippingFee = Math.max(0, Number(order.shippingFee ?? 0) || 0);
  const couponCode = order.couponCode || order.voucherCode || null;
  const totalAmount =
    order.subtotal !== undefined ||
      order.subtotalAmount !== undefined ||
      order.discountAmount !== undefined ||
      order.shippingFee !== undefined
      ? Math.max(0, subtotal - discountAmount) + shippingFee
      : Number(order.totalAmount ?? Math.max(0, subtotal - discountAmount) + shippingFee);

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
                {order.paymentMethod === 'MOCK_ONLINE'
                  ? `Thanh toán trực tuyến (${order.onlinePaymentProviderLabel || 'Chuyển khoản QR'})`
                  : isOnlinePayment
                    ? 'Thanh toán trực tuyến (Chuyển khoản QR)'
                    : 'Thanh toán khi nhận hàng (COD)'}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
            margin: '0 0 1rem',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '0.5rem'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            📦 Sản phẩm đã đặt ({items.length})
          </h3>
          {canReviewOrderItems ? (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#166534',
                backgroundColor: '#dcfce7',
                padding: '0.2rem 0.65rem',
                borderRadius: '9999px'
              }}
            >
              ⭐ Đơn hàng đã hoàn thành — Bạn có thể đánh giá sản phẩm
            </span>
          ) : (
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              ⏳ Đánh giá sản phẩm sẽ mở sau khi đơn hàng giao thành công
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {items.map((item, idx) => {
            const resolvedProductId = item.productId ?? item.id;
            const existingReview =
              resolvedProductId !== undefined && resolvedProductId !== null
                ? itemReviewsMap[String(resolvedProductId)]
                : null;
            const reviewCheckError =
              resolvedProductId !== undefined && resolvedProductId !== null
                ? reviewCheckErrorsMap[String(resolvedProductId)] || ''
                : '';

            const itemEligibility = evaluateOrderItemReviewEligibility({
              isAuthenticated,
              user,
              order: { ...order, status: effectiveStatus },
              productId: resolvedProductId,
              existingReview,
              checkingReviews: canReviewOrderItems && checkingReviews,
              reviewCheckError
            });

            return (
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
                      {resolvedProductId ? (
                        <Link
                          to={`/products/${resolvedProductId}`}
                          style={{ color: '#0f172a', textDecoration: 'none' }}
                        >
                          {item.name || item.productName}
                        </Link>
                      ) : (
                        item.name || item.productName
                      )}
                    </h4>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Số lượng: <strong>{item.quantity}</strong> &times; {formatCurrency(item.price || item.priceAtPurchase || 0)}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                    {formatCurrency(item.subTotal || ((item.price || item.priceAtPurchase || 0) * item.quantity))}
                  </div>

                  {/* Khu vực Đánh giá sản phẩm sau mua (CHỈ hiển thị khi đơn hàng đã giao thành công & người dùng đã đăng nhập) */}
                  {canReviewOrderItems && isAuthenticated && user && resolvedProductId && (
                    itemEligibility.isLoading ? (
                      <span
                        data-testid={`order-item-review-loading-${resolvedProductId}`}
                        style={{
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          color: '#64748b',
                          padding: '0.3rem 0.65rem',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        ⏳ Đang kiểm tra trạng thái đánh giá...
                      </span>
                    ) : itemEligibility.isError ? (
                      <div
                        data-testid={`order-item-review-error-${resolvedProductId}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}
                      >
                        <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 600 }}>
                          ⚠️ Lỗi kiểm tra đánh giá
                        </span>
                        <button
                          type="button"
                          onClick={loadExistingItemReviews}
                          style={{
                            padding: '0.28rem 0.6rem',
                            borderRadius: '6px',
                            border: '1px solid #fca5a5',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Thử lại
                        </button>
                      </div>
                    ) : itemEligibility.isReviewed ? (
                      <span
                        data-testid={`order-item-reviewed-badge-${resolvedProductId}`}
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#166534',
                          backgroundColor: '#dcfce7',
                          border: '1px solid #86efac',
                          padding: '0.32rem 0.75rem',
                          borderRadius: '9999px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        <span>✓</span>
                        <span>Đã đánh giá ({existingReview.rating}/5 ★)</span>
                      </span>
                    ) : itemEligibility.canShowReviewButton ? (
                      <button
                        type="button"
                        data-testid={`order-item-review-btn-${resolvedProductId}`}
                        onClick={() => {
                          if (!itemEligibility.canOpenReviewForm) return;
                          setReviewModalItem({
                            item: { ...item, id: resolvedProductId, productId: resolvedProductId },
                            existingReview: null
                          });
                        }}
                        style={{
                          padding: '0.4rem 0.85rem',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#f59e0b',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        ⭐ Đánh giá sản phẩm
                      </button>
                    ) : null
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tổng kết thanh toán */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '2px dashed #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem',
            fontSize: '0.925rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
            <span>Tiền hàng:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(subtotal)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: discountAmount > 0 ? '#16a34a' : '#64748b' }}>
            <span>
              Giảm giá{couponCode ? ` (${couponCode})` : ''}:
            </span>
            <span style={{ fontWeight: 700 }}>
              -{formatCurrency(discountAmount)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
            <span>Phí vận chuyển:</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(shippingFee)}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '1.15rem',
              fontWeight: 'bold',
              color: '#0f172a',
              borderTop: '1px solid #f1f5f9',
              paddingTop: '0.65rem',
              marginTop: '0.25rem'
            }}
          >
            <span>Tổng số tiền:</span>
            <span style={{ color: '#2563eb', fontSize: '1.35rem', fontWeight: 800 }}>
              {formatCurrency(order.totalAmount ?? totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Modal Form đánh giá sản phẩm sau mua */}
      {reviewModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Đánh giá sản phẩm sau mua"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            overflowY: 'auto'
          }}
          onClick={() => setReviewModalItem(null)}
        >
          <div
            style={{ width: '100%', maxWidth: '620px', maxHeight: '92vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <ProductReviewForm
              product={reviewModalItem.item}
              orderId={order.id}
              orderInfo={order}
              eligibleOrders={[order]}
              initialReview={reviewModalItem.existingReview}
              onSuccess={(savedReview) => {
                const pid = String(reviewModalItem.item.productId ?? reviewModalItem.item.id);
                setItemReviewsMap((prev) => ({
                  ...prev,
                  [pid]: savedReview
                }));
                setReviewModalItem(null);
              }}
              onDuplicateDetected={async (dupProductId) => {
                if (!dupProductId) return;
                try {
                  const existing = await reviewService.getMyReview(dupProductId);
                  if (existing && existing.id) {
                    setItemReviewsMap((prev) => ({
                      ...prev,
                      [String(dupProductId)]: existing
                    }));
                    setReviewModalItem(null);
                  }
                } catch {
                  // Bỏ qua nếu không tải được
                }
              }}
              onCancel={() => setReviewModalItem(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;
