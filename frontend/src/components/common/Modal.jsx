import { createPortal } from 'react-dom';
import Button from './Button';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  const modalContent = (
    <div
      className="shopmart-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : undefined}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="shopmart-dialog-box"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '18px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: 'calc(100dvh - 2rem)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid #e3e8ef'
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0b1220' }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            style={{
              width: '32px',
              height: '32px',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '50%',
              fontSize: '1.25rem',
              lineHeight: 1,
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            &times;
          </button>
        </div>
        <div style={{ padding: '1.25rem', overflowY: 'auto', minHeight: 0 }}>{children}</div>
        {footer && (
          <div
            style={{
              padding: '0.75rem 1.25rem',
              borderTop: '1px solid #e3e8ef',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(modalContent, document.body);
  }
  return modalContent;
};

export default Modal;
