import { formatCurrency } from '../../utils/formatCurrency';
import useCart from '../../hooks/useCart';

const CartItem = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart();

  if (!item) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        borderBottom: '1px solid #e2e8f0',
        gap: '1rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
        <div
          style={{
            width: '60px',
            height: '60px',
            backgroundColor: '#f1f5f9',
            borderRadius: '0.375rem',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span>🖼️</span>
          )}
        </div>
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.25rem' }}>
            {item.name}
          </h4>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {formatCurrency(item.price)}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={() => updateQuantity(item.id, item.quantity - 1)}
          style={{
            width: '28px',
            height: '28px',
            border: '1px solid #cbd5e1',
            borderRadius: '0.25rem',
            background: '#ffffff',
            cursor: 'pointer'
          }}
        >
          -
        </button>
        <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 600 }}>
          {item.quantity}
        </span>
        <button
          onClick={() => updateQuantity(item.id, item.quantity + 1)}
          style={{
            width: '28px',
            height: '28px',
            border: '1px solid #cbd5e1',
            borderRadius: '0.25rem',
            background: '#ffffff',
            cursor: 'pointer'
          }}
        >
          +
        </button>
      </div>

      <div style={{ minWidth: '100px', textAlign: 'right' }}>
        <div style={{ fontWeight: 'bold', color: '#2563eb' }}>
          {formatCurrency(item.price * item.quantity)}
        </div>
      </div>

      <button
        onClick={() => removeFromCart(item.id)}
        style={{
          background: 'none',
          border: 'none',
          color: '#ef4444',
          cursor: 'pointer',
          padding: '0.5rem',
          fontSize: '1rem'
        }}
        title="Xóa sản phẩm"
      >
        🗑️
      </button>
    </div>
  );
};

export default CartItem;
