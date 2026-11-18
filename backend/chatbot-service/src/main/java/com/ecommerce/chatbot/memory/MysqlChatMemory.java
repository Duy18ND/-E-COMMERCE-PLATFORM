package com.ecommerce.chatbot.memory;

import com.ecommerce.chatbot.entity.ChatMessageEntity;
import com.ecommerce.chatbot.enums.MessageRole;
import com.ecommerce.chatbot.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Persistent MySQL-backed ChatMemory implementation.
 * Retrieves the most recent N messages (default 20) in chronological order for multi-turn context.
 */
@Component
@RequiredArgsConstructor
public class MysqlChatMemory {

    private final ChatMessageRepository messageRepository;

    @Value("${ai.memory.max-messages:20}")
    private int defaultWindowSize = 20;

    public ChatMessageEntity append(String conversationId, MessageRole role, String content, String metadataJson) {
        ChatMessageEntity entity = ChatMessageEntity.builder()
                .conversationId(conversationId)
                .role(role)
                .content(content)
                .metadataJson(metadataJson)
                .build();
        return messageRepository.save(entity);
    }

    public List<ChatMessageEntity> getRecentContext(String conversationId) {
        return getRecentContext(conversationId, defaultWindowSize);
    }

    public List<ChatMessageEntity> getRecentContext(String conversationId, int maxMessages) {
        int limit = Math.max(1, maxMessages);
        List<ChatMessageEntity> desc = messageRepository.findByConversationIdOrderByCreatedAtDesc(
                conversationId, PageRequest.of(0, limit)
        );
        List<ChatMessageEntity> chronological = new ArrayList<>(desc);
        Collections.reverse(chronological);
        return chronological;
    }
}

