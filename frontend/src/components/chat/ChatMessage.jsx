import { formatCurrency } from '../../utils/formatCurrency';
import ProductSuggestionCard from './ProductSuggestionCard';
import Icon from '../common/Icons';

const INLINE_TOKEN_REGEX = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g;

const renderInlineTokens = (line, lineIdx) => {
  const parts = String(line).split(INLINE_TOKEN_REGEX);
  return parts.map((part, tokenIdx) => {
    const key = `${lineIdx}-${tokenIdx}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={key}
          style={{
            background: '#f1f5f9',
            padding: '1px 5px',
            borderRadius: '4px',
            fontSize: '0.82em'
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const renderFormattedContent = (text = '') => {
  const lines = String(text ?? '').split('\n');
  return lines.map((line, lineIdx) => (
    <span key={`line-${lineIdx}`}>
      {renderInlineTokens(line, lineIdx)}
      {lineIdx < lines.length - 1 && <br />}
    </span>
  ));
};

const formatMessageTime = (isoString) => {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

/**
 * ChatMessage.jsx — Hiển thị một bong bóng tin nhắn (Khách hàng bên phải / AI bên trái)
 * kèm danh sách thẻ sản phẩm gợi ý và thẻ tra cứu đơn hàng.
 */
const ChatMessage = ({ message, onSelectProduct, onNavigateOrder }) => {
  if (!message) return null;

  const isUser = message.role === 'USER';
  const products =
    Array.isArray(message.products) && message.products.length > 0
      ? message.products
      : Array.isArray(message.suggestedProducts)
        ? message.suggestedProducts
        : [];
  const timeStr = formatMessageTime(message.createdAt);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start'
      }}
    >
      <div
        style={{
          maxWidth: '86%',
          padding: '0.68rem 0.9rem',
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          backgroundColor: isUser ? '#2563eb' : '#ffffff',
          color: isUser ? '#ffffff' : '#1e293b',
          border: isUser ? 'none' : '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          fontSize: '0.86rem',
          lineHeight: 1.5
        }}
      >
        {renderFormattedContent(message.content)}
      </div>

      {timeStr && (
        <span
          style={{
            fontSize: '0.68rem',
            color: '#94a3b8',
            marginTop: '0.2rem',
            padding: '0 0.2rem'
          }}
        >
          {timeStr}
        </span>
      )}

      {/* Danh sách thẻ sản phẩm gợi ý */}
      {!isUser && products.length > 0 && (
        <div
          style={{
            marginTop: '0.5rem',
            width: '92%',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem'
          }}
        >
          {products.map((prod) => (
            <ProductSuggestionCard
              key={prod.id}
              product={prod}
              onSelectProduct={onSelectProduct}
            />
          ))}
        </div>
      )}

      {/* Thẻ thông tin đơn hàng tra cứu */}
      {!isUser && message.referencedOrder && (
        <div
          onClick={() => onNavigateOrder && onNavigateOrder(message.referencedOrder.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onNavigateOrder) {
              onNavigateOrder(message.referencedOrder.id);
            }
          }}
          style={{
            marginTop: '0.5rem',
            width: '92%',
            padding: '0.65rem 0.75rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, color: '#1e40af' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Icon name="clipboard" size={14} />
              <span>Đơn hàng #{message.referencedOrder.id}</span>
            </span>
            <span>{message.referencedOrder.status}</span>
          </div>
          <div style={{ color: '#334155', marginTop: '0.25rem' }}>
            Tổng thanh toán: <strong>{formatCurrency(message.referencedOrder.totalAmount)}</strong>
          </div>
          <div style={{ color: '#2563eb', fontWeight: 600, marginTop: '0.2rem', fontSize: '0.76rem' }}>
            Xem tiến trình đơn hàng →
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessage;

