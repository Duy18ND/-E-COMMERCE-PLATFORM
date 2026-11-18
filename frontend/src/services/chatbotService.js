import api from './api';
import productService from './productService';
import orderService from './orderService';
import { formatCurrency } from '../utils/formatCurrency';
import { isAuthenticated } from '../utils/auth';

const GUEST_SESSION_STORAGE_KEY = 'shopmart_guest_chat_session';
const LOCAL_CONVERSATIONS_KEY = 'shopmart_chat_conversations_fallback';

export const getOrCreateGuestSessionId = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      let existing = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
      if (!existing) {
        existing = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(GUEST_SESSION_STORAGE_KEY, existing);
      }
      return existing;
    }
  } catch {
    // Ignore storage access errors
  }
  return 'guest-session-default';
};

const getLocalConversations = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
};

const saveLocalConversations = (conversations) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(conversations.slice(0, 20)));
    }
  } catch {
    // Ignore quota errors
  }
};

/**
 * Fallback xử lý thông minh qua productService / orderService thực tế khi microservice chatbot-service (8085)
 * tạm thời chưa khởi chạy trong môi trường phát triển cục bộ.
 */
const buildRealServiceFallbackReply = async ({ conversationId, question }) => {
  const cleanMsg = String(question ?? '').trim();
  const lower = cleanMsg.toLowerCase();
  const conversations = getLocalConversations();
  let conv = conversations.find((c) => c.id === conversationId);
  if (!conv) {
    conv = {
      id: conversationId || `conv-${Date.now()}`,
      title: cleanMsg.slice(0, 55),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    conversations.unshift(conv);
  }

  conv.messages.push({
    id: Date.now(),
    role: 'USER',
    content: cleanMsg,
    createdAt: new Date().toISOString()
  });

  let answer = '';
  let products = [];
  let referencedOrder = null;
  const toolsUsed = [];

  if (lower.includes('vận chuyển') || lower.includes('giao hàng') || lower.includes('freeship')) {
    toolsUsed.push('getShippingPolicy');
    answer =
      '🚚 **Chính sách vận chuyển ShopMart:**\n' +
      '- **Miễn phí vận chuyển (Freeship)** cho đơn hàng tiêu chuẩn toàn quốc.\n' +
      '- **Thời gian giao hàng:** Nội thành Hà Nội & TP.HCM từ **1 - 2 ngày**, các tỉnh thành khác **2 - 4 ngày làm việc**.';
  } else if (lower.includes('đổi trả') || lower.includes('bảo hành')) {
    toolsUsed.push('getReturnPolicy', 'getWarrantyPolicy');
    answer =
      '🛡️ **Chính sách Bảo hành & Đổi trả ShopMart:**\n' +
      '- **1 đổi 1 trong 30 ngày đầu** nếu có lỗi phần cứng từ nhà sản xuất.\n' +
      '- **Bảo hành chính hãng 12 - 24 tháng** tại trung tâm ủy quyền toàn quốc.';
  } else if (lower.includes('thanh toán') || lower.includes('cod') || lower.includes('vnpay')) {
    toolsUsed.push('getPaymentPolicy');
    answer =
      '💳 **Phương thức thanh toán tại ShopMart:**\n' +
      '- Hỗ trợ **Thanh toán khi nhận hàng (COD)** và **Chuyển khoản QR / VNPay** xác nhận tự động.';
  } else if (lower.includes('đơn hàng') || lower.includes('tra cứu đơn') || lower.includes('kiểm tra đơn') || /#\d+/.test(lower)) {
    if (!isAuthenticated()) {
      answer = '🔒 Để bảo mật thông tin cá nhân, vui lòng **đăng nhập tài khoản** trước khi tra cứu trạng thái đơn hàng của bạn.';
    } else {
      try {
        toolsUsed.push('getMyOrders');
        const myOrders = await orderService.getMyOrders();
        const list = Array.isArray(myOrders) ? myOrders : myOrders?.content || [];
        if (list.length === 0) {
          answer = 'Hiện tại tài khoản của bạn chưa có đơn hàng nào trên hệ thống ShopMart.';
        } else {
          referencedOrder = list[0];
          answer =
            `🧾 Bạn có **${list.length} đơn hàng**. Đơn gần nhất **#${referencedOrder.id}** đang ở trạng thái **${referencedOrder.status}** — Tổng tiền: **${formatCurrency(referencedOrder.totalAmount)}**.`;
        }
      } catch {
        answer = 'Dịch vụ tra cứu đơn hàng tạm thời bận. Bạn có thể xem trực tiếp tại mục **Đơn mua** trên thanh menu.';
      }
    }
  } else {
    try {
      toolsUsed.push('searchProducts');
      const priceMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)/);
      const maxPrice = priceMatch ? Math.round(parseFloat(priceMatch[1].replace(',', '.')) * 1_000_000) : undefined;
      const kw = cleanMsg
        .replace(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr|nghìn|k)/gi, ' ')
        .replace(/\b(tôi|mình|muốn|cần|tìm|mua|gợi ý|tư vấn|cho|hỏi|xem|kiểm tra|tồn kho|còn hàng|so sánh|dưới|trên|khoảng|giá|sản phẩm)\b/gi, ' ')
        .replace(/[?!.,;:#]/g, ' ')
        .trim();

      const res = await productService.getProducts({
        search: kw.length >= 2 ? kw : undefined,
        maxPrice,
        page: 0,
        size: 4
      });
      const items = res?.content || (Array.isArray(res) ? res : []);
      products = items.slice(0, 4).map((p) => ({
        ...p,
        image: p.imageUrl || p.image,
        productUrl: `/products/${p.id}`
      }));

      if (products.length > 0) {
        const lines = products.map(
          (p) => `- **${p.name}** — Giá: **${formatCurrency(p.price)}** (${(p.stockQuantity ?? 0) > 0 ? `Còn ${p.stockQuantity} SP` : 'Hết hàng'})`
        );
        answer = `🛍️ Mình tìm thấy **${products.length} sản phẩm chính hãng** phù hợp trên ShopMart:\n\n${lines.join('\n')}\n\nBạn có thể nhấn vào thẻ sản phẩm bên dưới để xem chi tiết nhé!`;
      } else {
        answer = 'Hiện chưa tìm thấy sản phẩm khớp hoàn toàn với từ khóa của bạn. Bạn thử tìm theo tên danh mục như *Laptop, Điện thoại, Tai nghe, Màn hình* nhé!';
      }
    } catch {
      answer = 'Xin lỗi, dịch vụ tra cứu sản phẩm đang tạm thời gián đoạn. Vui lòng thử lại sau giây lát.';
    }
  }

  const assistantMsg = {
    id: Date.now() + 1,
    role: 'ASSISTANT',
    content: answer,
    products,
    suggestedProducts: products,
    referencedOrder,
    createdAt: new Date().toISOString()
  };

  conv.messages.push(assistantMsg);
  conv.updatedAt = assistantMsg.createdAt;
  saveLocalConversations(conversations);

  return {
    conversationId: conv.id,
    title: conv.title,
    answer,
    reply: answer,
    products,
    suggestedProducts: products,
    referencedOrder,
    toolsUsed,
    createdAt: assistantMsg.createdAt
  };
};

