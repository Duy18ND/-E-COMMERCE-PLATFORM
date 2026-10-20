const ErrorMessage = ({ message = 'Đã có lỗi xảy ra. Vui lòng thử lại!', onClose }) => {
  if (!message) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#dc2626',
        padding: '0.75rem 1rem',
        borderRadius: '0.375rem',
        marginBottom: '1rem',
        fontSize: '0.9rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span>⚠️</span>
        <span>{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#dc2626',
            cursor: 'pointer',
            fontSize: '1.25rem',
            lineHeight: 1
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
};

export default ErrorMessage;
