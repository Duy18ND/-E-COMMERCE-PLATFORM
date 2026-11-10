import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import { isOrderCompletedForReview } from '../../services/reviewService';
import OrderStatus from './OrderStatus';
import Button from '../common/Button';

const DEFAULT_PRODUCT_THUMB =
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80';

const OrderItem = ({
  order,
  reviewsMap = {},
  productImagesMap = {},
  onOpenReviewModal
}) => {
  if (!order) return null;

  const subtotal = Number(order.subtotal ?? order.totalPrice ?? order.totalAmount ?? 0);
  const discountAmount = Math.max(0, Number(order.discountAmount ?? 0) || 0);
  const shippingFee = Math.max(0, Number(order.shippingFee ?? 0) || 0);
  const couponCode = order.couponCode || order.voucherCode || null;
  const displayTotalAmount =
    order.subtotal !== undefined || order.discountAmount !== undefined || order.shippingFee !== undefined
      ? Math.max(0, subtotal - discountAmount) + shippingFee
      : Number(order.totalAmount ?? order.totalPrice ?? 0);

  const items = Array.isArray(order.items) ? order.items : [];
  const isOrderEligibleForReview = isOrderCompletedForReview(order.status);

  return (
    <div
      className="card"
      data-testid={`order-history-card-${order.id || order.orderNumber}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '1.15rem 1.35rem',
        marginBottom: '1.15rem',
        gap: '1rem'
      }}
    >
      {/* Header đơn hàng */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          paddingBottom: items.length > 0 ? '0.85rem' : 0,
          borderBottom: items.length > 0 ? '1px solid #f1f5f9' : 'none'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '1rem' }}>
              Đơn #{order.id || order.orderNumber}
            </span>
            <OrderStatus status={order.status} />
            {discountAmount > 0 && (
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#16a34a',
                  backgroundColor: '#dcfce7',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '6px'
                }}
              >
                🎫 {couponCode ? `${couponCode}: ` : ''}-{formatCurrency(discountAmount)}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Ngày đặt: {order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN') : 'Mới đặt'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              {order.items?.length || 1} sản phẩm
            </div>
            <div style={{ fontWeight: 'bold', color: '#2563eb', fontSize: '1.1rem' }}>
              {formatCurrency(displayTotalAmount)}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to={`/orders/${order.id || order.orderNumber}/tracking`}>
              <Button variant="secondary" size="sm">
                Theo dõi
              </Button>
            </Link>
            <Link to={`/orders/${order.id || order.orderNumber}`}>
              <Button variant="outline" size="sm">
                Xem chi tiết
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Danh sách sản phẩm trong đơn hàng & Nút Đánh giá sản phẩm */}
      {items.length > 0 && (
        <div
          data-testid={`order-history-items-${order.id || order.orderNumber}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          {items.map((item, idx) => {
            const productId = item.productId || item.id;
            const productName = item.productName || item.name || `Sản phẩm #${productId || idx + 1}`;
            const unitPrice = Number(item.priceAtPurchase ?? item.price ?? 0);
            const quantity = Number(item.quantity ?? 1);
            const lineSubtotal = Number(item.subTotal ?? unitPrice * quantity);
            const productImage =
              item.imageUrl ||
              item.image ||
              (productId ? productImagesMap[String(productId)] : null) ||
              DEFAULT_PRODUCT_THUMB;

            const existingReview = productId ? reviewsMap[String(productId)] : null;

            return (
              <div
                key={item.id || `${productId}-${idx}`}
                data-testid={`order-history-product-row-${productId}`}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  padding: '0.75rem 0.95rem',
                  borderRadius: '10px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}
              >
                {/* Thông tin sản phẩm */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: '220px', flex: 1 }}>
                  <img
                    src={productImage}
                    alt={productName}
                    style={{
                      width: '52px',
                      height: '52px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      flexShrink: 0
                    }}
                  />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    {productId ? (
                      <Link
                        to={`/products/${productId}`}
                        style={{
                          fontWeight: 700,
                          fontSize: '0.92rem',
                          color: '#0f172a',
                          textDecoration: 'none',
                          display: 'block',
                          marginBottom: '0.2rem'
                        }}
                      >
                        {productName}
                      </Link>
                    ) : (
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                        {productName}
                      </div>
                    )}

                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                      <span>Đơn giá: {formatCurrency(unitPrice)}</span>
                      <span>• Số lượng: x{quantity}</span>
                      <span style={{ fontWeight: 600, color: '#334155' }}>
                        • Thành tiền: {formatCurrency(lineSubtotal)}
                      </span>
                    </div>

                    {/* Hiển thị chi tiết đánh giá nếu người dùng đã đánh giá sản phẩm này */}
                    {existingReview && (
                      <div
                        data-testid={`order-history-review-summary-${productId}`}
                        style={{
                          marginTop: '0.45rem',
                          padding: '0.4rem 0.65rem',
                          borderRadius: '8px',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          fontSize: '0.78rem',
                          color: '#166534',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.15rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ color: '#f59e0b', fontWeight: 800, letterSpacing: '1px' }}>
                            {'★'.repeat(Number(existingReview.rating) || 5)}
                            {'☆'.repeat(Math.max(0, 5 - (Number(existingReview.rating) || 5)))}
                          </span>
                          <span style={{ fontWeight: 700 }}>({existingReview.rating}/5 sao)</span>
                        </div>
                        {existingReview.comment && (
                          <div style={{ color: '#15803d', fontStyle: 'italic' }}>
                            &ldquo;{existingReview.comment}&rdquo;
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Khu vực nút Đánh giá sản phẩm / Trạng thái Đã đánh giá */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {existingReview ? (
                    <>
                      <span
                        data-testid={`order-history-reviewed-badge-${productId}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '9999px',
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                          border: '1px solid #86efac',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}
                      >
                        <span>✓</span>
                        <span>Đã đánh giá</span>
                      </span>

                      {typeof onOpenReviewModal === 'function' && (
                        <button
                          type="button"
                          data-testid={`order-history-edit-review-btn-${productId}`}
                          onClick={() => onOpenReviewModal(order, item, existingReview)}
                          style={{
                            padding: '0.38rem 0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Sửa đánh giá
                        </button>
                      )}
                    </>
                  ) : isOrderEligibleForReview ? (
                    <button
                      type="button"
                      data-testid={`order-history-review-btn-${productId}`}
                      onClick={() =>
                        typeof onOpenReviewModal === 'function' && onOpenReviewModal(order, item, null)
                      }
                      style={{
                        padding: '0.45rem 0.9rem',
                        borderRadius: '8px',
                        border: '1px solid #f59e0b',
                        backgroundColor: '#fffbeb',
                        color: '#b45309',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: '0 1px 2px rgba(245, 158, 11, 0.12)'
                      }}
                    >
                      <span>⭐</span>
                      <span>Đánh giá sản phẩm</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      data-testid={`order-history-review-disabled-${productId}`}
                      title="Chỉ có thể đánh giá sản phẩm khi đơn hàng đã giao thành công (DELIVERED / COMPLETED)"
                      style={{
                        padding: '0.42rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f1f5f9',
                        color: '#94a3b8',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'not-allowed',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <span>🔒</span>
                      <span>Đánh giá sản phẩm (Chờ hoàn thành đơn)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrderItem;
