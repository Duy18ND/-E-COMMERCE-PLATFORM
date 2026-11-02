import { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import CartItem from '../../components/cart/CartItem';
import CartSummary from '../../components/cart/CartSummary';
import EmptyState from '../../components/common/EmptyState';
import Button from '../../components/common/Button';
import Loading from '../../components/common/Loading';
import FlashCountdown from '../../components/sale/FlashCountdown';
import { formatCurrency } from '../../utils/formatCurrency';

const Cart = () => {
  const { isAdmin } = useAuth();
  const { cartItems, totalItems, totalPrice, totalOriginalPrice, totalDiscount, clearCart, loading } = useCart();
  const [reservationEnd] = useState(() => Date.now() + 14 * 60 * 1000 + 49 * 1000); // 14:49 đếm ngược chuẩn ảnh

  const hasFlashSaleItems = cartItems.some((item) => item.isFlashSale || item.salePrice);

  if (isAdmin) {
    return (
      <div className="container page-container">
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '600px', margin: '2rem auto' }}>
          <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '1rem' }}>🛡️</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
            Khu vực mua sắm dành cho Khách hàng
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.925rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Tài khoản Quản trị viên (Admin) không sử dụng tính năng giỏ hàng mua sắm. Bạn có thể quản lý sản phẩm, đơn hàng và các chiến dịch Flash Sale trong trang Quản trị.
          </p>
          <Link
            to="/admin/sales"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              padding: '0.65rem 1.5rem',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
            }}
          >
            <span>Về Quản lý Sale (Admin)</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    );
  }

  if (loading && cartItems.length === 0) {
    return (
      <div className="container page-container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <Loading message="Đang tải giỏ hàng của bạn..." />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '3rem' }}>
      {/* 1. TOP FLASH SALE RESERVATION ALERT BAR (THEO ĐÚNG ẢNH MẪU 3) */}
      {hasFlashSaleItems && (
        <div
          style={{
            backgroundColor: '#dc2626',
            color: '#ffffff',
            padding: '0.65rem 1rem',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)'
          }}
        >
          <div
            className="container"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.85rem',
              fontWeight: 600,
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>⚡</span>
              <span>
                <strong>Cảnh báo giữ chỗ:</strong> Suất giá Flash Sale đặc biệt được bảo lưu trong giỏ hàng:
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <FlashCountdown targetEndTime={reservationEnd} variant="cart-alert" />
              <span style={{ opacity: 0.9, fontSize: '0.8rem' }}>(Hết hạn sẽ trở về giá niêm yết)</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. BREADCRUMBS & TRUST HEADER */}
      <div style={{ padding: '0.85rem 0', borderBottom: '1px solid #f1f5f9' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.825rem', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <Link to="/" style={{ color: '#64748b' }}>Trang chủ</Link>
            <span>/</span>
            <Link to="/flash-sale" style={{ color: '#64748b' }}>Flash Sale</Link>
            <span>/</span>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>Giỏ hàng của bạn</span>
          </div>

          <div
            style={{
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              padding: '3px 10px',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>✓</span>
            <span>Cam kết hàng chính hãng 100% • Đổi trả 30 ngày</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN CART CONTAINER */}
      <div className="container" style={{ paddingTop: '1.5rem' }}>
        {cartItems.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.5rem' }}>🛒</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Giỏ hàng đang trống</h2>
            <p style={{ color: '#64748b', margin: '0.5rem 0 1.5rem' }}>
              Bạn chưa có sản phẩm nào trong giỏ. Hãy săn ngay các deal Flash Sale giá sốc!
            </p>
            <Link
              to="/flash-sale"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '0.75rem 1.75rem',
                borderRadius: '9999px',
                fontWeight: 700,
                textDecoration: 'none'
              }}
            >
              <span>⚡</span>
              <span>Săn deal Flash Sale ngay</span>
            </Link>
          </div>
        ) : (
          <div>
            {/* Cart Header banner */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: 'clamp(1rem, 2.5vw, 1.25rem) clamp(1rem, 2.5vw, 1.5rem)',
                marginBottom: '1.5rem',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}
            >
              <div>
                <h1 style={{ fontSize: 'clamp(1.15rem, 2vw, 1.4rem)', fontWeight: 900, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🛒</span>
                  <span>Giỏ hàng của bạn ({totalItems} món)</span>
                </h1>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                  Ưu đãi áp dụng tự động cho khung giờ Flash Sale vàng hiện tại.
                </p>
              </div>

              {totalDiscount > 0 && (
                <div
                  style={{
                    backgroundColor: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '12px',
                    padding: '0.65rem 1.25rem',
                    textAlign: 'right'
                  }}
                >
                  <div style={{ fontSize: '0.675rem', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase' }}>
                    TIẾT KIỆM THẦN TỐC
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#dc2626' }}>
                    {formatCurrency(totalDiscount)}
                  </div>
                </div>
              )}
            </div>

            {/* Split layout: Items on Left, Summary on Right */}
            <div className="layout-split">
              {/* Left Column: Cart Items List */}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)'
                  }}
                >
                  {cartItems.map((item) => (
                    <CartItem key={item.id || item.itemId} item={item} />
                  ))}

                  <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="outline" size="sm" onClick={clearCart}>
                      Xóa toàn bộ giỏ hàng
                    </Button>
                  </div>
                </div>

                {/* Reservation Policy Card (Theo đúng ảnh mẫu 3) */}
                <div
                  style={{
                    marginTop: '1.25rem',
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '14px',
                    padding: '1.15rem 1.25rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem'
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      flexShrink: 0
                    }}
                  >
                    ⏱️
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#991b1b', marginBottom: '0.2rem' }}>
                      Chính sách giữ giá chớp nhoáng
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#b91c1c', margin: 0, lineHeight: 1.5 }}>
                      ⚡ <strong>Giá Flash Sale được giữ chỗ trong giỏ hàng trong vòng 15 phút.</strong> Vui lòng thanh toán sớm để không bỏ lỡ ưu đãi! Khi đồng hồ đếm ngược kết thúc, sản phẩm sẽ tự động cập nhật về giá niêm yết ban đầu.
                    </p>
                  </div>
                </div>

                {/* Trust guarantee row below items */}
                <div className="trust-grid" style={{ marginTop: '1.25rem' }}>
                  <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🚚</span>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>Giao nhanh 2h</div>
                      <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Miễn phí cho đơn từ 500k</div>
                    </div>
                  </div>
                  <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🛡️</span>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>Cam kết chính hãng</div>
                      <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Hoàn 200% nếu phát hiện giả</div>
                    </div>
                  </div>
                  <div className="card" style={{ padding: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🔄</span>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>Đổi mới 30 ngày</div>
                      <div style={{ fontSize: '0.675rem', color: '#64748b' }}>Lỗi 1 đổi 1 tận nơi</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary */}
              <div style={{ minWidth: 0 }}>
                <CartSummary
                  totalItems={totalItems}
                  totalPrice={totalPrice}
                  totalOriginalPrice={totalOriginalPrice}
                  totalDiscount={totalDiscount}
                  showCheckoutButton={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
