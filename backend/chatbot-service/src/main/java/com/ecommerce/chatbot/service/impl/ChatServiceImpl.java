package com.ecommerce.chatbot.service.impl;

import com.ecommerce.chatbot.client.dto.OrderDto;
import com.ecommerce.chatbot.client.dto.ProductDto;
import com.ecommerce.chatbot.client.dto.ProductStockDto;
import com.ecommerce.chatbot.client.dto.VoucherDto;
import com.ecommerce.chatbot.dto.request.ChatMessageRequest;
import com.ecommerce.chatbot.dto.response.ChatMessageResponse;
import com.ecommerce.chatbot.dto.response.ConversationDetailResponse;
import com.ecommerce.chatbot.dto.response.ConversationSummaryResponse;
import com.ecommerce.chatbot.entity.ChatConversation;
import com.ecommerce.chatbot.entity.ChatMessageEntity;
import com.ecommerce.chatbot.enums.MessageRole;
import com.ecommerce.chatbot.exception.AccessDeniedException;
import com.ecommerce.chatbot.exception.ResourceNotFoundException;
import com.ecommerce.chatbot.memory.MysqlChatMemory;
import com.ecommerce.chatbot.repository.ChatConversationRepository;
import com.ecommerce.chatbot.repository.ChatMessageRepository;
import com.ecommerce.chatbot.service.ChatService;
import com.ecommerce.chatbot.tool.CustomerOrderTools;
import com.ecommerce.chatbot.tool.CustomerSupportTools;
import com.ecommerce.chatbot.tool.ProductShoppingTools;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatConversationRepository conversationRepository;
    private final ChatMessageRepository messageRepository;
    private final MysqlChatMemory chatMemory;
    private final ProductShoppingTools productTools;
    private final CustomerOrderTools orderTools;
    private final CustomerSupportTools supportTools;
    private final ObjectMapper objectMapper;

    @Value("${ai.provider.base-url:https://generativelanguage.googleapis.com/v1beta/openai}")
    private String aiBaseUrl;

    @Value("${ai.provider.api-key:}")
    private String aiApiKey;

    @Value("${ai.provider.model:gemini-2.0-flash}")
    private String aiModel;

    @Value("${ai.provider.temperature:0.2}")
    private double aiTemperature = 0.2;

    @Value("${ai.provider.timeout-seconds:15}")
    private int aiTimeoutSeconds = 15;

    @Value("${ai.provider.max-retries:2}")
    private int aiMaxRetries = 2;

    @Value("${ai.memory.max-messages:20}")
    private int memoryMaxMessages = 20;

    private static final Pattern PROMPT_INJECTION_PATTERN = Pattern.compile(
            "(?i)(ignore\\s+(all\\s+)?(previous|prior)\\s+instructions|bỏ\\s+qua\\s+(mọi\\s+)?hướng\\s+dẫn|"
                    + "system\\s*prompt|reveal\\s+secret|drop\\s+table|delete\\s+from\\s+users|"
                    + "SELECT\\s+\\*\\s+FROM|act\\s+as\\s+admin|bypass\\s+auth)"
    );

    private static final Pattern ORDER_ID_PATTERN = Pattern.compile("(?i)(?:đơn\\s{1,3}(?:hàng\\s{0,3})?(?:số\\s{0,3}|mã\\s{0,3}|#\\s{0,3})?|#)(\\d{1,10})");
    private static final Pattern PRODUCT_ID_PATTERN = Pattern.compile("(?i)(?:sản\\s{1,3}phẩm\\s{0,3}(?:số\\s{0,3}|mã\\s{0,3}|id\\s{0,3}|#\\s{0,3})?|sp\\s{0,3}#?)(\\d{1,10})");
    private static final Pattern MILLION_PRICE_PATTERN = Pattern.compile("(?i)(\\d{1,4}(?:[.,]\\d{1,2})?)\\s{0,3}(?:triệu|tr|trieu|m\\b)");
    private static final Pattern SEARCH_PRICE_UNIT_PATTERN = Pattern.compile("(?iuU)(\\d{1,5}(?:[.,]\\d{1,2})?)\\s{0,3}(?:triệu|tr|trieu|m\\b|nghìn|k\\b|đồng|vnđ|vnd)");
    private static final Pattern SEARCH_STOPWORDS_PATTERN = Pattern.compile("(?iuU)\\b(?:tôi|mình|muốn|cần|tìm|kiếm|mua|gợi ý|tư vấn|cho|hỏi|xem|kiểm tra|tồn kho|còn hàng|không|shop|ơi|sản phẩm|so sánh|giúp|với|dưới|trên|từ|khoảng|tầm|tối đa|giá|rẻ nhất|tốt nhất|chính hãng|có|nào)\\b");

    @Override
    @Transactional
    public ChatMessageResponse sendMessage(
            ChatMessageRequest request,
            Long authenticatedUserId,
            String roles,
            String guestSessionId
    ) {
        String rawMessage = request != null ? request.getEffectiveMessage() : "";
        if (!StringUtils.hasText(rawMessage)) {
            throw new IllegalArgumentException("Nội dung câu hỏi không được để trống");
        }
        if (rawMessage.length() > 1000) {
            throw new IllegalArgumentException("Nội dung câu hỏi không được vượt quá 1000 ký tự");
        }

        ChatConversation conversation = resolveOrCreateConversation(
                request.getConversationId(), rawMessage, authenticatedUserId, guestSessionId
        );

        List<ChatMessageEntity> history = chatMemory.getRecentContext(conversation.getId(), memoryMaxMessages);

        // Save user message to persistent memory
        chatMemory.append(conversation.getId(), MessageRole.USER, rawMessage, null);

        List<String> toolsUsed = new ArrayList<>();
        List<ProductDto> suggestedProducts = new ArrayList<>();
        OrderDto referencedOrder = null;
        String replyText;

        // 1. Prompt Injection & Security Guardrail
        if (PROMPT_INJECTION_PATTERN.matcher(rawMessage).find()) {
            replyText = "Xin lỗi, tôi là **Trợ lý Mua sắm AI của ShopMart**. Tôi chỉ hỗ trợ tư vấn sản phẩm, so sánh cấu hình, kiểm tra tồn kho, giải đáp chính sách mua hàng và tra cứu đơn hàng hợp lệ của bạn.";
        } else {
            // 2. Execute controlled AI Tools grounded in real microservice data
            GroundedResult grounded = executeToolCallingPipeline(
                    rawMessage, history, authenticatedUserId, roles, toolsUsed
            );
            suggestedProducts = grounded.products;
            referencedOrder = grounded.order;

            // 3. Optionally refine natural language phrasing with Gemini API while preserving grounded facts
            replyText = enhanceWithExternalLlmIfConfigured(rawMessage, history, grounded.replyDraft);
        }

        // 4. Persist Assistant message with metadata JSON
        String metadataJson = serializeMetadata(suggestedProducts, referencedOrder, toolsUsed);
        ChatMessageEntity savedAssistantMsg = chatMemory.append(
                conversation.getId(), MessageRole.ASSISTANT, replyText, metadataJson
        );

        conversation.setUpdatedAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        return ChatMessageResponse.builder()
                .conversationId(conversation.getId())
                .title(conversation.getTitle())
                .reply(replyText)
                .answer(replyText)
                .suggestedProducts(suggestedProducts)
                .products(suggestedProducts)
                .referencedOrder(referencedOrder)
                .toolsUsed(toolsUsed)
                .createdAt(savedAssistantMsg.getCreatedAt() != null ? savedAssistantMsg.getCreatedAt() : LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional
    public ConversationSummaryResponse createConversation(
            String title,
            Long authenticatedUserId,
            String guestSessionId
    ) {
        String effectiveGuestId = (authenticatedUserId == null)
                ? (StringUtils.hasText(guestSessionId) ? guestSessionId.trim() : "guest-default")
                : null;
        String cleanTitle = StringUtils.hasText(title) ? buildTitle(title.trim()) : "Cuộc trò chuyện mới";
        ChatConversation created = ChatConversation.builder()
                .id(UUID.randomUUID().toString())
                .userId(authenticatedUserId)
                .guestSessionId(effectiveGuestId)
                .title(cleanTitle)
                .status("ACTIVE")
                .build();
        ChatConversation saved = conversationRepository.save(created);
        return ConversationSummaryResponse.builder()
                .id(saved.getId())
                .title(saved.getTitle())
                .lastMessagePreview("Bắt đầu cuộc trò chuyện mới")
                .createdAt(saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now())
                .updatedAt(saved.getUpdatedAt() != null ? saved.getUpdatedAt() : LocalDateTime.now())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ConversationSummaryResponse> getConversations(Long authenticatedUserId, String guestSessionId) {
        List<ChatConversation> list;
        if (authenticatedUserId != null && authenticatedUserId > 0) {
            list = conversationRepository.findByUserIdAndStatusOrderByUpdatedAtDesc(authenticatedUserId, "ACTIVE");
        } else if (StringUtils.hasText(guestSessionId)) {
            list = conversationRepository.findByGuestSessionIdAndStatusOrderByUpdatedAtDesc(guestSessionId.trim(), "ACTIVE");
        } else {
            return Collections.emptyList();
        }

        return list.stream().map(conv -> {
            List<ChatMessageEntity> latest = chatMemory.getRecentContext(conv.getId(), 1);
            String preview = latest.isEmpty() ? conv.getTitle() : truncate(latest.get(0).getContent(), 80);
            return ConversationSummaryResponse.builder()
                    .id(conv.getId())
                    .title(conv.getTitle())
                    .lastMessagePreview(preview)
                    .createdAt(conv.getCreatedAt())
                    .updatedAt(conv.getUpdatedAt())
                    .build();
        }).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ConversationDetailResponse getConversationDetail(
            String conversationId,
            Long authenticatedUserId,
            String guestSessionId
    ) {
        ChatConversation conv = verifyConversationOwnership(conversationId, authenticatedUserId, guestSessionId);
        List<ChatMessageEntity> entities = messageRepository.findByConversationIdOrderByCreatedAtAsc(conv.getId());

        List<ConversationDetailResponse.MessageItemDto> items = entities.stream().map(msg -> {
            ParsedMetadata meta = deserializeMetadata(msg.getMetadataJson());
            return ConversationDetailResponse.MessageItemDto.builder()
                    .id(msg.getId())
                    .role(msg.getRole().name())
                    .content(msg.getContent())
                    .suggestedProducts(meta.products)
                    .products(meta.products)
                    .referencedOrder(meta.order)
                    .createdAt(msg.getCreatedAt())
                    .build();
        }).toList();

        return ConversationDetailResponse.builder()
                .id(conv.getId())
                .title(conv.getTitle())
                .createdAt(conv.getCreatedAt())
                .updatedAt(conv.getUpdatedAt())
                .messages(items)
                .build();
    }

    @Override
    @Transactional
    public void deleteConversation(String conversationId, Long authenticatedUserId, String guestSessionId) {
        ChatConversation conv = verifyConversationOwnership(conversationId, authenticatedUserId, guestSessionId);
        conv.setStatus("DELETED");
        conversationRepository.save(conv);
        messageRepository.deleteByConversationId(conv.getId());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Core Grounded AI Tool-Calling Pipeline
    // ─────────────────────────────────────────────────────────────────────────

    private GroundedResult executeToolCallingPipeline(
            String message,
            List<ChatMessageEntity> history,
            Long authenticatedUserId,
            String roles,
            List<String> toolsUsed
    ) {
        String lower = message.toLowerCase(Locale.ROOT);

        // A. Customer Support Policy Intents (Shipping, Payment, Return, Warranty)
        if (isSupportPolicyIntent(lower)) {
            return handleSupportPolicyIntent(lower, toolsUsed);
        }

        // B. Customer Order Tracking Intent
        if (isOrderTrackingIntent(lower)) {
            return handleOrderIntent(message, authenticatedUserId, roles, toolsUsed);
        }

        // C. Product Comparison Intent
        if (isComparisonIntent(lower)) {
            return handleComparisonIntent(message, history, toolsUsed);
        }

        // D. Stock Availability Check Intent
        if (isStockLookupIntent(lower)) {
            return handleStockIntent(message, history, toolsUsed);
        }

        // E. Active Promotions / Vouchers Intent
        if (isPromotionIntent(lower)) {
            return handlePromotionIntent(authenticatedUserId, toolsUsed);
        }

        // F. Product Detail Lookup by ID or Context Follow-up
        Long explicitProductId = extractProductId(message);
        if (explicitProductId != null || isFollowUpDetailIntent(lower)) {
            Long targetId = explicitProductId != null ? explicitProductId : extractRecentProductIdFromHistory(history);
            if (targetId != null) {
                toolsUsed.add("getProductDetail");
                toolsUsed.add("getProductDetails");
                ProductDto detail = productTools.getProductDetail(targetId);
                if (detail != null) {
                    return new GroundedResult(formatProductDetailReply(detail), List.of(detail), null);
                }
            }
        }

        // G. Natural Language Greeting
        if (isGreetingOnly(lower)) {
            return new GroundedResult(
                    "Xin chào! 👋 Mình là **Trợ lý Mua sắm AI của ShopMart**.\n\n"
                            + "Mình có thể hỗ trợ bạn:\n"
                            + "- 🔍 **Tìm kiếm & Gợi ý sản phẩm** theo nhu cầu và ngân sách *(VD: \"Gợi ý laptop dưới 30 triệu\")*\n"
                            + "- ⚖️ **So sánh sản phẩm** chi tiết về giá bán, danh mục, tồn kho\n"
                            + "- 📦 **Kiểm tra tồn kho** sản phẩm theo thời gian thực\n"
                            + "- 🧾 **Tra cứu trạng thái đơn hàng** và lịch sử mua hàng của bạn\n"
                            + "- 🛡️ **Tư vấn chính sách** vận chuyển, thanh toán, đổi trả và bảo hành\n\n"
                            + "Bạn đang quan tâm đến sản phẩm hay cần kiểm tra đơn hàng nào ạ?",
                    Collections.emptyList(),
                    null
            );
        }

        // H. Default: Product Search & Recommendations
        return handleProductSearchAndRecommendation(message, history, toolsUsed);
    }

    private GroundedResult handleSupportPolicyIntent(String lower, List<String> toolsUsed) {
        List<String> sections = new ArrayList<>();
        if (lower.contains("vận chuyển") || lower.contains("giao hàng") || lower.contains("ship") || lower.contains("freeship")) {
            toolsUsed.add("getShippingPolicy");
            sections.add(supportTools.getShippingPolicy());
        }
        if (lower.contains("thanh toán") || lower.contains("trả góp") || lower.contains("chuyển khoản") || lower.contains("cod") || lower.contains("vnpay")) {
            toolsUsed.add("getPaymentPolicy");
            sections.add(supportTools.getPaymentPolicy());
        }
        if (lower.contains("đổi trả") || lower.contains("hoàn tiền") || lower.contains("trả hàng") || lower.contains("đổi hàng")) {
            toolsUsed.add("getReturnPolicy");
            sections.add(supportTools.getReturnPolicy());
        }
        if (lower.contains("bảo hành") || lower.contains("sửa chữa") || lower.contains("chính hãng")) {
            toolsUsed.add("getWarrantyPolicy");
            sections.add(supportTools.getWarrantyPolicy());
        }
        if (sections.isEmpty()) {
            toolsUsed.add("getShippingPolicy");
            toolsUsed.add("getWarrantyPolicy");
            sections.add(supportTools.getShippingPolicy());
            sections.add(supportTools.getWarrantyPolicy());
        }
        return new GroundedResult(String.join("\n", sections), Collections.emptyList(), null);
    }

    private GroundedResult handleOrderIntent(
            String message,
            Long authenticatedUserId,
            String roles,
            List<String> toolsUsed
    ) {
        if (authenticatedUserId == null || authenticatedUserId <= 0) {
            return new GroundedResult(
                    "🔒 Để bảo mật thông tin cá nhân, vui lòng **đăng nhập tài khoản** trước khi tra cứu trạng thái đơn hàng hoặc lịch sử mua hàng của bạn.",
                    Collections.emptyList(),
                    null
            );
        }

        Long orderId = extractOrderId(message);
        if (orderId != null) {
            toolsUsed.add("getOrderStatus");
            toolsUsed.add("trackCustomerOrder");
            try {
                OrderDto order = orderTools.getOrderStatus(orderId, authenticatedUserId, roles);
                if (order == null) {
                    return new GroundedResult(
                            "Không tìm thấy đơn hàng **#" + orderId + "** thuộc tài khoản của bạn. Vui lòng kiểm tra lại mã đơn hàng.",
                            Collections.emptyList(),
                            null
                    );
                }
                return new GroundedResult(formatSingleOrderReply(order), Collections.emptyList(), order);
            } catch (AccessDeniedException ex) {
                return new GroundedResult("🚫 " + ex.getMessage(), Collections.emptyList(), null);
            }
        }

        toolsUsed.add("getMyOrders");
        toolsUsed.add("getCustomerRecentOrders");
        try {
            List<OrderDto> orders = orderTools.getMyOrders(authenticatedUserId, roles);
            if (orders.isEmpty()) {
                return new GroundedResult(
                        "Hiện tại tài khoản của bạn chưa có đơn hàng nào trên hệ thống ShopMart.",
                        Collections.emptyList(),
                        null
                );
            }
            OrderDto latest = orders.get(0);
            StringBuilder sb = new StringBuilder();
            sb.append("🧾 Bạn có **").append(orders.size()).append(" đơn hàng** trên hệ thống. Dưới đây là các đơn gần nhất:\n\n");
            for (OrderDto o : orders.stream().limit(5).toList()) {
                sb.append("- **Đơn #").append(o.getId()).append("** — Trạng thái: **")
                        .append(translateOrderStatus(o.getStatus())).append("** — Tổng tiền: **")
                        .append(formatVnd(o.getTotalAmount())).append("**\n");
            }
            sb.append("\nBạn có thể nhập *\"Kiểm tra đơn hàng #").append(latest.getId()).append("\"* để xem chi tiết từng sản phẩm và tiến trình giao hàng.");
            return new GroundedResult(sb.toString(), Collections.emptyList(), latest);
        } catch (AccessDeniedException ex) {
            return new GroundedResult("🚫 " + ex.getMessage(), Collections.emptyList(), null);
        }
    }

    private GroundedResult handleComparisonIntent(
            String message,
            List<ChatMessageEntity> history,
            List<String> toolsUsed
    ) {
        toolsUsed.add("compareProducts");
        List<ProductDto> candidates = new ArrayList<>();

        String[] parts = message.split("(?i)\\s+(?:và|với|vs|hay|hoặc)\\s+");
        if (parts.length >= 2) {
            for (String part : parts) {
                String kw = cleanSearchKeyword(part);
                if (StringUtils.hasText(kw)) {
                    List<ProductDto> found = productTools.searchProducts(kw, null, null, null, null, null, 2);
                    if (!found.isEmpty()) {
                        candidates.add(found.get(0));
                    }
                }
            }
        }

        if (candidates.size() < 2) {
            List<ProductDto> fromHistory = extractProductsFromHistory(history);
            for (ProductDto p : fromHistory) {
                if (candidates.stream().noneMatch(existing -> Objects.equals(existing.getId(), p.getId()))) {
                    candidates.add(p);
                }
                if (candidates.size() >= 2) break;
            }
        }

        if (candidates.size() < 2) {
            String fallbackKw = cleanSearchKeyword(message);
            List<ProductDto> searched = productTools.searchProducts(fallbackKw, null, null, null, null, null, 3);
            for (ProductDto p : searched) {
                if (candidates.stream().noneMatch(existing -> Objects.equals(existing.getId(), p.getId()))) {
                    candidates.add(p);
                }
                if (candidates.size() >= 3) break;
            }
        }

        if (candidates.size() < 2) {
            return new GroundedResult(
                    "Để so sánh chính xác, bạn vui lòng cho mình biết tên **2 sản phẩm** bạn muốn đặt lên bàn cân nhé *(ví dụ: \"So sánh Laptop Dell XPS 15 và MacBook Air M2\")*.",
                    candidates,
                    null
            );
        }

        List<Long> ids = candidates.stream().map(ProductDto::getId).filter(Objects::nonNull).limit(3).toList();
        List<ProductDto> enriched = productTools.compareProducts(ids);
        List<ProductDto> finalCompare = enriched.size() >= 2 ? enriched : candidates.stream().limit(3).toList();

        StringBuilder sb = new StringBuilder("⚖️ **Bảng so sánh chi tiết các sản phẩm từ dữ liệu thực tế ShopMart:**\n\n");
        for (ProductDto p : finalCompare) {
            int stock = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
            sb.append("### 🔹 ").append(p.getName()).append("\n")
                    .append("- **Giá bán:** ").append(formatVnd(p.getPrice())).append("\n")
                    .append("- **Danh mục:** ").append(p.getCategory() != null ? p.getCategory() : "Chính hãng").append("\n")
                    .append("- **Tồn kho:** ").append(stock > 0 ? "Còn hàng (" + stock + " sản phẩm)" : "Hết hàng").append("\n");
            if (p.getAverageRating() != null && p.getAverageRating() > 0) {
                sb.append("- **Đánh giá:** ⭐ ").append(String.format(Locale.US, "%.1f/5", p.getAverageRating()))
                        .append(" (").append(p.getTotalReviews() != null ? p.getTotalReviews() : 0).append(" nhận xét)\n");
            }
            if (StringUtils.hasText(p.getDescription())) {
                sb.append("- **Điểm nổi bật:** ").append(truncate(p.getDescription(), 140)).append("\n");
            }
            sb.append("\n");
        }

        ProductDto cheapest = finalCompare.stream()
                .filter(p -> p.getPrice() != null)
                .min(Comparator.comparing(ProductDto::getPrice))
                .orElse(finalCompare.get(0));
        sb.append("💡 **Gợi ý:** Nếu bạn ưu tiên mức giá tối ưu nhất, **")
                .append(cheapest.getName()).append("** (").append(formatVnd(cheapest.getPrice()))
                .append(") là lựa chọn rất đáng cân nhắc.");

        return new GroundedResult(sb.toString(), finalCompare, null);
    }

    private GroundedResult handleStockIntent(
            String message,
            List<ChatMessageEntity> history,
            List<String> toolsUsed
    ) {
        toolsUsed.add("getProductStock");
        toolsUsed.add("checkProductStock");
        Long productId = extractProductId(message);
        ProductDto targetProduct = null;

        if (productId == null) {
            String kw = cleanSearchKeyword(message);
            if (StringUtils.hasText(kw)) {
                toolsUsed.add("searchProducts");
                List<ProductDto> matches = productTools.searchProducts(kw, null, null, null, null, null, 2);
                if (!matches.isEmpty()) {
                    targetProduct = matches.get(0);
                    productId = targetProduct.getId();
                }
            }
        }

        if (productId == null) {
            productId = extractRecentProductIdFromHistory(history);
        }

        if (productId != null) {
            ProductStockDto stock = productTools.getProductStock(productId, 1);
            if ( targetProduct == null ) {
                targetProduct = productTools.getProductDetail(productId);
            }
            if (stock != null) {
                String statusText = stock.isInStock()
                        ? "✅ **Còn hàng** — Hiện có sẵn **" + stock.getStockQuantity() + " sản phẩm** trong kho, sẵn sàng giao ngay."
                        : "❌ **Tạm hết hàng** — Hiện số lượng tồn kho là **0**.";
                String reply = "📦 **Kiểm tra tồn kho thời gian thực:**\n\n"
                        + "- **Sản phẩm:** " + stock.getProductName() + " *(Mã SP: #" + stock.getProductId() + ")*\n"
                        + "- **Tình trạng:** " + statusText;
                List<ProductDto> cards = targetProduct != null ? List.of(targetProduct) : Collections.emptyList();
                return new GroundedResult(reply, cards, null);
            }
        }

        return new GroundedResult(
                "Bạn muốn kiểm tra số lượng tồn kho của sản phẩm nào ạ? Vui lòng nhập tên sản phẩm *(ví dụ: \"Kiểm tra tồn kho iPhone 15 Pro Max\")*.",
                Collections.emptyList(),
                null
        );
    }

    private GroundedResult handlePromotionIntent(Long authenticatedUserId, List<String> toolsUsed) {
        toolsUsed.add("getActiveVouchers");
        List<VoucherDto> vouchers = productTools.getActiveVouchers(authenticatedUserId);
        if (vouchers.isEmpty()) {
            return new GroundedResult(
                    "Hiện tại chưa có mã giảm giá (voucher) công khai mới. Bạn có thể ghé mục **Flash Sale** trên thanh menu để săn các sản phẩm giảm giá trực tiếp nhé!",
                    Collections.emptyList(),
                    null
            );
        }

        StringBuilder sb = new StringBuilder("🎟️ **Danh sách Mã giảm giá (Voucher) đang có hiệu lực trên ShopMart:**\n\n");
        for (VoucherDto v : vouchers.stream().limit(5).toList()) {
            sb.append("- Mã **`").append(v.getCode()).append("`**: ");
            if ("PERCENTAGE".equalsIgnoreCase(v.getDiscountType()) || "PERCENT".equalsIgnoreCase(v.getDiscountType())) {
                sb.append("Giảm **").append(v.getDiscountValue().stripTrailingZeros().toPlainString()).append("%**");
                if (v.getMaxDiscountAmount() != null) {
                    sb.append(" (tối đa ").append(formatVnd(v.getMaxDiscountAmount())).append(")");
                }
            } else {
                sb.append("Giảm **").append(formatVnd(v.getDiscountValue())).append("**");
            }
            if (v.getMinOrderValue() != null && v.getMinOrderValue().compareTo(BigDecimal.ZERO) > 0) {
                sb.append(" cho đơn từ ").append(formatVnd(v.getMinOrderValue()));
            }
            sb.append("\n");
        }
        sb.append("\n💡 Bạn có thể lưu mã tại trang **Kho Voucher** và áp dụng trực tiếp ở bước Thanh toán (Checkout)!");
        return new GroundedResult(sb.toString(), Collections.emptyList(), null);
    }

    private GroundedResult handleProductSearchAndRecommendation(
            String message,
            List<ChatMessageEntity> history,
            List<String> toolsUsed
    ) {
        toolsUsed.add("searchProducts");
        BigDecimal maxPrice = extractMaxPrice(message);
        BigDecimal minPrice = extractMinPrice(message);
        String keyword = cleanSearchKeyword(message);
        String sort = message.toLowerCase(Locale.ROOT).contains("rẻ nhất") ? "price,asc"
                : (message.toLowerCase(Locale.ROOT).contains("đắt nhất") || message.toLowerCase(Locale.ROOT).contains("cao cấp")) ? "price,desc"
                : null;

        List<ProductDto> products = productTools.searchProducts(
                StringUtils.hasText(keyword) ? keyword : null,
                null,
                minPrice,
                maxPrice,
                true,
                sort,
                6
        );

        // Broaden search if strict keyword yielded empty but category/brand token exists
        if (products.isEmpty() && StringUtils.hasText(keyword) && keyword.contains(" ")) {
            String firstToken = keyword.split("\\s+")[0];
            products = productTools.searchProducts(firstToken, null, minPrice, maxPrice, null, sort, 6);
        }

        if (products.isEmpty()) {
            return new GroundedResult(
                    "Rất tiếc, hiện tại trên hệ thống ShopMart chưa có sản phẩm nào khớp hoàn toàn với tiêu chí tìm kiếm của bạn"
                            + (maxPrice != null ? " *(ngân sách dưới " + formatVnd(maxPrice) + ")*" : "")
                            + ". Bạn có thể thử mở rộng khoảng giá hoặc tìm theo từ khóa danh mục như *Laptop, Điện thoại, Tai nghe, Màn hình* nhé!",
                    Collections.emptyList(),
                    null
            );
        }

        StringBuilder sb = new StringBuilder();
        sb.append("🛍️ Mình tìm thấy **").append(products.size())
                .append(" sản phẩm chính hãng** phù hợp với yêu cầu của bạn trên hệ thống ShopMart:\n\n");

        for (ProductDto p : products.stream().limit(5).toList()) {
            int stock = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
            sb.append("- **").append(p.getName()).append("** — Giá: **").append(formatVnd(p.getPrice())).append("**");
            if (p.getActiveFlashSale() != null && p.getActiveFlashSale().getFlashSalePrice() != null) {
                sb.append(" *(⚡ Flash Sale: **").append(formatVnd(p.getActiveFlashSale().getFlashSalePrice())).append("**)*");
            }
            sb.append(" — ").append(stock > 0 ? "Còn " + stock + " SP" : "Hết hàng").append("\n");
        }
        sb.append("\nBạn có thể nhấn trực tiếp vào thẻ sản phẩm bên dưới để xem chi tiết hoặc yêu cầu mình **so sánh** giữa các mẫu này nhé!");

        return new GroundedResult(sb.toString(), products.stream().limit(5).toList(), null);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Google Gemini / Spring AI Compatible Enhancement with Retry & Timeout
    // ─────────────────────────────────────────────────────────────────────────

    private String enhanceWithExternalLlmIfConfigured(
            String userPrompt,
            List<ChatMessageEntity> history,
            String groundedDraft
    ) {
        if (!StringUtils.hasText(aiApiKey) || aiApiKey.contains("CHANGE_ME") || aiApiKey.contains("YOUR_")) {
            return groundedDraft;
        }
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        int timeoutMs = Math.max(2000, aiTimeoutSeconds * 1000);
        factory.setConnectTimeout(timeoutMs);
        factory.setReadTimeout(timeoutMs);
        RestTemplate restTemplate = new RestTemplate(factory);

        StringBuilder historyContext = new StringBuilder();
        for (ChatMessageEntity msg : history.stream().limit(10).toList()) {
            historyContext.append(msg.getRole().name()).append(": ").append(truncate(msg.getContent(), 200)).append("\n");
        }

        boolean isNativeGemini = !aiBaseUrl.contains("/openai") && aiBaseUrl.contains("generativelanguage.googleapis.com");
        String endpoint;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> body = new HashMap<>();

        if (isNativeGemini) {
            String baseUrl = aiBaseUrl.endsWith("/") ? aiBaseUrl.substring(0, aiBaseUrl.length() - 1) : aiBaseUrl;
            endpoint = baseUrl + "/models/" + aiModel + ":generateContent?key=" + aiApiKey.trim();
            String promptText = "Bạn là Trợ lý Mua sắm AI chính thức của sàn thương mại điện tử ShopMart.\n"
                    + "Chỉ sử dụng đúng số liệu giá bán, tồn kho, chính sách và thông tin sản phẩm trong dữ liệu hệ thống cung cấp dưới đây.\n"
                    + "Tuyệt đối không tự bịa đặt giá bán, tồn kho hoặc trạng thái đơn hàng.\n"
                    + "Trả lời ngắn gọn, tự nhiên, lịch sự bằng tiếng Việt, định dạng Markdown rõ ràng.\n\n"
                    + (historyContext.length() > 0 ? "Ngữ cảnh hội thoại gần đây:\n" + historyContext + "\n" : "")
                    + "Câu hỏi khách hàng: " + userPrompt
                    + "\n\nDữ liệu thực tế từ hệ thống ShopMart:\n" + groundedDraft;
            body.put("contents", List.of(Map.of("role", "user", "parts", List.of(Map.of("text", promptText)))));
            body.put("generationConfig", Map.of("temperature", aiTemperature));
        } else {
            endpoint = aiBaseUrl.endsWith("/") ? aiBaseUrl + "chat/completions" : aiBaseUrl + "/chat/completions";
            headers.setBearerAuth(aiApiKey.trim());
            body.put("model", aiModel);
            body.put("temperature", aiTemperature);
            body.put("messages", List.of(
                    Map.of(
                            "role", "system",
                            "content", "Bạn là Trợ lý Mua sắm AI chính thức của sàn thương mại điện tử ShopMart. "
                                    + "Chỉ sử dụng đúng số liệu giá bán, tồn kho, chính sách và thông tin sản phẩm trong dữ liệu hệ thống cung cấp dưới đây. "
                                    + "Tuyệt đối không tự bịa đặt giá bán, tồn kho hoặc trạng thái đơn hàng. "
                                    + "Trả lời ngắn gọn, tự nhiên, lịch sự bằng tiếng Việt, định dạng Markdown rõ ràng."
                    ),
                    Map.of(
                            "role", "user",
                            "content", (historyContext.length() > 0 ? "Ngữ cảnh hội thoại gần đây:\n" + historyContext + "\n" : "")
                                    + "Câu hỏi khách hàng: " + userPrompt
                                    + "\n\nDữ liệu thực tế từ hệ thống ShopMart:\n" + groundedDraft
                    )
            ));
        }

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
        int maxAttempts = Math.max(1, aiMaxRetries + 1);

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                @SuppressWarnings("rawtypes")
                ResponseEntity<Map> res = restTemplate.postForEntity(endpoint, entity, Map.class);
                if (res.getStatusCode().is2xxSuccessful() && res.getBody() != null) {
                    if (isNativeGemini) {
                        Object candidatesObj = res.getBody().get("candidates");
                        if (candidatesObj instanceof List<?> candidates && !candidates.isEmpty()) {
                            Object first = candidates.get(0);
                            if (first instanceof Map<?, ?> candMap) {
                                Object contentObj = candMap.get("content");
                                if (contentObj instanceof Map<?, ?> contentMap) {
                                    Object partsObj = contentMap.get("parts");
                                    if (partsObj instanceof List<?> parts && !parts.isEmpty()) {
                                        Object firstPart = parts.get(0);
                                        if (firstPart instanceof Map<?, ?> partMap) {
                                            Object textObj = partMap.get("text");
                                            if (textObj instanceof String str && StringUtils.hasText(str)) {
                                                return str.trim();
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        Object choicesObj = res.getBody().get("choices");
                        if (choicesObj instanceof List<?> choices && !choices.isEmpty()) {
                            Object first = choices.get(0);
                            if (first instanceof Map<?, ?> choiceMap) {
                                Object msgObj = choiceMap.get("message");
                                if (msgObj instanceof Map<?, ?> msgMap) {
                                    Object content = msgMap.get("content");
                                    if (content instanceof String str && StringUtils.hasText(str)) {
                                        return str.trim();
                                    }
                                }
                            }
                        }
                    }
                }
                break;
            } catch (HttpStatusCodeException httpEx) {
                int status = httpEx.getStatusCode().value();
                log.warn("[ChatService] Gemini API returned HTTP {} on attempt {}/{}", status, attempt, maxAttempts);
                if ((status == 429 || status == 503) && attempt < maxAttempts) {
                    try {
                        Thread.sleep(250L * attempt);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                } else {
                    break;
                }
            } catch (Exception ex) {
                log.debug("[ChatService] Gemini API call skipped/fallback to grounded response: {}", ex.getMessage());
                break;
            }
        }
        return groundedDraft;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Intent & Entity Extraction Helpers
    // ─────────────────────────────────────────────────────────────────────────

    private boolean isSupportPolicyIntent(String lower) {
        return lower.contains("chính sách")
                || lower.contains("vận chuyển")
                || lower.contains("giao hàng mất bao lâu")
                || lower.contains("phí ship")
                || lower.contains("freeship")
                || lower.contains("đổi trả")
                || lower.contains("hoàn tiền")
                || lower.contains("bảo hành")
                || lower.contains("phương thức thanh toán")
                || lower.contains("thanh toán như thế nào");
    }

    private boolean isOrderTrackingIntent(String lower) {
        return lower.contains("đơn hàng")
                || lower.contains("kiểm tra đơn")
                || lower.contains("tra cứu đơn")
                || lower.contains("theo dõi đơn")
                || lower.contains("lịch sử mua")
                || lower.contains("đơn của tôi")
                || ORDER_ID_PATTERN.matcher(lower).find();
    }

    private boolean isComparisonIntent(String lower) {
        return lower.contains("so sánh")
                || lower.contains("khác nhau")
                || (lower.contains("nên mua") && (lower.contains("hay") || lower.contains("hoặc")));
    }

    private boolean isStockLookupIntent(String lower) {
        return lower.contains("tồn kho")
                || lower.contains("còn hàng")
                || lower.contains("hết hàng")
                || lower.contains("còn mấy")
                || lower.contains("còn bao nhiêu")
                || lower.contains("đủ hàng");
    }

    private boolean isPromotionIntent(String lower) {
        return lower.contains("voucher")
                || lower.contains("mã giảm")
                || lower.contains("khuyến mãi")
                || lower.contains("flash sale")
                || lower.contains("ưu đãi");
    }

    private boolean isFollowUpDetailIntent(String lower) {
        return lower.contains("chi tiết sản phẩm này")
                || lower.contains("cấu hình chi tiết")
                || lower.contains("thông số")
                || lower.contains("sản phẩm đầu tiên");
    }

    private boolean isGreetingOnly(String lower) {
        String cleaned = lower.replaceAll("[^a-zA-ZÀ-ỹ0-9\\s]", "").trim();
        return Set.of("xin chào", "chào bạn", "hello", "hi", "chào shop", "chào ad", "bạn là ai").contains(cleaned);
    }

    private Long extractOrderId(String text) {
        Matcher m = ORDER_ID_PATTERN.matcher(text);
        if (m.find()) {
            try {
                return Long.parseLong(m.group(1));
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }

    private Long extractProductId(String text) {
        Matcher m = PRODUCT_ID_PATTERN.matcher(text);
        if (m.find()) {
            try {
                return Long.parseLong(m.group(1));
            } catch (NumberFormatException ignored) {
            }
        }
        return null;
    }

    private BigDecimal extractMaxPrice(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("dưới") || lower.contains("tối đa") || lower.contains("khoảng") || lower.contains("tầm")) {
            Matcher m = MILLION_PRICE_PATTERN.matcher(lower);
            if (m.find()) {
                double millions = Double.parseDouble(m.group(1).replace(',', '.'));
                return BigDecimal.valueOf((long) (millions * 1_000_000L));
            }
        }
        return null;
    }

    private BigDecimal extractMinPrice(String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("trên") || lower.contains("từ")) {
            Matcher m = MILLION_PRICE_PATTERN.matcher(lower);
            if (m.find()) {
                double millions = Double.parseDouble(m.group(1).replace(',', '.'));
                return BigDecimal.valueOf((long) (millions * 1_000_000L));
            }
        }
        return null;
    }

    private String cleanSearchKeyword(String raw) {
        String normalized = SEARCH_PRICE_UNIT_PATTERN.matcher(raw).replaceAll(" ");
        String cleaned = SEARCH_STOPWORDS_PATTERN.matcher(normalized).replaceAll(" ")
                .replaceAll("[?!.,;:\"'()\\[\\]#]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return cleaned.length() >= 2 ? cleaned : "";
    }

    private Long extractRecentProductIdFromHistory(List<ChatMessageEntity> history) {
        List<ProductDto> products = extractProductsFromHistory(history);
        return products.isEmpty() ? null : products.get(0).getId();
    }

    private List<ProductDto> extractProductsFromHistory(List<ChatMessageEntity> history) {
        List<ProductDto> collected = new ArrayList<>();
        for (int i = history.size() - 1; i >= 0; i--) {
            ChatMessageEntity msg = history.get(i);
            if (StringUtils.hasText(msg.getMetadataJson())) {
                ParsedMetadata meta = deserializeMetadata(msg.getMetadataJson());
                for (ProductDto p : meta.products) {
                    if (p.getId() != null && collected.stream().noneMatch(e -> Objects.equals(e.getId(), p.getId()))) {
                        collected.add(p);
                    }
                }
            }
            if (collected.size() >= 4) break;
        }
        return collected;
    }

    private String formatProductDetailReply(ProductDto p) {
        int stock = p.getStockQuantity() != null ? p.getStockQuantity() : 0;
        StringBuilder sb = new StringBuilder();
        sb.append("📌 **Thông tin chi tiết sản phẩm: ").append(p.getName()).append("**\n\n")
                .append("- **Mã sản phẩm:** #").append(p.getId()).append("\n")
                .append("- **Danh mục:** ").append(p.getCategory() != null ? p.getCategory() : "Chính hãng").append("\n")
                .append("- **Giá niêm yết:** **").append(formatVnd(p.getPrice())).append("**\n");
        if (p.getActiveFlashSale() != null && p.getActiveFlashSale().getFlashSalePrice() != null) {
            sb.append("- **⚡ Giá Flash Sale:** **").append(formatVnd(p.getActiveFlashSale().getFlashSalePrice())).append("**\n");
        }
        sb.append("- **Tình trạng kho:** ").append(stock > 0 ? "Còn hàng (" + stock + " sản phẩm)" : "Tạm hết hàng").append("\n");
        if (p.getAverageRating() != null && p.getAverageRating() > 0) {
            sb.append("- **Đánh giá khách hàng:** ⭐ ").append(String.format(Locale.US, "%.1f/5", p.getAverageRating()))
                    .append(" (").append(p.getTotalReviews() != null ? p.getTotalReviews() : 0).append(" đánh giá)\n");
        }
        if (StringUtils.hasText(p.getDescription())) {
            sb.append("- **Mô tả:** ").append(p.getDescription()).append("\n");
        }
        return sb.toString();
    }

    private String formatSingleOrderReply(OrderDto order) {
        StringBuilder sb = new StringBuilder();
        sb.append("📦 **Chi tiết Đơn hàng #").append(order.getId()).append(":**\n\n")
                .append("- **Trạng thái hiện tại:** **").append(translateOrderStatus(order.getStatus())).append("**\n")
                .append("- **Người nhận:** ").append(order.getReceiverName()).append(" (").append(order.getReceiverPhone()).append(")\n")
                .append("- **Địa chỉ giao hàng:** ").append(order.getShippingAddress()).append("\n")
                .append("- **Phương thức thanh toán:** ").append(order.getPaymentMethod() != null ? order.getPaymentMethod() : "COD").append("\n")
                .append("- **Tổng thanh toán:** **").append(formatVnd(order.getTotalAmount())).append("**\n");

        if (order.getItems() != null && !order.getItems().isEmpty()) {
            sb.append("\n**Danh sách sản phẩm:**\n");
            for (OrderDto.OrderItemDto item : order.getItems()) {
                sb.append("- ").append(item.getProductName()).append(" × ").append(item.getQuantity())
                        .append(" (").append(formatVnd(item.getSubtotal())).append(")\n");
            }
        }
        return sb.toString();
    }

    private String translateOrderStatus(String status) {
        if (status == null) return "Đang xử lý";
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "PENDING" -> "Chờ xác nhận (PENDING)";
            case "CONFIRMED" -> "Đã xác nhận (CONFIRMED)";
            case "PROCESSING" -> "Đang chuẩn bị hàng (PROCESSING)";
            case "SHIPPING", "SHIPPED" -> "Đang giao hàng (SHIPPING)";
            case "DELIVERED", "COMPLETED" -> "Đã giao thành công (DELIVERED)";
            case "PAID" -> "Đã thanh toán (PAID)";
            case "CANCELLED" -> "Đã hủy (CANCELLED)";
            case "PAYMENT_FAILED" -> "Thanh toán thất bại (PAYMENT_FAILED)";
            default -> status;
        };
    }

    private String formatVnd(BigDecimal amount) {
        if (amount == null) return "Liên hệ";
        NumberFormat nf = NumberFormat.getInstance(Locale.of("vi", "VN"));
        return nf.format(amount) + " ₫";
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Conversation Ownership & Metadata Serialization
    // ─────────────────────────────────────────────────────────────────────────

    private ChatConversation resolveOrCreateConversation(
            String conversationId,
            String firstMessage,
            Long authenticatedUserId,
            String guestSessionId
    ) {
        String effectiveGuestId = (authenticatedUserId == null)
                ? (StringUtils.hasText(guestSessionId) ? guestSessionId.trim() : "guest-default")
                : null;

        if (StringUtils.hasText(conversationId)) {
            Optional<ChatConversation> existingOpt = conversationRepository.findByIdAndStatus(conversationId.trim(), "ACTIVE");
            if (existingOpt.isPresent()) {
                ChatConversation existing = existingOpt.get();
                assertOwnership(existing, authenticatedUserId, effectiveGuestId);
                return existing;
            }
        }

        ChatConversation created = ChatConversation.builder()
                .id(UUID.randomUUID().toString())
                .userId(authenticatedUserId)
                .guestSessionId(effectiveGuestId)
                .title(buildTitle(firstMessage))
                .status("ACTIVE")
                .build();
        return conversationRepository.save(created);
    }

    private ChatConversation verifyConversationOwnership(
            String conversationId,
            Long authenticatedUserId,
            String guestSessionId
    ) {
        ChatConversation conv = conversationRepository.findByIdAndStatus(conversationId, "ACTIVE")
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cuộc hội thoại: " + conversationId));
        String effectiveGuestId = (authenticatedUserId == null)
                ? (StringUtils.hasText(guestSessionId) ? guestSessionId.trim() : "guest-default")
                : null;
        assertOwnership(conv, authenticatedUserId, effectiveGuestId);
        return conv;
    }

    private void assertOwnership(ChatConversation conv, Long authenticatedUserId, String guestSessionId) {
        if (conv.getUserId() != null) {
            if (authenticatedUserId == null || !conv.getUserId().equals(authenticatedUserId)) {
                throw new AccessDeniedException("Bạn không có quyền truy cập cuộc hội thoại của người dùng khác.");
            }
        } else if (StringUtils.hasText(conv.getGuestSessionId())) {
            if (!Objects.equals(conv.getGuestSessionId(), guestSessionId)) {
                throw new AccessDeniedException("Phiên hội thoại khách vãng lai không khớp.");
            }
        }
    }

    private String buildTitle(String message) {
        String clean = message.replaceAll("\\s+", " ").trim();
        return truncate(clean, 60);
    }

    private String truncate(String s, int maxLen) {
        if (s == null) return "";
        return s.length() <= maxLen ? s : s.substring(0, maxLen - 3) + "...";
    }

    private String serializeMetadata(List<ProductDto> products, OrderDto order, List<String> toolsUsed) {
        try {
            Map<String, Object> map = new HashMap<>();
            map.put("products", products != null ? products : Collections.emptyList());
            map.put("order", order);
            map.put("toolsUsed", toolsUsed != null ? toolsUsed : Collections.emptyList());
            return objectMapper.writeValueAsString(map);
        } catch (Exception ex) {
            return null;
        }
    }

    private ParsedMetadata deserializeMetadata(String json) {
        if (!StringUtils.hasText(json)) {
            return new ParsedMetadata(Collections.emptyList(), null);
        }
        try {
            Map<String, Object> raw = objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
            List<ProductDto> products = raw.get("products") != null
                    ? objectMapper.convertValue(raw.get("products"), new TypeReference<List<ProductDto>>() {})
                    : Collections.emptyList();
            OrderDto order = raw.get("order") != null
                    ? objectMapper.convertValue(raw.get("order"), OrderDto.class)
                    : null;
            return new ParsedMetadata(products, order);
        } catch (Exception ex) {
            return new ParsedMetadata(Collections.emptyList(), null);
        }
    }

    private record GroundedResult(String replyDraft, List<ProductDto> products, OrderDto order) {}
    private record ParsedMetadata(List<ProductDto> products, OrderDto order) {}
}

