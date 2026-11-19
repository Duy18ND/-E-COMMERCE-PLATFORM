import { formatCurrency } from '../../utils/formatCurrency';
import Icon from '../common/Icons';

/**
 * ProductSuggestionCard.jsx — Thẻ gợi ý sản phẩm thực tế trong khung chat
 */
const ProductSuggestionCard = ({ product, onSelectProduct }) => {
  if (!product) return null;

  const imageUrl =
    product.image ||
    product.imageUrl ||
    'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=200';
  const effectivePrice =
    product.activeFlashSale?.flashSalePrice != null
      ? product.activeFlashSale.flashSalePrice
      : product.price;
  const inStock = (product.stockQuantity ?? 0) > 0;

  return (
    <div
      onClick={() => onSelectProduct && onSelectProduct(product.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && onSelectProduct) onSelectProduct(product.id);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.55rem 0.65rem',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '12px',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(15,23,42,0.05)',
        transition: 'border-color 0.15s ease'
      }}
    >
      <img
        src={imageUrl}
        alt={product.name}
        style={{
          width: '48px',
          height: '48px',
          objectFit: 'cover',
          borderRadius: '8px',
          backgroundColor: '#f1f5f9',
          flexShrink: 0
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: '0.82rem',
            color: '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {product.name}
        </div>
        <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
          {product.category || 'Chính hãng'} •{' '}
          <span style={{ color: inStock ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
            {inStock ? `Còn ${product.stockQuantity} SP` : 'Hết hàng'}
          </span>
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: '#dc2626' }}>
          {formatCurrency(effectivePrice)}
        </div>
      </div>
      <span style={{ color: '#2563eb', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
        <span>Xem</span>
        <Icon name="arrow-right" size={13} className="ui-icon-nudge-right" />
      </span>
    </div>
  );
};

export default ProductSuggestionCard;

