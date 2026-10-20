import Button from './Button';

const EmptyState = ({
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có nội dung nào được hiển thị.',
  actionText,
  onAction
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '0.5rem',
        border: '1px dashed #cbd5e1'
      }}
    >
      <div style={{ fontSize: '3rem', marginBottom: '1rem', color: '#94a3b8' }}>📦</div>
      <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>{title}</h3>
      <p style={{ color: '#64748b', maxWidth: '400px', marginBottom: actionText ? '1.5rem' : '0' }}>
        {description}
      </p>
      {actionText && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionText}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
