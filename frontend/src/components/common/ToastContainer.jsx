import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';
import Icon from './Icons';

const ToastItem = ({ toast, onClose }) => {
  const { id, type = 'info', title, message, product, quantity = 1, closing } = toast;

  // Icon theo từng loại thông báo
  const renderIcon = () => {
    switch (type) {
      case 'cart':
        return <Icon name="cart" size={14} strokeWidth={2.4} />;
      case 'success':
        return <Icon name="check" size={14} strokeWidth={2.8} />;
      case 'error':
        return <Icon name="x" size={14} strokeWidth={2.6} />;
      case 'warning':
        return <Icon name="warning" size={14} strokeWidth={2.4} />;
      case 'info':
      default:
        return <Icon name="info" size={14} strokeWidth={2.4} />;
    }
  };

  // Tiêu đề mặc định nếu không truyền
  const getDefaultTitle = () => {
    if (title) return title;
    switch (type) {
      case 'cart':
        return 'Đã thêm vào giỏ hàng!';
      case 'success':
        return 'Thành công';
      case 'error':
        return 'Đã xảy ra lỗi';
      case 'warning':
        return 'Cảnh báo';
      case 'info':
      default:
        return 'Thông báo';
    }
  };

  return (
    <div
      className={`toast-item ${closing ? 'toast-closing' : ''}`}
      role="alert"
    >
      {/* Toast Header */}
      <div className="toast-header">
        <div className="toast-header-left">
          <div className={`toast-icon toast-icon-${type}`}>
            {renderIcon()}
          </div>
          <span className="toast-title">
            {getDefaultTitle()}
          </span>
        </div>

        <button
          className="toast-close-btn"
          onClick={() => onClose(id)}
          aria-label="Đóng thông báo"
          title="Đóng"
        >
          <Icon name="x" size={14} />
        </button>
      </div>

      {/* Cart Item Preview */}
      {type === 'cart' && product && (
        <div className="toast-cart-body">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="toast-product-thumb"
            />
          ) : (
            <div className="toast-product-fallback" style={{ color: '#2563eb' }}>
              <Icon name="package" size={20} />
            </div>
          )}

          <div className="toast-product-info">
            <div className="toast-product-name" title={product.name}>
              {product.name}
            </div>
            <div className="toast-product-meta">
              <span className="toast-product-qty">+{quantity}</span>
              {product.price !== undefined && (
                <span className="toast-product-price">
                  {formatCurrency(product.price)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Message description if available and not a pure cart toast */}
      {message && type !== 'cart' && (
        <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.45, wordBreak: 'break-word' }}>
          {message}
        </div>
      )}

      {/* Toast Actions */}
      {type === 'cart' && (
        <div className="toast-actions">
          <Link
            to="/cart"
            className="toast-btn-link"
            onClick={() => onClose(id)}
          >
            <span>Xem giỏ hàng</span>
            <Icon name="arrow-right" size={14} className="ui-icon-nudge-right" />
          </Link>
        </div>
      )}

      {toast.action && (
        <div className="toast-actions">
          {toast.action.to ? (
            <Link
              to={toast.action.to}
              className="toast-btn-link"
              onClick={() => onClose(id)}
            >
              <span>{toast.action.label}</span>
            </Link>
          ) : (
            <button
              type="button"
              className="toast-btn-link"
              style={{ cursor: 'pointer', border: 'none' }}
              onClick={() => {
                if (toast.action.onClick) toast.action.onClick();
                onClose(id);
              }}
            >
              <span>{toast.action.label}</span>
            </button>
          )}
        </div>
      )}

      {/* Subtle progress indicator */}
      <div
        className="toast-progress"
        style={{
          animation: `toastProgress ${toast.duration || 3500}ms linear forwards`
        }}
      />
    </div>
  );
};

const ToastContainer = ({ toasts, onClose }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

export default ToastContainer;