const chatbotService = {
  /**
   * Gửi tin nhắn tới POST /api/v1/chatbot/chat (tương thích /api/chatbot/chat & /api/v1/chat/messages)
   */
  sendMessage: async ({ conversationId = null, question = '', message = '' } = {}) => {
    const cleanQuestion = String(question || message || '').trim();
    if (!cleanQuestion) {
      throw new Error('Vui lòng nhập nội dung câu hỏi.');
    }

    const guestSessionId = getOrCreateGuestSessionId();
    try {
      const response = await api.post(
        '/chatbot/chat',
        {
          conversationId: conversationId || null,
          question: cleanQuestion,
          message: cleanQuestion
        },
        {
          headers: {
            'X-Guest-Session-Id': guestSessionId
          },
          timeout: 30000
        }
      );
      const data = response?.data || response;
      const normalizedProducts = Array.isArray(data?.products) && data.products.length > 0
        ? data.products
        : Array.isArray(data?.suggestedProducts)
          ? data.suggestedProducts
          : [];
      const text = data?.answer || data?.reply || '';
      return {
        ...data,
        answer: text,
        reply: text,
        products: normalizedProducts,
        suggestedProducts: normalizedProducts
      };
    } catch (err) {
      if (err?.status === 400 || err?.status === 403) {
        throw err;
      }
      return buildRealServiceFallbackReply({ conversationId, question: cleanQuestion });
    }
  },

  /**
   * Tạo cuộc hội thoại mới: POST /api/v1/chatbot/conversations
   */
  createConversation: async (title = 'Cuộc trò chuyện mới') => {
    const guestSessionId = getOrCreateGuestSessionId();
    try {
      const response = await api.post(
        '/chatbot/conversations',
        { title },
        {
          headers: {
            'X-Guest-Session-Id': guestSessionId
          }
        }
      );
      return response?.data || response;
    } catch {
      const created = {
        id: `conv-${Date.now()}`,
        title,
        lastMessagePreview: 'Bắt đầu cuộc trò chuyện mới',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return created;
    }
  },

  /**
   * Lấy danh sách các cuộc hội thoại của khách hàng: GET /api/v1/chatbot/conversations
   */
  getConversations: async () => {
    const guestSessionId = getOrCreateGuestSessionId();
    try {
      const response = await api.get('/chatbot/conversations', {
        headers: {
          'X-Guest-Session-Id': guestSessionId
        }
      });
      const list = response?.data || response;
      return Array.isArray(list) ? list : [];
    } catch {
      return getLocalConversations().map((c) => ({
        id: c.id,
        title: c.title,
        lastMessagePreview: c.messages?.[c.messages.length - 1]?.content || c.title,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }));
    }
  },

  /**
   * Lấy toàn bộ lịch sử tin nhắn trong một cuộc hội thoại: GET /api/v1/chatbot/conversations/{id}
   */
  getConversationMessages: async (conversationId) => {
    if (!conversationId) return null;
    const guestSessionId = getOrCreateGuestSessionId();
    try {
      const response = await api.get(`/chatbot/conversations/${encodeURIComponent(conversationId)}`, {
        headers: {
          'X-Guest-Session-Id': guestSessionId
        }
      });
      return response?.data || response;
    } catch {
      const found = getLocalConversations().find((c) => c.id === conversationId);
      return found || null;
    }
  },

  /**
   * Xóa một cuộc hội thoại: DELETE /api/v1/chatbot/conversations/{id}
   */
  deleteConversation: async (conversationId) => {
    if (!conversationId) return;
    const guestSessionId = getOrCreateGuestSessionId();
    try {
      await api.delete(`/chatbot/conversations/${encodeURIComponent(conversationId)}`, {
        headers: {
          'X-Guest-Session-Id': guestSessionId
        }
      });
    } catch {
      // Remove from local fallback storage as well
    }
    const remaining = getLocalConversations().filter((c) => c.id !== conversationId);
    saveLocalConversations(remaining);
  }
};

export default chatbotService;

