import Icon from '../common/Icons';

/**
 * TypingIndicator.jsx — Hiển thị trạng thái AI đang tra cứu dữ liệu & phản hồi
 */
const TypingIndicator = () => {
  return (
    <div
      data-testid="ai-typing-indicator"
      className="ui-page-enter"
      style={{
        alignSelf: 'flex-start',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '0.6rem 0.9rem',
        fontSize: '0.82rem',
        color: '#475569',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}
    >
      <Icon name="bot" size={16} color="#2563eb" />
      <Icon name="loader" size={14} spin color="#2563eb" />
      <span>Trợ lý AI đang tra cứu dữ liệu hệ thống...</span>
    </div>
  );
};

export default TypingIndicator;
