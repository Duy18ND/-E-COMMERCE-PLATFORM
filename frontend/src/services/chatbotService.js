import api from './api';
import productService from './productService';
import orderService from './orderService';
import voucherService from './voucherService';
import { INITIAL_VOUCHERS } from '../mock/mockVouchers';
import { formatCurrency } from '../utils/formatCurrency';
import { isAuthenticated } from '../utils/auth';
import {
  extractMaxPriceFromText,
  extractMinPriceFromText,
  extractCleanSearchKeyword,
  extractOrderIdFromQuestion,
  extractComparisonTerms
} from '../utils/chatbotHelpers';

export { extractMaxPriceFromText, extractMinPriceFromText, extractCleanSearchKeyword };

const GUEST_SESSION_STORAGE_KEY = 'shopmart_guest_chat_session';
const LOCAL_CONVERSATIONS_KEY = 'shopmart_chat_conversations_fallback';

let fallbackSessionCounter = 0;

const generateCryptoSessionSuffix = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    if (typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID().slice(0, 8);
    }
    if (typeof globalThis.crypto.getRandomValues === 'function') {
      const array = new Uint32Array(1);
      globalThis.crypto.getRandomValues(array);
      return array[0].toString(36);
    }
  }
  fallbackSessionCounter += 1;
  return `${Date.now().toString(36)}-${fallbackSessionCounter}`;
};

