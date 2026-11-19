import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import Icon from '../common/Icons';

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const [isAdded, setIsAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAddToCart = () => {
    const success = addToCart(product, 1);
    if (success) {
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1200);
    }
  };

  if (!product) return null;

  const isSale = Boolean(product.salePrice || product.isFlashSale);
  const effectivePrice = isSale && product.salePrice ? product.salePrice : product.price;
  const originalPrice = product.price || effectivePrice;
  const discountPercent =
    product.discountPercent ||
    (originalPrice > effectivePrice
      ? Math.round(((originalPrice - effectivePrice) / originalPrice) * 100)
      : 0);

  const stockCount = Number(product.stockQuantity ?? product.stock ?? 0);
  const isOutOfStock = stockCount <= 0 && product.stock !== undefined && product.stockQuantity !== undefined;
  const imageSrc = !imgError
    ? product.imageUrl || product.image || DEFAULT_FALLBACK_IMAGE
    : DEFAULT_FALLBACK_IMAGE;

  return (
    <div
      className="product-card"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: isSale ? '1px solid #fed7aa' : '1px solid #f1f5f9',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        padding: 'clamp(0.75rem, 1.8vw, 1.15rem)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        minWidth: 0,
        position: 'relative'
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
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={product.name}
              loading="lazy"
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <span style={{ color: '#cbd5e1', display: 'inline-flex' }}>
              <Icon name="package" size={38} />
            </span>
          )}

          {/* Sale or Brand Badge */}
          {isSale && discountPercent > 0 ? (
            <span
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                padding: '3px 7px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 800,
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.35)',
                zIndex: 2,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <Icon name="flash" size={11} />
              <span>-{discountPercent}%</span>
            </span>
          ) : (
            <span
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(4px)',
                padding: '2px 7px',
                borderRadius: '9999px',
                fontSize: '0.68rem',
                fontWeight: 700,
                color: '#1d4ed8',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <Icon name="shield-check" size={11} />
              <span>Chính hãng</span>
            </span>
          )}

          {product.statusText && (
            <span
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                color: '#ffffff',
                padding: '2px 7px',
                borderRadius: '9999px',
                fontSize: '0.65rem',
                fontWeight: 600
              }}
            >
              {product.statusText}
            </span>
          )}
        </div>

        {/* Category */}
        {product.category && (
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: isSale ? '#dc2626' : '#2563eb',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.2rem'
            }}
          >
            {typeof product.category === 'object' ? product.category.name : product.category}
          </span>
        )}

        {/* Title */}
        <h3
          style={{
            fontSize: 'clamp(0.85rem, 1.5vw, 0.975rem)',
            fontWeight: 700,
            lineHeight: 1.4,
            margin: '0.15rem 0 0.5rem',
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
            style={{ color: '#0f172a', textDecoration: 'none' }}
            onMouseEnter={(e) => (e.target.style.color = isSale ? '#dc2626' : '#2563eb')}
            onMouseLeave={(e) => (e.target.style.color = '#0f172a')}
          >
            {product.name}
          </Link>
        </h3>

        {/* Price */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.25rem)',
                fontWeight: 800,
                color: isSale ? '#dc2626' : '#2563eb'
              }}
            >
              {formatCurrency(effectivePrice)}
            </span>
            {isSale && originalPrice > effectivePrice && (
              <span
                style={{
                  fontSize: '0.76rem',
                  color: '#94a3b8',
                  textDecoration: 'line-through'
                }}
              >
                {formatCurrency(originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isAdmin || isOutOfStock}
          title={
            isAdmin
              ? 'Tài khoản Admin không được phép thêm sản phẩm vào giỏ'
              : isOutOfStock
              ? 'Sản phẩm tạm hết hàng'
              : ''
          }
          style={{
            flex: '1 1 90px',
            minWidth: 0,
            backgroundColor:
              isAdmin || isOutOfStock
                ? '#f1f5f9'
                : isAdded
                ? '#dcfce7'
                : isSale
                ? '#fee2e2'
                : '#eff6ff',
            border:
              isAdmin || isOutOfStock
                ? '1px solid #e2e8f0'
                : isAdded
                ? '1px solid #86efac'
                : isSale
                ? '1px solid #fecaca'
                : '1px solid #dbeafe',
            color:
              isAdmin || isOutOfStock
                ? '#94a3b8'
                : isAdded
                ? '#16a34a'
                : isSale
                ? '#dc2626'
                : '#2563eb',
            borderRadius: '9999px',
            padding: '0.5rem 0.6rem',
            fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)',
            fontWeight: 700,
            cursor: isAdmin || isOutOfStock ? 'not-allowed' : 'pointer',
            transition: 'background-color 150ms ease, border-color 150ms ease, color 150ms ease, transform 150ms ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (!isAdded && !isAdmin && !isOutOfStock) {
              e.currentTarget.style.backgroundColor = isSale ? '#dc2626' : '#2563eb';
              e.currentTarget.style.color = '#ffffff';
            }
          }}
          onMouseLeave={(e) => {
            if (!isAdded && !isAdmin && !isOutOfStock) {
              e.currentTarget.style.backgroundColor = isSale ? '#fee2e2' : '#eff6ff';
              e.currentTarget.style.color = isSale ? '#dc2626' : '#2563eb';
            }
          }}
        >
          {isAdmin ? (
            <>
              <Icon name="lock" size={13} />
              <span>Khóa giỏ</span>
            </>
          ) : isOutOfStock ? (
            <>
              <Icon name="out-of-stock" size={14} />
              <span>Hết hàng</span>
            </>
          ) : isAdded ? (
            <>
              <Icon name="check" size={14} strokeWidth={2.5} />
              <span>Đã thêm</span>
            </>
          ) : isSale ? (
            <>
              <Icon name="flash" size={13} />
              <span>Săn Sale</span>
            </>
          ) : (
            <>
              <Icon name="cart-plus" size={15} />
              <span>Thêm giỏ</span>
            </>
          )}
        </button>

        <Link
          to={`/products/${product.id}`}
          style={{
            padding: '0.5rem 0.65rem',
            borderRadius: '9999px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#475569',
            fontSize: 'clamp(0.75rem, 1.5vw, 0.85rem)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            textDecoration: 'none',
            flexShrink: 0
          }}
        >
          <Icon name="eye" size={14} />
          <span>Xem</span>
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;
