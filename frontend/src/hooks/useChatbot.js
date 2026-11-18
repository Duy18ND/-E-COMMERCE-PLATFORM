import { useState, useEffect, useCallback } from 'react';
import chatbotService from '../services/chatbotService';
import { useAuth } from './useAuth';

export const QUICK_PROMPTS = [
  '🔍 Gợi ý laptop dưới 30 triệu',
  '⚖️ So sánh Dell XPS 15 và MacBook Air M2',
  '📦 Kiểm tra tồn kho Laptop Dell XPS 15',
  '🚚 Chính sách vận chuyển & bảo hành',
  '🧾 Kiểm tra đơn hàng của tôi'
];

export const useChatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'history'
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const list = await chatbotService.getConversations();
      setConversations(Array.isArray(list) ? list : []);
    } catch {
      setConversations([]);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, user?.id, loadConversations]);

  const handleSelectConversation = useCallback(async (convId) => {
    if (!convId) return;
    setError('');
    setLoadingHistory(true);
    try {
      const detail = await chatbotService.getConversationMessages(convId);
      if (detail && Array.isArray(detail.messages)) {
        setConversationId(detail.id || convId);
        setMessages(detail.messages);
        setActiveTab('chat');
      }
    } catch (err) {
      setError(err?.message || 'Không thể tải nội dung cuộc trò chuyện.');
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const handleNewConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError('');
    setActiveTab('chat');
  }, []);

  const handleDeleteConversation = useCallback(
    async (convId) => {
      if (!convId) return;
      try {
        await chatbotService.deleteConversation(convId);
        setConversations((prev) => prev.filter((c) => c.id !== convId));
        if (conversationId === convId) {
          setConversationId(null);
          setMessages([]);
        }
      } catch (err) {
        setError(err?.message || 'Không thể xóa cuộc hội thoại.');
      }
    },
    [conversationId]
  );

  const handleSend = useCallback(
    async (textOverride = null) => {
      const text = String(textOverride !== null ? textOverride : input).trim();
      if (!text || sending) return;

      setError('');
      if (textOverride === null) {
        setInput('');
      }
      setActiveTab('chat');

      const optimisticUserMsg = {
        id: `temp-user-${Date.now()}`,
        role: 'USER',
        content: text,
        createdAt: new Date().toISOString()
      };

      setMessages((prev) => [...prev, optimisticUserMsg]);
      setSending(true);

      try {
        const res = await chatbotService.sendMessage({
          conversationId,
          question: text,
          message: text
        });

        if (res?.conversationId) {
          setConversationId(res.conversationId);
        }

        const products = Array.isArray(res?.products) && res.products.length > 0
          ? res.products
          : Array.isArray(res?.suggestedProducts)
            ? res.suggestedProducts
            : [];

        const assistantMsg = {
          id: `assistant-${Date.now()}`,
          role: 'ASSISTANT',
          content: res?.answer || res?.reply || 'Mình đã ghi nhận yêu cầu của bạn.',
          products,
          suggestedProducts: products,
          referencedOrder: res?.referencedOrder || null,
          toolsUsed: Array.isArray(res?.toolsUsed) ? res.toolsUsed : [],
          createdAt: res?.createdAt || new Date().toISOString()
        };

        setMessages((prev) => [...prev, assistantMsg]);
        loadConversations();
      } catch (err) {
        setError(err?.message || 'Không thể gửi tin nhắn tới Trợ lý AI. Vui lòng thử lại.');
      } finally {
        setSending(false);
      }
    },
    [conversationId, input, sending, loadConversations]
  );

  return {
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
    setError,
    loadConversations,
    handleSelectConversation,
    handleNewConversation,
    handleDeleteConversation,
    handleSend
  };
};

export default useChatbot;