export const getOrCreateGuestSessionId = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      let existing = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
      if (!existing) {
        existing = `guest-${Date.now()}-${generateCryptoSessionSuffix()}`;
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

const normalizeProductCard = (p) => ({
  ...p,
  image: p.imageUrl || p.image,
  productUrl: `/products/${p.id}`
});

const getScopeKey = () => (isAuthenticated() ? 'auth-user' : getOrCreateGuestSessionId());

/**
 * Fallback xử lý thông minh qua productService / orderService / voucherService thực tế
 * khi microservice chatbot-service (8085) chưa khởi chạy trong môi trường phát triển cục bộ.
 */
export const buildRealServiceFallbackReply = async ({ conversationId, question }) => {
  const cleanMsg = String(question ?? '').trim();
  const lower = cleanMsg.toLowerCase();
  const scopeKey = getScopeKey();
  const conversations = getLocalConversations();
  let conv = conversations.find((c) => c.id === conversationId);
  if (!conv) {
    conv = {
      id: conversationId || `conv-${Date.now()}`,
      scopeKey,
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

  if (
    /^(?:xin\s+chào|chào(?:\s+bạn|\s+shop|\s+ad)?|hello|hi|hey)\b[!.,\s]*$/i.test(cleanMsg) ||
    lower.includes('bạn là ai') ||
    lower.includes('giúp được gì')
  ) {
    toolsUsed.push('assistantIntro');
    answer =
      'Xin chào! Mình là **Trợ lý Mua sắm AI của ShopMart**.\n' +
      'Mình có thể hỗ trợ bạn:\n' +
      '- **Tìm & gợi ý sản phẩm** theo tên hoặc ngân sách (VD: *Gợi ý laptop dưới 30 triệu*, *iPhone 15*)\n' +
      '- **So sánh sản phẩm** & **kiểm tra tồn kho** thực tế\n' +
      '- **Xem mã giảm giá**, **chính sách giao hàng / bảo hành** và **tra cứu đơn hàng** của bạn.';
  } else if (lower.includes('vận chuyển') || lower.includes('giao hàng') || lower.includes('freeship') || lower.includes('phí ship')) {
    toolsUsed.push('getShippingPolicy');
    answer =
      '**Chính sách vận chuyển ShopMart:**\n' +
      '- **Miễn phí vận chuyển (Freeship)** cho đơn hàng từ 500.000đ hoặc đơn tiêu chuẩn toàn quốc.\n' +
      '- **Thời gian giao hàng:** Nội thành Hà Nội & TP.HCM từ **1 - 2 ngày**, các tỉnh thành khác **2 - 4 ngày làm việc**.';
  } else if (lower.includes('đổi trả') || lower.includes('bảo hành')) {
    toolsUsed.push('getReturnPolicy', 'getWarrantyPolicy');
    answer =
      '**Chính sách Bảo hành & Đổi trả ShopMart:**\n' +
      '- **1 đổi 1 trong 30 ngày đầu** nếu có lỗi phần cứng từ nhà sản xuất.\n' +
      '- **Bảo hành chính hãng 12 - 24 tháng** tại trung tâm ủy quyền toàn quốc.';
  } else if (lower.includes('thanh toán') || lower.includes('cod') || lower.includes('vnpay') || lower.includes('vietqr') || lower.includes('mã qr')) {
    toolsUsed.push('getPaymentPolicy');
    answer =
      '**Phương thức thanh toán tại ShopMart:**\n' +
      '- Hỗ trợ **Thanh toán khi nhận hàng (COD)** và **Chuyển khoản VietQR (Online)** xác nhận nhanh ngay trong ứng dụng.';
  } else if (lower.includes('voucher') || lower.includes('mã giảm') || lower.includes('khuyến mãi') || lower.includes('ưu đãi')) {
    toolsUsed.push('getPublicVouchers');
    let vouchers = [];
    try {
      vouchers = await voucherService.getPublicVouchers();
    } catch {
      vouchers = INITIAL_VOUCHERS.filter((v) => v.status === 'ACTIVE');
    }
    const activeVouchers = Array.isArray(vouchers) ? vouchers.slice(0, 4) : [];
    if (activeVouchers.length > 0) {
      const lines = activeVouchers.map((v) => {
        const discountText =
          v.discountType === 'PERCENT'
            ? `Giảm ${v.discountValue}%`
            : `Giảm ${formatCurrency(v.discountValue)}`;
        const minOrder = v.minOrderValue ?? v.minOrderAmount ?? 0;
        const minText = minOrder > 0 ? `đơn từ ${formatCurrency(minOrder)}` : 'mọi đơn hàng';
        return `- Mã \`${v.code}\`: **${discountText}** cho ${minText}`;
      });
      answer = `**Mã giảm giá đang áp dụng tại ShopMart:**\n\n${lines.join('\n')}\n\nBạn có thể lưu thêm mã tại trang **Kho Voucher** trước khi thanh toán nhé!`;
    } else {
      answer = 'Hiện chưa có mã giảm giá công khai nào khả dụng. Bạn vui lòng kiểm tra lại tại mục **Kho Voucher** nhé!';
    }
  } else if (lower.includes('đơn hàng') || lower.includes('tra cứu đơn') || lower.includes('kiểm tra đơn') || /#\d+/.test(lower)) {
    if (!isAuthenticated()) {
      answer = 'Để bảo mật thông tin cá nhân, vui lòng **đăng nhập tài khoản** trước khi tra cứu trạng thái đơn hàng của bạn.';
    } else {
      try {
        toolsUsed.push('getMyOrders');
        const requestedOrderId = extractOrderIdFromQuestion(cleanMsg);

        if (requestedOrderId) {
          let foundOrder = null;
          try {
            foundOrder = await orderService.getOrderById(requestedOrderId);
          } catch {
            const myOrders = await orderService.getMyOrders();
            const list = Array.isArray(myOrders) ? myOrders : myOrders?.content || [];
            foundOrder = list.find((o) => Number(o.id) === requestedOrderId) || null;
          }

          if (foundOrder) {
            referencedOrder = foundOrder;
            answer = `Đơn hàng **#${referencedOrder.id}** của bạn hiện ở trạng thái **${referencedOrder.status}** — Tổng thanh toán: **${formatCurrency(referencedOrder.totalAmount)}**.`;
          } else {
            answer = `Không tìm thấy đơn hàng **#${requestedOrderId}** trong tài khoản của bạn. Bạn vui lòng kiểm tra lại mã đơn tại mục **Đơn mua** nhé.`;
          }
        } else {
          const myOrders = await orderService.getMyOrders();
          const list = Array.isArray(myOrders) ? myOrders : myOrders?.content || [];
          if (list.length === 0) {
            answer = 'Hiện tại tài khoản của bạn chưa có đơn hàng nào trên hệ thống ShopMart.';
          } else {
            referencedOrder = list[0];
            answer = `Bạn hiện có **${list.length} đơn hàng**. Đơn gần nhất **#${referencedOrder.id}** đang ở trạng thái **${referencedOrder.status}** — Tổng tiền: **${formatCurrency(referencedOrder.totalAmount)}**.`;
          }
        }
      } catch {
        answer = 'Dịch vụ tra cứu đơn hàng tạm thời bận. Bạn có thể xem trực tiếp tại mục **Đơn mua** trên thanh menu.';
      }
    }
  } else if (lower.includes('so sánh')) {
    try {
      toolsUsed.push('compareProducts');
      const parts = extractComparisonTerms(cleanMsg);

      const responses = await Promise.all(
        parts.map((term) =>
          productService.getCatalog({
            keyword: term || undefined,
            page: 0,
            size: 2,
            allowMockFallback: true
          })
        )
      );

      const mergedMap = new Map();
      responses.forEach((res) => {
        const items = res?.content || (Array.isArray(res) ? res : []);
        items.forEach((item) => {
          if (item?.id !== undefined && !mergedMap.has(item.id)) {
            mergedMap.set(item.id, normalizeProductCard(item));
          }
        });
      });

      products = Array.from(mergedMap.values()).slice(0, 4);
      if (products.length > 0) {
        const lines = products.map((p) => {
          const rating = p.averageRating ? ` • Đánh giá ${Number(p.averageRating).toFixed(1)}/5` : '';
          const stockText = (p.stockQuantity ?? 0) > 0 ? `Còn ${p.stockQuantity} SP` : 'Hết hàng';
          return `- **${p.name}**: **${formatCurrency(p.price)}** (${stockText}${rating})`;
        });
        answer = `**So sánh nhanh ${products.length} sản phẩm trên ShopMart:**\n\n${lines.join('\n')}\n\nBạn có thể nhấn vào từng thẻ bên dưới để xem thông số chi tiết nhé.`;
      } else {
        answer = 'Chưa tìm thấy đủ sản phẩm khớp với tên bạn cần so sánh. Bạn vui lòng nêu rõ tên 2 mẫu sản phẩm nhé!';
      }
    } catch {
      answer = 'Xin lỗi, dịch vụ so sánh sản phẩm tạm thời gián đoạn. Vui lòng thử lại sau giây lát.';
    }
  } else if (lower.includes('tồn kho') || lower.includes('còn hàng') || lower.includes('còn không') || lower.includes('số lượng')) {
    try {
      toolsUsed.push('checkStock');
      const kw = extractCleanSearchKeyword(cleanMsg);
      const res = await productService.getCatalog({
        keyword: kw.length >= 2 ? kw : undefined,
        page: 0,
        size: 4,
        allowMockFallback: true
      });
      const items = res?.content || (Array.isArray(res) ? res : []);
      products = items.slice(0, 4).map(normalizeProductCard);

      if (products.length === 1 && typeof productService.checkStock === 'function') {
        try {
          const stockInfo = await productService.checkStock(products[0].id, 1);
          if (stockInfo && stockInfo.stockQuantity !== undefined) {
            products[0] = { ...products[0], stockQuantity: stockInfo.stockQuantity };
          }
        } catch {
          // Giữ số tồn kho từ catalog nếu endpoint check-stock chưa sẵn sàng
        }
      }

      if (products.length > 0) {
        const lines = products.map((p) => {
          const qty = p.stockQuantity ?? 0;
          return `- **${p.name}** (${formatCurrency(p.price)}): ${qty > 0 ? `**Còn ${qty} sản phẩm** sẵn sàng giao` : '**Tạm hết hàng**'}`;
        });
        answer = `**Kết quả kiểm tra tồn kho:**\n\n${lines.join('\n')}`;
      } else {
        answer = 'Không tìm thấy sản phẩm khớp để kiểm tra tồn kho. Bạn vui lòng nhập tên cụ thể hơn nhé!';
      }
    } catch {
      answer = 'Xin lỗi, dịch vụ kiểm tra tồn kho đang tạm thời gián đoạn. Vui lòng thử lại sau giây lát.';
    }
  } else {
    try {
      toolsUsed.push('searchProducts');
      const maxPrice = extractMaxPriceFromText(lower);
      const minPrice = extractMinPriceFromText(lower);
      const kw = extractCleanSearchKeyword(cleanMsg);
      const sort = lower.includes('rẻ nhất')
        ? 'price,asc'
        : lower.includes('đắt nhất') || lower.includes('cao cấp')
          ? 'price,desc'
          : undefined;

      let res = await productService.getCatalog({
        keyword: kw.length >= 2 ? kw : undefined,
        minPrice,
        maxPrice,
        inStock: true,
        sort,
        page: 0,
        size: 4,
        allowMockFallback: true
      });
      let items = res?.content || (Array.isArray(res) ? res : []);

      // Mở rộng sang sản phẩm tạm hết hàng nếu lọc còn hàng chưa có kết quả
      if (items.length === 0 && kw.length >= 2) {
        res = await productService.getCatalog({
          keyword: kw,
          minPrice,
          maxPrice,
          sort,
          page: 0,
          size: 4,
          allowMockFallback: true
        });
        items = res?.content || (Array.isArray(res) ? res : []);
      }

      // Thử lại với từ khóa chính đầu tiên nếu cụm từ khóa dài không khớp hoàn toàn
      if (items.length === 0 && kw.includes(' ')) {
        const firstToken = kw.split(/\s+/)[0];
        if (firstToken.length >= 2) {
          res = await productService.getCatalog({
            keyword: firstToken,
            minPrice,
            maxPrice,
            sort,
            page: 0,
            size: 4,
            allowMockFallback: true
          });
          items = res?.content || (Array.isArray(res) ? res : []);
        }
      }

      products = items.slice(0, 4).map(normalizeProductCard);

      if (products.length > 0) {
        const lines = products.map(
          (p) => `- **${p.name}** — Giá: **${formatCurrency(p.price)}** (${(p.stockQuantity ?? 0) > 0 ? `Còn ${p.stockQuantity} SP` : 'Hết hàng'})`
        );
        answer = `Mình tìm thấy **${products.length} sản phẩm chính hãng** phù hợp trên ShopMart:\n\n${lines.join('\n')}\n\nBạn có thể nhấn vào thẻ sản phẩm bên dưới để xem chi tiết nhé!`;
      } else {
        answer = 'Hiện chưa tìm thấy sản phẩm khớp hoàn toàn với tiêu chí của bạn. Bạn thử mở rộng ngân sách hoặc tìm theo danh mục như *Laptop, Điện thoại, Tai nghe, Màn hình* nhé!';
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
    const isLocalFallbackConv =
      typeof conversationId === 'string' && conversationId.startsWith('conv-');
    try {
      const response = await api.post(
        '/chatbot/chat',
        {
          conversationId: isLocalFallbackConv ? null : conversationId || null,
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
    const scopeKey = getScopeKey();
    try {
      const response = await api.get('/chatbot/conversations', {
        headers: {
          'X-Guest-Session-Id': guestSessionId
        }
      });
      const list = response?.data || response;
      return Array.isArray(list) ? list : [];
    } catch {
      return getLocalConversations()
        .filter((c) => !c.scopeKey || c.scopeKey === scopeKey)
        .map((c) => ({
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
    if (String(conversationId).startsWith('conv-')) {
      return getLocalConversations().find((c) => c.id === conversationId) || null;
    }
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
    if (!String(conversationId).startsWith('conv-')) {
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
    }
    const remaining = getLocalConversations().filter((c) => c.id !== conversationId);
    saveLocalConversations(remaining);
  }
};

export default chatbotService;

