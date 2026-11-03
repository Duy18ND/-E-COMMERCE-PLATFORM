import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

const ToastItem = ({ toast, onClose }) => {
  const { id, type = 'info', title, message, product, quantity = 1, closing } = toast;

  // Icon theo từng loại thông báo
  const renderIcon = () => {
    switch (type) {
      case 'cart':
      case 'success':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      case 'error':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        );
      case 'warning':
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
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
          &times;
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
            <div className="toast-product-fallback">
              🛍️
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
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>&rarr;</span>
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
