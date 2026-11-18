import Icon from '../common/Icons';

/**
 * ChatInput.jsx — Khung nhập câu hỏi với hỗ trợ nhấn Enter để gửi
 */
const ChatInput = ({ input, setInput, sending, onSend }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSend();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const disabled = sending || !input.trim();

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        padding: '0.75rem',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        flexShrink: 0
      }}
    >
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nhập câu hỏi (VD: Gợi ý laptop dưới 30 triệu)..."
        disabled={sending}
        maxLength={1000}
        aria-label="Nhập câu hỏi cho trợ lý AI"
        style={{
          flex: 1,
          padding: '0.62rem 0.85rem',
          borderRadius: '10px',
          border: '1px solid #cbd5e1',
          fontSize: '0.86rem',
          outline: 'none'
        }}
      />
      <button
        type="submit"
        disabled={disabled}
        style={{
          backgroundColor: disabled ? '#94a3b8' : '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          padding: '0.62rem 0.95rem',
          fontWeight: 700,
          fontSize: '0.84rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          transition: 'background-color 150ms ease'
        }}
      >
        <span>Gửi</span>
        <Icon name="arrow-right" size={14} className="ui-icon-nudge-right" />
      </button>
    </form>
  );
};

export default ChatInput;
