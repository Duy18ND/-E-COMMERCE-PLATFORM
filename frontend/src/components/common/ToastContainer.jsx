import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatCurrency';

const ToastItem = ({ toast, onClose }) => {
  const { id, type = 'info', title, message, product, quantity = 1, closing } = toast;

  return (
    <div
      className={`toast-item ${closing ? 'toast-closing' : ''}`}
      role="alert"
    >
      {/* Toast Header */}
      <div className="toast-header">
        <div className="toast-header-left">
          <div className={`toast-icon toast-icon-${type}`}>
            {type === 'cart' || type === 'success' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : type === 'error' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
          </div>
          <span className="toast-title">
            {title || (type === 'cart' ? 'Đã thêm vào giỏ hàng!' : 'Thông báo')}
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
        <div style={{ fontSize: '0.825rem', color: '#475569', lineHeight: 1.4 }}>
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
          <Link
            to={toast.action.to}
            className="toast-btn-link"
            onClick={() => onClose(id)}
          >
            <span>{toast.action.label}</span>
          </Link>
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
