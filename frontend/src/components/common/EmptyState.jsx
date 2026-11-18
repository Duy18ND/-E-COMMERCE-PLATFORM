import Button from './Button';
import Icon from './Icons';

const EmptyState = ({
  title = 'Không có dữ liệu',
  description = 'Hiện tại chưa có nội dung nào được hiển thị.',
  actionText,
  onAction,
  icon = 'empty-box'
}) => {
  return (
    <div
      className="ui-page-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px dashed #cbd5e1'
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem'
        }}
      >
        <Icon name={icon} size={26} />
      </div>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0b1220', marginBottom: '0.45rem' }}>{title}</h3>
      <p style={{ color: '#64748b', maxWidth: '400px', fontSize: '0.92rem', marginBottom: actionText ? '1.35rem' : '0' }}>
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
