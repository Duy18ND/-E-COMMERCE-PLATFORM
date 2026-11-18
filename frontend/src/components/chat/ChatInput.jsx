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
        disabled={sending || !input.trim()}
        style={{
          backgroundColor: sending || !input.trim() ? '#94a3b8' : '#2563eb',
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          padding: '0.62rem 0.95rem',
          fontWeight: 700,
          fontSize: '0.84rem',
          cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.15s ease'
        }}
      >
        Gửi
      </button>
    </form>
  );
};

export default ChatInput;

