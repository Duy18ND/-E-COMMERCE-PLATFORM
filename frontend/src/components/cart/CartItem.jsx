import { formatCurrency } from '../../utils/formatCurrency';
import useCart from '../../hooks/useCart';

const CartItem = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart();

  if (!item) return null;

  const isSale = Boolean(item.isFlashSale || item.salePrice);
  const effectivePrice = Number(isSale && item.salePrice ? item.salePrice : item.price || item.unitPrice || 0);
  const originalPrice = Number(item.originalPrice || effectivePrice);
  const qty = Number(item.quantity || 1);
  const discountPercent = item.discountPercent || (originalPrice > effectivePrice ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100) : 0);
  const lineSavings = Math.max(0, (originalPrice - effectivePrice) * qty);
  const lineTotal = effectivePrice * qty;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1.25rem clamp(0.85rem, 3vw, 1.5rem)',
        borderBottom: '1px solid #f1f5f9',
        gap: '1.25rem',
        flexWrap: 'wrap',
        backgroundColor: '#ffffff',
        transition: 'background-color 0.15s ease'
      }}
    >
      {/* Product Image Frame with Sale Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(0.75rem, 2vw, 1.25rem)', flex: '1 1 260px', minWidth: 0 }}>
        <div
          style={{
            width: '84px',
            height: '84px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            border: '1px solid #e2e8f0'
          }}
        >
          {isSale && discountPercent > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '4px',
                left: '4px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '2px 5px',
                borderRadius: '4px',
                zIndex: 2
              }}
            >
              -{discountPercent}%
            </span>
          )}

          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: '1.75rem' }}>📦</span>
          )}
        </div>

        {/* Product Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {item.resellerTag && (
            <div
              style={{
                fontSize: '0.675rem',
                fontWeight: 800,
                color: '#2563eb',
                letterSpacing: '0.04em',
                marginBottom: '0.2rem',
                textTransform: 'uppercase'
              }}
            >
              {item.resellerTag}
            </div>
          )}

          <h4
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 0.35rem',
              lineHeight: 1.35
            }}
          >
            {item.name}
          </h4>

          {/* Pricing Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: isSale ? '#dc2626' : '#2563eb' }}>
              {formatCurrency(effectivePrice)}
            </span>

            {originalPrice > effectivePrice && (
              <span style={{ fontSize: '0.825rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                {formatCurrency(originalPrice)}
              </span>
            )}

            {lineSavings > 0 && (
              <span
                style={{
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  color: '#dc2626',
                  backgroundColor: '#fee2e2',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                Tiết kiệm: {formatCurrency(lineSavings)} {qty > 1 ? `(${formatCurrency(originalPrice - effectivePrice)}/sp)` : ''}
              </span>
            )}
          </div>

          {/* Stock Notice / Guarantee tag */}
          {item.stockNotice && (
            <div style={{ fontSize: '0.75rem', color: isSale ? '#ea580c' : '#64748b', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>{isSale ? '🔥' : '🛡️'}</span>
              <span>{item.stockNotice}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quantity & Subtotal Row */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem 1.5rem', justifyContent: 'flex-end', marginLeft: 'auto', maxWidth: '100%' }}>
        {/* Quantity Controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            overflow: 'hidden'
          }}
        >
          <button
            onClick={() => updateQuantity(item.id, qty - 1)}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: '#f8fafc',
              cursor: 'pointer',
              fontWeight: 700,
              color: '#334155'
            }}
          >
            -
          </button>
          <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
            {qty}
          </span>
          <button
            onClick={() => updateQuantity(item.id, qty + 1)}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: '#f8fafc',
              cursor: 'pointer',
              fontWeight: 700,
              color: '#334155'
            }}
          >
            +
          </button>
        </div>

        {/* Subtotal */}
        <div style={{ minWidth: '96px', textAlign: 'right' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0f172a' }}>
            {formatCurrency(lineTotal)}
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={() => removeFromCart(item.id)}
          style={{
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '0.4rem',
            fontSize: '1.1rem',
            borderRadius: '6px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ef4444';
            e.currentTarget.style.backgroundColor = '#fee2e2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Xóa khỏi giỏ hàng"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

export default CartItem;
