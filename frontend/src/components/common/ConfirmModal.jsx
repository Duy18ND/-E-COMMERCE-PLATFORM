import { useEffect, useRef } from 'react';

/**
 * ConfirmModal - Popup xác nhận hành động chuyên nghiệp của ShopMart
 * Thay thế hoàn toàn hộp thoại window.confirm() mặc định của trình duyệt.
 *
 * @param {boolean} isOpen - Trạng thái hiển thị modal
 * @param {string} title - Tiêu đề hộp thoại
 * @param {string|React.ReactNode} message - Nội dung chi tiết
 * @param {'danger'|'warning'|'primary'|'info'} variant - Loại hành động
 * @param {string} confirmText - Nhãn nút xác nhận (mặc định: 'Xác nhận')
 * @param {string} cancelText - Nhãn nút hủy (mặc định: 'Hủy bỏ')
 * @param {boolean} loading - Trạng thái đang gọi API xử lý
 * @param {Function} onConfirm - Callback khi người dùng nhấn xác nhận
 * @param {Function} onCancel - Callback khi người dùng hủy bỏ / đóng modal
 */
const ConfirmModal = ({
  isOpen = false,
  title = 'Xác nhận hành động',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  variant = 'primary',
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  loading = false,
  onConfirm,
  onCancel
}) => {
  const confirmBtnRef = useRef(null);

  // Xử lý phím Escape để hủy và Auto-focus nút xác nhận khi mở modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (!loading && onCancel) {
          onCancel();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Tự động focus nút xác nhận để hỗ trợ thao tác nhanh bằng phím Enter
    const timer = setTimeout(() => {
      if (confirmBtnRef.current) {
        confirmBtnRef.current.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  // Cấu hình Icon và Màu sắc tương ứng theo biến thể
  const variantConfig = {
    danger: {
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      btnBg: '#dc2626',
      btnHover: '#b91c1c',
      btnFocusRing: 'rgba(220, 38, 38, 0.4)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
    },
    primary: {
      iconBg: '#dbeafe',
      iconColor: '#2563eb',
      btnBg: '#2563eb',
      btnHover: '#1d4ed8',
      btnFocusRing: 'rgba(37, 99, 235, 0.4)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      )
    },
    info: {
      iconBg: '#e0f2fe',
      iconColor: '#0284c7',
      btnBg: '#0284c7',
      btnHover: '#0369a1',
      btnFocusRing: 'rgba(2, 132, 199, 0.4)',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    }
  };

  const currentVariant = variantConfig[variant] || variantConfig.primary;

  const handleOverlayClick = () => {
    if (!loading && onCancel) {
      onCancel();
    }
  };

  return (
    <div
      className="shopmart-dialog-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      aria-describedby="confirm-modal-desc"
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
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          animation: 'shopmartScaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Content body */}
        <div style={{ padding: '1.5rem 1.5rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          {/* Icon Badge */}
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              backgroundColor: currentVariant.iconBg,
              color: currentVariant.iconColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {currentVariant.icon}
          </div>

          {/* Texts */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              id="confirm-modal-title"
              style={{
                margin: '0 0 0.5rem',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.3
              }}
            >
              {title}
            </h3>
            <div
              id="confirm-modal-desc"
              style={{
                fontSize: '0.875rem',
                color: '#475569',
                lineHeight: 1.5,
                wordBreak: 'break-word'
              }}
            >
              {message}
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.65rem'
          }}
        >
          {/* Nút Hủy */}
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            style={{
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#334155',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#f1f5f9';
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = '#ffffff';
            }}
          >
            {cancelText}
          </button>

          {/* Nút Xác nhận */}
          <button
            ref={confirmBtnRef}
            type="button"
            disabled={loading}
            onClick={onConfirm}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: currentVariant.btnBg,
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: `0 2px 6px ${currentVariant.btnFocusRing}`,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = currentVariant.btnHover;
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.backgroundColor = currentVariant.btnBg;
            }}
          >
            {loading && (
              <span
                style={{
                  display: 'inline-block',
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255, 255, 255, 0.4)',
                  borderTopColor: '#ffffff',
                  borderRadius: '50%',
                  animation: 'shopmartSpin 0.7s linear infinite'
                }}
              />
            )}
            <span>{loading ? 'Đang xử lý...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
