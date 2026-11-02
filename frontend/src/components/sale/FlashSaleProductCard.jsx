import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import useCart from '../../hooks/useCart';
import useAuth from '../../hooks/useAuth';
import useToast from '../../hooks/useToast';
import saleService from '../../services/saleService';

const FlashSaleProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [isWishlisted, setIsWishlisted] = useState(() => {
    return saleService.getWishlist().includes(product?.id);
  });
  const [isAdding, setIsAdding] = useState(false);

  if (!product) return null;

  const originalPrice = product.price || 0;
  const salePrice = product.salePrice || originalPrice;
  const discountPercent = product.discountPercent || (originalPrice > salePrice ? Math.round(((originalPrice - salePrice) / originalPrice) * 100) : 0);
  const savedAmount = Math.max(0, originalPrice - salePrice);
  const sold = product.sold || 0;
  const totalStock = product.stock || 100;
  const progressPercent = Math.min(100, Math.round((sold / totalStock) * 100));

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdmin) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Khóa chức năng',
          message: 'Tài khoản Quản trị viên (Admin) không thể mua hàng.'
        });
      }
      return;
    }

    setIsAdding(true);
    addToCart(product, 1);
    setTimeout(() => setIsAdding(false), 800);
  };

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdmin) {
      if (showToast) {
        showToast({
          type: 'error',
          title: 'Khóa chức năng',
          message: 'Tài khoản Quản trị viên (Admin) không thể mua hàng.'
        });
      }
      return;
    }

    addToCart(product, 1);
    navigate('/cart');
  };

  const handleToggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nextState = saleService.toggleWishlist(product.id);
    setIsWishlisted(nextState);
    if (showToast) {
      showToast({
        type: nextState ? 'success' : 'info',
        title: nextState ? 'Đã thêm vào Yêu thích' : 'Đã xóa khỏi Yêu thích',
        message: nextState ? `Sản phẩm ${product.shortName || product.name} đã được lưu vào danh sách quan tâm!` : 'Đã bỏ sản phẩm khỏi danh sách yêu thích.'
      });
    }
  };

  return (
    <div
      className="product-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #f1f5f9',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        padding: 'clamp(0.75rem, 1.8vw, 1rem)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        minWidth: 0,
        position: 'relative',
        transition: 'all 0.25s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 14px 28px -4px rgba(220, 38, 38, 0.12)';
        e.currentTarget.style.borderColor = '#fecaca';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.borderColor = '#f1f5f9';
      }}
    >
      <div style={{ minWidth: 0 }}>
        {/* Product Image Frame */}
        <div
          className="product-card-img-wrap"
          style={{
            height: 'clamp(145px, 20vw, 190px)',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            position: 'relative'
          }}
        >
          {/* Discount Badge top-left */}
          {discountPercent > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.7rem',
                padding: '3px 7px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                zIndex: 2,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.4)'
              }}
            >
              <span>⚡</span>
              <span>-{discountPercent}%</span>
            </div>
          )}

          {/* Hot tag top-right */}
          {product.statusText && (
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(4px)',
                color: '#f8fafc',
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '2px 7px',
                borderRadius: '9999px',
                zIndex: 2
              }}
            >
              {product.statusText}
            </div>
          )}

          {/* Product Image */}
          <Link to={`/products/${product.id}`} style={{ width: '100%', height: '100%' }}>
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.35s ease'
              }}
              onMouseEnter={(e) => (e.target.style.transform = 'scale(1.06)')}
              onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
            />
          </Link>
        </div>

        {/* Store Verified Tag */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.7rem',
            color: '#64748b',
            marginBottom: '0.3rem'
          }}
        >
          <span style={{ color: '#2563eb', fontWeight: 700 }}>✓</span>
          <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.storeName || 'ShopMart Official'}
          </span>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 'clamp(0.85rem, 1.5vw, 0.925rem)',
            fontWeight: 700,
            lineHeight: 1.4,
            margin: '0 0 0.5rem',
            color: '#0f172a',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            height: '2.6em'
          }}
        >
          <Link
            to={`/products/${product.id}`}
            style={{ color: '#0f172a' }}
            onMouseEnter={(e) => (e.target.style.color = '#dc2626')}
            onMouseLeave={(e) => (e.target.style.color = '#0f172a')}
          >
            {product.name}
          </Link>
        </h3>

        {/* Pricing Section */}
        <div style={{ marginBottom: '0.7rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', fontWeight: 800, color: '#dc2626', lineHeight: 1.1 }}>
              {formatCurrency(salePrice)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
            <span style={{ fontSize: '0.76rem', color: '#94a3b8', textDecoration: 'line-through' }}>
              {formatCurrency(originalPrice)}
            </span>
            {savedAmount > 0 && (
              <span style={{ fontSize: '0.7rem', color: '#dc2626', fontWeight: 600 }}>
                -{discountPercent}%
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar & Sold Count */}
        <div style={{ marginBottom: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.2rem', fontSize: '0.7rem', marginBottom: '0.25rem' }}>
            <span style={{ color: '#ea580c', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span>🔥</span>
              <span>{product.statusText || 'Đang bán chạy'}</span>
            </span>
            <span style={{ color: '#64748b', fontWeight: 600 }}>
              Đã bán {sold}/{totalStock}
            </span>
          </div>

          <div
            style={{
              height: '6px',
              backgroundColor: '#fee2e2',
              borderRadius: '9999px',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)',
                borderRadius: '9999px',
                transition: 'width 0.5s ease'
              }}
            />
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: 'auto' }}>
        {/* Mua ngay button */}
        <button
          onClick={handleBuyNow}
          disabled={isAdmin}
          style={{
            flex: 1,
            minWidth: 0,
            backgroundColor: '#dc2626',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '0.5rem 0.5rem',
            fontSize: 'clamp(0.76rem, 1.5vw, 0.85rem)',
            fontWeight: 700,
            cursor: isAdmin ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
            textAlign: 'center',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (!isAdmin) e.currentTarget.style.backgroundColor = '#b91c1c';
          }}
          onMouseLeave={(e) => {
            if (!isAdmin) e.currentTarget.style.backgroundColor = '#dc2626';
          }}
        >
          Mua ngay
        </button>

        {/* Add to cart icon button */}
        <button
          onClick={handleAddToCart}
          disabled={isAdmin}
          title="Thêm vào giỏ hàng"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            backgroundColor: isAdding ? '#dcfce7' : '#ffffff',
            color: isAdding ? '#16a34a' : '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isAdmin ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            if (!isAdmin && !isAdding) {
              e.currentTarget.style.borderColor = '#dc2626';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.backgroundColor = '#fee2e2';
            }
          }}
          onMouseLeave={(e) => {
            if (!isAdmin && !isAdding) {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#334155';
              e.currentTarget.style.backgroundColor = '#ffffff';
            }
          }}
        >
          {isAdding ? (
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>✓</span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          )}
        </button>

        {/* Wishlist Heart Icon Button */}
        <button
          onClick={handleToggleWishlist}
          title={isWishlisted ? 'Bỏ yêu thích' : 'Yêu thích sản phẩm'}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            border: isWishlisted ? '1px solid #fecaca' : '1px solid #e2e8f0',
            backgroundColor: isWishlisted ? '#fef2f2' : '#ffffff',
            color: isWishlisted ? '#dc2626' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            if (!isWishlisted) {
              e.currentTarget.style.borderColor = '#fecaca';
              e.currentTarget.style.color = '#dc2626';
            }
          }}
          onMouseLeave={(e) => {
            if (!isWishlisted) {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#94a3b8';
            }
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isWishlisted ? '#dc2626' : 'none'}
            stroke={isWishlisted ? '#dc2626' : 'currentColor'}
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FlashSaleProductCard;
