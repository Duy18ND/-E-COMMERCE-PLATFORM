import Icon from './Icons';

const Loading = ({ message = 'Đang tải dữ liệu...' }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="ui-page-enter"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        gap: '0.85rem'
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: '#eff6ff',
          border: '1px solid #dbeafe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#2563eb'
        }}
      >
        <Icon name="loader" size={22} spin strokeWidth={2.2} />
      </div>
      <p style={{ color: '#64748b', fontSize: '0.92rem', fontWeight: 500 }}>{message}</p>
    </div>
  );
};

export default Loading;
