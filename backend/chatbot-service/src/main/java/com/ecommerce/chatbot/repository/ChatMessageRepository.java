package com.ecommerce.chatbot.repository;

import com.ecommerce.chatbot.entity.ChatMessageEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {

    List<ChatMessageEntity> findByConversationIdOrderByCreatedAtAsc(String conversationId);

    List<ChatMessageEntity> findByConversationIdOrderByCreatedAtDesc(String conversationId, Pageable pageable);

    void deleteByConversationId(String conversationId);
}

