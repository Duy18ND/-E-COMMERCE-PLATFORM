import Icon from './Icons';

{/* ⚠️ legacy QA anchor preserved */}
const ErrorMessage = ({ message = 'Đã có lỗi xảy ra. Vui lòng thử lại!', onClose }) => {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="ui-page-enter"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#b91c1c',
        padding: '0.75rem 1rem',
        borderRadius: '10px',
        marginBottom: '1rem',
        fontSize: '0.9rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
        <Icon name="warning" size={18} color="#dc2626" />
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thông báo lỗi"
          style={{
            background: 'none',
            border: 'none',
            color: '#b91c1c',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.2rem',
            borderRadius: '6px'
          }}
        >
          <Icon name="x" size={16} />
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
