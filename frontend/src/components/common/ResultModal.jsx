import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/**
 * ResultModal - Popup thông báo kết quả quan trọng của ShopMart
 * Dùng khi hoàn tất đặt hàng, thanh toán, xuất báo cáo hoặc thao tác quy mô lớn.
 *
 * @param {boolean} isOpen - Trạng thái hiển thị
 * @param {string} title - Tiêu đề kết quả
 * @param {string|React.ReactNode} message - Nội dung chi tiết
 * @param {'success'|'error'|'warning'|'info'} variant - Loại kết quả
 * @param {string} confirmText - Nhãn nút chính (mặc định: 'Đóng')
 * @param {object} action - Tùy chọn nút phụ hoặc điều hướng { label, to, onClick }
 * @param {Function} onClose - Callback đóng modal
 */
const ResultModal = ({
  isOpen = false,
  title = 'Thông báo kết quả',
  message = '',
  variant = 'success',
  confirmText = 'Đóng',
  action = null,
  onClose
}) => {
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timer = setTimeout(() => {
      if (closeBtnRef.current) {
        closeBtnRef.current.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantConfig = {
    success: {
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      btnBg: '#16a34a',
      btnHover: '#15803d',
      btnFocusRing: 'rgba(22, 163, 74, 0.4)',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    },
    error: {
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      btnBg: '#dc2626',
      btnHover: '#b91c1c',
      btnFocusRing: 'rgba(220, 38, 38, 0.4)',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      )
    },
    warning: {
      iconBg: '#fef3c7',
      iconColor: '#d97706',
      btnBg: '#d97706',
      btnHover: '#b45309',
      btnFocusRing: 'rgba(217, 119, 6, 0.4)',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    },
    info: {
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      btnBg: '#2563eb',
      btnHover: '#1d4ed8',
      btnFocusRing: 'rgba(37, 99, 235, 0.4)',
      icon: (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
    }
  };

  const currentVariant = variantConfig[variant] || variantConfig.success;

  return (
    <div
      className="shopmart-dialog-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'shopmartFadeIn 0.2s ease-out'
      }}
    >
      <div
        className="shopmart-dialog-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          animation: 'shopmartScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          textAlign: 'center',
          padding: '2rem 1.5rem 1.5rem'
        }}
      >
        {/* Big Icon */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: currentVariant.iconBg,
            color: currentVariant.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: `0 0 0 8px ${currentVariant.iconBg}40`
          }}
        >
          {currentVariant.icon}
        </div>

        {/* Title & Message */}
        <h3
          style={{
            margin: '0 0 0.65rem',
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.3
          }}
        >
          {title}
        </h3>
        <div
          style={{
            fontSize: '0.9rem',
            color: '#475569',
            lineHeight: 1.5,
            marginBottom: '1.75rem',
            wordBreak: 'break-word'
          }}
        >
          {message}
        </div>

        {/* Buttons / Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          {action && (
            action.to ? (
              <Link
                to={action.to}
                onClick={onClose}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '8px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.15s ease'
                }}
              >
                {action.label || 'Xem chi tiết'}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (action.onClick) action.onClick();
                  onClose();
                }}
                style={{
                  padding: '0.65rem 1.5rem',
                  borderRadius: '8px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {action.label || 'Thực hiện'}
              </button>
            )
          )}

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            style={{
              padding: '0.65rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: action ? '#ffffff' : currentVariant.btnBg,
              color: action ? '#334155' : '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
