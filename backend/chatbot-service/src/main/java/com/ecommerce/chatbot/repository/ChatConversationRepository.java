package com.ecommerce.chatbot.repository;

import com.ecommerce.chatbot.entity.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatConversationRepository extends JpaRepository<ChatConversation, String> {

    List<ChatConversation> findByUserIdAndStatusOrderByUpdatedAtDesc(Long userId, String status);

    List<ChatConversation> findByGuestSessionIdAndStatusOrderByUpdatedAtDesc(String guestSessionId, String status);

    Optional<ChatConversation> findByIdAndStatus(String id, String status);
}

