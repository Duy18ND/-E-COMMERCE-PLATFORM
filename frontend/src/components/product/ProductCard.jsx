import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = () => {
    const success = addToCart(product, 1);
    if (success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1200);
    }
  };


  if (!product) return null;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        transition: 'all 0.25s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 14px 28px -4px rgba(37, 99, 235, 0.12)';
        e.currentTarget.style.borderColor = '#dbeafe';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.borderColor = '#f1f5f9';
      }}
    >
      <div>
        {/* Product Image Frame */}
        <div
          style={{
            height: '190px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.85rem',
            position: 'relative'
          }}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease'
              }}
              onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
            />
          ) : (
            <span style={{ fontSize: '3rem', color: '#cbd5e1' }}>📦</span>
          )}

          {/* Quick status badge if low stock or in stock */}
          <span
            style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(4px)',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#1d4ed8'
            }}
          >
            Chính hãng
          </span>
        </div>

        {/* Category */}
        {product.category && (
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.725rem',
              fontWeight: 700,
              color: '#2563eb',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.25rem'
            }}
          >
            {typeof product.category === 'object' ? product.category.name : product.category}
          </span>
        )}

        {/* Title */}
        <h3
          style={{
            fontSize: '0.975rem',
            fontWeight: 700,
            lineHeight: 1.4,
            margin: '0.2rem 0 0.6rem',
            color: '#0f172a',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            height: '2.8em'
          }}
        >
          <Link
            to={`/products/${product.id}`}
            style={{ color: '#0f172a' }}
            onMouseEnter={(e) => (e.target.style.color = '#2563eb')}
            onMouseLeave={(e) => (e.target.style.color = '#0f172a')}
          >
            {product.name}
          </Link>
        </h3>

        {/* Price */}
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb', marginBottom: '0.85rem' }}>
          {formatCurrency(product.price)}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleAddToCart}
          disabled={isAdmin}
          title={isAdmin ? 'Tài khoản Admin không được phép thêm sản phẩm vào giỏ' : ''}
          style={{
            flex: 1,
            backgroundColor: isAdmin ? '#f1f5f9' : isAdded ? '#dcfce7' : '#eff6ff',
            border: isAdmin ? '1px solid #e2e8f0' : isAdded ? '1px solid #86efac' : '1px solid #dbeafe',
            color: isAdmin ? '#94a3b8' : isAdded ? '#16a34a' : '#2563eb',
            borderRadius: '9999px',
            padding: '0.55rem 0.75rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: isAdmin ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
          onMouseEnter={(e) => {
            if (!isAdded && !isAdmin) {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
          onMouseLeave={(e) => {
            if (!isAdded && !isAdmin) {
              e.currentTarget.style.backgroundColor = '#eff6ff';
              e.currentTarget.style.color = '#2563eb';
            }
          }}
        >
          {isAdmin ? (
            'Admin (Khóa giỏ)'
          ) : isAdded ? (
            <>
              <span>✓</span>
              <span>Đã thêm</span>
            </>
          ) : (
            '+ Thêm vào giỏ'
          )}
        </button>



        <Link
          to={`/products/${product.id}`}
          style={{
            padding: '0.55rem 0.85rem',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#475569',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none'
          }}
        >
          Xem
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
