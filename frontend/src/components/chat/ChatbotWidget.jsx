import { useNavigate } from 'react-router-dom';
import { useChatbot } from '../../hooks/useChatbot';
import ChatWindow from './ChatWindow';

/**
 * ChatbotWidget.jsx — Nút nổi & Cửa sổ Trợ lý Mua sắm AI thông minh cho khách hàng ShopMart.
 */
const ChatbotWidget = () => {
  const navigate = useNavigate();
  const {
    user,
    isOpen,
    setIsOpen,
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
    handleSelectConversation,
    handleNewConversation,
    handleDeleteConversation,
    handleSend
  } = useChatbot();

  const handleProductClick = (productId) => {
    if (!productId) return;
    navigate(`/products/${productId}`);
  };

  const handleOrderClick = (orderId) => {
    if (!orderId) return;
    navigate(`/orders/${orderId}`);
  };

  return (
    <div
      data-testid="ai-shopping-assistant-widget"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        right: '1.25rem',
        zIndex: 9999,
        fontFamily: 'inherit'
      }}
    >
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Mở Trợ lý Mua sắm AI"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            padding: '0.8rem 1.15rem',
            borderRadius: '999px',
            border: 'none',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.92rem',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(37, 99, 235, 0.38)',
            transition: 'transform 0.2s ease'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <span>Trợ lý AI</span>
        </button>
      )}

      {isOpen && (
        <ChatWindow
          user={user}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          conversations={conversations}
          conversationId={conversationId}
          messages={messages}
          input={input}
          setInput={setInput}
          sending={sending}
          loadingHistory={loadingHistory}
          error={error}
          onSend={handleSend}
          onNewConversation={handleNewConversation}
          onSelectConversation={handleSelectConversation}
          onDeleteConversation={handleDeleteConversation}
          onSelectProduct={handleProductClick}
          onNavigateOrder={handleOrderClick}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ChatbotWidget;

