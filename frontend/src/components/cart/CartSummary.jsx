import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

const CartSummary = ({
  totalItems = 0,
  totalPrice = 0,
  totalOriginalPrice = 0,
  totalDiscount = 0,
  showCheckoutButton = true
}) => {
  const origPrice = totalOriginalPrice > 0 ? totalOriginalPrice : totalPrice + totalDiscount;
  const discountAmount = totalDiscount > 0 ? totalDiscount : Math.max(0, origPrice - totalPrice);

  return (
    <div
      className="card"
      style={{
        padding: '1.5rem',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)'
      }}
    >
      <h3
        style={{
          fontSize: '1.15rem',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '1.25rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '0.75rem'
        }}
      >
        Tóm tắt đơn hàng
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
        {/* Tổng tiền gốc */}
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9rem' }}>
          <span>Tổng tiền gốc ({totalItems} sản phẩm)</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            {formatCurrency(origPrice)}
          </span>
        </div>

        {/* Giảm giá Flash Sale */}
        {discountAmount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontSize: '0.9rem', fontWeight: 600 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⚡</span>
              <span>Giảm giá Flash Sale</span>
            </span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        {/* Phí vận chuyển */}
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.9rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>Phí vận chuyển</span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ⓘ</span>
          </span>
          <span style={{ color: '#16a34a', fontWeight: 600 }}>Miễn phí (0 đ)</span>
        </div>
      </div>

      {/* Tổng thanh toán */}
      <div
        style={{
          borderTop: '1px solid #e2e8f0',
          paddingTop: '1rem',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Tổng thanh toán:</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>(Đã bao gồm VAT 10%)</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#dc2626', lineHeight: 1 }}>
              {formatCurrency(totalPrice)}
            </div>
          </div>
        </div>
      </div>

      {/* Tiết kiệm tổng cộng Banner */}
      {discountAmount > 0 && (
        <div
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '0.65rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            color: '#dc2626',
            fontWeight: 800,
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }}
        >
          <span>🎁</span>
          <span>Tiết kiệm tổng cộng: {formatCurrency(discountAmount)}</span>
        </div>
      )}

      {/* Voucher prompt */}
      <div
        style={{
          backgroundColor: '#eff6ff',
          border: '1px dashed #bfdbfe',
          borderRadius: '10px',
          padding: '0.65rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          fontSize: '0.825rem'
        }}
      >
        <span style={{ color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>🎟️</span>
          <span>Chọn voucher đã lưu khi thanh toán</span>
        </span>
        <Link
          to="/vouchers"
          style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}
        >
          Săn mã →
        </Link>
      </div>

      {/* Checkout Button */}
      {showCheckoutButton && (
        <Link to="/checkout" style={{ width: '100%', display: 'block', textDecoration: 'none' }}>
          <button
            disabled={totalItems === 0}
            style={{
              width: '100%',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.9rem',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: totalItems === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (totalItems > 0) e.currentTarget.style.backgroundColor = '#b91c1c';
            }}
            onMouseLeave={(e) => {
              if (totalItems > 0) e.currentTarget.style.backgroundColor = '#dc2626';
            }}
          >
            <span>Tiến hành đặt hàng ngay</span>
            <span>➔</span>
          </button>
        </Link>
      )}

      {/* Săn Flash Sale link */}
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <Link
          to="/flash-sale"
          style={{
            fontSize: '0.85rem',
            color: '#2563eb',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <span>←</span>
          <span>Tiếp tục săn Flash Sale</span>
        </Link>
      </div>

      {/* Security and Payment methods */}
      <div
        style={{
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #f1f5f9',
          fontSize: '0.75rem',
          color: '#64748b'
        }}
      >
        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>
          THANH TOÁN AN TOÀN & BẢO MẬT
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', color: '#475569' }}>
          <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>💳 Visa / Master</span>
          <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>📱 VietQR / MoMo</span>
          <span style={{ backgroundColor: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>📦 COD kiểm hàng</span>
        </div>
      </div>
    </div>
  );
};

export default CartSummary;
