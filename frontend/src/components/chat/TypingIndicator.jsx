/**
 * TypingIndicator.jsx — Hiển thị trạng thái AI đang tra cứu dữ liệu & phản hồi
 */
const TypingIndicator = () => {
  return (
    <div
      data-testid="ai-typing-indicator"
      style={{
        alignSelf: 'flex-start',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '14px',
        padding: '0.6rem 0.9rem',
        fontSize: '0.82rem',
        color: '#64748b',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}
    >
      <span>🤖</span>
      <span>Trợ lý AI đang tra cứu dữ liệu hệ thống...</span>
    </div>
  );
};

export default TypingIndicator;

