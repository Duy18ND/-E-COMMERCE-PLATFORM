package com.ecommerce.chatbot.controller;

import com.ecommerce.chatbot.dto.request.ChatMessageRequest;
import com.ecommerce.chatbot.dto.response.ApiResponse;
import com.ecommerce.chatbot.dto.response.ChatMessageResponse;
import com.ecommerce.chatbot.dto.response.ConversationDetailResponse;
import com.ecommerce.chatbot.dto.response.ConversationSummaryResponse;
import com.ecommerce.chatbot.exception.AccessDeniedException;
import com.ecommerce.chatbot.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/chatbot", "/api/chatbot", "/api/v1/chat"})
@RequiredArgsConstructor
@Tag(name = "AI Shopping Assistant Controller", description = "API Trợ lý Mua sắm AI, tìm kiếm/gợi ý sản phẩm, so sánh, kiểm tra tồn kho, tư vấn chính sách và tra cứu đơn hàng")
public class ChatController {

    private final ChatService chatService;

    @PostMapping({"/chat", "/messages"})
    @Operation(summary = "Gửi câu hỏi tới Trợ lý Mua sắm AI", description = "Hỗ trợ hội thoại ngôn ngữ tự nhiên, gợi ý sản phẩm, so sánh, tra cứu tồn kho, chính sách và đơn hàng")
    public ResponseEntity<ApiResponse<ChatMessageResponse>> sendMessage(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestHeader(value = "X-User-Roles", required = false) String roles,
            @RequestHeader(value = "X-Guest-Session-Id", required = false) String guestSessionId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @Valid @RequestBody ChatMessageRequest request
    ) {
        validateHeaderConsistency(authenticatedUserId, authorizationHeader);
        ChatMessageResponse response = chatService.sendMessage(request, authenticatedUserId, roles, guestSessionId);
        return ResponseEntity.ok(ApiResponse.success("Phản hồi thành công", response));
    }

    @PostMapping("/conversations")
    @Operation(summary = "Tạo cuộc hội thoại mới", description = "Khởi tạo phiên hội thoại mới cho khách hàng")
    public ResponseEntity<ApiResponse<ConversationSummaryResponse>> createConversation(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestHeader(value = "X-Guest-Session-Id", required = false) String guestSessionId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody(required = false) Map<String, String> body
    ) {
        validateHeaderConsistency(authenticatedUserId, authorizationHeader);
        String title = body != null ? body.get("title") : null;
        ConversationSummaryResponse created = chatService.createConversation(title, authenticatedUserId, guestSessionId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tạo cuộc hội thoại mới thành công", created));
    }

    @GetMapping("/conversations")
    @Operation(summary = "Lấy danh sách lịch sử hội thoại", description = "Lấy danh sách các cuộc hội thoại của khách hàng đang đăng nhập hoặc phiên khách vãng lai")
    public ResponseEntity<ApiResponse<List<ConversationSummaryResponse>>> getConversations(
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestHeader(value = "X-Guest-Session-Id", required = false) String guestSessionId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        validateHeaderConsistency(authenticatedUserId, authorizationHeader);
        List<ConversationSummaryResponse> list = chatService.getConversations(authenticatedUserId, guestSessionId);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách hội thoại thành công", list));
    }

    @GetMapping({"/conversations/{conversationId}", "/conversations/{conversationId}/messages"})
    @Operation(summary = "Lấy chi tiết lịch sử tin nhắn trong một hội thoại", description = "Kiểm tra quyền sở hữu hội thoại trước khi trả về lịch sử tin nhắn")
    public ResponseEntity<ApiResponse<ConversationDetailResponse>> getConversationMessages(
            @PathVariable String conversationId,
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestHeader(value = "X-Guest-Session-Id", required = false) String guestSessionId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        validateHeaderConsistency(authenticatedUserId, authorizationHeader);
        ConversationDetailResponse detail = chatService.getConversationDetail(conversationId, authenticatedUserId, guestSessionId);
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử hội thoại thành công", detail));
    }

    @DeleteMapping("/conversations/{conversationId}")
    @Operation(summary = "Xóa cuộc hội thoại", description = "Xóa cuộc hội thoại và toàn bộ lịch sử tin nhắn liên quan (chỉ chủ sở hữu được xóa)")
    public ResponseEntity<ApiResponse<Void>> deleteConversation(
            @PathVariable String conversationId,
            @RequestHeader(value = "X-User-Id", required = false) Long authenticatedUserId,
            @RequestHeader(value = "X-Guest-Session-Id", required = false) String guestSessionId,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        validateHeaderConsistency(authenticatedUserId, authorizationHeader);
        chatService.deleteConversation(conversationId, authenticatedUserId, guestSessionId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa cuộc hội thoại thành công", null));
    }

    private void validateHeaderConsistency(Long authenticatedUserId, String authorizationHeader) {
        if (authenticatedUserId != null && authenticatedUserId <= 0) {
            throw new AccessDeniedException("Thông tin định danh người dùng (X-User-Id) không hợp lệ");
        }
        if (StringUtils.hasText(authorizationHeader) && authenticatedUserId == null) {
            throw new AccessDeniedException("Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
        }
    }
}

