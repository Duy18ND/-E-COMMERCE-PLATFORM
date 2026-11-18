import { useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ConversationSidebar from './ConversationSidebar';
import { QUICK_PROMPTS } from '../../hooks/useChatbot';

/**
 * ChatWindow.jsx — Cửa sổ chính của Trợ lý Mua sắm AI ShopMart
 */
const ChatWindow = ({
  user,
  activeTab,
  setActiveTab,
  conversations,
  conversationId,
  messages,
  input,
  setInput,
  sending,
  loadingHistory,
  error,
  onSend,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onSelectProduct,
  onNavigateOrder,
  onClose
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending]);

  return (
    <div
      style={{
        width: 'min(395px, calc(100vw - 2rem))',
        height: 'min(585px, calc(100vh - 5rem))',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 45px rgba(15, 23, 42, 0.22)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <ChatHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        conversationsCount={conversations.length}
        onNewConversation={onNewConversation}
        onClose={onClose}
      />

      {activeTab === 'history' ? (
        <ConversationSidebar
          conversations={conversations}
          currentConversationId={conversationId}
          loadingHistory={loadingHistory}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
          onNewConversation={onNewConversation}
        />
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.9rem',
            backgroundColor: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '0.9rem',
                fontSize: '0.85rem',
                color: '#334155',
                lineHeight: 1.5
              }}
            >
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                Xin chào {user?.fullName || 'bạn'}! 👋
              </div>
              <div>
                Mình là <strong>Trợ lý Mua sắm AI của ShopMart</strong>. Mình sử dụng dữ liệu sản phẩm, tồn kho, chính sách và đơn hàng thực tế trên hệ thống để tư vấn chính xác cho bạn.
              </div>
              <div style={{ marginTop: '0.65rem', fontWeight: 600, fontSize: '0.78rem', color: '#475569' }}>
                Gợi ý câu hỏi nhanh:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.45rem' }}>
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onSend(q.replace(/^[^\s]+\s/, ''))}
                    style={{
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      borderRadius: '999px',
                      padding: '0.32rem 0.65rem',
                      fontSize: '0.76rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              onSelectProduct={onSelectProduct}
              onNavigateOrder={onNavigateOrder}
            />
          ))}

          {sending && <TypingIndicator />}

          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '10px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.78rem'
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {activeTab === 'chat' && (
        <ChatInput
          input={input}
          setInput={setInput}
          sending={sending}
          onSend={() => onSend()}
        />
      )}
    </div>
  );
};

export default ChatWindow;

