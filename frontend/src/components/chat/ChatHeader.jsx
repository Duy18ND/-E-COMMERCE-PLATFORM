/**
 * ChatHeader.jsx — Thanh tiêu đề của cửa sổ Trợ lý Mua sắm AI ShopMart
 */
const ChatHeader = ({
  activeTab,
  setActiveTab,
  conversationsCount = 0,
  onNewConversation,
  onClose
}) => {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        color: '#ffffff',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255,255,255,0.18)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem'
          }}
        >
          🤖
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>
            Trợ lý Mua sắm AI
          </div>
          <div style={{ fontSize: '0.73rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#4ade80',
                display: 'inline-block'
              }}
            />
            ShopMart Smart Assistant
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === 'history' ? 'chat' : 'history')}
          title="Lịch sử hội thoại"
          style={{
            background: activeTab === 'history' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.14)',
            border: 'none',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.35rem 0.6rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          🕘 Lịch sử ({conversationsCount})
        </button>

        <button
          type="button"
          onClick={onNewConversation}
          title="Tạo cuộc trò chuyện mới"
          style={{
            background: 'rgba(255,255,255,0.14)',
            border: 'none',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '0.35rem 0.6rem',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Mới
        </button>

        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ chat"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '1.15rem',
            cursor: 'pointer',
            padding: '0.2rem 0.4rem',
            lineHeight: 1
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;

