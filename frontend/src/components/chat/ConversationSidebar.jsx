/**
 * ConversationSidebar.jsx — Danh sách lịch sử các cuộc hội thoại của khách hàng
 */
const ConversationSidebar = ({
  conversations = [],
  currentConversationId,
  loadingHistory,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation
}) => {
  const handleDeleteClick = (e, convId) => {
    e.stopPropagation();
    if (onDeleteConversation) {
      onDeleteConversation(convId);
    }
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.65rem'
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#334155' }}>
          Các cuộc hội thoại đã lưu
        </div>
        <button
          type="button"
          onClick={onNewConversation}
          style={{
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            padding: '0.28rem 0.6rem',
            fontSize: '0.76rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Tạo cuộc trò chuyện mới
        </button>
      </div>

      {loadingHistory ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>
          Đang tải lịch sử hội thoại...
        </div>
      ) : conversations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
          Chưa có cuộc hội thoại nào được lưu.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSelectConversation(conv.id);
              }}
              style={{
                padding: '0.75rem',
                borderRadius: '10px',
                backgroundColor: currentConversationId === conv.id ? '#eff6ff' : '#ffffff',
                border: currentConversationId === conv.id ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem'
              }}
            >
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: '0.86rem',
                    color: '#1e293b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {conv.title || 'Cuộc trò chuyện'}
                </div>
                <div
                  style={{
                    fontSize: '0.76rem',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '2px'
                  }}
                >
                  {conv.lastMessagePreview || 'Nhấn để xem lại tin nhắn'}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => handleDeleteClick(e, conv.id)}
                title="Xóa hội thoại"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: '0.25rem 0.4rem',
                  borderRadius: '6px'
                }}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConversationSidebar;

