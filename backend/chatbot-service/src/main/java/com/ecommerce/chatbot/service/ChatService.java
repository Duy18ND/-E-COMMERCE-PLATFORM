package com.ecommerce.chatbot.service;

import com.ecommerce.chatbot.dto.request.ChatMessageRequest;
import com.ecommerce.chatbot.dto.response.ChatMessageResponse;
import com.ecommerce.chatbot.dto.response.ConversationDetailResponse;
import com.ecommerce.chatbot.dto.response.ConversationSummaryResponse;

import java.util.List;

public interface ChatService {

    ChatMessageResponse sendMessage(
            ChatMessageRequest request,
            Long authenticatedUserId,
            String roles,
            String guestSessionId
    );

    ConversationSummaryResponse createConversation(
            String title,
            Long authenticatedUserId,
            String guestSessionId
    );

    List<ConversationSummaryResponse> getConversations(
            Long authenticatedUserId,
            String guestSessionId
    );

    ConversationDetailResponse getConversationDetail(
            String conversationId,
            Long authenticatedUserId,
            String guestSessionId
    );

    void deleteConversation(
            String conversationId,
            Long authenticatedUserId,
            String guestSessionId
    );
}

